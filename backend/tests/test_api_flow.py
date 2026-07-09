"""The daily flow: new client, visit, remedies, discount, payment, then the home screen."""
from datetime import date, timedelta

from app.services.ledger import today


async def new_client(api, name="Asha Naik", **property_fields) -> dict:
    response = await api.post("/api/v1/clients", json={
        "name": name, "phone": "9800000000", "referral_source": "bni",
        "property": {"label": "Flat 4, Panjim", "property_type": "apartment", **property_fields},
    })
    assert response.status_code == 201, response.text
    return response.json()


async def catalog_item(api, name, size_ml=None) -> dict:
    items = (await api.get("/api/v1/catalog")).json()
    return next(i for i in items if i["name"] == name and i["size_ml"] == size_ml)


async def test_full_day_flow(api):
    client = await new_client(api)
    prop = client["properties"][0]
    assert prop["summary"]["status"] == "enquiry"
    pid = prop["id"]

    visit = (await api.post(f"/api/v1/properties/{pid}/visits", json={
        "visit_date": "2026-11-20", "purpose": "Site inspection", "observations": "Toilet in north-east"})).json()

    toilet = await catalog_item(api, "Toilet Blocker", 5)
    inspection = await catalog_item(api, "Site Inspection")
    lines = (await api.post(f"/api/v1/properties/{pid}/charges", json={
        "charge_date": "2026-11-20", "visit_id": visit["id"],
        "lines": [
            {"catalog_item_id": inspection["id"]},
            {"catalog_item_id": toilet["id"], "quantity": 3},
            {"description": "Extra distance", "unit_price": 500},
            {"description": "BNI Member Discount", "unit_price": 1000, "kind": "discount"},
        ],
    })).json()
    assert [l["amount"] for l in lines] == [2000, 4500, 500, 1000]
    assert lines[1]["description"] == "Toilet Blocker (5ml)"

    payment = (await api.post(f"/api/v1/properties/{pid}/payments", json={
        "amount": 5000, "method": "upi", "paid_on": "2026-11-21"})).json()
    assert payment["receipt_no"] == "R/2026-27/0001"

    detail = (await api.get(f"/api/v1/properties/{pid}")).json()
    assert detail["summary"] | {"next_visit": None} == {
        "billed": 6000, "paid": 5000, "balance": 1000, "status": "payment_due",
        "next_visit": None, "last_activity": "2026-11-21"}
    assert detail["client"]["name"] == "Asha Naik"
    assert len(detail["visits"]) == 1 and len(detail["charges"]) == 4

    home = (await api.get("/api/v1/home")).json()
    assert home["outstanding_total"] == 1000
    assert [d["client_name"] for d in home["dues"]] == ["Asha Naik"]

    clients = (await api.get("/api/v1/clients")).json()
    assert clients[0]["balance"] == 1000 and clients[0]["status"] == "payment_due"


async def test_price_changes_do_not_rewrite_old_charges(api):
    pid = (await new_client(api))["properties"][0]["id"]
    toilet = await catalog_item(api, "Toilet Blocker", 5)
    await api.post(f"/api/v1/properties/{pid}/charges",
                   json={"charge_date": "2026-11-20", "lines": [{"catalog_item_id": toilet["id"]}]})
    await api.patch(f"/api/v1/catalog/{toilet['id']}", json={"unit_price": 1800})
    charge = (await api.get(f"/api/v1/properties/{pid}")).json()["charges"][0]
    assert charge["unit_price"] == 1500


async def test_void_instead_of_delete(api):
    pid = (await new_client(api))["properties"][0]["id"]
    await api.post(f"/api/v1/properties/{pid}/charges", json={
        "charge_date": "2026-11-20", "lines": [{"description": "Consultation", "unit_price": 500}]})
    first = (await api.post(f"/api/v1/properties/{pid}/payments", json={
        "amount": 500, "method": "cash", "paid_on": "2026-11-21"})).json()
    voided = (await api.post(f"/api/v1/payments/{first['id']}/void", json={"reason": "Entered twice"})).json()
    assert voided["voided_at"] is not None
    assert (await api.patch(f"/api/v1/payments/{first['id']}", json={"amount": 400})).status_code == 400

    second = (await api.post(f"/api/v1/properties/{pid}/payments", json={
        "amount": 500, "method": "cash", "paid_on": "2026-11-22"})).json()
    assert second["receipt_no"] == "R/2026-27/0002"  # voided numbers are never reused

    summary = (await api.get(f"/api/v1/properties/{pid}")).json()["summary"]
    assert (summary["paid"], summary["balance"], summary["status"]) == (500, 0, "closed")


async def test_scheduled_visit_and_manual_close(api):
    pid = (await new_client(api))["properties"][0]["id"]
    soon = (today() + timedelta(days=3)).isoformat()
    await api.post(f"/api/v1/properties/{pid}/visits",
                   json={"visit_date": soon, "status": "scheduled", "purpose": "Remedy installation"})
    home = (await api.get("/api/v1/home")).json()
    assert home["upcoming_visits"][0]["visit_date"] == soon

    detail = (await api.patch(f"/api/v1/properties/{pid}", json={"property_type": "shop", "closed": True})).json()
    assert detail["property_type"] == "shop" and detail["summary"]["status"] == "closed"
    reopened = (await api.patch(f"/api/v1/properties/{pid}", json={"closed": False})).json()
    assert reopened["summary"]["next_visit"] == soon


async def test_second_property_for_same_client(api):
    client = await new_client(api)
    response = await api.post(f"/api/v1/clients/{client['id']}/properties",
                              json={"label": "Plot at Mapusa", "property_type": "plot"})
    assert response.status_code == 201
    detail = (await api.get(f"/api/v1/clients/{client['id']}")).json()
    assert [p["label"] for p in detail["properties"]] == ["Flat 4, Panjim", "Plot at Mapusa"]


async def test_catalog_rules(api):
    remedy = await api.post("/api/v1/catalog", json={"kind": "remedy", "name": "New Remedy", "unit_price": 1500})
    assert remedy.status_code == 201 and remedy.json()["size_ml"] == 5
    large = await api.post("/api/v1/catalog",
                           json={"kind": "remedy", "name": "New Remedy", "size_ml": 15, "unit_price": 2500})
    assert large.status_code == 201
    duplicate = await api.post("/api/v1/catalog", json={"kind": "remedy", "name": "New Remedy", "unit_price": 1})
    assert duplicate.status_code == 409
    bad_size = await api.post("/api/v1/catalog", json={"kind": "remedy", "name": "X", "size_ml": 10, "unit_price": 1})
    assert bad_size.status_code == 422
    service_size = await api.post("/api/v1/catalog",
                                  json={"kind": "service", "name": "Y", "size_ml": 5, "unit_price": 1})
    assert service_size.status_code == 422

    await api.patch(f"/api/v1/catalog/{remedy.json()['id']}", json={"is_active": False})
    names = [i["name"] for i in (await api.get("/api/v1/catalog")).json()]
    assert names.count("New Remedy") == 1
    everything = (await api.get("/api/v1/catalog?include_inactive=true")).json()
    assert [i["name"] for i in everything].count("New Remedy") == 2


async def test_validation_errors(api):
    pid = (await new_client(api))["properties"][0]["id"]
    no_price = await api.post(f"/api/v1/properties/{pid}/charges",
                              json={"charge_date": "2026-11-20", "lines": [{"description": "Something"}]})
    assert no_price.status_code == 422
    zero = await api.post(f"/api/v1/properties/{pid}/payments",
                          json={"amount": 0, "method": "upi", "paid_on": "2026-11-20"})
    assert zero.status_code == 422
    other = (await new_client(api, name="Ravi"))["properties"][0]["id"]
    visit = (await api.post(f"/api/v1/properties/{other}/visits", json={"visit_date": "2026-11-20"})).json()
    wrong = await api.post(f"/api/v1/properties/{pid}/charges", json={
        "charge_date": "2026-11-20", "visit_id": visit["id"],
        "lines": [{"description": "x", "unit_price": 1}]})
    assert wrong.status_code == 400
    assert (await api.get("/api/v1/properties/missing")).status_code == 404


async def test_merge_duplicate_clients(api):
    keeper = await new_client(api, name="Anish Tari")
    duplicate = (await api.post("/api/v1/clients", json={
        "name": "Anish Tari", "notes": "Second flat", "property": {"label": "Ponda"}})).json()
    pid = duplicate["properties"][0]["id"]
    await api.post(f"/api/v1/properties/{pid}/payments", json={"amount": 1000, "method": "cash", "paid_on": "2026-11-20"})

    merged = (await api.post(f"/api/v1/clients/{duplicate['id']}/merge", json={"into_client_id": keeper["id"]})).json()
    assert [p["label"] for p in merged["properties"]] == ["Flat 4, Panjim", "Ponda"]
    assert merged["notes"] == "Second flat" and merged["phone"] == "9800000000"
    assert (await api.get(f"/api/v1/clients/{duplicate['id']}")).status_code == 404
    assert (await api.get(f"/api/v1/properties/{pid}")).json()["summary"]["paid"] == 1000

    self_merge = await api.post(f"/api/v1/clients/{keeper['id']}/merge", json={"into_client_id": keeper["id"]})
    assert self_merge.status_code == 400

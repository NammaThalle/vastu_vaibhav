"""Supplier orders through the API: paste, match, receive, and the stock and cost they give."""
from pathlib import Path

from tests.test_api_flow import catalog_item, new_client

FIXTURES = Path(__file__).parent / "fixtures" / "supplier"


async def paste(api, name="pasted_delivery.txt"):
    response = await api.post("/api/v1/supplier/orders/paste", json={"text": (FIXTURES / name).read_text()})
    assert response.status_code == 201, response.text
    return response.json()


def level(overview, name, size_ml=5):
    return next(i for i in overview["items"] if i["name"] == name and i["size_ml"] == size_ml)


async def test_paste_then_match_products(api):
    order = await paste(api)
    assert (order["reference"], order["status"], order["received_on"]) == ("WH/OUT/00950", "received", "2026-11-02")
    assert order["unmatched_lines"] == 3 and order["business_cost"] == 0

    products = {p["name"]: p for p in (await api.get("/api/v1/supplier/products?unmatched_only=true")).json()}
    toilet = await catalog_item(api, "Toilet Blocker", 5)
    opener = await catalog_item(api, "Virtual Door Opener", 5)
    # Same name and size as a catalog item: suggested straight away.
    assert products["Toilet Blocker 5ml"]["suggested_catalog_item_id"] == toilet["id"]

    for name, body in [("Toilet Blocker 5ml", {"catalog_item_id": toilet["id"]}),
                       ("Virtual Entry 5ml", {"catalog_item_id": opener["id"]}),
                       ("Pendulum Board 6 inch", {"not_for_business": True})]:
        response = await api.post(f"/api/v1/supplier/products/{products[name]['id']}/match", json=body)
        assert response.status_code == 200 and response.json()["matched"]

    detail = (await api.get(f"/api/v1/supplier/orders/{order['id']}")).json()
    assert detail["unmatched_lines"] == 0 and detail["business_cost"] == 4800

    overview = (await api.get("/api/v1/stock")).json()
    assert overview["products_to_match"] == 0
    toilet_level = level(overview, "Toilet Blocker")
    assert (toilet_level["in_stock"], toilet_level["avg_cost"], toilet_level["margin"]) == (4, 600, 900)


async def test_pasting_the_same_delivery_twice_is_refused(api):
    await paste(api)
    again = await api.post("/api/v1/supplier/orders/paste", json={"text": (FIXTURES / "pasted_delivery.txt").read_text()})
    assert again.status_code == 400 and "already" in again.json()["detail"]


async def test_new_catalog_item_from_supplier_product(api):
    await paste(api, "pasted_order_tabs.txt")
    products = {p["name"]: p for p in (await api.get("/api/v1/supplier/products")).json()}
    created = await api.post(f"/api/v1/supplier/products/{products['Door Blocker 15ml']['id']}/match",
                             json={"new_item": {"name": "Door Blocker", "size_ml": 15, "unit_price": 2500}})
    assert created.status_code == 409  # already in the catalog: pick it instead
    created = await api.post(f"/api/v1/supplier/products/{products['Door Blocker 15ml']['id']}/match",
                             json={"new_item": {"name": "Shutter Guard", "size_ml": 15, "unit_price": 2500}})
    assert created.status_code == 200 and created.json()["catalog_item_name"] == "Shutter Guard"
    bad = await api.post(f"/api/v1/supplier/products/{products['Toilet Blocker 5ml']['id']}/match",
                         json={"not_for_business": True, "catalog_item_id": "x"})
    assert bad.status_code == 422


async def test_count_then_sales_then_delivery(api):
    toilet = await catalog_item(api, "Toilet Blocker", 5)
    count = await api.post("/api/v1/stock/counts", json={"adjusted_on": "2026-11-03",
                                                         "counts": [{"catalog_item_id": toilet["id"], "quantity": 10}]})
    assert count.status_code == 201

    # The pasted delivery is dated 2 Nov, before the count, so it is already on the shelf.
    order = await paste(api)
    product = next(l["product"] for l in order["lines"] if l["description"] == "Toilet Blocker 5ml")
    await api.post(f"/api/v1/supplier/products/{product['id']}/match", json={"catalog_item_id": toilet["id"]})

    pid = (await new_client(api))["properties"][0]["id"]
    await api.post(f"/api/v1/properties/{pid}/charges", json={"charge_date": "2026-11-05", "lines": [
        {"catalog_item_id": toilet["id"], "quantity": 3}]})
    voided = (await api.post(f"/api/v1/properties/{pid}/charges", json={"charge_date": "2026-11-05", "lines": [
        {"catalog_item_id": toilet["id"], "quantity": 5}]})).json()[0]
    await api.post(f"/api/v1/charges/{voided['id']}/void", json={"reason": "wrong"})
    await api.post("/api/v1/stock/adjustments", json={"catalog_item_id": toilet["id"], "kind": "remove",
                                                      "quantity": 1, "reason": "Broken", "adjusted_on": "2026-11-06"})

    toilet_level = level((await api.get("/api/v1/stock")).json(), "Toilet Blocker")
    assert (toilet_level["in_stock"], toilet_level["counted_on"], toilet_level["billed"]) == (6, "2026-11-03", 3)
    assert toilet_level["low"] is False

    await api.post("/api/v1/stock/counts", json={"adjusted_on": "2026-11-07",
                                                 "counts": [{"catalog_item_id": toilet["id"], "quantity": 2}]})
    overview = (await api.get("/api/v1/stock")).json()
    assert level(overview, "Toilet Blocker")["in_stock"] == 2 and level(overview, "Toilet Blocker")["low"]
    home = (await api.get("/api/v1/home")).json()
    assert home["stock_counted"] and [i["name"] for i in home["low_stock"]] == ["Toilet Blocker"]


async def test_services_cannot_be_counted(api):
    inspection = await catalog_item(api, "Site Inspection")
    response = await api.post("/api/v1/stock/counts", json={"adjusted_on": "2026-11-03",
                                                            "counts": [{"catalog_item_id": inspection["id"], "quantity": 1}]})
    assert response.status_code == 400


async def test_correct_a_returned_line_and_clear_the_review(api):
    order = await paste(api)
    line = next(l for l in order["lines"] if l["description"] == "Toilet Blocker 5ml")
    fixed = (await api.patch(f"/api/v1/supplier/order-lines/{line['id']}", json={"quantity": 3})).json()
    assert next(l for l in fixed["lines"] if l["id"] == line["id"])["quantity"] == 3
    cancelled = (await api.patch(f"/api/v1/supplier/orders/{order['id']}", json={"status": "cancelled"})).json()
    assert (cancelled["status"], cancelled["received_on"]) == ("cancelled", None)


async def test_sync_needs_a_login(api):
    response = await api.post("/api/v1/supplier/sync")
    assert response.status_code == 400
    assert (await api.get("/api/v1/stock")).json()["sync"]["enabled"] is False

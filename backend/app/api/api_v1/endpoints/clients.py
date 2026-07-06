from dataclasses import asdict

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DB, get_or_404
from app.models import Client, Property
from app.schemas.clients import (
    ClientCreate, ClientDetail, ClientListItem, ClientOut, ClientUpdate, PropertyCreate, PropertyOut,
    PropertyWithSummary,
)
from app.schemas.common import Summary
from app.services.ledger import PropertySummary, most_urgent, summaries_for

router = APIRouter()


def with_summary(prop: Property, summary: PropertySummary) -> PropertyWithSummary:
    return PropertyWithSummary(**PropertyOut.model_validate(prop).model_dump(), summary=Summary(**asdict(summary)))


@router.get("", response_model=list[ClientListItem])
async def list_clients(db: DB) -> list[ClientListItem]:
    clients = list(await db.scalars(select(Client).order_by(Client.name)))
    properties = list(await db.scalars(select(Property)))
    summaries = await summaries_for(db, properties)

    by_client: dict[str, list[PropertySummary]] = {}
    for prop in properties:
        by_client.setdefault(prop.client_id, []).append(summaries[prop.id])

    items = []
    for client in clients:
        own = by_client.get(client.id, [])
        activity = [s.last_activity for s in own if s.last_activity]
        items.append(ClientListItem(
            **ClientOut.model_validate(client).model_dump(),
            property_count=len(own),
            balance=sum(s.balance for s in own),
            status=most_urgent(s.status for s in own),
            last_activity=max(activity) if activity else None,
        ))
    return items


@router.post("", response_model=ClientDetail, status_code=201)
async def create_client(body: ClientCreate, db: DB) -> ClientDetail:
    client = Client(**body.model_dump(exclude={"property"}))
    db.add(client)
    await db.flush()
    db.add(Property(client_id=client.id, **body.property.model_dump()))
    await db.commit()
    return await get_client(client.id, db)


@router.get("/{client_id}", response_model=ClientDetail)
async def get_client(client_id: str, db: DB) -> ClientDetail:
    client = await get_or_404(db, Client, client_id)
    properties = list(await db.scalars(
        select(Property).where(Property.client_id == client_id).order_by(Property.created_at)))
    summaries = await summaries_for(db, properties)
    return ClientDetail(
        **ClientOut.model_validate(client).model_dump(),
        properties=[with_summary(p, summaries[p.id]) for p in properties],
    )


@router.patch("/{client_id}", response_model=ClientDetail)
async def update_client(client_id: str, body: ClientUpdate, db: DB) -> ClientDetail:
    client = await get_or_404(db, Client, client_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    return await get_client(client_id, db)


@router.post("/{client_id}/properties", response_model=PropertyOut, status_code=201)
async def add_property(client_id: str, body: PropertyCreate, db: DB) -> Property:
    await get_or_404(db, Client, client_id)
    prop = Property(client_id=client_id, **body.model_dump())
    db.add(prop)
    await db.commit()
    await db.refresh(prop)
    return prop

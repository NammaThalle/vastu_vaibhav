from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.enums import DeliveryKind, OrderLineKind, OrderSource, SupplierOrderStatus
from app.schemas.catalog import BottleSize
from app.schemas.common import ORMModel, Rupees, ShortText


# Stock

class StockItem(BaseModel):
    catalog_item_id: str
    name: str
    size_ml: int | None
    unit_price: int
    is_active: bool
    in_stock: int
    counted_on: date | None
    received: int
    billed: int
    avg_cost: int | None
    margin: int | None
    low: bool


class SyncStatus(BaseModel):
    enabled: bool = Field(description="A supplier login is set on the server")
    running: bool
    last_run_at: datetime | None
    last_ok: bool | None
    last_message: str | None


class StockOverview(BaseModel):
    items: list[StockItem]
    low_stock_at: int
    products_to_match: int
    orders_to_review: int
    sync: SyncStatus


class CountLine(BaseModel):
    catalog_item_id: str
    quantity: int = Field(ge=0)


class StockCount(BaseModel):
    adjusted_on: date
    counts: list[CountLine] = Field(min_length=1)


class StockAdjustmentCreate(BaseModel):
    catalog_item_id: str
    kind: Literal["add", "remove"]
    quantity: int = Field(gt=0)
    reason: str | None = Field(default=None, max_length=300)
    adjusted_on: date


# Supplier products

class SupplierProductOut(ORMModel):
    id: str
    external_ref: str
    name: str
    size_ml: int | None
    catalog_item_id: str | None
    catalog_item_name: str | None = None
    not_for_business: bool
    matched: bool
    suggested_catalog_item_id: str | None = None
    times_ordered: int = 0
    last_cost: int | None = None


class NewCatalogItem(BaseModel):
    name: ShortText
    size_ml: BottleSize | None = None
    unit_price: Rupees


class ProductMatch(BaseModel):
    """Exactly one of: an existing catalog item, a new catalog item, or not for business."""

    catalog_item_id: str | None = None
    new_item: NewCatalogItem | None = None
    not_for_business: bool = False

    @model_validator(mode="after")
    def one_choice(self):
        if sum([self.catalog_item_id is not None, self.new_item is not None, self.not_for_business]) != 1:
            raise ValueError("Choose one: a catalog item, a new catalog item, or not for business")
        return self


# Supplier orders

class SupplierOrderLineOut(ORMModel):
    id: str
    kind: OrderLineKind
    description: str
    quantity: int
    unit_cost: int
    amount: int
    product: SupplierProductOut | None


class SupplierDeliveryOut(ORMModel):
    delivery_no: str
    kind: DeliveryKind
    status: str
    delivery_date: date | None


class SupplierOrderSummary(BaseModel):
    id: str
    reference: str
    order_date: date
    status: SupplierOrderStatus
    received_on: date | None
    total: int
    business_cost: int
    source: OrderSource
    needs_review: str | None
    unmatched_lines: int
    line_count: int


class SupplierOrderDetail(SupplierOrderSummary):
    notes: str | None
    lines: list[SupplierOrderLineOut]
    deliveries: list[SupplierDeliveryOut]


class PastedOrder(BaseModel):
    text: str = Field(min_length=10, max_length=200_000)


class SupplierOrderUpdate(BaseModel):
    status: SupplierOrderStatus | None = None
    received_on: date | None = None
    notes: str | None = None
    review_done: bool | None = Field(default=None, description="Clear the review note once checked")


class OrderLineUpdate(BaseModel):
    quantity: int = Field(ge=0, description="Bottles actually kept, e.g. after a return")

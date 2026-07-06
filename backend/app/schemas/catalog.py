from typing import Literal

from pydantic import BaseModel, model_validator

from app.models.enums import ItemKind
from app.schemas.common import ORMModel, Rupees, ShortText

BottleSize = Literal[5, 15]


class CatalogItemCreate(BaseModel):
    kind: ItemKind
    name: ShortText
    size_ml: BottleSize | None = None
    unit_price: Rupees

    @model_validator(mode="after")
    def size_matches_kind(self):
        if self.kind == ItemKind.REMEDY and self.size_ml is None:
            self.size_ml = 5
        if self.kind == ItemKind.SERVICE and self.size_ml is not None:
            raise ValueError("Services have no bottle size")
        return self


class CatalogItemUpdate(BaseModel):
    name: ShortText | None = None
    unit_price: Rupees | None = None
    is_active: bool | None = None


class CatalogItemOut(ORMModel):
    id: str
    kind: ItemKind
    name: str
    size_ml: int | None
    unit_price: int
    is_active: bool

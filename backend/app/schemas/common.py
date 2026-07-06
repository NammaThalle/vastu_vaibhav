from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.services.ledger import PropertyStatus

Rupees = Annotated[int, Field(ge=0, description="Whole rupees")]
PositiveRupees = Annotated[int, Field(gt=0, description="Whole rupees")]
ShortText = Annotated[str, Field(min_length=1, max_length=200)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Summary(BaseModel):
    billed: int
    paid: int
    balance: int
    status: PropertyStatus
    next_visit: date | None
    last_activity: date | None

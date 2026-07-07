from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.services.ledger import PropertyStatus

Rupees = Annotated[int, Field(ge=0, description="Whole rupees")]
PositiveRupees = Annotated[int, Field(gt=0, description="Whole rupees")]
ShortText = Annotated[str, Field(min_length=1, max_length=200)]


class ORMModel(BaseModel):
    # Fields with defaults are always present in responses; mark them required in the schema.
    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)


class Summary(BaseModel):
    billed: int
    paid: int
    balance: int
    status: PropertyStatus
    next_visit: date | None
    last_activity: date | None

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class User(BaseModel):
    # Fields with defaults are always present in responses; mark them required in the schema.
    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)

    id: str
    email: EmailStr
    is_active: bool
    is_admin: bool


class UserUpdate(BaseModel):
    is_active: bool | None = None

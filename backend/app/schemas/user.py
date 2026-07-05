from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    is_active: bool
    is_admin: bool

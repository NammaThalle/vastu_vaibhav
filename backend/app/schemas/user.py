from pydantic import BaseModel, EmailStr, Field
import uuid

class UserBase(BaseModel):
    email: EmailStr
    is_2fa_enabled: bool = False
    is_active: bool = True
    is_admin: bool = False

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(UserBase):
    password: str | None = Field(default=None, min_length=8)

class UserInDBBase(UserBase):
    id: str | uuid.UUID
    
    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str

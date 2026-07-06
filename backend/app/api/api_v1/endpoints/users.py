from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DB, get_current_admin, get_or_404
from app.models import User
from app.schemas.user import User as UserOut, UserUpdate

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("", response_model=list[UserOut])
async def list_users(db: DB) -> list[User]:
    return list(await db.scalars(select(User).order_by(User.created_at)))


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(user_id: str, body: UserUpdate, db: DB,
                      admin: Annotated[User, Depends(get_current_admin)]) -> User:
    user = await get_or_404(db, User, user_id)
    if user.id == admin.id and body.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")
    if body.is_active is not None:
        user.is_active = body.is_active
    await db.commit()
    await db.refresh(user)
    return user

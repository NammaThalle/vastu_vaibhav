
from datetime import timedelta
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import User as UserSchema, UserCreate
from app.utils.logger import logger

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(deps.get_db)
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # 1. Fetch user by email
    logger.info("Login attempt for user: %s", form_data.username)
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    # 2. Authenticate
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning("Failed login attempt for user: %s", form_data.username)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # 3. Check if active (if we had active field)
    # if not user.is_active: ...

    # 4. Generate Token
    logger.info("User authenticated: %s. Generating token.", form_data.username)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login/test-token", response_model=UserSchema)
def test_token(current_user: User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user

@router.post("/register", response_model=UserSchema)
async def register(
    user_in: UserCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Create new user without the need to be logged in (for initial setup)
    """
    # 1. Check if user exists
    logger.info("Registration attempt for email: %s", user_in.email)
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        logger.warning("Registration failed - user already exists: %s", user_in.email)
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    # 2. Create user
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        is_2fa_enabled=user_in.is_2fa_enabled
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("New user registered successfully: %s", user_in.email)
    return user

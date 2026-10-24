from datetime import timedelta
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import User as UserSchema, UserCreate
from app.utils.logger import logger
from app.core.limiter import limiter

router = APIRouter()

def anonymize_email(email: str) -> str:
    if "@" in email:
        local, domain = email.split("@", 1)
        return f"{local[:2]}***@{domain}"
    return "***"

@router.post("/login/access-token", response_model=Token)
@limiter.limit("5/minute")
async def login_access_token(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(deps.get_db)
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    anon_email = anonymize_email(form_data.username)
    logger.info("Login attempt for user: %s", anon_email)
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning("Failed login attempt for user: %s", anon_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    # if hasattr(user, "is_active") and not user.is_active: ...

    logger.info("User authenticated: %s.", anon_email)
    logger.info("Generating token")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    logger.info("Token generated successfully")
    return Token(access_token=access_token, token_type="bearer")


@router.get("/login/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(deps.get_current_user)) -> Any:
    """
    Get current user.
    """
    return current_user


@router.post("/logout")
def logout(response: Response) -> dict:
    """
    Logout user by clearing the access_token cookie.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax"
    )
    return {"message": "Successfully logged out"}


@router.post("/register", response_model=UserSchema)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User | None = Depends(deps.get_optional_current_user),
) -> Any:
    """
    Create the first user during bootstrap. Later user creation requires authentication.
    """
    user_count = await db.scalar(select(func.count(User.id)))
    # If users exist, enforce that the creator is an admin.
    if user_count and current_user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is closed after initial setup.",
        )
        
    if user_count and current_user and getattr(current_user, "is_admin", False) == False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can register new users.",
        )

    anon_email = anonymize_email(user_in.email)
    logger.info("Registering new user: %s", anon_email)
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        # Don't reveal if user exists in production, but here it's an admin registering so it's fine.
        logger.warning("Registration failed - user already exists: %s", anon_email)
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        is_2fa_enabled=user_in.is_2fa_enabled,
        is_admin=user_in.is_admin if hasattr(user_in, "is_admin") else False
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("New user registered successfully: %s", anon_email)
    return user

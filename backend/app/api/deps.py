from typing import Generator, Annotated, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.config import settings
from app.db.base import get_db
from app.models.user import User
from app.schemas.token import TokenPayload
from sqlalchemy import select
from app.utils.logger import logger

class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> Optional[str]:
        # Check header first
        authorization = request.headers.get("Authorization")
        scheme, param = get_authorization_scheme_param(authorization)
        if authorization and scheme.lower() == "bearer":
            return param
        # Check cookie
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            return cookie_token
        
        if self.auto_error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        else:
            return None

oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl=f"/api/v1/login/access-token")
optional_oauth2_scheme = OAuth2PasswordBearerWithCookie(
    tokenUrl=f"/api/v1/login/access-token",
    auto_error=False,
)

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except jwt.PyJWTError:
        logger.warning("Token validation failed: Invalid JWT")
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    return user


async def get_optional_current_user(
    token: Annotated[str | None, Depends(optional_oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User | None:
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        logger.warning("Optional token validation failed: Invalid JWT")
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()

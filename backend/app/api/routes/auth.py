"""Authentication routes — Google OAuth login."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, verify_google_token
from app.models.schemas import GoogleLoginRequest, TokenResponse, UserOut
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenResponse)
async def google_login(body: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Exchange a Google ID token for an app JWT.

    Creates user on first login.
    """
    google_data = await verify_google_token(body.id_token)

    google_sub = google_data.get("sub", "")
    email = google_data.get("email", "")
    name = google_data.get("name", google_data.get("email", ""))
    picture = google_data.get("picture", "")

    # Upsert user
    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None:
        user = User(
            email=email,
            name=name,
            picture=picture,
            google_sub=google_sub,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.now(timezone.utc)
        user.name = name
        user.picture = picture
        db.commit()
        db.refresh(user)

    # Mint JWT
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user."""
    return UserOut.model_validate(current_user)

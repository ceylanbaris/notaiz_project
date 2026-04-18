"""Health check endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health_check(db: Session = Depends(get_db)):
    """Return service health status."""
    db_status = "connected"
    redis_status = "connected"

    # Check DB
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    # Check Redis
    try:
        import redis
        from app.core.config import settings

        r = redis.from_url(settings.REDIS_URL)
        r.ping()
    except Exception:
        redis_status = "disconnected"

    return HealthOut(status="ok", db=db_status, redis=redis_status)

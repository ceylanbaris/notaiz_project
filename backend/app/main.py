"""Notaiz — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import analysis, auth, health
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup and fail stale analyses from the previous process."""
    Base.metadata.create_all(bind=engine)

    # Any analysis still "processing" from a prior server instance can never complete
    # (the in-memory queue and background task are gone). Mark them failed immediately
    # so the frontend stops polling and shows a clear retry message.
    from app.core.database import SessionLocal
    from app.models.analysis import Analysis as AnalysisModel

    db = SessionLocal()
    try:
        stale = db.query(AnalysisModel).filter(AnalysisModel.status == "processing").all()
        for a in stale:
            a.status = "failed"
            a.error_message = "Sunucu yeniden başlatıldı, analiz tamamlanamadı. Lütfen tekrar deneyin."
        if stale:
            db.commit()
    finally:
        db.close()

    yield


app = FastAPI(
    title="Notaiz API",
    description="Web tabanlı şarkı benzerlik ve telif risk analizi sistemi",
    version="1.0.0",
    lifespan=lifespan,
)

# ── COOP header (required for Google OAuth popup to post back) ────────
class COOPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        return response

app.add_middleware(COOPMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Notaiz API", "docs": "/docs"}

"""Application configuration loaded from environment variables."""

from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://notaiz:notaiz123@db:5432/notaiz"

    # ── Redis / Celery ────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    # ── Security ──────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── Google OAuth ──────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""

    # ── CORS ──────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── File handling ─────────────────────────────────────────────────
    UPLOAD_DIR: str = "/tmp/notaiz/uploads"
    MAX_FILE_SIZE_MB: int = 50

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    # ── Audio processing ──────────────────────────────────────────────
    SAMPLE_RATE: int = 22050
    N_FFT: int = 2048
    HOP_LENGTH: int = 512
    N_MFCC: int = 13
    TOP_DB: int = 20

    # ── Similarity weights ────────────────────────────────────────────
    WEIGHT_COSINE: float = 0.40
    WEIGHT_DTW: float = 0.40
    WEIGHT_CORRELATION: float = 0.20

    # ── Risk thresholds ───────────────────────────────────────────────
    THRESHOLD_LOW: float = 0.45
    THRESHOLD_HIGH: float = 0.70

    # ── File TTL (seconds) ────────────────────────────────────────────
    FILE_TTL_SECONDS: int = 3600  # 1 hour

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()

"""Pydantic schemas for request / response validation."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────

class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Analysis ──────────────────────────────────────────────────────────

class MetricsOut(BaseModel):
    cosine_similarity: float
    dtw_distance_normalized: float
    correlation: float
    fused_score: float


class AnalysisOut(BaseModel):
    id: UUID
    status: str
    created_at: datetime
    file_a_name: Optional[str] = None
    file_b_name: Optional[str] = None
    duration_a: Optional[float] = None
    duration_b: Optional[float] = None
    fused_score: Optional[float] = None
    risk_level: Optional[str] = None
    uncertainty: Optional[float] = None
    metrics: Optional[MetricsOut] = None
    alignment_map: Optional[List[List[float]]] = None
    processing_ms: Optional[int] = None
    error_message: Optional[str] = None
    disclaimer: str = "Bu rapor yalnızca teknik benzerlik sinyali içermektedir; telif hukuku kararı niteliği taşımaz."

    model_config = {"from_attributes": True}


class AnalysisCreateResponse(BaseModel):
    analysis_id: UUID
    status: str = "processing"


class AnalysisListOut(BaseModel):
    total: int
    items: List[AnalysisOut]


# ── SSE Progress ──────────────────────────────────────────────────────

class ProgressEvent(BaseModel):
    analysis_id: UUID
    step: str  # uploading | preprocessing | feature_extraction | comparison | done | error
    progress: int  # 0-100
    message: str = ""


# ── Health ────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    db: str = "connected"
    redis: str = "connected"

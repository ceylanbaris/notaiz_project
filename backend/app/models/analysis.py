"""Analysis & FeatureCache ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), default="processing")  # processing | completed | failed

    # File info (hashes only — raw audio is never persisted)
    file_a_name = Column(String(255), nullable=True)
    file_b_name = Column(String(255), nullable=True)
    file_a_hash = Column(String(64), nullable=True)
    file_b_hash = Column(String(64), nullable=True)
    duration_a = Column(Float, nullable=True)
    duration_b = Column(Float, nullable=True)

    # Results
    fused_score = Column(Float, nullable=True)
    risk_level = Column(String(10), nullable=True)  # low | medium | high
    uncertainty = Column(Float, nullable=True)
    metrics_json = Column(JSON, nullable=True)
    alignment_json = Column(JSON, nullable=True)
    processing_ms = Column(Integer, nullable=True)
    error_message = Column(String(1000), nullable=True)

    # Celery
    celery_task_id = Column(String(255), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="analyses")


class FeatureCache(Base):
    __tablename__ = "feature_cache"

    file_hash = Column(String(64), primary_key=True)
    features_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)

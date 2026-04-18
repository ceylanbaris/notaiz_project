"""Celery application & analysis task."""

from __future__ import annotations

import time
import json
from datetime import datetime, timezone

from celery import Celery

from app.core.config import settings

# ── Celery app ────────────────────────────────────────────────────────
celery_app = Celery(
    "notaiz",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
    # Fail fast if broker is unreachable instead of hanging indefinitely
    broker_transport_options={
        "socket_timeout": 5,
        "socket_connect_timeout": 5,
        "retry_on_timeout": False,
    },
    broker_connection_retry_on_startup=False,
)


def _publish_progress(task, analysis_id: str, step: str, progress: int, message: str = ""):
    """Store progress info in Celery's result backend so SSE can poll it."""
    import redis as _redis

    r = _redis.from_url(settings.REDIS_URL)
    payload = json.dumps({
        "analysis_id": analysis_id,
        "step": step,
        "progress": progress,
        "message": message,
    })
    r.set(f"notaiz:progress:{analysis_id}", payload, ex=3600)
    r.publish(f"notaiz:progress_channel:{analysis_id}", payload)


@celery_app.task(bind=True, name="notaiz.analyze")
def run_analysis(self, analysis_id: str, file_a_path: str, file_b_path: str):
    """Execute the full analysis pipeline as a Celery task.

    Steps:
        1. Pre-process both files
        2. Extract features
        3. Compute similarity
        4. Persist results to DB
        5. Cleanup temp files
    """
    from app.core.database import SessionLocal
    from app.models.analysis import Analysis, FeatureCache
    from app.services.audio_processor import load_and_preprocess
    from app.services.feature_extractor import extract_features
    from app.services.similarity_engine import compute_similarity
    from app.utils.file_handler import cleanup_file, compute_file_hash

    db = SessionLocal()
    start_time = time.time()

    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            return {"error": "Analysis not found"}

        # ── Step 1: Pre-processing ────────────────────────────────
        _publish_progress(self, analysis_id, "preprocessing", 10, "Ses dosyaları ön işleniyor...")

        audio_a = load_and_preprocess(file_a_path)
        audio_b = load_and_preprocess(file_b_path)

        analysis.duration_a = audio_a.duration
        analysis.duration_b = audio_b.duration
        db.commit()

        _publish_progress(self, analysis_id, "preprocessing", 25, "Ön işleme tamamlandı")

        # ── Step 2: Feature extraction ────────────────────────────
        _publish_progress(self, analysis_id, "feature_extraction", 30, "Özellikler çıkarılıyor...")

        features_a = extract_features(audio_a)
        _publish_progress(self, analysis_id, "feature_extraction", 50, "Dosya A özellikleri çıkarıldı")

        features_b = extract_features(audio_b)
        _publish_progress(self, analysis_id, "feature_extraction", 65, "Dosya B özellikleri çıkarıldı")

        # Cache features
        with open(file_a_path, "rb") as f:
            hash_a = compute_file_hash(f.read())
        with open(file_b_path, "rb") as f:
            hash_b = compute_file_hash(f.read())

        analysis.file_a_hash = hash_a
        analysis.file_b_hash = hash_b

        for file_hash, feats in [(hash_a, features_a), (hash_b, features_b)]:
            existing = db.query(FeatureCache).filter(FeatureCache.file_hash == file_hash).first()
            if not existing:
                cache_entry = FeatureCache(
                    file_hash=file_hash,
                    features_json=feats.to_serialisable(),
                )
                db.add(cache_entry)
        db.commit()

        # ── Step 3: Similarity computation ────────────────────────
        _publish_progress(self, analysis_id, "comparison", 70, "Benzerlik hesaplanıyor...")

        result = compute_similarity(features_a, features_b)

        _publish_progress(self, analysis_id, "comparison", 90, "Sonuçlar kaydediliyor...")

        # ── Step 4: Persist results ───────────────────────────────
        elapsed_ms = int((time.time() - start_time) * 1000)

        analysis.fused_score = result.fused_score
        analysis.risk_level = result.risk_level
        analysis.uncertainty = result.uncertainty
        analysis.metrics_json = {
            "cosine_similarity": result.cosine_similarity,
            "dtw_distance_normalized": result.dtw_distance_normalized,
            "correlation": result.correlation,
            "fused_score": result.fused_score,
        }
        analysis.alignment_json = result.alignment_path
        analysis.processing_ms = elapsed_ms
        analysis.status = "completed"
        db.commit()

        _publish_progress(self, analysis_id, "done", 100, "Analiz tamamlandı!")

        return {
            "analysis_id": analysis_id,
            "status": "completed",
            "fused_score": result.fused_score,
        }

    except Exception as exc:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(exc)[:1000]
            db.commit()
        _publish_progress(self, analysis_id, "error", 0, str(exc)[:200])
        raise

    finally:
        # ── Step 5: Cleanup ───────────────────────────────────────
        cleanup_file(file_a_path)
        cleanup_file(file_b_path)
        db.close()

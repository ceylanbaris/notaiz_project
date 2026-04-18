"""Redis-free analysis runner using FastAPI BackgroundTasks + asyncio queues."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Dict, Optional

log = logging.getLogger(__name__)

# analysis_id -> asyncio.Queue  (lives for the lifetime of the process)
_queues: Dict[str, asyncio.Queue] = {}


def create_queue(analysis_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _queues[analysis_id] = q
    return q


def get_queue(analysis_id: str) -> Optional[asyncio.Queue]:
    return _queues.get(analysis_id)


async def _pub(queue: asyncio.Queue, analysis_id: str, step: str, progress: int, message: str = "") -> None:
    payload = json.dumps({
        "analysis_id": analysis_id,
        "step": step,
        "progress": progress,
        "message": message,
    })
    await queue.put(payload)


async def run_analysis_local(analysis_id: str, path_a: str, path_b: str) -> None:
    """Full analysis pipeline as a FastAPI background coroutine (no Celery/Redis)."""
    from app.core.database import SessionLocal
    from app.models.analysis import Analysis
    from app.services.audio_processor import load_and_preprocess
    from app.services.feature_extractor import extract_features
    from app.services.similarity_engine import compute_similarity
    from app.utils.file_handler import cleanup_file

    queue = _queues.get(analysis_id)
    if queue is None:
        log.error("No progress queue for analysis %s", analysis_id)
        return

    db = SessionLocal()
    loop = asyncio.get_running_loop()
    start = time.time()

    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            return

        # ── 1. Pre-processing ──────────────────────────────────────────
        await _pub(queue, analysis_id, "preprocessing", 10, "Ses dosyaları ön işleniyor...")
        audio_a = await loop.run_in_executor(None, load_and_preprocess, path_a)
        audio_b = await loop.run_in_executor(None, load_and_preprocess, path_b)
        analysis.duration_a = audio_a.duration
        analysis.duration_b = audio_b.duration
        db.commit()
        await _pub(queue, analysis_id, "preprocessing", 25, "Ön işleme tamamlandı")

        # ── 2. Feature extraction ──────────────────────────────────────
        await _pub(queue, analysis_id, "feature_extraction", 30, "Özellikler çıkarılıyor...")
        features_a = await loop.run_in_executor(None, extract_features, audio_a)
        await _pub(queue, analysis_id, "feature_extraction", 50, "Dosya A özellikleri çıkarıldı")
        features_b = await loop.run_in_executor(None, extract_features, audio_b)
        await _pub(queue, analysis_id, "feature_extraction", 65, "Dosya B özellikleri çıkarıldı")

        # ── 3. Similarity ──────────────────────────────────────────────
        await _pub(queue, analysis_id, "comparison", 70, "Benzerlik hesaplanıyor...")
        result = await loop.run_in_executor(None, compute_similarity, features_a, features_b)
        await _pub(queue, analysis_id, "comparison", 90, "Sonuçlar kaydediliyor...")

        # ── 4. Persist ─────────────────────────────────────────────────
        elapsed_ms = int((time.time() - start) * 1000)
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

        await _pub(queue, analysis_id, "done", 100, "Analiz tamamlandı!")

    except Exception as exc:
        log.exception("Analysis %s failed", analysis_id)
        row = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if row:
            row.status = "failed"
            row.error_message = str(exc)[:1000]
            db.commit()
        await _pub(queue, analysis_id, "error", 0, str(exc)[:200])

    finally:
        cleanup_file(path_a)
        cleanup_file(path_b)
        db.close()
        # Hold the queue alive briefly so SSE clients can drain it, then discard
        await asyncio.sleep(60)
        _queues.pop(analysis_id, None)

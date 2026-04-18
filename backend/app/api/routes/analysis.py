"""Analysis & report routes."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

log = logging.getLogger(__name__)
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.analysis import Analysis
from app.models.schemas import AnalysisCreateResponse, AnalysisListOut, AnalysisOut, MetricsOut
from app.models.user import User
from app.services.report_generator import generate_report_pdf
from app.tasks.analysis_task import run_analysis
from app.utils.file_handler import compute_file_hash, save_upload
from app.utils.validators import validate_audio_file

router = APIRouter(prefix="/analysis", tags=["analysis"])


# ── POST /analyze ─────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalysisCreateResponse, status_code=201)
async def create_analysis(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload two audio files and start an async analysis."""

    # Validate files
    validate_audio_file(file_a)
    validate_audio_file(file_b)

    # Read & check size
    bytes_a = await file_a.read()
    bytes_b = await file_b.read()

    max_size = settings.max_file_size_bytes
    if len(bytes_a) > max_size or len(bytes_b) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dosya boyutu {settings.MAX_FILE_SIZE_MB} MB'ı aşamaz",
        )

    # Save to disk
    path_a = await save_upload(bytes_a, file_a.filename or "a.wav")
    path_b = await save_upload(bytes_b, file_b.filename or "b.wav")

    # Create DB record
    analysis = Analysis(
        user_id=current_user.id,
        status="processing",
        file_a_name=file_a.filename,
        file_b_name=file_b.filename,
        file_a_hash=compute_file_hash(bytes_a),
        file_b_hash=compute_file_hash(bytes_b),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Dispatch Celery task off the event loop so it never blocks the server.
    # run_analysis.delay() opens a Redis connection synchronously — if Redis is
    # unreachable it would hang the entire asyncio thread without run_in_executor.
    loop = asyncio.get_running_loop()
    try:
        task = await asyncio.wait_for(
            loop.run_in_executor(
                None, run_analysis.delay,
                str(analysis.id), path_a, path_b,
            ),
            timeout=10.0,
        )
    except Exception as exc:
        log.error("Celery dispatch failed for analysis %s: %s", analysis.id, exc)
        analysis.status = "failed"
        analysis.error_message = "Analiz kuyruğuna bağlanılamadı (Redis çalışıyor mu?)"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analiz servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        )

    analysis.celery_task_id = task.id
    db.commit()

    return AnalysisCreateResponse(analysis_id=analysis.id, status="processing")


# ── GET /analyze/{id} ─────────────────────────────────────────────────

@router.get("/analyze/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single analysis result."""
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı")

    return _to_analysis_out(analysis)


# ── GET /history ──────────────────────────────────────────────────────

@router.get("/history", response_model=AnalysisListOut)
def get_history(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all analyses for the current user."""
    query = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return AnalysisListOut(
        total=total,
        items=[_to_analysis_out(a) for a in items],
    )


# ── GET /analyze/{id}/pdf ─────────────────────────────────────────────

@router.get("/analyze/{analysis_id}/pdf")
def download_pdf(
    analysis_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download the PDF report for a completed analysis."""
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == current_user.id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı")

    if analysis.status != "completed":
        raise HTTPException(status_code=400, detail="Analiz henüz tamamlanmadı")

    metrics = analysis.metrics_json or {}

    pdf_bytes = generate_report_pdf(
        analysis_id=str(analysis.id),
        file_a_name=analysis.file_a_name or "Dosya A",
        file_b_name=analysis.file_b_name or "Dosya B",
        fused_score=analysis.fused_score or 0.0,
        risk_level=analysis.risk_level or "low",
        uncertainty=analysis.uncertainty or 0.0,
        cosine_sim=metrics.get("cosine_similarity", 0.0),
        dtw_norm=metrics.get("dtw_distance_normalized", 0.0),
        correlation=metrics.get("correlation", 0.0),
        duration_a=analysis.duration_a or 0.0,
        duration_b=analysis.duration_b or 0.0,
        processing_ms=analysis.processing_ms or 0,
        created_at=analysis.created_at,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="notaiz_report_{analysis_id}.pdf"'
        },
    )


# ── SSE /analyze/{id}/progress ────────────────────────────────────────

@router.get("/analyze/{analysis_id}/progress")
async def analysis_progress(analysis_id: UUID):
    """Stream analysis progress via Server-Sent Events."""

    async def event_generator():
        import redis

        r = redis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        channel = f"notaiz:progress_channel:{analysis_id}"
        pubsub.subscribe(channel)

        # Send current state first
        current = r.get(f"notaiz:progress:{analysis_id}")
        if current:
            yield {"event": "progress", "data": current.decode("utf-8")}

        try:
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    yield {"event": "progress", "data": data}

                    # Check if done
                    parsed = json.loads(data)
                    if parsed.get("step") in ("done", "error"):
                        break
                else:
                    # Send heartbeat
                    yield {"event": "heartbeat", "data": ""}
                await asyncio.sleep(0.5)
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()

    return EventSourceResponse(event_generator())


# ── Helper ────────────────────────────────────────────────────────────

def _to_analysis_out(analysis: Analysis) -> AnalysisOut:
    metrics = None
    if analysis.metrics_json:
        metrics = MetricsOut(**analysis.metrics_json)

    return AnalysisOut(
        id=analysis.id,
        status=analysis.status,
        created_at=analysis.created_at,
        file_a_name=analysis.file_a_name,
        file_b_name=analysis.file_b_name,
        duration_a=analysis.duration_a,
        duration_b=analysis.duration_b,
        fused_score=analysis.fused_score,
        risk_level=analysis.risk_level,
        uncertainty=analysis.uncertainty,
        metrics=metrics,
        alignment_map=analysis.alignment_json,
        processing_ms=analysis.processing_ms,
        error_message=analysis.error_message,
    )

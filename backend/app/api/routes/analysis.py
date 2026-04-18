"""Analysis & report routes."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.analysis import Analysis
from app.models.schemas import AnalysisCreateResponse, AnalysisListOut, AnalysisOut, MetricsOut
from app.models.user import User
from app.services.local_runner import create_queue, get_queue, run_analysis_local
from app.services.report_generator import generate_report_pdf
from app.utils.file_handler import compute_file_hash, save_upload
from app.utils.validators import validate_audio_file

log = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


# ── POST /analyze ─────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalysisCreateResponse, status_code=201)
async def create_analysis(
    background_tasks: BackgroundTasks,
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload two audio files and start an async analysis."""

    validate_audio_file(file_a)
    validate_audio_file(file_b)

    bytes_a = await file_a.read()
    bytes_b = await file_b.read()

    max_size = settings.max_file_size_bytes
    if len(bytes_a) > max_size or len(bytes_b) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Dosya boyutu {settings.MAX_FILE_SIZE_MB} MB'ı aşamaz",
        )

    path_a = await save_upload(bytes_a, file_a.filename or "a.wav")
    path_b = await save_upload(bytes_b, file_b.filename or "b.wav")

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

    # Create in-memory progress queue before the background task starts
    create_queue(str(analysis.id))
    background_tasks.add_task(run_analysis_local, str(analysis.id), path_a, path_b)

    return AnalysisCreateResponse(analysis_id=analysis.id, status="processing")


# ── GET /analyze/{id} ─────────────────────────────────────────────────

@router.get("/analyze/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == str(current_user.id))
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
    query = (
        db.query(Analysis)
        .filter(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return AnalysisListOut(total=total, items=[_to_analysis_out(a) for a in items])


# ── GET /analyze/{id}/pdf ─────────────────────────────────────────────

@router.get("/analyze/{analysis_id}/pdf")
def download_pdf(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = (
        db.query(Analysis)
        .filter(Analysis.id == analysis_id, Analysis.user_id == str(current_user.id))
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
        headers={"Content-Disposition": f'attachment; filename="notaiz_report_{analysis_id}.pdf"'},
    )


# ── SSE /analyze/{id}/progress ────────────────────────────────────────

@router.get("/analyze/{analysis_id}/progress")
async def analysis_progress(analysis_id: str, db: Session = Depends(get_db)):
    """Stream analysis progress via Server-Sent Events (in-memory queue, no Redis)."""

    analysis_id_str = analysis_id

    async def event_generator():
        queue = get_queue(analysis_id_str)

        if queue is None:
            # Task already finished before SSE connected — read DB and report final state
            row = db.query(Analysis).filter(Analysis.id == analysis_id_str).first()
            if row and row.status == "completed":
                yield {"event": "progress", "data": json.dumps({
                    "analysis_id": analysis_id_str, "step": "done",
                    "progress": 100, "message": "Analiz tamamlandı!",
                })}
            elif row and row.status == "failed":
                yield {"event": "progress", "data": json.dumps({
                    "analysis_id": analysis_id_str, "step": "error",
                    "progress": 0, "message": row.error_message or "Analiz başarısız",
                })}
            return

        while True:
            try:
                data = await asyncio.wait_for(queue.get(), timeout=25.0)
                yield {"event": "progress", "data": data}
                parsed = json.loads(data)
                if parsed.get("step") in ("done", "error"):
                    break
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": ""}

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

"""PDF report generator using ReportLab.

Produces a professional one-page report containing:
  - Header with Notaiz branding
  - Similarity score gauge
  - Risk level badge
  - Metric breakdown table
  - Legal disclaimer
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


DISCLAIMER_TR = (
    "Bu rapor yalnızca teknik benzerlik sinyali içermektedir; "
    "telif hukuku kararı niteliği taşımaz."
)


def _risk_color(risk: str) -> colors.Color:
    return {
        "low": colors.HexColor("#22c55e"),
        "medium": colors.HexColor("#f59e0b"),
        "high": colors.HexColor("#ef4444"),
    }.get(risk, colors.grey)


def _risk_label_tr(risk: str) -> str:
    return {"low": "Düşük Risk", "medium": "Orta Risk", "high": "Yüksek Risk"}.get(
        risk, risk
    )


def generate_report_pdf(
    analysis_id: str,
    file_a_name: str,
    file_b_name: str,
    fused_score: float,
    risk_level: str,
    uncertainty: float,
    cosine_sim: float,
    dtw_norm: float,
    correlation: float,
    duration_a: float,
    duration_b: float,
    processing_ms: int,
    created_at: Optional[datetime] = None,
) -> bytes:
    """Generate a PDF report and return raw bytes."""

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "NotaizTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#6366f1"),
        spaceAfter=6 * mm,
    )
    subtitle_style = ParagraphStyle(
        "NotaizSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=8 * mm,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=6 * mm,
        spaceAfter=3 * mm,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=1,
        borderPadding=8,
        spaceBefore=10 * mm,
    )

    elements = []

    # ── Header ────────────────────────────────────────────────────
    elements.append(Paragraph("Notaiz — Benzerlik Analiz Raporu", title_style))
    ts = (created_at or datetime.now(timezone.utc)).strftime("%d.%m.%Y %H:%M UTC")
    elements.append(Paragraph(f"Rapor Tarihi: {ts}  |  Analiz ID: {analysis_id}", subtitle_style))

    # ── File info ─────────────────────────────────────────────────
    elements.append(Paragraph("Dosya Bilgileri", heading_style))
    file_data = [
        ["", "Dosya A", "Dosya B"],
        ["İsim", file_a_name, file_b_name],
        ["Süre (sn)", f"{duration_a:.1f}", f"{duration_b:.1f}"],
    ]
    ft = Table(file_data, colWidths=[4 * cm, 6 * cm, 6 * cm])
    ft.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(ft)

    # ── Score ─────────────────────────────────────────────────────
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph("Benzerlik Sonucu", heading_style))

    risk_clr = _risk_color(risk_level)
    score_text = (
        f'<font size="28" color="#{risk_clr.hexval()[2:]}">'
        f"<b>%{fused_score * 100:.1f}</b></font>"
        f'  <font size="14" color="#{risk_clr.hexval()[2:]}">'
        f"{_risk_label_tr(risk_level)}</font>"
    )
    elements.append(Paragraph(score_text, body_style))
    elements.append(
        Paragraph(
            f"Belirsizlik: ±{uncertainty * 100:.1f}%  |  İşlem süresi: {processing_ms} ms",
            subtitle_style,
        )
    )

    # ── Metric breakdown ──────────────────────────────────────────
    elements.append(Paragraph("Metrik Detayları", heading_style))
    metric_data = [
        ["Metrik", "Skor", "Ağırlık"],
        ["Cosine Similarity (MFCC + Mel)", f"{cosine_sim:.4f}", "0.40"],
        ["Beat-Synchronous DTW (Chroma)", f"{dtw_norm:.4f}", "0.40"],
        ["Pearson Korelasyonu (Tempogram)", f"{correlation:.4f}", "0.20"],
        ["Fused Score", f"{fused_score:.4f}", "—"],
    ]
    mt = Table(metric_data, colWidths=[8 * cm, 4 * cm, 4 * cm])
    mt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#f1f5f9")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    elements.append(mt)

    # ── Disclaimer ────────────────────────────────────────────────
    elements.append(
        Paragraph(f"<b>Yasal Uyarı:</b> {DISCLAIMER_TR}", disclaimer_style)
    )

    # ── Build ─────────────────────────────────────────────────────
    doc.build(elements)
    return buf.getvalue()

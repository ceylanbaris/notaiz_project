"""Gemini-based LLM interpreter for DSP similarity metrics."""

from __future__ import annotations

import json
import logging
import time

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


# ESKI_PROMPT_KURALLARI (v2 - 2026-05-25):
# - cover_or_same: structural > 0.15 veya fused > 0.85 veya melodic_dtw >= 0.95
# - high_similarity: structural 0.08-0.15 VEYA (melodic_dtw >= 0.85 ve structural >= 0.04)
# - moderate_similarity: structural 0.065-0.10 veya melodic_dtw 0.85-0.95
# - low_similarity: structural < 0.065
# - Kural 5: melodic_dtw >= 0.85 VE structural >= 0.04 => melodi hirsizligi

PROMPT_TEMPLATE = """Sen bir muzik analizi uzmanisin.
Iki sarki arasindaki teknik benzerlik metriklerini yorumla.

Sarki A: {file_a}
Sarki B: {file_b}

Olculen DSP metrikleri (0.0 - 1.0 arasi):
- Yapisal benzerlik (audio fingerprint): {structural:.3f}   <-- EN ONEMLI
- Melodik benzerlik (chroma analizi): {melodic:.3f}
- Harmonik benzerlik (HPCP akor analizi): {harmonic:.3f}
- Ritmik benzerlik (tempogram): {rhythmic:.3f}
- Zaman-uyumlu melodik benzerlik (chroma DTW): {melodic_dtw:.3f}
- Birlesik skor: {fused:.3f}

=== TEMEL KURAL ===
Kategori karari YALNIZCA structural (audio fingerprint) skoruna gore verilir.
melodic/harmonic/rhythmic/melodic_dtw degerleri kategori KARARINI etkilemez;
bu metrikler sadece aciklama metninde kullanilabilir.

Neden? Pop, elektronik ve genel Bati muziginde melodic/harmonic degerleri
neredeyse her ciftte 0.85-0.98 araliginda cikar (ortak akor, ortak ritim).
Bu metrikler ayirt edici degildir. Audio fingerprint (structural) ise
ses dalgasinin gercek yapisal eslesmesini olcer.

=== KATEGORI KURALLARI (STRUCTURAL'A GORE) ===
- "cover_or_same"      : structural >= 0.10
- "high_similarity"    : structural 0.06 - 0.10 (dahil degil)
- "moderate_similarity": structural 0.04 - 0.06 (dahil degil)
- "low_similarity"     : structural < 0.04

=== ACIKLAYICI YORUM KURALLARI ===
Asagidaki desen eslesmelerine gore explanation_tr veya key_observation'a
OLASILIKSALVE TEMKINLI bir yorum ekle. Kesin iddia ETME.

Desen 1 — structural >= 0.15:
  "Bu iki kayit birebir ayni veya cok yakin olabilir (ayni master / dijital kopya)."

Desen 2 — structural 0.06-0.15 VE melodic >= 0.90 VE harmonic >= 0.90:
  "Bu iki parca ayni sarkinin farkli bir kaydi olabilir — canli/konser versiyonu,
  yeniden kayit veya cover gibi. Melodi ve armoni neredeyse ayni, ancak ses
  kaydi farkli."

Desen 3 — structural < 0.06 VE melodic >= 0.90:
  "Melodik benzerlik yuksek ancak ses parmak izi eslesmiyor; ayni tur/stil
  veya melodik ortaklik olabilir. Ayni kayit degil."

Hicbir desen eslesmiyorsa yorum ekleme.

=== GENEL KURALLAR ===
- "kesinlikle", "kanit", "intihal" gibi mutlak ifadeler KULLANMA
- "olabilir", "muhtemelen", "isaret ediyor", "benziyor" gibi olasiliksal dil kullan
- JSON formatini bozma, markdown veya ek metin EKLEME

SADECE su JSON formatinda cevap ver:
{{
  "category": "low_similarity",
  "category_label_tr": "Dusuk benzerlik",
  "confidence": 0.85,
  "explanation_tr": "2-3 cumlelik analiz",
  "key_observation": "En dikkat cekici metrik veya gozlem"
}}
"""


def _fallback_result(reason: str = "AI yorumu yapilamadi") -> dict:
    return {
        "category": "moderate_similarity",
        "category_label_tr": "Yorumlanamadi",
        "confidence": 0.5,
        "explanation_tr": f"Otomatik yorum hatasi: {reason}",
        "key_observation": "DSP skorlarina basvurun",
    }


def interpret_similarity(
    melodic: float,
    harmonic: float,
    rhythmic: float,
    structural: float,
    fused: float,
    melodic_dtw: float,
    file_a_name: str = "Sarki A",
    file_b_name: str = "Sarki B",
) -> dict:
    """DSP metriklerini Gemini ile yorumlatip kategori dondurur."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY tanimli degil, fallback donuyor")
        return _fallback_result("API key yok")

    prompt = PROMPT_TEMPLATE.format(
        file_a=file_a_name,
        file_b=file_b_name,
        melodic=melodic,
        melodic_dtw=melodic_dtw,
        harmonic=harmonic,
        rhythmic=rhythmic,
        structural=structural,
        fused=fused,
    )

    _MODEL = "gemini-2.5-flash"
    _MAX_RETRIES = 4
    _RETRY_DELAYS = [1, 2, 4]  # saniye

    raw_text = None
    for attempt in range(_MAX_RETRIES):
        try:
            client = get_client()
            response = client.models.generate_content(
                model=_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )
            raw_text = response.text.strip()
            break
        except Exception as e:
            err_str = str(e)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                if attempt < _MAX_RETRIES - 1:
                    delay = _RETRY_DELAYS[min(attempt, len(_RETRY_DELAYS) - 1)]
                    logger.warning("Gemini 503, %ds beklenip tekrar deneniyor (deneme %d/%d)...",
                                   delay, attempt + 1, _MAX_RETRIES)
                    time.sleep(delay)
                    continue
            logger.error("Gemini cagirisi hatasi: %s", e)
            return _fallback_result(str(e)[:100])

    if raw_text is None:
        return _fallback_result("Gemini mesgul (503) - 4 denemede cevap alinamadi")

    try:
        text = raw_text
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        data = json.loads(text)

        required = ["category", "category_label_tr", "confidence",
                    "explanation_tr", "key_observation"]
        for key in required:
            if key not in data:
                logger.warning("LLM cevabinda %s eksik", key)
                return _fallback_result(f"{key} alani eksik")

        valid_categories = ["cover_or_same", "high_similarity",
                            "moderate_similarity", "low_similarity"]
        if data["category"] not in valid_categories:
            data["category"] = "moderate_similarity"

        return data

    except json.JSONDecodeError as e:
        logger.error("Gemini JSON parse hatasi: %s", e)
        return _fallback_result("JSON parse hatasi")

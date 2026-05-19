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


PROMPT_TEMPLATE = """Sen bir muzikolog gibi davran.
Iki sarki arasindaki teknik benzerlik metriklerini yorumla.

Sarki A: {file_a}
Sarki B: {file_b}

Olculen DSP metrikleri (0.0 - 1.0 arasi):
- Melodik benzerlik (chroma analizi): {melodic:.3f}
- Zaman-uyumlu melodik benzerlik (chroma DTW): {melodic_dtw:.3f}
- Harmonik benzerlik (HPCP akor analizi): {harmonic:.3f}
- Ritmik benzerlik (tempogram): {rhythmic:.3f}
- Yapisal benzerlik (audio fingerprint): {structural:.3f}
- Birlesik skor: {fused:.3f}

YORUMLAMA KURALLARI:
1. Structural (fingerprint) en bilgilendirici metrik:
   - > 0.15 = ciddi yapisal eslesme (cover/sample/birebir)
   - 0.065 - 0.15 = belirgin yapisal benzerlik (tartismali)
   - < 0.065 = ortak yapisal eleman yok

2. Melodic/harmonic/rhythmic 0.95+ TEK BASINA ayirt edici degildir,
   cunku Bati pop muziginin %90'i bu aralikta cikar (ortak akor yapisi,
   ortak ritimler).

3. Eger melodic_dtw >= 0.95 VE structural >= 0.10 ise yuksek benzerlik vardir.

4. Sadece melodic/harmonic yuksek ama structural < 0.065 ise, bu sadece
   "ayni tur muzik" demektir, benzerlik degildir.

KATEGORI SECIMI:
- "cover_or_same": Cover, sample veya birebir alinti
  (structural > 0.15 veya fused > 0.85 veya melodic_dtw >= 0.95)
- "high_similarity": Yuksek benzerlik, tartismali olabilir
  (structural 0.10-0.15 ve fused 0.55-0.85)
- "moderate_similarity": Orta benzerlik, ortak unsurlar var
  (structural 0.065-0.10 veya melodic_dtw 0.85-0.95)
- "low_similarity": Farkli sarkilar, sadece tur benzerligi olabilir
  (structural < 0.065)

SADECE su JSON formatinda cevap ver, markdown veya ek aciklama YOK:
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

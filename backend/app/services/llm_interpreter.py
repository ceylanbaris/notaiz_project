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


PROMPT_TEMPLATE = """Sen uzman bir müzikolog ve telif hakları analizörüsün.

Sana iki şarkı arasındaki benzerlik skorları ve sistemin belirlediği ana kategori verilecek.
Senin görevin, SADECE bu skorlara dayanarak kısa (1-2 cümle) ve net bir Türkçe değerlendirme yazmaktır.

─── GİRDİ SKORLARI ────────────────────────────────────────────────
  Structural (Yapısal parmak izi): {structural:.3f}
  Melodic DTW (Melodik uyum):      {melodic_dtw:.3f}
  Genel Skor (fused_score):        {fused:.3f}
  Sistem Kategorisi:               {rule_based_category}

─── KURAL 1 (EZİLEMEZ, HER KOŞULDA UYGULA) ────────────────────────
Eğer Sistem Kategorisi "Farklı Eserler / Tesadüfi Benzerlik" ise VEYA fused_score < 0.35 ise:
  → KESİNLİKLE intihal, cover veya anlamlı bir bağ ima etme.
  → Yüksek çıkan melodik veya ritmik skorların tamamen müzikal formülasyon
    tesadüfü olduğunu, şarkılar arasında hiçbir organik bağ (cover, intihal,
    alıntı) bulunmadığını net bir dille ifade et.
  → Örnek: "Eserler arasında müzikal bir bağ bulunmamaktadır; gözlemlenen
    yüksek melodik/ritmik skorlar müzikal formülasyon tesadüfünden
    kaynaklanmakta olup herhangi bir cover, intihal veya alıntı ilişkisine
    işaret etmemektedir."

─── KURAL 2 (ÇIKTI FORMATI, EZİLEMEZ) ─────────────────────────────
  Çıktını SADECE ve SADECE geçerli bir JSON formatında ver.
  Başka hiçbir metin, markdown veya açıklama ekleme.

SADECE şu JSON formatında cevap ver:
{{"explanation_tr": "Senin 1-2 cümlelik profesyonel analizin."}}"""


def _fallback_result(msg: str = "AI yorumu yapilamadi") -> dict:
    return {
        "explanation_tr": f"Otomatik yorum alınamadı: {msg}",
    }


def interpret_similarity(
    structural: float,
    melodic_dtw: float,
    fused: float,
    rule_based_category: str = "",
) -> dict:
    """Gemini'ye benzerlik skorlarını ve algoritma kategorisini gönderir, Türkçe açıklama alır."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY tanimli degil, fallback donuyor")
        return _fallback_result("API key yok")

    prompt = PROMPT_TEMPLATE.format(
        structural=structural,
        melodic_dtw=melodic_dtw,
        fused=fused,
        rule_based_category=rule_based_category or "Belirtilmedi",
    )

    _MODEL = "gemini-2.5-flash"
    _MAX_RETRIES = 4
    _RETRY_DELAYS = [1, 2, 4]

    raw_text = None
    for attempt in range(_MAX_RETRIES):
        try:
            client = get_client()
            response = client.models.generate_content(
                model=_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
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
                    logger.warning(
                        "Gemini 503, %ds beklenip tekrar deneniyor (deneme %d/%d)...",
                        delay, attempt + 1, _MAX_RETRIES,
                    )
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

        if "explanation_tr" not in data:
            logger.warning("LLM cevabinda 'explanation_tr' eksik, raw: %s", raw_text[:200])
            return _fallback_result("explanation_tr alani eksik")

        return {"explanation_tr": str(data["explanation_tr"])}

    except json.JSONDecodeError as e:
        logger.error("Gemini JSON parse hatasi: %s | raw: %s", e, raw_text[:200])
        return _fallback_result("JSON parse hatasi")

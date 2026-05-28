"""Similarity engine — multi-metric audio comparison.

Metrics:
  melodic    : key-invariant cosine on CQT-Chroma column means (12 transpositions)
  harmonic   : key-invariant cosine on HPCP column means (12 transpositions)
  rhythmic   : cosine on Tempogram column means (no transposition)
  structural : Audio Fingerprinting via Constellation Maps (Shazam-style)

Fused score: 0.20*melodic + 0.15*harmonic + 0.10*rhythmic + 0.55*structural
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Set, Tuple

import librosa
import numpy as np
from librosa.sequence import dtw
from scipy.ndimage import maximum_filter

from app.core.config import settings
from app.services.feature_extractor import AudioFeatures

_SR = 22050
_N_FFT = 2048
_HOP = 512
_FILTER_SIZE = 20
_TIME_WINDOW = 15
_FAN_OUT = 5
_THRESHOLD_STD = 1.0

# ── Categorization thresholds — tune here ────────────────────────────────────
THRESH_BIREBIR_STRUCTURAL = 0.90
THRESH_BIREBIR_MELODIC    = 0.90
THRESH_COVER_STRUCTURAL   = 0.70
THRESH_COVER_MELODIC      = 0.75
THRESH_INTIHAL_MELODIC    = 0.82
THRESH_INTIHAL_STRUCTURAL = 0.05

# ── Hard limits — cannot be overridden ───────────────────────────────────────
HARD_LIMIT_FUSED     = 0.35   # below → always "Farklı Eserler"
COVER_MIN_FUSED      = 0.40   # "Cover/Aranje" requires guard_fused above this
COVER_MIN_STRUCTURAL = 0.02   # "Cover/Aranje" requires structural above this


@dataclass
class SimilarityResult:
    melodic_similarity: float
    rhythmic_similarity: float
    harmonic_similarity: float
    structural_similarity: float
    fused_score: float
    risk_level: str
    uncertainty: float
    alignment_path: List[List[float]]
    category: str = ""
    category_label_tr: str = ""
    confidence: float = 0.0
    explanation_tr: str = ""
    key_observation: str = ""
    melodic_dtw_similarity: float = 0.0


_DTW_MAX_FRAMES = 500  # O(n²) — balanced: speed vs accuracy


def _melodic_dtw_similarity(chroma_a, chroma_b) -> float:
    best_score = 0.0
    if chroma_a.shape[1] > _DTW_MAX_FRAMES:
        step = max(1, chroma_a.shape[1] // _DTW_MAX_FRAMES)
        chroma_a = chroma_a[:, ::step]
    if chroma_b.shape[1] > _DTW_MAX_FRAMES:
        step = max(1, chroma_b.shape[1] // _DTW_MAX_FRAMES)
        chroma_b = chroma_b[:, ::step]

    for shift in range(12):
        chroma_b_shifted = np.roll(chroma_b, shift, axis=0)
        try:
            D, wp = dtw(X=chroma_a, Y=chroma_b_shifted, metric='cosine')
            normalized_cost = D[-1, -1] / len(wp)
            score = max(0.0, 1.0 - normalized_cost)
            if score > best_score: best_score = score
        except Exception:
            continue
    return float(best_score)


def _classify_risk(score: float) -> str:
    if score >= settings.THRESHOLD_HIGH:
        return "high"
    elif score >= settings.THRESHOLD_LOW:
        return "medium"
    return "low"


def _categorize(structural: float, melodic_dtw: float, fused: float) -> str:
    if fused < HARD_LIMIT_FUSED:
        return "Farklı Eserler / Tesadüfi Benzerlik"
    if structural > THRESH_BIREBIR_STRUCTURAL and melodic_dtw > THRESH_BIREBIR_MELODIC:
        return "Birebir Aynı"
    if fused >= 0.35 and melodic_dtw >= 0.80 and structural > 0.05:
        return "Cover/Aranje"
    if fused >= 0.35 and melodic_dtw >= 0.85 and structural <= 0.05:
        return "İntihal Şüphesi"
    return "Düşük/Orta Benzerlik"


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two 1-D vectors. Returns 0.0 if either is zero."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(np.clip(np.dot(a, b) / (norm_a * norm_b), 0.0, 1.0))


def _key_invariant_cosine(mat_a: np.ndarray, mat_b: np.ndarray) -> float:
    """Column-mean cosine similarity maximised over 12 semitone transpositions."""
    vec_a = mat_a.mean(axis=1)
    vec_b = mat_b.mean(axis=1)
    return max(_cosine_sim(np.roll(vec_a, shift), vec_b) for shift in range(12))


def _log_spectrogram(y: np.ndarray) -> np.ndarray:
    """Log-magnitude STFT, shape (freq_bins, time_bins)."""
    S = np.abs(librosa.stft(y, n_fft=_N_FFT, hop_length=_HOP))
    return np.log1p(S)


def _constellation_map(spec: np.ndarray) -> List[Tuple[int, int]]:
    """Return local maxima above threshold as (time_bin, freq_bin) list."""
    local_max = maximum_filter(spec, size=(_FILTER_SIZE, _FILTER_SIZE))
    is_peak = spec == local_max
    threshold = spec.mean() + _THRESHOLD_STD * spec.std()
    is_peak &= spec > threshold
    freq_idx, time_idx = np.where(is_peak)
    return sorted(zip(time_idx.tolist(), freq_idx.tolist()))


def _build_hashes(peaks: List[Tuple[int, int]]) -> Set[int]:
    """Hash anchor-target pairs into a fingerprint set."""
    hashes: Set[int] = set()
    n = len(peaks)
    for i, (t_anchor, f_anchor) in enumerate(peaks):
        targets_found = 0
        for j in range(i + 1, n):
            t_target, f_target = peaks[j]
            dt = t_target - t_anchor
            if dt > _TIME_WINDOW:
                break
            if targets_found >= _FAN_OUT:
                break
            hashes.add(f_anchor * 100000 + f_target * 1000 + dt)
            targets_found += 1
    return hashes


def _fingerprint_score(spec_a: np.ndarray, spec_b: np.ndarray) -> float:
    peaks_a = _constellation_map(spec_a)
    peaks_b = _constellation_map(spec_b)

    if not peaks_a or not peaks_b:
        return 0.0

    hash_a = _build_hashes(peaks_a)
    hash_b = _build_hashes(peaks_b)

    if not hash_a or not hash_b:
        return 0.0

    common = hash_a & hash_b
    score = float(np.clip(len(common) / min(len(hash_a), len(hash_b)), 0.0, 1.0))

    print(
        f"[NOTAIZ] score={score:.4f}"
        f"  peaks=({len(peaks_a)},{len(peaks_b)})"
        f"  hashes=({len(hash_a)},{len(hash_b)})"
        f"  common={len(common)}",
        flush=True,
    )
    return score


def compare_songs(path_a: str, path_b: str) -> float:
    """Load two audio files and return fingerprint similarity score [0.0, 1.0]."""
    y_a, _ = librosa.load(path_a, sr=_SR, mono=True)
    y_b, _ = librosa.load(path_b, sr=_SR, mono=True)
    return _fingerprint_score(_log_spectrogram(y_a), _log_spectrogram(y_b))


def compute_similarity(fa: AudioFeatures, fb: AudioFeatures) -> SimilarityResult:
    """Compute multi-metric similarity from AudioFeatures."""
    from app.services.llm_interpreter import interpret_similarity

    melodic    = round(_key_invariant_cosine(fa.chroma_cqt, fb.chroma_cqt), 4)
    harmonic   = round(_key_invariant_cosine(fa.hpcp, fb.hpcp), 4)
    rhythmic   = round(_cosine_sim(fa.tempogram.mean(axis=1), fb.tempogram.mean(axis=1)), 4)
    structural = round(_fingerprint_score(fa.log_mel, fb.log_mel), 4)

    melodic_dtw = round(_melodic_dtw_similarity(fa.chroma_cqt, fb.chroma_cqt), 4)

    # ESKI_KARAR_AGACI (v1 - 2026-05-25):
    # if structural >= 0.10:
    #     raw_fused = 0.75 + min(0.25, (structural - 0.10) * 1.5)
    # elif melodic_dtw >= 0.95:
    #     raw_fused = 0.70 + min(0.25, (melodic_dtw - 0.95) * 5)
    # elif melodic_dtw >= 0.85 and structural >= 0.04:
    #     raw_fused = 0.65 + min(0.20, (melodic_dtw - 0.85) * 2)
    # elif structural >= 0.065:
    #     raw_fused = 0.45 + min(0.19, (structural - 0.065) * 5)
    # else:
    #     raw_fused = 0.10 + (melodic_dtw * 0.15) + (structural * 1.5)

    # ESKI KARAR AGACI v2 (2026-05-25) - melodic_dtw destekli, Kuzu Kuzu/Techno yanlis yuksek cikiyor:
    # if structural >= 0.10:
    #     raw_fused = 0.75 + min(0.25, (structural - 0.10) * 1.5)
    # elif melodic_dtw >= 0.95:
    #     raw_fused = 0.70 + min(0.25, (melodic_dtw - 0.95) * 5)
    # elif melodic_dtw >= 0.85 and structural >= 0.04:
    #     raw_fused = 0.65 + min(0.20, (melodic_dtw - 0.85) * 2)
    # elif structural >= 0.065:
    #     raw_fused = 0.45 + min(0.19, (structural - 0.065) * 5)
    # else:
    #     raw_fused = 0.10 + (melodic_dtw * 0.15) + (structural * 1.5)

    # KARAR AGACI v6 (2026-05-28) - Melodi Hırsızlığı kuralı eklendi
    guard_fused = round(
        0.20 * melodic + 0.15 * harmonic + 0.10 * rhythmic + 0.55 * structural, 4
    )

    if structural >= 0.10:
        raw_fused = 0.75 + min(0.25, (structural - 0.10) * 1.5)
    elif melodic_dtw >= 0.95:
        raw_fused = 0.70 + min(0.25, (melodic_dtw - 0.95) * 5)
    elif melodic_dtw >= 0.85 and structural >= 0.04:  # Melodi Hırsızlığı
        raw_fused = 0.65 + min(0.20, (melodic_dtw - 0.85) * 2)
    elif structural >= 0.065:
        raw_fused = 0.45 + min(0.19, (structural - 0.065) * 5)
    else:
        raw_fused = 0.10 + (melodic_dtw * 0.15) + (structural * 1.5)
    fused = round(min(1.0, max(0.0, raw_fused)), 4)

    if guard_fused < HARD_LIMIT_FUSED:
        category = "Farklı Eserler / Tesadüfi Benzerlik"
    else:
        category = _categorize(structural, melodic_dtw, fused)

    print(
        f"[NOTAIZ] melodic={melodic:.4f}  harmonic={harmonic:.4f}"
        f"  rhythmic={rhythmic:.4f}  structural={structural:.4f}"
        f"  melodic_dtw={melodic_dtw:.4f}  fused={fused:.4f}",
        flush=True,
    )

    result = SimilarityResult(
        melodic_similarity=melodic,
        rhythmic_similarity=rhythmic,
        harmonic_similarity=harmonic,
        structural_similarity=structural,
        fused_score=fused,
        risk_level=_classify_risk(fused),
        uncertainty=0.0,
        alignment_path=[],
        category=category,
        category_label_tr=category,
        confidence=fused,
        melodic_dtw_similarity=melodic_dtw,
    )

    interp = interpret_similarity(
        structural=structural,
        melodic_dtw=melodic_dtw,
        fused=fused,
        rule_based_category=category,
    )
    result.explanation_tr = interp.get("explanation_tr", "")
    result.key_observation = category

    return result

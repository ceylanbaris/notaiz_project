"""Similarity engine — computes pairwise similarity between two AudioFeatures.

Implements spec §5.4:
  1. Cosine Similarity           (MFCC + Mel)    → weight 0.40
  2. Beat-synchronous DTW        (Chroma)        → weight 0.40
  3. Pearson Correlation          (Tempogram)     → weight 0.20
  4. Fused score = weighted sum
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
from scipy.spatial.distance import cosine as cosine_dist
from scipy.spatial.distance import euclidean
from scipy.stats import pearsonr

from app.core.config import settings
from app.services.feature_extractor import AudioFeatures


@dataclass
class SimilarityResult:
    cosine_similarity: float
    dtw_distance_normalized: float
    correlation: float
    fused_score: float
    risk_level: str
    uncertainty: float
    alignment_path: List[List[float]]


# ── Helpers ───────────────────────────────────────────────────────────

def _mean_vector(matrix: np.ndarray) -> np.ndarray:
    """Collapse time axis → single vector (mean across columns)."""
    return np.mean(matrix, axis=1)


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors (1 = identical)."""
    d = cosine_dist(a, b)  # scipy returns *distance*
    return float(np.clip(1.0 - d, 0.0, 1.0))


def _dtw_normalised(chroma_a: np.ndarray, chroma_b: np.ndarray) -> Tuple[float, List[List[float]]]:
    """Simple DTW on chroma features.

    Returns
    -------
    (score, alignment_path)
        score ∈ [0, 1] where 1 = identical.
    """
    from scipy.spatial.distance import cdist

    # Cost matrix
    D = cdist(chroma_a.T, chroma_b.T, metric="cosine")
    n, m = D.shape

    # Accumulated cost matrix
    C = np.full((n + 1, m + 1), np.inf)
    C[0, 0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            C[i, j] = D[i - 1, j - 1] + min(C[i - 1, j], C[i, j - 1], C[i - 1, j - 1])

    # Normalised distance
    path_len = n + m  # upper bound for path length
    norm_dist = C[n, m] / path_len if path_len > 0 else 0.0
    score = float(np.clip(1.0 - norm_dist, 0.0, 1.0))

    # Back-trace alignment path (subsampled for JSON size)
    path: List[List[float]] = []
    i, j = n, m
    while i > 0 and j > 0:
        path.append([float(i - 1), float(j - 1)])
        candidates = [
            (C[i - 1, j - 1], i - 1, j - 1),
            (C[i - 1, j], i - 1, j),
            (C[i, j - 1], i, j - 1),
        ]
        _, i, j = min(candidates, key=lambda x: x[0])
    path.reverse()

    # Subsample to max 200 points
    if len(path) > 200:
        step = len(path) // 200
        path = path[::step]

    return score, path


def _pearson_corr(tempogram_a: np.ndarray, tempogram_b: np.ndarray) -> float:
    """Mean Pearson correlation across tempo bins (mean vectors)."""
    va = _mean_vector(tempogram_a)
    vb = _mean_vector(tempogram_b)
    # Truncate to shortest
    min_len = min(len(va), len(vb))
    va = va[:min_len]
    vb = vb[:min_len]
    if min_len < 2:
        return 0.0
    r, _ = pearsonr(va, vb)
    return float(np.clip(r, 0.0, 1.0))


def _classify_risk(score: float) -> str:
    if score >= settings.THRESHOLD_HIGH:
        return "high"
    elif score >= settings.THRESHOLD_LOW:
        return "medium"
    return "low"


# ── Public API ────────────────────────────────────────────────────────

def compute_similarity(fa: AudioFeatures, fb: AudioFeatures) -> SimilarityResult:
    """Compare two feature sets and return a fused similarity result."""

    # 1. Cosine similarity (MFCC + Mel averaged)
    cos_mfcc = _cosine_sim(_mean_vector(fa.mfcc), _mean_vector(fb.mfcc))
    cos_mel = _cosine_sim(_mean_vector(fa.log_mel), _mean_vector(fb.log_mel))
    cosine_score = (cos_mfcc + cos_mel) / 2.0

    # 2. DTW on chroma
    dtw_score, alignment_path = _dtw_normalised(fa.chroma_cqt, fb.chroma_cqt)

    # 3. Pearson correlation on tempogram
    corr_score = _pearson_corr(fa.tempogram, fb.tempogram)

    # 4. Fused score
    fused = (
        settings.WEIGHT_COSINE * cosine_score
        + settings.WEIGHT_DTW * dtw_score
        + settings.WEIGHT_CORRELATION * corr_score
    )
    fused = float(np.clip(fused, 0.0, 1.0))

    # Uncertainty = std dev of the three metrics
    uncertainty = float(np.std([cosine_score, dtw_score, corr_score]))

    return SimilarityResult(
        cosine_similarity=round(cosine_score, 4),
        dtw_distance_normalized=round(dtw_score, 4),
        correlation=round(corr_score, 4),
        fused_score=round(fused, 4),
        risk_level=_classify_risk(fused),
        uncertainty=round(uncertainty, 4),
        alignment_path=alignment_path,
    )

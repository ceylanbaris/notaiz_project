"""ROC / PR threshold management utilities (spec §5.5).

The default thresholds are baked into config.  
This module provides helpers for programmatic re-calibration when
an evaluation dataset is available.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

from app.core.config import settings


@dataclass
class ThresholdConfig:
    low: float
    high: float

    def classify(self, score: float) -> str:
        if score >= self.high:
            return "high"
        if score >= self.low:
            return "medium"
        return "low"


def get_current_thresholds() -> ThresholdConfig:
    return ThresholdConfig(low=settings.THRESHOLD_LOW, high=settings.THRESHOLD_HIGH)


def calibrate_thresholds(
    scores: List[float],
    labels: List[int],
    target_fpr: float = 0.05,
) -> ThresholdConfig:
    """Calibrate thresholds from a scored evaluation set.

    Parameters
    ----------
    scores : list[float]
        Fused similarity scores.
    labels : list[int]
        Ground truth (1 = similar, 0 = non-similar).
    target_fpr : float
        Maximum false-positive rate for the *high* threshold.

    Returns
    -------
    ThresholdConfig
    """
    from sklearn.metrics import roc_curve

    fpr, tpr, thresholds = roc_curve(labels, scores)
    # High threshold: find the score where FPR ≤ target_fpr
    idx_high = np.searchsorted(fpr, target_fpr)
    high_thresh = float(thresholds[min(idx_high, len(thresholds) - 1)])

    # Low threshold: midpoint between 0 and high
    low_thresh = high_thresh * 0.6

    return ThresholdConfig(low=round(low_thresh, 4), high=round(high_thresh, 4))

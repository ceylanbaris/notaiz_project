"""Audio pre-processing pipeline.

Steps (per spec §5.2):
  1. Mono conversion
  2. Resample to 22 050 Hz
  3. Peak normalisation
  4. Silence trimming (top_db=20)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import librosa
import numpy as np

from app.core.config import settings


@dataclass
class ProcessedAudio:
    """Container for a pre-processed audio signal."""

    signal: np.ndarray  # mono float32
    sr: int
    duration: float  # seconds


def load_and_preprocess(path: str) -> ProcessedAudio:
    """Load an audio file and run the full pre-processing pipeline.

    Parameters
    ----------
    path : str
        Path to the audio file (mp3, wav, flac, ogg).

    Returns
    -------
    ProcessedAudio
        Cleaned mono signal at 22 050 Hz.
    """
    # 1. Load → mono, target SR
    y, sr = librosa.load(path, sr=settings.SAMPLE_RATE, mono=True)

    # 2. Peak normalisation
    peak = np.max(np.abs(y))
    if peak > 0:
        y = y / peak

    # 3. Silence trimming
    y_trimmed, _ = librosa.effects.trim(y, top_db=settings.TOP_DB)

    duration = float(len(y_trimmed) / sr)

    return ProcessedAudio(signal=y_trimmed, sr=sr, duration=duration)

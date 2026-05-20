"""Feature extraction module.

Extracts from each audio signal:
  - MFCC (13 coefficients)
  - Log-Mel Spectrogram
  - CQT-Chroma
  - HPCP (Harmonic Pitch Class Profile)
  - Tempogram
  - 4-bar audio segments (for Szymkiewicz-Simpson melodic comparison)
All feature matrices are L2-normalised where applicable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

import librosa
import numpy as np
from sklearn.preprocessing import normalize

from app.core.config import settings
from app.services.audio_processor import ProcessedAudio


@dataclass
class AudioFeatures:
    """Bag of extracted feature matrices."""

    mfcc: np.ndarray          # (n_mfcc, T)
    log_mel: np.ndarray       # (n_mels, T)
    chroma_cqt: np.ndarray    # (12, T)
    hpcp: np.ndarray          # (12, T)
    tempogram: np.ndarray     # (win_length, T)
    segments: List[np.ndarray] = field(default_factory=list)  # 4-bar audio chunks (not serialized)
    sr: int = 22050           # sample rate for segment re-analysis (not serialized)

    def to_serialisable(self) -> Dict[str, list]:
        """Convert numpy arrays to JSON-safe lists (segments/sr excluded)."""
        return {
            "mfcc": self.mfcc.tolist(),
            "log_mel": self.log_mel.tolist(),
            "chroma_cqt": self.chroma_cqt.tolist(),
            "hpcp": self.hpcp.tolist(),
            "tempogram": self.tempogram.tolist(),
        }

    @classmethod
    def from_serialisable(cls, data: Dict[str, list]) -> "AudioFeatures":
        return cls(
            mfcc=np.array(data["mfcc"]),
            log_mel=np.array(data["log_mel"]),
            chroma_cqt=np.array(data["chroma_cqt"]),
            hpcp=np.array(data["hpcp"]),
            tempogram=np.array(data["tempogram"]),
        )


def _l2_norm(matrix: np.ndarray) -> np.ndarray:
    """L2-normalise each column of a 2-D matrix."""
    if matrix.ndim == 1:
        n = np.linalg.norm(matrix)
        return matrix / n if n > 0 else matrix
    return normalize(matrix, axis=0, norm="l2")


def _extract_4bar_segments(audio: ProcessedAudio) -> List[np.ndarray]:
    """Split audio into non-overlapping 4-bar segments via beat tracking.

    Falls back to equal 8-second chunks when beat tracking yields fewer than
    2 segments (very short or arhythmic audio).
    """
    y = audio.signal
    sr = audio.sr
    beats_per_segment = settings.BEATS_PER_BAR * settings.BARS_PER_SEGMENT  # 16 beats

    try:
        _, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=settings.HOP_LENGTH)
        beat_samples = librosa.frames_to_samples(beat_frames, hop_length=settings.HOP_LENGTH)

        segments: List[np.ndarray] = []
        for i in range(0, len(beat_samples) - beats_per_segment + 1, beats_per_segment):
            start = int(beat_samples[i])
            end = int(beat_samples[min(i + beats_per_segment, len(beat_samples) - 1)])
            seg = y[start:end]
            if len(seg) >= sr // 2:
                segments.append(seg)
    except Exception:
        segments = []

    if len(segments) < 2:
        chunk_len = int(sr * 8)
        segments = [y[i:i + chunk_len] for i in range(0, len(y) - chunk_len + 1, chunk_len)]

    return segments


def extract_features(audio: ProcessedAudio) -> AudioFeatures:
    y = audio.signal
    sr = audio.sr
    n_fft = settings.N_FFT
    hop = settings.HOP_LENGTH

    # Shared STFT for mel-based features
    D = librosa.stft(y, n_fft=n_fft, hop_length=hop)
    S_mag = np.abs(D)
    S_power = S_mag ** 2

    mel = librosa.feature.melspectrogram(S=S_power, sr=sr, n_fft=n_fft, hop_length=hop, n_mels=128)
    log_mel = librosa.power_to_db(mel, ref=np.max)

    mfcc = librosa.feature.mfcc(S=log_mel, n_mfcc=settings.N_MFCC)

    # CQT-based chroma — required for accurate cover/melody detection
    chroma_cqt = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    chroma_cqt = _l2_norm(chroma_cqt)

    hpcp = librosa.feature.chroma_cens(y=y, sr=sr, hop_length=hop)
    hpcp = _l2_norm(hpcp)

    tempogram = librosa.feature.tempogram(y=y, sr=sr, hop_length=hop)

    return AudioFeatures(
        mfcc=mfcc,
        log_mel=log_mel,
        chroma_cqt=chroma_cqt,
        hpcp=hpcp,
        tempogram=tempogram,
        segments=[],
        sr=sr,
    )

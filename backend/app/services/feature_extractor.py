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

from dataclasses import dataclass
from typing import Dict

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
    sr: int = 22050

    def to_serialisable(self) -> Dict[str, list]:
        """Convert numpy arrays to JSON-safe lists."""
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


def extract_features(audio: ProcessedAudio) -> AudioFeatures:
    """Extract all feature sets from a pre-processed audio signal.

    Parameters
    ----------
    audio : ProcessedAudio
        Output of `audio_processor.load_and_preprocess`.

    Returns
    -------
    AudioFeatures
    """
    y = audio.signal
    sr = audio.sr
    n_fft = settings.N_FFT
    hop = settings.HOP_LENGTH

    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=settings.N_MFCC, n_fft=n_fft, hop_length=hop)

    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=n_fft, hop_length=hop, n_mels=128)
    log_mel = librosa.power_to_db(mel, ref=np.max)

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
        sr=sr,
    )

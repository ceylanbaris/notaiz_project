"""Temporary file management utilities."""

from __future__ import annotations

import hashlib
import os
import shutil
import time
import uuid
from pathlib import Path

from app.core.config import settings


def ensure_upload_dir() -> Path:
    """Create upload directory if it doesn't exist and return the path."""
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


async def save_upload(file_bytes: bytes, original_filename: str) -> str:
    """Save uploaded bytes to a temp file and return its path."""
    upload_dir = ensure_upload_dir()
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "wav"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = upload_dir / filename
    filepath.write_bytes(file_bytes)
    return str(filepath)


def compute_file_hash(file_bytes: bytes) -> str:
    """SHA-256 hash of file contents."""
    return hashlib.sha256(file_bytes).hexdigest()


def cleanup_file(path: str) -> None:
    """Remove a temporary file if it exists."""
    try:
        if os.path.exists(path):
            os.unlink(path)
    except OSError:
        pass


def cleanup_expired_files() -> int:
    """Remove files older than FILE_TTL_SECONDS from the upload directory.

    Returns the number of removed files.
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    if not upload_dir.exists():
        return 0

    now = time.time()
    removed = 0
    for f in upload_dir.iterdir():
        if f.is_file():
            age = now - f.stat().st_mtime
            if age > settings.FILE_TTL_SECONDS:
                f.unlink(missing_ok=True)
                removed += 1
    return removed

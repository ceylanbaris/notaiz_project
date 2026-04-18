"""File upload validation utilities."""

from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS = {"mp3", "wav", "flac", "ogg"}
ALLOWED_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/ogg",
    "audio/x-flac",
}


def validate_audio_file(file: UploadFile) -> None:
    """Raise HTTPException if the uploaded file is not a valid audio file."""

    # Extension check
    if file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Desteklenmeyen dosya formatı: .{ext}. Desteklenen: {', '.join(ALLOWED_EXTENSIONS)}",
            )

    # Content type check (fallback)
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        # Some browsers don't send correct content type — tolerate if extension is valid
        pass

    # Size check will happen after reading the file in the route handler

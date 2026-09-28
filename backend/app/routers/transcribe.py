"""
transcribe.py — Speech-to-text endpoint using Gemini's audio understanding.

POST /transcribe
  Accepts: multipart/form-data with an audio file field named "audio"
  Returns: { "transcription": "...", "language": "fr" }

Gemini 3.6 Flash can transcribe audio files directly via the Files API.
We upload the audio inline as base64 for small files (< 20MB).
"""

import base64
import logging
import os

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.models.user import User
from app.outils.deps import get_current_user

logger = logging.getLogger("djohealth.transcribe")

router = APIRouter(prefix="/transcribe", tags=["transcribe"])

_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
_SSL_VERIFY = os.getenv("GEMINI_SSL_VERIFY", "false").lower() == "true"
_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
_MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


class TranscribeResponse(BaseModel):
    transcription: str
    language: str = "fr"


@router.post("", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe (wav, m4a, mp3, ogg, webm)"),
    _: User = Depends(get_current_user),
):
    """
    Transcribe an audio recording to text using Gemini.
    Intended for voice messages in the translation chat.
    """
    if not _API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La transcription vocale n'est pas disponible (GEMINI_API_KEY manquant).",
        )

    # Read and size-check the file
    content = await audio.read()
    if len(content) > _MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Fichier audio trop volumineux (max 20 MB).",
        )

    # Determine MIME type
    filename = (audio.filename or "audio.wav").lower()
    mime_map = {
        ".wav": "audio/wav",
        ".mp3": "audio/mp3",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".flac": "audio/flac",
    }
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".wav"
    mime_type = mime_map.get(ext, "audio/wav")

    # Encode as base64 for inline Gemini request
    audio_b64 = base64.b64encode(content).decode("utf-8")

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": audio_b64,
                        }
                    },
                    {
                        "text": (
                            "Transcris exactement ce que dit cette personne en français. "
                            "Réponds UNIQUEMENT avec la transcription, sans ponctuation superflue, "
                            "sans guillemets et sans explication."
                        )
                    },
                ]
            }
        ],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.1},
    }

    url = f"{_BASE_URL}?key={_API_KEY}"

    try:
        with httpx.Client(timeout=60.0, verify=_SSL_VERIFY) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            transcription = (
                data["candidates"][0]["content"]["parts"][0]["text"].strip()
            )
            logger.info("Transcribed %d bytes → %d chars", len(content), len(transcription))
            return TranscribeResponse(transcription=transcription)
    except (KeyError, IndexError) as exc:
        logger.error("Gemini transcribe parse error: %s | response: %s", exc, data if 'data' in dir() else 'N/A')
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erreur de transcription — réponse inattendue du service IA.",
        )
    except httpx.HTTPError as exc:
        logger.error("Gemini transcribe HTTP error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Service de transcription indisponible: {exc}",
        )

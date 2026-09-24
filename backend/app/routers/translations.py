"""
translations.py — stores translation history for the mobile app
and provides a simple passthrough /translate endpoint.

The actual ML translation (Français ↔ Ghomala) happens on a separate
AI service. If TRANSLATION_API_URL is set in the environment, this router
proxies the request there. Otherwise it returns a placeholder so the rest
of the app (history, saving) still works during development.
"""

import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.translation import Translation
from app.models.user import User
from app.outils.deps import get_current_user
from app.schemas.translation import (
    TranslateRequest,
    TranslateResponse,
    TranslationCreate,
    TranslationOut,
)

router = APIRouter(tags=["translations"])

TRANSLATION_API_URL = os.getenv("TRANSLATION_API_URL", "")

NLLB_CODES = {
    "francais": "fra_Latn",
    "français": "fra_Latn",
    "ghomala": "bax_Latn",
}


# ── Translation history (mobile app) ─────────────────────────────────────────

@router.get("/translations", response_model=list[TranslationOut])
def list_translations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Translation)
        .filter(Translation.user_id == current_user.id)
        .order_by(Translation.id.desc())
        .all()
    )


@router.post("/translations", response_model=TranslationOut, status_code=status.HTTP_201_CREATED)
def save_translation(
    data: TranslationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = Translation(
        user_id=current_user.id,
        langue_source=data.langue_source,
        langue_cible=data.langue_cible,
        type_entree=data.type_entree,
        message_original=data.message_original,
        transcription=data.transcription,
        traduction=data.traduction,
        audio_source=data.audio_source,
        audio_traduction=data.audio_traduction,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/translations/{translation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_translation(
    translation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(Translation).filter(
        Translation.id == translation_id,
        Translation.user_id == current_user.id,
    ).first()
    if entry:
        db.delete(entry)
        db.commit()


# ── Translate endpoint ────────────────────────────────────────────────────────

@router.post("/translate", response_model=TranslateResponse)
async def translate(
    data: TranslateRequest,
    _: User = Depends(get_current_user),
):
    text = (data.message_original or "").strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message_original ne peut pas être vide.",
        )

    if TRANSLATION_API_URL:
        # Proxy to the external AI translation service
        src = NLLB_CODES.get(data.langue_source.lower(), data.langue_source)
        tgt = NLLB_CODES.get(data.langue_cible.lower(), data.langue_cible)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{TRANSLATION_API_URL}/translate",
                    json={"text": text, "source_language": src, "target_language": tgt},
                )
                resp.raise_for_status()
                result = resp.json()
                traduction = result.get("traduction") or result.get("translation") or text
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Service de traduction indisponible: {exc}",
            )
    else:
        # Development placeholder — echoes text back with a notice
        traduction = f"[Traduction non disponible — configurez TRANSLATION_API_URL] {text}"

    return TranslateResponse(
        traduction=traduction,
        langue_source=data.langue_source,
        langue_cible=data.langue_cible,
    )

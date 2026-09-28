"""
notifications.py — Push token registration and notification sending.

The mobile app registers its Expo push token here after login.
When an appointment status changes, the backend sends a push notification
via Expo's push service (https://exp.host/--/api/v2/push/send).
"""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.push_token import PushToken
from app.models.user import User
from app.outils.deps import get_current_user

logger = logging.getLogger("djohealth.notifications")

router = APIRouter(prefix="/notifications", tags=["notifications"])

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


# ── Schemas ───────────────────────────────────────────────────────────────────

class PushTokenRegister(BaseModel):
    token: str
    platform: Optional[str] = None  # 'ios' | 'android' | 'web'


class PushMessage(BaseModel):
    title: str
    body: str
    data: dict = {}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register-token", status_code=status.HTTP_204_NO_CONTENT)
def register_token(
    payload: PushTokenRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register (or update) the Expo push token for the current user's device."""
    existing = db.query(PushToken).filter(PushToken.token == payload.token).first()
    if existing:
        # Re-associate with this user in case the device was re-used
        existing.user_id = current_user.id
        existing.platform = payload.platform
    else:
        db.add(PushToken(
            user_id=current_user.id,
            token=payload.token,
            platform=payload.platform,
        ))
    db.commit()


@router.delete("/register-token", status_code=status.HTTP_204_NO_CONTENT)
def unregister_token(
    payload: PushTokenRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a push token (e.g. on logout)."""
    db.query(PushToken).filter(
        PushToken.token == payload.token,
        PushToken.user_id == current_user.id,
    ).delete()
    db.commit()


# ── Internal helper ───────────────────────────────────────────────────────────

async def send_push_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    """
    Send a push notification to all registered devices of a user.
    Called internally (not exposed as an endpoint).
    """
    tokens = db.query(PushToken).filter(PushToken.user_id == user_id).all()
    if not tokens:
        return

    messages = [
        {
            "to": t.token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "priority": "high",
        }
        for t in tokens
    ]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            result = resp.json()
            logger.info("Push sent to user %d: %s", user_id, result)
    except httpx.HTTPError as exc:
        logger.warning("Push notification failed for user %d: %s", user_id, exc)

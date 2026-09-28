"""
websocket.py — Real-time messaging via WebSocket.

Clients connect to /ws?token=<jwt> and receive/send JSON frames:

  Incoming (client → server):
    { "type": "message", "recipient_id": 5, "text": "Hello" }

  Outgoing (server → client):
    { "type": "message", "id": 1, "sender_id": 3, "sender_name": "Alice",
      "recipient_id": 5, "text": "Hello", "created_at": "..." }
    { "type": "error", "detail": "..." }

The server keeps an in-process registry of active connections keyed by user_id.
When a message is sent, it is persisted to the DB and forwarded to the recipient
if they are currently connected.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.message import Message
from app.models.user import User
from app.outils.auth import decode_token

logger = logging.getLogger("djohealth.ws")

router = APIRouter(tags=["websocket"])

# ── Connection registry ───────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self) -> None:
        # user_id → list of active WebSocket connections (same user may have multiple tabs)
        self._connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(user_id, []).append(ws)
        logger.info("WS connect: user %d (%d active)", user_id, self.count())

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        conns = self._connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self._connections.pop(user_id, None)
        logger.info("WS disconnect: user %d (%d active)", user_id, self.count())

    async def send_to(self, user_id: int, payload: dict) -> None:
        for ws in self._connections.get(user_id, []):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                pass  # stale connection — will be cleaned up on next disconnect

    def count(self) -> int:
        return sum(len(v) for v in self._connections.values())


manager = ConnectionManager()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = ""):
    # Authenticate via query-param JWT (browsers cannot set custom WS headers)
    payload = decode_token(token) if token else None
    if not payload or "sub" not in payload:
        await ws.close(code=4001)
        return

    db: Session = SessionLocal()
    try:
        user: User | None = db.query(User).filter(User.email == payload["sub"]).first()
        if not user:
            await ws.close(code=4001)
            return

        await manager.connect(user.id, ws)

        try:
            while True:
                raw = await ws.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    await ws.send_text(json.dumps({"type": "error", "detail": "JSON invalide."}))
                    continue

                if data.get("type") != "message":
                    continue

                text = str(data.get("text", "")).strip()
                recipient_id = data.get("recipient_id")

                if not text:
                    continue

                # Persist message
                recipient = db.query(User).filter(User.id == recipient_id).first() if recipient_id else None
                msg = Message(
                    sender_id=user.id,
                    sender_name=user.name,
                    recipient_id=recipient.id if recipient else None,
                    recipient_name=recipient.name if recipient else None,
                    text=text,
                    created_at=datetime.now(timezone.utc).isoformat(),
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                frame = {
                    "type": "message",
                    "id": msg.id,
                    "sender_id": msg.sender_id,
                    "sender_name": msg.sender_name,
                    "recipient_id": msg.recipient_id,
                    "recipient_name": msg.recipient_name,
                    "text": msg.text,
                    "created_at": msg.created_at,
                }

                # Echo back to sender
                await ws.send_text(json.dumps(frame))

                # Forward to recipient if online
                if recipient:
                    await manager.send_to(recipient.id, frame)

        except WebSocketDisconnect:
            manager.disconnect(user.id, ws)

    finally:
        db.close()

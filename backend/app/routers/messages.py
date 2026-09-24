from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.message import Message
from app.models.user import User
from app.outils.deps import get_current_user
from app.schemas.message import MessageCreate, MessageOut

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=list[MessageOut])
def list_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all messages where the current user is sender or recipient."""
    return (
        db.query(Message)
        .filter(
            (Message.sender_id == current_user.id)
            | (Message.recipient_id == current_user.id)
        )
        .order_by(Message.id.asc())
        .all()
    )


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def create_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = Message(
        sender_id=current_user.id,
        sender_name=current_user.name,
        recipient_id=data.recipient_id,
        recipient_name=data.recipient_name,
        text=data.text,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == current_user.id,
    ).first()
    if msg:
        db.delete(msg)
        db.commit()

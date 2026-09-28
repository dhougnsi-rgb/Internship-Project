from sqlalchemy import Column, ForeignKey, Integer, String
from app.database import Base


class PushToken(Base):
    """Stores Expo push tokens per user device."""

    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, nullable=False, unique=True)
    platform = Column(String, nullable=True)  # 'ios' | 'android' | 'web'

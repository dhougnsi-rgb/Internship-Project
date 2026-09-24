from sqlalchemy import Column, ForeignKey, Integer, String, Text
from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    # sender / recipient are user ids (nullable so patient-to-staff messages work without staff id)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    sender_name = Column(String, nullable=True)
    recipient_name = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(String, nullable=True)   # ISO timestamp string

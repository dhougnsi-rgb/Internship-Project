from sqlalchemy import Column, ForeignKey, Integer, String, Text
from app.database import Base


class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    langue_source = Column(String, nullable=False)
    langue_cible = Column(String, nullable=False)
    type_entree = Column(String, nullable=True, default="texte")   # texte | vocal
    message_original = Column(Text, nullable=True)
    transcription = Column(Text, nullable=True)
    traduction = Column(Text, nullable=True)
    audio_source = Column(String, nullable=True)
    audio_traduction = Column(String, nullable=True)
    created_at = Column(String, nullable=True)

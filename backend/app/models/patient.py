from sqlalchemy import Column, ForeignKey, Integer, String, Text
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    category = Column(String, nullable=False, default="Ambulatoire")
    motif = Column(Text, nullable=True)
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    last_visit = Column(String, nullable=True)

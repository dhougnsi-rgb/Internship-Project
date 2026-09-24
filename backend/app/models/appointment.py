from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True, index=True)
    patient_name = Column(String, nullable=False)
    patient_avatar = Column(String, nullable=True)
    patient_category = Column(String, nullable=True)
    requested_date = Column(String, nullable=False)
    requested_time = Column(String, nullable=False)
    ai_assessment = Column(String, nullable=True)
    ai_symptoms = Column(Text, nullable=True)      # JSON-encoded list
    ai_confidence = Column(Float, nullable=True, default=0.0)
    status = Column(String, nullable=False, default="pending")   # pending | accepted | rescheduled
    new_date = Column(String, nullable=True)
    new_time = Column(String, nullable=True)
    review_status = Column(String, nullable=True, default="pending")  # pending | confirmed | rejected
    review_notes = Column(Text, nullable=True)

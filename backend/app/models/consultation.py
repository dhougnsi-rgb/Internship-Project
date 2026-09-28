from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from app.database import Base


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True, index=True)
    # Link back to the appointment that generated this consultation (nullable for manual ones)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True, unique=True, index=True)
    patient_nom = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    sexe = Column(String, nullable=True)          # 'M' | 'F'
    service = Column(String, nullable=True)
    medecin = Column(String, nullable=True)
    heure = Column(String, nullable=True)
    motif = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="En attente")  # En attente | En cours | Terminé
    urgent = Column(Boolean, nullable=False, default=False)
    dossier = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    diagnostic = Column(Text, nullable=True)

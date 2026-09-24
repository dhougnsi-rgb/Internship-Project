from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.consultation import Consultation
from app.models.user import User
from app.outils.deps import require_roles
from app.schemas.consultation import ConsultationCreate, ConsultationOut, ConsultationUpdate

router = APIRouter(prefix="/consultations", tags=["consultations"])

CLINICAL_ROLES = ("doctor", "administrator", "staff")


@router.get("", response_model=list[ConsultationOut])
def list_consultations(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    return db.query(Consultation).order_by(Consultation.id.desc()).all()


@router.post("", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
def create_consultation(
    data: ConsultationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    consultation = Consultation(
        patient_nom=data.patient_nom.strip(),
        age=data.age,
        sexe=data.sexe,
        service=data.service,
        medecin=data.medecin,
        heure=data.heure,
        motif=data.motif,
        status=data.status,
        urgent=data.urgent,
        dossier=data.dossier,
        patient_id=data.patient_id,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.patch("/{consultation_id}", response_model=ConsultationOut)
def update_consultation(
    consultation_id: int,
    data: ConsultationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation introuvable.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(consultation, key, value)
    db.commit()
    db.refresh(consultation)
    return consultation


@router.delete("/{consultation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation introuvable.")
    db.delete(consultation)
    db.commit()

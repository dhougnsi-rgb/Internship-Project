from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.outils.deps import require_roles
from app.outils.exceptions import NotFoundError, ValidationError
from app.schemas.patient import PatientCreate, PatientOut, PatientUpdate

router = APIRouter(prefix="/patients", tags=["patients"])

CLINICAL_ROLES = ("doctor", "administrator")
CATEGORIES = {
    "Hospitalise",
    "En Observation",
    "Ambulatoire",
    "Urgences",
    "Sortant",
}


@router.get("", response_model=list[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    return db.query(Patient).order_by(Patient.id.desc()).all()


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    data: PatientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    category = data.category if data.category in CATEGORIES else "Ambulatoire"
    patient = Patient(
        name=data.name.strip(),
        age=data.age,
        category=category,
        motif=data.motif,
        phone_number=data.phone_number,
        email=str(data.email).lower() if data.email else None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise NotFoundError(detail="Patient introuvable.")

    updates = data.model_dump(exclude_unset=True)
    if "category" in updates and updates["category"] not in CATEGORIES:
        raise ValidationError(detail="Catégorie invalide.")
    if "name" in updates and updates["name"]:
        updates["name"] = updates["name"].strip()

    for key, value in updates.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise NotFoundError(detail="Patient introuvable.")
    db.delete(patient)
    db.commit()

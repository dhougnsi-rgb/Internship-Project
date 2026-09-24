from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.appointment import Appointment
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.translation import Translation
from app.models.user import User
from app.outils.deps import require_roles

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CLINICAL_ROLES = ("doctor", "administrator", "staff")


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    total_patients = db.query(Patient).count()
    total_translations = db.query(Translation).count()
    total_consultations = db.query(Consultation).count()
    pending_appointments = (
        db.query(Appointment).filter(Appointment.status == "pending").count()
    )

    return {
        "total_patients": total_patients,
        "total_translations": total_translations,
        "total_consultations": total_consultations,
        "pending_appointments": pending_appointments,
    }

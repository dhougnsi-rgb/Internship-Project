from fastapi import APIRouter, Depends
from sqlalchemy import func
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

    # Top diagnostics from consultations (for pie chart)
    diagnosis_rows = (
        db.query(Consultation.diagnostic, func.count(Consultation.id).label("count"))
        .filter(Consultation.diagnostic.isnot(None), Consultation.diagnostic != "")
        .group_by(Consultation.diagnostic)
        .order_by(func.count(Consultation.id).desc())
        .limit(5)
        .all()
    )
    diagnosis_data = [{"name": row.diagnostic, "value": row.count} for row in diagnosis_rows]

    # Patient language breakdown from translation history (for bar chart)
    language_rows = (
        db.query(Translation.langue_source, func.count(Translation.id).label("count"))
        .group_by(Translation.langue_source)
        .order_by(func.count(Translation.id).desc())
        .all()
    )
    language_data = [{"name": row.langue_source.capitalize(), "value": row.count} for row in language_rows]

    return {
        "total_patients": total_patients,
        "total_translations": total_translations,
        "total_consultations": total_consultations,
        "pending_appointments": pending_appointments,
        "diagnosis_data": diagnosis_data,
        "language_data": language_data,
    }

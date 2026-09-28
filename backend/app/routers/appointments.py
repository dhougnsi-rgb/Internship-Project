import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.appointment import Appointment
from app.models.consultation import Consultation
from app.models.patient import Patient
from app.models.user import User
from app.outils.deps import get_current_user, require_roles
from app.outils.exceptions import NotFoundError
from app.routers.notifications import send_push_to_user
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate

logger = logging.getLogger("djohealth.appointments")

router = APIRouter(prefix="/appointments", tags=["appointments"])

CLINICAL_ROLES = ("doctor", "administrator", "staff")

_STATUS_MESSAGES = {
    "accepted":    ("Rendez-vous confirmé ✅", "Votre rendez-vous a été accepté."),
    "rescheduled": ("Rendez-vous reprogrammé 📅", "Votre rendez-vous a été déplacé. Vérifiez la nouvelle date."),
    "rejected":    ("Rendez-vous annulé ❌", "Votre rendez-vous n'a pas pu être confirmé. Contactez le service médical."),
}


def _create_consultation_from_appointment(
    db: Session,
    appt: Appointment,
    doctor_name: str | None,
    doctor_notes: str | None,
) -> None:
    """
    Auto-create a Consultation record when a doctor confirms an AI pre-diagnostic.
    Skips silently if a consultation already exists for this appointment.
    """
    # Guard: don't duplicate if already created
    existing = db.query(Consultation).filter(
        Consultation.appointment_id == appt.id
    ).first()
    if existing:
        return

    # Parse symptoms back from JSON string
    symptoms: list[str] = []
    if appt.ai_symptoms:
        try:
            symptoms = json.loads(appt.ai_symptoms)
        except Exception:
            symptoms = [appt.ai_symptoms]

    motif = appt.ai_assessment or ""
    if symptoms:
        motif = (motif + " — " if motif else "") + ", ".join(symptoms)

    # Determine urgency from ai_assessment text
    urgent = bool(appt.ai_assessment and "URGENT" in appt.ai_assessment.upper())

    consultation = Consultation(
        patient_id=appt.patient_id,
        patient_nom=appt.patient_name,
        appointment_id=appt.id,
        heure=appt.requested_time,
        motif=motif,
        medecin=doctor_name,
        diagnostic=appt.ai_assessment,
        notes=doctor_notes,
        status="Terminé",
        urgent=urgent,
    )
    db.add(consultation)
    db.commit()
    logger.info(
        "Auto-created consultation for appointment %d (patient: %s)",
        appt.id, appt.patient_name,
    )


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    return db.query(Appointment).order_by(Appointment.id.desc()).all()


@router.get("/mine", response_model=list[AppointmentOut])
def list_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return appointments for the currently logged-in patient."""
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    return (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient.id)
        .order_by(Appointment.id.desc())
        .all()
    )


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    appt = Appointment(
        patient_name=data.patient_name.strip(),
        patient_avatar=data.patient_avatar,
        patient_category=data.patient_category,
        requested_date=data.requested_date,
        requested_time=data.requested_time,
        ai_assessment=data.ai_assessment,
        ai_symptoms=json.dumps(data.ai_symptoms),
        ai_confidence=data.ai_confidence,
        status="pending",
        patient_id=data.patient_id,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise NotFoundError(detail="Rendez-vous introuvable.")

    old_review_status = appt.review_status
    old_appt_status = appt.status

    # Apply all updates except the extra fields used only for consultation creation
    doctor_name = data.doctor_name or current_user.name
    doctor_notes = data.doctor_notes

    update_fields = data.model_dump(exclude_unset=True, exclude={"doctor_name", "doctor_notes"})
    for key, value in update_fields.items():
        setattr(appt, key, value)
    db.commit()
    db.refresh(appt)

    # ── Auto-create Consultation when doctor confirms ──────────────────────
    new_review_status = appt.review_status
    if (
        new_review_status == "confirmed"
        and old_review_status != "confirmed"
    ):
        _create_consultation_from_appointment(db, appt, doctor_name, doctor_notes)
        # Also accept the appointment itself
        if appt.status == "pending":
            appt.status = "accepted"
            db.commit()
            db.refresh(appt)

    # ── Push notification on appointment status change ────────────────────
    new_appt_status = appt.status
    if new_appt_status != old_appt_status and new_appt_status in _STATUS_MESSAGES and appt.patient_id:
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        if patient and patient.user_id:
            title, body = _STATUS_MESSAGES[new_appt_status]
            if new_appt_status == "rescheduled" and appt.new_date and appt.new_time:
                body = f"Nouvelle date : {appt.new_date} à {appt.new_time}."
            background_tasks.add_task(
                send_push_to_user,
                db, patient.user_id, title, body,
                {"appointment_id": appt.id, "status": new_appt_status},
            )

    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*CLINICAL_ROLES)),
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise NotFoundError(detail="Rendez-vous introuvable.")
    db.delete(appt)
    db.commit()

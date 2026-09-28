"""
diagnose.py — AI-powered pre-diagnostic endpoint.

POST /diagnose
  Input: patient-reported symptoms (symptom, duration, severity, extra)
  Output: structured pre-diagnostic with hypothesis, urgency, recommendations

Powered by Gemini. Falls back to keyword matching if GEMINI_API_KEY is not set.
"""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.outils.deps import get_current_user
from app.outils.gemini import gemini_diagnose

logger = logging.getLogger("djohealth.diagnose")

router = APIRouter(prefix="/diagnose", tags=["diagnose"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DiagnoseRequest(BaseModel):
    symptom: str = Field(min_length=2, max_length=500)
    duration: str = Field(default="non précisé", max_length=100)
    severity: str = Field(default="5", max_length=10)   # "1"–"10"
    extra_symptoms: str = Field(default="", max_length=500)


class DiagnoseResponse(BaseModel):
    assessment: str
    urgency: str          # "normal" | "a_surveiller" | "urgent"
    confidence: int       # 0–100
    symptoms: list[str]
    recommendations: list[str]
    warning: str | None = None
    powered_by: str       # "gemini" | "keyword_matching"


# ── Keyword fallback (used when GEMINI_API_KEY is not set) ────────────────────

def _keyword_diagnose(symptom: str, severity: str, extra_symptoms: str) -> DiagnoseResponse:
    lower = symptom.lower()
    assessment = "Consultation générale recommandée"
    recommendations = [
        "Consultez un médecin dès que possible.",
        "Notez l'évolution de vos symptômes.",
        "Restez hydraté et reposez-vous.",
    ]

    if any(w in lower for w in ["fièvre", "fever", "température", "chaleur"]):
        assessment = "Syndrome fébrile possible"
        recommendations = ["Prenez votre température régulièrement.", "Restez hydraté.", "Consultez si la fièvre dépasse 39°C."]
    elif any(w in lower for w in ["douleur", "mal ", "douleurs"]):
        assessment = "Syndrome douloureux à évaluer"
        recommendations = ["Localisez et décrivez la douleur au médecin.", "Évitez les anti-douleurs sans avis médical."]
    elif any(w in lower for w in ["toux", "rhume", "grippe", "respirat"]):
        assessment = "Infection respiratoire possible"
        recommendations = ["Aérez votre espace.", "Portez un masque.", "Consultez si la toux dure plus de 7 jours."]
    elif any(w in lower for w in ["nausée", "vomis", "ventre", "gastro", "digest"]):
        assessment = "Trouble digestif possible"
        recommendations = ["Mangez léger.", "Évitez l'alcool et les graisses.", "Consultez si les symptômes persistent plus de 48h."]
    elif any(w in lower for w in ["tête", "migraine", "céphalée"]):
        assessment = "Céphalée à évaluer"
        recommendations = ["Reposez-vous dans un endroit calme et sombre.", "Hydratez-vous.", "Consultez si la douleur est soudaine et intense."]
    elif any(w in lower for w in ["fatigue", "épuis", "faiblesse"]):
        assessment = "Syndrome asthénique"
        recommendations = ["Dormez suffisamment.", "Adoptez une alimentation équilibrée.", "Consultez si la fatigue persiste plus de 2 semaines."]

    try:
        sev_int = int(severity)
    except (ValueError, TypeError):
        sev_int = 5

    if sev_int >= 8:
        assessment += " — URGENT"

    urgency = "urgent" if sev_int >= 8 else "a_surveiller" if sev_int >= 5 else "normal"
    confidence = min(75, 40 + sev_int * 3)
    warning = "Symptômes potentiellement graves. Consultez un médecin en urgence." if sev_int >= 8 else None

    symptoms = [symptom]
    if extra_symptoms.strip().lower() not in ("", "non", "aucun"):
        for s in extra_symptoms.split(","):
            s = s.strip()
            if s:
                symptoms.append(s)

    return DiagnoseResponse(
        assessment=assessment,
        urgency=urgency,
        confidence=confidence,
        symptoms=symptoms,
        recommendations=recommendations,
        warning=warning,
        powered_by="keyword_matching",
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=DiagnoseResponse)
def diagnose(
    data: DiagnoseRequest,
    _: User = Depends(get_current_user),
):
    """
    Generate a structured AI pre-diagnostic from patient symptoms.
    Uses Gemini when available, falls back to keyword matching otherwise.
    """
    # Try Gemini first
    result = gemini_diagnose(
        symptom=data.symptom,
        duration=data.duration,
        severity=data.severity,
        extra_symptoms=data.extra_symptoms,
    )

    if result:
        return DiagnoseResponse(**result, powered_by="gemini")

    # Keyword fallback
    logger.info("Gemini unavailable — using keyword matching for pre-diagnostic")
    return _keyword_diagnose(data.symptom, data.severity, data.extra_symptoms)

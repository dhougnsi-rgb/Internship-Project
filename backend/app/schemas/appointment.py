import json
from pydantic import BaseModel, field_validator


class AppointmentCreate(BaseModel):
    patient_name: str
    patient_avatar: str | None = None
    patient_category: str | None = None
    requested_date: str
    requested_time: str
    ai_assessment: str | None = None
    ai_symptoms: list[str] = []
    ai_confidence: float = 0.0
    patient_id: int | None = None


class AppointmentUpdate(BaseModel):
    status: str | None = None
    new_date: str | None = None
    new_time: str | None = None
    review_status: str | None = None   # pending | confirmed | rejected
    review_notes: str | None = None


class AppointmentOut(BaseModel):
    id: int
    patient_id: int | None = None
    patient_name: str
    patient_avatar: str | None = None
    patient_category: str | None = None
    requested_date: str
    requested_time: str
    ai_assessment: str | None = None
    ai_symptoms: list[str] = []
    ai_confidence: float
    status: str
    new_date: str | None = None
    new_time: str | None = None
    review_status: str | None = "pending"
    review_notes: str | None = None

    @field_validator("ai_symptoms", mode="before")
    @classmethod
    def parse_symptoms(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []

    class Config:
        from_attributes = True

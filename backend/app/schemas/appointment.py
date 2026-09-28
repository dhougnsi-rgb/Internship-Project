import json
import re
from pydantic import BaseModel, Field, field_validator

# ISO date YYYY-MM-DD
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# HH:MM or HH:MM:SS
_TIME_RE = re.compile(r"^\d{2}:\d{2}(:\d{2})?$")


class AppointmentCreate(BaseModel):
    patient_name: str = Field(min_length=2, max_length=100)
    patient_avatar: str | None = None
    patient_category: str | None = None
    requested_date: str
    requested_time: str
    ai_assessment: str | None = None
    ai_symptoms: list[str] = []
    ai_confidence: float = Field(default=0.0, ge=0.0, le=100.0)
    patient_id: int | None = None

    @field_validator("requested_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not _DATE_RE.match(v):
            raise ValueError("requested_date doit être au format YYYY-MM-DD.")
        return v

    @field_validator("requested_time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        if not _TIME_RE.match(v):
            raise ValueError("requested_time doit être au format HH:MM.")
        return v


class AppointmentUpdate(BaseModel):
    status: str | None = None
    new_date: str | None = None
    new_time: str | None = None
    review_status: str | None = None   # pending | confirmed | rejected
    review_notes: str | None = None
    # Doctor fills these in when confirming — used to build the Consultation record
    doctor_name: str | None = None
    doctor_notes: str | None = None


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

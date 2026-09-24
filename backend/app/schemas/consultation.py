from pydantic import BaseModel


class ConsultationCreate(BaseModel):
    patient_nom: str
    age: int | None = None
    sexe: str | None = None
    service: str | None = None
    medecin: str | None = None
    heure: str | None = None
    motif: str | None = None
    status: str = "En attente"
    urgent: bool = False
    dossier: str | None = None
    patient_id: int | None = None


class ConsultationUpdate(BaseModel):
    patient_nom: str | None = None
    age: int | None = None
    sexe: str | None = None
    service: str | None = None
    medecin: str | None = None
    heure: str | None = None
    motif: str | None = None
    status: str | None = None
    urgent: bool | None = None
    dossier: str | None = None
    notes: str | None = None
    diagnostic: str | None = None


class ConsultationOut(BaseModel):
    id: int
    patient_id: int | None = None
    patient_nom: str
    age: int | None = None
    sexe: str | None = None
    service: str | None = None
    medecin: str | None = None
    heure: str | None = None
    motif: str | None = None
    status: str
    urgent: bool
    dossier: str | None = None
    notes: str | None = None
    diagnostic: str | None = None

    class Config:
        from_attributes = True

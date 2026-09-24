from pydantic import BaseModel


class TranslationCreate(BaseModel):
    langue_source: str
    langue_cible: str
    type_entree: str = "texte"
    message_original: str | None = None
    transcription: str | None = None
    traduction: str
    audio_source: str | None = None
    audio_traduction: str | None = None


class TranslationOut(BaseModel):
    id: int
    user_id: int | None = None
    langue_source: str
    langue_cible: str
    type_entree: str | None = None
    message_original: str | None = None
    transcription: str | None = None
    traduction: str | None = None
    audio_source: str | None = None
    audio_traduction: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class TranslateRequest(BaseModel):
    langue_source: str
    langue_cible: str
    message_original: str | None = None


class TranslateResponse(BaseModel):
    traduction: str
    langue_source: str
    langue_cible: str

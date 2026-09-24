from pydantic import BaseModel, EmailStr


class PatientCreate(BaseModel):
    name: str
    age: int | None = None
    category: str = "Ambulatoire"
    motif: str | None = None
    phone_number: str | None = None
    email: EmailStr | None = None


class PatientUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    category: str | None = None
    motif: str | None = None
    last_visit: str | None = None


class PatientOut(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    age: int | None = None
    category: str
    motif: str | None = None
    phone_number: str | None = None
    email: str | None = None
    last_visit: str | None = None

    class Config:
        from_attributes = True

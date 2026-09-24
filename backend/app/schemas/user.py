from pydantic import BaseModel, EmailStr, Field


STAFF_ROLES = ("staff", "doctor", "administrator")
PATIENT_ROLE = "patient"
ALLOWED_ROLES = (*STAFF_ROLES, PATIENT_ROLE)


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    phone_number: str | None = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    phone_number: str = "non renseigné"
    email: EmailStr
    password: str = Field(min_length=8)
    role: str = "staff"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    user_role: str
    user_id: int
    user: UserPublic

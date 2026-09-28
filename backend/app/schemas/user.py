import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.outils.validators import validate_password_strength


STAFF_ROLES = ("staff", "doctor", "administrator")
PATIENT_ROLE = "patient"
ALLOWED_ROLES = (*STAFF_ROLES, PATIENT_ROLE)

# Matches international phone numbers: optional + then 7-15 digits
_PHONE_RE = re.compile(r"^\+?\d{7,15}$")


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    phone_number: str | None = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone_number: str = Field(default="non renseigné")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="staff")

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide.")
        return v

    @field_validator("phone_number")
    @classmethod
    def phone_format(cls, v: str) -> str:
        stripped = v.strip()
        if stripped and stripped != "non renseigné" and not _PHONE_RE.match(stripped):
            raise ValueError("Numéro de téléphone invalide (7–15 chiffres, optionnellement précédé de +).")
        return stripped

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ALLOWED_ROLES:
            raise ValueError(f"Rôle invalide. Valeurs acceptées: {', '.join(ALLOWED_ROLES)}")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        is_valid, errors = validate_password_strength(v)
        if not is_valid:
            raise ValueError('; '.join(errors))
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    user_role: str
    user_id: int
    user: UserPublic

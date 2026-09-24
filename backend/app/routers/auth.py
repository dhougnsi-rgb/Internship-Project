from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.outils.auth import create_access_token, hash_password, verify_password
from app.outils.deps import get_current_user
from app.schemas.user import (
    ALLOWED_ROLES,
    PATIENT_ROLE,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPublic,
)
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["auth"])


def _ensure_patient_record(db: Session, user: User) -> None:
    existing = db.query(Patient).filter(Patient.user_id == user.id).first()
    if existing:
        return
    db.add(
        Patient(
            user_id=user.id,
            name=user.name,
            email=user.email,
            phone_number=user.phone_number,
            category="Ambulatoire",
        )
    )
    db.commit()


def _token_response(user: User) -> TokenResponse:
    public = UserPublic.model_validate(user)
    token = create_access_token(
        {"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return TokenResponse(
        access_token=token,
        user_name=user.name,
        user_role=user.role,
        user_id=user.id,
        user=public,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    role = (user_data.role or "staff").strip().lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rôle invalide.",
        )

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte avec cet email existe déjà.",
        )

    new_user = User(
        name=user_data.name.strip(),
        phone_number=user_data.phone_number.strip() or "non renseigné",
        email=str(user_data.email).lower(),
        hashed_password=hash_password(user_data.password),
        role=role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if role == PATIENT_ROLE:
        _ensure_patient_record(db, new_user)

    return _token_response(new_user)


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(credentials.email).lower()).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    if user.role == PATIENT_ROLE:
        _ensure_patient_record(db, user)

    return _token_response(user)


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)):
    return UserPublic.model_validate(user)


class ProfileUpdate(BaseModel):
    name: str | None = None
    phone_number: str | None = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


@router.patch("/me/update", response_model=UserPublic)
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.name:
        user.name = data.name.strip()
    if data.phone_number:
        user.phone_number = data.phone_number.strip()
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.patch("/me/password")
def change_password(data: PasswordUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mot de passe actuel incorrect.")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"detail": "Mot de passe mis à jour."}

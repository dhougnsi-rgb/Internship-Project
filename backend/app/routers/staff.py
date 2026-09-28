from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.staff import Staff
from app.models.user import User
from app.outils.deps import require_roles
from app.outils.exceptions import NotFoundError
from app.schemas.staff import StaffCreate, StaffOut, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])

ADMIN_ROLES = ("administrator",)


@router.get("", response_model=list[StaffOut])
def list_staff(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ADMIN_ROLES)),
):
    return db.query(Staff).order_by(Staff.id.desc()).all()


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    data: StaffCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ADMIN_ROLES)),
):
    member = Staff(
        nom=data.nom.strip(),
        category=data.category,
        phone=data.phone,
        email=data.email,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.patch("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: int,
    data: StaffUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ADMIN_ROLES)),
):
    member = db.query(Staff).filter(Staff.id == staff_id).first()
    if not member:
        raise NotFoundError(detail="Membre introuvable.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(member, key, value)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*ADMIN_ROLES)),
):
    member = db.query(Staff).filter(Staff.id == staff_id).first()
    if not member:
        raise NotFoundError(detail="Membre introuvable.")
    db.delete(member)
    db.commit()

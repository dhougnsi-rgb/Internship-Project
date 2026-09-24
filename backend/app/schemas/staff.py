from pydantic import BaseModel


class StaffCreate(BaseModel):
    nom: str
    category: str = "Generaliste"
    phone: str | None = None
    email: str | None = None


class StaffUpdate(BaseModel):
    nom: str | None = None
    category: str | None = None
    phone: str | None = None
    email: str | None = None


class StaffOut(BaseModel):
    id: int
    nom: str
    category: str
    phone: str | None = None
    email: str | None = None

    class Config:
        from_attributes = True

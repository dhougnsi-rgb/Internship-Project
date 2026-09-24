from sqlalchemy import Column, Integer, String
from app.database import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    category = Column(String, nullable=False, default="Generaliste")
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)

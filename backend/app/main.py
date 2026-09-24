from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.appointment import Appointment  # noqa: F401
from app.models.consultation import Consultation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.patient import Patient  # noqa: F401
from app.models.staff import Staff  # noqa: F401
from app.models.translation import Translation  # noqa: F401
from app.models.user import User  # noqa: F401
from app.routers import (
    appointments,
    auth,
    consultations,
    dashboard,
    messages,
    patients,
    staff,
    translations,
)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="DjoHealth API")

# ── CORS ──────────────────────────────────────────────────────────────────────
# allow_origins=["*"] with allow_credentials=True is not allowed by browsers.
# List explicit origins instead. Add your Expo / web dev URLs as needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8081",   # Expo Go
        "http://127.0.0.1:8081",
        "exp://localhost:8081",
        "exp://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(staff.router)
app.include_router(consultations.router)
app.include_router(appointments.router)
app.include_router(messages.router)
app.include_router(translations.router)
app.include_router(dashboard.router)


# ── Utility ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "DjoHealth API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}

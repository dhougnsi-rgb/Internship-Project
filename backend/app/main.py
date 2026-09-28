import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.appointment import Appointment  # noqa: F401
from app.models.consultation import Consultation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.patient import Patient  # noqa: F401
from app.models.push_token import PushToken  # noqa: F401
from app.models.staff import Staff  # noqa: F401
from app.models.translation import Translation  # noqa: F401
from app.models.user import User  # noqa: F401
from app.outils.error_handlers import register_error_handlers
from app.outils.logging import RequestLoggingMiddleware
from app.routers import (
    appointments,
    auth,
    consultations,
    dashboard,
    diagnose,
    messages,
    notifications,
    patients,
    staff,
    transcribe,
    translations,
    websocket,
)

logger = logging.getLogger("djohealth.startup")

# ── Database schema bootstrap ─────────────────────────────────────────────────
# In development (default): create_all ensures tables exist without running
# Alembic migrations. Convenient for local dev — schema always in sync.
#
# In production: set AUTO_CREATE_TABLES=false and run migrations explicitly:
#   alembic upgrade head
#
# This means in production, schema changes must be tracked as Alembic migrations.
_auto_create = os.getenv("AUTO_CREATE_TABLES", "true").lower() == "true"
if _auto_create:
    Base.metadata.create_all(bind=engine)
    logger.info(
        "Tables auto-created via create_all (dev mode). "
        "Set AUTO_CREATE_TABLES=false and run 'alembic upgrade head' in production."
    )
else:
    logger.info(
        "AUTO_CREATE_TABLES=false — assuming 'alembic upgrade head' has been run."
    )

app = FastAPI(title="DjoHealth API")

# Register error handlers
register_error_handlers(app)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(RequestLoggingMiddleware)

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
app.include_router(diagnose.router)
app.include_router(transcribe.router)
app.include_router(notifications.router)
app.include_router(websocket.router)


# ── Utility ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "DjoHealth API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}

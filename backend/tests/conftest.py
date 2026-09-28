"""
conftest.py — Shared pytest fixtures for DjoHealth backend tests.

Uses an in-memory SQLite database so tests run without PostgreSQL.
Each test gets a fresh database — no state leaks between tests.
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Point to SQLite before importing the app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("GEMINI_API_KEY", "")  # disable real AI calls in tests

from app.database import Base, get_db  # noqa: E402
from app.main import app               # noqa: E402

# ── In-memory SQLite engine ───────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """FastAPI test client with DB override."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Auth helpers ──────────────────────────────────────────────────────────────

def register_user(client, name="Test User", email="test@djohealth.cm",
                  password="Password123!", role="staff"):
    resp = client.post("/auth/register", json={
        "name": name, "email": email, "password": password, "role": role,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


def auth_headers(client, email="test@djohealth.cm", password="Password123!"):
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def staff_client(client):
    """Client pre-authenticated as a staff user."""
    register_user(client, role="staff")
    headers = auth_headers(client)
    client.headers.update(headers)
    return client


@pytest.fixture
def doctor_client(client):
    """Client pre-authenticated as a doctor."""
    register_user(client, email="doctor@djohealth.cm", role="doctor")
    headers = auth_headers(client, email="doctor@djohealth.cm")
    client.headers.update(headers)
    return client


@pytest.fixture
def admin_client(client):
    """Client pre-authenticated as an administrator."""
    register_user(client, email="admin@djohealth.cm", role="administrator")
    headers = auth_headers(client, email="admin@djohealth.cm")
    client.headers.update(headers)
    return client

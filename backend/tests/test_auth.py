"""Tests for /auth endpoints."""

import pytest
from tests.conftest import register_user, auth_headers


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/auth/register", json={
            "name": "Alice Talla",
            "email": "alice@djohealth.cm",
            "password": "Secure@pass1",
            "role": "staff",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_role"] == "staff"
        assert data["user"]["email"] == "alice@djohealth.cm"
        assert "access_token" in data

    def test_register_duplicate_email(self, client):
        register_user(client, email="dup@djohealth.cm")
        resp = client.post("/auth/register", json={
            "name": "Another", "email": "dup@djohealth.cm",
            "password": "Password123!", "role": "staff",
        })
        assert resp.status_code == 409

    def test_register_invalid_role(self, client):
        resp = client.post("/auth/register", json={
            "name": "Bad Role", "email": "bad@djohealth.cm",
            "password": "password123", "role": "superadmin",
        })
        assert resp.status_code == 422

    def test_register_short_password(self, client):
        resp = client.post("/auth/register", json={
            "name": "Short", "email": "short@djohealth.cm",
            "password": "abc", "role": "staff",
        })
        assert resp.status_code == 422
    def test_register_invalid_email(self, client):
        resp = client.post("/auth/register", json={
            "name": "Bad Email", "email": "not-an-email",
            "password": "password123", "role": "staff",
        })
        assert resp.status_code == 422

    def test_patient_register_creates_patient_record(self, client):
        resp = client.post("/auth/register", json={
            "name": "Patient Paul", "email": "paul@djohealth.cm",
            "password": "Password123!", "role": "patient",
        })
        assert resp.status_code == 201


class TestLogin:
    def test_login_success(self, client):
        register_user(client)
        resp = client.post("/auth/login", json={
            "email": "test@djohealth.cm", "password": "Password123!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        register_user(client)
        resp = client.post("/auth/login", json={
            "email": "test@djohealth.cm", "password": "wrongpass",
        })
        assert resp.status_code == 401

    def test_login_unknown_email(self, client):
        resp = client.post("/auth/login", json={
            "email": "nobody@djohealth.cm", "password": "Password123!",
        })
        assert resp.status_code == 401

    def test_login_case_insensitive_email(self, client):
        register_user(client, email="Case@DjoHealth.cm")
        resp = client.post("/auth/login", json={
            "email": "case@djohealth.cm", "password": "Password123!",
        })
        assert resp.status_code == 200


class TestMe:
    def test_me_authenticated(self, client):
        register_user(client)
        headers = auth_headers(client)
        resp = client.get("/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@djohealth.cm"

    def test_me_unauthenticated(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401


class TestProfileUpdate:
    def test_update_name(self, client):
        register_user(client)
        headers = auth_headers(client)
        resp = client.patch("/auth/me/update", json={"name": "Updated Name"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_change_password(self, client):
        register_user(client)
        headers = auth_headers(client)
        resp = client.patch("/auth/me/password", json={
            "current_password": "Password123!",
            "new_password": "NewPass@456",
        }, headers=headers)
        assert resp.status_code == 200
        # Can login with new password
        login_resp = client.post("/auth/login", json={
            "email": "test@djohealth.cm", "password": "NewPass@456",
        })
        assert login_resp.status_code == 200

    def test_change_password_wrong_current(self, client):
        register_user(client)
        headers = auth_headers(client)
        resp = client.patch("/auth/me/password", json={
            "current_password": "WrongPass!1",
            "new_password": "NewPass@456",
        }, headers=headers)
        assert resp.status_code == 401

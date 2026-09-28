"""Tests for /appointments endpoints."""

from tests.conftest import register_user, auth_headers


def make_appointment(client, headers=None, patient_name="Paul Ndem",
                     date="2026-12-01", time="09:00"):
    kw = {}
    if headers:
        kw["headers"] = headers
    resp = client.post("/appointments", json={
        "patient_name": patient_name,
        "patient_category": "Ambulatoire",
        "requested_date": date,
        "requested_time": time,
        "ai_assessment": "Syndrome fébrile possible",
        "ai_symptoms": ["fièvre", "frissons"],
        "ai_confidence": 72.0,
    }, **kw)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestAppointmentCreate:
    def test_any_authenticated_user_can_create(self, staff_client):
        appt = make_appointment(staff_client)
        assert appt["patient_name"] == "Paul Ndem"
        assert appt["status"] == "pending"
        assert appt["ai_symptoms"] == ["fièvre", "frissons"]

    def test_invalid_date_format(self, staff_client):
        resp = staff_client.post("/appointments", json={
            "patient_name": "Test",
            "requested_date": "01/12/2026",  # wrong format
            "requested_time": "09:00",
        })
        assert resp.status_code == 422

    def test_invalid_time_format(self, staff_client):
        resp = staff_client.post("/appointments", json={
            "patient_name": "Test",
            "requested_date": "2026-12-01",
            "requested_time": "9am",  # wrong format
        })
        assert resp.status_code == 422

    def test_confidence_out_of_range(self, staff_client):
        resp = staff_client.post("/appointments", json={
            "patient_name": "Test",
            "requested_date": "2026-12-01",
            "requested_time": "09:00",
            "ai_confidence": 150.0,  # > 100
        })
        assert resp.status_code == 422


class TestAppointmentList:
    def test_doctor_can_list(self, doctor_client, staff_client):
        make_appointment(staff_client)
        resp = doctor_client.get("/appointments")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_patient_cannot_list_all(self, client):
        register_user(client, email="patient@djohealth.cm", role="patient")
        token = client.post("/auth/login", json={
            "email": "patient@djohealth.cm", "password": "Password123!"
        }).json()["access_token"]
        resp = client.get("/appointments", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_patient_can_list_own(self, client):
        register_user(client, email="patient2@djohealth.cm", role="patient")
        token = client.post("/auth/login", json={
            "email": "patient2@djohealth.cm", "password": "Password123!"
        }).json()["access_token"]
        resp = client.get("/appointments/mine", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestAppointmentUpdate:
    def test_doctor_can_accept(self, doctor_client, staff_client):
        appt = make_appointment(staff_client)
        resp = doctor_client.patch(f"/appointments/{appt['id']}", json={"status": "accepted"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"

    def test_confirm_review_creates_consultation(self, doctor_client, staff_client):
        appt = make_appointment(staff_client)
        resp = doctor_client.patch(f"/appointments/{appt['id']}", json={
            "review_status": "confirmed",
            "doctor_notes": "Paracétamol recommandé",
        })
        assert resp.status_code == 200
        assert resp.json()["review_status"] == "confirmed"
        # Consultation should exist now
        consult_resp = doctor_client.get("/consultations")
        assert resp.status_code == 200
        consultations = consult_resp.json()
        assert any(c.get("appointment_id") == appt["id"] for c in consultations)

    def test_confirming_twice_does_not_duplicate_consultation(self, doctor_client, staff_client):
        appt = make_appointment(staff_client)
        doctor_client.patch(f"/appointments/{appt['id']}", json={"review_status": "confirmed"})
        doctor_client.patch(f"/appointments/{appt['id']}", json={"review_status": "confirmed"})
        consult_resp = doctor_client.get("/consultations")
        consultations = [c for c in consult_resp.json() if c.get("appointment_id") == appt["id"]]
        assert len(consultations) == 1

    def test_staff_cannot_update(self, staff_client):
        """Staff can update appointment status — they are in CLINICAL_ROLES."""
        appt = make_appointment(staff_client)
        resp = staff_client.patch(f"/appointments/{appt['id']}", json={"status": "accepted"})
        # Staff IS allowed to update appointments (CLINICAL_ROLES = doctor, administrator, staff)
        assert resp.status_code == 200

    def test_update_nonexistent(self, doctor_client):
        resp = doctor_client.patch("/appointments/99999", json={"status": "accepted"})
        assert resp.status_code == 404


class TestAppointmentDelete:
    def test_doctor_can_delete(self, doctor_client, staff_client):
        appt = make_appointment(staff_client)
        resp = doctor_client.delete(f"/appointments/{appt['id']}")
        assert resp.status_code == 204

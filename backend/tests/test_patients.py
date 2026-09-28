"""Tests for /patients endpoints."""

from tests.conftest import register_user, auth_headers


def make_patient(client, headers, name="Jean Kamto", age=30, category="Ambulatoire"):
    resp = client.post("/patients", json={
        "name": name, "age": age, "category": category,
        "motif": "Fièvre", "email": f"{name.lower().replace(' ', '.')}@test.cm",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestPatientCRUD:
    def test_create_patient(self, doctor_client):
        p = make_patient(doctor_client, {})
        assert p["name"] == "Jean Kamto"
        assert p["category"] == "Ambulatoire"

    def test_list_patients(self, doctor_client):
        make_patient(doctor_client, {})
        make_patient(doctor_client, {}, name="Marie Ngono")
        resp = doctor_client.get("/patients")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_staff_cannot_access_patients(self, staff_client):
        resp = staff_client.get("/patients")
        assert resp.status_code == 403

    def test_update_patient(self, doctor_client):
        p = make_patient(doctor_client, {})
        resp = doctor_client.patch(f"/patients/{p['id']}", json={"age": 35, "category": "Hospitalise"})
        assert resp.status_code == 200
        assert resp.json()["age"] == 35
        assert resp.json()["category"] == "Hospitalise"

    def test_update_invalid_category(self, doctor_client):
        p = make_patient(doctor_client, {})
        resp = doctor_client.patch(f"/patients/{p['id']}", json={"category": "InvalidCategory"})
        assert resp.status_code == 422

    def test_delete_patient(self, doctor_client):
        p = make_patient(doctor_client, {})
        resp = doctor_client.delete(f"/patients/{p['id']}")
        assert resp.status_code == 204
        # Confirm gone
        resp2 = doctor_client.get("/patients")
        assert all(x["id"] != p["id"] for x in resp2.json())

    def test_update_nonexistent_patient(self, doctor_client):
        resp = doctor_client.patch("/patients/99999", json={"age": 40})
        assert resp.status_code == 404

    def test_unauthenticated_cannot_list(self, client):
        resp = client.get("/patients")
        assert resp.status_code == 401

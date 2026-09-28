"""Tests for /diagnose endpoint (keyword fallback — Gemini key is blank in tests)."""


class TestDiagnose:
    def test_diagnose_basic(self, staff_client):
        resp = staff_client.post("/diagnose", json={
            "symptom": "fièvre",
            "duration": "2 jours",
            "severity": "6",
            "extra_symptoms": "maux de tête",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "assessment" in data
        assert data["urgency"] in ("normal", "a_surveiller", "urgent")
        assert 0 <= data["confidence"] <= 100
        assert isinstance(data["symptoms"], list)
        assert isinstance(data["recommendations"], list)
        assert data["powered_by"] in ("gemini", "keyword_matching")

    def test_diagnose_urgent_severity(self, staff_client):
        resp = staff_client.post("/diagnose", json={
            "symptom": "douleur thoracique intense",
            "duration": "1 heure",
            "severity": "9",
            "extra_symptoms": "difficultés à respirer",
        })
        assert resp.status_code == 200
        data = resp.json()
        # Severity 9 should trigger urgent or a_surveiller
        assert data["urgency"] in ("urgent", "a_surveiller")

    def test_diagnose_low_severity(self, staff_client):
        resp = staff_client.post("/diagnose", json={
            "symptom": "légère fatigue",
            "duration": "1 jour",
            "severity": "2",
            "extra_symptoms": "",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency"] in ("normal", "a_surveiller")

    def test_diagnose_symptoms_list_includes_extra(self, staff_client):
        resp = staff_client.post("/diagnose", json={
            "symptom": "toux",
            "duration": "3 jours",
            "severity": "4",
            "extra_symptoms": "nausées, frissons",
        })
        assert resp.status_code == 200
        symptoms = resp.json()["symptoms"]
        assert len(symptoms) >= 1

    def test_diagnose_too_short_symptom(self, staff_client):
        resp = staff_client.post("/diagnose", json={
            "symptom": "x",  # min_length=2
            "duration": "1 jour",
            "severity": "5",
            "extra_symptoms": "",
        })
        assert resp.status_code == 422

    def test_diagnose_unauthenticated(self, client):
        resp = client.post("/diagnose", json={
            "symptom": "fièvre",
            "duration": "2 jours",
            "severity": "5",
            "extra_symptoms": "",
        })
        assert resp.status_code == 401

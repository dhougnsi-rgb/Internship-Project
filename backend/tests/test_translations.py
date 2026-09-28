"""Tests for /translations and /translate endpoints."""


def save_translation(client, langue_source="ghomala", langue_cible="francais",
                     message="Mba ko", traduction="Bonjour"):
    resp = client.post("/translations", json={
        "langue_source": langue_source,
        "langue_cible": langue_cible,
        "type_entree": "texte",
        "message_original": message,
        "traduction": traduction,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


class TestTranslationHistory:
    def test_save_and_retrieve(self, staff_client):
        save_translation(staff_client)
        resp = staff_client.get("/translations")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["langue_source"] == "ghomala"
        assert data[0]["traduction"] == "Bonjour"

    def test_user_only_sees_own_translations(self, client):
        from tests.conftest import register_user, auth_headers
        register_user(client, email="usera@djohealth.cm", role="staff")
        headers_a = auth_headers(client, email="usera@djohealth.cm")
        client.post("/translations", json={
            "langue_source": "ghomala", "langue_cible": "francais",
            "type_entree": "texte", "message_original": "Test A", "traduction": "Test A FR",
        }, headers=headers_a)
        register_user(client, email="userb@djohealth.cm", role="staff")
        headers_b = auth_headers(client, email="userb@djohealth.cm")
        resp = client.get("/translations", headers=headers_b)
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_delete_translation(self, staff_client):
        t = save_translation(staff_client)
        resp = staff_client.delete(f"/translations/{t['id']}")
        assert resp.status_code == 204
        resp2 = staff_client.get("/translations")
        assert len(resp2.json()) == 0

    def test_all_translations_for_doctor(self, client):
        from tests.conftest import register_user, auth_headers
        register_user(client, email="pat@djohealth.cm", role="patient")
        pat_headers = auth_headers(client, email="pat@djohealth.cm")
        client.post("/translations", json={
            "langue_source": "ghomala", "langue_cible": "francais",
            "type_entree": "texte", "message_original": "Ko ya", "traduction": "Je suis malade",
        }, headers=pat_headers)
        register_user(client, email="doc@djohealth.cm", role="doctor")
        doc_headers = auth_headers(client, email="doc@djohealth.cm")
        resp = client.get("/translations/all", headers=doc_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_staff_cannot_see_all_translations(self, staff_client):
        """Staff role is not in the allowed roles for /translations/all."""
        resp = staff_client.get("/translations/all")
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access(self, client):
        resp = client.get("/translations")
        assert resp.status_code == 401


class TestTranslateEndpoint:
    def test_translate_placeholder_when_no_gemini(self, staff_client):
        """Without GEMINI_API_KEY, returns a placeholder string."""
        resp = staff_client.post("/translate", json={
            "langue_source": "francais",
            "langue_cible": "ghomala",
            "message_original": "Bonjour",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "traduction" in data
        # Either real translation or placeholder — both are strings
        assert isinstance(data["traduction"], str)
        assert len(data["traduction"]) > 0

    def test_translate_empty_text(self, staff_client):
        """Empty message_original fails validation — 422 from Pydantic or 400 from endpoint."""
        resp = staff_client.post("/translate", json={
            "langue_source": "francais",
            "langue_cible": "ghomala",
            "message_original": "",
        })
        assert resp.status_code in (400, 422)

    def test_translate_unauthenticated(self, client):
        resp = client.post("/translate", json={
            "langue_source": "francais",
            "langue_cible": "ghomala",
            "message_original": "Test",
        })
        assert resp.status_code == 401

"""
gemini.py — Google Gemini AI client using the REST API directly via httpx.

No google-generativeai SDK needed — uses httpx which is already installed.

Provides:
  - gemini_translate(text, source, target)  → French ↔ Ghomala translation
  - gemini_diagnose(symptom, duration, severity, extra_symptoms) → structured pre-diagnostic

Both return None when GEMINI_API_KEY is not set; callers fall back gracefully.
"""

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("djohealth.gemini")

_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
_TIMEOUT = 30.0

if _API_KEY:
    logger.info("Gemini AI configured (REST/httpx, model: gemini-3.6-flash)")
else:
    logger.warning(
        "GEMINI_API_KEY not set — AI features will use placeholders. "
        "Get a free key at https://aistudio.google.com"
    )


def _is_available() -> bool:
    return bool(_API_KEY)


def _call(prompt: str) -> str:
    """Send a prompt to Gemini REST API and return the text response."""
    if not _API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
            {"category": "HARM_CATEGORY_HARASSMENT",         "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH",        "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",  "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    url = f"{_BASE_URL}?key={_API_KEY}"

    # verify=False handles corporate proxies / self-signed cert environments.
    # In production with a proper CA chain, set GEMINI_SSL_VERIFY=true in .env.
    _ssl_verify = os.getenv("GEMINI_SSL_VERIFY", "false").lower() == "true"

    def _do_request() -> str:
        with httpx.Client(timeout=_TIMEOUT, verify=_ssl_verify) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    try:
        return _do_request()
    except Exception as exc:
        logger.warning("Gemini first attempt failed (%s), retrying…", exc)
        return _do_request()


# ── Translation ───────────────────────────────────────────────────────────────

def gemini_translate(
    text: str,
    source_language: str,
    target_language: str,
) -> Optional[str]:
    """
    Translate between French and Ghomala using Gemini.
    Returns None if the API key is not set.
    """
    if not _is_available():
        return None

    src_label = "français" if "franc" in source_language.lower() else "Ghomala'"
    tgt_label = "Ghomala'" if "franc" in source_language.lower() else "français"

    prompt = (
        f"Tu es un traducteur expert en langue Ghomala' (Bamileke, Cameroun) et en français.\n"
        f"Traduis le texte suivant du {src_label} vers le {tgt_label}.\n"
        f"Réponds UNIQUEMENT avec la traduction, sans explication ni ponctuation supplémentaire.\n\n"
        f"Texte à traduire : {text}"
    )

    try:
        return _call(prompt)
    except Exception as exc:
        logger.error("Gemini translation failed: %s", exc)
        return None


# ── Pre-diagnostic ────────────────────────────────────────────────────────────

def gemini_diagnose(
    symptom: str,
    duration: str,
    severity: str,
    extra_symptoms: str,
) -> Optional[dict]:
    """
    Generate a structured medical pre-diagnostic from patient-reported symptoms.
    Returns None if the API key is not set or if Gemini fails.
    """
    if not _is_available():
        return None

    prompt = (
        "Tu es un assistant médical francophone. Un patient décrit ses symptômes.\n"
        "Génère un pré-diagnostic structuré en JSON valide UNIQUEMENT (pas de markdown, pas de texte autour).\n\n"
        f"Symptôme principal : {symptom}\n"
        f"Durée : {duration}\n"
        f"Intensité (1-10) : {severity}\n"
        f"Autres symptômes : {extra_symptoms if extra_symptoms.strip() else 'aucun'}\n\n"
        "Format JSON attendu :\n"
        "{\n"
        '  "assessment": "Hypothèse médicale principale en une phrase",\n'
        '  "urgency": "normal",\n'
        '  "confidence": 70,\n'
        '  "symptoms": ["symptôme 1", "symptôme 2"],\n'
        '  "recommendations": ["conseil 1", "conseil 2", "conseil 3"],\n'
        '  "warning": null\n'
        "}\n\n"
        "Règles strictes :\n"
        "- urgency : 'urgent' si intensité >= 8 ou symptômes graves, 'a_surveiller' si 5-7, sinon 'normal'\n"
        "- confidence : entier entre 50 et 90\n"
        "- warning : chaîne de texte si urgent, sinon null\n"
        "- Réponds UNIQUEMENT en JSON valide, rien d'autre."
    )

    try:
        raw = _call(prompt).strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())

        # Build clean symptom list
        symptoms = list(result.get("symptoms", [symptom]))
        if extra_symptoms.strip().lower() not in ("", "non", "aucun"):
            for s in extra_symptoms.split(","):
                s = s.strip()
                if s and s not in symptoms:
                    symptoms.append(s)

        return {
            "assessment": str(result.get("assessment", "Consultation médicale recommandée")),
            "urgency":    result.get("urgency", "normal"),
            "confidence": min(90, max(50, int(result.get("confidence", 65)))),
            "symptoms":   [str(s) for s in symptoms if s],
            "recommendations": [str(r) for r in result.get("recommendations", [])],
            "warning":    result.get("warning") or None,
        }
    except Exception as exc:
        logger.error("Gemini diagnose failed: %s", exc)
        return None

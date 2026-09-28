# DjoHealth — Healthcare Platform

A full-stack healthcare platform bridging the language gap between French-speaking medical staff and Ghomala-speaking patients in Cameroon.

**Three components in one monorepo:**

| Component | Tech | Who uses it |
|-----------|------|-------------|
| `backend/` | FastAPI + PostgreSQL | Serves all API calls |
| `myapp/` | React + Vite | Doctors, staff, administrators (web dashboard) |
| `mobile/` | Expo React Native | Patients (iOS + Android) |

---

## Features

### Mobile (patients)
- **Translation** — type or speak in Ghomala', get the French translation instantly (powered by Gemini AI)
- **Voice-to-text** — record audio, Gemini transcribes it to text before translation
- **AI pre-diagnostic** — 6-step guided symptom chat; Gemini analyses symptoms and returns a hypothesis, urgency level, and recommendations
- **Appointment request** — submit a direct appointment or one pre-filled with AI diagnostic data
- **My appointments** — track submitted appointments and see doctor decisions in real time
- **Messaging** — two-way chat with medical staff (WebSocket live + REST fallback)
- **Push notifications** — notified when appointment is accepted, rescheduled, or rejected

### Web dashboard (staff / doctors / administrators)
- **Dashboard** — live stats (patients, consultations, translations, pending appointments) + charts
- **Patients** — full CRUD with edit modal and delete confirmation
- **Consultations** — auto-created from confirmed AI pre-diagnostics; doctors can add notes
- **Rendez-vous** — accept or reschedule patient appointment requests
- **Prediagnostics IA** — review AI-generated hypotheses, confirm or reject, write clinical notes
- **Translations** — read all patient Ghomala↔French translations submitted via mobile
- **Messages** — real-time staff↔patient chat with WebSocket
- **Personnel médical** — add/remove staff members (administrator only)
- **Paramètres** — profile and password management

### Backend
- JWT authentication with role-based access (patient / staff / doctor / administrator)
- Gemini AI integration for translation and medical pre-diagnostics
- WebSocket server for real-time messaging
- Expo push notifications on appointment status changes
- Structured request logging middleware
- Consistent error handling with typed exceptions
- Alembic database migrations

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.11 |
| Node.js | 18 |
| PostgreSQL | 14 |
| Expo CLI | latest (`npx expo`) |

---

## Setup

### 1 — Clone and enter the repo

```bash
git clone <your-repo-url>
cd Defence
```

### 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in your values
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost/hospital_db
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(48))">
GEMINI_API_KEY=<get free at https://aistudio.google.com>
GEMINI_SSL_VERIFY=false          # set true on Linux/Mac production servers
TRANSLATION_API_URL=             # optional NLLB proxy, leave empty to use Gemini
AUTO_CREATE_TABLES=true          # false in production — use alembic upgrade head
```

```bash
# Create the database
createdb hospital_db

# Option A — auto-create tables (dev default, AUTO_CREATE_TABLES=true)
uvicorn app.main:app --reload

# Option B — use Alembic migrations (production)
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API runs at **http://127.0.0.1:8000**  
Interactive docs at **http://127.0.0.1:8000/docs**

### 3 — Web dashboard (myapp)

```bash
cd myapp
npm install
cp .env.example .env   # VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

Dashboard runs at **http://localhost:5173**

### 4 — Mobile app

```bash
cd mobile
npm install
cp .env.example .env
```

Edit `mobile/.env`:

```env
# Simulator/emulator:
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000

# Physical device — use your computer's LAN IP:
# Windows: run `ipconfig`, look for IPv4 Address
# macOS:   run `ipconfig getifaddr en0`
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

```bash
npx expo start
# Press 'a' for Android, 'i' for iOS, scan QR with Expo Go
```

---

## Docker (backend + database)

```bash
# Copy and configure env
cp backend/.env.example backend/.env
# Edit backend/.env with your GEMINI_API_KEY and a strong SECRET_KEY

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f api

# Stop
docker-compose down
```

The API will be available at **http://localhost:8000**.  
The web dashboard and mobile app still run locally — point them at `http://localhost:8000`.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing secret — must be long and random |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (free at aistudio.google.com) |
| `GEMINI_SSL_VERIFY` | | `false` on Windows dev, `true` in Linux production (default: `false`) |
| `TRANSLATION_API_URL` | | Optional NLLB proxy URL — leave empty to use Gemini |
| `AUTO_CREATE_TABLES` | | `true` = create_all on startup (dev), `false` = use Alembic (prod) |

### Web dashboard (`myapp/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (default: `http://127.0.0.1:8000`) |

### Mobile (`mobile/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend base URL — use LAN IP for physical devices |

---

## Roles & Permissions

| Role | Created by | Access |
|------|-----------|--------|
| `patient` | Self-registration on mobile | Mobile app only — translation, diagnostics, appointments, messages |
| `staff` | Administrator via Staff page | Dashboard — messages, consultations, dashboard |
| `doctor` | Administrator via Staff page | Dashboard — all clinical pages except staff management |
| `administrator` | Registration page (`/signin`) | Full dashboard access including staff management |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile (Expo)              Web Dashboard (React/Vite)       │
│  - Patients                 - Doctors / Staff / Admin        │
│  - Ghomala↔French chat      - Consultations, Diagnostics     │
│  - AI pre-diagnostic        - Patients, Staff, Messages      │
└──────────────┬──────────────────────────┬───────────────────┘
               │ REST + WebSocket         │ REST + WebSocket
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Backend (Python)                                    │
│                                                              │
│  /auth          JWT login, register, profile                 │
│  /patients      Patient CRUD                                 │
│  /consultations Auto-created from confirmed diagnostics      │
│  /appointments  Patient requests + doctor accept/reschedule  │
│  /translate     Gemini Ghomala↔French translation            │
│  /transcribe    Gemini voice-to-text                         │
│  /diagnose      Gemini medical pre-diagnostic                │
│  /messages      Staff↔patient messaging (REST)               │
│  /ws            WebSocket real-time chat                     │
│  /notifications Push token register + Expo push send         │
│  /dashboard     Aggregated stats + chart data                │
│  /staff         Staff directory CRUD                         │
│  /translations  Patient translation history                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
        PostgreSQL DB                    Gemini AI
        (all persistent data)            (translation,
                                          transcription,
                                          diagnostics)
```

---

## Running Tests

```bash
cd backend
# Install test dependencies (requires internet)
pip install pytest httpx pytest-asyncio

# Run all tests
pytest tests/ -v

# Run a specific file
pytest tests/test_auth.py -v
```

Tests use an in-memory SQLite database — no PostgreSQL needed to run them.

---

## Project Structure

```
Defence/
├── backend/
│   ├── app/
│   │   ├── main.py              Entry point, routers, middleware
│   │   ├── database.py          SQLAlchemy engine + session
│   │   ├── models/              SQLAlchemy ORM models
│   │   ├── schemas/             Pydantic request/response schemas
│   │   ├── routers/             One file per feature area
│   │   └── outils/              Auth, JWT, Gemini client, logging, exceptions
│   ├── alembic/                 Database migration scripts
│   ├── tests/                   pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── myapp/                       Web dashboard (React + Vite)
│   └── src/
│       ├── pages/               One file per page
│       ├── components/          Sidebar, layout, error boundary
│       ├── context/             Auth + Appointment React contexts
│       ├── style/               Per-page CSS files
│       ├── api.ts               Fetch-based API client
│       └── permissions.ts       Role-based nav filtering
│
├── mobile/                      Patient mobile app (Expo)
│   ├── app/AllPages/            All screens (Stack navigator)
│   ├── api/api.ts               Axios-based API client
│   └── utils/pushNotifications.ts  Expo push token helper
│
├── shared/
│   └── types/index.ts           Shared TypeScript interfaces
│
├── docker-compose.yml
└── README.md
```

---

## Common Issues

**Backend won't start — `could not connect to server`**  
Make sure PostgreSQL is running and `DATABASE_URL` matches your local credentials.

**Mobile can't reach backend on physical device**  
Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP (e.g. `http://192.168.1.42:8000`), not `127.0.0.1`. Both devices must be on the same Wi-Fi.

**Gemini returns SSL error**  
Set `GEMINI_SSL_VERIFY=false` in `backend/.env`. This is normal on Windows with corporate certificates.

**Translation returns placeholder text**  
`GEMINI_API_KEY` is missing or empty in `backend/.env`. Get a free key at https://aistudio.google.com.

**Push notifications not working**  
Push notifications require a development build — they don't work in Expo Go on Android from SDK 53+. Run `npx expo run:android` or use EAS Build.

**`alembic upgrade head` fails on first run**  
If you used `AUTO_CREATE_TABLES=true` previously, the tables already exist. Either drop and recreate the DB, or stamp the current state: `alembic stamp head`.

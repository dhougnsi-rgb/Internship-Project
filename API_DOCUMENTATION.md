# DjoHealth API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## User Roles
- `patient`: Regular patients using the mobile app
- `staff`: Medical staff members
- `doctor`: Doctors with clinical access
- `administrator`: Full system access

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "phone_number": "+237123456789",
  "role": "patient"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_name": "John Doe",
  "user_role": "patient",
  "user_id": 1,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "phone_number": "+237123456789"
  }
}
```

### Login
**POST** `/auth/login`

Authenticate and receive access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_name": "John Doe",
  "user_role": "patient",
  "user_id": 1,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "patient",
    "phone_number": "+237123456789"
  }
}
```

### Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "patient",
  "phone_number": "+237123456789"
}
```

### Update Profile
**PATCH** `/auth/me/update`

Update current user's profile information.

**Request Body:**
```json
{
  "name": "John Updated",
  "phone_number": "+237987654321"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Updated",
  "email": "john@example.com",
  "role": "patient",
  "phone_number": "+237987654321"
}
```

### Change Password
**PATCH** `/auth/me/password`

Change current user's password.

**Request Body:**
```json
{
  "current_password": "securepassword123",
  "new_password": "newsecurepassword456"
}
```

**Response (200):**
```json
{
  "detail": "Mot de passe mis à jour."
}
```

---

## Patient Endpoints

### List Patients
**GET** `/patients`

Get all patients (requires `doctor` or `administrator` role).

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Jane Doe",
    "age": 35,
    "category": "Ambulatoire",
    "motif": "Regular checkup",
    "phone_number": "+237123456789",
    "email": "jane@example.com",
    "last_visit": "2024-01-15",
    "user_id": 2
  }
]
```

### Create Patient
**POST** `/patients`

Create a new patient record (requires `doctor` or `administrator` role).

**Request Body:**
```json
{
  "name": "Jane Doe",
  "age": 35,
  "category": "Ambulatoire",
  "motif": "Regular checkup",
  "phone_number": "+237123456789",
  "email": "jane@example.com"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "Jane Doe",
  "age": 35,
  "category": "Ambulatoire",
  "motif": "Regular checkup",
  "phone_number": "+237123456789",
  "email": "jane@example.com",
  "last_visit": null,
  "user_id": null
}
```

### Update Patient
**PATCH** `/patients/{patient_id}`

Update patient information (requires `doctor` or `administrator` role).

**Request Body:**
```json
{
  "name": "Jane Updated",
  "category": "Hospitalise"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Jane Updated",
  "age": 35,
  "category": "Hospitalise",
  "motif": "Regular checkup",
  "phone_number": "+237123456789",
  "email": "jane@example.com",
  "last_visit": null,
  "user_id": null
}
```

### Delete Patient
**DELETE** `/patients/{patient_id}`

Delete a patient record (requires `doctor` or `administrator` role).

**Response (204):** No content

---

## Appointment Endpoints

### List Appointments
**GET** `/appointments`

Get all appointments (requires `doctor`, `administrator`, or `staff` role).

**Response (200):**
```json
[
  {
    "id": 1,
    "patient_name": "Jane Doe",
    "patient_avatar": "avatar_url",
    "patient_category": "Ambulatoire",
    "requested_date": "2024-01-20",
    "requested_time": "10:00",
    "ai_assessment": "Mild symptoms detected",
    "ai_symptoms": ["headache", "fatigue"],
    "ai_confidence": 0.85,
    "status": "pending",
    "new_date": null,
    "new_time": null,
    "patient_id": 1
  }
]
```

### Create Appointment
**POST** `/appointments`

Create a new appointment request (any authenticated user).

**Request Body:**
```json
{
  "patient_name": "Jane Doe",
  "patient_avatar": "avatar_url",
  "patient_category": "Ambulatoire",
  "requested_date": "2024-01-20",
  "requested_time": "10:00",
  "ai_assessment": "Mild symptoms detected",
  "ai_symptoms": ["headache", "fatigue"],
  "ai_confidence": 0.85,
  "patient_id": 1
}
```

**Response (201):**
```json
{
  "id": 1,
  "patient_name": "Jane Doe",
  "patient_avatar": "avatar_url",
  "patient_category": "Ambulatoire",
  "requested_date": "2024-01-20",
  "requested_time": "10:00",
  "ai_assessment": "Mild symptoms detected",
  "ai_symptoms": ["headache", "fatigue"],
  "ai_confidence": 0.85,
  "status": "pending",
  "new_date": null,
  "new_time": null,
  "patient_id": 1
}
```

### Update Appointment
**PATCH** `/appointments/{appointment_id}`

Update appointment status or details (requires `doctor`, `administrator`, or `staff` role).

**Request Body:**
```json
{
  "status": "accepted",
  "new_date": "2024-01-21",
  "new_time": "14:00"
}
```

**Response (200):**
```json
{
  "id": 1,
  "patient_name": "Jane Doe",
  "patient_avatar": "avatar_url",
  "patient_category": "Ambulatoire",
  "requested_date": "2024-01-20",
  "requested_time": "10:00",
  "ai_assessment": "Mild symptoms detected",
  "ai_symptoms": ["headache", "fatigue"],
  "ai_confidence": 0.85,
  "status": "accepted",
  "new_date": "2024-01-21",
  "new_time": "14:00",
  "patient_id": 1
}
```

### Delete Appointment
**DELETE** `/appointments/{appointment_id}`

Delete an appointment (requires `doctor`, `administrator`, or `staff` role).

**Response (204):** No content

---

## Consultation Endpoints

### List Consultations
**GET** `/consultations`

Get all consultations (requires `doctor`, `administrator`, or `staff` role).

**Response (200):**
```json
[
  {
    "id": 1,
    "patient_nom": "Jane Doe",
    "age": 35,
    "sexe": "F",
    "service": "General Medicine",
    "medecin": "Dr. Smith",
    "heure": "10:30",
    "motif": "Headache and fatigue",
    "status": "En cours",
    "urgent": false,
    "dossier": "Medical notes here",
    "notes": null,
    "diagnostic": null,
    "patient_id": 1
  }
]
```

### Create Consultation
**POST** `/consultations`

Create a new consultation record (requires `doctor`, `administrator`, or `staff` role).

**Request Body:**
```json
{
  "patient_nom": "Jane Doe",
  "age": 35,
  "sexe": "F",
  "service": "General Medicine",
  "medecin": "Dr. Smith",
  "heure": "10:30",
  "motif": "Headache and fatigue",
  "status": "En attente",
  "urgent": false,
  "dossier": "Initial consultation",
  "patient_id": 1
}
```

**Response (201):**
```json
{
  "id": 1,
  "patient_nom": "Jane Doe",
  "age": 35,
  "sexe": "F",
  "service": "General Medicine",
  "medecin": "Dr. Smith",
  "heure": "10:30",
  "motif": "Headache and fatigue",
  "status": "En attente",
  "urgent": false,
  "dossier": "Initial consultation",
  "notes": null,
  "diagnostic": null,
  "patient_id": 1
}
```

### Update Consultation
**PATCH** `/consultations/{consultation_id}`

Update consultation details (requires `doctor`, `administrator`, or `staff` role).

**Request Body:**
```json
{
  "status": "Terminé",
  "notes": "Patient responded well to treatment",
  "diagnostic": "Migraine"
}
```

**Response (200):**
```json
{
  "id": 1,
  "patient_nom": "Jane Doe",
  "age": 35,
  "sexe": "F",
  "service": "General Medicine",
  "medecin": "Dr. Smith",
  "heure": "10:30",
  "motif": "Headache and fatigue",
  "status": "Terminé",
  "urgent": false,
  "dossier": "Initial consultation",
  "notes": "Patient responded well to treatment",
  "diagnostic": "Migraine",
  "patient_id": 1
}
```

### Delete Consultation
**DELETE** `/consultations/{consultation_id}`

Delete a consultation record (requires `doctor`, `administrator`, or `staff` role).

**Response (204):** No content

---

## Staff Endpoints

### List Staff
**GET** `/staff`

Get all staff members (requires `administrator` role).

**Response (200):**
```json
[
  {
    "id": 1,
    "nom": "Dr. Smith",
    "category": "Generaliste",
    "phone": "+237123456789",
    "email": "smith@example.com"
  }
]
```

### Create Staff
**POST** `/staff`

Create a new staff member (requires `administrator` role).

**Request Body:**
```json
{
  "nom": "Dr. Johnson",
  "category": "Chirugien",
  "phone": "+237987654321",
  "email": "johnson@example.com"
}
```

**Response (201):**
```json
{
  "id": 2,
  "nom": "Dr. Johnson",
  "category": "Chirugien",
  "phone": "+237987654321",
  "email": "johnson@example.com"
}
```

### Update Staff
**PATCH** `/staff/{staff_id}`

Update staff member information (requires `administrator` role).

**Request Body:**
```json
{
  "nom": "Dr. Johnson Updated",
  "phone": "+237555555555"
}
```

**Response (200):**
```json
{
  "id": 2,
  "nom": "Dr. Johnson Updated",
  "category": "Chirugien",
  "phone": "+237555555555",
  "email": "johnson@example.com"
}
```

### Delete Staff
**DELETE** `/staff/{staff_id}`

Delete a staff member (requires `administrator` role).

**Response (204):** No content

---

## Translation Endpoints

### Get Translation History
**GET** `/translations`

Get translation history for current user.

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "langue_source": "francais",
    "langue_cible": "ghomala",
    "type_entree": "texte",
    "message_original": "Bonjour, comment allez-vous?",
    "transcription": null,
    "traduction": "Mbɔ́, ɓɛ n-tɔ́ nʉ́?",
    "audio_source": null,
    "audio_traduction": null,
    "created_at": "2024-01-15T10:30:00"
  }
]
```

### Save Translation
**POST** `/translations`

Save a translation to history.

**Request Body:**
```json
{
  "langue_source": "francais",
  "langue_cible": "ghomala",
  "type_entree": "texte",
  "message_original": "Bonjour, comment allez-vous?",
  "transcription": null,
  "traduction": "Mbɔ́, ɓɛ n-tɔ́ nʉ́?",
  "audio_source": null,
  "audio_traduction": null
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "langue_source": "francais",
  "langue_cible": "ghomala",
  "type_entree": "texte",
  "message_original": "Bonjour, comment allez-vous?",
  "transcription": null,
  "traduction": "Mbɔ́, ɓɛ n-tɔ́ nʉ́?",
  "audio_source": null,
  "audio_traduction": null,
  "created_at": "2024-01-15T10:30:00"
}
```

### Delete Translation
**DELETE** `/translations/{translation_id}`

Delete a translation from history.

**Response (204):** No content

### Translate Text
**POST** `/translate`

Translate text between French and Ghomala.

**Request Body:**
```json
{
  "langue_source": "francais",
  "langue_cible": "ghomala",
  "message_original": "Bonjour, comment allez-vous?"
}
```

**Response (200):**
```json
{
  "traduction": "Mbɔ́, ɓɛ n-tɔ́ nʉ́?",
  "langue_source": "francais",
  "langue_cible": "ghomala"
}
```

**Note:** If `TRANSLATION_API_URL` is not configured, this returns a placeholder response.

---

## Message Endpoints

### List Messages
**GET** `/messages`

Get all messages (requires appropriate role).

**Response (200):**
```json
[
  {
    "id": 1,
    "sender_id": 1,
    "recipient_id": 2,
    "text": "Hello, how are you?",
    "timestamp": "2024-01-15T10:30:00",
    "read": false
  }
]
```

### Send Message
**POST** `/messages`

Send a message to a user.

**Request Body:**
```json
{
  "recipient_id": 2,
  "text": "Hello, how are you?"
}
```

**Response (201):**
```json
{
  "id": 1,
  "sender_id": 1,
  "recipient_id": 2,
  "text": "Hello, how are you?",
  "timestamp": "2024-01-15T10:30:00",
  "read": false
}
```

---

## Dashboard Endpoints

### Get Dashboard Statistics
**GET** `/dashboard/stats`

Get system statistics (requires appropriate role).

**Response (200):**
```json
{
  "total_patients": 150,
  "total_consultations": 75,
  "pending_appointments": 12
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

---

## Interactive Documentation

When the backend is running, you can access interactive API documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These provide a web interface to test all API endpoints.

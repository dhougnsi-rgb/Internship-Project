import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';

// Set EXPO_PUBLIC_API_URL in frontend/.env to override (e.g. when your backend IP changes)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const AUTH_TIMEOUT_MS = 20_000;

async function withAuthTimeout<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Impossible de joindre le serveur (${API_URL}).`)),
      AUTH_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  user_name?: string;
  user_role?: string;
  user_id?: number;
  user?: User;
}

// Backend returns { id, name, email, role, phone_number }
export interface User {
  id?: number | string;
  name?: string;
  email: string;
  role?: string;
  phone_number?: string | null;
}

export interface TranslationData {
  langue_source: string;
  langue_cible: string;
  message_original?: string;
  audio_source?: {
    uri: string;
    name?: string;
    type?: string;
  };
}

export interface TranslationResponse {
  text?: string;
  translation?: string;
  traduction?: string | null;
  transcription?: string | null;
  id?: number | string;
  langue_source?: string;
  langue_cible?: string;
  message_original?: string | null;
  audio_traduction?: string | null;
}

export interface Message extends TranslationResponse {
  created_at?: string;
  type_entree?: 'texte' | 'vocal';
}

export interface HistoryMessageData {
  langue_source: string;
  langue_cible: string;
  type_entree: 'texte' | 'vocal';
  message_original?: string;
  transcription?: string;
  traduction: string;
  audio_source?: string;
  audio_traduction?: string;
}

// ── Appointment interfaces ────────────────────────────────────────────────────

export interface AppointmentCreateData {
  patient_name: string;
  patient_category?: string;
  requested_date: string;   // ISO date string e.g. "2026-10-15"
  requested_time: string;   // e.g. "09:30"
  ai_assessment?: string;
  ai_symptoms?: string[];
  ai_confidence?: number;
  patient_id?: number;
}

export interface AppointmentOut {
  id: number;
  patient_id?: number | null;
  patient_name: string;
  patient_category?: string | null;
  requested_date: string;
  requested_time: string;
  ai_assessment?: string | null;
  ai_symptoms: string[];
  ai_confidence: number;
  status: string;
  new_date?: string | null;
  new_time?: string | null;
  review_status?: string | null;
  review_notes?: string | null;
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// ── Error helper ──────────────────────────────────────────────────────────────

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((e) => (typeof e?.msg === 'string' ? e.msg : String(e))).join(', ');
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')
      return `Impossible de joindre le serveur (${API_URL}). Vérifiez votre connexion.`;
    if (!error.response) return `Serveur inaccessible (${API_URL}).`;
    return `La requête a échoué (${error.response.status}).`;
  }
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await withAuthTimeout(
    apiClient.post<AuthResponse>('/auth/login', {
      email: data.email.trim(),
      password: data.password,
    })
  );
  await AsyncStorage.setItem('access_token', response.data.access_token);
  // Store the full user object from the response
  const user: User = response.data.user ?? {
    name: response.data.user_name,
    email: data.email.trim(),
    role: response.data.user_role,
    id: response.data.user_id,
  };
  await AsyncStorage.setItem('current_user', JSON.stringify(user));
  return response.data;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await withAuthTimeout(
    apiClient.post<AuthResponse>('/auth/register', {
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      role: data.role || 'patient',
    })
  );
  await AsyncStorage.setItem('access_token', response.data.access_token);
  const user: User = response.data.user ?? {
    name: response.data.user_name,
    email: data.email.trim(),
    role: response.data.user_role,
    id: response.data.user_id,
  };
  await AsyncStorage.setItem('current_user', JSON.stringify(user));
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  // Try from AsyncStorage first (fast)
  const cached = await AsyncStorage.getItem('current_user');
  if (cached) {
    try { return JSON.parse(cached) as User; } catch { /* fall through */ }
  }
  // Fetch from backend
  const response = await apiClient.get<User>('/auth/me');
  await AsyncStorage.setItem('current_user', JSON.stringify(response.data));
  return response.data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['access_token', 'current_user']);
}

// ── Translation history (stored per-user on the backend) ─────────────────────

export async function getMessages(): Promise<Message[]> {
  const response = await apiClient.get<Message[]>('/translations');
  return response.data;
}

export async function saveMessage(data: HistoryMessageData): Promise<Message> {
  const response = await apiClient.post<Message>('/translations', data);
  return response.data;
}

export async function deleteMessage(id: number | string): Promise<void> {
  await apiClient.delete(`/translations/${encodeURIComponent(String(id))}`);
}

// ── Translation ───────────────────────────────────────────────────────────────

export async function translate(data: TranslationData): Promise<TranslationResponse> {
  const response = await apiClient.post<TranslationResponse>('/translate', {
    langue_source: data.langue_source,
    langue_cible: data.langue_cible,
    message_original: data.message_original ?? '',
  });
  return {
    ...response.data,
    traduction: response.data.traduction ?? response.data.translation,
  };
}

// ── Appointments ──────────────────────────────────────────────────────────────

/**
 * Submit a new appointment request from a patient.
 * ai_assessment, ai_symptoms and ai_confidence are optional — they can be
 * filled in by the patient describing their symptoms, and the staff reviews
 * them later in the AI Diagnostics dashboard.
 */
export async function createAppointment(data: AppointmentCreateData): Promise<AppointmentOut> {
  const response = await apiClient.post<AppointmentOut>('/appointments', {
    patient_name: data.patient_name,
    patient_category: data.patient_category ?? null,
    requested_date: data.requested_date,
    requested_time: data.requested_time,
    ai_assessment: data.ai_assessment ?? null,
    ai_symptoms: data.ai_symptoms ?? [],
    ai_confidence: data.ai_confidence ?? 0,
    patient_id: data.patient_id ?? null,
  });
  return response.data;
}

/**
 * Fetch all appointments visible to the current user.
 * Staff/doctors see all appointments; patients see only their own.
 */
export async function getAppointments(): Promise<AppointmentOut[]> {
  const response = await apiClient.get<AppointmentOut[]>('/appointments');
  return response.data;
}

/**
 * Fetch only the appointments belonging to the current patient.
 * Works for any authenticated user — returns [] if no patient record exists.
 */
export async function getMyAppointments(): Promise<AppointmentOut[]> {
  const response = await apiClient.get<AppointmentOut[]>('/appointments/mine');
  return response.data;
}

// ── Chat messages (staff ↔ patient) ──────────────────────────────────────────

export interface ChatMessageData {
  id: number;
  sender_id: number | null;
  recipient_id: number | null;
  sender_name: string | null;
  recipient_name: string | null;
  text: string;
  created_at: string | null;
}

export interface SendMessageData {
  recipient_id?: number | null;
  recipient_name?: string | null;
  text: string;
}

/** Fetch all messages for the current user (sent + received). */
export async function getChatMessages(): Promise<ChatMessageData[]> {
  const response = await apiClient.get<ChatMessageData[]>('/messages');
  return response.data;
}

/** Send a message via REST (used when WebSocket is unavailable). */
export async function sendChatMessage(data: SendMessageData): Promise<ChatMessageData> {
  const response = await apiClient.post<ChatMessageData>('/messages', data);
  return response.data;
}

// ── Voice transcription ───────────────────────────────────────────────────────

export interface TranscribeResponse {
  transcription: string;
  language: string;
}

/**
 * Upload a recorded audio file to the backend for speech-to-text transcription.
 * Uses Gemini's audio understanding — returns the transcribed French text.
 *
 * @param uri     - Local file URI from expo-audio (e.g. file:///tmp/recording.m4a)
 * @param mimeType - MIME type of the recording (default: audio/m4a)
 */
export async function transcribeAudio(
  uri: string,
  mimeType: string = 'audio/m4a',
): Promise<TranscribeResponse> {
  const filename = uri.split('/').pop() ?? 'recording.m4a';

  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const response = await apiClient.post<TranscribeResponse>('/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // transcription can take a few seconds
  });
  return response.data;
}

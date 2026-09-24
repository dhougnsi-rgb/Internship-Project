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

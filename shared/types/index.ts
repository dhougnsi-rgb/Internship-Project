// Shared type definitions for DjoHealth platform
// These types match the backend schemas and can be used across frontend projects

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'staff' | 'doctor' | 'administrator';
  phone_number?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  user_name?: string;
  user_role?: string;
  user_id?: number;
  user?: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  role?: 'patient' | 'staff' | 'doctor' | 'administrator';
}

export interface ProfileUpdate {
  name?: string;
  phone_number?: string;
}

export interface PasswordUpdate {
  current_password: string;
  new_password: string;
}

// ============================================================================
// Patient Types
// ============================================================================

export type PatientCategory = 'Hospitalise' | 'En Observation' | 'Ambulatoire' | 'Urgences' | 'Sortant';

export interface Patient {
  id: number;
  name: string;
  age: number | null;
  category: PatientCategory;
  motif?: string | null;
  phone_number?: string | null;
  email?: string | null;
  last_visit?: string | null;
  user_id?: number | null;
}

export interface PatientCreate {
  name: string;
  age?: number | null;
  category?: PatientCategory;
  motif?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

export interface PatientUpdate {
  name?: string;
  age?: number | null;
  category?: PatientCategory;
  motif?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

// ============================================================================
// Appointment Types
// ============================================================================

export type AppointmentStatus = 'pending' | 'accepted' | 'rescheduled';
export type ReviewStatus = 'pending' | 'confirmed' | 'rejected';

export interface Appointment {
  id: number;
  patient_name: string;
  patient_avatar?: string;
  patient_category: string;
  requested_date: string;
  requested_time: string;
  ai_assessment: string;
  ai_symptoms: string[];
  ai_confidence: number;
  status: AppointmentStatus;
  new_date?: string | null;
  new_time?: string | null;
  patient_id?: number | null;
  review_status?: ReviewStatus;
  review_notes?: string;
}

export interface AppointmentCreate {
  patient_name: string;
  patient_avatar?: string;
  patient_category: string;
  requested_date: string;
  requested_time: string;
  ai_assessment: string;
  ai_symptoms: string[];
  ai_confidence: number;
  patient_id?: number | null;
}

export interface AppointmentUpdate {
  status?: AppointmentStatus;
  new_date?: string | null;
  new_time?: string | null;
  review_status?: ReviewStatus;
  review_notes?: string;
}

// ============================================================================
// Consultation Types
// ============================================================================

export type ConsultationStatus = 'En attente' | 'En cours' | 'Terminé';

export interface Consultation {
  id: number;
  patient_nom: string;
  age: number | null;
  sexe: 'M' | 'F' | null;
  service?: string | null;
  medecin?: string | null;
  heure?: string | null;
  motif?: string | null;
  status: ConsultationStatus;
  urgent: boolean;
  dossier?: string | null;
  notes?: string | null;
  diagnostic?: string | null;
  patient_id?: number | null;
}

export interface ConsultationCreate {
  patient_nom: string;
  age?: number | null;
  sexe?: 'M' | 'F' | null;
  service?: string | null;
  medecin?: string | null;
  heure?: string | null;
  motif?: string | null;
  status?: ConsultationStatus;
  urgent?: boolean;
  dossier?: string | null;
  patient_id?: number | null;
}

export interface ConsultationUpdate {
  patient_nom?: string;
  age?: number | null;
  sexe?: 'M' | 'F' | null;
  service?: string | null;
  medecin?: string | null;
  heure?: string | null;
  motif?: string | null;
  status?: ConsultationStatus;
  urgent?: boolean;
  dossier?: string | null;
  notes?: string | null;
  diagnostic?: string | null;
}

// ============================================================================
// Staff Types
// ============================================================================

export type StaffCategory = 'Generaliste' | 'Chirugien' | 'Pediatre' | 'Infirmier' | 'Ophtamologue' | 'Autre';

export interface Staff {
  id: number;
  nom: string;
  category: StaffCategory;
  phone: string;
  email: string;
}

export interface StaffCreate {
  nom: string;
  category: StaffCategory;
  phone: string;
  email: string;
}

export interface StaffUpdate {
  nom?: string;
  category?: StaffCategory;
  phone?: string;
  email?: string;
}

// ============================================================================
// Translation Types
// ============================================================================

export type Language = 'francais' | 'ghomala' | 'français';
export type InputType = 'texte' | 'vocal';

export interface Translation {
  id: number;
  user_id: number;
  langue_source: Language;
  langue_cible: Language;
  type_entree: InputType;
  message_original?: string | null;
  transcription?: string | null;
  traduction?: string | null;
  audio_source?: string | null;
  audio_traduction?: string | null;
  created_at: string;
}

export interface TranslationCreate {
  langue_source: Language;
  langue_cible: Language;
  type_entree: InputType;
  message_original?: string | null;
  transcription?: string | null;
  traduction?: string | null;
  audio_source?: string | null;
  audio_traduction?: string | null;
}

export interface TranslateRequest {
  langue_source: Language;
  langue_cible: Language;
  message_original?: string;
}

export interface TranslateResponse {
  traduction?: string;
  translation?: string;
  langue_source?: Language;
  langue_cible?: Language;
  message_original?: string | null;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: number;
  sender_id: number | null;
  recipient_id: number | null;
  sender_name: string | null;
  recipient_name: string | null;
  text: string;
  created_at: string | null;
}

export interface MessageCreate {
  recipient_id?: number | null;
  recipient_name?: string | null;
  text: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface ChartEntry {
  name: string;
  value: number;
}

export interface DashboardStats {
  total_patients: number;
  total_consultations: number;
  total_translations: number;
  pending_appointments: number;
  diagnosis_data: ChartEntry[];
  language_data: ChartEntry[];
}

// ============================================================================
// Push Notification Types
// ============================================================================

export interface PushTokenRegister {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  detail: string | string[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

/**
 * AppointmentContext.tsx
 *
 * Fetches appointments from the backend and provides accept/reschedule actions.
 * When a doctor reschedules, a notification is pushed into Messages via pendingNotification.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { API_URL, apiCall, getApiErrorMessage } from '../api'

export type AppointmentStatus = 'pending' | 'accepted' | 'rescheduled'

export type Appointment = {
  id: number
  patientName: string
  patientAvatar: string
  patientCategory: string
  requestedDate: string
  requestedTime: string
  aiAssessment: string
  aiSymptoms: string[]
  aiConfidence: number
  status: AppointmentStatus
  newDate?: string
  newTime?: string
}

type RescheduleNotification = {
  patientName: string
  patientAvatar: string
  patientCategory: string
  newDate: string
  newTime: string
}

type AppointmentContextValue = {
  appointments: Appointment[]
  acceptAppointment: (id: number) => void
  rescheduleAppointment: (id: number, newDate: string, newTime: string) => void
  pendingNotification: RescheduleNotification | null
  clearNotification: () => void
}

const AppointmentContext = createContext<AppointmentContextValue | null>(null)

// Map backend snake_case to frontend camelCase
function mapAppointment(raw: Record<string, unknown>): Appointment {
  return {
    id: raw.id as number,
    patientName: (raw.patient_name as string) ?? '',
    patientAvatar: (raw.patient_avatar as string) ?? '',
    patientCategory: (raw.patient_category as string) ?? '',
    requestedDate: (raw.requested_date as string) ?? '',
    requestedTime: (raw.requested_time as string) ?? '',
    aiAssessment: (raw.ai_assessment as string) ?? '',
    aiSymptoms: Array.isArray(raw.ai_symptoms) ? (raw.ai_symptoms as string[]) : [],
    aiConfidence: (raw.ai_confidence as number) ?? 0,
    status: (raw.status as AppointmentStatus) ?? 'pending',
    newDate: raw.new_date as string | undefined,
    newTime: raw.new_time as string | undefined,
  }
}

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pendingNotification, setPendingNotification] = useState<RescheduleNotification | null>(null)

  useEffect(() => {
    apiCall('/appointments')
      .then((data: Record<string, unknown>[]) => setAppointments(data.map(mapAppointment)))
      .catch(() => {/* silently keep empty if not authorized or server down */})
  }, [])

  const patchAppointment = async (id: number, body: object) => {
    try {
      const updated = mapAppointment(await apiCall(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }))
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (error) {
      console.error('Failed to update appointment:', getApiErrorMessage(error))
    }
  }

  const acceptAppointment = (id: number) => {
    patchAppointment(id, { status: 'accepted' })
  }

  const rescheduleAppointment = (id: number, newDate: string, newTime: string) => {
    const appt = appointments.find((a) => a.id === id)
    patchAppointment(id, { status: 'rescheduled', new_date: newDate, new_time: newTime })
    if (appt) {
      setPendingNotification({
        patientName: appt.patientName,
        patientAvatar: appt.patientAvatar,
        patientCategory: appt.patientCategory,
        newDate,
        newTime,
      })
    }
  }

  const clearNotification = () => setPendingNotification(null)

  return (
    <AppointmentContext.Provider value={{ appointments, acceptAppointment, rescheduleAppointment, pendingNotification, clearNotification }}>
      {children}
    </AppointmentContext.Provider>
  )
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext)
  if (!ctx) throw new Error('useAppointments must be used inside AppointmentProvider')
  return ctx
}

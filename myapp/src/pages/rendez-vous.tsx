import { useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, RefreshCw, Brain, X, UserRound } from 'lucide-react'
import { useAppointments, type Appointment } from '../context/AppointmentContext'
import '../style/rendez-vous.css'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const map = {
    pending:     { label: 'En attente',   cls: 'badge-pending' },
    accepted:    { label: 'Accepté',      cls: 'badge-accepted' },
    rescheduled: { label: 'Reprogrammé',  cls: 'badge-rescheduled' },
  }
  const { label, cls } = map[status]
  return <span className={`rdv-badge ${cls}`}>{label}</span>
}

// ── Reschedule modal ──────────────────────────────────────────────────────────

function RescheduleModal({
  appointment,
  onConfirm,
  onClose,
}: {
  appointment: Appointment
  onConfirm: (date: string, time: string) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(appointment.requestedDate)
  const [time, setTime] = useState(appointment.requestedTime)

  return (
    <div className="rdv-modal-backdrop" onClick={onClose}>
      <div className="rdv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rdv-modal-header">
          <h3>Reprogrammer le rendez-vous</h3>
          <button type="button" className="rdv-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="rdv-modal-patient">
          Patient : <strong>{appointment.patientName}</strong>
        </p>
        <p className="rdv-modal-sub">
          Demande initiale : {appointment.requestedDate} à {appointment.requestedTime}
        </p>

        <div className="rdv-modal-fields">
          <label>
            Nouvelle date
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Nouvelle heure
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>

        <div className="rdv-modal-actions">
          <button type="button" className="rdv-btn rdv-btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="rdv-btn rdv-btn-primary"
            disabled={!date || !time}
            onClick={() => onConfirm(date, time)}
          >
            Confirmer la reprogrammation
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RendezVous() {
  const { appointments, acceptAppointment, rescheduleAppointment } = useAppointments()
  const [reschedulingId, setReschedulingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rescheduled'>('all')

  const reschedulingAppt = appointments.find((a) => a.id === reschedulingId) ?? null

  const visible = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)

  const counts = {
    pending:     appointments.filter((a) => a.status === 'pending').length,
    accepted:    appointments.filter((a) => a.status === 'accepted').length,
    rescheduled: appointments.filter((a) => a.status === 'rescheduled').length,
  }

  const handleRescheduleConfirm = (date: string, time: string) => {
    if (reschedulingId !== null) {
      rescheduleAppointment(reschedulingId, date, time)
      setReschedulingId(null)
    }
  }

  return (
    <div className="rdv-page">
      {/* Header */}
      <div className="rdv-header">
        <div>
          <p className="rdv-eyebrow">Gestion des demandes patients</p>
          <h1>Rendez-vous</h1>
          <p className="rdv-intro">
            Demandes générées depuis les consultations IA des patients. Acceptez ou
            reprogrammez chaque rendez-vous.
          </p>
        </div>

        <div className="rdv-summary-chips">
          <div className="rdv-chip chip-pending">
            <strong>{counts.pending}</strong>
            <span>En attente</span>
          </div>
          <div className="rdv-chip chip-accepted">
            <strong>{counts.accepted}</strong>
            <span>Acceptés</span>
          </div>
          <div className="rdv-chip chip-rescheduled">
            <strong>{counts.rescheduled}</strong>
            <span>Reprogrammés</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="rdv-tabs">
        {(['all', 'pending', 'accepted', 'rescheduled'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rdv-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab === 'all' && 'Tous'}
            {tab === 'pending' && 'En attente'}
            {tab === 'accepted' && 'Acceptés'}
            {tab === 'rescheduled' && 'Reprogrammés'}
          </button>
        ))}
      </div>

      {/* Appointment cards */}
      <div className="rdv-list">
        {visible.length === 0 && (
          <div className="rdv-empty">Aucun rendez-vous dans cette catégorie.</div>
        )}

        {visible.map((appt) => (
          <div key={appt.id} className={`rdv-card ${appt.status}`}>
            {/* Patient info */}
            <div className="rdv-card-left">
              <div className="rdv-avatar"><UserRound size={24} /></div>
              <div className="rdv-patient-info">
                <h2>{appt.patientName}</h2>
                <span className="rdv-category">{appt.patientCategory}</span>
              </div>
            </div>

            {/* AI diagnosis summary */}
            <div className="rdv-ai-summary">
              <div className="rdv-ai-label">
              Prediagnostic IA
              </div>
              <p className="rdv-assessment">{appt.aiAssessment}</p>
              <p className="rdv-symptoms">{appt.aiSymptoms.join(' · ')}</p>
              <div className="rdv-confidence-bar">
                <span style={{ width: `${appt.aiConfidence}%` }} />
              </div>
              <p className="rdv-confidence-label">{appt.aiConfidence}% confiance</p>
            </div>

            {/* Date / time */}
            <div className="rdv-datetime">
              <div className="rdv-dt-row">
                <CalendarDays size={15} />
                <span>
                  {appt.status === 'rescheduled' && appt.newDate
                    ? <><s className="rdv-old">{appt.requestedDate}</s> → {appt.newDate}</>
                    : appt.requestedDate}
                </span>
              </div>
              <div className="rdv-dt-row">
                <Clock3 size={15} />
                <span>
                  {appt.status === 'rescheduled' && appt.newTime
                    ? <><s className="rdv-old">{appt.requestedTime}</s> → {appt.newTime}</>
                    : appt.requestedTime}
                </span>
              </div>
              <StatusBadge status={appt.status} />
            </div>

            {/* Actions */}
            <div className="rdv-actions">
              {appt.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="rdv-btn rdv-btn-accept"
                    onClick={() => acceptAppointment(appt.id)}
                  >
                    <CheckCircle2 size={16} /> Accepter
                  </button>
                  <button
                    type="button"
                    className="rdv-btn rdv-btn-reschedule"
                    onClick={() => setReschedulingId(appt.id)}
                  >
                    <RefreshCw size={16} /> Reprogrammer
                  </button>
                </>
              )}
              {appt.status === 'accepted' && (
                <button
                  type="button"
                  className="rdv-btn rdv-btn-reschedule"
                  onClick={() => setReschedulingId(appt.id)}
                >
                  <RefreshCw size={16} /> Modifier
                </button>
              )}
              {appt.status === 'rescheduled' && (
                <span className="rdv-notified">✓ Patient notifié</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reschedule modal */}
      {reschedulingAppt && (
        <RescheduleModal
          appointment={reschedulingAppt}
          onConfirm={handleRescheduleConfirm}
          onClose={() => setReschedulingId(null)}
        />
      )}
    </div>
  )
}

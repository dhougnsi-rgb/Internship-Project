import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Brain, CheckCircle2, ChevronRight, Clock3, Loader2, PenBox, Search, ShieldAlert, UserRound } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/AI_diagnostics.css'

type ReviewStatus = 'pending' | 'confirmed' | 'rejected'

type Appointment = {
  id: number
  patientName: string
  patientAvatar: string
  patientCategory: string
  requestedDate: string
  requestedTime: string
  aiAssessment: string
  aiSymptoms: string[]
  aiConfidence: number
  status: string
  newDate?: string
  newTime?: string
  reviewStatus: ReviewStatus
  reviewNotes: string
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { label: string; cls: string }> = {
    pending:   { label: 'À valider', cls: 'pending' },
    confirmed: { label: 'Confirmé',  cls: 'confirmed' },
    rejected:  { label: 'À revoir',  cls: 'rejected' },
  }
  const { label, cls } = map[status]
  return <span className={`diagnostic-status ${cls}`}>{label}</span>
}

function mapRaw(raw: Record<string, unknown>): Appointment {
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
    status: (raw.status as string) ?? 'pending',
    newDate: raw.new_date as string | undefined,
    newTime: raw.new_time as string | undefined,
    reviewStatus: ((raw.review_status as string) ?? 'pending') as ReviewStatus,
    reviewNotes: (raw.review_notes as string) ?? '',
  }
}

export default function AI_Diagnostics() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fetchAppointments = () => {
    setLoading(true)
    apiCall('/appointments')
      .then((data: Record<string, unknown>[]) => setAppointments(data.map(mapRaw)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAppointments() }, [])

  const filtered = useMemo(() =>
    appointments.filter((a) => a.patientName.toLowerCase().includes(search.toLowerCase())),
    [search, appointments]
  )

  const selected = appointments.find((a) => a.id === Number(patientId))

  // Patch review_status and optional notes to the backend
  const submitReview = async (id: number, reviewStatus: ReviewStatus, reviewNotes: string) => {
    setSaving(true)
    setSaveError('')
    try {
      const updated = mapRaw(await apiCall(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          review_status: reviewStatus,
          review_notes: reviewNotes,
          // Pass doctor notes so the auto-created consultation record gets them
          doctor_notes: reviewNotes || undefined,
        }),
      }))
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
      navigate('/ai-diagnostics')
    } catch {
      setSaveError('Erreur lors de l\'enregistrement. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="diagnostics-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    )
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <DetailView
        appointment={selected}
        saving={saving}
        saveError={saveError}
        onSubmitReview={submitReview}
        onBack={() => navigate('/ai-diagnostics')}
      />
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="diagnostics-page">
      <div className="diagnostics-header">
        <div>
          <p className="eyebrow">Centre d'analyse clinique</p>
          <h1>Prediagnostics IA</h1>
          <p className="page-intro">
            Examinez les demandes de rendez-vous générées depuis les consultations IA des patients.
          </p>
        </div>
        <div className="ai-summary">
          <Brain size={20} />
          <div>
            <strong>{appointments.filter((a) => a.reviewStatus === 'pending').length} dossiers</strong>
            <span>en attente de revue</span>
          </div>
        </div>
      </div>

      <div className="diagnostics-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un patient..." />
        </div>
        <span className="result-count">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="diagnostic-list">
        {filtered.length === 0 ? (
          <div className="diagnostics-empty">Aucun prediagnostic reçu pour le moment.</div>
        ) : (
          filtered.map((appt) => (
            <button
              type="button"
              className="diagnostic-row"
              key={appt.id}
              onClick={() => navigate(`/ai-diagnostics/${appt.id}`)}
            >
              <span className="diagnostic-avatar"><UserRound size={20} /></span>
              <span className="diagnostic-patient">
                <strong>{appt.patientName}</strong>
                <small>{appt.patientCategory}</small>
              </span>
              <span className="diagnostic-summary">
                <strong>{appt.aiAssessment || 'Hypothèse non disponible'}</strong>
                <small>{appt.aiSymptoms.slice(0, 2).join(' · ')}</small>
              </span>
              <span className="diagnostic-confidence">
                <strong>{appt.aiConfidence}%</strong>
                <small>Confiance IA</small>
              </span>
              <StatusBadge status={appt.reviewStatus} />
              <ChevronRight size={19} className="row-chevron" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ── Detail sub-component ───────────────────────────────────────────────────────

function DetailView({
  appointment,
  saving,
  saveError,
  onSubmitReview,
  onBack,
}: {
  appointment: Appointment
  saving: boolean
  saveError: string
  onSubmitReview: (id: number, status: ReviewStatus, notes: string) => void
  onBack: () => void
}) {
  const [reviewNotes, setReviewNotes] = useState(appointment.reviewNotes)
  const [localStatus, setLocalStatus] = useState<ReviewStatus>(appointment.reviewStatus)

  const handleConfirm = () => {
    setLocalStatus('confirmed')
    onSubmitReview(appointment.id, 'confirmed', reviewNotes)
  }

  const handleReject = () => {
    setLocalStatus('rejected')
    onSubmitReview(appointment.id, 'rejected', reviewNotes)
  }

  return (
    <div className="diagnostics-page">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={17} /> Retour aux patients
      </button>

      <div className="diagnostic-detail-header">
        <div>
          <p className="eyebrow">Revue du prediagnostic IA</p>
          <h1>{appointment.patientName}</h1>
          <p className="patient-subtitle">
            <UserRound size={16} /> {appointment.patientCategory}
            <span> • </span>
            Demande du {appointment.requestedDate} à {appointment.requestedTime}
          </p>
        </div>
        <StatusBadge status={localStatus} />
      </div>

      <div className="diagnostic-detail-grid">
        {/* Symptoms */}
        <section className="diagnostic-card symptom-card">
          <div className="card-heading">
            <div><p className="eyebrow">Déclaration patient</p><h2>Symptômes rapportés</h2></div>
          </div>
          {appointment.aiSymptoms.length > 0 ? (
            <div className="symptom-list">
              {appointment.aiSymptoms.map((s) => <span key={s}>{s}</span>)}
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>Aucun symptôme déclaré.</p>
          )}
          <div className="duration">
            <Clock3 size={16} /> Rendez-vous demandé : <strong>{appointment.requestedDate} à {appointment.requestedTime}</strong>
          </div>
        </section>

        {/* AI assessment */}
        <section className="diagnostic-card assessment-card">
          <div className="card-heading">
            <div><p className="eyebrow">Analyse assistée</p><h2>Hypothèse principale</h2></div>
          </div>
          {appointment.aiAssessment ? (
            <>
              <div className="assessment-title">
                <h3>{appointment.aiAssessment}</h3>
                <strong>{appointment.aiConfidence}%</strong>
              </div>
              <div className="confidence-track">
                <span style={{ width: `${appointment.aiConfidence}%` }} />
              </div>
              <p className="confidence-label">Niveau de confiance de l'IA</p>
            </>
          ) : (
            <p style={{ color: '#94a3b8' }}>Aucune hypothèse IA disponible.</p>
          )}
        </section>

        {/* Appointment status + warning */}
        <section className="diagnostic-card prescription-card">
          <div className="card-heading">
            <div><p className="eyebrow">Statut du rendez-vous</p><h2>Informations</h2></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Statut RDV</span><strong>{appointment.status}</strong>
            </div>
            {appointment.newDate && (
              <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Nouveau RDV</span><strong>{appointment.newDate} à {appointment.newTime}</strong>
              </div>
            )}
          </div>
          {appointment.aiConfidence > 0 && (
            <div className="warning-box" style={{ marginTop: 16 }}>
              <ShieldAlert size={18} />
              <div>
                <strong>Validation médicale requise</strong>
                <p>Ce prediagnostic a été généré automatiquement. Un médecin doit le valider.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Notes + review actions */}
      <section className="review-bar" style={{ flexDirection: 'column', gap: 12 }}>
        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
            Notes médicales (optionnel)
          </label>
          <textarea
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, resize: 'vertical' }}
            placeholder="Ajoutez vos observations ou corrections..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
        </div>

        {saveError && <p style={{ color: '#dc2626', fontSize: 13 }}>{saveError}</p>}

        <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-end' }}>
          <div>
            <strong>Validation médicale requise</strong>
            <p style={{ fontSize: 13, color: '#64748b' }}>Votre décision sera enregistrée dans le dossier du patient.</p>
          </div>
          <div className="review-actions">
            <button
              type="button"
              className="reject-button"
              onClick={handleReject}
              disabled={saving}
            >
              <PenBox size={17} /> À revoir
            </button>
            <button
              type="button"
              className="confirm-button"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
              Confirmer le diagnostic
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

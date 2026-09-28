/**
 * Consultations.tsx
 *
 * Consultations are created automatically when a doctor confirms an AI
 * pre-diagnostic on the "Prediagnostics IA" page. This page is read-only
 * and shows the resulting consultation records.
 *
 * Doctors can still add clinical notes / update the diagnostic on a record
 * by clicking into the detail view.
 */
import { useEffect, useState } from 'react'
import { UserRound, Loader2, Brain } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/consultation.css'

type ConsultationStatus = 'En attente' | 'En cours' | 'Terminé'
type FilterType = 'Tous' | ConsultationStatus | 'Urgences'

type Consultation = {
  id: number
  appointment_id: number | null
  patient_nom: string
  age: number | null
  sexe: 'M' | 'F' | null
  service: string | null
  medecin: string | null
  heure: string | null
  motif: string | null
  status: ConsultationStatus
  urgent: boolean
  dossier: string | null
  notes: string | null
  diagnostic: string | null
  patient_id: number | null
}

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('Tous')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [notes, setNotes] = useState('')
  const [diagnostic, setDiagnostic] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchConsultations = async () => {
    try {
      setLoading(true)
      setConsultations(await apiCall('/consultations'))
      setError('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConsultations() }, [])

  const filtered = consultations.filter((c) => {
    const matchSearch =
      c.patient_nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.service ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.medecin ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'Tous' ? true :
      filter === 'Urgences' ? c.urgent :
      c.status === filter
    return matchSearch && matchFilter
  })

  const handleSaveNotes = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await apiCall(`/consultations/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes, diagnostic }),
      })
      await fetchConsultations()
      setSelected(null)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="consultation-page">
        <button className="back-btn" onClick={() => setSelected(null)}>← Retour à la liste</button>

        <div className="detail-header">
          <div className="detail-patient-info">
            <div className={`detail-avatar ${selected.urgent ? 'urgent' : ''}`}><UserRound size={40} /></div>
            <div>
              <h2 className="detail-name">{selected.patient_nom}</h2>
              <p className="detail-meta">
                {selected.age ? `${selected.age} ans` : 'Âge non spécifié'} · {selected.sexe === 'F' ? 'Féminin' : selected.sexe === 'M' ? 'Masculin' : '—'} · {selected.service ?? '—'} · Dossier {selected.dossier ?? '—'}
              </p>
              <div className="detail-badges">
                {selected.urgent && <span className="badge badge-urgent">URGENT</span>}
                <span className={`badge badge-status badge-${selected.status.replace(/ /g, '-').toLowerCase()}`}>{selected.status}</span>
                {selected.appointment_id && (
                  <span className="badge badge-ai">
                    <Brain size={12} /> Généré par IA
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-col">
            <div className="detail-card">
              <h3 className="card-title">Informations patient</h3>
              <div className="info-row"><span className="info-key">Patient</span><span className="info-val">{selected.patient_nom}</span></div>
              <div className="info-row"><span className="info-key">Âge</span><span className="info-val">{selected.age ?? '—'} ans</span></div>
              <div className="info-row"><span className="info-key">Médecin</span><span className="info-val">{selected.medecin ?? '—'}</span></div>
              <div className="info-row"><span className="info-key">Service</span><span className="info-val">{selected.service ?? '—'}</span></div>
              <div className="info-row"><span className="info-key">Heure</span><span className="info-val">{selected.heure ?? '—'}</span></div>
            </div>
          </div>

          <div className="detail-col">
            <div className="detail-card">
              <h3 className="card-title">Motif & Observations</h3>
              {selected.motif && (
                <div className="symptom-tags">
                  {selected.motif.split(/[,—]+/).map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="symptom-tag">{tag}</span>
                  ))}
                </div>
              )}
              <label className="field-label">Observations du médecin</label>
              <textarea
                className="consultation-textarea"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Saisir les observations cliniques..."
              />
            </div>

            <div className="detail-card">
              <h3 className="card-title">Diagnostic</h3>
              <textarea
                className="consultation-textarea"
                rows={3}
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                placeholder="Diagnostic provisoire ou confirmé..."
              />
            </div>
          </div>
        </div>

        <div className="detail-footer">
          <button
            type="button"
            className="action-button primary-btn save-btn"
            onClick={handleSaveNotes}
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Sauvegarder les notes'}
          </button>
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="consultation-page">
      <div className="consultation-header">
        <div>
          <p className="section-label">Consultations</p>
          <h1>Consultations validées</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Les consultations sont créées automatiquement depuis les pré-diagnostics IA validés.
          </p>
        </div>
      </div>

      <div className="consultation-toolbar">
        <input
          type="text"
          className="consultation-search"
          placeholder="Rechercher un patient, médecin ou service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['Tous', 'En attente', 'En cours', 'Terminé', 'Urgences'] as FilterType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            style={{
              padding: '4px 14px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer',
              background: filter === tab ? '#0066ff' : 'white',
              color: filter === tab ? 'white' : '#334155',
              fontWeight: filter === tab ? 600 : 400,
            }}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <Brain size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>Aucune consultation trouvée.</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Les consultations apparaissent ici après validation d'un pré-diagnostic sur la page&nbsp;
            <strong>Prediagnostics IA</strong>.
          </p>
        </div>
      ) : (
        <div className="consultation-grid">
          {filtered.map((c) => (
            <article
              key={c.id}
              className={`consultation-card ${c.urgent ? 'urgent' : ''}`}
              onClick={() => { setSelected(c); setNotes(c.notes ?? ''); setDiagnostic(c.diagnostic ?? '') }}
            >
              <div className="card-top">
                <div className={`card-avatar ${c.urgent ? 'urgent' : ''}`}><UserRound size={24} /></div>
                <div>
                  <h2 className="card-name">{c.patient_nom}</h2>
                  <p className="card-sub">{c.age ? `${c.age} ans` : '—'} · {c.service ?? '—'}</p>
                </div>
              </div>
              <div className="card-row"><span className="card-key">Médecin</span><span>{c.medecin ?? '—'}</span></div>
              <div className="card-row"><span className="card-key">Heure</span><span>{c.heure ?? '—'}</span></div>
              <div className="card-row"><span className="card-key">Motif</span><span className="card-motif">{c.motif ?? '—'}</span></div>
              <div className="card-footer">
                <span className={`badge badge-status badge-${c.status.replace(/ /g, '-').toLowerCase()}`}>{c.status}</span>
                {c.urgent && <span className="badge badge-urgent">Urgent</span>}
                {c.appointment_id && (
                  <span className="badge badge-ai" title="Généré depuis un pré-diagnostic IA">
                    <Brain size={11} /> IA
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

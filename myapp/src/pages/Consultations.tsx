import { useEffect, useState } from 'react'
import { UserRound, Plus, X, Loader2 } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/consultation.css'

type ConsultationStatus = 'En attente' | 'En cours' | 'Terminé'
type FilterType = 'Tous' | ConsultationStatus | 'Urgences'

type Consultation = {
  id: number
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [newC, setNewC] = useState({ patientNom: '', age: '', service: '', motif: '', urgent: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchConsultations = async () => {
    try {
      setLoading(true)
      setConsultations(await apiCall('/consultations'))
      setError('')
    } catch (error) {
      setError(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConsultations() }, [])

  const filtered = consultations.filter((c) => {
    const matchSearch =
      c.patient_nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.service ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'Tous' ? true :
      filter === 'Urgences' ? c.urgent :
      c.status === filter
    return matchSearch && matchFilter
  })

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiCall('/consultations', {
        method: 'POST',
        body: JSON.stringify({
          patient_nom: newC.patientNom,
          age: parseInt(newC.age) || null,
          service: newC.service || null,
          motif: newC.motif || null,
          urgent: newC.urgent,
          heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }),
      })
      await fetchConsultations()
      setIsFormOpen(false)
      setNewC({ patientNom: '', age: '', service: '', motif: '', urgent: false })
    } catch (error) {
      setError(getApiErrorMessage(error))
    }
  }

  const handleSaveNotes = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await apiCall(`/consultations/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes, diagnostic, status: 'Terminé' }),
      })
      await fetchConsultations()
      setSelected(null)
    } catch (error) {
      setError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="consultation-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

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
                <span className={`badge badge-status badge-${selected.status.replace(' ', '-').toLowerCase()}`}>{selected.status}</span>
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
                  {selected.motif.split(' ').slice(0, 4).map((tag) => (
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
          <button type="button" className="action-button primary-btn save-btn" onClick={handleSaveNotes} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Terminer et sauvegarder'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="consultation-page">
      <div className="consultation-header">
        <div>
          <p className="section-label">Consultations</p>
          <h1>Consultations du jour</h1>
        </div>
      </div>

      <div className="consultation-toolbar">
        <input
          type="text"
          className="consultation-search"
          placeholder="Rechercher un patient ou un service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="new-consultation-btn" onClick={() => setIsFormOpen(true)}>
          <Plus size={17} /> Nouvelle Consultation
        </button>
      </div>

      {(['Tous', 'En attente', 'En cours', 'Terminé', 'Urgences'] as FilterType[]).map((tab) => (
        <button
          key={tab}
          type="button"
          style={{ marginRight: 8, marginBottom: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: filter === tab ? '#0066ff' : 'white', color: filter === tab ? 'white' : '#334155', cursor: 'pointer' }}
          onClick={() => setFilter(tab)}
        >
          {tab}
        </button>
      ))}

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      {isFormOpen && (
        <div className="staff-modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <form className="staff-modal" onSubmit={handleAddConsultation} onClick={(e) => e.stopPropagation()}>
            <div className="staff-modal-header">
              <div><p className="staff-label">Consultations</p><h2>Nouvelle consultation</h2></div>
              <button type="button" className="modal-close-button" onClick={() => setIsFormOpen(false)} aria-label="Fermer"><X size={20} /></button>
            </div>
            <label>Nom du patient
              <input required value={newC.patientNom} onChange={(e) => setNewC({ ...newC, patientNom: e.target.value })} placeholder="Ex. Amina Tchou" />
            </label>
            <label>Âge
              <input type="number" value={newC.age} onChange={(e) => setNewC({ ...newC, age: e.target.value })} placeholder="Ex. 34" />
            </label>
            <label>Service
              <select value={newC.service} onChange={(e) => setNewC({ ...newC, service: e.target.value })}>
                <option value="">Sélectionner un service</option>
                <option value="Cardiologie">Cardiologie</option>
                <option value="Neurologie">Neurologie</option>
                <option value="Pédiatrie">Pédiatrie</option>
                <option value="Orthopédie">Orthopédie</option>
                <option value="Dermatologie">Dermatologie</option>
                <option value="Urgences">Urgences</option>
              </select>
            </label>
            <label>Motif
              <textarea value={newC.motif} onChange={(e) => setNewC({ ...newC, motif: e.target.value })} placeholder="Décrivez le motif de la consultation..." />
            </label>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={newC.urgent} onChange={(e) => setNewC({ ...newC, urgent: e.target.checked })} />
              Urgent
            </label>
            <button type="submit" className="save-staff-button"><Plus size={17} /> Ajouter la consultation</button>
          </form>
        </div>
      )}

      <div className="consultation-grid">
        {filtered.length === 0 ? (
          <p className="consultation-empty-state">Aucune consultation trouvée.</p>
        ) : (
          filtered.map((c) => (
            <article key={c.id} className={`consultation-card ${c.urgent ? 'urgent' : ''}`} onClick={() => { setSelected(c); setNotes(c.notes ?? ''); setDiagnostic(c.diagnostic ?? '') }}>
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
                <span className={`badge badge-status badge-${c.status.replace(' ', '-').toLowerCase()}`}>{c.status}</span>
                {c.urgent && <span className="badge badge-urgent">Urgent</span>}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

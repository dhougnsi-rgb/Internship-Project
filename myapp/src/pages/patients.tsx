import { useEffect, useMemo, useState } from 'react'
import { UserRound, Loader2, X } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/patients.css'

type PatientCategory = 'Tout' | 'Hospitalise' | 'En Observation' | 'Ambulatoire' | 'Urgences' | 'Sortant'
const CATEGORIES: Exclude<PatientCategory, 'Tout'>[] = [
  'Hospitalise',
  'En Observation',
  'Ambulatoire',
  'Urgences',
  'Sortant',
]

type Patient = {
  id: number
  nom: string
  age: number | null
  category: Exclude<PatientCategory, 'Tout'>
  dernierVisite?: string
  user_id?: number | null
  phone_number?: string | null
  email?: string | null
  motif?: string | null
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient
  onClose: () => void
  onSaved: (updated: Patient) => void
}) {
  const [nom, setNom] = useState(patient.nom)
  const [age, setAge] = useState(patient.age?.toString() ?? '')
  const [category, setCategory] = useState<Exclude<PatientCategory, 'Tout'>>(patient.category)
  const [motif, setMotif] = useState(patient.motif ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) { setError('Le nom est obligatoire.'); return }
    setSaving(true)
    setError('')
    try {
      const raw = await apiCall(`/patients/${patient.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: nom.trim(),
          age: age ? Number(age) : null,
          category,
          motif: motif.trim() || null,
        }),
      })
      onSaved({
        id: raw.id,
        nom: raw.name,
        age: raw.age,
        category: raw.category,
        dernierVisite: raw.last_visit,
        user_id: raw.user_id,
        phone_number: raw.phone_number,
        email: raw.email,
        motif: raw.motif,
      })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modifier le patient</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label htmlFor="edit-nom">Nom complet</label>
          <input
            id="edit-nom"
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom du patient"
            required
          />

          <label htmlFor="edit-age">Âge</label>
          <input
            id="edit-age"
            type="number"
            min="0"
            max="150"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Âge (optionnel)"
          />

          <label htmlFor="edit-category">Catégorie</label>
          <select
            id="edit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Exclude<PatientCategory, 'Tout'>)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label htmlFor="edit-motif">Motif de consultation</label>
          <textarea
            id="edit-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif (optionnel)"
            rows={3}
          />

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="action-button" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="action-button modify-button" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({
  patient,
  onClose,
  onDeleted,
}: {
  patient: Patient
  onClose: () => void
  onDeleted: (id: number) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await apiCall(`/patients/${patient.id}`, { method: 'DELETE' })
      onDeleted(patient.id)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Supprimer le patient</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <p style={{ margin: '1rem 0' }}>
          Voulez-vous vraiment supprimer <strong>{patient.nom}</strong> ?
          Cette action est irréversible.
        </p>
        {error && <p className="error-message">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="action-button" onClick={onClose} disabled={deleting}>
            Annuler
          </button>
          <button type="button" className="action-button delete-button" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Patients() {
  const [selectedCategory, setSelectedCategory] = useState<PatientCategory>('Tout')
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null)

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const data = await apiCall('/patients')
      setPatients(data.map((p: any) => ({
        id: p.id,
        nom: p.name,
        age: p.age,
        category: p.category,
        dernierVisite: p.last_visit,
        user_id: p.user_id,
        phone_number: p.phone_number,
        email: p.email,
        motif: p.motif,
      })))
      setError('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const filteredPatients = useMemo(() => {
    let result = patients
    if (selectedCategory !== 'Tout') {
      result = result.filter((p) => p.category === selectedCategory)
    }
    if (search.trim()) {
      result = result.filter((p) =>
        p.nom.toLowerCase().includes(search.toLowerCase())
      )
    }
    return result
  }, [selectedCategory, search, patients])

  if (loading) {
    return (
      <div className="patients-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="patients-page">
      <div className="patients-header">
        <div className="consultation-toolbar">
          <input
            type="text"
            className="consultation-search"
            placeholder="Rechercher un patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="category-filters">
          {(['Tout', ...CATEGORIES] as PatientCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-btn${selectedCategory === cat ? ' active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="patients-list-wrap">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <article className="patient-row" key={patient.id}>
              <div className="patient-main">
                <div className="patient-avatar"><UserRound size={24} /></div>
                <div className="patient-info">
                  <h2>{patient.nom}</h2>
                  <p>
                    {patient.age ? `${patient.age} ans` : 'Âge non spécifié'} • {patient.category}
                  </p>
                </div>
              </div>

              <div className="patient-meta">
                <span className="patient-tag">{patient.category}</span>
                {patient.dernierVisite && (
                  <span className="patient-date">Dernier visite: {patient.dernierVisite}</span>
                )}
              </div>

              <div className="patient-actions">
                <button
                  type="button"
                  className="action-button modify-button"
                  onClick={() => setEditingPatient(patient)}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="action-button delete-button"
                  onClick={() => setDeletingPatient(patient)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="patients-empty">Aucun patient trouvé</div>
        )}
      </div>

      {editingPatient && (
        <EditModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={(updated) => {
            setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            setEditingPatient(null)
          }}
        />
      )}

      {deletingPatient && (
        <DeleteConfirm
          patient={deletingPatient}
          onClose={() => setDeletingPatient(null)}
          onDeleted={(id) => {
            setPatients((prev) => prev.filter((p) => p.id !== id))
            setDeletingPatient(null)
          }}
        />
      )}
    </div>
  )
}

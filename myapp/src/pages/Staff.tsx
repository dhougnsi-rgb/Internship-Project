import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Mail, Phone, Plus, UserRound, X } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/staff.css'

type StaffCategory = 'Tout' | 'Generaliste' | 'Chirugien' | 'Pediatre' | 'Infirmier' | 'Ophtamologue' | 'Autre'

type StaffMember = {
  id: number
  nom: string
  category: Exclude<StaffCategory, 'Tout'>
  phone: string
  email: string
}

const CATEGORY_TO_ROLE: Record<string, string> = {
  Generaliste:  'doctor',
  Chirugien:    'doctor',
  Pediatre:     'doctor',
  Ophtamologue: 'doctor',
  Infirmier:    'staff',
  Autre:        'staff',
}

export default function Staff() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedCategory, setSelectedCategory] = useState<StaffCategory>('Tout')
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    category: 'Generaliste' as Exclude<StaffCategory, 'Tout'>,
    phone: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      setStaffMembers(await apiCall('/staff'))
      setError('')
    } catch (error) {
      setError(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStaff() }, [])

  const filteredStaff = useMemo(() => {
    if (selectedCategory === 'Tout') return staffMembers
    return staffMembers.filter((m) => m.category === selectedCategory)
  }, [selectedCategory, staffMembers])

  const handleAddStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (form.password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setSubmitting(true)
    try {
      // Step 1 — create a login account for this staff member
      const role = CATEGORY_TO_ROLE[form.category] ?? 'staff'
      await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.nom,
          email: form.email,
          password: form.password,
          phone_number: form.phone || 'non renseigné',
          role,
        }),
      })

      // Step 2 — also save to the staff directory table
      await apiCall('/staff', {
        method: 'POST',
        body: JSON.stringify({
          nom: form.nom,
          category: form.category,
          phone: form.phone,
          email: form.email,
        }),
      })

      await fetchStaff()
      setForm({ nom: '', category: 'Generaliste', phone: '', email: '', password: '' })
      setIsFormOpen(false)
    } catch (error) {
      setFormError(getApiErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStaff = async (id: number) => {
    try {
      await apiCall(`/staff/${id}`, {
        method: 'DELETE',
      })
      setSelectedMember(null)
      await fetchStaff()
    } catch (error) {
      setError(getApiErrorMessage(error))
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div className="staff-actions">
          <label className="category-filter">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as StaffCategory)}>
              <option value="Tout">Tout</option>
              <option value="Generaliste">Généraliste</option>
              <option value="Chirugien">Chirurgien</option>
              <option value="Pediatre">Pédiatre</option>
              <option value="Infirmier">Infirmier</option>
              <option value="Ophtamologue">Ophtalmologue</option>
              <option value="Autre">Autre</option>
            </select>
          </label>
          <button type="button" className="new-staff-btn" onClick={() => { setIsFormOpen(true); setFormError('') }}>
            <Plus size={17} /> Nouveau membre du personnel
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red', padding: '8px 16px' }}>{error}</p>}

      <div className="staff-list-wrap">
        {loading ? (
          <p style={{ padding: 16, color: '#64748b' }}>Chargement...</p>
        ) : filteredStaff.length === 0 ? (
          <p style={{ padding: 16, color: '#64748b' }}>Aucun membre du personnel trouvé.</p>
        ) : (
          filteredStaff.map((member) => (
            <article
              className="staff-row staff-row-clickable"
              key={member.id}
              onClick={() => setSelectedMember(member)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedMember(member) }}
              role="button"
              tabIndex={0}
            >
              <div className="staff-main">
                <div className="staff-avatar"><UserRound size={24} /></div>
                <div className="staff-info">
                  <h2>{member.nom}</h2>
                  <p>{member.category}</p>
                </div>
              </div>
              <div className="staff-actions">
                <button type="button" className="action-button modify-button"
                  onClick={(e) => { e.stopPropagation(); setSelectedMember(member) }}>
                  Modifier
                </button>
                <button type="button" className="action-button delete-button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteStaff(member.id) }}>
                  Supprimer
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Add staff modal */}
      {isFormOpen && (
        <div className="staff-modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <form className="staff-modal" onSubmit={handleAddStaff} onClick={(e) => e.stopPropagation()}>
            <div className="staff-modal-header">
              <div><p className="staff-label">Gestion du personnel</p><h2>Nouveau membre</h2></div>
              <button type="button" className="modal-close-button" onClick={() => setIsFormOpen(false)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <label>Nom complet
              <input required value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex. Dr. Jean Talla" />
            </label>

            <label>Spécialité / position
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Exclude<StaffCategory, 'Tout'> })}>
                <option value="Generaliste">Généraliste</option>
                <option value="Chirugien">Chirurgien</option>
                <option value="Pediatre">Pédiatre</option>
                <option value="Infirmier">Infirmier</option>
                <option value="Ophtamologue">Ophtalmologue</option>
                <option value="Autre">Autre</option>
              </select>
            </label>

            <div className="staff-form-grid">
              <label>Téléphone
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+237 6XX XX XX XX" />
              </label>
              <label>Email
                <input required type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nom@djohealth.cm" />
              </label>
            </div>

            <label>Mot de passe (pour se connecter)
              <input required type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 8 caractères" />
            </label>

            <small style={{ color: '#64748b', marginTop: -8, display: 'block' }}>
              Rôle attribué automatiquement : <strong>{CATEGORY_TO_ROLE[form.category] === 'doctor' ? 'Médecin' : 'Personnel'}</strong>
            </small>

            {formError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>{formError}</p>}

            <button type="submit" className="save-staff-button" disabled={submitting}>
              <Plus size={17} /> {submitting ? 'Création...' : 'Ajouter le membre'}
            </button>
          </form>
        </div>
      )}

      {/* Detail modal */}
      {selectedMember && (
        <div className="staff-modal-backdrop" onClick={() => setSelectedMember(null)}>
          <div className="staff-modal staff-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="staff-modal-header">
              <div className="staff-detail-heading">
                <div className="staff-avatar large"><UserRound size={40} /></div>
                <div>
                  <p className="staff-label">Fiche du personnel</p>
                  <h2>{selectedMember.nom}</h2>
                  <span className="staff-detail-role">{selectedMember.category}</span>
                </div>
              </div>
              <button type="button" className="modal-close-button" onClick={() => setSelectedMember(null)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <div className="staff-contact-list">
              <div><Phone size={18} /><span><small>Téléphone</small><strong>{selectedMember.phone || '—'}</strong></span></div>
              <div><Mail size={18} /><span><small>Email</small><strong>{selectedMember.email}</strong></span></div>
              <div><UserRound size={18} /><span><small>Spécialité / position</small><strong>{selectedMember.category}</strong></span></div>
              <div><UserRound size={18} /><span><small>Rôle système</small><strong>{CATEGORY_TO_ROLE[selectedMember.category] === 'doctor' ? 'Médecin' : 'Personnel'}</strong></span></div>
            </div>
            <button type="button" className="delete-detail-button" onClick={() => handleDeleteStaff(selectedMember.id)}>
              Supprimer ce membre
            </button>
          </div>
        </div>
      )}
    </div>
  )}

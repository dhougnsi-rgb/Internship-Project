import { useEffect, useMemo, useState } from 'react'
import { UserRound, Loader2 } from 'lucide-react'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/patients.css'

type PatientCategory = 'Tout' | 'Hospitalise' | 'En Observation' | 'Ambulatoire' | 'Urgences' | 'Sortant'

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

export default function Patients() {
  const [selectedCategory, setSelectedCategory] = useState<PatientCategory>('Tout')
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (error) {
      setError(getApiErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const filteredPatients = useMemo(() => {
    let result = patients

    if (selectedCategory !== 'Tout') {
      result = result.filter((patient) => patient.category === selectedCategory)
    }

    if (search.trim()) {
      result = result.filter((patient) =>
        patient.nom.toLowerCase().includes(search.toLowerCase())
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
                <button type="button" className="action-button modify-button">
                  Modifier
                </button>
                <button type="button" className="action-button delete-button">
                  Supprimer
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="patients-empty">Aucun patient trouvé</div>
        )}
      </div>
    </div>
  )
}
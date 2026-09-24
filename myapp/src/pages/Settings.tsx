import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../context/Authcontext'
import { apiCall, getApiErrorMessage } from '../api'
import '../style/settings.css'

type Profile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  sex: string
  birthDate: string
  birthPlace: string
  country: string
  city: string
}

const emptyProfile: Profile = {
  firstName: '', lastName: '', email: '', phone: '',
  sex: '', birthDate: '', birthPlace: '', country: '', city: '',
}

export default function Settings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmationPassword, setConfirmationPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Pre-fill from auth context
  useEffect(() => {
    if (user) {
      const parts = user.name?.split(' ') ?? []
      setProfile((p) => ({
        ...p,
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' ') ?? '',
        email: user.email ?? '',
      }))
    }
  }, [user])

  const handleProfileChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setProfile((p) => ({ ...p, [name]: value }))
  }

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileMessage('')
    setProfileError('')
    try {
      await apiCall('/auth/me/update', {
        method: 'PATCH',
        body: JSON.stringify({
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          phone_number: profile.phone || undefined,
        }),
      })
      setProfileMessage('Informations personnelles enregistrées.')
    } catch (error) {
      setProfileError(getApiErrorMessage(error))
    }
  }

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmationPassword) {
      setPasswordError('Veuillez remplir tous les champs.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmationPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    try {
      await apiCall('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      setPasswordMessage('Mot de passe mis à jour avec succès.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmationPassword('')
    } catch (error) {
      setPasswordError(getApiErrorMessage(error))
    }
  }

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || 'PI'

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div>
          <p className="settings-eyebrow">Paramètres</p>
          <p>Gérez vos préférences de compte et de sécurité.</p>
        </div>
        <div className="profile-badge" aria-hidden="true">{initials}</div>
      </header>

      <section className="settings-section">
        <div className="section-heading">
          <div><h2>Informations personnelles</h2><p>Mettez votre profil à jour.</p></div>
          <span className="section-number">01</span>
        </div>
        <form className="settings-form" onSubmit={handleProfileSubmit}>
          <div className="profile-grid">
            <label>Prénom<input name="firstName" value={profile.firstName} onChange={handleProfileChange} /></label>
            <label>Nom<input name="lastName" value={profile.lastName} onChange={handleProfileChange} /></label>
            <label>Adresse email<input name="email" type="email" value={profile.email} onChange={handleProfileChange} disabled style={{ opacity: 0.6 }} /></label>
            <label>Numéro de téléphone<input name="phone" type="tel" value={profile.phone} onChange={handleProfileChange} /></label>
            <label>Sexe
              <select name="sex" value={profile.sex} onChange={handleProfileChange}>
                <option value="">—</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
            </label>
            <label>Date de naissance<input name="birthDate" type="date" value={profile.birthDate} onChange={handleProfileChange} /></label>
            <label>Lieu de naissance<input name="birthPlace" value={profile.birthPlace} onChange={handleProfileChange} /></label>
            <label>Pays<input name="country" value={profile.country} onChange={handleProfileChange} /></label>
            <label>Ville<input name="city" value={profile.city} onChange={handleProfileChange} /></label>
          </div>
          <div className="form-actions">
            {profileMessage && <span className="success-message" role="status">{profileMessage}</span>}
            {profileError && <span className="error-message" role="alert">{profileError}</span>}
            <button className="primary-button" type="submit">Enregistrer</button>
          </div>
        </form>
      </section>

      <div className="security-grid">
        <section className="settings-section security-section">
          <div className="section-heading">
            <div><h2>Mot de passe</h2><p>Assurez-vous que votre compte utilise un mot de passe long et aléatoire.</p></div>
            <span className="section-number">02</span>
          </div>
          <form className="settings-form compact-form" onSubmit={handlePasswordSubmit}>
            <label>Mot de passe actuel
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </label>
            <label>Nouveau mot de passe
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <label>Confirmer le nouveau mot de passe
              <input type="password" value={confirmationPassword} onChange={(e) => setConfirmationPassword(e.target.value)} />
            </label>
            <div className="form-actions">
              {passwordMessage && <span className="success-message" role="status">{passwordMessage}</span>}
              {passwordError && <span className="error-message" role="alert">{passwordError}</span>}
              <button className="secondary-button" type="submit">Enregistrer</button>
            </div>
          </form>
        </section>

        <section className="settings-section security-section">
          <div className="section-heading">
            <div><h2>Authentification à deux facteurs</h2><p>Ajoutez une couche de sécurité supplémentaire à votre compte.</p></div>
            <span className="section-number">03</span>
          </div>
          <div className="two-factor-card">
            <div className="shield-icon" aria-hidden="true">+</div>
            <div>
              <h3>{twoFactorEnabled ? 'Vérification à 2 facteurs active' : 'Protéger votre compte'}</h3>
              <p>{twoFactorEnabled ? 'Votre compte nécessite un code de vérification lors de la connexion.' : 'Exiger un code de vérification en plus de votre mot de passe.'}</p>
            </div>
            <button
              className={`toggle ${twoFactorEnabled ? 'is-enabled' : ''}`}
              type="button"
              aria-pressed={twoFactorEnabled}
              onClick={() => setTwoFactorEnabled((v) => !v)}
            >
              <span />{twoFactorEnabled ? 'Activé' : 'Activer'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

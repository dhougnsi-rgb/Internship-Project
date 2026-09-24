import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/Authcontext'
import '../style/signin.css'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState('+237')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [confirmationPassword, setConfirmationPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role] = useState('administrator')
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()

  const isValidPhoneNumber = (value: string) => /^\d{8,15}$/.test(value)

  const handleCountryCodeChange = (value: string) => {
    if (value.startsWith('+')) {
      const sanitizedValue = value.replace(/\D/g, '')
      setCountryCode('+' + sanitizedValue)
    }
  }

  const handlePhoneChange = (value: string) => {
    const sanitizedValue = value.replace(/\D/g, '')

    if (sanitizedValue !== value) {
      setError('Le numéro de téléphone doit contenir uniquement des chiffres.')
    } else {
      setError('')
    }

    setPhoneNumber(sanitizedValue)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!name || !phoneNumber || !email || !password || !confirmationPassword) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Le numéro de téléphone doit contenir uniquement des chiffres (8 à 15 chiffres).')
      return
    }

    if (password !== confirmationPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    try {
      const fullPhoneNumber = countryCode + phoneNumber
      await register(name, fullPhoneNumber, email, password, role)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.')
    }
  }

  return (
    <div className="signin-page">
      <form className="glass-element" onSubmit={handleSubmit}>
        <h1>Creez votre compte</h1>

        <label htmlFor="fullname">Nom et prenom</label>
        <input
          id="fullname"
          type="text"
          placeholder="Entrez votre nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="phone-number">Numero de Telephone</label>
        <div className="phone-input-container">
          <input
            id="country-code"
            className="country-code-input"
            type="text"
            placeholder="+237"
            maxLength={4}
            value={countryCode}
            onChange={(e) => handleCountryCodeChange(e.target.value)}
          />
          <div className="country-code-divider" />
          <input
            id="phone-number"
            className="phone-number-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={9}
            placeholder="numero de telephone"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
        </div>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Mot de passe</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="creez un mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: '40px', width: '100%' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <label htmlFor="confirmation-password">Confirmation de mot passe</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="confirmation-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="confirmez le mot de passe"
            value={confirmationPassword}
            onChange={(e) => setConfirmationPassword(e.target.value)}
            style={{ paddingRight: '40px', width: '100%' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <p className="switch-auth">
          Avez-vous déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Création du compte...' : 'Créer un compte'}
        </button>
      </form>
    </div>
  )
}
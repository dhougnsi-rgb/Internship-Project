import { useAuth } from '../context/Authcontext'
import { UserRound } from 'lucide-react'

const getRoleLabel = (role?: string): string => {
  switch (role) {
    case 'administrator':
      return 'Administrateur'
    case 'doctor':
      return 'Médecin'
    case 'staff':
      return 'Personnel'
    default:
      return 'Utilisateur'
  }
}

export default function Topbar() {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-label"><b>Bienvenue,</b></p>
        <h6>Espace de Travail</h6>
      </div>


      <div className="topbar-actions">
        <div className="profile-block">
          <div className="profile-photo"><UserRound size={20} /></div>
          <div className="profile-text">
            <span className="profile-name">{user?.name || 'John Doe'}</span>
            <small>{getRoleLabel(user?.role)}</small>
          </div>
        </div>

      </div>
    </header>
  )
}

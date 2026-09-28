import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageCircle, Stethoscope, Users, ClipboardList, Brain, Settings, LogOut, CalendarDays, Languages } from 'lucide-react'
import { useAuth } from '../context/Authcontext'
import { filterNav } from '../permissions'

const ALL_NAV_ITEMS = [
  { label: 'Tableau de bord',    path: '/dashboard',      icon: <LayoutDashboard size={18} /> },
  { label: 'Messages',           path: '/messages',       icon: <MessageCircle size={18} /> },
  { label: 'Personnel médical',  path: '/staff',          icon: <Stethoscope size={18} /> },
  { label: 'Rendez-vous',        path: '/rendez-vous',    icon: <CalendarDays size={18} /> },
  { label: 'Patients',           path: '/patients',       icon: <Users size={18} /> },
  { label: 'Consultations',      path: '/consultations',  icon: <ClipboardList size={18} /> },
  { label: 'Prediagnostics IA',  path: '/ai-diagnostics', icon: <Brain size={18} /> },
  { label: 'Traductions',        path: '/translations',   icon: <Languages size={18} /> },
  { label: 'Paramètres',         path: '/settings',       icon: <Settings size={18} /> },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Only show pages the current user's role is allowed to visit
  const navItems = filterNav(user?.role, ALL_NAV_ITEMS)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DH</div>
        <div>
          <h2>DjoHealth</h2>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Deconnexion</span>
      </button>
    </aside>
  )
}

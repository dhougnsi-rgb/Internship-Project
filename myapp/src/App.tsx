import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/Authcontext'
import { AppointmentProvider } from './context/AppointmentContext'
import SignIn from './pages/signin'
import Login from './pages/login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/patients'
import Messages from './pages/Messages'
import Staff from './pages/Staff'
import RendezVous from './pages/rendez-vous'
import Consultations from './pages/Consultations'
import AI_Diagnostics from './pages/AI_diagnostics'
import Settings from './pages/Settings'
import ProtectedRoute from './components/protectedroute'
import AppLayout from './components/applayout'
import './dashboard.css'

function App() {
  return (
    <AuthProvider>
      <AppointmentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/rendez-vous" element={<RendezVous />} />
                <Route path="/consultations" element={<Consultations />} />
                <Route path="/ai-diagnostics" element={<AI_Diagnostics />} />
                <Route path="/ai-diagnostics/:patientId" element={<AI_Diagnostics />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AppointmentProvider>
    </AuthProvider>
  )
}

export default App
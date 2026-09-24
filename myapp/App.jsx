import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/Authcontext.jsx'
import SignIn from './pages/signin.jsx'
import Login from './pages/login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProtectedRoute from './components/protectedroute.jsx'
import './App.css'
import './dashboard.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
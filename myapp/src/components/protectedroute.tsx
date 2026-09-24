import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/Authcontext'
import { canAccess, getDeniedRedirect } from '../permissions'

/**
 * ProtectedRoute — guards every route inside the authenticated shell.
 *
 * Two checks:
 *   1. Is the user logged in?        → if not, redirect to /login
 *   2. Can their role see this page? → if not, redirect to /dashboard
 *
 * Usage in App.tsx (unchanged from before):
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *     ...
 *   </Route>
 */
export default function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but role not allowed on this path → go to dashboard
  if (!canAccess(user.role, location.pathname)) {
    return <Navigate to={getDeniedRedirect(user.role)} replace />
  }

  return <Outlet />
}

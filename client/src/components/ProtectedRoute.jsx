import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Sends unauthenticated users to /login, remembering where they were headed.
export function ProtectedRoute({ children }) {
  const { isAuthed } = useAuth()
  const location = useLocation()
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

// Admin-only. Non-admins are bounced to the home page.
export function AdminRoute({ children }) {
  const { isAuthed, isAdmin } = useAuth()
  const location = useLocation()
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

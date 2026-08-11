import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  // Restore the session from localStorage on first load.
  useEffect(() => {
    const saved = localStorage.getItem('df_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore corrupt value */ }
    }
    setReady(true)
  }, [])

  // api/client.js clears localStorage and fires this when a request comes
  // back 401 with an expired/invalid token. Drop the in-memory user too and
  // bounce to login with a message, instead of leaving a "logged in" UI
  // that just fails every request.
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null)
      navigate('/login', { replace: true, state: { sessionExpired: true } })
    }
    window.addEventListener('auth:session-expired', onSessionExpired)
    return () => window.removeEventListener('auth:session-expired', onSessionExpired)
  }, [navigate])

  const persist = (data) => {
    // data = { token, userId, name, email, role }
    localStorage.setItem('df_token', data.token)
    const u = { id: data.userId, name: data.name, email: data.email, role: data.role }
    localStorage.setItem('df_user', JSON.stringify(u))
    setUser(u)
    return u
  }

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    return persist(data)
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return persist(data)
  }

  const loginWithGoogle = async (idToken) => {
    const { data } = await api.post('/auth/google', { idToken })
    return persist(data)
  }

  const logout = () => {
    localStorage.removeItem('df_token')
    localStorage.removeItem('df_user')
    setUser(null)
  }

  const value = { user, ready, login, register, loginWithGoogle, logout,
    isAuthed: !!user, isAdmin: user?.role === 'Admin' }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

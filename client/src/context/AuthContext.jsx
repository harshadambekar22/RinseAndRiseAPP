import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  // Restore the session from localStorage on first load.
  useEffect(() => {
    const saved = localStorage.getItem('df_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore corrupt value */ }
    }
    setReady(true)
  }, [])

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

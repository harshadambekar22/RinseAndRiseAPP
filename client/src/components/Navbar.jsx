import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, LayoutDashboard, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSettings } from '../context/SettingsContext'
import { imageUrl } from '../api/client'
import Icon from './Icon'
import LoadingOverlay from './LoadingOverlay'

// Signing out clears local state instantly, which doesn't give the loading
// icon time to be seen. Hold it visible for at least this long.
const MIN_BUSY_MS = 2500
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Navbar() {
  const { user, isAuthed, isAdmin, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const { projectName, projectIcon, projectLogo } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminArea = location.pathname.startsWith('/admin')
  const [signingOut, setSigningOut] = useState(false)

  const initials = user?.name?.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await sleep(MIN_BUSY_MS)
      logout()
      navigate('/')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="brand">
          <span className="brand-mark">
            {projectLogo ? <img src={imageUrl(projectLogo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Icon name={projectIcon} size={18} />}
          </span>
          {projectName}
        </Link>

        <nav className="nav-links">
          {!isAdminArea && <NavLink to="/order">Book a pickup</NavLink>}
          {!isAdminArea && isAuthed && <NavLink to="/orders">My orders</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {!isAuthed ? (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/order" className="btn btn-primary btn-sm">Book now</Link>
            </>
          ) : (
            <>
              {isAdmin && (
                <Link to="/admin" className="btn btn-ghost btn-sm" title="Admin">
                  <LayoutDashboard size={16} />
                </Link>
              )}
              <span className="avatar" title={user.name}>{initials}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} disabled={signingOut} title="Sign out">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {signingOut && <LoadingOverlay label="Signing out…" />}
    </header>
  )
}

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import Icon from '../components/Icon'
import LoadingOverlay from '../components/LoadingOverlay'
import GoogleLoginButton from '../components/GoogleLoginButton'

// Sign-in is often near-instant, which means the loading icon flashes by
// too fast to notice. Hold the busy state open for at least this long so
// it's actually visible.
const MIN_BUSY_MS = 2500
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Login() {
  const { login, loginWithGoogle } = useAuth()
  const { projectIcon, googleClientId } = useSettings()
  const GOOGLE_ENABLED = !!googleClientId
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const finish = (u) => navigate(u.role === 'Admin' && redirectTo === '/' ? '/admin' : redirectTo, { replace: true })

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const [u] = await Promise.all([login(email.trim(), password), sleep(MIN_BUSY_MS)])
      finish(u)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not sign in. Check your email and password.')
    } finally { setBusy(false) }
  }

  const onGoogle = async (cred) => {
    setError(''); setBusy(true)
    try {
      const [u] = await Promise.all([loginWithGoogle(cred.credential), sleep(MIN_BUSY_MS)])
      finish(u)
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-in failed.')
    } finally { setBusy(false) }
  }

  return (
    <main className="container page">
      <div className="auth-card">
        <div className="auth-mark"><Icon name={projectIcon} size={22} /></div>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to schedule pickups and track your orders.</p>

        {location.state?.resetSuccess && (
          <div className="alert-success" style={{ marginBottom: 14 }}>
            Password updated. Sign in with your new password.
          </div>
        )}
        {location.state?.sessionExpired && (
          <div className="alert-error" style={{ marginBottom: 14 }} role="alert">
            Your session has expired. Please sign in again.
          </div>
        )}
        {error && <div className="alert-error" role="alert">{error}</div>}

        <form onSubmit={submit} className="stack-sm">
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <div className="between" style={{ alignItems: 'baseline', marginBottom: 6 }}>
              <label style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '.8rem' }}>Forgot password?</Link>
            </div>
            <input className="input" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {GOOGLE_ENABLED && (
          <>
            <div className="divider-or"><span>or</span></div>
            <div className="google-wrap">
              <GoogleLoginButton onSuccess={onGoogle} onError={() => setError('Google sign-in failed.')} />
            </div>
          </>
        )}

        <p className="muted center" style={{ marginTop: 18 }}>
          New here? <Link to="/register" state={location.state}>Create an account</Link>
        </p>
        <p className="muted center" style={{ fontSize: '.78rem', marginTop: 6 }}>
          Admin demo: admin@rinserise.local / Admin@123
        </p>
      </div>

      {busy && <LoadingOverlay label="Signing in…" />}
    </main>
  )
}

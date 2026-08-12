import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { imageUrl } from '../api/client'
import Icon from '../components/Icon'
import GoogleLoginButton from '../components/GoogleLoginButton'

export default function Register() {
  const { register, loginWithGoogle } = useAuth()
  const { projectIcon, projectLogo, googleClientId, googleSignInEnabled } = useSettings()
  const GOOGLE_ENABLED = googleSignInEnabled && !!googleClientId
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(''); setBusy(true)
    try {
      const u = await register({ ...form, name: form.name.trim(), email: form.email.trim() })
      navigate(redirectTo, { replace: true })
      return u
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not create your account. The email may already be registered.')
    } finally { setBusy(false) }
  }

  const onGoogle = async (cred) => {
    setError(''); setBusy(true)
    try {
      await loginWithGoogle(cred.credential)
      navigate(redirectTo, { replace: true })
    } catch {
      setError('Google sign-up failed.')
    } finally { setBusy(false) }
  }

  return (
    <main className="container page">
      <div className="auth-card">
        <div className="auth-mark">
          {projectLogo ? <img src={imageUrl(projectLogo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Icon name={projectIcon} size={22} />}
        </div>
        <h1>Create your account</h1>
        <p className="muted">A few details and you're ready to book your first pickup.</p>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form onSubmit={submit} className="stack-sm">
          <div className="field">
            <label>Full name</label>
            <input className="input" required value={form.name}
              onChange={(e) => update('name', e.target.value)} placeholder="Priya Sharma" />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required autoComplete="email" value={form.email}
              onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Mobile number</label>
            <input className="input" inputMode="tel" value={form.phone}
              onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" required minLength={6} autoComplete="new-password"
              value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 6 characters" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            <UserPlus size={16} /> {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {GOOGLE_ENABLED && (
          <>
            <div className="divider-or"><span>or</span></div>
            <div className="google-wrap">
              <GoogleLoginButton onSuccess={onGoogle} onError={() => setError('Google sign-up failed.')} text="signup_with" />
            </div>
          </>
        )}

        <p className="muted center" style={{ marginTop: 18 }}>
          Already have an account? <Link to="/login" state={location.state}>Sign in</Link>
        </p>
      </div>
    </main>
  )
}

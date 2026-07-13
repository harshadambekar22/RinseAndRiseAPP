import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import Icon from '../components/Icon'
import api from '../api/client'

// Three steps in one page/URL, rather than three routes — nothing else in
// the app needs to link into the middle of this flow, and keeping it one
// component makes the email/code state trivial to carry forward.
const STEP_EMAIL = 1
const STEP_CODE = 2
const STEP_PASSWORD = 3

export default function ForgotPassword() {
  const { projectIcon } = useSettings()
  const navigate = useNavigate()

  const [step, setStep] = useState(STEP_EMAIL)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)

  const requestCode = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setStep(STEP_CODE)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  const resendCode = async () => {
    setError(''); setBusy(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } catch {
      setError('Could not resend the code. Please try again.')
    } finally { setBusy(false) }
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await api.post('/auth/verify-reset-code', { email: email.trim(), code })
      setStep(STEP_PASSWORD)
    } catch (err) {
      setError(err?.response?.data?.message || 'That code is invalid or has expired.')
    } finally { setBusy(false) }
  }

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmitPassword = newPassword.length >= 6 && newPassword === confirmPassword && !busy

  const changePassword = async (e) => {
    e.preventDefault()
    if (!canSubmitPassword) return
    setError(''); setBusy(true)
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code, newPassword })
      navigate('/login', { state: { resetSuccess: true } })
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update your password. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <main className="container page">
      <div className="auth-card">
        <div className="auth-mark"><Icon name={projectIcon} size={22} /></div>

        {step === STEP_EMAIL && (
          <>
            <h1>Forgot your password?</h1>
            <p className="muted">Enter your account email and we'll send you a verification code.</p>

            {error && <div className="alert-error" role="alert">{error}</div>}

            <form onSubmit={requestCode} className="stack-sm">
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button className="btn btn-primary btn-block" disabled={busy}>
                <Mail size={16} /> {busy ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          </>
        )}

        {step === STEP_CODE && (
          <>
            <h1>Enter your code</h1>
            <p className="muted">
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
            </p>

            {error && <div className="alert-error" role="alert">{error}</div>}
            {resent && <div className="alert-success">A new code is on its way.</div>}

            <form onSubmit={verifyCode} className="stack-sm">
              <div className="field">
                <label>Verification code</label>
                <input
                  className="input code-input"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
                <ShieldCheck size={16} /> {busy ? 'Verifying…' : 'Verify code'}
              </button>
            </form>

            <p className="muted center" style={{ marginTop: 18, fontSize: '.85rem' }}>
              Didn't get it?{' '}
              <button type="button" className="link-btn" onClick={resendCode} disabled={busy}>Resend code</button>
              {' · '}
              <button type="button" className="link-btn" onClick={() => { setStep(STEP_EMAIL); setCode(''); setError('') }}>
                Use a different email
              </button>
            </p>
          </>
        )}

        {step === STEP_PASSWORD && (
          <>
            <h1>Set a new password</h1>
            <p className="muted">Choose a new password for your account.</p>

            {error && <div className="alert-error" role="alert">{error}</div>}

            <form onSubmit={changePassword} className="stack-sm">
              <div className="field">
                <label>New password</label>
                <input className="input" type="password" required minLength={6} autoComplete="new-password"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters" />
              </div>
              <div className="field">
                <label>Confirm password</label>
                <input className="input" type="password" required minLength={6} autoComplete="new-password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password" />
                {passwordsMismatch && (
                  <p style={{ margin: '6px 0 0', fontSize: '.8rem', color: 'var(--danger-text)' }}>
                    Passwords don't match.
                  </p>
                )}
              </div>
              <button className="btn btn-primary btn-block" disabled={!canSubmitPassword}>
                <KeyRound size={16} /> {busy ? 'Updating…' : 'Change Password'}
              </button>
            </form>
          </>
        )}

        <p className="muted center" style={{ marginTop: 18 }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}

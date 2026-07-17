import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Check, Save, Eye, EyeOff } from 'lucide-react'
import api from '../../api/client'

// Grouped the same way the app actually uses them — see AdminApiKeysController
// for what each key falls back to when it's left blank here.
const SECTIONS = [
  {
    title: 'Google',
    description: 'Powers "Sign in with Google".',
    fields: [
      { key: 'googleClientId', label: 'OAuth client ID', placeholder: 'xxxx.apps.googleusercontent.com', secret: false },
    ],
  },
  {
    title: 'Razorpay',
    description: 'Card / UPI / net-banking checkout. Without a secret key, payments run in mock mode.',
    fields: [
      { key: 'razorpayKeyId', label: 'Key ID', placeholder: 'rzp_test_xxxxx', secret: false },
      { key: 'razorpayKeySecret', label: 'Key secret', placeholder: '••••••••', secret: true },
    ],
  },
  {
    title: 'Twilio (WhatsApp / SMS)',
    description: 'Delivers bills to customers. Without an account SID + auth token, bills are just logged.',
    fields: [
      { key: 'twilioAccountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxx', secret: false },
      { key: 'twilioAuthToken', label: 'Auth token', placeholder: '••••••••', secret: true },
      { key: 'twilioWhatsAppFrom', label: 'WhatsApp from', placeholder: 'whatsapp:+14155238886', secret: false },
      { key: 'twilioSmsFrom', label: 'SMS from', placeholder: '+1XXXXXXXXXX', secret: false },
    ],
  },
  {
    title: 'Email (SMTP)',
    description: 'Sends "forgot password" verification codes to customers. Without a host + credentials, codes are just logged.',
    fields: [
      { key: 'smtpHost', label: 'SMTP host', placeholder: 'smtp.yourprovider.com', secret: false },
      { key: 'smtpPort', label: 'SMTP port', placeholder: '587', secret: false },
      { key: 'smtpUsername', label: 'Username', placeholder: 'you@yourdomain.com', secret: false },
      { key: 'smtpPassword', label: 'Password', placeholder: '••••••••', secret: true },
      { key: 'smtpFromEmail', label: 'From address', placeholder: 'no-reply@yourdomain.com', secret: false },
      { key: 'smtpFromName', label: 'From name', placeholder: 'Fresh & Fold', secret: false },
    ],
  },
]

export default function ApiKeys() {
  // `form` holds the raw Settings-table override for each key (blank = not
  // set here). `defaults` holds what's actually in effect right now via
  // appsettings.json/env when a field is blank — display-only, never saved.
  const [form, setForm] = useState(null)
  const [defaults, setDefaults] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reveal, setReveal] = useState({})

  useEffect(() => {
    api.get('/admin/apikeys')
      .then(({ data }) => { setForm(data.values); setDefaults(data.defaults) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleReveal = (key) => setReveal((r) => ({ ...r, [key]: !r[key] }))

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const { data } = await api.put('/admin/apikeys', form)
      setForm(data.values); setDefaults(data.defaults)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) return <div className="loading-wrap"><LoadingIcon /></div>

  const placeholderFor = ({ key, placeholder, secret }) => {
    const def = defaults[key]
    if (!def) return placeholder
    // Secrets: hint that something's configured without leaking it in a
    // plain HTML attribute — reveal is opt-in per field the admin edits.
    return secret ? 'Using a key from server config' : `Using "${def}" from server config`
  }

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>API keys</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Third-party keys the app uses. Leave a field blank to keep using the value from
            appsettings.json/env (shown as a hint below it); fill it in to override. Changes
            here take effect immediately — no redeploy.
          </p>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div className="panel" key={section.title} style={{ maxWidth: 640, marginTop: 16 }}>
          <strong style={{ fontFamily: 'var(--font-display)' }}>{section.title}</strong>
          <p className="muted" style={{ margin: '3px 0 14px', fontSize: '.85rem' }}>{section.description}</p>

          {section.fields.map((field) => {
            const { key, label, secret } = field
            return (
              <div className="field" key={key}>
                <label>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={secret && !reveal[key] ? 'password' : 'text'}
                    value={form[key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholderFor(field)}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', paddingRight: secret ? 40 : undefined }}
                  />
                  {secret && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(key)}
                      aria-label={reveal[key] ? `Hide ${label}` : `Show ${label}`}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)',
                        display: 'grid', placeItems: 'center', padding: 4,
                      }}
                    >
                      {reveal[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {saving ? 'Saving…' : 'Save API keys'}</>}
      </button>
    </>
  )
}

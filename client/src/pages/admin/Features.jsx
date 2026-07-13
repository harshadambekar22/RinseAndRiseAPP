import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Check, Save } from 'lucide-react'
import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import Icon, { ICON_NAMES } from '../../components/Icon'
import { applyThemeColors } from '../../utils/theme'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

// Each entry here is one storefront feature the admin can flip on/off.
// `key` matches the field name returned by GET/PUT /api/admin/settings.
// Add more toggles to this list as new features get a flag — the UI below
// renders whatever's in this array, so nothing else needs to change.
const FEATURES = [
  {
    key: 'pickupSchedulingEnabled',
    title: 'Schedule pickup',
    description:
      'When on, customers see the full self-service flow — pick garments, drop a map ' +
      'pin, choose a pickup time, and pay online. When off, customers can still browse ' +
      'services and prices, but the booking flow is hidden and they see a "call to book" ' +
      'prompt with your business phone instead.',
  },
]

export default function Features() {
  const { refresh, themePrimaryColor, themeAccentColor } = useSettings()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [savedKey, setSavedKey] = useState(null)

  // Branding (project name/description/icon) is text input, so it gets its
  // own explicit Save button rather than saving on every keystroke.
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandSaved, setBrandSaved] = useState(false)

  // Theme colors get the same explicit-save treatment as branding.
  const [themeSaving, setThemeSaving] = useState(false)
  const [themeSaved, setThemeSaved] = useState(false)

  // Contact details get the same explicit-save treatment too.
  const [contactSaving, setContactSaving] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)

  // Color inputs preview live (see setThemeColor below). If the admin leaves
  // this page without saving, snap back to the last-saved colors so the
  // unsaved preview doesn't leak into the rest of the app.
  useEffect(() => {
    return () => applyThemeColors({ primary: themePrimaryColor, accent: themeAccentColor })
  }, [themePrimaryColor, themeAccentColor])

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (key) => {
    const nextValue = !form[key]
    setSavingKey(key); setSavedKey(null)
    try {
      // Send only the flag that changed — the API leaves other fields untouched.
      const { data } = await api.put('/admin/settings', { [key]: nextValue })
      setForm(data)
      await refresh() // update the public/customer side immediately
      setSavedKey(key)
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000)
    } finally {
      setSavingKey(null)
    }
  }

  const saveBranding = async () => {
    setBrandSaving(true); setBrandSaved(false)
    try {
      // Only send the branding fields — toggles on this page are left untouched.
      const { data } = await api.put('/admin/settings', {
        projectName: form.projectName,
        projectDescription: form.projectDescription,
        projectIcon: form.projectIcon,
      })
      setForm(data)
      await refresh() // navbar, footer, browser tab title update immediately
      setBrandSaved(true)
      setTimeout(() => setBrandSaved(false), 2500)
    } finally {
      setBrandSaving(false)
    }
  }

  // Live-preview a color as the admin edits it — reverts to the saved value
  // if they navigate away without saving (SettingsContext refetches).
  const setThemeColor = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      // Only preview once it's a complete hex color — an in-progress typed
      // value would otherwise flicker the whole app's colors.
      if (HEX_COLOR.test(next.themePrimaryColor) && HEX_COLOR.test(next.themeAccentColor)) {
        applyThemeColors({ primary: next.themePrimaryColor, accent: next.themeAccentColor })
      }
      return next
    })
  }

  const saveTheme = async () => {
    setThemeSaving(true); setThemeSaved(false)
    try {
      // Only send the theme fields — toggles/branding on this page are left untouched.
      const { data } = await api.put('/admin/settings', {
        themePrimaryColor: form.themePrimaryColor,
        themeAccentColor: form.themeAccentColor,
      })
      setForm(data)
      await refresh() // buttons, navbar, icons update for everyone immediately
      setThemeSaved(true)
      setTimeout(() => setThemeSaved(false), 2500)
    } finally {
      setThemeSaving(false)
    }
  }

  const saveContact = async () => {
    setContactSaving(true); setContactSaved(false)
    try {
      // Only send the contact fields — toggles/branding/theme are left untouched.
      const { data } = await api.put('/admin/settings', {
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        contactAddress: form.contactAddress,
        contactMapLink: form.contactMapLink,
        businessPhone: form.businessPhone,
      })
      setForm(data)
      await refresh() // footer updates for every visitor immediately
      setContactSaved(true)
      setTimeout(() => setContactSaved(false), 2500)
    } finally {
      setContactSaving(false)
    }
  }

  if (loading || !form) return <div className="loading-wrap"><LoadingIcon /></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Features</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            Turn storefront features on or off, and manage your project's branding.
          </p>
        </div>
      </div>

      {/* Branding — updates the navbar, footer, browser tab title, and page
          description everywhere in the app the moment it's saved. */}
      <div className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        <strong style={{ fontFamily: 'var(--font-display)' }}>Branding</strong>
        <p className="muted" style={{ margin: '3px 0 14px', fontSize: '.85rem' }}>
          The project name, description, and icon shown across the whole site — navbar,
          footer, browser tab, and bills sent to customers.
        </p>

        <div className="field">
          <label>Project name</label>
          <input className="input" value={form.projectName || ''}
            onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            placeholder="Fresh & Fold" />
        </div>
        <div className="field">
          <label>Project description</label>
          <textarea className="input" rows={2} value={form.projectDescription || ''}
            onChange={(e) => setForm((f) => ({ ...f, projectDescription: e.target.value }))}
            placeholder="Pickup & delivery dry cleaning, without the trip." />
        </div>
        <div className="field">
          <label>Project icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setForm((f) => ({ ...f, projectIcon: name }))}
                aria-pressed={form.projectIcon === name}
                aria-label={`Use ${name} icon`}
                title={name}
                style={{
                  width: 38, height: 38, display: 'grid', placeItems: 'center',
                  borderRadius: 10, cursor: 'pointer',
                  border: form.projectIcon === name ? '2px solid var(--primary)' : '1px solid var(--line)',
                  background: form.projectIcon === name ? 'var(--primary-wash)' : 'var(--white)',
                }}
              >
                <Icon name={name} size={17} />
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={saveBranding} disabled={brandSaving} style={{ marginTop: 6 }}>
          {brandSaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {brandSaving ? 'Saving…' : 'Save branding'}</>}
        </button>
      </div>

      {/* Contact us — shown in the footer, and the "call to book" number when
          self-service scheduling is off. */}
      <div className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        <strong style={{ fontFamily: 'var(--font-display)' }}>Contact us</strong>
        <p className="muted" style={{ margin: '3px 0 14px', fontSize: '.85rem' }}>
          How customers reach you — shown in the site footer and, when self-service
          scheduling is off, on the "call to book" prompt.
        </p>

        <div className="row-2">
          <div className="field"><label>Contact email</label>
            <input className="input" type="email" value={form.contactEmail || ''}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              placeholder="hello@freshandfold.in" />
          </div>
          <div className="field"><label>Contact phone</label>
            <input className="input" value={form.contactPhone || ''}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              placeholder="+91 90000 00001" />
          </div>
        </div>

        <div className="field"><label>Mobile number for booking <span className="muted">(the "call to book" number)</span></label>
          <input className="input" value={form.businessPhone || ''}
            onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))}
            placeholder="+91 90000 00000" />
        </div>

        <div className="field"><label>Address</label>
          <textarea className="input" rows={2} value={form.contactAddress || ''}
            onChange={(e) => setForm((f) => ({ ...f, contactAddress: e.target.value }))}
            placeholder="12 Lake View Road, RS Puram, Coimbatore 641002" />
        </div>

        <div className="field"><label>Location link <span className="muted">(Google Maps share link)</span></label>
          <input className="input" value={form.contactMapLink || ''}
            onChange={(e) => setForm((f) => ({ ...f, contactMapLink: e.target.value }))}
            placeholder="https://maps.google.com/?q=..." />
        </div>

        <button className="btn btn-primary" onClick={saveContact} disabled={contactSaving} style={{ marginTop: 6 }}>
          {contactSaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {contactSaving ? 'Saving…' : 'Save contact details'}</>}
        </button>
      </div>

      {/* Theme — the two base colors the whole storefront's palette (buttons,
          navbar, links, icons) is derived from. Applies live as you pick a
          color, and to every visitor the moment it's saved. */}
      <div className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        <strong style={{ fontFamily: 'var(--font-display)' }}>Theme colors</strong>
        <p className="muted" style={{ margin: '3px 0 14px', fontSize: '.85rem' }}>
          Pick your two brand colors — buttons, the navbar, links, and icons across the
          whole site update instantly, for every visitor, once saved.
        </p>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'themePrimaryColor', label: 'Primary', hint: 'Buttons, navbar accents, icons', placeholder: '#e8590c' },
            { key: 'themeAccentColor', label: 'Accent', hint: 'Bills, "ready" badges', placeholder: '#f59e0b' },
          ].map(({ key, label, hint, placeholder }) => (
            <div className="field" key={key} style={{ flex: '1 1 220px' }}>
              <label>{label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={HEX_COLOR.test(form[key]) ? form[key] : '#000000'}
                  onChange={(e) => setThemeColor(key, e.target.value)}
                  aria-label={`${label} color`}
                  style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer' }}
                />
                <input
                  className="input"
                  value={form[key] || ''}
                  onChange={(e) => setThemeColor(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                />
              </div>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: '.78rem' }}>{hint}</p>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={saveTheme}
          disabled={themeSaving || !HEX_COLOR.test(form.themePrimaryColor) || !HEX_COLOR.test(form.themeAccentColor)}
          style={{ marginTop: 14 }}
        >
          {themeSaved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {themeSaving ? 'Saving…' : 'Save theme'}</>}
        </button>
      </div>

      <div className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        {FEATURES.map((f, i) => (
          <div key={f.key}>
            {i > 0 && <div className="divider" />}
            <div className="switch-row">
              <div>
                <strong style={{ fontFamily: 'var(--font-display)' }}>{f.title}</strong>
                <p className="muted" style={{ margin: '3px 0 0', fontSize: '.85rem' }}>
                  {f.description}
                </p>
              </div>
              <button
                type="button"
                className={`switch ${form[f.key] ? 'on' : ''}`}
                onClick={() => toggle(f.key)}
                disabled={savingKey === f.key}
                aria-pressed={form[f.key]}
                aria-label={`Toggle ${f.title}`}
              >
                <span className="knob" />
              </button>
            </div>
            {savedKey === f.key && (
              <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: 'var(--accent, #2e7d32)' }}>
                <Check size={13} style={{ verticalAlign: '-2px' }} /> Saved — customers will see this change now.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

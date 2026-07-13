import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Save, Check } from 'lucide-react'
import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'

export default function Settings() {
  const { refresh } = useSettings()
  const [form, setForm] = useState({ businessPhone: '', headline: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      // Only send the fields this page owns — the pickup-scheduling flag lives
      // on the Features page and is left untouched here.
      const { data } = await api.put('/admin/settings', {
        businessPhone: form.businessPhone,
        headline: form.headline,
      })
      setForm(data)
      await refresh()            // update the rest of the app immediately
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="loading-wrap"><LoadingIcon /></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Settings</h1>
          <p className="muted" style={{ marginTop: 0 }}>Business details shown to customers.</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 640, marginTop: 16 }}>
        <div className="field">
          <label>Business phone (shown to customers)</label>
          <input className="input" value={form.businessPhone || ''}
            onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))}
            placeholder="+91 90000 00000" />
        </div>
        <div className="field">
          <label>Homepage headline</label>
          <input className="input" value={form.headline || ''}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
            placeholder="Fresh clothes, without the trip." />
        </div>

        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
          {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> {saving ? 'Saving…' : 'Save changes'}</>}
        </button>
      </div>
    </>
  )
}

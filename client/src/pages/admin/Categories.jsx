import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Plus, Save, X, Upload, Check } from 'lucide-react'
import api, { imageUrl } from '../../api/client'
import Icon, { ICON_NAMES } from '../../components/Icon'

const BLANK = { id: 0, name: '', slug: '', icon: 'shirt', imageUrl: '', sortOrder: 0, isActive: true }

export default function Categories() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => api.get('/admin/categories').then(({ data }) => setRows(data)).catch(() => {})
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const edit = (c) => setForm({ ...BLANK, ...c, imageUrl: c.imageUrl || '' })
  const reset = () => setForm(BLANK)

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await api.post('/admin/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm((f) => ({ ...f, imageUrl: data.url }))
    } finally { setUploading(false) }
  }

  const save = async () => {
    setSaving(true)
    const payload = {
      name: form.name, slug: form.slug || null, icon: form.icon,
      imageUrl: form.imageUrl || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive,
    }
    try {
      if (form.id) await api.put(`/admin/categories/${form.id}`, payload)
      else await api.post('/admin/categories', payload)
      await load(); reset()
    } finally { setSaving(false) }
  }

  if (loading) return <div className="loading-wrap"><LoadingIcon /></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Categories</h1>
          <p className="muted" style={{ marginTop: 0 }}>Groups of garments shown to customers and at the counter.</p>
        </div>
      </div>

      <div className="admin-split" style={{ marginTop: 16 }}>
        {/* List */}
        <div className="table-wrap">
          <table>
            <thead><tr><th></th><th>Name</th><th>Slug</th><th>Items</th><th>Order</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.imageUrl ? <img className="thumb" src={imageUrl(c.imageUrl)} alt="" /> : <span className="cat-icon sm"><Icon name={c.icon} size={16} /></span>}</td>
                  <td><strong>{c.name}</strong></td>
                  <td className="muted">{c.slug}</td>
                  <td>{c.itemCount}</td>
                  <td>{c.sortOrder}</td>
                  <td><span className={`badge ${c.isActive ? 'badge-green' : 'badge-grey'}`}>{c.isActive ? 'Active' : 'Hidden'}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => edit(c)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form */}
        <div className="panel">
          <div className="between" style={{ marginBottom: 12 }}>
            <strong style={{ fontFamily: 'var(--font-display)' }}>{form.id ? 'Edit category' : 'New category'}</strong>
            {form.id ? <button className="btn btn-ghost btn-sm" onClick={reset}><X size={14} /> Cancel</button> : null}
          </div>

          <div className="field"><label>Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sofa & Couch Covers" />
          </div>
          <div className="field"><label>Slug <span className="muted">(optional — auto from name)</span></label>
            <input className="input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="sofa-covers" />
          </div>
          <div className="row-2">
            <div className="field"><label>Icon</label>
              <select className="select" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="field"><label>Sort order</label>
              <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </div>

          <div className="field"><label>Image <span className="muted">(optional)</span></label>
            <div className="uploader">
              {form.imageUrl ? <img className="thumb lg" src={imageUrl(form.imageUrl)} alt="" /> : <div className="cat-icon"><Icon name={form.icon} size={22} /></div>}
              <label className="btn btn-ghost btn-sm">
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {form.imageUrl && <button className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}>Remove</button>}
            </div>
          </div>

          <label className="check"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active (visible to customers)</label>

          <button className="btn btn-primary btn-block" onClick={save} disabled={saving || !form.name} style={{ marginTop: 12 }}>
            {form.id ? <><Save size={16} /> Save changes</> : <><Plus size={16} /> Add category</>}
          </button>
        </div>
      </div>
    </>
  )
}

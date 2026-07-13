import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import api from '../../api/client'
import Icon, { ICON_NAMES } from '../../components/Icon'

const SERVICES = [
  { value: 'WashAndFold', label: 'Wash & Fold' },
  { value: 'DryClean', label: 'Dry Clean' },
  { value: 'Ironing', label: 'Ironing' },
  { value: 'Premium', label: 'Premium' },
]

const BLANK = { id: 0, name: '', service: 'DryClean', categoryId: '', pricePerPiece: '', icon: 'shirt', isActive: true }

export default function Prices() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/admin/clothtypes').then(({ data }) => setRows(data)).catch(() => {})

  useEffect(() => {
    Promise.all([
      load(),
      api.get('/admin/categories').then(({ data }) => setCategories(data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const edit = (c) => setForm({
    id: c.id, name: c.name, service: c.service, categoryId: c.categoryId,
    pricePerPiece: c.pricePerPiece, icon: c.icon, isActive: c.isActive,
  })
  const reset = () => setForm({ ...BLANK, categoryId: categories[0]?.id ?? '' })

  const save = async () => {
    setSaving(true)
    const payload = {
      name: form.name,
      service: form.service,
      categoryId: Number(form.categoryId),
      pricePerPiece: Number(form.pricePerPiece) || 0,
      icon: form.icon,
      isActive: form.isActive,
    }
    try {
      if (form.id) await api.put(`/admin/clothtypes/${form.id}`, payload)
      else await api.post('/admin/clothtypes', payload)
      await load(); reset()
    } finally { setSaving(false) }
  }

  if (loading) return <div className="loading-wrap"><LoadingIcon /></div>

  const canSave = form.name.trim() && form.categoryId && Number(form.pricePerPiece) >= 0 && form.pricePerPiece !== ''

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Prices</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            The items customers pick and their per-piece price. Changes apply the moment they're saved.
          </p>
        </div>
      </div>

      <div className="admin-split" style={{ marginTop: 16 }}>
        {/* List */}
        <div className="table-wrap">
          <table>
            <thead><tr><th></th><th>Name</th><th>Category</th><th>Type</th><th>Price</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><span className="cat-icon sm"><Icon name={c.icon} size={16} /></span></td>
                  <td><strong>{c.name}</strong></td>
                  <td className="muted">{c.categoryName}</td>
                  <td className="muted">{SERVICES.find((s) => s.value === c.service)?.label ?? c.service}</td>
                  <td>₹{c.pricePerPiece}</td>
                  <td><span className={`badge ${c.isActive ? 'badge-green' : 'badge-grey'}`}>{c.isActive ? 'Active' : 'Hidden'}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => edit(c)}>Edit</button></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="empty">No items yet — add your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Form */}
        <div className="panel">
          <div className="between" style={{ marginBottom: 12 }}>
            <strong style={{ fontFamily: 'var(--font-display)' }}>{form.id ? 'Edit item' : 'New item'}</strong>
            {form.id ? <button className="btn btn-ghost btn-sm" onClick={reset}><X size={14} /> Cancel</button> : null}
          </div>

          <div className="field"><label>Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Shirt" />
          </div>

          <div className="row-2">
            <div className="field"><label>Category</label>
              <select className="select" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="" disabled>Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Type</label>
              <select className="select" value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}>
                {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="row-2">
            <div className="field"><label>Price per piece (₹)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.pricePerPiece}
                onChange={(e) => setForm((f) => ({ ...f, pricePerPiece: e.target.value }))} placeholder="120" />
            </div>
            <div className="field"><label>Icon</label>
              <select className="select" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <label className="check"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active (visible to customers)</label>

          <button className="btn btn-primary btn-block" onClick={save} disabled={saving || !canSave} style={{ marginTop: 12 }}>
            {form.id ? <><Save size={16} /> Save changes</> : <><Plus size={16} /> Add item</>}
          </button>
        </div>
      </div>
    </>
  )
}

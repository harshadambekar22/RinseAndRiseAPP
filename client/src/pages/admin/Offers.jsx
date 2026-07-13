import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Plus, Save, X, Upload, Trash2, Tag } from 'lucide-react'
import api, { imageUrl } from '../../api/client'

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)
const nowLocal = () => toLocalInput(new Date().toISOString())
const plusDaysLocal = (n) => toLocalInput(new Date(Date.now() + n * 86400000).toISOString())

const blank = () => ({
  id: 0, title: '', description: '', discountType: 'Percentage', discountValue: 10,
  target: 'AllItems', categoryId: '', clothTypeId: '', code: '',
  startsAt: nowLocal(), endsAt: plusDaysLocal(7), isActive: true, showOnHome: true, bannerImageUrl: '',
})

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const discountLabel = (o) => (o.discountType === 'Percentage' ? `${o.discountValue}% off` : `₹${o.discountValue} off`)
const targetLabel = (o) =>
  o.target === 'Category' ? (o.categoryName || 'Category')
    : o.target === 'ClothType' ? (o.clothTypeName || 'Item')
      : 'All items'

export default function Offers() {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [form, setForm] = useState(blank())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => api.get('/admin/offers').then(({ data }) => setRows(data)).catch(() => {})

  useEffect(() => {
    Promise.all([
      load(),
      api.get('/categories').then(({ data }) => setCategories(data)),
      api.get('/clothtypes').then(({ data }) => setItems(data)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const edit = (o) => setForm({
    ...blank(), ...o,
    description: o.description || '', code: o.code || '',
    categoryId: o.categoryId || '', clothTypeId: o.clothTypeId || '',
    bannerImageUrl: o.bannerImageUrl || '',
    startsAt: toLocalInput(o.startsAt), endsAt: toLocalInput(o.endsAt),
  })
  const reset = () => setForm(blank())

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const { data } = await api.post('/admin/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm((f) => ({ ...f, bannerImageUrl: data.url }))
    } finally { setUploading(false) }
  }

  const save = async () => {
    setSaving(true)
    const payload = {
      title: form.title, description: form.description || null,
      discountType: form.discountType, discountValue: Number(form.discountValue) || 0,
      target: form.target,
      categoryId: form.target === 'Category' ? Number(form.categoryId) || null : null,
      clothTypeId: form.target === 'ClothType' ? Number(form.clothTypeId) || null : null,
      code: form.code || null,
      startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt),
      isActive: form.isActive, showOnHome: form.showOnHome, bannerImageUrl: form.bannerImageUrl || null,
    }
    try {
      if (form.id) await api.put(`/admin/offers/${form.id}`, payload)
      else await api.post('/admin/offers', payload)
      await load(); reset()
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this offer?')) return
    await api.delete(`/admin/offers/${id}`)
    if (form.id === id) reset()
    await load()
  }

  if (loading) return <div className="loading-wrap"><LoadingIcon /></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Offers &amp; discounts</h1>
          <p className="muted" style={{ marginTop: 0 }}>Run time-limited discounts and show pamphlets on the homepage.</p>
        </div>
      </div>

      <div className="admin-split wide" style={{ marginTop: 16 }}>
        {/* List */}
        <div className="offer-list">
          {rows.length === 0 && <div className="empty">No offers yet. Create your first one on the right.</div>}
          {rows.map((o) => (
            <div className={`offer-row ${o.isCurrentlyActive ? '' : 'dim'}`} key={o.id}>
              {o.bannerImageUrl
                ? <img className="offer-thumb" src={imageUrl(o.bannerImageUrl)} alt="" />
                : <div className="offer-thumb ph"><Tag size={18} /></div>}
              <div className="offer-info">
                <div className="between">
                  <strong>{o.title}</strong>
                  <span className="offer-amt">{discountLabel(o)}</span>
                </div>
                <div className="muted small">
                  {targetLabel(o)} · {fmtDate(o.startsAt)} → {fmtDate(o.endsAt)}{o.code ? ` · code ${o.code}` : ''}
                </div>
                <div className="offer-badges">
                  <span className={`badge ${o.isCurrentlyActive ? 'badge-green' : 'badge-grey'}`}>{o.isCurrentlyActive ? 'Live' : (o.isActive ? 'Scheduled/expired' : 'Off')}</span>
                  {o.showOnHome && <span className="badge badge-teal">Homepage</span>}
                </div>
              </div>
              <div className="offer-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => edit(o)}>Edit</button>
                <button className="btn btn-ghost btn-sm danger" onClick={() => remove(o.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="panel">
          <div className="between" style={{ marginBottom: 12 }}>
            <strong style={{ fontFamily: 'var(--font-display)' }}>{form.id ? 'Edit offer' : 'New offer'}</strong>
            {form.id ? <button className="btn btn-ghost btn-sm" onClick={reset}><X size={14} /> Cancel</button> : null}
          </div>

          <div className="field"><label>Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Flat ₹30 off your first pickup" />
          </div>
          <div className="field"><label>Description <span className="muted">(optional)</span></label>
            <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Shown under the title" />
          </div>

          <div className="row-2">
            <div className="field"><label>Discount type</label>
              <select className="select" value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
                <option value="Percentage">Percentage (%)</option>
                <option value="Flat">Flat (₹)</option>
              </select>
            </div>
            <div className="field"><label>Value {form.discountType === 'Percentage' ? '(%)' : '(₹)'}</label>
              <input className="input" type="number" min="0" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} />
            </div>
          </div>

          <div className="field"><label>Applies to</label>
            <select className="select" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}>
              <option value="AllItems">All items</option>
              <option value="Category">A category</option>
              <option value="ClothType">A specific item</option>
            </select>
          </div>
          {form.target === 'Category' && (
            <div className="field"><label>Category</label>
              <select className="select" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {form.target === 'ClothType' && (
            <div className="field"><label>Item</label>
              <select className="select" value={form.clothTypeId} onChange={(e) => setForm((f) => ({ ...f, clothTypeId: e.target.value }))}>
                <option value="">Select…</option>
                {items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="row-2">
            <div className="field"><label>Starts</label>
              <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
            </div>
            <div className="field"><label>Ends</label>
              <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
            </div>
          </div>

          <div className="field"><label>Coupon code <span className="muted">(optional)</span></label>
            <input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="FRESH30" />
          </div>

          <div className="field"><label>Pamphlet / banner image <span className="muted">(optional)</span></label>
            <div className="uploader">
              {form.bannerImageUrl ? <img className="thumb lg" src={imageUrl(form.bannerImageUrl)} alt="" /> : <div className="cat-icon"><Tag size={20} /></div>}
              <label className="btn btn-ghost btn-sm">
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {form.bannerImageUrl && <button className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, bannerImageUrl: '' }))}>Remove</button>}
            </div>
          </div>

          <label className="check"><input type="checkbox" checked={form.showOnHome} onChange={(e) => setForm((f) => ({ ...f, showOnHome: e.target.checked }))} /> Show on homepage</label>
          <label className="check"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active</label>

          <button className="btn btn-primary btn-block" onClick={save} disabled={saving || !form.title} style={{ marginTop: 12 }}>
            {form.id ? <><Save size={16} /> Save changes</> : <><Plus size={16} /> Create offer</>}
          </button>
        </div>
      </div>
    </>
  )
}

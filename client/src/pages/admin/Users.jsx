import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'

export default function Users() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get('/admin/users')
      .then(({ data }) => setRows(data))
      .catch(() => setError('Could not load customers.'))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) =>
      (r.name || '').toLowerCase().includes(t) ||
      (r.email || '').toLowerCase().includes(t) ||
      (r.phone || '').includes(t))
  }, [rows, q])

  if (error) return <div className="alert-error">{error}</div>
  if (!rows) return <div className="loading-wrap"><LoadingIcon /><span>Loading customers…</span></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Customers</h1>
          <p className="muted" style={{ marginTop: 0 }}>{rows.length} registered user(s).</p>
        </div>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search name / email / phone"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Orders</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone || <span className="muted">—</span>}</td>
                <td><span className={`badge ${u.role === 'Admin' ? 'badge-teal' : 'badge-grey'}`}>{u.role}</span></td>
                <td className="num">{u.orderCount}</td>
                <td className="muted" style={{ fontSize: '.82rem', whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="muted center" style={{ padding: 24 }}>No matching customers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

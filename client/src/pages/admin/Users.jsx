import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function Users() {
  const { user: currentUser } = useAuth()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [promotingId, setPromotingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

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

  const makeAdmin = async (user) => {
    if (!window.confirm(`Make ${user.name} an admin? They'll get full access to this dashboard.`)) return
    setPromotingId(user.id)
    try {
      const { data } = await api.post(`/admin/users/${user.id}/make-admin`)
      setRows((rs) => rs.map((r) => (r.id === user.id ? data : r)))
    } catch {
      window.alert('Could not update this customer. Please try again.')
    } finally {
      setPromotingId(null)
    }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This can't be undone.`)) return
    setDeletingId(user.id)
    try {
      await api.delete(`/admin/users/${user.id}`)
      setRows((rs) => rs.filter((r) => r.id !== user.id))
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Could not delete this customer. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

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
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Orders</th><th>Joined</th><th>Actions</th></tr>
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
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {u.role === 'Admin' ? (
                      <span className="muted" style={{ fontSize: '.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <ShieldCheck size={14} /> Admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => makeAdmin(u)}
                        disabled={promotingId === u.id || deletingId === u.id}
                      >
                        {promotingId === u.id
                          ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          : 'Make admin'}
                      </button>
                    )}
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Delete ${u.name}`}
                        title="Delete customer"
                        onClick={() => deleteUser(u)}
                        disabled={promotingId === u.id || deletingId === u.id}
                        style={{ color: 'var(--danger)', padding: '8px 10px' }}
                      >
                        {deletingId === u.id
                          ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="muted center" style={{ padding: 24 }}>No matching customers.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

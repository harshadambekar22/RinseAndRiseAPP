import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'

// Matches the backend OrderStatus enum (server/RinseRise.Api/Models/Enums.cs).
const STATUSES = [
  'Placed', 'PickupScheduled', 'PickedUp', 'InCleaning',
  'ReadyForDelivery', 'OutForDelivery', 'Delivered', 'Cancelled',
]

const badgeFor = (status) => {
  if (status === 'Delivered') return 'badge-green'
  if (status === 'Cancelled') return 'badge-red'
  if (status === 'ReadyForDelivery' || status === 'OutForDelivery') return 'badge-amber'
  return 'badge-teal'
}
const label = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2')

const SORTS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  totalHigh: (a, b) => b.total - a.total,
  totalLow: (a, b) => a.total - b.total,
}

export default function Orders() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('newest')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    api.get('/admin/orders')
      .then(({ data }) => setRows(data))
      .catch(() => setError('Could not load orders.'))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const t = q.trim().toLowerCase()
    let out = rows
    if (status !== 'all') out = out.filter((r) => r.status === status)
    if (t) {
      out = out.filter((r) =>
        r.orderNumber.toLowerCase().includes(t) ||
        (r.customerName || '').toLowerCase().includes(t) ||
        (r.customerPhone || '').includes(t))
    }
    return [...out].sort(SORTS[sort])
  }, [rows, q, status, sort])

  const updateStatus = async (order, newStatus) => {
    if (newStatus === order.status) return
    setUpdatingId(order.id)
    try {
      const { data } = await api.put(`/orders/${order.id}/status`, { status: newStatus })
      setRows((rs) => rs.map((r) => (r.id === order.id ? data : r)))
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Could not update the order status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const markPaid = async (order) => {
    setUpdatingId(order.id)
    try {
      const { data } = await api.post(`/admin/orders/${order.id}/mark-paid`)
      setRows((rs) => rs.map((r) => (r.id === order.id ? data : r)))
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Could not update the payment status.')
    } finally {
      setUpdatingId(null)
    }
  }

  if (error) return <div className="alert-error">{error}</div>
  if (!rows) return <div className="loading-wrap"><LoadingIcon /><span>Loading orders…</span></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Orders</h1>
          <p className="muted" style={{ marginTop: 0 }}>{filtered.length} of {rows.length} order(s).</p>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="totalHigh">Total: high to low</option>
            <option value="totalLow">Total: low to high</option>
          </select>
          <input className="input" style={{ maxWidth: 220 }} placeholder="Search order / name / phone"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Order</th><th>Customer</th><th>Channel</th><th>Items</th>
              <th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Update status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.orderNumber}</td>
                <td>{r.customerName}<br /><span className="muted" style={{ fontSize: '.8rem' }}>{r.customerPhone}</span></td>
                <td><span className="badge badge-grey">{r.channel}</span></td>
                <td className="num">{r.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td className="num">₹{r.total.toFixed(2)}</td>
                <td>
                  <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${r.paymentStatus === 'Paid' ? 'badge-green' : 'badge-amber'}`}>{r.paymentStatus}</span>
                    {r.paymentStatus !== 'Paid' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={updatingId === r.id}
                        onClick={() => markPaid(r)}
                      >
                        Mark as paid
                      </button>
                    )}
                  </div>
                </td>
                <td><span className={`badge ${badgeFor(r.status)}`}>{label(r.status)}</span></td>
                <td className="muted" style={{ fontSize: '.82rem', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>
                  <select
                    className="select" style={{ width: 'auto', minWidth: 150 }}
                    value={r.status}
                    disabled={updatingId === r.id}
                    onChange={(e) => updateStatus(r, e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="muted center" style={{ padding: 24 }}>No matching orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

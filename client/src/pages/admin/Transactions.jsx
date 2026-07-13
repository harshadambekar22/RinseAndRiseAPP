import LoadingIcon from '../../components/LoadingIcon'
import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'

const badgeFor = (status) => {
  if (status === 'Delivered') return 'badge-green'
  if (status === 'Cancelled') return 'badge-red'
  if (status === 'ReadyForDelivery' || status === 'OutForDelivery') return 'badge-amber'
  return 'badge-teal'
}
const label = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2')

export default function Transactions() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get('/admin/transactions')
      .then(({ data }) => setRows(data))
      .catch(() => setError('Could not load transactions.'))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) =>
      r.orderNumber.toLowerCase().includes(t) ||
      (r.customerName || '').toLowerCase().includes(t) ||
      (r.customerPhone || '').includes(t))
  }, [rows, q])

  if (error) return <div className="alert-error">{error}</div>
  if (!rows) return <div className="loading-wrap"><LoadingIcon /><span>Loading transactions…</span></div>

  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 2 }}>Transactions</h1>
          <p className="muted" style={{ marginTop: 0 }}>{rows.length} order(s) in total.</p>
        </div>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search order / name / phone"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Order</th><th>Customer</th><th>Channel</th><th>Items</th>
              <th>Total</th><th>Payment</th><th>Status</th><th>Date</th>
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
                <td><span className={`badge ${r.paymentStatus === 'Paid' ? 'badge-green' : 'badge-amber'}`}>{r.paymentStatus}</span></td>
                <td><span className={`badge ${badgeFor(r.status)}`}>{label(r.status)}</span></td>
                <td className="muted" style={{ fontSize: '.82rem', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="muted center" style={{ padding: 24 }}>No matching transactions.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

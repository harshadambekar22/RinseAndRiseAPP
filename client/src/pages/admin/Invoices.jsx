import { useState } from 'react'
import { Search, ArrowLeft, Receipt } from 'lucide-react'
import api from '../../api/client'
import Invoice from '../../components/Invoice'

const badgeFor = (status) => {
  if (status === 'Delivered') return 'badge-green'
  if (status === 'Cancelled') return 'badge-red'
  if (status === 'ReadyForDelivery' || status === 'OutForDelivery') return 'badge-amber'
  return 'badge-teal'
}
const label = (s) => (s || '').replace(/([a-z])([A-Z])/g, '$1 $2')

export default function Invoices() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)

  const search = async (e) => {
    e?.preventDefault()
    const term = q.trim()
    if (!term) return
    setSearching(true); setError(''); setSelected(null)
    try {
      const { data } = await api.get('/admin/invoices/search', { params: { q: term } })
      setResults(data)
    } catch {
      setError('Could not search invoices. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  if (selected) {
    return (
      <>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 14 }}>
          <ArrowLeft size={15} /> Back to results
        </button>
        <div style={{ maxWidth: 560 }}>
          <Invoice order={selected} />
        </div>
      </>
    )
  }

  return (
    <>
      <h1 style={{ marginTop: 0, marginBottom: 2 }}>Invoices</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Find an invoice by order ID, mobile number, or the customer's email.
      </p>

      <form onSubmit={search} className="row" style={{ gap: 10, marginTop: 14, maxWidth: 460 }}>
        <input
          className="input" placeholder="Order ID / email / mobile number"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={searching || !q.trim()}>
          <Search size={15} /> {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="alert-error" style={{ marginTop: 14 }}>{error}</div>}

      {results && (
        results.length === 0 ? (
          <div className="empty" style={{ marginTop: 18 }}>
            <Receipt size={28} color="var(--ink-soft)" />
            <h3>No matching invoices</h3>
            <p className="muted">Try the exact order number, or a different mobile/email.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.orderNumber}</td>
                    <td>{r.customerName}<br /><span className="muted" style={{ fontSize: '.8rem' }}>{r.customerPhone}{r.customerEmail ? ` · ${r.customerEmail}` : ''}</span></td>
                    <td className="num">₹{r.total.toFixed(2)}</td>
                    <td><span className={`badge ${badgeFor(r.status)}`}>{label(r.status)}</span></td>
                    <td className="muted" style={{ fontSize: '.82rem', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelected(r)}>View invoice</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}

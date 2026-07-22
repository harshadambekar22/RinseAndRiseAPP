import LoadingIcon from '../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageOpen, Plus, Receipt } from 'lucide-react'
import api from '../api/client'
import InvoiceModal from '../components/InvoiceModal'

const badgeFor = (status) => {
  if (status === 'Delivered') return 'badge-green'
  if (status === 'Cancelled') return 'badge-red'
  if (status === 'ReadyForDelivery' || status === 'OutForDelivery') return 'badge-amber'
  return 'badge-teal'
}
const label = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2')

export default function MyOrders() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [invoiceOrder, setInvoiceOrder] = useState(null)

  useEffect(() => {
    api.get('/orders/mine')
      .then(({ data }) => setOrders(data))
      .catch(() => setError('We could not load your orders.'))
  }, [])

  if (error) return <main className="container page"><div className="alert-error">{error}</div></main>
  if (!orders) return <main className="container page"><div className="loading-wrap"><LoadingIcon /><span>Loading your orders…</span></div></main>

  return (
    <main className="container page">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>My orders</h1>
          <p className="muted" style={{ marginTop: 0 }}>Track current pickups and review past ones.</p>
        </div>
        <Link to="/order" className="btn btn-primary btn-sm"><Plus size={16} /> New pickup</Link>
      </div>

      {orders.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <PackageOpen size={30} color="var(--ink-soft)" />
          <h3>No orders yet</h3>
          <p className="muted">When you book a pickup it'll show up here.</p>
          <Link to="/order" className="btn btn-primary">Book your first pickup</Link>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          {orders.map((o) => (
            <div className="order-row" key={o.id}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{o.orderNumber}</div>
                <div className="muted" style={{ fontSize: '.84rem' }}>
                  {new Date(o.createdAt).toLocaleDateString()} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s) · ₹{o.total.toFixed(2)}
                </div>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <span className={`badge ${badgeFor(o.status)}`}>{label(o.status)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setInvoiceOrder(o)}>
                  <Receipt size={15} /> Invoice
                </button>
                <Link to={`/track/${o.id}`} className="btn btn-ghost btn-sm">Track</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </main>
  )
}

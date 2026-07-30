import LoadingIcon from '../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Check, Package, Truck, Sparkles, ClipboardList, Home, RefreshCw, XCircle } from 'lucide-react'
import api from '../api/client'

// The lifecycle in order, matching the backend OrderStatus enum.
const STEPS = [
  { key: 'Placed',           title: 'Order placed',     desc: "We've received your order.",            Icon: ClipboardList },
  { key: 'PickupScheduled',  title: 'Pickup scheduled', desc: 'A pickup slot has been assigned.',      Icon: ClipboardList },
  { key: 'PickedUp',         title: 'Picked up',        desc: 'Your clothes are on the way to us.',    Icon: Package },
  { key: 'InCleaning',       title: 'In cleaning',      desc: 'Our experts are treating your garments.', Icon: Sparkles },
  { key: 'ReadyForDelivery', title: 'Ready',            desc: 'Cleaned, pressed and ready to go.',     Icon: Check },
  { key: 'OutForDelivery',   title: 'Out for delivery', desc: 'On the way back to you.',               Icon: Truck },
  { key: 'Delivered',        title: 'Delivered',        desc: 'Enjoy your fresh clothes!',             Icon: Home },
]

export default function Tracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setRefreshing(true)
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setError('We could not load this order.'))
      .finally(() => setRefreshing(false))
  }
  useEffect(load, [id])

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return
    setCancelError('')
    try {
      const { data } = await api.post(`/orders/${id}/cancel`)
      setOrder(data)
    } catch (err) {
      setCancelError(err?.response?.data?.message || 'Could not cancel this order.')
    }
  }

  if (error) return <main className="container page"><div className="alert-error">{error}</div></main>
  if (!order) return <main className="container page"><div className="loading-wrap"><LoadingIcon /><span>Loading…</span></div></main>

  const cancelled = order.status === 'Cancelled'
  const currentIndex = STEPS.findIndex((s) => s.key === order.status)

  return (
    <main className="container page narrow">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div>
          <span className="eyebrow">Order {order.orderNumber}</span>
          <h1 style={{ marginBottom: 2 }}>Track your order</h1>
          <p className="muted" style={{ marginTop: 0 }}>Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {order.status === 'PickupScheduled' && (
            <button className="btn btn-ghost btn-sm danger" onClick={cancelOrder}>
              <XCircle size={15} /> Cancel order
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={refreshing}>
            <RefreshCw size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {cancelError && <div className="alert-error" style={{ marginTop: 12 }}>{cancelError}</div>}

      <div className="card card-pad" style={{ marginTop: 16 }}>
        {cancelled ? (
          <div className="row" style={{ gap: 10, color: 'var(--danger)' }}>
            <XCircle size={20} /> <strong>This order was cancelled.</strong>
          </div>
        ) : (
          <div className="tracker">
            {STEPS.map((step, idx) => {
              const done = idx < currentIndex
              const current = idx === currentIndex
              const StepIcon = step.Icon
              return (
                <div className={`track-step ${done ? 'done' : ''} ${current ? 'current' : ''}`} key={step.key}>
                  <div className="track-rail">
                    <span className="track-dot">{done ? <Check size={15} /> : <StepIcon size={14} />}</span>
                    {idx < STEPS.length - 1 && <span className="track-line" />}
                  </div>
                  <div className="track-body">
                    <h4>{step.title}</h4>
                    <p className="muted">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <div className="between">
          <strong style={{ fontFamily: 'var(--font-display)' }}>Order total</strong>
          <strong>₹{order.total.toFixed(2)}</strong>
        </div>
        <div className="kv" style={{ marginTop: 8 }}><span className="k">Payment</span><span className="v">{order.paymentStatus}</span></div>
        <div className="kv"><span className="k">Items</span><span className="v">{order.items.reduce((n, i) => n + i.quantity, 0)}</span></div>
        {order.pickupAddressText && <div className="kv"><span className="k">Pickup</span><span className="v">{order.pickupAddressText}</span></div>}
      </div>

      <div style={{ marginTop: 18 }}>
        <Link to="/orders" className="btn btn-ghost">← All my orders</Link>
      </div>
    </main>
  )
}

import LoadingIcon from '../components/LoadingIcon'
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, MapPin } from 'lucide-react'
import api from '../api/client'
import { useSettings } from '../context/SettingsContext'

export default function OrderSuccess() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projectName } = useSettings()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setError('We could not load this order.'))
  }, [id])

  if (error) {
    return (
      <main className="container page">
        <div className="alert-error">{error}</div>
        <Link to="/orders" className="btn btn-primary">Go to my orders</Link>
      </main>
    )
  }
  if (!order) {
    return <main className="container page"><div className="loading-wrap"><LoadingIcon /><span>Loading your order…</span></div></main>
  }

  const paid = order.paymentStatus === 'Paid'

  return (
    <main className="container page narrow">
      <div className="center" style={{ marginBottom: 18 }}>
        <div className="success-mark"><CheckCircle2 size={34} /></div>
        <h1 style={{ marginBottom: 4 }}>{paid ? 'Payment successful' : 'Order placed'}</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Thanks, {order.customerName?.split(' ')[0]}! Your order <strong>{order.orderNumber}</strong> is confirmed.
        </p>
      </div>

      <div className="bill" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="bill-head">
          <div>
            <h3>{projectName}</h3>
            <span className="bill-no">{order.orderNumber}</span>
          </div>
          <span className={`badge ${paid ? 'badge-green' : 'badge-amber'}`}>{order.paymentStatus}</span>
        </div>
        <div className="perforation" aria-hidden="true" />
        <div className="bill-body">
          {order.items.map((i) => (
            <div className="bill-line" key={i.clothTypeId}>
              <span>{i.name} <span className="qcol">× {i.quantity}</span></span>
              <span>₹{i.lineTotal.toFixed(0)}</span>
            </div>
          ))}
          <div className="bill-totals">
            <div className="t"><span>Subtotal</span><span>₹{order.subTotal.toFixed(2)}</span></div>
            <div className="t"><span>Tax</span><span>₹{order.taxAmount.toFixed(2)}</span></div>
            {order.deliveryFee > 0 && <div className="t"><span>Delivery</span><span>₹{order.deliveryFee.toFixed(2)}</span></div>}
            <div className="grand"><span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}><span>Total paid</span><span>₹{order.total.toFixed(2)}</span></span></div>
          </div>

          {order.pickupAddressText && (
            <p className="muted" style={{ fontSize: '.84rem', marginTop: 14, display: 'flex', gap: 6 }}>
              <MapPin size={15} style={{ flexShrink: 0, marginTop: 2 }} /> {order.pickupAddressText}
            </p>
          )}
        </div>
      </div>

      <div className="row center" style={{ gap: 12, marginTop: 22, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate(`/track/${order.id}`)}>Track this order</button>
        <Link to="/orders" className="btn btn-ghost">My orders</Link>
      </div>
    </main>
  )
}

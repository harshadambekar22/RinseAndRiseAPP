import LoadingIcon from '../components/LoadingIcon'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, CreditCard, Smartphone, QrCode, Info, ArrowLeft, Banknote } from 'lucide-react'
import api from '../api/client'
import { getCart, clearCart, cartSubtotal, cartCount } from '../data/cart'
import { useSettings } from '../context/SettingsContext'

const TAX_RATE = 0.18

// Inject the Razorpay Checkout script on demand (only needed when real keys exist).
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function Payment() {
  const navigate = useNavigate()
  const { projectName, payAtPickupEnabled } = useSettings()
  const cart = getCart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('') // friendly progress text
  // Pay-at-pickup is an admin-wide switch, not a customer choice: when it's on,
  // online payment is hidden entirely and every order goes through as pay-at-pickup.
  const payMethod = payAtPickupEnabled ? 'payAtPickup' : 'online'

  const subtotal = cartSubtotal(cart)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = subtotal + tax
  const items = useMemo(() => Object.values(cart.items || {}), [cart])

  if (cartCount(cart) === 0) { navigate('/order'); return null }

  const buildOrderPayload = () => ({
    items: items.map((i) => ({ clothTypeId: i.id, quantity: i.qty })),
    pickupAddress: cart.address && {
      label: cart.address.label, line1: cart.address.line1, line2: cart.address.line2,
      city: cart.address.city, state: cart.address.state, pincode: cart.address.pincode,
      latitude: cart.address.lat || 0, longitude: cart.address.lng || 0,
    },
    // When the customer picked a saved address, the server re-derives the
    // pickup fields from its own copy of that row rather than trusting the
    // pickupAddress snapshot above.
    addressId: cart.address?.addressId || null,
    scheduledPickupAt: cart.pickupAt || null,
    notes: null,
    paymentMethod: payMethod === 'payAtPickup' ? 'PayAtPickup' : 'Online',
  })

  const verifyAndFinish = async (orderId, payload) => {
    setStatus('Confirming payment…')
    await api.post('/payments/razorpay/verify', payload)
    clearCart()
    navigate(`/order/success/${orderId}`, { replace: true })
  }

  const pay = async () => {
    setError(''); setBusy(true)
    try {
      // 1) Create the order in our system.
      setStatus('Creating your order…')
      const { data: order } = await api.post('/orders', buildOrderPayload())

      // Pay at pickup — the order is placed as-is (Pending), no Razorpay
      // checkout at all. The invoice/success page shows the "pay at pickup" note.
      if (payMethod === 'payAtPickup') {
        clearCart()
        navigate(`/order/success/${order.id}`, { replace: true })
        return
      }

      // 2) Ask the backend for a Razorpay order (or a MOCK one if keys aren't set).
      setStatus('Setting up payment…')
      const { data: rp } = await api.post('/payments/razorpay/order', { orderId: order.id })

      // 3a) MOCK mode — no real keys configured. Confirm straight away so the
      //     whole flow is demoable end-to-end without a Razorpay account.
      if (!rp.keyId || rp.razorpayOrderId.includes('MOCK')) {
        await verifyAndFinish(order.id, {
          razorpayOrderId: rp.razorpayOrderId,
          razorpayPaymentId: 'pay_mock_demo',
          razorpaySignature: 'mock_signature',
        })
        return
      }

      // 3b) Live mode — open Razorpay Checkout.
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error('Could not load the payment window. Check your connection and retry.')

      const rzp = new window.Razorpay({
        key: rp.keyId,
        amount: rp.amountPaise,
        currency: rp.currency || 'INR',
        name: projectName,
        description: `Order ${rp.orderNumber}`,
        order_id: rp.razorpayOrderId,
        prefill: { name: rp.customerName, contact: rp.customerPhone },
        theme: { color: '#0c7d7d' },
        handler: async (resp) => {
          try {
            await verifyAndFinish(order.id, {
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            })
          } catch {
            setError('Payment captured but verification failed. Please contact support with your order number.')
            setBusy(false)
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false); setStatus('')
            setError('Payment was cancelled. Your order is saved as unpaid — you can retry from “My orders”.')
          },
        },
      })
      rzp.on('payment.failed', () => {
        setBusy(false)
        setError('The payment failed. No money was deducted. Please try again.')
      })
      rzp.open()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong while starting the payment.')
      setBusy(false); setStatus('')
    }
  }

  return (
    <main className="container page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule')} style={{ marginBottom: 12 }}>
        <ArrowLeft size={16} /> Back to schedule
      </button>
      <span className="eyebrow">Step 3 of 3</span>
      <h1>Payment</h1>
      <p>Review your bill and pay securely. We support UPI, cards, net-banking and QR.</p>

      {error && <div className="alert-error" role="alert">{error}</div>}

      <div className="order-layout">
        <div className="stack">
          {payMethod === 'online' ? (
          <div className="panel">
            <div className="row" style={{ marginBottom: 12 }}>
              <ShieldCheck size={18} color="var(--primary-deep)" />
              <strong style={{ fontFamily: 'var(--font-display)' }}>Pay with Razorpay</strong>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              You'll be able to choose any of these on the secure Razorpay window:
            </p>
            <div className="chip-row">
              <span className="chip"><Smartphone size={15} /> UPI app</span>
              <span className="chip"><QrCode size={15} /> Scan QR</span>
              <span className="chip"><CreditCard size={15} /> Card</span>
              <span className="chip">Net-banking</span>
            </div>

            <div className="alert-info" style={{ marginTop: 18 }}>
              <Info size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              If no Razorpay keys are configured yet, the app runs in <strong>demo mode</strong> and
              marks the order paid so you can see the full flow. Add your keys in <code>appsettings.json</code> to take real payments.
            </div>
          </div>
          ) : (
          <div className="panel">
            <div className="row" style={{ marginBottom: 12 }}>
              <Banknote size={18} color="var(--primary-deep)" />
              <strong style={{ fontFamily: 'var(--font-display)' }}>Pay at pickup</strong>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              We'll place your order now and collect payment (cash, UPI or card) when we
              come to pick up your clothes.
            </p>
          </div>
          )}

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Pickup</h3>
            {cart.address ? (
              <p className="muted" style={{ margin: 0 }}>
                {cart.address.label} — {cart.address.line1}{cart.address.line2 ? `, ${cart.address.line2}` : ''}, {cart.address.city} {cart.address.pincode}
                {cart.pickupAt ? <><br />Scheduled: {new Date(cart.pickupAt).toLocaleDateString()}</> : null}
              </p>
            ) : <p className="muted" style={{ margin: 0 }}>No address set.</p>}
          </div>
        </div>

        <aside className="order-summary-sticky">
          <div className="bill">
            <div className="bill-head">
              <div><h3>Amount to pay</h3><span className="bill-no">{cartCount(cart)} item(s)</span></div>
            </div>
            <div className="perforation" aria-hidden="true" />
            <div className="bill-body">
              {items.map((i) => (
                <div className="bill-line" key={i.id}>
                  <span>{i.name} <span className="qcol">× {i.qty}</span></span>
                  <span>₹{(i.price * i.qty).toFixed(0)}</span>
                </div>
              ))}
              <div className="bill-totals">
                <div className="t"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="t"><span>Tax (18%)</span><span>₹{tax.toFixed(2)}</span></div>
                <div className="grand"><span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}><span>Total</span><span>₹{total.toFixed(2)}</span></span></div>
              </div>
              <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} disabled={busy} onClick={pay}>
                {busy ? (status || 'Processing…') : payMethod === 'payAtPickup' ? 'Place order' : `Pay ₹${total.toFixed(2)}`}
              </button>
              {busy && <div className="loading-wrap" style={{ marginTop: 10 }}><LoadingIcon /><span>{status}</span></div>}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

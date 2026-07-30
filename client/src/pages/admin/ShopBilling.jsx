import { useCallback, useEffect, useMemo, useState } from 'react'
import { Smartphone, CreditCard, QrCode, Monitor, Banknote, Send, CheckCircle2, RotateCcw, Store, Truck, MapPin } from 'lucide-react'
import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import AddressMapPicker, { DEFAULT_CENTER } from '../../components/AddressMapPicker'
import { useForwardGeocode } from '../../hooks/useForwardGeocode'

const TAX_RATE = 0.18
const FALLBACK = [
  { id: 1, name: 'Shirt', service: 'DryClean', pricePerPiece: 40 },
  { id: 2, name: 'T-Shirt', service: 'Wash', pricePerPiece: 25 },
  { id: 3, name: 'Trousers', service: 'DryClean', pricePerPiece: 50 },
  { id: 6, name: 'Saree', service: 'Premium', pricePerPiece: 120 },
  { id: 7, name: 'Suit (2 pc)', service: 'Premium', pricePerPiece: 200 },
  { id: 12, name: 'Iron only', service: 'Iron', pricePerPiece: 10 },
]

const METHODS = [
  { key: 'upi',  label: 'UPI',  Icon: Smartphone },
  { key: 'qr',   label: 'QR',   Icon: QrCode },
  { key: 'card', label: 'Card', Icon: CreditCard },
  { key: 'pos',  label: 'POS',  Icon: Monitor },
  { key: 'cash', label: 'Cash', Icon: Banknote },
]

const DELIVERY_METHODS = [
  { key: 'WalkIn',       label: 'Walk-In',       Icon: Store },
  { key: 'DoorDelivery', label: 'Door Delivery', Icon: Truck },
]

export default function ShopBilling() {
  const { projectName, sendBillEnabled } = useSettings()
  const [catalogue, setCatalogue] = useState([])
  const [qty, setQty] = useState({}) // id -> count
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState('upi')
  const [sendWhatsApp, setSendWhatsApp] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Delivery option: how the *finished* order gets back to the customer.
  const [deliveryMethod, setDeliveryMethod] = useState('WalkIn')
  const [deliveryForm, setDeliveryForm] = useState({ line1: '', line2: '', city: '', state: '', pincode: '' })
  const [deliveryMarker, setDeliveryMarker] = useState(DEFAULT_CENTER)
  const forwardGeocode = useForwardGeocode(useCallback((lat, lng) => setDeliveryMarker({ lat, lng }), []))

  const updateDelivery = (k, v) => {
    const next = { ...deliveryForm, [k]: v }
    setDeliveryForm(next)
    if (next.line1.trim() && next.pincode.trim().length === 6) {
      const query = [next.line1, next.line2, next.city, next.state, next.pincode].filter(Boolean).join(', ')
      forwardGeocode.search(query)
    }
  }

  useEffect(() => {
    api.get('/clothtypes')
      .then(({ data }) => setCatalogue(data))
      .catch(() => setCatalogue(FALLBACK))
  }, [])

  const priceOf = (id) => catalogue.find((c) => c.id === id)?.pricePerPiece || 0
  const nameOf = (id) => catalogue.find((c) => c.id === id)?.name || ''
  const setCount = (id, n) => setQty((q) => { const c = { ...q }; if (n <= 0) delete c[id]; else c[id] = n; return c })

  const lines = useMemo(() => Object.entries(qty).map(([id, n]) => {
    const pid = Number(id)
    return { id: pid, name: nameOf(pid), price: priceOf(pid), qty: n, total: priceOf(pid) * n }
  }), [qty, catalogue])

  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = subtotal + tax
  const itemCount = lines.reduce((n, l) => n + l.qty, 0)

  const deliveryReady = deliveryMethod !== 'DoorDelivery'
    || (deliveryForm.line1.trim() && deliveryForm.city.trim() && deliveryForm.pincode.trim())
  const canSubmit = itemCount > 0 && name.trim() && phone.trim().length >= 6 && deliveryReady && !submitting

  const submit = async () => {
    setError(''); setSubmitting(true)
    try {
      const payload = {
        items: lines.map((l) => ({ clothTypeId: l.id, quantity: l.qty })),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        paymentMethod: method,
        sendWhatsApp: sendBillEnabled && sendWhatsApp,
        notes: null,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'DoorDelivery' ? {
          label: 'Delivery', line1: deliveryForm.line1, line2: deliveryForm.line2,
          city: deliveryForm.city, state: deliveryForm.state, pincode: deliveryForm.pincode,
          latitude: deliveryMarker.lat, longitude: deliveryMarker.lng,
        } : null,
      }
      const { data } = await api.post('/admin/shop-billing', payload)
      setResult(data) // { order, notification }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not generate the invoice. Please try again.')
    } finally { setSubmitting(false) }
  }

  const reset = () => {
    setQty({}); setName(''); setPhone(''); setMethod('upi'); setSendWhatsApp(true); setResult(null); setError('')
    setDeliveryMethod('WalkIn'); setDeliveryForm({ line1: '', line2: '', city: '', state: '', pincode: '' }); setDeliveryMarker(DEFAULT_CENTER)
  }

  // ---- After a bill is generated: show the invoice + delivery status ----
  if (result) {
    const o = result.order
    return (
      <>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <h1 style={{ marginTop: 0 }}>Invoice created</h1>
          <button className="btn btn-primary btn-sm" onClick={reset}><RotateCcw size={16} /> New bill</button>
        </div>

        <div className="alert-success" style={{ marginTop: 8 }}>
          <CheckCircle2 size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Bill delivery: {result.notification}
        </div>

        <div className="bill" style={{ maxWidth: 440, marginTop: 18 }}>
          <div className="bill-head">
            <div><h3>{projectName}</h3><span className="bill-no">{o.orderNumber}</span></div>
            <span className="badge badge-green">{o.paymentStatus}</span>
          </div>
          <div className="perforation" aria-hidden="true" />
          <div className="bill-body">
            <p className="muted" style={{ marginTop: 0, fontSize: '.84rem' }}>
              {o.customerName} · {o.customerPhone} · Counter sale
            </p>
            {o.items.map((i) => (
              <div className="bill-line" key={i.clothTypeId}>
                <span>{i.name} <span className="qcol">× {i.quantity}</span></span>
                <span>₹{i.lineTotal.toFixed(0)}</span>
              </div>
            ))}
            <div className="bill-totals">
              <div className="t"><span>Subtotal</span><span>₹{o.subTotal.toFixed(2)}</span></div>
              <div className="t"><span>Tax</span><span>₹{o.taxAmount.toFixed(2)}</span></div>
              <div className="grand"><span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}><span>Total</span><span>₹{o.total.toFixed(2)}</span></span></div>
            </div>

            {o.pickupAddressText && (
              <p className="muted" style={{ fontSize: '.84rem', marginTop: 14, display: 'flex', gap: 6 }}>
                <MapPin size={15} style={{ flexShrink: 0, marginTop: 2 }} /> Door delivery to: {o.pickupAddressText}
              </p>
            )}
          </div>
        </div>
      </>
    )
  }

  // ---- Billing form ----
  return (
    <>
      <h1 style={{ marginTop: 0, marginBottom: 2 }}>Counter billing</h1>
      <p className="muted" style={{ marginTop: 0 }}>Build a walk-in invoice, take payment and send the bill to WhatsApp.</p>

      {error && <div className="alert-error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="order-layout" style={{ marginTop: 16 }}>
        <div className="stack">
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Items</h3>
            <div className="stack-sm">
              {catalogue.map((c) => {
                const n = qty[c.id] || 0
                return (
                  <div className="order-row" key={c.id} style={{ padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="muted" style={{ fontSize: '.82rem' }}>₹{c.pricePerPiece} / piece · {c.service}</div>
                    </div>
                    <div className="qty" role="group" aria-label={`Quantity for ${c.name}`}>
                      <button onClick={() => setCount(c.id, n - 1)} disabled={n === 0} aria-label="Remove one">−</button>
                      <span>{n}</span>
                      <button onClick={() => setCount(c.id, n + 1)} aria-label="Add one">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Customer</h3>
            <div className="grid-2">
              <div className="field">
                <label>Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Walk-in customer" />
              </div>
              <div className="field">
                <label>Mobile (for WhatsApp bill) *</label>
                <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>

            <label style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink-soft)' }}>Payment method</label>
            <div className="chip-row" style={{ marginTop: 8 }}>
              {METHODS.map(({ key, label, Icon }) => (
                <button key={key} type="button" className={`chip ${method === key ? 'active' : ''}`} onClick={() => setMethod(key)}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            <label style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginTop: 16 }}>
              Delivery option
            </label>
            <p className="muted" style={{ margin: '2px 0 8px', fontSize: '.8rem' }}>
              How should the customer get their cleaned clothes back?
            </p>
            <div className="chip-row">
              {DELIVERY_METHODS.map(({ key, label, Icon }) => (
                <button key={key} type="button" className={`chip ${deliveryMethod === key ? 'active' : ''}`} onClick={() => setDeliveryMethod(key)}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {sendBillEnabled && (
              <label className="row" style={{ marginTop: 16, gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} />
                <span style={{ fontSize: '.9rem' }}>Send bill to customer's WhatsApp (falls back to SMS)</span>
              </label>
            )}
          </div>

          {deliveryMethod === 'DoorDelivery' && (
            <div className="panel">
              <div className="row" style={{ marginBottom: 12 }}>
                <MapPin size={18} color="var(--primary-deep)" />
                <strong style={{ fontFamily: 'var(--font-display)' }}>Delivery address</strong>
              </div>

              <div className="field">
                <label>Flat / House no, building *</label>
                <input className="input" value={deliveryForm.line1} onChange={(e) => updateDelivery('line1', e.target.value)} placeholder="12A, Lake View Apartments" />
              </div>
              <div className="field">
                <label>Street / Area</label>
                <input className="input" value={deliveryForm.line2} onChange={(e) => updateDelivery('line2', e.target.value)} placeholder="RS Puram" />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>City *</label>
                  <input className="input" value={deliveryForm.city} onChange={(e) => updateDelivery('city', e.target.value)} />
                </div>
                <div className="field">
                  <label>State</label>
                  <input className="input" value={deliveryForm.state} onChange={(e) => updateDelivery('state', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Pincode *</label>
                <input className="input" inputMode="numeric" maxLength={6} value={deliveryForm.pincode} onChange={(e) => updateDelivery('pincode', e.target.value)} />
              </div>

              <AddressMapPicker marker={deliveryMarker} onSetPin={setDeliveryMarker} />
              {forwardGeocode.status === 'looking' && (
                <p className="muted" style={{ fontSize: '.8rem', margin: '4px 0 0' }}>Finding this address on the map…</p>
              )}
            </div>
          )}
        </div>

        <aside className="order-summary-sticky">
          <div className="bill">
            <div className="bill-head">
              <div><h3>Invoice</h3><span className="bill-no">{itemCount} item(s)</span></div>
            </div>
            <div className="perforation" aria-hidden="true" />
            <div className="bill-body">
              {lines.length === 0 ? (
                <p style={{ margin: 0 }}>Add items to build the invoice.</p>
              ) : (
                <>
                  {lines.map((l) => (
                    <div className="bill-line" key={l.id}>
                      <span>{l.name} <span className="qcol">× {l.qty}</span></span>
                      <span>₹{l.total.toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="bill-totals">
                    <div className="t"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="t"><span>Tax (18%)</span><span>₹{tax.toFixed(2)}</span></div>
                    <div className="grand"><span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}><span>Total</span><span>₹{total.toFixed(2)}</span></span></div>
                  </div>
                </>
              )}
              <button className="btn btn-accent btn-block" style={{ marginTop: 16 }} disabled={!canSubmit} onClick={submit}>
                {submitting ? 'Generating…' : <><Send size={16} /> Charge &amp; send bill</>}
              </button>
              {itemCount > 0 && (!name.trim() || phone.trim().length < 6) && (
                <p className="muted" style={{ fontSize: '.8rem', marginTop: 8 }}>Enter the customer's name and mobile to continue.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

import LoadingIcon from '../components/LoadingIcon'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronDown, Info, Phone } from 'lucide-react'
import api from '../api/client'
import Icon from '../components/Icon'
import { useSettings } from '../context/SettingsContext'
import { getCart, saveCart, cartSubtotal, cartCount } from '../data/cart'

const TAX_RATE = 0.18
const inr = (n) => '₹' + Number(n).toFixed(0)

export default function ClothSelection() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { pickupSchedulingEnabled, businessPhone } = useSettings()

  const [catalogue, setCatalogue] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState(getCart())
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const activeSlug = params.get('category') || 'all'

  useEffect(() => {
    Promise.all([
      api.get('/clothtypes').then(({ data }) => setCatalogue(data)),
      api.get('/categories').then(({ data }) => setCategories(data)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const setCategory = (slug) => {
    if (slug === 'all') setParams({})
    else setParams({ category: slug })
    setExpanded(null)
  }

  const visible = useMemo(
    () => activeSlug === 'all' ? catalogue : catalogue.filter((c) => c.categorySlug === activeSlug),
    [catalogue, activeSlug]
  )

  const setQty = (item, qty) => {
    const next = structuredClone(cart)
    if (qty <= 0) delete next.items[item.id]
    // Store the effective (discounted) price so the bill matches the server.
    else next.items[item.id] = { id: item.id, name: item.name, price: item.price, qty }
    setCart(next); saveCart(next)
  }

  const qtyOf = (id) => cart.items[id]?.qty || 0
  const subtotal = cartSubtotal(cart)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = subtotal + tax
  const count = cartCount(cart)

  const proceed = () => { saveCart(cart); navigate('/schedule') }

  return (
    <main className="container page">
      <span className="eyebrow">{pickupSchedulingEnabled ? 'Step 1 of 3' : 'Our services'}</span>
      <h1>Select your garments</h1>
      <p>Tap to add items and set quantities. Discounts apply automatically and your bill updates live.</p>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 18 }}>
          <button className={`chip ${activeSlug === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>All</button>
          {categories.map((c) => (
            <button key={c.id} className={`chip ${activeSlug === c.slug ? 'active' : ''}`} onClick={() => setCategory(c.slug)}>
              <Icon name={c.icon} size={15} /> {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="order-layout">
        <div>
          {loading ? (
            <div className="loading-wrap"><LoadingIcon /><span>Loading catalogue…</span></div>
          ) : visible.length === 0 ? (
            <div className="empty">No items in this category yet.</div>
          ) : (
            <div className="cloth-grid">
              {visible.map((item) => {
                const qty = qtyOf(item.id)
                const discounted = item.discountAmount > 0
                const isOpen = expanded === item.id
                return (
                  <div className={`cloth-card ${qty > 0 ? 'selected' : ''}`} key={item.id}>
                    <div className="between">
                      <div className="cloth-icon"><Icon name={item.icon} size={20} /></div>
                      <span className="badge badge-grey cloth-service">{item.service}</span>
                    </div>
                    <div>
                      <div className="cloth-name">{item.name}</div>
                      {item.description && <div className="cloth-desc">{item.description}</div>}
                      <div className="cloth-price">
                        {discounted && <span className="price-was">{inr(item.pricePerPiece)}</span>}
                        <span className="price-now">{inr(item.price)}</span> <small>/ piece</small>
                      </div>
                      {discounted && item.offerTitle && (
                        <span className="badge badge-amber offer-tag">{item.offerTitle}</span>
                      )}
                    </div>

                    {item.overview && (
                      <button className="details-toggle" onClick={() => setExpanded(isOpen ? null : item.id)}>
                        <Info size={13} /> How we clean it
                        <ChevronDown size={13} className={isOpen ? 'chev open' : 'chev'} />
                      </button>
                    )}
                    {isOpen && item.overview && <p className="cloth-overview">{item.overview}</p>}

                    <div className="qty" role="group" aria-label={`Quantity for ${item.name}`}>
                      <button onClick={() => setQty(item, qty - 1)} disabled={qty === 0} aria-label="Remove one">−</button>
                      <span>{qty}</span>
                      <button onClick={() => setQty(item, qty + 1)} aria-label="Add one">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Live bill */}
        <aside className="order-summary-sticky">
          <div className="bill">
            <div className="bill-head">
              <div><h3>Your bill</h3><span className="bill-no">{count} item{count !== 1 ? 's' : ''}</span></div>
            </div>
            <div className="perforation" aria-hidden="true" />
            <div className="bill-body">
              {count === 0 ? (
                <p style={{ margin: 0 }}>No items yet. Add garments to see your total.</p>
              ) : (
                <>
                  {Object.values(cart.items).map((i) => (
                    <div className="bill-line" key={i.id}>
                      <span>{i.name} <span className="qcol">× {i.qty}</span></span>
                      <span>{inr(i.price * i.qty)}</span>
                    </div>
                  ))}
                  <div className="bill-totals">
                    <div className="t"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="t"><span>Tax (18%)</span><span>₹{tax.toFixed(2)}</span></div>
                    <div className="grand"><span style={{ display:'flex', justifyContent:'space-between', width:'100%' }}><span>Total</span><span>₹{total.toFixed(2)}</span></span></div>
                  </div>
                </>
              )}

              {pickupSchedulingEnabled ? (
                <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={count === 0} onClick={proceed}>
                  Continue to schedule <ArrowRight size={16} />
                </button>
              ) : (
                <div className="pickup-off" style={{ marginTop: 16 }}>
                  <p className="alert-info" style={{ margin: 0 }}>
                    <Info size={15} /> Online pickup scheduling is currently unavailable. Build your list and contact us —
                    we&apos;ll arrange your pickup.
                  </p>
                  {businessPhone && (
                    <a className="btn btn-primary btn-block" style={{ marginTop: 10 }} href={`tel:${businessPhone.replace(/\s+/g, '')}`}>
                      <Phone size={16} /> Call to book — {businessPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Tag, Phone, ShieldCheck, Wallet, Truck, Clock } from 'lucide-react'
import api, { imageUrl } from '../api/client'
import Icon from '../components/Icon'
import { useSettings } from '../context/SettingsContext'

const inr = (n) => '₹' + Number(n).toFixed(0)

export default function Home() {
  const { pickupSchedulingEnabled } = useSettings()
  const [home, setHome] = useState(null)

  useEffect(() => {
    api.get('/home').then(({ data }) => setHome(data)).catch(() => setHome(null))
  }, [])

  const offers = home?.offers || []
  const categories = home?.categories || []
  const steps = home?.processSteps || []
  const deals = home?.featuredDiscounts || []
  const headline = home?.headline || 'Fresh clothes, without the trip.'
  const bannerOffers = offers.filter((o) => o.bannerImageUrl)
  const topOffer = offers[0]

  return (
    <main>
      {topOffer && (
        <div className="promo-strip">
          <Tag size={15} />
          <span>
            <strong>{topOffer.title}</strong>
            {topOffer.code ? <> — use code <b>{topOffer.code}</b></> : null}
          </span>
          <Link to="/order">Book now <ArrowRight size={14} /></Link>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <span className="eyebrow">Laundry &amp; dry cleaning, done right</span>
              <h1>{headline}</h1>
              <p className="hero-lead">
                Dry cleaning, laundry, shoes, curtains and more — cleaned by experts.
                {pickupSchedulingEnabled
                  ? ' Book a doorstep pickup and track every step.'
                  : ' Browse our services and prices; we\u2019ll arrange your pickup.'}
              </p>
              <div className="hero-cta">
                <Link to="/order" className="btn btn-primary">Browse services <ArrowRight size={16} /></Link>
                {topOffer?.code && <span className="btn btn-ghost" style={{ pointerEvents: 'none' }}>Code: {topOffer.code}</span>}
              </div>
              <ul className="hero-points" style={{ marginTop: 22 }}>
                <li><Truck size={18} /> Free pickup &amp; drop at your doorstep</li>
                <li><Wallet size={18} /> Transparent per-item pricing + 18% GST</li>
                <li><Clock size={18} /> Standard 48–72 hrs · express options</li>
              </ul>
            </div>

            {/* Offer pamphlet / promo visual */}
            <div>
              {bannerOffers[0] ? (
                <img className="offer-hero-img" src={imageUrl(bannerOffers[0].bannerImageUrl)} alt={bannerOffers[0].title} />
              ) : (
                <div className="ticket-art">
                  <div className="between" style={{ marginBottom: 14 }}>
                    <strong style={{ fontFamily: 'var(--font-display)' }}>Today&apos;s offers</strong>
                    <span className="badge badge-amber">Limited time</span>
                  </div>
                  {offers.slice(0, 3).map((o) => (
                    <div className="bill-line" key={o.id}>
                      <span>{o.title}</span>
                      <span>{o.discountType === 'Percentage' ? `${o.discountValue}%` : inr(o.discountValue)}</span>
                    </div>
                  ))}
                  {offers.length === 0 && <p className="muted" style={{ margin: 0 }}>New offers coming soon.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container page" style={{ paddingBottom: 0 }}>
          <div className="center" style={{ marginBottom: 22 }}>
            <span className="eyebrow">What we clean</span>
            <h2>Browse by category</h2>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link className="cat-card" to={`/order?category=${c.slug}`} key={c.id}>
                {c.imageUrl
                  ? <img src={imageUrl(c.imageUrl)} alt={c.name} className="cat-img" />
                  : <div className="cat-icon"><Icon name={c.icon} size={24} /></div>}
                <div className="cat-name">{c.name}</div>
                <div className="muted" style={{ fontSize: '.76rem' }}>{c.itemCount} item{c.itemCount !== 1 ? 's' : ''}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured discounts */}
      {deals.length > 0 && (
        <section className="container page" style={{ paddingBottom: 0 }}>
          <div className="between" style={{ marginBottom: 18, alignItems: 'flex-end' }}>
            <div>
              <span className="eyebrow">Deals</span>
              <h2 style={{ margin: 0 }}>Discounted right now</h2>
            </div>
            <Link to="/order" className="btn btn-ghost btn-sm">See all <ArrowRight size={14} /></Link>
          </div>
          <div className="deal-grid">
            {deals.map((d) => (
              <div className="deal-card" key={d.id}>
                <div className="deal-icon"><Icon name={d.icon} size={20} /></div>
                <div className="deal-name">{d.name}</div>
                <div className="deal-price">
                  <span className="price-was">{inr(d.pricePerPiece)}</span>
                  <span className="price-now">{inr(d.price)}</span>
                </div>
                {d.offerTitle && <span className="badge badge-amber" style={{ marginTop: 6 }}>{d.offerTitle}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      {steps.length > 0 && (
        <section className="container page">
          <div className="center" style={{ marginBottom: 26 }}>
            <span className="eyebrow">How it works</span>
            <h2>Fresh in four steps</h2>
          </div>
          <div className="steps">
            {steps.map((s) => (
              <div className="step" key={s.stepNumber}>
                <div className="step-badge"><Icon name={s.icon} size={22} /><span className="step-num">{s.stepNumber}</span></div>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 30 }}>
            <Link to="/order" className="btn btn-accent">Start your order <ArrowRight size={16} /></Link>
          </div>
        </section>
      )}

      {/* Promise */}
      <section className="container page" style={{ paddingTop: 0 }}>
        <div className="promise-grid">
          {[
            { Icon: Truck, t: 'Free pick & drop', d: 'Collection and delivery at your doorstep.' },
            { Icon: Wallet, t: 'Fair pricing', d: 'What you see is what you pay — no surprises.' },
            { Icon: ShieldCheck, t: 'Quality assured', d: 'Fabric-safe cleaning by trained staff.' },
            { Icon: Clock, t: 'On time', d: 'Standard 48–72 hrs, express when you need it.' },
          ].map((p, i) => (
            <div className="promise" key={i}>
              <div className="promise-icon"><p.Icon size={20} /></div>
              <div>
                <strong style={{ fontFamily: 'var(--font-display)' }}>{p.t}</strong>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: '.86rem' }}>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

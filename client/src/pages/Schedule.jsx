import LoadingIcon from '../components/LoadingIcon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { MapPin, ArrowRight, Info } from 'lucide-react'
import { getCart, saveCart, cartCount } from '../data/cart'
import { useSettings } from '../context/SettingsContext'

const DEFAULT_CENTER = { lat: 11.0168, lng: 76.9558 } // Coimbatore; change to your city

export default function Schedule() {
  const navigate = useNavigate()
  const { pickupSchedulingEnabled, loading: settingsLoading, googleMapsApiKey } = useSettings()
  const cart = getCart()
  const [marker, setMarker] = useState(cart.address?.lat ? { lat: cart.address.lat, lng: cart.address.lng } : DEFAULT_CENTER)
  const [form, setForm] = useState(cart.address || {
    label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '',
  })
  const [pickupAt, setPickupAt] = useState(cart.pickupAt || '')

  // The Maps key is admin-editable (Admin → API Keys); only load the script
  // once we actually have one.
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey, id: 'gmaps' })
  const mapAvailable = !!googleMapsApiKey

  const onMapClick = useCallback((e) => {
    setMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() })
  }, [])

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const canContinue = form.line1.trim() && form.city.trim() && form.pincode.trim() && pickupAt

  const proceed = () => {
    const next = getCart()
    next.address = { ...form, lat: marker.lat, lng: marker.lng }
    next.pickupAt = pickupAt
    saveCart(next)
    navigate('/payment')
  }

  const center = useMemo(() => marker, [marker])

  // If the admin has turned self-service scheduling off, this step isn't available.
  useEffect(() => {
    if (!settingsLoading && !pickupSchedulingEnabled) navigate('/order')
  }, [settingsLoading, pickupSchedulingEnabled, navigate])

  if (settingsLoading) return <div className="loading-wrap"><LoadingIcon /></div>
  if (!pickupSchedulingEnabled) return null
  if (cartCount(cart) === 0) { navigate('/order'); return null }

  return (
    <main className="container page">
      <span className="eyebrow">Step 2 of 3</span>
      <h1>Schedule your pickup</h1>
      <p>Drop a pin where we should collect your clothes, then pick a time.</p>

      <div className="order-layout">
        <div className="stack">
          <div className="panel">
            <div className="row" style={{ marginBottom: 12 }}>
              <MapPin size={18} color="var(--primary-deep)" />
              <strong style={{ fontFamily: 'var(--font-display)' }}>Pickup location</strong>
            </div>

            {mapAvailable && isLoaded ? (
              <GoogleMap
                mapContainerClassName="map-box"
                center={center}
                zoom={14}
                onClick={onMapClick}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
              >
                <Marker position={marker} draggable onDragEnd={onMapClick} />
              </GoogleMap>
            ) : (
              <div className="map-box" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
                <div>
                  <Info size={22} color="var(--ink-soft)" />
                  <p style={{ margin: '8px 0 0', fontSize: '.88rem' }}>
                    Add a Google Maps API key under Admin → API Keys to enable the
                    interactive map. You can still enter the address below.
                  </p>
                </div>
              </div>
            )}
            {mapAvailable && (
              <p className="muted" style={{ fontSize: '.8rem', margin: '8px 0 0' }}>
                Tap the map or drag the pin to adjust. Lat {marker.lat.toFixed(4)}, Lng {marker.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div className="panel">
            <div className="field">
              <label>Address label</label>
              <select className="select" value={form.label} onChange={(e) => update('label', e.target.value)}>
                <option>Home</option><option>Work</option><option>Other</option>
              </select>
            </div>
            <div className="field">
              <label>Flat / House no, building *</label>
              <input className="input" value={form.line1} onChange={(e) => update('line1', e.target.value)} placeholder="12A, Lake View Apartments" />
            </div>
            <div className="field">
              <label>Street / Area</label>
              <input className="input" value={form.line2} onChange={(e) => update('line2', e.target.value)} placeholder="RS Puram" />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>City *</label>
                <input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} />
              </div>
              <div className="field">
                <label>State</label>
                <input className="input" value={form.state} onChange={(e) => update('state', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Pincode *</label>
              <input className="input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
            </div>
          </div>
        </div>

        <aside className="order-summary-sticky">
          <div className="panel">
            <h3>Pickup time</h3>
            <div className="field">
              <label>When should we collect?</label>
              <input className="input" type="datetime-local" value={pickupAt} onChange={(e) => setPickupAt(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" disabled={!canContinue} onClick={proceed}>
              Continue to payment <ArrowRight size={16} />
            </button>
            {!canContinue && <p className="muted" style={{ fontSize: '.8rem', marginTop: 8 }}>Fill the required fields (*) and a pickup time to continue.</p>}
          </div>
        </aside>
      </div>
    </main>
  )
}

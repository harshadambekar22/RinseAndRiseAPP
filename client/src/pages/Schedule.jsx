import LoadingIcon from '../components/LoadingIcon'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapPin, ArrowRight, Locate } from 'lucide-react'
import { getCart, saveCart, cartCount } from '../data/cart'
import { useSettings } from '../context/SettingsContext'

// Leaflet's default marker icon references image paths that don't resolve
// once Vite fingerprints/bundles them — point it at the imported assets instead.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const DEFAULT_CENTER = { lat: 11.0168, lng: 76.9558 } // Coimbatore; change to your city

// react-leaflet only reads MapContainer's `center` prop on first mount, so
// panning after that (pin drop, "use my location") has to go through the
// underlying Leaflet map instance directly.
function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom()) }, [center, map])
  return null
}

function ClickHandler({ onSet }) {
  useMapEvents({ click(e) { onSet(e.latlng.lat, e.latlng.lng) } })
  return null
}

export default function Schedule() {
  const navigate = useNavigate()
  const { pickupSchedulingEnabled, loading: settingsLoading } = useSettings()
  const cart = getCart()
  const [marker, setMarker] = useState(cart.address?.lat ? { lat: cart.address.lat, lng: cart.address.lng } : DEFAULT_CENTER)
  const [form, setForm] = useState(cart.address || {
    label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '',
  })
  const [pickupAt, setPickupAt] = useState(cart.pickupAt || '')
  const [locating, setLocating] = useState(false)
  const [geocodeStatus, setGeocodeStatus] = useState(null) // null | 'looking' | 'failed' | 'empty'
  const geocodeSeq = useRef(0)

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Best-effort fill of city/state/pincode from the dropped pin via OSM's
  // free Nominatim reverse-geocoder. Never blocks the flow — the fields
  // stay manually editable whether this succeeds, fails, or is slow. Failures
  // are logged (not just swallowed) since a blocked/ad-blocked request looks
  // identical to "still loading" otherwise.
  const reverseGeocode = useCallback(async (lat, lng) => {
    const seq = ++geocodeSeq.current
    setGeocodeStatus('looking')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
      if (seq !== geocodeSeq.current) return // a newer pin drop superseded this response
      if (!res.ok) {
        console.warn('[reverseGeocode] Nominatim returned', res.status, res.statusText)
        setGeocodeStatus('failed')
        return
      }
      const data = await res.json()
      if (seq !== geocodeSeq.current) return
      const a = data.address || {}
      if (!a.postcode && !a.city && !a.town && !a.village) {
        console.warn('[reverseGeocode] no usable address in Nominatim response', data)
        setGeocodeStatus('empty')
        return
      }
      setForm((f) => ({
        ...f,
        // Not every OSM location has all of these tagged — widen the net
        // across the ones Nominatim commonly returns instead of just road+suburb.
        line2: f.line2 || [a.road, a.neighbourhood || a.suburb || a.quarter || a.hamlet].filter(Boolean).join(', '),
        city: a.city || a.town || a.village || a.county || f.city,
        state: a.state || f.state,
        pincode: a.postcode || f.pincode,
      }))
      setGeocodeStatus(null)
    } catch (err) {
      // Network error, CORS block, ad-blocker, offline, etc.
      if (seq !== geocodeSeq.current) return
      console.warn('[reverseGeocode] request failed:', err)
      setGeocodeStatus('failed')
    }
  }, [])

  const setPin = useCallback((lat, lng) => {
    setMarker({ lat, lng })
    reverseGeocode(lat, lng)
  }, [reverseGeocode])

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPin(pos.coords.latitude, pos.coords.longitude); setLocating(false) },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const canContinue = form.line1.trim() && form.city.trim() && form.pincode.trim() && pickupAt

  const proceed = () => {
    const next = getCart()
    next.address = { ...form, lat: marker.lat, lng: marker.lng }
    next.pickupAt = pickupAt
    saveCart(next)
    navigate('/payment')
  }

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
            <div className="between" style={{ marginBottom: 12 }}>
              <div className="row">
                <MapPin size={18} color="var(--primary-deep)" />
                <strong style={{ fontFamily: 'var(--font-display)' }}>Pickup location</strong>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation} disabled={locating}>
                <Locate size={14} /> {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>

            <MapContainer center={marker} zoom={14} scrollWheelZoom className="map-box">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={marker}
                draggable
                eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setPin(p.lat, p.lng) } }}
              />
              <ClickHandler onSet={setPin} />
              <RecenterMap center={marker} />
            </MapContainer>

            <p className="muted" style={{ fontSize: '.8rem', margin: '8px 0 0' }}>
              Tap the map or drag the pin to adjust. Lat {marker.lat.toFixed(4)}, Lng {marker.lng.toFixed(4)}
            </p>
            {geocodeStatus === 'looking' && (
              <p className="muted" style={{ fontSize: '.8rem', margin: '4px 0 0' }}>Looking up address…</p>
            )}
            {(geocodeStatus === 'failed' || geocodeStatus === 'empty') && (
              <p className="muted" style={{ fontSize: '.8rem', margin: '4px 0 0' }}>
                Couldn't auto-fill the address for this pin — please fill it in below.
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

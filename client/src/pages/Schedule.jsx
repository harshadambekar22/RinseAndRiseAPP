import LoadingIcon from '../components/LoadingIcon'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapPin, ArrowRight, ArrowLeft, Locate, Plus, Trash2 } from 'lucide-react'
import { getCart, saveCart, cartCount } from '../data/cart'
import { useSettings } from '../context/SettingsContext'
import api from '../api/client'

// Leaflet's default marker icon references image paths that don't resolve
// once Vite fingerprints/bundles them — point it at the imported assets instead.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const DEFAULT_CENTER = { lat: 11.0168, lng: 76.9558 } // Coimbatore; change to your city

// YYYY-MM-DD in the browser's local timezone — Date#toISOString() is UTC
// and can land on the wrong day, which would let "today" reject itself
// near midnight in timezones ahead of UTC.
const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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
  const todayStr = toDateStr(new Date())
  // Drop a stale date leftover from an earlier visit to this page (the cart
  // persists across sessions) if it's since fallen into the past.
  const [pickupAt, setPickupAt] = useState(cart.pickupAt && cart.pickupAt >= todayStr ? cart.pickupAt : '')
  const [locating, setLocating] = useState(false)
  const [geocodeStatus, setGeocodeStatus] = useState(null) // null | 'looking' | 'failed' | 'empty'
  const geocodeSeq = useRef(0)

  // Saved address book. null = still loading. addingNew toggles between
  // picking a saved card and the map/form for a brand-new one — they're
  // mutually exclusive.
  const [savedAddresses, setSavedAddresses] = useState(null)
  const [selectedAddressId, setSelectedAddressId] = useState(cart.address?.addressId ?? null)
  const [addingNew, setAddingNew] = useState(!!cart.address && !cart.address.addressId)

  useEffect(() => {
    let cancelled = false
    api.get('/addresses').then(({ data }) => {
      if (cancelled) return
      setSavedAddresses(data)
      // The previously-picked saved address may have since been deleted.
      if (cart.address?.addressId && !data.some((a) => a.id === cart.address.addressId)) {
        setSelectedAddressId(null)
      }
      // First-time customer with nothing saved yet — skip straight to the form.
      if (data.length === 0 && !cart.address) setAddingNew(true)
    }).catch(() => setSavedAddresses([]))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteAddress = async (id) => {
    if (!confirm('Delete this address?')) return
    await api.delete(`/addresses/${id}`)
    setSavedAddresses((list) => list.filter((a) => a.id !== id))
    if (selectedAddressId === id) setSelectedAddressId(null)
  }

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
      // Not every OSM location has a road/suburb tagged (rural roads, small
      // residential lanes, etc.) — widen the net across every locality-ish
      // tag Nominatim commonly returns, so "area" is much less likely to
      // come back blank. Last resort: reuse the first chunk of display_name.
      const road = a.road || a.pedestrian || a.footway || a.residential
      const locality = a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.village
      let area = [road, locality].filter(Boolean).join(', ')
      if (!area && data.display_name) area = data.display_name.split(',')[0].trim()

      setForm((f) => ({
        ...f,
        // Prefer the freshly geocoded value, same as city/state/pincode below
        // — otherwise, once line2 is filled once, moving the pin or clicking
        // "Use my location" again can never update it again.
        line2: area || f.line2,
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

  const canContinue = addingNew
    ? form.line1.trim() && form.city.trim() && form.pincode.trim() && pickupAt
    : selectedAddressId != null && pickupAt

  const proceed = () => {
    const next = getCart()
    if (addingNew) {
      next.address = { ...form, lat: marker.lat, lng: marker.lng }
    } else {
      const a = savedAddresses.find((x) => x.id === selectedAddressId)
      next.address = {
        addressId: a.id, label: a.label, line1: a.line1, line2: a.line2,
        city: a.city, state: a.state, pincode: a.pincode, lat: a.latitude, lng: a.longitude,
      }
    }
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
      <p>Choose where we should collect your clothes, then pick a date.</p>

      <div className="order-layout">
        <div className="stack">
          {!addingNew && (
            <div className="panel">
              <div className="row" style={{ marginBottom: 12 }}>
                <MapPin size={18} color="var(--primary-deep)" />
                <strong style={{ fontFamily: 'var(--font-display)' }}>Pickup address</strong>
              </div>
              {savedAddresses === null ? (
                <div className="loading-wrap"><LoadingIcon /></div>
              ) : (
                <div className="address-grid">
                  {savedAddresses.map((a) => (
                    <div
                      key={a.id}
                      className={`address-card ${selectedAddressId === a.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedAddressId(a.id); setAddingNew(false) }}
                    >
                      <button
                        type="button" className="btn btn-ghost btn-sm danger address-card-delete"
                        onClick={(e) => { e.stopPropagation(); deleteAddress(a.id) }}
                        aria-label={`Delete ${a.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="address-card-label">{a.label}</div>
                      <div className="address-card-text">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}
                      </div>
                    </div>
                  ))}
                  <div className="address-card add-new" onClick={() => { setAddingNew(true); setSelectedAddressId(null) }}>
                    <Plus size={18} /> Add new address
                  </div>
                </div>
              )}
            </div>
          )}

          {addingNew && (
          <>
          {savedAddresses && savedAddresses.length > 0 && (
            <button
              type="button" className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setAddingNew(false)}
            >
              <ArrowLeft size={14} /> Use a saved address
            </button>
          )}
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
          </>
          )}
        </div>

        <aside className="order-summary-sticky">
          <div className="panel">
            <h3>Pickup date</h3>
            <div className="field">
              <label>When should we collect?</label>
              <input className="input" type="date" min={todayStr} value={pickupAt}
                onChange={(e) => setPickupAt(e.target.value)} />
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

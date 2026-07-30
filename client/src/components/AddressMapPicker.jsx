import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

// Leaflet's default marker icon references image paths that don't resolve
// once Vite fingerprints/bundles them — point it at the imported assets instead.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

export const DEFAULT_CENTER = { lat: 11.0168, lng: 76.9558 } // Coimbatore; change to your city

// react-leaflet only reads MapContainer's `center` prop on first mount, so
// panning after that (pin drop, forward-geocode result, "use my location")
// has to go through the underlying Leaflet map instance directly.
function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, map.getZoom()) }, [center, map])
  return null
}

function ClickHandler({ onSet }) {
  useMapEvents({ click(e) { onSet(e.latlng.lat, e.latlng.lng) } })
  return null
}

// A reusable Leaflet pin picker: click or drag to place the marker, and it
// re-centers whenever `marker` changes (e.g. a forward-geocode result moved
// it programmatically). Callers own everything about *why* the pin moved —
// this component only renders the widget and reports drag/click events.
export default function AddressMapPicker({ marker, onSetPin }) {
  return (
    <>
      <MapContainer center={marker} zoom={14} scrollWheelZoom className="map-box">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={marker}
          draggable
          eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onSetPin(p.lat, p.lng) } }}
        />
        <ClickHandler onSet={onSetPin} />
        <RecenterMap center={marker} />
      </MapContainer>
      <p className="muted" style={{ fontSize: '.8rem', margin: '8px 0 0' }}>
        Tap the map or drag the pin to adjust. Lat {marker.lat.toFixed(4)}, Lng {marker.lng.toFixed(4)}
      </p>
    </>
  )
}

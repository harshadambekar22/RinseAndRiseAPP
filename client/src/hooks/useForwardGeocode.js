import { useCallback, useEffect, useRef, useState } from 'react'

// Debounced forward geocoding (address text -> lat/lng) via OSM's free
// Nominatim /search endpoint. Mirrors the reverse-geocode error handling used
// elsewhere in the app: sequence-numbered responses so a stale lookup can
// never clobber a newer one, never throws, never blocks the caller's form.
export function useForwardGeocode(onFound, { debounceMs = 600 } = {}) {
  const [status, setStatus] = useState('idle') // idle | looking | found | notfound | failed
  const seq = useRef(0)
  const timer = useRef(null)

  const search = useCallback((query) => {
    clearTimeout(timer.current)
    if (!query || query.trim().length < 4) { setStatus('idle'); return }
    timer.current = setTimeout(async () => {
      const mySeq = ++seq.current
      setStatus('looking')
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`)
        if (mySeq !== seq.current) return // a newer search superseded this response
        if (!res.ok) {
          console.warn('[forwardGeocode] Nominatim returned', res.status, res.statusText)
          setStatus('failed')
          return
        }
        const data = await res.json()
        if (mySeq !== seq.current) return
        if (!data.length) { setStatus('notfound'); return }
        setStatus('found')
        onFound(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name)
      } catch (err) {
        if (mySeq !== seq.current) return
        console.warn('[forwardGeocode] request failed:', err)
        setStatus('failed')
      }
    }, debounceMs)
  }, [onFound, debounceMs])

  useEffect(() => () => clearTimeout(timer.current), [])
  return { status, search }
}

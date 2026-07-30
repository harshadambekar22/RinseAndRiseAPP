import { useCallback, useEffect, useRef, useState } from 'react'

// Debounced forward geocoding (address parts -> lat/lng) via OSM's free
// Nominatim /search endpoint. Three-tier fallback chain, each tier only
// tried if the previous one came back empty:
//
//  1. Structured search with the full street (flat/building + area) — nails
//     well-known named roads exactly, but Nominatim's structured `street`
//     param needs an EXACT housenumber+streetname match against OSM's addr:*
//     tags and does NOT degrade gracefully, so a flat/building name that
//     isn't in OSM's data (almost always the case) makes the whole query
//     return zero results.
//  2. Free-text search with just the locality/area name (not the flat/
//     building name) plus city/state/pincode — Nominatim's free-text engine
//     tolerates fuzzy/partial matches far better than the structured API, so
//     this correctly differentiates between areas that share one pincode.
//  3. Structured search with the pincode ALONE (deliberately without city).
//     Combining postalcode with city makes Nominatim prefer the city-level
//     match and silently discard the pincode — every address in a city then
//     collapses onto the exact same city-centre point regardless of which
//     pincode was actually typed, which looks exactly like "the pin isn't
//     updating" even though a real request did fire and "succeed" each time.
//
// Mirrors the reverse-geocode error handling used elsewhere in the app:
// sequence-numbered responses so a stale lookup can never clobber a newer
// one, never throws, never blocks the caller's form. Also guards against a
// hung request (no response, no error) leaving the caller stuck on
// "looking" forever by aborting after a fixed timeout.
export function useForwardGeocode(onFound, { debounceMs = 600, timeoutMs = 8000 } = {}) {
  const [status, setStatus] = useState('idle') // idle | looking | found | notfound | failed
  const seq = useRef(0)
  const timer = useRef(null)

  const search = useCallback((address) => {
    clearTimeout(timer.current)
    const street = (address?.street || '').trim()
    const area = (address?.area || '').trim()
    const city = (address?.city || '').trim()
    const state = (address?.state || '').trim()
    const postalcode = (address?.postalcode || '').trim()

    // Need at least a pincode, or a street+city pair, to bother searching —
    // anything less is too ambiguous to be worth a request.
    if (!postalcode && !(street && city)) { setStatus('idle'); return }

    timer.current = setTimeout(async () => {
      const mySeq = ++seq.current
      setStatus('looking')

      const controller = new AbortController()
      const abortTimer = setTimeout(() => controller.abort(), timeoutMs)
      let anyHttpError = false

      const runStructured = async (opts) => {
        const params = new URLSearchParams({ format: 'jsonv2', limit: '1', country: 'India' })
        if (opts.street) params.set('street', opts.street)
        if (opts.city) params.set('city', opts.city)
        if (opts.state) params.set('state', opts.state)
        if (opts.postalcode) params.set('postalcode', opts.postalcode)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) { anyHttpError = true; return [] }
        return res.json()
      }
      const runFreeText = async (q) => {
        const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) { anyHttpError = true; return [] }
        return res.json()
      }

      try {
        let data = []

        if (street && city) {
          data = await runStructured({ street, city, state, postalcode })
          if (mySeq !== seq.current) return
        }

        if (data.length === 0 && area && city) {
          data = await runFreeText([area, city, state, postalcode].filter(Boolean).join(', '))
          if (mySeq !== seq.current) return
        }

        if (data.length === 0 && postalcode) {
          data = await runStructured({ postalcode })
          if (mySeq !== seq.current) return
        }

        if (!data.length) {
          setStatus(anyHttpError ? 'failed' : 'notfound')
          return
        }
        setStatus('found')
        onFound(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name)
      } catch (err) {
        if (mySeq !== seq.current) return
        console.warn('[forwardGeocode] request failed:', err)
        setStatus('failed')
      } finally {
        clearTimeout(abortTimer)
      }
    }, debounceMs)
  }, [onFound, debounceMs, timeoutMs])

  useEffect(() => () => clearTimeout(timer.current), [])
  return { status, search }
}

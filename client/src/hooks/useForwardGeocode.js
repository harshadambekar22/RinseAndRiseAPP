import { useCallback, useEffect, useRef, useState } from 'react'

// Debounced forward geocoding (address parts -> lat/lng) via OSM's free
// Nominatim /search endpoint, using its *structured* query params (street/
// city/state/postalcode) rather than one free-text string.
//
// Nominatim's structured `street` param needs an exact housenumber+streetname
// match against OSM's addr:* tags — unlike free-text search it does NOT
// degrade gracefully, so ANY street value that doesn't match exactly (a flat/
// building name, or even a real locality name like "RS Puram" that isn't
// tagged as a formal street) makes the *whole* query return zero results,
// even though city+postalcode alone would have matched fine. So: try with
// street first (it nails well-known named roads), and if that comes back
// empty, silently retry without it — city+postalcode reliably resolves to a
// usable area-level pin, which the caller's draggable marker can then be
// fine-tuned from.
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

      const query = (withStreet) => {
        const params = new URLSearchParams({ format: 'jsonv2', limit: '1', country: 'India' })
        if (withStreet && street) params.set('street', street)
        if (city) params.set('city', city)
        if (state) params.set('state', state)
        if (postalcode) params.set('postalcode', postalcode)
        return fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { signal: controller.signal })
      }

      try {
        let res = await query(true)
        if (mySeq !== seq.current) return // a newer search superseded this response
        let data = res.ok ? await res.json() : []

        // A street value is either exact or the whole query fails — retry
        // without it so city+postalcode can still land a usable area pin.
        if (data.length === 0 && street) {
          res = await query(false)
          if (mySeq !== seq.current) return
          data = res.ok ? await res.json() : []
        }

        if (!res.ok) {
          console.warn('[forwardGeocode] Nominatim returned', res.status, res.statusText)
          setStatus('failed')
          return
        }
        if (!data.length) { setStatus('notfound'); return }
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

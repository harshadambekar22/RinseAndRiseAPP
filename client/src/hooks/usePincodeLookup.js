import { useCallback, useEffect, useRef, useState } from 'react'

// Looks up city/state for a 6-digit Indian pincode via India Post's free,
// no-key-required PIN code API (https://api.postalpincode.in) — official
// postal administrative data, far more reliable for city/state names than
// the Nominatim map geocoder, which is tuned for coordinates, not postal
// boundaries. Never throws, never blocks the caller's form.
export function usePincodeLookup(onFound, { debounceMs = 300 } = {}) {
  const [status, setStatus] = useState('idle') // idle | looking | found | notfound | failed
  const seq = useRef(0)
  const timer = useRef(null)

  const lookup = useCallback((pincode) => {
    clearTimeout(timer.current)
    const pin = (pincode || '').trim()
    if (pin.length !== 6) { setStatus('idle'); return }

    timer.current = setTimeout(async () => {
      const mySeq = ++seq.current
      setStatus('looking')
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
        if (mySeq !== seq.current) return // a newer lookup superseded this response
        if (!res.ok) {
          console.warn('[pincodeLookup] API returned', res.status, res.statusText)
          setStatus('failed')
          return
        }
        const data = await res.json()
        if (mySeq !== seq.current) return
        const office = data?.[0]?.Status === 'Success' ? data[0].PostOffice?.[0] : null
        if (!office) { setStatus('notfound'); return }
        setStatus('found')
        onFound({ city: office.District, state: office.State })
      } catch (err) {
        if (mySeq !== seq.current) return
        console.warn('[pincodeLookup] request failed:', err)
        setStatus('failed')
      }
    }, debounceMs)
  }, [onFound, debounceMs])

  useEffect(() => () => clearTimeout(timer.current), [])
  return { status, lookup }
}

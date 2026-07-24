import { useEffect, useRef, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'

// GoogleLogin's `width` prop must be a concrete pixel number — it can't take
// a percentage. A hardcoded value (e.g. 320) overflows the auth card's
// padding on narrow phones. Instead, measure the wrapper and keep the button
// sized to whatever room is actually available, updating on resize/rotate.
export default function GoogleLoginButton(props) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(280)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = Math.floor(el.clientWidth)
      if (w > 0) setWidth(Math.max(200, Math.min(400, w)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <GoogleLogin {...props} width={String(width)} />
    </div>
  )
}

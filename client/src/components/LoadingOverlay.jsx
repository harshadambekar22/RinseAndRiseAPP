import { createPortal } from 'react-dom'
import LoadingIcon from './LoadingIcon'

// Centers the loading icon over a blurred full-screen backdrop, for short
// blocking actions (sign-in, sign-out) where an inline icon would be missed.
// Rendered via a portal into document.body so it always covers the full
// viewport, even when mounted under an ancestor (e.g. the header) that has
// its own backdrop-filter/transform — those create a new containing block
// that would otherwise clip a plain position:fixed element to that ancestor.
export default function LoadingOverlay({ label }) {
  return createPortal(
    <div className="loading-overlay">
      <div className="loading-overlay-panel">
        <LoadingIcon size={64} />
        {label && <span>{label}</span>}
      </div>
    </div>,
    document.body
  )
}

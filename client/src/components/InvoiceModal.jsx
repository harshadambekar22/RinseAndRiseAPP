import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Invoice from './Invoice'

// Shows a single order's invoice in a centered modal. Rendered via a portal
// so it isn't clipped by any scrolling/positioned ancestor (see LoadingOverlay
// for the same reasoning).
export default function InvoiceModal({ order, onClose }) {
  if (!order) return null
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-close-row">
          <button onClick={onClose} aria-label="Close invoice"><X size={16} /></button>
        </div>
        <Invoice order={order} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}

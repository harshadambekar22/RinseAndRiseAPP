import { useRef, useState } from 'react'
import { Mail, Phone, Download } from 'lucide-react'
import Icon from './Icon'
import { imageUrl } from '../api/client'
import { useSettings } from '../context/SettingsContext'

const label = (s) => (s || '').replace(/([a-z])([A-Z])/g, '$1 $2')

// Renders one order as a branded invoice (letterhead, line items, tax,
// discount and total) and offers a client-side "Download as PDF" button.
// Used both from the admin Invoices tab and the customer's My Orders page,
// so the two always look identical.
export default function Invoice({ order, onClose }) {
  const { projectName, projectLogo, projectIcon, contactEmail, contactPhone, businessPhone } = useSettings()
  const printRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const phone = contactPhone || businessPhone

  const download = async () => {
    setDownloading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const node = printRef.current
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')

      // Fit the captured canvas onto A4, preserving aspect ratio.
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight)
        heightLeft -= pageHeight
      }
      pdf.save(`Invoice-${order.orderNumber}.pdf`)
    } catch {
      // If the PDF libraries aren't installed yet (npm install pending) or
      // the capture fails for any reason, fall back to the browser's own
      // print dialog, which can still "Save as PDF".
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bill invoice-print" ref={printRef}>
      <div className="invoice-letterhead">
        <span className="mark">
          {projectLogo ? <img src={imageUrl(projectLogo)} alt="" /> : <Icon name={projectIcon} size={20} />}
        </span>
        <div>
          <h2>{projectName}</h2>
          <div className="contact">
            {contactEmail && <span><Mail size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{contactEmail}</span>}
            {phone && <span><Phone size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />{phone}</span>}
          </div>
        </div>
      </div>

      <div className="invoice-meta">
        <div>
          <div className="k">Invoice / Order</div>
          <div className="v">{order.orderNumber}</div>
        </div>
        <div>
          <div className="k">Date</div>
          <div className="v">{new Date(order.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <div className="k">Customer</div>
          <div className="v">{order.customerName}</div>
        </div>
        <div>
          <div className="k">Mobile</div>
          <div className="v">{order.customerPhone}</div>
        </div>
        <div>
          <div className="k">Payment</div>
          <div className="v">{order.paymentStatus}</div>
        </div>
        <div>
          <div className="k">Status</div>
          <div className="v">{label(order.status)}</div>
        </div>
      </div>

      <div className="bill-body">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Price</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.clothTypeId}>
                <td>{i.name}</td>
                <td className="num">{i.quantity}</td>
                <td className="num">
                  {i.lineDiscount > 0 && <span className="invoice-orig">₹{i.originalUnitPrice.toFixed(2)}</span>}
                  ₹{i.unitPrice.toFixed(2)}
                </td>
                <td className="num">₹{i.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-totals">
          <div className="t"><span>Subtotal</span><span>₹{order.subTotal.toFixed(2)}</span></div>
          {order.discountTotal > 0 && (
            <div className="t"><span>Discount</span><span>−₹{order.discountTotal.toFixed(2)}</span></div>
          )}
          <div className="t"><span>Tax</span><span>₹{order.taxAmount.toFixed(2)}</span></div>
          {order.deliveryFee > 0 && (
            <div className="t"><span>Delivery</span><span>₹{order.deliveryFee.toFixed(2)}</span></div>
          )}
          <div className="grand">
            <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>Total</span><span>₹{order.total.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="invoice-actions">
        <button className="btn btn-primary btn-sm" onClick={download} disabled={downloading}>
          <Download size={15} /> {downloading ? 'Preparing…' : 'Download as PDF'}
        </button>
        {onClose && <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>}
      </div>
    </div>
  )
}

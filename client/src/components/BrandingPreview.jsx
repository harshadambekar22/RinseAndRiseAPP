import { Mail, Phone, MapPin } from 'lucide-react'
import Icon from './Icon'
import { imageUrl } from '../api/client'

// A mock of the navbar/hero/footer chrome, fed straight from the admin's
// in-progress (unsaved) form state. Lets the admin see how branding, theme,
// contact details, and the pickup-scheduling toggle will look on the real
// site without saving, refreshing, or signing out to check as a visitor.
function Mark({ logo, icon, size, iconSize }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', flexShrink: 0,
      display: 'grid', placeItems: 'center',
      background: 'linear-gradient(135deg, var(--primary), var(--primary-deep))', color: '#fff',
    }}>
      {logo
        ? <img src={imageUrl(logo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <Icon name={icon} size={iconSize} />}
    </span>
  )
}

export default function BrandingPreview({ form }) {
  const {
    projectName, projectDescription, projectIcon, projectLogo,
    businessPhone, contactEmail, contactPhone, contactAddress,
    pickupSchedulingEnabled,
  } = form
  const hasContact = contactEmail || contactPhone || contactAddress

  return (
    <div className="panel" style={{ position: 'sticky', top: 16 }}>
      <strong style={{ fontFamily: 'var(--font-display)' }}>Live preview</strong>
      <p className="muted" style={{ margin: '3px 0 14px', fontSize: '.85rem' }}>
        Updates as you type or pick a color — nothing changes for real visitors
        until you click a Save button below.
      </p>

      <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {/* mini navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--white)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '.95rem', color: 'var(--ink)',
          }}>
            <Mark logo={projectLogo} icon={projectIcon} size={26} iconSize={13} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {projectName || 'Your project'}
            </span>
          </div>
          <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none', flexShrink: 0 }}>
            {pickupSchedulingEnabled ? 'Book now' : 'Sign in'}
          </span>
        </div>

        {/* mini hero */}
        <div style={{ padding: '22px 16px', textAlign: 'center', background: 'var(--primary-wash, var(--mist))' }}>
          <p style={{ margin: '0 0 14px', fontSize: '.85rem', color: 'var(--ink)' }}>
            {projectDescription || 'Your project description shows up here.'}
          </p>
          {pickupSchedulingEnabled ? (
            <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Book a pickup</span>
          ) : (
            <p style={{ margin: 0, fontSize: '.8rem', fontWeight: 600, color: 'var(--ink)' }}>
              Call to book: {businessPhone || '+91 90000 00000'}
            </p>
          )}
        </div>

        {/* mini footer */}
        <div style={{
          padding: '14px 16px', borderTop: '1px solid var(--line)', background: 'var(--white)',
          display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '.85rem', color: 'var(--ink)',
            }}>
              <Mark logo={projectLogo} icon={projectIcon} size={20} iconSize={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {projectName || 'Your project'}
              </span>
            </div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '.75rem', maxWidth: 220 }}>
              {projectDescription}
            </p>
          </div>

          {hasContact && (
            <div style={{ fontSize: '.75rem', display: 'grid', gap: 4, color: 'var(--ink-soft)' }}>
              {contactEmail && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} /> {contactEmail}</span>}
              {contactPhone && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> {contactPhone}</span>}
              {contactAddress && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} /> {contactAddress}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

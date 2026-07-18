import { Mail, Phone, MapPin } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { imageUrl } from '../api/client'
import Icon from './Icon'

export default function Footer() {
  const { projectName, projectIcon, projectLogo, projectDescription, contactEmail, contactPhone, contactAddress, contactMapLink } = useSettings()
  const hasContact = contactEmail || contactPhone || contactAddress

  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--white)', marginTop: 40 }}>
      <div className="container" style={{ paddingBlock: 28 }}>
        <div className="between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="brand" style={{ fontSize: '1rem' }}>
              <span className="brand-mark" style={{ width: 28, height: 28 }}>
                {projectLogo ? <img src={imageUrl(projectLogo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Icon name={projectIcon} size={15} />}
              </span>
              {projectName}
            </div>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: '.85rem' }}>
              {projectDescription}
            </p>
          </div>

          {hasContact && (
            <div className="stack-sm" style={{ fontSize: '.85rem' }}>
              {contactEmail && (
                <a className="muted" href={`mailto:${contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={15} /> {contactEmail}
                </a>
              )}
              {contactPhone && (
                <a className="muted" href={`tel:${contactPhone.replace(/\s+/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={15} /> {contactPhone}
                </a>
              )}
              {contactAddress && (
                contactMapLink ? (
                  <a className="muted" href={contactMapLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={15} /> {contactAddress}
                  </a>
                ) : (
                  <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={15} /> {contactAddress}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

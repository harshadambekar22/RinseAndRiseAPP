import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'
import { applyThemeColors } from '../utils/theme'

const SettingsContext = createContext(null)
export const useSettings = () => useContext(SettingsContext)

const DEFAULTS = {
  pickupSchedulingEnabled: false,
  businessPhone: '',
  headline: 'Fresh clothes, without the trip.',
  projectName: 'Rinse & Rise',
  projectDescription: 'Pickup & delivery dry cleaning, without the trip.',
  projectIcon: 'shirt',
  projectLogo: '',
  themePrimaryColor: '#e8590c',
  themeAccentColor: '#f59e0b',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  contactMapLink: '',
  googleClientId: '',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    return api.get('/settings/public')
      .then(({ data }) => setSettings(data))
      .catch(() => { /* keep defaults if the API isn't reachable */ })
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  // Project name/description are admin-editable (Admin → Features → Branding).
  // Push them into the document immediately so a rename applies everywhere —
  // browser tab, search-engine/share previews — without a rebuild or reload.
  useEffect(() => {
    if (loading) return
    document.title = settings.projectName || DEFAULTS.projectName

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', settings.projectDescription || DEFAULTS.projectDescription)
  }, [loading, settings.projectName, settings.projectDescription])

  // Theme colors are admin-editable too (Admin → Features → Theme). Push
  // them onto the document root immediately so every button, navbar, and
  // icon that reads var(--primary)/var(--accent) repaints without a reload.
  useEffect(() => {
    if (loading) return
    applyThemeColors({
      primary: settings.themePrimaryColor || DEFAULTS.themePrimaryColor,
      accent: settings.themeAccentColor || DEFAULTS.themeAccentColor,
    })
  }, [loading, settings.themePrimaryColor, settings.themeAccentColor])

  const value = {
    ...settings,
    loading,
    refresh,
    // The backend already falls back to appsettings.json for googleClientId,
    // but a fresh clone that's only set up client/.env (no backend config,
    // no admin key saved yet) still needs a client-side fallback here.
    googleClientId: settings.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

const KEY = 'df_theme'

// Light (orange + white) is the default. We honour a saved choice first,
// then the OS preference, falling back to light.
function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  // Reflect the theme onto <html data-theme="..."> and remember it.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(KEY, theme) } catch { /* storage may be unavailable */ }
  }, [theme])

  const setTheme = (t) => setThemeState(t === 'dark' ? 'dark' : 'light')
  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

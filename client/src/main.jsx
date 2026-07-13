import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx'
import './index.css'

// The Google client id is admin-editable (Admin → API Keys), so it has to be
// read from SettingsContext rather than baked in at build time — this small
// gate sits between SettingsProvider and the app so GoogleOAuthProvider gets
// the live value. If none is set anywhere, the app still runs — "Sign in
// with Google" just won't render (see GOOGLE_ENABLED in Login/Register).
function GoogleAuthGate({ children }) {
  const { googleClientId } = useSettings()
  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <GoogleAuthGate>
              <App />
            </GoogleAuthGate>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)

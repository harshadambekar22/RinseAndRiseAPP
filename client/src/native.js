import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

/**
 * Native shell helpers for the Play Store Android app.
 * Safe no-ops when running in a normal browser.
 */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0f0f0f' })
  } catch (_) {
    /* StatusBar may be unavailable on some devices */
  }

  try {
    await SplashScreen.hide()
  } catch (_) {
    /* ignore */
  }

  // Hardware back: go back in history, or leave the app on the home screen.
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      window.history.back()
    } else {
      CapApp.exitApp()
    }
  })
}

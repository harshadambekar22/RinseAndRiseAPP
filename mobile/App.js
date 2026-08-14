import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'

const APP_URL = 'https://rinse-and-rise-webapp.up.railway.app'

export default function App() {
  const webRef = useRef(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [canGoBack])

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <View style={styles.container}>
        <WebView
          ref={webRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          originWhitelist={['*']}
          // Allow maps / Razorpay / Google inside the WebView
          mixedContentMode="compatibility"
        />
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#e8590c" />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
})

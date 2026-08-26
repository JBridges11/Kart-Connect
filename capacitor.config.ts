import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'uk.co.prsuk.kartconnect',
  appName: 'Kart Connect',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'LaunchScreen',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0a0a',
    },
  },
}

export default config

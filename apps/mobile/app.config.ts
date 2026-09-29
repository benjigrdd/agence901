import type { ExpoConfig } from 'expo/config';

// Config statique provisoire : la déclinaison par commune (tenants/<slug>/) arrive avec les lots 08–10.
const config: ExpoConfig = {
  name: 'Ma Commune',
  slug: 'ma-commune',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'macommune',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      backgroundImage: './assets/images/android-icon-background.png',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: { output: 'static', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/images/splash-icon.png', imageWidth: 200, resizeMode: 'contain' }],
  ],
  experiments: { typedRoutes: true },
};

export default config;

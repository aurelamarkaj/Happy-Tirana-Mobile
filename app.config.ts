import type { ExpoConfig } from 'expo/config';

const EAS_PROJECT_ID = '0d8c3c87-6979-476e-a195-6f1edb17081d';

const config: ExpoConfig = {
  name: 'Happy Tirana Courier',
  slug: 'happy-tirana-mobile',
  owner: 'aurelamarkaj',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  scheme: 'happy-tirana',
  platforms: ['android', 'ios', 'web'],
  android: { package: 'al.happytirana.courier', versionCode: 1, allowBackup: false, googleServicesFile: './google-services.json', permissions: ['android.permission.POST_NOTIFICATIONS'], adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#ffffff' } },
  ios: { bundleIdentifier: 'al.happytirana.courier', supportsTablet: false },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font', './plugins/with-local-release.cjs', ['expo-notifications', {
    color: '#ff5500', defaultChannel: 'orders',
  }], ['expo-location', {
    locationWhenInUsePermission: 'Happy Tirana përdor vendndodhjen për GPS live kur je online ose ke dërgesa aktive.',
    locationAlwaysAndWhenInUsePermission: 'Lejo GPS gjatë dërgesave edhe me ekran të kyçur. Vendndodhja dërgohet vetëm kur je online ose ke dërgesa aktive.',
    isAndroidBackgroundLocationEnabled: true,
    isAndroidForegroundServiceEnabled: true,
    isIosBackgroundLocationEnabled: true,
  }], ['react-native-maps', {
    androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
  }]],
};
export default config;

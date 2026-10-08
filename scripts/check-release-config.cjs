const path = require('node:path');
const { load } = require('@expo/env');
process.env.NODE_ENV = 'production';
load(path.resolve(__dirname, '..'));
try {
  const url = new URL(process.env.EXPO_PUBLIC_API_BASE_URL || '');
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error();
} catch { console.error('Set EXPO_PUBLIC_API_BASE_URL to the real HTTPS API before building a release APK.'); process.exit(1); }
if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim()) { console.error('Set the Android Maps SDK key before building the APK.'); process.exit(1); }
console.log('Release API and Maps configuration is present. Values were not printed.');

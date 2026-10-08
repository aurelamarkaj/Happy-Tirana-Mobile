const EAS_PROJECT_ID = '0d8c3c87-6979-476e-a195-6f1edb17081d';

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '',
  riderResetUrl: process.env.EXPO_PUBLIC_RIDER_RESET_PASSWORD_URL?.trim() ?? '',
  businessResetUrl: process.env.EXPO_PUBLIC_BUSINESS_RESET_PASSWORD_URL?.trim() ?? '',
  pushRegistration: process.env.EXPO_PUBLIC_ENABLE_PUSH_REGISTRATION === 'true',
  expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim() || EAS_PROJECT_ID,
  socketPath: process.env.EXPO_PUBLIC_SOCKET_PATH?.trim() || '/socket.io',
};

export function requireHttpsUrl(value: string, label: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error();
    return value.replace(/\/+$/, '');
  } catch {
    throw new Error(`Konfiguro ${label} me një URL të vlefshme HTTPS në .env.`);
  }
}

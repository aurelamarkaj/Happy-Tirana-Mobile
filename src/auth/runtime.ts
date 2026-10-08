import * as SecureStore from 'expo-secure-store';
import { QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { SessionManager } from './session-manager';
import { createApiClient, ApiError } from '../api/client';
import { env } from '../config/env';
import { sessionExpired, type LoginInput } from '../contracts/auth';
import { authenticate } from './authenticate';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    },
    mutations: { retry: false },
  },
});
const key = 'happy-tirana.session.v1';
const adminDeviceKey = 'happy-tirana.admin-device.v1';
async function getAdminDeviceId() {
  const existing = await SecureStore.getItemAsync(adminDeviceKey);
  if (existing) return existing;
  const random = Array.from({ length: 4 }, () => Math.floor(Math.random() * 0x1_0000_0000).toString(16).padStart(8, '0')).join('');
  const deviceId = `mobile-${Date.now().toString(36)}-${random}`;
  await SecureStore.setItemAsync(adminDeviceKey, deviceId, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  return deviceId;
}
export const sessions = new SessionManager({
  read: () => Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key),
  write: value => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  remove: () => Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key),
}, () => { void queryClient.cancelQueries(); queryClient.clear(); });

// UI and headless GPS share one hydration, so a task cannot restore an old login twice.
let restorePromise: Promise<void> | undefined;
export function restoreSessionOnce() { return restorePromise ??= sessions.restore(); }

export const api = createApiClient({
  baseUrl: env.apiBaseUrl,
  getSession: sessions.getSession,
  onUnauthorized: token => sessions.logout(token),
});

// Push registration is optional infrastructure. A missing or temporarily unavailable
// device endpoint must not invalidate an otherwise valid rider session.
export const pushApi = createApiClient({
  baseUrl: env.apiBaseUrl,
  getSession: sessions.getSession,
  onUnauthorized: async () => undefined,
});

export async function login(input: LoginInput) {
  if (Platform.OS === 'web') throw new Error('Ky preview shërben për pamjen. Hyrja me SecureStore bëhet në Android/iOS.');
  const revision = sessions.getRevision();
  const session = await authenticate(input, api, await getAdminDeviceId());
  await sessions.save(session, revision);
}

export function watchSessionExpiry(onError: () => void) {
  const check = () => {
    const session = sessions.getSession();
    if (session && sessionExpired(session)) void sessions.logout(session.account.token).catch(onError);
  };
  const timer = setInterval(check, 15_000);
  const subscription = AppState.addEventListener('change', state => { if (state === 'active') check(); });
  check();
  return () => { clearInterval(timer); subscription.remove(); };
}

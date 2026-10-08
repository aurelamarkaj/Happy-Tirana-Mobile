import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';
import { env } from '../config/env';
import { sessions } from '../auth/runtime';
import { registerRiderDevice } from '../api/devices';
import { riderDeviceContract, type PushDevice } from './device-contract';
import { PushRegistration, type PushStatus, type RegistrationRequest } from './registration';
export const ORDERS_CHANNEL = 'orders';
export async function createOrdersChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL, { name: 'Porositë', importance: Notifications.AndroidImportance.HIGH, lightColor: '#ff5500', vibrationPattern: [0, 250, 250, 250] });
}
function deadline<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PUSH_TOKEN_TIMEOUT')), 20_000);
    promise.then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); reject(new Error('PUSH_TOKEN_FAILED')); });
  });
}
export async function getExpoDevice(request: RegistrationRequest): Promise<PushDevice | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('PUSH_NATIVE_REQUIRED');
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) throw new Error('PUSH_NATIVE_BUILD_REQUIRED');
  const projectId = env.expoProjectId || Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!z.string().uuid().safeParse(projectId).success) throw new Error('PUSH_PROJECT_ID_REQUIRED');
  // Android 13 requires a channel before asking notification permission.
  await createOrdersChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && request.requestPermission && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  const allowed = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!allowed) return null;
  const token = await deadline(Notifications.getExpoPushTokenAsync({ projectId, ...(request.nativeToken ? { devicePushToken: request.nativeToken } : {}) }));
  if (!/^(ExponentPushToken|ExpoPushToken)\[[^\]\s]+\]$/.test(token.data)) throw new Error('PUSH_INVALID_EXPO_TOKEN');
  return { expoPushToken: token.data, platform: Platform.OS };
}
let status: PushStatus = 'idle'; const listeners = new Set<() => void>();
export const pushStore = { get: () => status, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; } };
export const pushRegistration = new PushRegistration({ enabled: () => env.pushRegistration, configured: () => Boolean(env.expoProjectId),
  session: sessions.getSession, getToken: getExpoDevice, send: registerRiderDevice,
  status: value => { status = value; listeners.forEach(listener => listener()); },
});
let previousToken = sessions.getSession()?.account.token;
sessions.subscribe(() => { const session = sessions.getSession(); if (previousToken !== session?.account.token) pushRegistration.reset(); previousToken = session?.account.token; });

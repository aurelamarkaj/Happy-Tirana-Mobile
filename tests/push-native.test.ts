import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ channel: vi.fn(), permission: vi.fn(), request: vi.fn(), expo: vi.fn(), constants: { executionEnvironment: 'standalone', expoConfig: null, easConfig: null }, env: { expoProjectId: '11111111-1111-4111-8111-111111111111', pushRegistration: false } }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-constants', () => ({ default: mocks.constants, ExecutionEnvironment: { StoreClient: 'storeClient' } }));
vi.mock('expo-notifications', () => ({ setNotificationChannelAsync: mocks.channel, getPermissionsAsync: mocks.permission, requestPermissionsAsync: mocks.request, getExpoPushTokenAsync: mocks.expo, AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 } }));
vi.mock('../src/config/env', () => ({ env: mocks.env }));
vi.mock('../src/auth/runtime', () => ({ sessions: { getSession: () => null, subscribe: () => () => {} } }));
vi.mock('../src/api/devices', () => ({ registerRiderDevice: vi.fn() }));
import { getExpoDevice } from '../src/push/native';
beforeEach(() => { vi.clearAllMocks(); mocks.constants.executionEnvironment = 'standalone'; mocks.env.expoProjectId = '11111111-1111-4111-8111-111111111111'; mocks.permission.mockResolvedValue({ granted: true, canAskAgain: true }); mocks.channel.mockResolvedValue(undefined); mocks.expo.mockResolvedValue({ data: 'ExpoPushToken[fixture]' }); });
it('creates the Android channel before permission and fetches an Expo token with projectId', async () => {
  const result = await getExpoDevice({ requestPermission: false }); expect(result).toEqual({ platform: 'android', expoPushToken: 'ExpoPushToken[fixture]' });
  expect(mocks.channel.mock.invocationCallOrder[0]).toBeLessThan(mocks.permission.mock.invocationCallOrder[0]!); expect(mocks.expo).toHaveBeenCalledWith({ projectId: mocks.env.expoProjectId }); expect(mocks.request).not.toHaveBeenCalled();
});
it('does not ask permissions during passive retries or fetch a token when denied', async () => {
  mocks.permission.mockResolvedValue({ granted: false, canAskAgain: true }); expect(await getExpoDevice({ requestPermission: false })).toBeNull(); expect(mocks.request).not.toHaveBeenCalled(); expect(mocks.expo).not.toHaveBeenCalled();
});
it('requests permission only for an explicit action and does not override a permanent denial', async () => {
  mocks.permission.mockResolvedValue({ granted: false, canAskAgain: true }); mocks.request.mockResolvedValue({ granted: false, canAskAgain: false });
  expect(await getExpoDevice({ requestPermission: true })).toBeNull(); expect(mocks.request).toHaveBeenCalledTimes(1);
  mocks.permission.mockResolvedValue({ granted: false, canAskAgain: false }); await getExpoDevice({ requestPermission: true }); expect(mocks.request).toHaveBeenCalledTimes(1);
});
it('passes a rotated native token to Expo without calling native token retrieval recursively', async () => {
  const nativeToken = { type: 'android' as const, data: 'native' }; await getExpoDevice({ requestPermission: false, nativeToken }); expect(mocks.expo).toHaveBeenCalledWith({ projectId: mocks.env.expoProjectId, devicePushToken: nativeToken });
});
it('fails before contacting Expo when projectId is missing or the runtime is Expo Go', async () => {
  mocks.env.expoProjectId = ''; await expect(getExpoDevice({ requestPermission: true })).rejects.toThrow('PUSH_PROJECT_ID_REQUIRED');
  mocks.constants.executionEnvironment = 'storeClient'; await expect(getExpoDevice({ requestPermission: true })).rejects.toThrow('PUSH_NATIVE_BUILD_REQUIRED'); expect(mocks.expo).not.toHaveBeenCalled(); expect(mocks.request).not.toHaveBeenCalled();
});

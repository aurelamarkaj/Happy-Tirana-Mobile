import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn(), env: { pushRegistration: false }, session: { role: 'RIDER', account: { id: '11111111-1111-4111-8111-111111111111', token: '11111111-1111-4111-8111-111111111111.9999999999.signature' } } }));
vi.mock('../src/auth/runtime', () => ({ api: mocks.api, pushApi: mocks.api, sessions: { getSession: () => mocks.session } }));
vi.mock('../src/config/env', () => ({ env: mocks.env }));
import { registerRiderDevice } from '../src/api/devices';
import { riderDeviceContract } from '../src/push/device-contract';
const device = { expoPushToken: 'ExpoPushToken[fixture]', platform: 'android' as const };
beforeEach(() => { vi.clearAllMocks(); mocks.env.pushRegistration = false; mocks.session.role = 'RIDER'; });
it('blocks direct API use while disabled', async () => {
  await expect(registerRiderDevice(device, mocks.session.account.token)).rejects.toThrow('PUSH_REGISTRATION_DISABLED');
  expect(mocks.api).not.toHaveBeenCalled();
});
it('maps the requested production device contract and validates its response', () => {
  expect(riderDeviceContract.body(device)).toEqual({ expoPushToken: device.expoPushToken, platform: 'android' });
  expect(() => riderDeviceContract.validateResponse({ ok: true })).not.toThrow();
  expect(() => riderDeviceContract.validateResponse({ ok: false })).toThrow();
});
it('uses PUT Bearer client and an explicitly supplied contract adapter, without assuming fields', async () => {
  mocks.env.pushRegistration = true;
  // Test-only arbitrary payload: this is NOT a proposed backend schema.
  const validateResponse = vi.fn(); const body = { fixtureOnly: 'test-contract' }; mocks.api.mockResolvedValue({ fixtureResponse: true });
  await registerRiderDevice(device, mocks.session.account.token, undefined, { body: () => body, validateResponse });
  expect(mocks.api).toHaveBeenCalledWith('/riders/me/devices', { method: 'PUT', body: JSON.stringify(body), signal: undefined }); expect(validateResponse).toHaveBeenCalledWith({ fixtureResponse: true });
});
it('does not attach a token to another role or a late session', async () => {
  mocks.env.pushRegistration = true; const contract = { body: vi.fn(), validateResponse: vi.fn() };
  await expect(registerRiderDevice(device, 'old-session-token', undefined, contract)).rejects.toThrow('PUSH_SESSION_CHANGED');
  mocks.session.role = 'BUSINESS'; await expect(registerRiderDevice(device, mocks.session.account.token, undefined, contract)).rejects.toThrow('PUSH_SESSION_CHANGED'); expect(mocks.api).not.toHaveBeenCalled();
});

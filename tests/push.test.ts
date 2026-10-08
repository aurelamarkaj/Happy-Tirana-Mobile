import { describe, expect, it, vi } from 'vitest';
import { PushRegistration } from '../src/push/registration';
import { createNotificationObserver, notificationTarget } from '../src/push/domain';
import type { Session } from '../src/contracts/auth';
const id = '11111111-1111-4111-8111-111111111111';
const session = (): Session => ({ role: 'RIDER', account: { id, name: 'Rider', token: `${id}.9999999999.signature` } });
function setup() {
  let current: Session | null = session(); let enabled = true; let configured = true;
  const getToken = vi.fn().mockResolvedValue({ expoPushToken: 'ExpoPushToken[fixture]', platform: 'android' }); const send = vi.fn().mockResolvedValue(undefined); const status = vi.fn();
  const registration = new PushRegistration({ session: () => current, enabled: () => enabled, configured: () => configured, getToken, send, status });
  return { registration, getToken, send, status, setSession: (value: Session | null) => { current = value; }, disable: () => { enabled = false; }, missingContract: () => { configured = false; } };
}
describe('Push registration guards and token lifecycle', () => {
  it('does not ask permission, fetch an Expo token or send HTTP when the flag is false', async () => {
    const t = setup(); t.disable(); await t.registration.register({ requestPermission: true });
    expect(t.getToken).not.toHaveBeenCalled(); expect(t.send).not.toHaveBeenCalled(); expect(t.status).toHaveBeenCalledWith('disabled');
  });
  it('does not invent a request when the device contract is missing, even with the flag on', async () => {
    const t = setup(); t.missingContract(); await t.registration.register({ requestPermission: true });
    expect(t.getToken).not.toHaveBeenCalled(); expect(t.send).not.toHaveBeenCalled(); expect(t.status).toHaveBeenCalledWith('pending');
  });
  it('ignores business, logged-out and expired sessions', async () => {
    const t = setup(); t.setSession({ ...session(), role: 'BUSINESS' }); await t.registration.register({ requestPermission: true });
    t.setSession(null); await t.registration.register({ requestPermission: true });
    t.setSession({ ...session(), account: { ...session().account, token: `${id}.1.expired` } }); await t.registration.register({ requestPermission: true });
    expect(t.getToken).not.toHaveBeenCalled(); expect(t.send).not.toHaveBeenCalled();
  });
  it('respects denied permissions and does not post an empty token', async () => {
    const t = setup(); t.getToken.mockResolvedValue(null); await t.registration.register({ requestPermission: true }); expect(t.send).not.toHaveBeenCalled(); expect(t.status).toHaveBeenCalledWith('denied');
  });
  it('deduplicates registration per login and re-registers a rotated Expo token', async () => {
    const t = setup(); await t.registration.register({ requestPermission: false }); await t.registration.register({ requestPermission: false }); expect(t.send).toHaveBeenCalledTimes(1);
    t.getToken.mockResolvedValue({ expoPushToken: 'ExpoPushToken[rotated]', platform: 'android' }); await t.registration.register({ requestPermission: false }); expect(t.send).toHaveBeenCalledTimes(2);
  });
  it('rejects a token obtained after logout and allows a new login without waiting for the old SDK call', async () => {
    const t = setup(); let resolve!: (value: { expoPushToken: string; platform: string }) => void;
    t.getToken.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const old = t.registration.register({ requestPermission: true });
    t.registration.reset(); t.setSession({ ...session(), account: { ...session().account, token: `${id}.9999999998.new` } });
    await t.registration.register({ requestPermission: false }); resolve({ expoPushToken: 'ExpoPushToken[old]', platform: 'android' }); await old;
    expect(t.send).toHaveBeenCalledTimes(1); expect(t.send.mock.calls[0]![1]).toContain('.9999999998.new');
  });
  it('aborts an in-flight PUT and does not publish registered after logout', async () => {
    const t = setup(); let resolve!: () => void; t.send.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    const pending = t.registration.register({ requestPermission: false }); await vi.waitFor(() => expect(t.send).toHaveBeenCalled());
    const signal: AbortSignal = t.send.mock.calls[0]![2]; t.registration.reset(); t.setSession(null); expect(signal.aborted).toBe(true); resolve(); await pending;
    expect(t.status).not.toHaveBeenCalledWith('registered');
  });
  it('remembers a native token rotation that arrives during registration', async () => {
    const t = setup(); let resolve!: () => void; t.send.mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    const pending = t.registration.register({ requestPermission: false }); await vi.waitFor(() => expect(t.send).toHaveBeenCalled());
    t.getToken.mockResolvedValue({ expoPushToken: 'ExpoPushToken[rotated]', platform: 'android' });
    await t.registration.register({ requestPermission: false, nativeToken: { type: 'android', data: 'native-token' } }); resolve(); await pending;
    expect(t.send).toHaveBeenCalledTimes(2);
  });
  it('reports failure and permits a later explicit retry', async () => {
    const t = setup(); t.send.mockRejectedValueOnce(new Error('offline')); await t.registration.register({ requestPermission: false }); expect(t.status).toHaveBeenCalledWith('error');
    await t.registration.register({ requestPermission: true }); expect(t.send).toHaveBeenCalledTimes(2); expect(t.status).toHaveBeenCalledWith('registered');
  });
});
describe('Notification reception and navigation', () => {
  it('uses only fixed destinations for the authenticated role', () => {
    expect(notificationTarget(session())).toBe('/(rider)/dashboard'); expect(notificationTarget({ ...session(), role: 'BUSINESS' })).toBe('/(business)/orders'); expect(notificationTarget(null)).toBeNull();
  });
  it('refreshes without navigating on receipt, consumes taps once and ignores action buttons', () => {
    const refresh = vi.fn(); const navigate = vi.fn(); const observer = createNotificationObserver({ session, token: session().account.token, refresh, navigate });
    observer.received(); expect(refresh).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled();
    observer.tapped('request-1', false); expect(navigate).not.toHaveBeenCalled(); observer.tapped('request-1', true); observer.tapped('request-1', true); expect(navigate).toHaveBeenCalledTimes(1);
  });
  it('ignores late notifications after a login change or listener cleanup', () => {
    let current = session(); const refresh = vi.fn(); const navigate = vi.fn(); const observer = createNotificationObserver({ session: () => current, token: current.account.token, refresh, navigate });
    current = { ...session(), account: { ...session().account, token: `${id}.9999999998.other` } }; observer.received(); observer.tapped('request', true); expect(refresh).not.toHaveBeenCalled();
    current = session(); observer.stop(); observer.received(); observer.tapped('request', true); expect(navigate).not.toHaveBeenCalled();
  });
});

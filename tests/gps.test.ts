import { describe, expect, it, vi } from 'vitest';
import { GpsEngine, canTrack, locationInput, type GpsFix } from '../src/gps/engine';
import type { Session } from '../src/contracts/auth';
import type { RiderDashboard } from '../src/contracts/rider';
const riderId = '11111111-1111-4111-8111-111111111111';
const fix = (timestamp = 100_000): GpsFix => ({ timestamp, coords: { latitude: 41.3, longitude: 19.8, accuracy: 25, speed: 3, heading: 90 } });
const dashboard = (online = true, active = false) => ({ rider: { isOnline: online }, activeOrders: active ? [{ status: 'PICKED_UP' }] : [], activeOrder: null }) as RiderDashboard;
function setup() {
  let now = 100_000;
  let session: Session | null = { role: 'RIDER', account: { id: riderId, name: 'Rider', token: `${riderId}.1000.signature` } };
  const send = vi.fn().mockResolvedValue({ ok: true }); const getDashboard = vi.fn().mockResolvedValue(dashboard()); const expire = vi.fn().mockResolvedValue(undefined);
  const engine = new GpsEngine({ session: () => session, dashboard: getDashboard, send, expire, now: () => now });
  return { engine, send, getDashboard, expire, setNow: (value: number) => { now = value; }, setSession: (value: Session | null) => { session = value; }, getSession: () => session };
}
describe('GPS tracking policy and payload', () => {
  it('tracks online riders and offline riders with an active delivery, never idle offline riders', () => {
    expect(canTrack(dashboard())).toBe(true); expect(canTrack(dashboard(false, true))).toBe(true); expect(canTrack(dashboard(false))).toBe(false);
  });
  it('rejects stale, non-finite and out-of-range positions', () => {
    expect(locationInput(fix(69_999), 100_000)).toBeNull(); expect(locationInput(fix(106_000), 100_000)).toBeNull();
    expect(locationInput({ ...fix(), coords: { ...fix().coords, latitude: 91 } }, 100_000)).toBeNull();
    expect(locationInput({ ...fix(), coords: { ...fix().coords, longitude: NaN } }, 100_000)).toBeNull();
  });
  it('omits unavailable or negative sensor values and uses null order ID as on the website', () => {
    expect(locationInput({ ...fix(), coords: { ...fix().coords, accuracy: null, speed: -1, heading: -1 } }, 100_000)).toEqual({ lat: 41.3, lng: 19.8, orderId: null });
  });
});
describe('GPS sender concurrency and sessions', () => {
  it('sends at most once every five seconds across all callers', async () => {
    const t = setup(); expect(await t.engine.accept(fix())).toBe('sent');
    t.setNow(104_999); expect(await t.engine.accept(fix(104_999))).toBe('throttled');
    t.setNow(105_000); expect(await t.engine.accept(fix(105_000))).toBe('sent'); expect(t.send).toHaveBeenCalledTimes(2);
  });
  it('never sends for BUSINESS, logout or expired tokens', async () => {
    const t = setup(); t.setSession({ ...t.getSession()!, role: 'BUSINESS' }); expect(await t.engine.accept(fix())).toBe('stopped');
    t.setSession(null); expect(await t.engine.accept(fix())).toBe('stopped');
    t.setSession({ role: 'RIDER', account: { id: riderId, name: 'Rider', token: `${riderId}.99.signature` } });
    expect(await t.engine.accept(fix())).toBe('stopped'); expect(t.expire).toHaveBeenCalled(); expect(t.send).not.toHaveBeenCalled();
  });
  it('refreshes server eligibility after 15 seconds and stops after going offline', async () => {
    const t = setup(); await t.engine.accept(fix()); t.setNow(115_000); t.getDashboard.mockResolvedValue(dashboard(false));
    expect(await t.engine.accept(fix(115_000))).toBe('stopped'); expect(t.send).toHaveBeenCalledTimes(1);
  });
  it('drops concurrent fixes while eligibility is loading and rejects a late old-session response', async () => {
    const t = setup(); let resolve!: (value: RiderDashboard) => void;
    t.getDashboard.mockImplementation(() => new Promise<RiderDashboard>(r => { resolve = r; }));
    const pending = t.engine.accept(fix()); expect(await t.engine.accept(fix())).toBe('throttled');
    t.setSession({ ...t.getSession()!, account: { ...t.getSession()!.account, token: `${riderId}.1001.newsignature` } });
    resolve(dashboard()); expect(await pending).toBe('stopped'); expect(t.send).not.toHaveBeenCalled();
  });
  it('cancels a request on reset and cannot resurrect the stopped policy', async () => {
    const t = setup(); let resolve!: () => void; let signal!: AbortSignal;
    t.send.mockImplementation((_input, currentSignal) => { signal = currentSignal; return new Promise<void>(r => { resolve = r; }); });
    const pending = t.engine.accept(fix()); await vi.waitFor(() => expect(t.send).toHaveBeenCalled());
    t.engine.reset(); expect(signal.aborted).toBe(true); resolve(); expect(await pending).toBe('stopped');
  });
  it('does not send an aged fix after a slow dashboard response', async () => {
    const t = setup(); t.getDashboard.mockImplementation(async () => { t.setNow(131_000); return dashboard(); });
    expect(await t.engine.accept(fix())).toBe('invalid'); expect(t.send).not.toHaveBeenCalled();
  });
  it('does not replay failed positions or hammer the API before the next interval', async () => {
    const t = setup(); t.send.mockRejectedValue(new Error('offline'));
    expect(await t.engine.accept(fix())).toBe('failed'); expect(await t.engine.accept(fix())).toBe('throttled');
    t.setNow(105_000); t.send.mockResolvedValue({ ok: true }); expect(await t.engine.accept(fix(105_000))).toBe('sent'); expect(t.send).toHaveBeenCalledTimes(2);
  });
  it('honors a server rejection when local online data became stale', async () => {
    const t = setup(); t.send.mockRejectedValue({ code: 'GPS_ALLOWED_ONLY_WHEN_ONLINE_OR_ACTIVE_ORDER' });
    expect(await t.engine.accept(fix())).toBe('stopped'); t.setNow(105_000); expect(await t.engine.accept(fix(105_000))).toBe('stopped'); expect(t.send).toHaveBeenCalledTimes(1);
  });
});

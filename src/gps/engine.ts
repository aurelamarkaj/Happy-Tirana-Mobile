import type { Session } from '../contracts/auth';
import { sessionExpired } from '../contracts/auth';
import type { RiderDashboard } from '../contracts/rider';
import type { RiderLocationInput } from '../contracts/location';
export const SEND_INTERVAL = 5000;
export const STALE_AFTER = 30_000;
export interface GpsFix { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null; speed: number | null; heading: number | null } }
export function locationInput(fix: GpsFix, now: number): RiderLocationInput | null {
  const c = fix.coords;
  if (!Number.isFinite(fix.timestamp) || now - fix.timestamp > STALE_AFTER || fix.timestamp > now + 5000 || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) || Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180) return null;
  return { lat: c.latitude, lng: c.longitude, orderId: null,
    ...(c.accuracy !== null && Number.isFinite(c.accuracy) && c.accuracy >= 0 ? { accuracy: c.accuracy } : {}),
    ...(c.speed !== null && Number.isFinite(c.speed) && c.speed >= 0 ? { speed: c.speed } : {}),
    ...(c.heading !== null && Number.isFinite(c.heading) && c.heading >= 0 && c.heading <= 360 ? { heading: c.heading } : {}),
  };
}
export function canTrack(data: RiderDashboard) { return data.rider.isOnline || (data.activeOrders ?? (data.activeOrder ? [data.activeOrder] : [])).some(order => ['ACCEPTED', 'PICKED_UP'].includes(order.status)); }
export type FixResult = 'sent' | 'throttled' | 'invalid' | 'stopped' | 'failed';
type Dependencies = {
  session: () => Session | null; dashboard: (signal: AbortSignal) => Promise<RiderDashboard>;
  send: (input: RiderLocationInput, signal: AbortSignal, token: string) => Promise<unknown>;
  expire: (token: string) => Promise<void>; now?: () => number;
};
// One sender shared by foreground and background: no overlapping POSTs or offline replay.
export class GpsEngine {
  private policy: { token: string; allowed: boolean; checked: number } | null = null;
  private lastAttempt: number | null = null;
  private inFlight: AbortController | null = null;
  private generation = 0;
  constructor(private dependencies: Dependencies) {}
  updatePolicy(data: RiderDashboard, token: string) { this.policy = { token, allowed: canTrack(data), checked: this.now() }; }
  private now() { return (this.dependencies.now ?? Date.now)(); }
  reset() { this.generation++; this.inFlight?.abort(); this.policy = null; this.lastAttempt = null; }
  async accept(fix: GpsFix): Promise<FixResult> {
    if (!locationInput(fix, this.now())) return 'invalid';
    const session = this.dependencies.session();
    if (session?.role !== 'RIDER') return 'stopped';
    if (sessionExpired(session, this.now())) { await this.dependencies.expire(session.account.token); return 'stopped'; }
    if (this.inFlight || (this.lastAttempt !== null && this.now() - this.lastAttempt < SEND_INTERVAL)) return 'throttled';
    const token = session.account.token; const generation = this.generation;
    const controller = new AbortController(); this.inFlight = controller;
    const current = () => !controller.signal.aborted && generation === this.generation && this.dependencies.session()?.account.token === token;
    try {
      if (!this.policy || this.policy.token !== token || this.now() - this.policy.checked >= 15_000) {
        const dashboard = await this.dependencies.dashboard(controller.signal);
        if (!current()) return 'stopped';
        this.updatePolicy(dashboard, token);
      }
      if (!current() || !this.policy?.allowed) return 'stopped';
      const input = locationInput(fix, this.now()); if (!input) return 'invalid';
      this.lastAttempt = this.now();
      await this.dependencies.send(input, controller.signal, token);
      return current() ? 'sent' : 'stopped';
    } catch (error) {
      if (current() && error && typeof error === 'object' && 'code' in error && error.code === 'GPS_ALLOWED_ONLY_WHEN_ONLINE_OR_ACTIVE_ORDER') {
        this.policy = { token, allowed: false, checked: this.now() }; return 'stopped';
      }
      return current() ? 'failed' : 'stopped';
    }
    finally { if (this.inFlight === controller) this.inFlight = null; }
  }
}

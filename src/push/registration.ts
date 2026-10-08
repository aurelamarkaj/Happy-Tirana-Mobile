import { sessionExpired, type Session } from '../contracts/auth';
import type { PushDevice } from './device-contract';
import type { DevicePushToken } from 'expo-notifications';
export type PushStatus = 'idle' | 'working' | 'registered' | 'denied' | 'disabled' | 'pending' | 'error';
export interface RegistrationRequest { requestPermission: boolean; nativeToken?: DevicePushToken }
interface Dependencies {
  enabled: () => boolean; configured: () => boolean; session: () => Session | null;
  getToken: (request: RegistrationRequest) => Promise<PushDevice | null>;
  send: (device: PushDevice, token: string, signal: AbortSignal) => Promise<void>;
  status: (status: PushStatus) => void;
}
// Registration is scoped to the current login; Expo/native push tokens stay in memory.
export class PushRegistration {
  private generation = 0;
  private controller: AbortController | null = null;
  private registered: { token: string; expoPushToken: string } | null = null;
  private pendingRotation: RegistrationRequest | null = null;
  constructor(private dependencies: Dependencies) {}
  reset() { this.generation++; this.controller?.abort(); this.controller = null; this.registered = null; this.pendingRotation = null; this.dependencies.status('idle'); }
  async register(request: RegistrationRequest) {
    if (!this.dependencies.enabled()) { this.dependencies.status('disabled'); return; }
    if (!this.dependencies.configured()) { this.dependencies.status('pending'); return; }
    const session = this.dependencies.session();
    if (session?.role !== 'RIDER' || sessionExpired(session)) return;
    if (this.controller) { if (request.nativeToken) this.pendingRotation = request; return; }
    const controller = new AbortController(); this.controller = controller;
    const generation = this.generation; const token = session.account.token;
    const current = () => !controller.signal.aborted && generation === this.generation && this.dependencies.session()?.account.token === token && this.dependencies.enabled();
    this.dependencies.status('working');
    try {
      const device = await this.dependencies.getToken(request);
      if (!current()) return;
      if (!device) { this.dependencies.status('denied'); return; }
      if (sessionExpired(this.dependencies.session()!)) { this.dependencies.status('idle'); return; }
      if (this.registered?.token !== token || this.registered.expoPushToken !== device.expoPushToken) {
        await this.dependencies.send(device, token, controller.signal);
        if (!current()) return;
        this.registered = { token, expoPushToken: device.expoPushToken };
      }
      this.dependencies.status('registered');
    } catch { if (current()) this.dependencies.status('error'); }
    finally {
      if (this.controller === controller) {
        this.controller = null;
        const pending = this.pendingRotation; this.pendingRotation = null;
        if (pending && current()) await this.register(pending);
      }
    }
  }
}

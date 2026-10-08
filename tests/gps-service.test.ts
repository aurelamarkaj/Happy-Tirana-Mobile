import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  foreground: vi.fn(), background: vi.fn(), services: vi.fn(), watch: vi.fn(), start: vi.fn(), stop: vi.fn(), started: vi.fn(), available: vi.fn(), receive: vi.fn(), dashboard: vi.fn(), restore: vi.fn(), remove: vi.fn(),
  session: { role: 'RIDER', account: { id: '11111111-1111-4111-8111-111111111111', name: 'Rider', token: '11111111-1111-4111-8111-111111111111.9999999999.signature' } } as { role: string; account: { id: string; name: string; token: string } } | null,
  appState: { currentState: 'active' }, listener: undefined as (() => void) | undefined,
}));
vi.mock('react-native', () => ({ AppState: mocks.appState, Platform: { OS: 'android' } }));
vi.mock('expo-task-manager', () => ({ isAvailableAsync: mocks.available }));
vi.mock('expo-location', () => ({
  hasServicesEnabledAsync: mocks.services, getForegroundPermissionsAsync: mocks.foreground, getBackgroundPermissionsAsync: mocks.background,
  isBackgroundLocationAvailableAsync: mocks.available, watchPositionAsync: mocks.watch, startLocationUpdatesAsync: mocks.start, stopLocationUpdatesAsync: mocks.stop, hasStartedLocationUpdatesAsync: mocks.started,
  Accuracy: { High: 4 }, ActivityType: { AutomotiveNavigation: 1 },
}));
vi.mock('../src/api/rider', () => ({ getRiderDashboard: mocks.dashboard, sendRiderLocation: mocks.receive }));
vi.mock('../src/auth/runtime', () => ({ restoreSessionOnce: mocks.restore, sessions: { getSession: () => mocks.session, logout: vi.fn(), subscribe: (listener: () => void) => { mocks.listener = listener; return () => {}; } } }));
describe('Native GPS lifecycle', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); mocks.session = { role: 'RIDER', account: { id: '11111111-1111-4111-8111-111111111111', name: 'Rider', token: '11111111-1111-4111-8111-111111111111.9999999999.signature' } };
    mocks.appState.currentState = 'active'; mocks.foreground.mockResolvedValue({ granted: true }); mocks.background.mockResolvedValue({ granted: true }); mocks.services.mockResolvedValue(true); mocks.available.mockResolvedValue(true); mocks.started.mockResolvedValue(false);
    mocks.start.mockResolvedValue(undefined); mocks.stop.mockResolvedValue(undefined); mocks.watch.mockResolvedValue({ remove: mocks.remove }); mocks.restore.mockResolvedValue(undefined);
    mocks.dashboard.mockResolvedValue({ rider: { isOnline: true }, activeOrders: [] }); mocks.receive.mockResolvedValue({ ok: true });
  });
  it('starts the background task with a persistent Android service notification', async () => {
    const service = await import('../src/gps/service'); await service.reconcileGps(mocks.session!.account.token);
    expect(mocks.start).toHaveBeenCalledWith(service.GPS_TASK, expect.objectContaining({ timeInterval: 5000, foregroundService: expect.objectContaining({ notificationTitle: 'Happy Tirana · GPS live' }) }));
    expect(mocks.watch).not.toHaveBeenCalled();
  });
  it('falls back to foreground when background permission is denied, and removes its watch on background', async () => {
    mocks.background.mockResolvedValue({ granted: false }); const service = await import('../src/gps/service');
    await service.reconcileGps(mocks.session!.account.token); expect(service.gpsStore.get().mode).toBe('foreground');
    mocks.appState.currentState = 'background'; await service.reconcileGps(mocks.session!.account.token);
    expect(mocks.remove).toHaveBeenCalled(); expect(service.gpsStore.get().mode).toBe('stopped');
  });
  it('never requests a permission automatically or acquires a fix if foreground permission is denied', async () => {
    mocks.foreground.mockResolvedValue({ granted: false }); const service = await import('../src/gps/service'); await service.reconcileGps(mocks.session!.account.token);
    expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.watch).not.toHaveBeenCalled(); expect(service.gpsStore.get().message).toContain('Lejo');
  });
  it('stops the native task and clears coordinates immediately after logout', async () => {
    const service = await import('../src/gps/service'); await service.reconcileGps(mocks.session!.account.token); mocks.started.mockResolvedValue(true);
    mocks.session = null; mocks.listener!(); expect(service.gpsStore.get().location).toBeNull();
    await vi.waitFor(() => expect(mocks.stop).toHaveBeenCalledWith(service.GPS_TASK));
  });
  it('does not start a background service from the background', async () => {
    mocks.appState.currentState = 'background'; const service = await import('../src/gps/service'); await service.reconcileGps(mocks.session!.account.token); expect(mocks.start).not.toHaveBeenCalled();
  });
  it('hydrates the headless session before validating eligibility and sending the fix', async () => {
    const service = await import('../src/gps/service'); await service.receiveFix({ timestamp: Date.now(), coords: { latitude: 41.3, longitude: 19.8, accuracy: 10, speed: null, heading: null } });
    expect(mocks.restore).toHaveBeenCalled(); expect(mocks.dashboard).toHaveBeenCalled(); expect(mocks.receive).toHaveBeenCalledWith({ lat: 41.3, lng: 19.8, orderId: null, accuracy: 10 }, expect.any(AbortSignal), mocks.session!.account.token);
  });
  it('shuts down a late native start when logout happens while it is starting', async () => {
    let resolve!: () => void; mocks.start.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    const service = await import('../src/gps/service'); const starting = service.reconcileGps(mocks.session!.account.token);
    await vi.waitFor(() => expect(mocks.start).toHaveBeenCalled());
    const stopping = service.stopGps(); mocks.started.mockResolvedValue(true); resolve(); await starting; await stopping;
    expect(mocks.stop).toHaveBeenCalledWith(service.GPS_TASK); expect(service.gpsStore.get().mode).toBe('stopped');
  });
  it('stops a cold background task for an idle offline rider without transmitting a location', async () => {
    mocks.dashboard.mockResolvedValue({ rider: { isOnline: false }, activeOrders: [] }); mocks.started.mockResolvedValue(true);
    const service = await import('../src/gps/service'); await service.receiveFix({ timestamp: Date.now(), coords: { latitude: 41.3, longitude: 19.8, accuracy: 10, speed: null, heading: null } });
    expect(mocks.receive).not.toHaveBeenCalled(); expect(mocks.stop).toHaveBeenCalledWith(service.GPS_TASK); expect(service.gpsStore.get().location).toBeNull();
  });
});

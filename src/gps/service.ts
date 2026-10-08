import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';
import { getRiderDashboard, sendRiderLocation } from '../api/rider';
import { restoreSessionOnce, sessions } from '../auth/runtime';
import { GpsEngine, locationInput, STALE_AFTER, type GpsFix } from './engine';
export const GPS_TASK = 'happy-tirana.rider-location.v1';
export interface GpsState {
  location: { lat: number; lng: number } | null; accuracy: number | null; fixAt: number | null;
  sentAt: number | null; mode: 'stopped' | 'foreground' | 'background'; message: string;
}
const initial: GpsState = { location: null, accuracy: null, fixAt: null, sentAt: null, mode: 'stopped', message: 'Aktivizo Online për të transmetuar GPS-in.' };
let state = initial; const listeners = new Set<() => void>();
export const gpsStore = {
  get: () => state,
  subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
function publish(patch: Partial<GpsState>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
export function gpsMessage(message: string) { publish({ message }); }
export const gpsEngine = new GpsEngine({ session: sessions.getSession, dashboard: signal => getRiderDashboard(signal), send: sendRiderLocation, expire: token => sessions.logout(token) });
let desiredToken: string | null = null; let runningToken: string | null = null;
let watcher: Location.LocationSubscription | null = null;
let lifecycle: Promise<unknown> = Promise.resolve();
let serviceGeneration = 0;
function enqueue(operation: () => Promise<void>) {
  const result = lifecycle.then(operation); lifecycle = result.catch(() => undefined); return result;
}
async function stopNative() {
  watcher?.remove(); watcher = null; runningToken = null;
  if (Platform.OS !== 'web' && await TaskManager.isAvailableAsync() && await Location.hasStartedLocationUpdatesAsync(GPS_TASK)) await Location.stopLocationUpdatesAsync(GPS_TASK);
}
export function stopGps(message = initial.message) {
  desiredToken = null; serviceGeneration++; gpsEngine.reset(); state = { ...initial, message }; listeners.forEach(fn => fn());
  return enqueue(stopNative);
}
export async function receiveFix(fix: GpsFix) {
  await restoreSessionOnce();
  const session = sessions.getSession(); if (session?.role !== 'RIDER') { await stopGps(); return; }
  const input = locationInput(fix, Date.now());
  if (!input) { expireFix(); return; }
  const token = session.account.token;
  const generation = serviceGeneration;
  publish({ location: { lat: input.lat, lng: input.lng }, accuracy: input.accuracy ?? null, fixAt: fix.timestamp });
  const result = await gpsEngine.accept(fix);
  if (sessions.getSession()?.account.token !== token || generation !== serviceGeneration) return;
  if (result === 'sent') publish({ sentAt: Date.now(), message: (input.accuracy !== undefined && input.accuracy > 100 ? 'GPS i përafërt' : 'GPS live') + (input.accuracy !== undefined ? ` · Saktësia ±${Math.round(input.accuracy)} m` : ' · Saktësia e panjohur') });
  if (result === 'failed') gpsMessage('GPS u gjet, por nuk u dërgua. Kontrollo internetin.');
  if (result === 'stopped') await stopGps();
}
export function expireFix() {
  if (state.fixAt && Date.now() - state.fixAt > STALE_AFTER) publish({ location: null, accuracy: null, fixAt: null, message: 'GPS nuk është përditësuar. Po presim matje të re.' });
}
export function reconcileGps(token: string | null) {
  desiredToken = token;
  if (!token) { serviceGeneration++; gpsEngine.reset(); state = initial; listeners.forEach(fn => fn()); }
  return enqueue(async () => {
    if (!desiredToken) { await stopNative(); return; }
    const target = desiredToken;
    if (sessions.getSession()?.role !== 'RIDER' || sessions.getSession()?.account.token !== target) { await stopNative(); return; }
    if (AppState.currentState !== 'active') {
      // A foreground-only watch cannot continue under a locked screen.
      watcher?.remove(); watcher = null;
      if (state.mode === 'foreground') { runningToken = null; publish({ location: null, fixAt: null, mode: 'stopped', message: 'GPS është ndalur në background. Lejo vendndodhjen gjatë gjithë kohës.' }); }
      return;
    }
    if (!await Location.hasServicesEnabledAsync()) { await stopNative(); publish({ mode: 'stopped', message: 'Aktivizo vendndodhjen në pajisje.' }); return; }
    const foreground = await Location.getForegroundPermissionsAsync();
    if (!foreground.granted) { await stopNative(); publish({ mode: 'stopped', message: 'Lejo vendndodhjen që të transmetosh GPS live.' }); return; }
    const background = await Location.getBackgroundPermissionsAsync();
    const backgroundAvailable = background.granted && await TaskManager.isAvailableAsync() && await Location.isBackgroundLocationAvailableAsync();
    if (desiredToken !== target || sessions.getSession()?.account.token !== target || AppState.currentState !== 'active') return;
    const mode = backgroundAvailable ? 'background' : 'foreground';
    if (runningToken === target && state.mode === mode) return;
    await stopNative();
    if (desiredToken !== target || sessions.getSession()?.account.token !== target || AppState.currentState !== 'active') return;
    publish({ mode, message: 'Po presim vendndodhjen e pajisjes.' });
    if (backgroundAvailable) {
      try {
        await Location.startLocationUpdatesAsync(GPS_TASK, {
          accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0,
          deferredUpdatesInterval: 5000, pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
          activityType: Location.ActivityType.AutomotiveNavigation,
          foregroundService: { notificationTitle: 'Happy Tirana · GPS live', notificationBody: 'Vendndodhja transmetohet kur je online ose ke dërgesa aktive.', notificationColor: '#ff5500', killServiceOnDestroy: true },
        });
      } catch {
        await stopNative();
        if (desiredToken !== target || sessions.getSession()?.account.token !== target || AppState.currentState !== 'active') return;
        publish({ mode: 'foreground', message: 'GPS në background nuk u aktivizua. Po punon vetëm me aplikacionin të hapur.' });
        watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 }, fix => { void receiveFix(fix).catch(() => gpsMessage('GPS nuk u dërgua. Provo përsëri.')); }, () => gpsMessage('GPS nuk u gjet. Kontrollo vendndodhjen e pajisjes.'));
      }
    } else {
      watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 }, fix => { void receiveFix(fix).catch(() => gpsMessage('GPS nuk u dërgua. Provo përsëri.')); }, () => gpsMessage('GPS nuk u gjet. Kontrollo vendndodhjen e pajisjes.'));
    }
    runningToken = target;
    if (desiredToken !== target || sessions.getSession()?.account.token !== target) await stopNative();
  });
}
// Stops acquisition and cancels in-flight location requests immediately on logout/role change.
let previousToken = sessions.getSession()?.account.token;
sessions.subscribe(() => {
  const session = sessions.getSession();
  if ((previousToken && previousToken !== session?.account.token) || session?.role !== 'RIDER') void stopGps().catch(() => gpsMessage('GPS u ndal; rihap aplikacionin nëse njoftimi vazhdon.'));
  previousToken = session?.account.token;
});

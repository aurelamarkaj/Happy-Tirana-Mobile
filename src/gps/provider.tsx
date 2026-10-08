import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sessions } from '../auth/runtime';
import { useAuth } from '../auth/provider';
import { useRiderDashboard } from '../features/rider/hooks';
import { canTrack } from './engine';
import { expireFix, gpsEngine, gpsMessage, gpsStore, reconcileGps, stopGps, type GpsState } from './service';
interface GpsContextValue { state: GpsState; needed: boolean; busy: boolean; requestForeground: () => Promise<void>; requestBackground: () => Promise<void> }
const GpsContext = createContext<GpsContextValue | null>(null);
export function RiderGpsProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth(); const query = useRiderDashboard();
  const state = useSyncExternalStore(gpsStore.subscribe, gpsStore.get, gpsStore.get);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [revision, setRevision] = useState(0); const [busy, setBusy] = useState(false);
  const permissionLock = useRef(false);
  const needed = session?.role === 'RIDER' && !!query.data && canTrack(query.data);
  useEffect(() => { const sub = AppState.addEventListener('change', value => { setForeground(value === 'active'); if (value === 'active') setRevision(n => n + 1); }); return () => sub.remove(); }, []);
  useEffect(() => {
    if (!ready) return;
    if (session?.role === 'RIDER' && query.data && !query.error) gpsEngine.updatePolicy(query.data, session.account.token);
    // During cold startup keep the registered task until the dashboard has been read.
    if (session?.role === 'RIDER' && !query.data) return;
    void reconcileGps(needed ? session!.account.token : null).catch(() => gpsMessage('GPS nuk u aktivizua. Kontrollo lejet dhe provo përsëri.'));
  }, [ready, session?.role, session?.account.token, needed, query.data, query.error, foreground, revision]);
  useEffect(() => { const timer = setInterval(expireFix, 5000); return () => { clearInterval(timer); void stopGps().catch(() => undefined); }; }, []);
  async function request(background: boolean) {
    if (permissionLock.current || !needed) return;
    permissionLock.current = true; setBusy(true);
    const token = session?.account.token;
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (sessions.getSession()?.account.token !== token) return;
      if (!result.granted) { gpsMessage('Leja e vendndodhjes u refuzua. Aktivizoje te cilësimet e pajisjes.'); return; }
      if (background) {
        if (!await TaskManager.isAvailableAsync()) { gpsMessage('Për GPS në background duhet aplikacioni native i instaluar.'); return; }
        if (sessions.getSession()?.account.token !== token) return;
        const result = await Location.requestBackgroundPermissionsAsync();
        if (!result.granted) gpsMessage('Leja në background u refuzua. GPS punon vetëm me aplikacionin të hapur.');
      }
    } catch { gpsMessage('Leja nuk u ndryshua. Kontrollo cilësimet e pajisjes.'); }
    finally { permissionLock.current = false; setBusy(false); setRevision(n => n + 1); }
  }
  return <GpsContext.Provider value={{ state, needed, busy, requestForeground: () => request(false), requestBackground: () => request(true) }}>{children}</GpsContext.Provider>;
}
export function useRiderGps() { const context = useContext(GpsContext); if (!context) throw new Error('RiderGpsProvider missing'); return context; }

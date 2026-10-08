import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '../auth/provider';
import { queryClient, sessions } from '../auth/runtime';
import { env } from '../config/env';
import { riderKey } from '../features/rider/hooks';
import { businessKey } from '../features/business/hooks';
import { createNotificationObserver } from './domain';
import { createOrdersChannel, pushRegistration, pushStore } from './native';
import type { PushStatus } from './registration';
const PushContext = createContext<{ status: PushStatus; enabled: boolean; request: () => void }>({ status: 'idle', enabled: false, request: () => {} });
export function PushProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth(); const navigation = useRootNavigationState();
  const status = useSyncExternalStore(pushStore.subscribe, pushStore.get, pushStore.get);
  const enabled = env.pushRegistration && session?.role === 'RIDER';
  useEffect(() => { void createOrdersChannel().catch(() => undefined); }, []);
  useEffect(() => {
    if (!ready || !navigation?.key) return;
    const token = session?.account.token;
    const observer = createNotificationObserver({ session: sessions.getSession, token,
      refresh: current => { void queryClient.invalidateQueries({ queryKey: current.role === 'RIDER' ? riderKey(current.account.id) : businessKey(current.account.id) }); },
      navigate: target => router.replace(target),
    });
    const response = (value: Notifications.NotificationResponse) => {
      // Consume cold-start responses once; never carry them across login changes.
      Notifications.clearLastNotificationResponse();
      observer.tapped(value.notification.request.identifier, value.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER);
    };
    const received = Notifications.addNotificationReceivedListener(observer.received);
    const tapped = Notifications.addNotificationResponseReceivedListener(response);
    const last = Notifications.getLastNotificationResponse(); if (last) response(last);
    const rotation = enabled ? Notifications.addPushTokenListener(nativeToken => { void pushRegistration.register({ requestPermission: false, nativeToken }); }) : null;
    if (enabled) void pushRegistration.register({ requestPermission: false });
    const appState = AppState.addEventListener('change', value => { if (value === 'active' && enabled) void pushRegistration.register({ requestPermission: false }); });
    return () => { observer.stop(); received.remove(); tapped.remove(); rotation?.remove(); appState.remove(); };
  }, [ready, navigation?.key, session?.account.token, enabled]);
  return <PushContext.Provider value={{ status, enabled, request: () => { if (enabled) void pushRegistration.register({ requestPermission: true }); } }}>{children}</PushContext.Provider>;
}
export const usePush = () => useContext(PushContext);

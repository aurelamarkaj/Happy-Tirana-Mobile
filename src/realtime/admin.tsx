import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/provider';
import { queryClient, sessions } from '../auth/runtime';
import { env, requireHttpsUrl } from '../config/env';

const adminEvents = [
  'business_category.created', 'business.created', 'business.updated', 'business.deleted',
  'rider.created', 'rider.updated', 'rider.deleted', 'rider.balance_changed', 'rider.location_updated',
  'zone.created', 'zone.updated', 'zone.deleted',
  'order.created', 'order.offered', 'order.accepted', 'order.status_changed', 'order.offer_rejected',
];

export function AdminRealtime() {
  const { session } = useAuth();
  useEffect(() => {
    if (session?.role !== 'ADMIN' || !env.apiBaseUrl) return;
    let base: string;
    try { base = new URL(requireHttpsUrl(env.apiBaseUrl, 'EXPO_PUBLIC_API_BASE_URL')).origin; } catch { return; }
    const socket = io(base, { autoConnect: false, withCredentials: false, path: env.socketPath });
    const refresh = () => {
      if (sessions.getSession()?.account.token === session.account.token) void queryClient.invalidateQueries({ queryKey: ['admin'] });
    };
    socket.on('connect', () => {
      socket.timeout(8000).emit('admin.join', session.account.token, (error: Error | null, ok: boolean) => {
        if (!error && !ok) void sessions.logout(session.account.token).catch(() => undefined);
        if (!error && ok) refresh();
      });
    });
    adminEvents.forEach(event => socket.on(event, refresh));
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { socket.connect(); refresh(); } else socket.disconnect();
    });
    if (AppState.currentState !== 'background') socket.connect();
    return () => { subscription.remove(); socket.removeAllListeners(); socket.disconnect(); };
  }, [session?.role, session?.account.id, session?.account.token]);
  return null;
}

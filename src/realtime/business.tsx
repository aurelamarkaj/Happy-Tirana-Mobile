import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/provider';
import { queryClient, sessions } from '../auth/runtime';
import { env, requireHttpsUrl } from '../config/env';
import { businessKey } from '../features/business/hooks';
export function BusinessRealtime() {
  const { session } = useAuth();
  useEffect(() => {
    if (session?.role !== 'BUSINESS' || !env.apiBaseUrl) return;
    let base: string; try { base = new URL(requireHttpsUrl(env.apiBaseUrl, 'EXPO_PUBLIC_API_BASE_URL')).origin; } catch { return; }
    const socket = io(base, { autoConnect: false, withCredentials: false, path: env.socketPath });
    const refresh = () => { if (sessions.getSession()?.account.token === session.account.token) void queryClient.invalidateQueries({ queryKey: businessKey(session.account.id) }); };
    socket.on('connect', () => { socket.timeout(8000).emit('business.join', session.account.token, (error: Error | null, ok: boolean) => { if (!error && !ok) void sessions.logout(session.account.token).catch(() => undefined); if (!error && ok) refresh(); }); });
    ['order.created', 'order.offered', 'order.accepted', 'order.status_changed'].forEach(event => socket.on(event, refresh));
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { socket.connect(); refresh(); } else socket.disconnect(); });
    if (AppState.currentState !== 'background') socket.connect();
    return () => { sub.remove(); socket.removeAllListeners(); socket.disconnect(); };
  }, [session?.role, session?.account.id, session?.account.token]);
  return null;
}

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/provider';
import { queryClient, sessions } from '../../auth/runtime';
import { getBusinessDashboard, getBusinessOrderPage, getOrderWindow } from '../../api/business';
export const businessKey = (id?: string) => ['business', id] as const;
export function useBusinessData() {
  const { session } = useAuth();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => { const sub = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => sub.remove(); }, []);
  const enabled = session?.role === 'BUSINESS' && foreground;
  const dashboard = useQuery({ queryKey: [...businessKey(session?.account.id), 'dashboard'], queryFn: ({ signal }) => getBusinessDashboard(signal), enabled, refetchInterval: foreground ? 15_000 : false });
  const window = useQuery({ queryKey: [...businessKey(session?.account.id), 'window'], queryFn: ({ signal }) => getOrderWindow(signal), enabled, refetchInterval: query => foreground ? Math.max(1000, Math.min(15_000, (query.state.data?.nextCheckInSeconds ?? 15) * 1000)) : false });
  useEffect(() => { if (enabled) void queryClient.invalidateQueries({ queryKey: businessKey(session?.account.id) }); }, [enabled, session?.account.id]);
  return { dashboard, window };
}
export function useBusinessHistory() {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: [...businessKey(session?.account.id), 'history'],
    queryFn: ({ pageParam, signal }) => getBusinessOrderPage(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: session?.role === 'BUSINESS',
  });
}
export function useBusinessAction<T, R>(action: (input: T) => Promise<R>) {
  const { session } = useAuth(); const token = session?.account.token;
  return useMutation({ mutationFn: action, retry: false, onSettled: async () => { if (token && sessions.getSession()?.account.token === token) await queryClient.invalidateQueries({ queryKey: businessKey(session?.account.id) }); } });
}

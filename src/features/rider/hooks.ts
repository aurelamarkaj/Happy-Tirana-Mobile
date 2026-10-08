import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/provider';
import { queryClient, sessions } from '../../auth/runtime';
import { getRiderDashboard, getRiderOrderPage } from '../../api/rider';

export const riderKey = (id?: string) => ['rider', id] as const;
export const riderDashboardKey = (id?: string) => [...riderKey(id), 'dashboard'] as const;
export function useRiderDashboard() {
  const { session } = useAuth();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);
  const query = useQuery({ queryKey: riderDashboardKey(session?.account.id), queryFn: ({ signal }) => getRiderDashboard(signal), enabled: session?.role === 'RIDER' && foreground, refetchInterval: foreground ? 15_000 : false });
  useEffect(() => { if (foreground && session?.role === 'RIDER') void queryClient.invalidateQueries({ queryKey: riderKey(session.account.id) }); }, [foreground, session?.role, session?.account.id]);
  return query;
}
export function useRiderHistory() {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: [...riderKey(session?.account.id), 'history'],
    queryFn: ({ pageParam, signal }) => getRiderOrderPage(pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: session?.role === 'RIDER',
  });
}
export function useRiderAction<T>(action: (input: T) => Promise<unknown>) {
  const { session } = useAuth();
  const token = session?.account.token;
  const id = session?.account.id;
  return useMutation({
    mutationFn: action,
    // Invalidate after failures too: response may have been lost after server commit.
    onSettled: async () => {
      if (token && token === sessions.getSession()?.account.token) {
        await queryClient.invalidateQueries({ queryKey: riderKey(id) });
      }
    },
  });
}

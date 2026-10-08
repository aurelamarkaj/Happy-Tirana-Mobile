import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { sessions, watchSessionExpiry, restoreSessionOnce } from './runtime';
import type { Session } from '../contracts/auth';

const AuthContext = createContext<{ session: Session | null; ready: boolean; error: string | null }>({ session: null, ready: false, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(sessions.subscribe, sessions.getSession, () => null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void restoreSessionOnce().catch(() => {
      if (mounted) setError('Sesioni nuk u lexua nga ruajtja e sigurt. Mbyll dhe rihap aplikacionin.');
    }).finally(() => { if (mounted) setReady(true); });
    const stop = watchSessionExpiry(() => {
      if (mounted) setError('Sesioni u mbyll, por pastrimi i ruajtjes së sigurt dështoi. Rihap aplikacionin.');
    });
    return () => { mounted = false; stop(); };
  }, []);
  return <AuthContext.Provider value={{ session, ready, error }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

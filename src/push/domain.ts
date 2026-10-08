import { sessionExpired, type Session } from '../contracts/auth';
export function notificationTarget(session: Session | null) {
  if (!session || sessionExpired(session)) return null;
  return session.role === 'RIDER' ? '/(rider)/dashboard' as const : '/(business)/orders' as const;
}
export function canPresentNotification(session: Session | null) { return notificationTarget(session) !== null; }
// Notification contents never authorize navigation URLs or order actions.
export function createNotificationObserver(options: {
  session: () => Session | null; token: string | undefined;
  refresh: (session: Session) => void;
  navigate: (target: NonNullable<ReturnType<typeof notificationTarget>>) => void;
}) {
  let active = true; const handled = new Set<string>();
  const current = () => { const session = options.session(); return active && options.token && session?.account.token === options.token && notificationTarget(session) ? session : null; };
  return {
    received: () => { const session = current(); if (session) options.refresh(session); },
    tapped: (identifier: string, isDefaultAction: boolean) => {
      const session = current(); if (!session || !isDefaultAction || handled.has(identifier)) return;
      handled.add(identifier); options.refresh(session); options.navigate(notificationTarget(session)!);
    },
    stop: () => { active = false; handled.clear(); },
  };
}

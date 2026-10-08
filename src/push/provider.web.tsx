import type { ReactNode } from 'react';
export function PushProvider({ children }: { children: ReactNode }) { return children; }
export function usePush() { return { status: 'disabled' as const, enabled: false, request: () => {} }; }

import type { ReactNode } from 'react';
export function RiderGpsProvider({ children }: { children: ReactNode }) { return children; }
export function useRiderGps() { return { state: { location: null, accuracy: null, fixAt: null, sentAt: null, mode: 'stopped' as const, message: 'GPS live përdoret në Android/iOS.' }, needed: false, busy: false, requestForeground: async () => {}, requestBackground: async () => {} }; }

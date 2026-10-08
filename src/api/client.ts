import type { Session } from '../contracts/auth';
import { requireHttpsUrl } from '../config/env';

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
    this.name = 'ApiError';
  }
}

type ClientOptions = {
  baseUrl: string;
  getSession: () => Session | null;
  onUnauthorized: (token: string) => Promise<void>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

export function createApiClient(options: ClientOptions) {
  return async function request<T>(path: string, init: RequestInit = {}, authenticated = true, timeoutMs?: number): Promise<T> {
    const base = requireHttpsUrl(options.baseUrl, 'EXPO_PUBLIC_API_BASE_URL');
    const session = authenticated ? options.getSession() : null;
    if (authenticated && !session) throw new ApiError(401, 'LOGIN_REQUIRED');
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (init.signal?.aborted) controller.abort();
    init.signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? options.timeoutMs ?? 12_000);
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (session) headers.set('Authorization', `Bearer ${session.account.token}`);
    try {
      const response = await (options.fetcher ?? fetch)(`${base}${path}`, {
        ...init, headers, signal: controller.signal, credentials: 'omit',
      });
      if (!response.ok) {
        let code = `HTTP_${response.status}`;
        try {
          const body: unknown = await response.json();
          if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') code = body.error;
        } catch { /* Never display raw server HTML or internals. */ }
        if (response.status === 401 && session) await options.onUnauthorized(session.account.token);
        throw new ApiError(response.status, code);
      }
      return await response.json() as T;
    } catch (error) {
      if (controller.signal.aborted && !init.signal?.aborted) throw new ApiError(408, 'API_TIMEOUT');
      throw error;
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener('abort', abort);
    }
  };
}

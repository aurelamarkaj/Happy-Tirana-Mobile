import { describe, expect, it, vi } from 'vitest';
import { loginSchema, sessionExpired, type Session } from '../src/contracts/auth';
import { SessionManager, type SessionStorage } from '../src/auth/session-manager';
import { createApiClient } from '../src/api/client';

const id = '10000000-0000-4000-8000-000000000001';
function session(role: Session['role'] = 'RIDER', suffix = ''): Session {
  return { role, account: { id, name: 'Test', token: `${id}.${Math.floor(Date.now() / 1000) + 3600}.signature${suffix}` } };
}
function memoryStorage(initial: string | null = null): SessionStorage {
  let value = initial;
  return { read: async () => value, write: async raw => { value = raw; }, remove: async () => { value = null; } };
}
describe('Existing login contracts', () => {
  it('uses distinct minimum passwords and trims only the email', () => {
    expect(loginSchema('RIDER').parse({ email: ' test@example.com ', password: ' 12 ' })).toEqual({ email: 'test@example.com', password: ' 12 ' });
    expect(loginSchema('BUSINESS').safeParse({ email: 'test@example.com', password: '1234' }).success).toBe(false);
    expect(loginSchema('ADMIN').safeParse({ email: 'test@example.com', password: '1234' }).success).toBe(false);
  });
  it('expires the actual non-JWT token format', () => {
    const valid = session();
    expect(sessionExpired(valid)).toBe(false);
    expect(sessionExpired(valid, Date.now() + 7_200_000)).toBe(true);
    expect(sessionExpired({ ...valid, account: { ...valid.account, token: 'invalid' } })).toBe(true);
  });
});
describe('Secure session lifecycle', () => {
  it('restores the selected role after restarting', async () => {
    const storage = memoryStorage();
    const first = new SessionManager(storage, vi.fn());
    await first.save(session('BUSINESS'), first.getRevision());
    const restarted = new SessionManager(storage, vi.fn());
    await restarted.restore();
    expect(restarted.getSession()?.role).toBe('BUSINESS');
  });
  it('restores an administrator session after restarting', async () => {
    const storage = memoryStorage();
    const first = new SessionManager(storage, vi.fn());
    await first.save(session('ADMIN'), first.getRevision());
    const restarted = new SessionManager(storage, vi.fn());
    await restarted.restore();
    expect(restarted.getSession()?.role).toBe('ADMIN');
  });
  it('removes corrupted or expired saved data', async () => {
    const storage = memoryStorage('{broken');
    const manager = new SessionManager(storage, vi.fn());
    await manager.restore();
    expect(await storage.read()).toBeNull();
    expect(manager.getSession()).toBeNull();
  });
  it('does not enter an authenticated state if SecureStore write fails', async () => {
    const storage = memoryStorage();
    storage.write = async () => { throw new Error('storage failure'); };
    const manager = new SessionManager(storage, vi.fn());
    await expect(manager.save(session(), manager.getRevision())).rejects.toThrow();
    expect(manager.getSession()).toBeNull();
  });
  it('ignores an old 401 after a new login and clears cache for the current 401', async () => {
    const clear = vi.fn();
    const storage = memoryStorage();
    const manager = new SessionManager(storage, clear);
    const old = session();
    await manager.save(old, manager.getRevision());
    const current = session('BUSINESS', '-new');
    await manager.save(current, manager.getRevision());
    clear.mockClear();
    await manager.logout(old.account.token);
    expect(manager.getSession()).toEqual(current);
    expect(clear).not.toHaveBeenCalled();
    await manager.logout(current.account.token);
    expect(manager.getSession()).toBeNull();
    expect(manager.getExpiredRole()).toBe('BUSINESS');
    expect(await storage.read()).toBeNull();
    expect(clear).toHaveBeenCalledOnce();
  });
  it('does not save a late login response after logout', async () => {
    const manager = new SessionManager(memoryStorage(), vi.fn());
    const revision = manager.getRevision();
    await manager.logout();
    await expect(manager.save(session(), revision)).rejects.toThrow();
  });
});
describe('HTTPS Bearer client', () => {
  it('sends Bearer and invalidates the same session on 401', async () => {
    const current = session();
    const unauthorized = vi.fn(async () => {});
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: 'RIDER_AUTH_REQUIRED' }), { status: 401 }));
    const api = createApiClient({ baseUrl: 'https://api.example.com/', getSession: () => current, onUnauthorized: unauthorized, fetcher });
    await expect(api('/riders/test/dashboard')).rejects.toMatchObject({ status: 401, code: 'RIDER_AUTH_REQUIRED' });
    const args = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(args[0]).toBe('https://api.example.com/riders/test/dashboard');
    expect(new Headers(args[1].headers).get('Authorization')).toBe(`Bearer ${current.account.token}`);
    expect(args[1].credentials).toBe('omit');
    expect(unauthorized).toHaveBeenCalledWith(current.account.token);
  });
  it('never attaches a saved Bearer to login or logs out on invalid credentials', async () => {
    const unauthorized = vi.fn(async () => {});
    const fetcher = vi.fn(async () => new Response('{}', { status: 401 }));
    const api = createApiClient({ baseUrl: 'https://api.example.com', getSession: () => session(), onUnauthorized: unauthorized, fetcher });
    await expect(api('/riders/auth/login', { method: 'POST' }, false)).rejects.toMatchObject({ status: 401 });
    const args = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(args[1].headers).has('Authorization')).toBe(false);
    expect(unauthorized).not.toHaveBeenCalled();
  });
  it.each(['', 'http://api.example.com', 'https://user:pass@api.example.com'])('rejects unsafe or missing base URL %s before network access', async baseUrl => {
    const fetcher = vi.fn();
    const api = createApiClient({ baseUrl, getSession: () => null, onUnauthorized: vi.fn(), fetcher });
    await expect(api('/riders/auth/login', {}, false)).rejects.toThrow('EXPO_PUBLIC_API_BASE_URL');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

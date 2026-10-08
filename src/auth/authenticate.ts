import { ApiError } from '../api/client';
import { accountSchema, loginSchema, type LoginInput, type Session } from '../contracts/auth';

type Request = <T>(path: string, init: RequestInit, authenticated: boolean) => Promise<T>;

// Existing API has separate logins. Only invalid-credential responses allow fallback.
export async function authenticate(input: LoginInput, request: Request, adminDeviceId?: string): Promise<Session> {
  const body = loginSchema('RIDER').parse(input);
  const init = { method: 'POST', body: JSON.stringify(body) };
  try {
    const data = await request<{ rider: unknown }>('/riders/auth/login', init, false);
    return { role: 'RIDER', account: accountSchema.parse(data.rider) };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401 && error.code === 'INVALID_RIDER_LOGIN')) throw error;
  }
  if (body.password.length < 6) throw new ApiError(401, 'INVALID_LOGIN');
  try {
    const data = await request<{ business: unknown }>('/businesses/auth/login', init, false);
    return { role: 'BUSINESS', account: accountSchema.parse(data.business) };
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401 && error.code === 'INVALID_BUSINESS_LOGIN')) throw error;
  }
  const adminInit = { method: 'POST', body: JSON.stringify({ ...body, ...(adminDeviceId ? { deviceId: adminDeviceId } : {}) }) };
  const data = await request<{ admin: unknown }>('/admin/auth/login', adminInit, false);
  return { role: 'ADMIN', account: accountSchema.parse(data.admin) };
}

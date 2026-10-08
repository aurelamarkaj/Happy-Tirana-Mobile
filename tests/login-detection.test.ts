import { describe, expect, it, vi } from 'vitest';
import { authenticate } from '../src/auth/authenticate';
import { ApiError } from '../src/api/client';

const account = { id: '10000000-0000-4000-8000-000000000001', name: 'Test', token: 'opaque' };
const credentials = { email: 'test@example.com', password: 'secret' };
describe('Automatic role via existing API', () => {
  it('uses the rider response without probing another account', async () => {
    const request = vi.fn().mockResolvedValue({ rider: account });
    expect((await authenticate(credentials, request)).role).toBe('RIDER');
    expect(request).toHaveBeenCalledOnce();
  });
  it('uses business login only after explicitly invalid rider credentials', async () => {
    const request = vi.fn().mockRejectedValueOnce(new ApiError(401, 'INVALID_RIDER_LOGIN')).mockResolvedValueOnce({ business: account });
    expect((await authenticate(credentials, request)).role).toBe('BUSINESS');
    expect(request.mock.calls[1]?.[0]).toBe('/businesses/auth/login');
  });
  it('uses admin login only after explicitly invalid rider and business credentials', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new ApiError(401, 'INVALID_RIDER_LOGIN'))
      .mockRejectedValueOnce(new ApiError(401, 'INVALID_BUSINESS_LOGIN'))
      .mockResolvedValueOnce({ admin: account });
    expect((await authenticate(credentials, request, 'mobile-device-2')).role).toBe('ADMIN');
    expect(request.mock.calls[2]?.[0]).toBe('/admin/auth/login');
    expect(JSON.parse(request.mock.calls[2]?.[1].body)).toEqual({ ...credentials, deviceId: 'mobile-device-2' });
    expect(request).toHaveBeenCalledTimes(3);
  });
  it.each([new ApiError(403, 'RIDER_SUSPENDED'), new ApiError(500, 'ERROR'), new ApiError(408, 'API_TIMEOUT'), new ApiError(401, 'OTHER_ERROR')])('does not hide suspended accounts or service failures', async error => {
    const request = vi.fn().mockRejectedValue(error);
    await expect(authenticate(credentials, request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledOnce();
  });
  it('does not send an invalid short password to business login', async () => {
    const request = vi.fn().mockRejectedValue(new ApiError(401, 'INVALID_RIDER_LOGIN'));
    await expect(authenticate({ ...credentials, password: '1234' }, request)).rejects.toMatchObject({ status: 401 });
    expect(request).toHaveBeenCalledOnce();
  });
});

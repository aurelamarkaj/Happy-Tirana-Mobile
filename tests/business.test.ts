import { describe, expect, it, vi, beforeEach } from 'vitest';
import { businessOrderFormSchema, businessOrderSchema, businessQuoteSchema, isGoogleMapsUrl, normalizeGoogleMapsUrl, prepareGoogleMapsUrl } from '../src/contracts/business-order';
import { isCurrentRequest, isHistory, searchOrders } from '../src/features/business/domain';
import type { BusinessOrder } from '../src/contracts/business';
import { ApiError } from '../src/api/client';
const runtime = vi.hoisted(() => ({ api: vi.fn(), getSession: vi.fn(), logout: vi.fn() }));
vi.mock('../src/auth/runtime', () => ({ api: runtime.api, sessions: { getSession: runtime.getSession, logout: runtime.logout } }));
import { createOrder, getBusinessDashboard, getBusinessOrderPage, previewLocation, quoteOrder } from '../src/api/business';
const form = { customerName: 'Ana', customerPhone: '+355 69 123 4567', googleMapsUrl: 'https://maps.google.com/?q=41.3,19.8', readyMinutes: '10', orderValue: '-12,50', productDescription: '' };
describe('Business order contract', () => {
  it('allows signed amounts, decimal commas and converts minutes only at the boundary', () => {
    const values = businessOrderFormSchema.parse(form);
    expect(values.orderValue).toBe(-12.5); expect(values.readyMinutes).toBe(10);
    expect(businessOrderSchema.parse(values).customerPhone).toBe(form.customerPhone);
  });
  it('rejects missing/out-of-range minutes, invalid phone and more than two decimals', () => {
    for (const change of [{ readyMinutes: '' }, { readyMinutes: '181' }, { readyMinutes: '1.5' }, { customerPhone: '------' }, { orderValue: '1.234' }, { orderValue: '99999999' }]) expect(businessOrderFormSchema.safeParse({ ...form, ...change }).success).toBe(false);
  });
  it('rejects deceptive hosts, HTTP, embedded credentials and non-Maps paths', () => {
    for (const url of ['https://maps.google.com.evil.test', 'https://user:pass@maps.google.com', 'https://google.com/search', 'https://maps.google.com:8080']) expect(isGoogleMapsUrl(url)).toBe(false);
    expect(isGoogleMapsUrl('https://www.google.com/maps/place/Tirana')).toBe(true);
  });
  it('accepts the localized, custom and app Google Maps links supported by the web backend', () => {
    for (const url of [
      'https://www.google.al/maps/place/Tirana',
      'https://maps.google.co.uk/?q=41.3275,19.8187',
      'https://g.page/r/example',
      'https://goo.gl/maps/example',
      'http://maps.google.com/?q=41.3275,19.8187',
      'geo:41.3275,19.8187?q=41.3275,19.8187',
      'comgooglemaps://?q=41.3275,19.8187',
    ]) expect(isGoogleMapsUrl(url), url).toBe(true);
  });
  it('canonicalizes localized, HTTP and app links for the older production validator', () => {
    expect(normalizeGoogleMapsUrl('https://www.google.al/maps?q=41.3,19.8')).toBe('https://www.google.com/maps?q=41.3,19.8');
    expect(normalizeGoogleMapsUrl('http://maps.google.com/?q=41.3,19.8')).toBe('https://maps.google.com/?q=41.3,19.8');
    expect(normalizeGoogleMapsUrl('geo:41.3,19.8?q=41.3,19.8')).toBe('https://www.google.com/maps?q=41.3%2C19.8');
    expect(normalizeGoogleMapsUrl('https://www.google.al/maps/place/41.3275,19.8187')).toBe('https://www.google.com/maps?q=41.3275%2C19.8187');
    expect(normalizeGoogleMapsUrl('https://www.google.com/maps/place/Tirana/@41.3275,19.8187,15z')).toBe('https://www.google.com/maps?q=41.3275%2C19.8187');
    expect(normalizeGoogleMapsUrl('https://www.google.com/maps/search/41.345296,+19.836633')).toBe('https://www.google.com/maps?q=41.345296%2C19.836633');
    expect(businessQuoteSchema.parse({ googleMapsUrl: 'https://www.google.al/maps?q=41.3,19.8' }).googleMapsUrl).toBe('https://www.google.com/maps?q=41.3,19.8');
  });
  it('expands Google Maps short links and canonicalizes their destination', async () => {
    const fetcher = vi.fn().mockResolvedValue({ url: 'https://www.google.com/maps/search/41.345296,+19.836633?entry=tts' });
    await expect(prepareGoogleMapsUrl('https://maps.app.goo.gl/NzWBqJ3b2q6ZSLZe8', fetcher as unknown as typeof fetch))
      .resolves.toBe('https://www.google.com/maps?q=41.345296%2C19.836633');
    expect(fetcher).toHaveBeenCalledWith('https://maps.app.goo.gl/NzWBqJ3b2q6ZSLZe8', expect.objectContaining({ redirect: 'follow', credentials: 'omit' }));
  });
  it('rejects stale responses even when a link changes A → B → A', () => {
    expect(isCurrentRequest({ revision: 1, url: 'A' }, { revision: 3, url: 'A' })).toBe(false);
    expect(isCurrentRequest({ revision: 3, url: 'A' }, { revision: 3, url: 'A' })).toBe(true);
  });
  it('keeps only delivered/cancelled history and searches nullable fields', () => {
    const orders = [{ code: 'HT-1', status: 'DELIVERED', customerName: null, customerPhone: null, deliveryAddress: 'Tirana' }, { code: 'HT-2', status: 'ACCEPTED', customerName: 'Ana' }] as BusinessOrder[];
    expect(orders.filter(isHistory)).toHaveLength(1); expect(searchOrders(orders, ' tirana ')).toHaveLength(1);
  });
});
describe('Business requests', () => {
  beforeEach(() => { vi.resetAllMocks(); runtime.getSession.mockReturnValue({ role: 'BUSINESS', account: { id: 'business-id', token: 'session-token' } }); runtime.api.mockResolvedValue({}); });
  it('uses the authenticated business ID and server numeric fields when creating', async () => {
    const values = businessOrderFormSchema.parse(form); await createOrder(values);
    expect(runtime.api).toHaveBeenCalledWith('/businesses/business-id/orders', { method: 'POST', body: expect.any(String) }, true, 30_000);
    expect(JSON.parse(runtime.api.mock.calls[0]![1].body)).toEqual(values);
  });
  it('keeps location preview and quote separate and retains the Google Maps source', async () => {
    await previewLocation(form.googleMapsUrl); await quoteOrder({ googleMapsUrl: form.googleMapsUrl, lat: 41.3, lng: 19.8, addressText: 'Tirana' });
    expect(runtime.api.mock.calls[0]![0]).toBe('/businesses/business-id/orders/location');
    expect(runtime.api.mock.calls[1]![0]).toBe('/businesses/business-id/orders/quote');
    expect(JSON.parse(runtime.api.mock.calls[1]![1].body).googleMapsUrl).toBe(form.googleMapsUrl);
  });
  it('requests stable cursor pagination for the complete business history', async () => {
    await getBusinessOrderPage('opaque cursor', undefined, 20);
    expect(runtime.api).toHaveBeenCalledWith('/businesses/business-id/orders?limit=20&status=DELIVERED%2CCANCELLED&cursor=opaque+cursor', { signal: undefined });
  });
  it('rejects other roles before sending a business request', async () => {
    runtime.getSession.mockReturnValue({ role: 'RIDER', account: { id: 'rider' } });
    await expect(getBusinessDashboard()).rejects.toMatchObject({ status: 401 }); expect(runtime.api).not.toHaveBeenCalled();
  });
  it('invalidates a deleted business session using its original token', async () => {
    runtime.api.mockRejectedValue(new ApiError(404, 'BUSINESS_NOT_FOUND'));
    await expect(getBusinessDashboard()).rejects.toThrow('BUSINESS_NOT_FOUND'); expect(runtime.logout).toHaveBeenCalledWith('session-token');
  });
});

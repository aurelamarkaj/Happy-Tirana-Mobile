import { api, sessions } from '../auth/runtime';
import { ApiError } from './client';
import type { BusinessDashboard, BusinessOrder, BusinessOrderPage, BusinessOrderQuote } from '../contracts/business';
import { businessOrderSchema, businessQuoteSchema, prepareGoogleMapsUrl, type BusinessOrderInput } from '../contracts/business-order';
export interface LocationPreview { lat: number; lng: number; addressText: string; originalUrl: string }
export interface OrderWindow { isOpen: boolean; nextCheckInSeconds: number; serverTime: string }
function businessId() { const session = sessions.getSession(); if (session?.role !== 'BUSINESS') throw new ApiError(401, 'BUSINESS_LOGIN_REQUIRED'); return encodeURIComponent(session.account.id); }
export async function getBusinessDashboard(signal?: AbortSignal) {
  const session = sessions.getSession();
  try { return await api<BusinessDashboard>(`/businesses/${businessId()}/dashboard`, { signal }); }
  catch (error) { if (error instanceof ApiError && error.status === 404 && error.code === 'BUSINESS_NOT_FOUND' && session) await sessions.logout(session.account.token); throw error; }
}
export function getBusinessOrderPage(cursor?: string, signal?: AbortSignal, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit), status: 'DELIVERED,CANCELLED' });
  if (cursor) params.set('cursor', cursor);
  return api<BusinessOrderPage>(`/businesses/${businessId()}/orders?${params}`, { signal });
}
export function getOrderWindow(signal?: AbortSignal) { return api<OrderWindow>('/businesses/order-window', { signal }); }
export async function previewLocation(googleMapsUrl: string) {
  const preparedUrl = await prepareGoogleMapsUrl(googleMapsUrl);
  return api<{ location: LocationPreview }>(`/businesses/${businessId()}/orders/location`, { method: 'POST', body: JSON.stringify({ googleMapsUrl: preparedUrl }) }, true, 30_000);
}
export async function quoteOrder(input: { googleMapsUrl: string; lat: number; lng: number; addressText: string }) {
  const parsed = businessQuoteSchema.parse(input);
  parsed.googleMapsUrl = await prepareGoogleMapsUrl(parsed.googleMapsUrl);
  return api<{ quote: BusinessOrderQuote }>(`/businesses/${businessId()}/orders/quote`, { method: 'POST', body: JSON.stringify(parsed) }, true, 30_000);
}
export async function createOrder(input: BusinessOrderInput) {
  const parsed = businessOrderSchema.parse(input);
  parsed.googleMapsUrl = await prepareGoogleMapsUrl(parsed.googleMapsUrl);
  return api<{ order: BusinessOrder; offeredRiders: Array<{ id: string; name: string; distanceMeters: number | null; vehicleType?: string }>; dispatchScheduledFor: string; quote: BusinessOrderQuote }>(`/businesses/${businessId()}/orders`, { method: 'POST', body: JSON.stringify(parsed) }, true, 30_000);
}

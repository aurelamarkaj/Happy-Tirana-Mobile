import { api, sessions } from '../auth/runtime';
import { ApiError } from './client';
import type { RiderDashboard, RiderItinerary, RiderOrder, RiderOrderPage, RoutePoint } from '../contracts/rider';
import { riderLocationSchema, type RiderLocationInput } from '../contracts/location';

function riderId() {
  const session = sessions.getSession();
  if (session?.role !== 'RIDER') throw new ApiError(401, 'RIDER_LOGIN_REQUIRED');
  return session.account.id;
}
export async function getRiderDashboard(signal?: AbortSignal) {
  const session = sessions.getSession();
  try { return await api<RiderDashboard>(`/riders/${riderId()}/dashboard`, { signal }); }
  catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'RIDER_NOT_FOUND' && session) {
      await sessions.logout(session.account.token);
      throw new ApiError(401, 'RIDER_SESSION_EXPIRED');
    }
    throw error;
  }
}
export function getRiderOrderPage(cursor?: string, signal?: AbortSignal, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit), status: 'DELIVERED,CANCELLED' });
  if (cursor) params.set('cursor', cursor);
  return api<RiderOrderPage>(`/riders/${encodeURIComponent(riderId())}/orders?${params}`, { signal });
}
export function setAvailability(isOnline: boolean) {
  return api<RiderDashboard>(`/riders/${riderId()}/availability`, { method: 'POST', body: JSON.stringify({ isOnline }) });
}
export function acceptOrder(id: string) {
  return api<RiderOrder>(`/orders/${id}/accept`, { method: 'POST', body: JSON.stringify({ riderId: riderId() }) });
}
export function rejectOrder(id: string) {
  return api<{ ok: true }>(`/orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ riderId: riderId() }) });
}
export function updateOrderStatus(id: string, status: 'PICKED_UP' | 'DELIVERED') {
  return api<RiderOrder>(`/riders/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ riderId: riderId(), status }) });
}
export function getRoute(order: RiderOrder, signal?: AbortSignal) {
  const params = new URLSearchParams({ fromLat: String(order.pickupLat), fromLng: String(order.pickupLng), toLat: String(order.dropoffLat), toLng: String(order.dropoffLng) });
  return api<{ coordinates: RoutePoint[]; distanceMeters: number; durationSeconds: number }>(`/public/routes?${params}`, { signal });
}
export function getRiderItinerary(origin: RoutePoint, signal?: AbortSignal) {
  return api<RiderItinerary>(`/riders/${riderId()}/itinerary`, { method: 'POST', body: JSON.stringify(origin), signal }, true, 30_000);
}
export function sendRiderLocation(input: RiderLocationInput, signal?: AbortSignal, expectedToken?: string) {
  if (expectedToken && sessions.getSession()?.account.token !== expectedToken) throw new ApiError(401, 'RIDER_SESSION_CHANGED');
  const body = riderLocationSchema.parse({ ...input, riderId: riderId(), orderId: input.orderId ?? null });
  return api<{ ok: true }>('/riders/me/location', { method: 'POST', body: JSON.stringify(body), signal });
}

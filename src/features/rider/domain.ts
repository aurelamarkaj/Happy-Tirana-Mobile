import type { RiderDashboard, RiderOrder } from '../../contracts/rider';
import { ApiError } from '../../api/client';

export function formatLek(value: number) { return new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 2 }).format(value) + ' ALL'; }
export const statusLabels = { CREATED: 'Krijuar', OFFERED: 'E re', ACCEPTED: 'Pranuar', PICKED_UP: 'Marrë', DELIVERED: 'Dorëzuar', CANCELLED: 'Anuluar' };
export function activeOrders(data: RiderDashboard) { return data.activeOrders ?? (data.activeOrder ? [data.activeOrder] : []); }
export function preparationRemainingMinutes(order: Pick<RiderOrder, 'createdAt' | 'readyMinutes'>, now = Date.now()) {
  const readyAt = Date.parse(order.createdAt) + order.readyMinutes * 60_000;
  if (!Number.isFinite(readyAt)) return null;
  return Math.max(0, Math.ceil((readyAt - now) / 60_000));
}
export function acceptBlocked(data: RiderDashboard, order: RiderOrder, now = Date.now()): string | null {
  if (!data.rider.isOnline) return 'Kalo online për të pranuar oferta.';
  if (data.rider.isDebitBlocked) return 'Limiti i debitit është arritur.';
  if (!data.operationalDay || !data.operationalWindow.isOpen) return 'Pranimi i porosive është mbyllur.';
  if (activeOrders(data).length >= data.maxActiveOrders) return 'Ke arritur limitin e porosive aktive.';
  if (order.offerExpiresAt && Date.parse(order.offerExpiresAt) <= now) return 'Oferta ka skaduar.';
  return null;
}
// Same pickup/dropoff destinations as rider-app/lib/navigation.ts, without GPS in B.
export function navigationUrl(order: RiderOrder, location?: { lat: number; lng: number } | null): string | null {
  if (!['ACCEPTED', 'PICKED_UP'].includes(order.status)) return null;
  const collected = order.status === 'PICKED_UP';
  const destination = `${order.dropoffLat},${order.dropoffLng}`;
  const params = new URLSearchParams({ api: '1', travelmode: 'driving', dir_action: 'navigate', destination });
  const origin = location ?? (collected ? { lat: order.pickupLat, lng: order.pickupLng } : null);
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  if (!collected) params.set('waypoints', `${order.pickupLat},${order.pickupLng}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
export function riderError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('Konfiguro ')) return error.message;
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      RIDER_MUST_BE_ONLINE_TO_ACCEPT: 'Duhet të jesh online për të pranuar.',
      RIDER_DEBIT_LIMIT_REACHED: 'Debiti ka arritur limitin. Kontakto administratorin.',
      RIDER_ORDER_CAPACITY_REACHED: 'Ke arritur limitin e porosive aktive.',
      INVALID_ORDER_STATUS_TRANSITION: 'Statusi ka ndryshuar. Rifresko porosinë.',
      OFFER_NOT_FOUND: 'Oferta nuk është më e disponueshme.',
      API_TIMEOUT: 'API-ja nuk u përgjigj në kohë. Rifresko për të kontrolluar nëse veprimi u krye.',
    };
    if (messages[error.code]) return messages[error.code]!;
    if (error.status === 409) return 'Porosia ka ndryshuar ose është pranuar nga një motorrist tjetër.';
    if (error.status === 403) return 'Veprimi nuk lejohet për momentin. Kontrollo orarin dhe gjendjen e llogarisë.';
  }
  return 'Veprimi nuk u krye. Rifresko të dhënat dhe provo përsëri.';
}

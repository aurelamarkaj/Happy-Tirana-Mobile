import { ApiError } from '../../api/client';
import type { BusinessOrder } from '../../contracts/business';
export const isHistory = (order: BusinessOrder) => ['DELIVERED', 'CANCELLED'].includes(order.status);
export function searchOrders(orders: BusinessOrder[], search: string) { const term = search.trim().toLocaleLowerCase(); return orders.filter(order => [order.code, order.customerName, order.customerPhone, order.deliveryAddress].some(value => value?.toLocaleLowerCase().includes(term))); }
export function isCurrentRequest(request: { revision: number; url: string }, current: { revision: number; url: string }) { return request.revision === current.revision && request.url === current.url; }
export function businessError(error: unknown) {
  if (error instanceof Error && error.message.startsWith('Konfiguro ')) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 408) return 'Përgjigjja vonoi. Kontrollo Porositë përpara se të provosh përsëri krijimin.';
    const messages: Record<string, string> = {
      ORDERING_CLOSED: 'Porositë pranohen çdo ditë nga 07:00 deri në 22:59.',
      TARIFF_ZONE_REQUIRED: 'Zona e tarifimit nuk është përcaktuar. Kontakto administratorin.',
      BUSINESS_OUTSIDE_COVERAGE: 'Biznesi është jashtë zonës së mbulimit.',
      BUSINESS_LOCATION_REQUIRED: 'Vendndodhja e biznesit mungon. Kontakto administratorin.',
      INVALID_GOOGLE_MAPS_LINK: 'Linku Google Maps nuk është i vlefshëm.',
      GOOGLE_MAPS_LOCATION_NOT_RESOLVED: 'Destinacioni nuk u gjet nga linku Google Maps.',
      DELIVERY_ZONE_NOT_FOUND: 'Destinacioni është jashtë zonës së lejuar të dërgesave.',
      DELIVERY_LOCATION_NOT_RESOLVED: 'Destinacioni nuk u gjet. Kontrollo linkun Google Maps.',
      GOOGLE_DIRECTIONS_ZERO_RESULTS: 'Nuk u gjet rrugë drejt destinacionit.',
      GOOGLE_DIRECTIONS_ROUTE_NOT_FOUND: 'Nuk u gjet rrugë drejt destinacionit.',
      GOOGLE_DIRECTIONS_OVER_DAILY_LIMIT: 'Llogaritja e transportit është përkohësisht e padisponueshme.',
      GOOGLE_DIRECTIONS_OVER_QUERY_LIMIT: 'Llogaritja e transportit është përkohësisht e padisponueshme.',
    };
    if (messages[error.code]) return messages[error.code]!;
    if (error.code.startsWith('GOOGLE_DIRECTIONS_')) return 'Itinerari nuk u llogarit. Provo përsëri pas pak.';
    if (error.status === 403) return 'Porositë nuk lejohen për momentin. Kontrollo orarin dhe llogarinë.';
    if (error.status === 400 || error.status === 422) return 'Kontrollo fushat, linkun Google Maps dhe zonën e mbulimit.';
    if (error.status === 409) return 'Gjendja ka ndryshuar. Rifresko dhe provo përsëri.';
  }
  return 'Kërkesa nuk u krye. Nëse po krijoje porosi, kontrollo listën përpara riprovimit.';
}

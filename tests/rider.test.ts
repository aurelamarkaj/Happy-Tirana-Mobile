import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptBlocked, navigationUrl, preparationRemainingMinutes } from '../src/features/rider/domain';
import type { RiderDashboard, RiderOrder } from '../src/contracts/rider';
const runtime = vi.hoisted(() => ({ api: vi.fn(), getSession: vi.fn() }));
vi.mock('../src/auth/runtime', () => ({ api: runtime.api, sessions: { getSession: runtime.getSession } }));
import { getRiderOrderPage } from '../src/api/rider';

// Partial fixtures include only fields read by these domain decisions.
const order = { id: 'order', status: 'ACCEPTED', pickupLat: 41.3, pickupLng: 19.8, dropoffLat: 41.4, dropoffLng: 19.9 } as RiderOrder;
const data = { rider: { isOnline: true, isDebitBlocked: false }, operationalDay: true, operationalWindow: { isOpen: true }, maxActiveOrders: 2, activeOrders: [] } as unknown as RiderDashboard;
describe('Rider workflow', () => {
  beforeEach(() => { vi.resetAllMocks(); runtime.getSession.mockReturnValue({ role: 'RIDER', account: { id: 'rider id', token: 'token' } }); runtime.api.mockResolvedValue({ items: [], nextCursor: null }); });
  it('uses capacity returned by API rather than a hardcoded count', () => {
    expect(acceptBlocked({ ...data, maxActiveOrders: 1, activeOrders: [order] }, order)).toContain('limitin');
    expect(acceptBlocked({ ...data, maxActiveOrders: 3, activeOrders: [order] }, order)).toBeNull();
  });
  it('blocks expired offers and offline/debit/closed states', () => {
    expect(acceptBlocked(data, { ...order, offerExpiresAt: '2020-01-01T00:00:00Z' })).toContain('skaduar');
    expect(acceptBlocked({ ...data, rider: { ...data.rider, isOnline: false } }, order)).not.toBeNull();
    expect(acceptBlocked({ ...data, rider: { ...data.rider, isDebitBlocked: true } }, order)).not.toBeNull();
    expect(acceptBlocked({ ...data, operationalWindow: { isOpen: false } }, order)).not.toBeNull();
  });
  it('navigates GPS → business → customer before collection and directly to customer after collection', () => {
    const pickup = new URL(navigationUrl(order)!);
    expect(pickup.searchParams.get('destination')).toBe('41.4,19.9');
    expect(pickup.searchParams.get('waypoints')).toBe('41.3,19.8');
    expect(pickup.searchParams.has('origin')).toBe(false);
    const fromGps = new URL(navigationUrl(order, { lat: 41.31, lng: 19.81 })!);
    expect(fromGps.searchParams.get('origin')).toBe('41.31,19.81');
    expect(fromGps.searchParams.get('waypoints')).toBe('41.3,19.8');
    const dropoff = new URL(navigationUrl({ ...order, status: 'PICKED_UP' })!);
    expect(dropoff.searchParams.get('destination')).toBe('41.4,19.9');
    expect(dropoff.searchParams.get('origin')).toBe('41.3,19.8');
    expect(dropoff.searchParams.has('waypoints')).toBe(false);
    expect(navigationUrl({ ...order, status: 'DELIVERED' })).toBeNull();
  });
  it('shows the live preparation countdown when an offer reaches the rider', () => {
    const createdAt = '2026-10-07T10:00:00.000Z';
    expect(preparationRemainingMinutes({ createdAt, readyMinutes: 20 } as RiderOrder, Date.parse('2026-10-07T10:15:00.000Z'))).toBe(5);
    expect(preparationRemainingMinutes({ createdAt, readyMinutes: 3 } as RiderOrder, Date.parse('2026-10-07T10:03:30.000Z'))).toBe(0);
  });
  it('requests stable cursor pagination for the complete rider history', async () => {
    await getRiderOrderPage('next/page', undefined, 20);
    expect(runtime.api).toHaveBeenCalledWith('/riders/rider%20id/orders?limit=20&status=DELIVERED%2CCANCELLED&cursor=next%2Fpage', { signal: undefined });
  });
});

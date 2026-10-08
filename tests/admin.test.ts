import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/runtime', () => ({ api: vi.fn() }));

import { api } from '../src/auth/runtime';
import { getAdminLiveMap, getAdminOrders } from '../src/api/admin';

describe('Admin production compatibility', () => {
  afterEach(() => vi.clearAllMocks());

  it('normalizes orders from older API versions without assignment metadata', async () => {
    vi.mocked(api).mockResolvedValueOnce({
      total: 1,
      page: 1,
      orders: [{ id: 'order-1', code: 'HT-1', status: 'CREATED' }],
    });
    const result = await getAdminOrders();
    expect(result.orders[0]).toMatchObject({
      eligibleRiderIds: [],
      manualAssignmentReady: false,
    });
  });

  it('keeps valid eligible rider identifiers and drops malformed values', async () => {
    vi.mocked(api).mockResolvedValueOnce({
      total: 1,
      page: 1,
      orders: [{ id: 'order-1', eligibleRiderIds: ['rider-1', null, 4], manualAssignmentReady: true }],
    });
    const result = await getAdminOrders();
    expect(result.orders[0]?.eligibleRiderIds).toEqual(['rider-1']);
    expect(result.orders[0]?.manualAssignmentReady).toBe(true);
  });

  it('supports the production live-map response without onlineRiders', async () => {
    const rider = { id: 'rider-1', isOnline: true };
    vi.mocked(api).mockResolvedValueOnce({ riders: [rider], orders: [] });
    const result = await getAdminLiveMap();
    expect(result.riders).toEqual([rider]);
    expect(result.onlineRiders).toEqual([rider]);
    expect(result.orders).toEqual([]);
  });

  it('normalizes malformed live-map collections instead of crashing the screen', async () => {
    vi.mocked(api).mockResolvedValueOnce({ riders: null, onlineRiders: null, orders: null });
    await expect(getAdminLiveMap()).resolves.toEqual({ riders: [], onlineRiders: [], orders: [] });
  });
});

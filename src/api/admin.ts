import { api } from '../auth/runtime';
import type { AdminBusiness, AdminBusinessCategory, AdminBusinessOrder, AdminFinance, AdminLiveOrder, AdminOrder, AdminOrderMonitor, AdminRider, AdminZone, EntityStatus } from '../contracts/admin';

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const getAdminBusinesses = () => api<{ businesses: AdminBusiness[] }>('/admin/businesses');
export const getAdminCategories = () => api<{ categories: AdminBusinessCategory[] }>('/admin/business-categories');
export const createAdminCategory = (name: string) => api<{ category: AdminBusinessCategory }>('/admin/business-categories', json('POST', { name }));
export const deleteAdminBusiness = (id: string) => api<{ ok: true }>(`/admin/businesses/${id}`, json('DELETE'));
export const resetAdminBusinessPassword = (id: string, password: string) => api<{ ok: true }>(`/admin/businesses/${id}/password`, json('PATCH', { password }));
export const createAdminBusiness = (input: { name: string; legalName?: string; phone: string; email: string; password: string; addressText: string; googleMapsUrl: string; category: string; status: EntityStatus; description?: string }) =>
  api<{ business: AdminBusiness }>('/admin/businesses', json('POST', { ...input, etaMinutes: 25 }));
export const updateAdminBusiness = (id: string, input: { name: string; legalName?: string; phone: string; email: string; addressText: string; googleMapsUrl: string; category: string; status: EntityStatus; description?: string }) =>
  api<{ business: AdminBusiness }>(`/admin/businesses/${id}`, json('PATCH', { ...input, etaMinutes: 25 }));

export const getAdminRiders = () => api<{ riders: AdminRider[] }>('/admin/riders');
export const deleteAdminRider = (id: string) => api<{ ok: true }>(`/admin/riders/${id}`, json('DELETE'));
export const resetAdminRiderPassword = (id: string, password: string) => api<{ ok: true }>(`/admin/riders/${id}/password`, json('PATCH', { password }));
export const createAdminRider = (input: { name: string; phone: string; email: string; password: string; vehicleType: 'ELECTRIC' | 'DIESEL'; licenseNumber?: string; personalId?: string; status: EntityStatus }) =>
  api<{ rider: AdminRider }>('/admin/riders', json('POST', input));
export const updateAdminRider = (id: string, input: { name: string; phone: string; email: string; vehicleType: 'ELECTRIC' | 'DIESEL'; licenseNumber?: string; personalId?: string; status: EntityStatus }) =>
  api<{ rider: AdminRider }>(`/admin/riders/${id}`, json('PATCH', input));
export const recordRiderWithdrawal = (id: string, withdrawalAmount: number) => api<{ balance: number; withdrawal: number }>(`/admin/riders/${id}/account-balance`, json('PATCH', { withdrawalAmount }));
export const setRiderDebit = (id: string, debit: number) => api<{ debit: number; reduction: number }>(`/admin/riders/${id}/debit`, json('PATCH', { debit }));

export function getAdminOrders(input: { q?: string; status?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (input.q) query.set('q', input.q);
  if (input.status) query.set('status', input.status);
  if (input.page) query.set('page', String(input.page));
  return api<{ total: number; page: number; orders: AdminOrder[] }>(`/admin/orders?${query}`).then(data => ({
    ...data,
    orders: data.orders.map(order => ({
      ...order,
      eligibleRiderIds: Array.isArray(order.eligibleRiderIds)
        ? order.eligibleRiderIds.filter((id): id is string => typeof id === 'string')
        : [],
      manualAssignmentReady: order.manualAssignmentReady === true,
    })),
  }));
}
export const cancelAdminOrder = (id: string) => api<{ ok: true }>(`/admin/orders/${id}/cancel`, json('PATCH'));
export const assignAdminOrder = (id: string, riderId: string) => api<{ ok: true }>(`/admin/orders/${id}/assign`, json('POST', { riderId }));
export const getAdminOrderMonitor = (id: string) => api<AdminOrderMonitor>(`/admin/orders/${id}/monitor`);
export const getAdminBusinessOrders = (id: string) => api<{ business: { id: string; name: string; category: string | null }; orders: AdminBusinessOrder[] }>(`/admin/businesses/${id}/orders`);
export function getAdminLiveMap() {
  return api<{ riders?: AdminRider[]; onlineRiders?: AdminRider[]; orders?: AdminLiveOrder[] }>('/admin/live-map').then(data => {
    const riders = Array.isArray(data.riders) ? data.riders : [];
    return {
      riders,
      // Older production releases return only riders with a recent GPS point.
      // Treat that list as the online list until the expanded API is deployed.
      onlineRiders: Array.isArray(data.onlineRiders) ? data.onlineRiders : riders,
      orders: Array.isArray(data.orders) ? data.orders : [],
    };
  });
}
export const getAdminFinance = () => api<AdminFinance>('/admin/finance');
export const getAdminZones = () => api<{ zones: AdminZone[] }>('/admin/zones');

export async function logoutAdmin() {
  try { await api<{ ok?: boolean }>('/admin/auth/logout', json('POST')); } catch { /* Local logout remains authoritative on this device. */ }
}

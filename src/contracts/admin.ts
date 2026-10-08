export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type OrderStatus = 'CREATED' | 'OFFERED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export interface AdminBusiness {
  id: string; name: string; legalName: string | null; phone: string; email: string | null;
  addressText: string; lat?: number; lng?: number; status: EntityStatus; category: string | null;
  rating: number; etaMinutes: number; coverImageUrl: string | null; description: string | null;
  orderCount: number; productCount: number;
}

export interface AdminBusinessCategory { id: string; name: string; active: boolean; sortOrder: number; businessCount: number }

export interface AdminRider {
  id: string; userId: string; name: string; phone: string; email: string | null;
  vehicleType: 'ELECTRIC' | 'DIESEL'; licenseNumber: string | null; personalId: string | null;
  accountBalanceAll: number; isOnline: boolean; status: EntityStatus; lastSeenAt: string | null;
  lastLat?: number; lastLng?: number; gpsAccuracy?: number; gpsRecordedAt?: string | null;
  platformDue: number; debitLimitAll: number; isDebitBlocked: boolean; deliveriesToday: number;
}

export interface AdminOrder {
  id: string; code: string; status: OrderStatus; createdAt: string; productValue: number;
  transportFee: number; totalAmount: number; riderEarning: number; dropoffAddress: string;
  businessId: string; businessName: string; customerName: string | null; escalatedAt: string | null;
  assignedRiderId: string | null; manualAssignmentReady: boolean; eligibleRiderIds: string[];
  routeDistanceMeters: number;
}

export interface AdminBusinessOrder {
  id: string; code: string; status: OrderStatus; createdAt: string; productValue: number;
  transportFee: number; totalAmount: number; riderEarning: number; dropoffAddress: string;
}

export interface AdminLiveOrder {
  id: string; code: string; status: OrderStatus; totalAmount: number; businessName: string;
  businessId: string; pickupAddress: string; pickupLat: number; pickupLng: number;
  dropoffAddress: string; dropoffLat: number; dropoffLng: number;
}

export interface AdminZone {
  id: string; name: string; city: string; transportFee: number; isSurchargeArea: boolean;
  surchargeFee: number; active: boolean; createdAt: string; points: Array<{ lat: number; lng: number }>;
}

export interface AdminFinance {
  metrics: { totalTransportFee: number; riderEarnings: number; platformCommission: number; deliveredOrders: number };
  settlements: Array<{ riderId: string; riderName: string; platformDue: number; status: string }>;
}

export interface AdminOrderMonitor {
  order: Omit<AdminLiveOrder, 'pickupLat' | 'pickupLng'> & { pickupLat: number | null; pickupLng: number | null; createdAt: string; acceptedAt: string | null; pickedUpAt: string | null; deliveredAt: string | null };
  rider: AdminRider | null;
  trackingActive: boolean;
}

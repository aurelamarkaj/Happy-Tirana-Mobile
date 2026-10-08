// DTOs copied from rider-app/lib/api.ts; session browser code is excluded.
export type OrderStatus = 'CREATED' | 'OFFERED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
export interface RiderProfile { id: string; name: string; phone: string | null; vehicleType: string; }
export interface RiderOrder {
  id: string;
  code: string;
  status: OrderStatus;
  businessName: string;
  businessCategory?: string | null;
  businessPhone: string | null;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  customerName: string | null;
  customerPhone: string | null;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  productDescription: string;
  productValue: number;
  transportFee: number;
  platformCommission: number;
  riderEarning: number;
  totalAmount: number;
  readyMinutes: number;
  routeDistanceMeters?: number;
  routeDistanceSource?: string;
  routePreference?: string;
  googleMapsUrl?: string | null;
  calculatedTransportFee?: number;
  transportFeeOverridden: boolean;
  ringSurchargeApplied: boolean;
  ringSurchargeFee: number;
  createdAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  offerExpiresAt?: string;
}

export interface RiderMetrics {
  todayDeliveries: number;
  weekDeliveries: number;
  todayTransport: number;
  todayEarnings: number;
  weekEarnings: number;
  platformDue: number;
  accountBalanceAll?: number;
}

export interface RiderDashboard {
  operationalWindow: { isOpen: boolean };
  operationalDay: boolean;
  maxActiveOrders: number;
  rider: RiderProfile & {
    isOnline: boolean;
    status: string;
    lastSeenAt: string | null;
    platformDue: number;
  accountBalanceAll?: number;
    debitLimitAll: number;
    isDebitBlocked: boolean;
  };
  activeOrder: RiderOrder | null;
  activeOrders: RiderOrder[];
  pendingOffers: RiderOrder[];
  recentOrders: RiderOrder[];
  metrics: RiderMetrics;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RiderStop extends RoutePoint {
  orderId: string;
  code: string;
  kind: 'pickup' | 'dropoff';
  title: string;
  address: string;
}

export interface RiderItinerary {
  stops: RiderStop[];
  coordinates: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
}

export interface RiderOrderPage {
  items: RiderOrder[];
  nextCursor: string | null;
}


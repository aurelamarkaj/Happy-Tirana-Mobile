// DTOs copied from business-portal/lib/api.ts, without browser session code.
export interface BusinessOrder {
  id: string;
  code: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string;
  productDescription: string;
  productValue: number;
  transportFee: number;
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
  riderEarning: number;
  platformCommission: number;
  riderName: string | null;
  offeredRiderCount: number;
  createdAt: string;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  area: string;
  city: string;
  details: string;
  lat: number;
  lng: number;
}

export interface BusinessOrderQuote {
  zoneId: string;
  zoneName: string;
  lat: number;
  lng: number;
  addressText: string;
  distanceMeters: number;
  baseFee: number;
  extraDistanceFee: number;
  distanceKm: number;
  distanceSource: string;
  calculatedTransportFee: number;
  finalTransportFee: number;
  transportFeeOverridden: boolean;
  ringSurchargeApplied: boolean;
  ringSurchargeFee: number;
  routePreference: string;
  googleMapsUrl: string | null;
}

export interface BusinessDashboard {
  business: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    addressText: string;
    lat: number;
    lng: number;
    category: string;
    rating: number;
    etaMinutes: number;
    coverImageUrl: string | null;
    description: string | null;
    status: string;
  };
  orders: BusinessOrder[];
  metrics: {
    pendingOrders: number;
    activeOrders: number;
    deliveredToday: number;
    productRevenueToday: number;
    totalCollectedToday: number;
  };
}

export interface BusinessOrderPage {
  items: BusinessOrder[];
  nextCursor: string | null;
}


import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen, Body, Button, Notice, SectionTitle, EmptyState } from '../../src/components/ui';
import { useRiderAction, useRiderDashboard } from '../../src/features/rider/hooks';
import { getRiderItinerary, getRoute, updateOrderStatus } from '../../src/api/rider';
import { activeOrders, navigationUrl, riderError } from '../../src/features/rider/domain';
import { Loading, OrderCard, PhoneButton, RiderHeader } from '../../src/features/rider/components';
import { DeliveryMap } from '../../src/features/rider/delivery-map';
import { GpsCard } from '../../src/gps/card';
import { useRiderGps } from '../../src/gps/provider';
import { colors } from '../../src/components/ui';

export default function Deliveries() {
  const query = useRiderDashboard();
  const { state: gps } = useRiderGps();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const orders = query.data ? activeOrders(query.data) : [];
  const order = orders.find(item => item.id === selectedId) ?? orders[0];
  const action = useRiderAction((input: { id: string; status: 'PICKED_UP' | 'DELIVERED' }) => updateOrderStatus(input.id, input.status));
  const route = useQuery({ queryKey: ['rider-route', order?.id, order?.pickupLat, order?.pickupLng, order?.dropoffLat, order?.dropoffLng], queryFn: ({ signal }) => getRoute(order!, signal), enabled: !!order, staleTime: 300_000 });
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const lastOrigin = useRef<{ point: { lat: number; lng: number }; time: number } | null>(null);
  useEffect(() => {
    const location = gps.location;
    if (!location) { lastOrigin.current = null; setOrigin(null); return; }
    const now = Date.now(); const previous = lastOrigin.current;
    if (!previous || (now - previous.time > 30_000 && Math.hypot(location.lat - previous.point.lat, location.lng - previous.point.lng) > 0.0005)) {
      const point = { lat: location.lat, lng: location.lng }; lastOrigin.current = { point, time: now }; setOrigin(point);
    }
  }, [gps.location]);
  const signature = orders.map(item => `${item.id}:${item.status}`).sort().join('|');
  const itinerary = useQuery({ queryKey: ['rider-itinerary', signature, origin?.lat, origin?.lng], queryFn: ({ signal }) => getRiderItinerary(origin!, signal), enabled: !!origin && !!signature, staleTime: 30_000, retry: 1 });
  return <Screen><RiderHeader title="Dërgesa" refreshing={query.isFetching} refresh={() => { void query.refetch(); }} />
    <GpsCard />
    {query.isPending && <Loading />}{query.error && <Notice>{riderError(query.error)}</Notice>}{action.error && <Notice>{riderError(action.error)}</Notice>}
    {query.data && orders.length === 0 && <EmptyState title="Asnjë dërgesë aktive" message="Ofertat e reja do t'i gjesh te Dashboard." />}
    {orders.length > 1 && <><SectionTitle detail="Zgjidh dërgesën që do të menaxhosh">Porositë aktive</SectionTitle>{orders.map(item => <Button key={item.id} secondary={item.id !== order?.id} title={`${item.code} · ${item.businessName}`} onPress={() => setSelectedId(item.id)} />)}</>}
    {order && <>
      <DeliveryMap order={order} orders={orders} route={route.data?.coordinates} itinerary={itinerary.data} />
      {(itinerary.isPending || (!origin && route.isPending)) && <Body>Po renditen ndalesat sipas distancës rrugore…</Body>}
      {itinerary.error && <Notice>Itinerari i plotë nuk u llogarit. Harta dhe navigimi për porosinë mbeten të disponueshme.</Notice>}
      {(itinerary.data ?? route.data) && <SectionTitle detail={itinerary.data ? `${itinerary.data.stops.length} ndalesa sipas radhës` : 'Distanca dhe koha e parashikuar'}>{((itinerary.data?.distanceMeters ?? route.data!.distanceMeters) / 1000).toFixed(1)} km · {Math.ceil((itinerary.data?.durationSeconds ?? route.data!.durationSeconds) / 60)} min</SectionTitle>}
      {itinerary.data?.stops.map((stop, index) => <Pressable key={`${stop.orderId}:${stop.kind}`} onPress={() => setSelectedId(stop.orderId)} style={local.stop}><Text style={local.stopNumber}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={local.stopTitle}>{stop.kind === 'pickup' ? 'Marrje' : 'Dorëzim'} · {stop.code}</Text><Body>{stop.title} · {stop.address}</Body></View></Pressable>)}
      <OrderCard order={order}>
        <PhoneButton phone={order.businessPhone} label="Telefono biznesin" /><PhoneButton phone={order.customerPhone} label="Telefono klientin" />
        <Button secondary title={order.status === 'PICKED_UP' ? 'Nis navigimin — te klienti' : 'Nis navigimin — te biznesi'} onPress={() => { const url = navigationUrl(order, gps.location); setLinkError(false); if (url) void Linking.openURL(url).catch(() => setLinkError(true)); }} />
        {linkError && <Notice>Google Maps nuk u hap. Provo përsëri.</Notice>}
        {order.status === 'ACCEPTED' && <Button title="E mora porosinë" disabled={action.isPending || query.isError} onPress={() => action.mutate({ id: order.id, status: 'PICKED_UP' })} />}
        {order.status === 'PICKED_UP' && <Button title="Konfirmo dorëzimin" disabled={action.isPending || query.isError} onPress={() => action.mutate({ id: order.id, status: 'DELIVERED' })} />}
      </OrderCard>
    </>}
  </Screen>;
}
const local = StyleSheet.create({ stop: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.white, padding: 13 }, stopNumber: { width: 30, height: 30, borderRadius: 15, textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.orange, color: colors.white, fontFamily: 'Manrope_700Bold' }, stopTitle: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 13 } });

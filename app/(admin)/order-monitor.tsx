import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { getAdminOrderMonitor } from '../../src/api/admin';
import { MapCanvas, type MapPoint } from '../../src/components/map-canvas';
import { Body, Card, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { AdminHeader, formatLek, statusLabel } from '../../src/features/admin/components';

export default function OrderMonitor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useQuery({ queryKey: ['admin', 'order-monitor', id], queryFn: () => getAdminOrderMonitor(id!), enabled: !!id, refetchInterval: 12_000 });
  const data = query.data; const order = data?.order; const rider = data?.rider;
  const points: MapPoint[] = [];
  if (order?.pickupLat != null && order.pickupLng != null) points.push({ lat: order.pickupLat, lng: order.pickupLng, label: 'B', title: `${order.businessName}\n${order.pickupAddress}`, color: colors.text });
  if (order) points.push({ lat: order.dropoffLat, lng: order.dropoffLng, label: 'D', title: order.dropoffAddress, color: colors.orange });
  if (data?.trackingActive && rider?.lastLat != null && rider.lastLng != null) points.push({ lat: rider.lastLat, lng: rider.lastLng, label: 'M', title: rider.name, color: colors.blue });
  return <Screen><AdminHeader back title={order?.code ?? 'Monitorimi'} subtitle="GPS dhe rrjedha e porosisë" refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    {query.error && <Notice>Detajet e porosisë nuk u ngarkuan.</Notice>}
    {order && <><MapCanvas points={points} height={350} /><Card><View style={s.row}><Text style={s.code}>{order.code}</Text><Text style={s.badge}>{statusLabel[order.status]}</Text></View><Text style={s.title}>{order.businessName}</Text><Body>Marrja: {order.pickupAddress}</Body><Body>Dorëzimi: {order.dropoffAddress}</Body><Text style={s.total}>{formatLek(order.totalAmount)}</Text></Card>
      <SectionTitle>Motoristi</SectionTitle>{rider ? <Card><View style={s.row}><Text style={s.title}>{rider.name}</Text><Text style={[s.live, { color: data.trackingActive && rider.lastLat != null ? colors.success : colors.muted }]}>{data.trackingActive && rider.lastLat != null ? 'GPS LIVE' : 'GPS joaktiv'}</Text></View><Body>{rider.phone}</Body><Body>{rider.vehicleType} · {rider.deliveriesToday} dërgesa sot</Body></Card> : <Card><Body>Nuk është caktuar ende motorist.</Body></Card>}
      <SectionTitle>Kohët</SectionTitle><Card><Body>Krijuar: {new Date(order.createdAt).toLocaleString('sq-AL')}</Body><Body>Pranuar: {order.acceptedAt ? new Date(order.acceptedAt).toLocaleString('sq-AL') : '—'}</Body><Body>Marrë: {order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleString('sq-AL') : '—'}</Body><Body>Dorëzuar: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString('sq-AL') : '—'}</Body></Card></>}
  </Screen>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, code: { color: colors.orange, fontFamily: 'Manrope_700Bold', fontSize: 13 }, badge: { color: colors.orangeDark, fontFamily: 'Manrope_600SemiBold', fontSize: 11, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 }, title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 17 }, total: { color: colors.text, fontFamily: 'Manrope_800ExtraBold', fontSize: 21 }, live: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.5 } });

import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { getAdminLiveMap } from '../../src/api/admin';
import { MapCanvas, type MapPoint } from '../../src/components/map-canvas';
import { Body, Card, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { AdminHeader, statusLabel } from '../../src/features/admin/components';

export default function AdminLiveMap() {
  const query = useQuery({ queryKey: ['admin', 'live-map'], queryFn: getAdminLiveMap, refetchInterval: 15_000 });
  const data = query.data;
  const points: MapPoint[] = [
    ...(data?.riders.filter(r => r.lastLat != null && r.lastLng != null).map(r => ({ lat: r.lastLat!, lng: r.lastLng!, label: 'M', title: `${r.name}\n${r.phone}`, color: colors.blue })) ?? []),
    ...(data?.orders.flatMap(order => [{ lat: order.pickupLat, lng: order.pickupLng, label: 'B', title: `${order.businessName}\n${order.pickupAddress}`, color: colors.text }, { lat: order.dropoffLat, lng: order.dropoffLng, label: 'D', title: `${order.code}\n${order.dropoffAddress}`, color: colors.orange }]) ?? []),
  ];
  return <Screen><AdminHeader back title="Harta live" subtitle="Përditësohet çdo 15 sekonda" refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    {query.error && <Notice>Harta live nuk u ngarkua. Kontrollo internetin dhe provo përsëri.</Notice>}
    <MapCanvas points={points} height={390} />
    <View style={s.legend}><Dot color={colors.blue} text="Motorist" /><Dot color={colors.text} text="Biznes" /><Dot color={colors.orange} text="Dorëzim" /></View>
    <SectionTitle detail={`${data?.onlineRiders.length ?? 0} online`}>Motoristët me GPS aktiv</SectionTitle>
    {data?.onlineRiders.map(rider => <Card key={rider.id}><View style={s.row}><Text style={s.name}>{rider.name}</Text><Text style={[s.state, { color: rider.lastLat != null ? colors.success : colors.muted }]}>{rider.lastLat != null ? 'GPS LIVE' : 'Pa sinjal GPS'}</Text></View><Body>{rider.phone} · {rider.vehicleType === 'ELECTRIC' ? 'Elektrik' : 'Naftë'}</Body><Body>{rider.deliveriesToday} dërgesa sot</Body></Card>)}
    <SectionTitle>Porositë aktive</SectionTitle>
    {data?.orders.map(order => <Card key={order.id}><View style={s.row}><Text style={s.name}>{order.code}</Text><Text style={s.state}>{statusLabel[order.status]}</Text></View><Body>{order.businessName}</Body><Body>{order.dropoffAddress}</Body></Card>)}
  </Screen>;
}
function Dot({ color, text }: { color: string; text: string }) { return <View style={s.dotItem}><View style={[s.dot, { backgroundColor: color }]} /><Text style={s.dotText}>{text}</Text></View>; }
const s = StyleSheet.create({ legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }, dotItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 9, height: 9, borderRadius: 5 }, dotText: { color: colors.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 11 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, name: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 15 }, state: { color: colors.orange, fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.5 } });

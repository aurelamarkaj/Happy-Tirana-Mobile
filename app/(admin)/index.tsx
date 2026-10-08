import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bike, Building2, ChevronRight, CircleDollarSign, MapPinned, PackageSearch, Shapes } from 'lucide-react-native';
import { getAdminBusinesses, getAdminFinance, getAdminLiveMap, getAdminRiders } from '../../src/api/admin';
import { Body, Card, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { AdminHeader, Metric, formatLek } from '../../src/features/admin/components';

const menu = [
  { route: '/(admin)/orders', label: 'Porositë', detail: 'Kërko, cakto motorist dhe anulo', icon: PackageSearch },
  { route: '/(admin)/live-map', label: 'Harta live', detail: 'GPS i motoristëve dhe porositë aktive', icon: MapPinned },
  { route: '/(admin)/businesses', label: 'Bizneset', detail: 'Krijo dhe menaxho llogaritë', icon: Building2 },
  { route: '/(admin)/riders', label: 'Motoristët', detail: 'Flota, pagesat dhe debiti', icon: Bike },
  { route: '/(admin)/finance', label: 'Financat', detail: 'Komisionet dhe detyrimet', icon: CircleDollarSign },
  { route: '/(admin)/zones', label: 'Zonat', detail: 'Tarifat dhe kufijtë e shërbimit', icon: Shapes },
] as const;

export default function AdminDashboard() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: async () => {
    const [businesses, riders, live, finance] = await Promise.all([getAdminBusinesses(), getAdminRiders(), getAdminLiveMap(), getAdminFinance()]);
    return { businesses: businesses.businesses, riders: riders.riders, orders: live.orders, finance };
  } });
  const refresh = useCallback(() => { void query.refetch(); }, [query]);
  const data = query.data;
  const waiting = data?.orders.filter(order => ['CREATED', 'OFFERED'].includes(order.status)).length ?? 0;
  const online = data?.riders.filter(rider => rider.isOnline).length ?? 0;
  return <Screen>
    <AdminHeader title="Pasqyra e platformës" subtitle="Operacionet në kohë reale" refreshing={query.isFetching} onRefresh={refresh} />
    {query.error && <Notice>Të dhënat e adminit nuk u ngarkuan. Kontrollo lidhjen dhe provo përsëri.</Notice>}
    <View style={s.metrics}>
      <Metric label="Porosi aktive" value={data ? String(data.orders.length) : '—'} detail={`${waiting} në pritje`} />
      <Metric label="Motoristë online" value={data ? String(online) : '—'} detail={`${data?.riders.length ?? 0} në flotë`} />
      <Metric label="Biznese aktive" value={data ? String(data.businesses.filter(item => item.status === 'ACTIVE').length) : '—'} detail={`${data?.businesses.length ?? 0} gjithsej`} />
      <Metric label="Komisioni" value={data ? formatLek(data.finance.metrics.platformCommission) : '—'} detail={`${data?.finance.metrics.deliveredOrders ?? 0} dërgesa`} />
    </View>
    <SectionTitle detail="Të gjitha funksionet e panelit web">Menaxhimi</SectionTitle>
    <View style={{ gap: 10 }}>{menu.map(({ route, label, detail, icon: Icon }) => <Pressable key={route} accessibilityRole="button" onPress={() => router.push(route)} style={({ pressed }) => pressed && { opacity: 0.65 }}><Card style={s.menuCard}><View style={s.menuIcon}><Icon size={21} color={colors.orange} /></View><View style={{ flex: 1 }}><Text style={s.menuTitle}>{label}</Text><Body>{detail}</Body></View><ChevronRight size={19} color={colors.muted} /></Card></Pressable>)}</View>
  </Screen>;
}
const s = StyleSheet.create({ metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, menuCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, menuIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' }, menuTitle: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 16, marginBottom: 2 } });

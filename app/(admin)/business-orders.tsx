import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { cancelAdminOrder, getAdminBusinessOrders } from '../../src/api/admin';
import { Body, Button, Card, EmptyState, Notice, Screen, colors } from '../../src/components/ui';
import { AdminHeader, formatLek, statusLabel } from '../../src/features/admin/components';

export default function BusinessOrders() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const router = useRouter(); const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'business-orders', id], queryFn: () => getAdminBusinessOrders(id!), enabled: !!id });
  const cancel = useMutation({ mutationFn: cancelAdminOrder, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin', 'business-orders', id] }); } });
  return <Screen><AdminHeader back title={query.data?.business.name ?? 'Porositë e biznesit'} subtitle={query.data?.business.category ?? 'Historiku i plotë'} refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    {(query.error || cancel.error) && <Notice>Veprimi nuk u krye. Rifresko dhe provo përsëri.</Notice>}
    {query.data && !query.data.orders.length ? <EmptyState title="Nuk ka porosi" message="Ky biznes nuk ka ende histori porosish." /> : null}
    {query.data?.orders.map(order => <Card key={order.id}><View style={s.row}><Text style={s.code}>{order.code}</Text><Text style={s.badge}>{statusLabel[order.status]}</Text></View><Body>{order.dropoffAddress}</Body><Body>{new Date(order.createdAt).toLocaleString('sq-AL')}</Body><View style={s.row}><Text style={s.total}>{formatLek(order.totalAmount)}</Text><Body>Motoristi: {formatLek(order.riderEarning)}</Body></View><Button secondary title="Monitoro" onPress={() => router.push({ pathname: '/(admin)/order-monitor', params: { id: order.id } })} />{!['DELIVERED', 'CANCELLED'].includes(order.status) && <Button secondary title="Anulo" disabled={cancel.isPending} onPress={() => cancel.mutate(order.id)} />}</Card>)}
  </Screen>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, code: { color: colors.orange, fontFamily: 'Manrope_700Bold', fontSize: 13 }, badge: { color: colors.orangeDark, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, fontFamily: 'Manrope_600SemiBold', fontSize: 11 }, total: { color: colors.text, fontFamily: 'Manrope_800ExtraBold', fontSize: 18 } });

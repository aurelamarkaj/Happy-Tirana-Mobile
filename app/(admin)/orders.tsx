import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinned } from 'lucide-react-native';
import { assignAdminOrder, cancelAdminOrder, getAdminOrders, getAdminRiders } from '../../src/api/admin';
import type { AdminOrder } from '../../src/contracts/admin';
import { Body, Button, Card, EmptyState, Notice, Screen, colors } from '../../src/components/ui';
import { AdminHeader, Choice, Field, formatLek, statusLabel } from '../../src/features/admin/components';

const statuses = [{ value: '', label: 'Të gjitha' }, { value: 'CREATED', label: 'Të reja' }, { value: 'OFFERED', label: 'Në pritje' }, { value: 'ACCEPTED', label: 'Pranuar' }, { value: 'PICKED_UP', label: 'Transport' }, { value: 'DELIVERED', label: 'Dorëzuar' }, { value: 'CANCELLED', label: 'Anuluar' }];

export default function AdminOrders() {
  const router = useRouter();
  const client = useQueryClient();
  const [q, setQ] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setSearch(q.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [q]);
  const query = useQuery({ queryKey: ['admin', 'orders', search, status, page], queryFn: () => getAdminOrders({ q: search || undefined, status: status || undefined, page }) });
  const riders = useQuery({ queryKey: ['admin', 'riders'], queryFn: getAdminRiders });
  const mutation = useMutation({ mutationFn: async (action: { kind: 'cancel'; order: AdminOrder } | { kind: 'assign'; order: AdminOrder; riderId: string }) => action.kind === 'cancel' ? cancelAdminOrder(action.order.id) : assignAdminOrder(action.order.id, action.riderId), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['admin', 'orders'] }); } });
  return <Screen>
    <AdminHeader back title="Porositë" subtitle="Kërkim, filtra, caktim dhe anulim" refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    <Field label="Kërko" value={q} onChangeText={setQ} placeholder="Kod, biznes ose klient" />
    <Choice value={status} options={statuses} onChange={value => { setStatus(value); setPage(1); }} />
    {query.error && <Notice>Porositë nuk u ngarkuan. Provo përsëri.</Notice>}
    {mutation.error && <Notice>Veprimi nuk u krye. Rifresko të dhënat dhe provo përsëri.</Notice>}
    {!query.isLoading && !query.data?.orders.length ? <EmptyState title="Nuk ka rezultate" message="Ndrysho kërkimin ose filtrin." /> : null}
    {query.data?.orders.map(order => <OrderCard key={order.id} order={order} riders={riders.data?.riders ?? []} busy={mutation.isPending} onMonitor={() => router.push({ pathname: '/(admin)/order-monitor', params: { id: order.id } })} onCancel={() => mutation.mutate({ kind: 'cancel', order })} onAssign={riderId => mutation.mutate({ kind: 'assign', order, riderId })} />)}
    <View style={s.pagination}><Button secondary title="Mbrapa" disabled={page <= 1 || query.isFetching} onPress={() => setPage(value => value - 1)} /><Text style={s.page}>Faqja {page}</Text><Button secondary title="Tjetra" disabled={!query.data || page * 50 >= query.data.total || query.isFetching} onPress={() => setPage(value => value + 1)} /></View>
  </Screen>;
}

function OrderCard({ order, riders, busy, onMonitor, onCancel, onAssign }: { order: AdminOrder; riders: Awaited<ReturnType<typeof getAdminRiders>>['riders']; busy: boolean; onMonitor: () => void; onCancel: () => void; onAssign: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false); const [selected, setSelected] = useState('');
  const eligibleIds = Array.isArray(order.eligibleRiderIds) ? order.eligibleRiderIds : [];
  const eligible = riders.filter(rider => eligibleIds.includes(rider.id));
  const final = ['DELIVERED', 'CANCELLED'].includes(order.status);
  return <Card><View style={s.row}><Text style={s.code}>{order.code}</Text><Text style={s.badge}>{statusLabel[order.status] ?? order.status}</Text></View><Text style={s.title}>{order.businessName}</Text><Body>{order.customerName ?? 'Klient'} · {order.dropoffAddress}</Body><View style={s.row}><Body>{new Date(order.createdAt).toLocaleString('sq-AL')}</Body><Text style={s.total}>{formatLek(order.totalAmount)}</Text></View>
    <Pressable accessibilityRole="button" onPress={onMonitor} style={s.monitor}><MapPinned size={17} color={colors.orange} /><Text style={s.monitorText}>Detaje dhe monitorim</Text></Pressable>
    {order.manualAssignmentReady && eligible.length ? <View style={{ gap: 8 }}><Text style={s.label}>Cakto motoristin</Text><Choice value={selected} options={[{ value: '', label: 'Zgjidh' }, ...eligible.map(rider => ({ value: rider.id, label: rider.name }))]} onChange={setSelected} /><Button title="Cakto motoristin" disabled={!selected || busy} onPress={() => onAssign(selected)} /></View> : null}
    {!final && (confirm ? <View style={s.row}><Button secondary title="Jo" disabled={busy} onPress={() => setConfirm(false)} /><Button title="Po, anulo" disabled={busy} onPress={onCancel} /></View> : <Button secondary title="Anulo porosinë" disabled={busy} onPress={() => setConfirm(true)} />)}
  </Card>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, code: { color: colors.orange, fontFamily: 'Manrope_700Bold', fontSize: 13 }, badge: { color: colors.orangeDark, backgroundColor: colors.orangeSoft, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6, fontFamily: 'Manrope_600SemiBold', fontSize: 11 }, title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 17 }, total: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 15 }, monitor: { flexDirection: 'row', minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.orangeSoft }, monitorText: { color: colors.orangeDark, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }, label: { color: colors.text, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }, pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, page: { color: colors.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 12 } });

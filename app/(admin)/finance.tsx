import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { getAdminFinance } from '../../src/api/admin';
import { Body, Card, EmptyState, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { AdminHeader, Metric, formatLek } from '../../src/features/admin/components';

export default function AdminFinanceScreen() {
  const query = useQuery({ queryKey: ['admin', 'finance'], queryFn: getAdminFinance }); const data = query.data;
  return <Screen><AdminHeader back title="Financat" subtitle="Të ardhurat dhe rakordimet" refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    {query.error && <Notice>Financat nuk u ngarkuan. Provo përsëri.</Notice>}
    <View style={s.metrics}><Metric label="Transporti" value={data ? formatLek(data.metrics.totalTransportFee) : '—'} detail={`${data?.metrics.deliveredOrders ?? 0} porosi`} /><Metric label="Fitimet e motoristëve" value={data ? formatLek(data.metrics.riderEarnings) : '—'} /><Metric label="Komisioni i platformës" value={data ? formatLek(data.metrics.platformCommission) : '—'} /></View>
    <SectionTitle detail="Detyrime të hapura ndaj platformës">Rakordimet</SectionTitle>
    {data && !data.settlements.length ? <EmptyState title="Asnjë detyrim i hapur" message="Rakordimet janë në rregull." /> : null}
    {data?.settlements.map(item => <Card key={item.riderId}><View style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{item.riderName}</Text><Body>Statusi: {item.status}</Body></View><Text style={s.amount}>{formatLek(item.platformDue)}</Text></View></Card>)}
  </Screen>;
}
const s = StyleSheet.create({ metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, name: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 16 }, amount: { color: colors.orangeDark, fontFamily: 'Manrope_800ExtraBold', fontSize: 16 } });

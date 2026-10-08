import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Notice, Screen, SectionTitle, EmptyState } from '../../src/components/ui';
import { BusinessHeader, BusinessOrderCard, Loading, Metric, Search } from '../../src/features/business/components';
import { useBusinessData, useBusinessHistory } from '../../src/features/business/hooks';
import { businessError, isHistory, searchOrders } from '../../src/features/business/domain';
import { formatLek } from '../../src/features/rider/domain';
export default function History() {
  const { dashboard } = useBusinessData(); const history = useBusinessHistory(); const [search, setSearch] = useState('');
  const loaded = history.data?.pages.flatMap(page => page.items) ?? [];
  const fallback = (dashboard.data?.orders ?? []).filter(isHistory);
  const orders = searchOrders(history.error ? fallback : loaded, search);
  return <Screen><BusinessHeader title="Historia" refreshing={dashboard.isFetching || history.isFetching} refresh={() => { void dashboard.refetch(); void history.refetch(); }} />
    <Body>Historia ngarkohet nga API-ja me faqe nga 20 porosi.</Body>
    {(dashboard.isPending || history.isPending) && <Loading />}{dashboard.error && <Notice>{businessError(dashboard.error)}</Notice>}
    {history.error && <Notice>Historia e plotë nuk u ngarkua nga serveri. Po shfaqen vetëm porositë e fundit; provo përsëri pas deployment-it të API-së.</Notice>}
    {dashboard.data && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Metric label="Vlera e produkteve sot" value={formatLek(dashboard.data.metrics.productRevenueToday)} /><Metric label="Arkëtuar sot" value={formatLek(dashboard.data.metrics.totalCollectedToday)} /></View>}
    <SectionTitle detail="Kërko sipas kodit, klientit ose adresës">Porositë e përfunduara</SectionTitle>
    <Search value={search} onChange={setSearch} />
    {orders.map(order => <BusinessOrderCard key={order.id} order={order} onPress={() => router.push({ pathname: '/(business)/order-details', params: { id: order.id } })} />)}
    {history.hasNextPage && !search.trim() && <Button secondary title={history.isFetchingNextPage ? 'Po ngarkohet...' : 'Ngarko më shumë'} disabled={history.isFetchingNextPage} onPress={() => { void history.fetchNextPage(); }} />}
    {(history.data || history.error) && !orders.length && <EmptyState title="Nuk ka histori" message="Porositë e përfunduara do të shfaqen këtu." />}
  </Screen>;
}

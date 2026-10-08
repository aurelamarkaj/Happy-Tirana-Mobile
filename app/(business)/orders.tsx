import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Notice, Screen, SectionTitle, EmptyState } from '../../src/components/ui';
import { BusinessHeader, BusinessOrderCard, Loading, Metric, Search } from '../../src/features/business/components';
import { useBusinessData } from '../../src/features/business/hooks';
import { businessError, searchOrders } from '../../src/features/business/domain';
export default function Orders() {
  const { dashboard } = useBusinessData(); const [search, setSearch] = useState(''); const [active, setActive] = useState(false);
  const orders = searchOrders((dashboard.data?.orders ?? []).filter(order => (active ? ['ACCEPTED', 'PICKED_UP'] : ['CREATED', 'OFFERED']).includes(order.status)), search);
  return <Screen><BusinessHeader title="Porositë" refreshing={dashboard.isFetching} refresh={() => { void dashboard.refetch(); }} />
    <Search value={search} onChange={setSearch} />
    <Button title="Porosi e re" onPress={() => router.push('/(business)/new-order')} />
    {dashboard.isPending && <Loading />}{dashboard.error && <Notice>{businessError(dashboard.error)}</Notice>}
    {dashboard.data && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Metric label="Në pritje / Aktive" value={`${dashboard.data.metrics.pendingOrders} / ${dashboard.data.metrics.activeOrders}`} /><Metric label="Dorëzuar sot" value={String(dashboard.data.metrics.deliveredToday)} /></View>}
    <SectionTitle detail={active ? 'Porositë që janë duke u dorëzuar' : 'Porositë që presin motorrist'}>{active ? 'Porositë aktive' : 'Në pritje'}</SectionTitle>
    <Button secondary title={active ? 'Shfaq porositë në pritje' : 'Shfaq porositë aktive'} onPress={() => setActive(!active)} />
    {orders.map(order => <BusinessOrderCard key={order.id} order={order} onPress={() => router.push({ pathname: '/(business)/order-details', params: { id: order.id } })} />)}{dashboard.data && !orders.length && <EmptyState title="Lista është bosh" message={active ? 'Nuk ka porosi aktive për momentin.' : 'Krijo një porosi të re për të filluar.'} />}
  </Screen>;
}

import { View } from 'react-native';
import { Screen, Body, Button, Notice, SectionTitle, EmptyState } from '../../src/components/ui';
import { useRiderDashboard, useRiderHistory } from '../../src/features/rider/hooks';
import { formatLek, riderError } from '../../src/features/rider/domain';
import { Loading, Metric, OrderCard, RiderHeader } from '../../src/features/rider/components';
export default function Earnings() {
  const query = useRiderDashboard();
  const history = useRiderHistory();
  const data = query.data;
  const orders = history.error ? (data?.recentOrders ?? []) : (history.data?.pages.flatMap(page => page.items) ?? []);
  return <Screen><RiderHeader title="Pasqyra financiare" refreshing={query.isFetching || history.isFetching} refresh={() => { void query.refetch(); void history.refetch(); }} />
    {query.isPending && <Loading />}{query.error && <Notice>{riderError(query.error)}</Notice>}
    {history.error && <Notice>Historia e plotë nuk u ngarkua nga serveri. Po shfaqen vetëm 8 porositë e fundit.</Notice>}
    {data && <>
      <Metric label="Gjendja për tërheqje" value={formatLek(data.rider.accountBalanceAll ?? data.metrics.accountBalanceAll ?? 0)} detail="Fitimet e pashlyera nga admini" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Metric label="Fitime sot" value={formatLek(data.metrics.todayEarnings)} detail={`${data.metrics.todayDeliveries} dërgesa`} /><Metric label="Këtë javë" value={formatLek(data.metrics.weekEarnings)} detail={`${data.metrics.weekDeliveries} dërgesa`} /><Metric label="Transport sot" value={formatLek(data.metrics.todayTransport)} /><Metric label="Debit platforme" value={formatLek(data.metrics.platformDue)} /></View>
      <SectionTitle detail="Dërgesat e përfunduara së fundmi">Porositë e mbyllura</SectionTitle>
      {orders.map(order => <OrderCard key={order.id} order={order}><Body>{new Date(order.deliveredAt ?? order.createdAt).toLocaleString('sq-AL')}</Body></OrderCard>)}
      {!orders.length && <EmptyState title="Ende pa dërgesa" message="Porositë e përfunduara do të shfaqen këtu." />}
      {history.hasNextPage && <Button secondary title={history.isFetchingNextPage ? 'Po ngarkohet...' : 'Ngarko më shumë'} disabled={history.isFetchingNextPage} onPress={() => { void history.fetchNextPage(); }} />}
    </>}
  </Screen>;
}

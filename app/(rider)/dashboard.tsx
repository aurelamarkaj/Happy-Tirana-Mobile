import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Body, Card, Button, Notice, SectionTitle, EmptyState, colors } from '../../src/components/ui';
import { useRiderAction, useRiderDashboard } from '../../src/features/rider/hooks';
import { setAvailability, acceptOrder, rejectOrder } from '../../src/api/rider';
import { acceptBlocked, activeOrders, formatLek, preparationRemainingMinutes, riderError } from '../../src/features/rider/domain';
import { Loading, Metric, OrderCard, RiderHeader, s } from '../../src/features/rider/components';
import { GpsCard } from '../../src/gps/card';
import { PushCard } from '../../src/push/card';

type Action = { kind: 'availability'; online: boolean } | { kind: 'accept' | 'reject'; id: string };
export default function Dashboard() {
  const query = useRiderDashboard();
  const action = useRiderAction((input: Action) => input.kind === 'availability' ? setAvailability(input.online) : input.kind === 'accept' ? acceptOrder(input.id) : rejectOrder(input.id));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const data = query.data;
  const busy = action.isPending || query.isError;
  return <Screen><RiderHeader title="Dashboard" refreshing={query.isFetching} refresh={() => { void query.refetch(); }} />
    <GpsCard />
    <PushCard />
    {query.isPending && <Loading />}{query.error && <Notice>{riderError(query.error)}{data ? ' Po shfaqen të dhënat e fundit.' : ''}</Notice>}
    {action.error && <Notice>{riderError(action.error)}</Notice>}
    {data && <>
      <Card style={{ backgroundColor: data.rider.isOnline ? colors.successSoft : colors.white }}><View style={s.row}><View style={{ gap: 3 }}><SectionTitle>{data.rider.isOnline ? 'Je online' : 'Je offline'}</SectionTitle><Body>{data.rider.isOnline ? 'Gati për të marrë dërgesa' : 'Aktivizoje kur të jesh gati'}</Body></View><Switch accessibilityLabel="Disponueshmëria online" value={data.rider.isOnline} disabled={busy || (!data.rider.isOnline && data.rider.isDebitBlocked)} trackColor={{ false: colors.border, true: '#45a862' }} thumbColor={colors.white} onValueChange={online => action.mutate({ kind: 'availability', online })} /></View></Card>
      {data.rider.isDebitBlocked && <Notice>Debiti ka arritur {formatLek(data.rider.platformDue)}. Ofertat e reja janë bllokuar deri në shlyerje.</Notice>}
      {!data.operationalWindow.isOpen && <Body>Orari i pranimit të porosive është mbyllur.</Body>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><Metric label="Dërgesa sot" value={String(data.metrics.todayDeliveries)} /><Metric label="Fitime sot" value={formatLek(data.metrics.todayEarnings)} /><Metric label="Debit platforme" value={formatLek(data.rider.platformDue)} detail={`Limit ${formatLek(data.rider.debitLimitAll)}`} /></View>
      {activeOrders(data).length > 0 && <Card style={{ borderColor: '#ffd0b8' }}><SectionTitle detail="Hap itinerarin dhe vazhdo procesin">Dërgesa aktive · {activeOrders(data).length}/{data.maxActiveOrders}</SectionTitle><Button title="Vazhdo dërgesat" onPress={() => router.push('/(rider)/deliveries')} /></Card>}
      <SectionTitle detail="Ofertat shfaqen automatikisht në kohë reale">Oferta të reja</SectionTitle>
      {!data.pendingOffers.length && <EmptyState title="Asnjë ofertë e re" message={data.rider.isOnline ? 'Do të njoftohesh sapo të vijë një dërgesë e re.' : 'Aktivizo statusin online për të marrë oferta.'} />}
      {data.pendingOffers.map(order => {
        const blocked = acceptBlocked(data, order, now);
        const expiry = order.offerExpiresAt ? Math.max(0, Math.ceil((Date.parse(order.offerExpiresAt) - now) / 1000)) : null;
        const preparation = preparationRemainingMinutes(order, now);
        return <OrderCard key={order.id} order={order}>
          {preparation !== null && <Body>{preparation > 0 ? `Biznesit i kanë mbetur ${preparation} min për përgatitjen.` : 'Porosia duhet të jetë gati.'}</Body>}
          {expiry !== null && Number.isFinite(expiry) && <Body>{expiry > 0 ? `Oferta skadon për ${expiry} sekonda` : 'Oferta ka skaduar'}</Body>}
          {blocked && <Body>{blocked}</Body>}
          <View style={s.row}><View style={s.flex}><Button title="Refuzo" secondary disabled={busy || expiry === 0} onPress={() => action.mutate({ kind: 'reject', id: order.id })} /></View><View style={s.flex}><Button title="Prano" disabled={busy || !!blocked} onPress={() => action.mutate({ kind: 'accept', id: order.id })} /></View></View>
        </OrderCard>;
      })}
    </>}
  </Screen>;
}

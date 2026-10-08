import { useEffect } from 'react';
import { BackHandler, Linking, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Body, Button, Card, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { BusinessHeader, Loading } from '../../src/features/business/components';
import { useBusinessData } from '../../src/features/business/hooks';
import { businessError } from '../../src/features/business/domain';
import { formatLek, statusLabels } from '../../src/features/rider/domain';

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={local.detail}><Text style={local.label}>{label}</Text><Text selectable style={local.value}>{value}</Text></View>;
}

export default function OrderDetails() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { dashboard } = useBusinessData();
  const order = dashboard.data?.orders.find(item => item.id === params.id);
  const goHome = () => router.replace('/(business)/orders');
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
    return () => subscription.remove();
  }, []);
  return <Screen>
    <BusinessHeader title="Detajet e porosisë" refreshing={dashboard.isFetching} refresh={() => { void dashboard.refetch(); }} />
    <Button secondary title="← Kthehu te porositë" onPress={goHome} />
    {dashboard.isPending && <Loading />}
    {dashboard.error && <Notice>{businessError(dashboard.error)}</Notice>}
    {dashboard.data && !order && <Notice>Porosia nuk gjendet më në listën e fundit. Kthehu te porositë dhe rifresko faqen.</Notice>}
    {order && <>
      <Card><View style={local.headingRow}><Text selectable style={local.code}>{order.code}</Text><Text style={local.badge}>{statusLabels[order.status as keyof typeof statusLabels] ?? order.status}</Text></View>
        <SectionTitle detail={new Date(order.createdAt).toLocaleString('sq-AL')}>Informacioni i porosisë</SectionTitle>
        <Detail label="Klienti" value={order.customerName || 'Pa emër'} />
        <Detail label="Telefoni" value={order.customerPhone || 'Pa telefon'} />
        <Detail label="Adresa e dorëzimit" value={order.deliveryAddress} />
        <Detail label="Përshkrimi" value={order.productDescription || 'Pa përshkrim'} />
        <Detail label="Koha e përgatitjes" value={`${order.readyMinutes} minuta`} />
        {!!order.googleMapsUrl && <Button secondary title="Hap lokacionin në Google Maps" onPress={() => { void Linking.openURL(order.googleMapsUrl!).catch(() => undefined); }} />}
      </Card>
      <Card><SectionTitle>Pagesa dhe transporti</SectionTitle>
        <Detail label="Vlera e porosisë" value={formatLek(order.productValue)} />
        <Detail label="Transporti" value={formatLek(order.transportFee)} />
        <Detail label="Totali" value={formatLek(order.totalAmount)} />
        {typeof order.calculatedTransportFee === 'number' && <Detail label="Transporti i llogaritur" value={formatLek(order.calculatedTransportFee)} />}
        <Detail label="Tarifa e ndryshuar manualisht" value={order.transportFeeOverridden ? 'Po' : 'Jo'} />
        <Detail label="Shtesa e unazës" value={order.ringSurchargeApplied ? formatLek(order.ringSurchargeFee) : 'Nuk aplikohet'} />
        <Detail label="Fitimi i motoristit" value={formatLek(order.riderEarning)} />
        <Detail label="Komisioni i platformës" value={formatLek(order.platformCommission)} />
      </Card>
      <Card><SectionTitle>Dërgesa</SectionTitle>
        <Detail label="Motoristi" value={order.riderName || 'Ende i pacaktuar'} />
        <Detail label="Oferta të dërguara" value={String(order.offeredRiderCount)} />
        {typeof order.routeDistanceMeters === 'number' && <Detail label="Distanca" value={`${(order.routeDistanceMeters / 1000).toFixed(2)} km`} />}
        {!!order.routeDistanceSource && <Detail label="Burimi i distancës" value={order.routeDistanceSource} />}
        {!!order.routePreference && <Detail label="Preferenca e itinerarit" value={order.routePreference} />}
      </Card>
    </>}
  </Screen>;
}

const local = StyleSheet.create({
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  code: { fontFamily: 'Manrope_800ExtraBold', color: colors.orange, fontSize: 20 },
  badge: { fontFamily: 'Manrope_600SemiBold', color: colors.orangeDark, fontSize: 12, backgroundColor: colors.orangeSoft, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16 },
  detail: { gap: 3, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontFamily: 'Manrope_500Medium', color: colors.muted, fontSize: 12, lineHeight: 18 },
  value: { fontFamily: 'Manrope_600SemiBold', color: colors.text, fontSize: 15, lineHeight: 22 },
});

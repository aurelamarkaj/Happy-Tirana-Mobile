import { Pressable, Text, TextInput, View } from 'react-native';
import { MapPin, Phone, UserRound } from 'lucide-react-native';
import { Body, Card, colors } from '../../components/ui';
import type { BusinessOrder } from '../../contracts/business';
import { Money, s } from '../rider/components';
import { statusLabels } from '../rider/domain';
export { RiderHeader as BusinessHeader, Loading, Metric } from '../rider/components';
export const inputStyle = { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: colors.text, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, minHeight: 50 };
export function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <TextInput accessibilityLabel="Kërko porosi" placeholder="Kërko kod, klient, telefon ose adresë" placeholderTextColor={colors.muted} value={value} onChangeText={onChange} style={inputStyle} />; }
export function BusinessOrderCard({ order, onPress }: { order: BusinessOrder; onPress?: () => void }) {
  const content = <Card><View style={s.row}><Text style={s.code}>ID: {order.code}</Text><Text style={s.badge}>{statusLabels[order.status as keyof typeof statusLabels] ?? order.status}</Text></View>
    <Text style={s.heading}>{order.customerName || 'Klient'}</Text>
    <View style={{ gap: 9 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Phone size={16} color={colors.orange} /><Body>{order.customerPhone || 'Pa telefon'}</Body></View><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}><MapPin size={16} color={colors.success} /><View style={{ flex: 1 }}><Body>{order.deliveryAddress}</Body></View></View>{order.riderName ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><UserRound size={16} color={colors.blue} /><Body>Motorrist: {order.riderName}</Body></View> : null}</View>
    {!!order.productDescription && <Body>{order.productDescription}</Body>}<Body>Gati për {order.readyMinutes} min · {new Date(order.createdAt).toLocaleString('sq-AL')}</Body>
    {!order.riderName && <Body>Në pritje të motorristit · {order.offeredRiderCount} oferta</Body>}
    <View style={s.moneyGrid}><Money label="Vlera e porosisë" value={order.productValue} /><Money label="Tarifa e transportit" value={order.transportFee} /></View>
    {onPress && <Text style={{ color: colors.orange, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }}>Prek për të parë të gjitha detajet →</Text>}
  </Card>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`Shiko detajet e porosisë ${order.code}`} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>{content}</Pressable> : content;
}

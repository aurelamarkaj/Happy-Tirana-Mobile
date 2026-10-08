import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { LogOut, RefreshCw, MapPin, Navigation } from 'lucide-react-native';
import { useAuth } from '../../auth/provider';
import { sessions } from '../../auth/runtime';
import { Body, Button, Card, Notice, Title, colors } from '../../components/ui';
import type { RiderOrder } from '../../contracts/rider';
import { formatLek, statusLabels } from './domain';

export function RiderHeader({ title, refreshing, refresh, titleStyle }: { title: string; refreshing: boolean; refresh: () => void; titleStyle?: StyleProp<TextStyle> }) {
  const { session } = useAuth();
  const [error, setError] = useState(false);
  return <View style={s.header}><View style={s.headerCopy}><Text style={s.eyebrow}>HAPPY TIRANA</Text><Title style={titleStyle}>{title}</Title><Body>{session?.account.name}</Body></View>
    <View style={s.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Rifresko" disabled={refreshing} onPress={refresh} style={({ pressed }) => [s.iconButton, (pressed || refreshing) && { opacity: 0.55 }]}><RefreshCw size={20} color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Dil" onPress={() => { void sessions.logout().catch(() => setError(true)); }} style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.55 }]}><LogOut size={20} color={colors.orange} /></Pressable></View>
    {error && <Notice>Sesioni u mbyll, por ruajtja e sigurt nuk u pastrua. Rihap aplikacionin.</Notice>}
  </View>;
}
export function Loading() { return <ActivityIndicator color={colors.orange} accessibilityLabel="Po ngarkohen të dhënat" />; }
export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <Card style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.value}>{value}</Text>{detail && <Text style={s.metricDetail}>{detail}</Text>}</Card>;
}
export function OrderCard({ order, children }: { order: RiderOrder; children?: ReactNode }) {
  return <Card><View style={s.row}><Text style={s.code}>ID: {order.code}</Text><Text style={s.badge}>{statusLabels[order.status]}</Text></View>
    <Text style={s.heading}>{order.businessName}</Text>
    {order.businessCategory && <Body>{order.businessCategory}</Body>}
    <View style={s.addressBlock}><View style={s.addressRow}><MapPin size={17} color={colors.orange} /><View style={s.addressCopy}><Text style={s.addressLabel}>MARRJE</Text><Body>{order.pickupAddress}</Body></View></View><View style={s.addressLine} /><View style={s.addressRow}><Navigation size={17} color={colors.success} /><View style={s.addressCopy}><Text style={s.addressLabel}>DORËZIM</Text><Body>{order.dropoffAddress}</Body></View></View></View>
    {order.productDescription ? <Body>{order.productDescription}</Body> : null}
    <Body>Gati për {order.readyMinutes} min</Body>
    <View style={s.moneyGrid}><Money label="Totali për t’u arkëtuar" value={order.totalAmount} /></View>
    {children}
  </Card>;
}
export function Money({ label, value }: { label: string; value: number }) {
  return <View style={s.money}><Body>{label}</Body><Text style={s.price}>{formatLek(value)}</Text></View>;
}
export function PhoneButton({ phone, label }: { phone: string | null; label: string }) {
  const [error, setError] = useState(false);
  if (!phone) return null;
  const sanitized = phone.replace(/[^\d+]/g, '');
  return <View style={{ gap: 8 }}><Button secondary title={`${label}: ${phone}`} disabled={!sanitized} onPress={() => { setError(false); void Linking.openURL(`tel:${sanitized}`).catch(() => setError(true)); }} />{error && <Notice>Telefonata nuk u hap në këtë pajisje.</Notice>}</View>;
}
export const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1, minWidth: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingTop: 4, paddingBottom: 4 },
  headerCopy: { flex: 1, gap: 1 },
  eyebrow: { fontFamily: 'Manrope_700Bold', fontSize: 10, lineHeight: 15, letterSpacing: 1.4, color: colors.orange },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  code: { fontFamily: 'Manrope_700Bold', color: colors.orange, fontSize: 13, letterSpacing: 0.4 },
  heading: { fontFamily: 'Manrope_600SemiBold', color: colors.text, fontSize: 18, lineHeight: 26 },
  badge: { fontFamily: 'Manrope_600SemiBold', color: colors.orangeDark, fontSize: 11, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16 },
  metric: { flexGrow: 1, flexBasis: 150, minHeight: 122, justifyContent: 'space-between' },
  metricLabel: { fontFamily: 'Manrope_500Medium', color: colors.muted, fontSize: 12, lineHeight: 18 },
  metricDetail: { fontFamily: 'Manrope_400Regular', color: colors.muted, fontSize: 11, lineHeight: 16 },
  value: { fontFamily: 'Manrope_800ExtraBold', color: colors.text, fontSize: 25, letterSpacing: -0.5 },
  addressBlock: { backgroundColor: colors.soft, borderRadius: 14, padding: 13, gap: 8 },
  addressRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  addressCopy: { flex: 1, gap: 1 },
  addressLabel: { fontFamily: 'Manrope_700Bold', color: colors.muted, fontSize: 9, letterSpacing: 1 },
  addressLine: { height: 12, borderLeftWidth: 1, borderLeftColor: '#c8ced6', marginLeft: 8 },
  moneyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  money: { flexGrow: 1, width: '45%', borderRadius: 10, backgroundColor: colors.soft, padding: 12, gap: 6 },
  price: { fontFamily: 'Manrope_700Bold', color: colors.text, fontSize: 16 },
});

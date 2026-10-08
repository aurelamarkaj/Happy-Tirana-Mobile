import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { sessions } from '../../auth/runtime';
import { logoutAdmin } from '../../api/admin';
import { Body, Card, Notice, Title, colors } from '../../components/ui';

export const formatLek = (value: number) => `${Number(value || 0).toLocaleString('sq-AL', { maximumFractionDigits: 2 })} ALL`;
export const statusLabel: Record<string, string> = { CREATED: 'E re', OFFERED: 'Në pritje', ACCEPTED: 'E pranuar', PICKED_UP: 'Në transport', DELIVERED: 'E dorëzuar', CANCELLED: 'E anuluar', ACTIVE: 'Aktiv', INACTIVE: 'Jo aktiv', SUSPENDED: 'I pezulluar' };

export function AdminHeader({ title, subtitle, back = false, refreshing = false, onRefresh }: { title: string; subtitle?: string; back?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState(false);
  async function logout() {
    setError(false);
    await logoutAdmin();
    await sessions.logout().catch(() => setError(true));
  }
  return <View style={s.header}>
    <View style={s.headerTop}>
      {back && <IconButton label="Kthehu" onPress={() => router.back()}><ArrowLeft size={21} color={colors.text} /></IconButton>}
      <View style={{ flex: 1 }}><Text style={s.eyebrow}>ADMIN · HAPPY TIRANA</Text><Title>{title}</Title>{subtitle ? <Body>{subtitle}</Body> : null}</View>
      {onRefresh && <IconButton label="Rifresko" disabled={refreshing} onPress={onRefresh}><RefreshCw size={20} color={colors.text} /></IconButton>}
      <IconButton label="Dil" onPress={() => { void logout(); }}><LogOut size={20} color={colors.orange} /></IconButton>
    </View>
    {error && <Notice>Sesioni u mbyll, por ruajtja lokale nuk u pastrua. Rihap aplikacionin.</Notice>}
  </View>;
}

export function IconButton({ children, label, onPress, disabled }: { children: ReactNode; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.icon, (pressed || disabled) && { opacity: 0.55 }]}>{children}</Pressable>;
}

export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <Card style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text>{detail ? <Text style={s.metricDetail}>{detail}</Text> : null}</Card>;
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: KeyboardTypeOptions; multiline?: boolean }) {
  return <View style={{ gap: 6 }}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={[s.input, multiline && { minHeight: 82, textAlignVertical: 'top' }]} /></View>;
}

export function Choice<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <View style={s.choices}>{options.map(option => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[s.choice, value === option.value && s.choiceActive]}><Text style={[s.choiceText, value === option.value && s.choiceTextActive]}>{option.label}</Text></Pressable>)}</View>;
}

const s = StyleSheet.create({
  header: { gap: 10 }, headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  eyebrow: { color: colors.orange, fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.2, marginBottom: 2 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  metric: { flexGrow: 1, flexBasis: 145, minHeight: 118, justifyContent: 'space-between' },
  metricLabel: { color: colors.muted, fontFamily: 'Manrope_500Medium', fontSize: 12 },
  metricValue: { color: colors.text, fontFamily: 'Manrope_800ExtraBold', fontSize: 23 },
  metricDetail: { color: colors.muted, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  label: { color: colors.text, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontFamily: 'Manrope_400Regular', fontSize: 15 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: 'center', paddingHorizontal: 14 },
  choiceActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  choiceText: { color: colors.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 12 }, choiceTextActive: { color: colors.orangeDark },
});
export const adminStyles = s;

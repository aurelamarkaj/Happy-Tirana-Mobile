import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { logoXml } from '../../assets/logo';
import { SafeAreaView } from 'react-native-safe-area-context';

// Source: rider-app/business-portal app/globals.css (including final light overrides).
export const colors = {
  orange: '#ff5500', orangeDark: '#d94300', orangeSoft: '#fff0e8',
  text: '#17202a', muted: '#657181', border: '#e7e9ed', soft: '#f5f6f8',
  white: '#ffffff', danger: '#b42318', success: '#15803d', successSoft: '#eaf8ef', blue: '#2563eb',
};
export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView style={styles.screen}><ScrollView
    style={styles.scroll}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
    nestedScrollEnabled
    overScrollMode="always"
    showsVerticalScrollIndicator
  >{children}</ScrollView></SafeAreaView>;
}
export function Logo() {
  return <View style={styles.logo} accessibilityRole="image" accessibilityLabel="Happy Tirana Courier — Koha juaj, prioriteti ynë"><SvgXml xml={logoXml} width="100%" height="100%" /></View>;
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) { return <Text style={[styles.title, style]}>{children}</Text>; }
export function Body({ children }: { children: ReactNode }) { return <Text style={styles.body}>{children}</Text>; }
export function SectionTitle({ children, detail }: { children: ReactNode; detail?: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>{children}</Text>{detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}</View>;
}
export function EmptyState({ title, message }: { title: string; message: string }) {
  return <View style={styles.empty}><View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✓</Text></View><Text style={styles.emptyTitle}>{title}</Text><Body>{message}</Body></View>;
}
export function Notice({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="alert" style={styles.notice}>{children}</Text>;
}
export function Button({ title, onPress, disabled, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (disabled || pressed) && { opacity: 0.6 }]}><Text style={[styles.buttonText, secondary && { color: colors.orange }]}>{title}</Text></Pressable>;
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.soft },
  scroll: { flex: 1 },
  // Leave enough scroll space above the 72px tab bar so final actions are never obscured.
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 112, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  logo: { width: 230, height: 152, alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: '#eceef1', borderRadius: 20, padding: 18, gap: 14, backgroundColor: colors.white, elevation: 2, shadowColor: '#17202a', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  title: { fontFamily: 'Manrope_800ExtraBold', fontSize: 26, lineHeight: 34, letterSpacing: -0.5, color: colors.text },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 22, color: colors.muted },
  sectionTitle: { gap: 2, marginTop: 4 },
  sectionHeading: { fontFamily: 'Manrope_700Bold', fontSize: 18, lineHeight: 26, color: colors.text },
  sectionDetail: { fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, color: colors.muted },
  notice: { fontFamily: 'Manrope_500Medium', color: colors.danger, fontSize: 13, lineHeight: 20, padding: 13, backgroundColor: '#fff1ed', borderRadius: 14, borderLeftWidth: 3, borderLeftColor: colors.orange },
  button: { minHeight: 50, backgroundColor: colors.orange, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  secondaryButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#ffd0b8', elevation: 0 },
  buttonText: { color: colors.white, fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 22 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  emptyMark: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft },
  emptyMarkText: { color: colors.success, fontFamily: 'Manrope_800ExtraBold', fontSize: 20 },
  emptyTitle: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: colors.text },
});

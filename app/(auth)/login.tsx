import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, LockKeyhole } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { login, sessions } from '../../src/auth/runtime';
import { loginSchema, type LoginInput } from '../../src/contracts/auth';
import { ApiError } from '../../src/api/client';
import { env, requireHttpsUrl } from '../../src/config/env';
import { Screen, Logo, Card, Title, Body, Button, Notice, colors } from '../../src/components/ui';

function loginMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'ADMIN_DEVICE_LIMIT_REACHED') return 'Janë aktive tashmë 2 pajisje administratori. Dil nga njëra pajisje dhe provo përsëri.';
    if (error.code.endsWith('_SUSPENDED')) return 'Llogaria është e pezulluar. Kontakto administratorin.';
    if (error.code.endsWith('_INACTIVE')) return 'Llogaria është joaktive. Kontakto administratorin për aktivizim.';
    if (error.status === 401) return 'Hyrja nuk u krye. Kontrollo email-in dhe fjalëkalimin.';
    if (error.status === 408) return 'API-ja nuk u përgjigj në kohë. Provo përsëri.';
    return 'Hyrja nuk u krye. Provo përsëri më vonë.';
  }
  if (error instanceof Error && error.message.startsWith('Konfiguro ')) return error.message;
  if (error instanceof Error && error.message.startsWith('Ky preview ')) return error.message;
  return 'Hyrja nuk u krye. Kontrollo internetin dhe provo përsëri.';
}
export default function LoginScreen() {
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema('RIDER')), defaultValues: { email: '', password: '' } });
  const mutation = useMutation({ mutationFn: login });
  async function openReset(role: 'RIDER' | 'BUSINESS') {
    setLinkError(null);
    try {
      const url = requireHttpsUrl(role === 'RIDER' ? env.riderResetUrl : env.businessResetUrl, role === 'RIDER' ? 'EXPO_PUBLIC_RIDER_RESET_PASSWORD_URL' : 'EXPO_PUBLIC_BUSINESS_RESET_PASSWORD_URL');
      await Linking.openURL(url);
    } catch (error) { setLinkError(error instanceof Error && error.message.startsWith('Konfiguro ') ? error.message : 'Faqja nuk u hap. Provo përsëri.'); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen><Logo />
    <Card>
      <Title>Hyr në llogari</Title>
      <Body>Hyr si administrator, biznes ose motorist me kredencialet e llogarisë.</Body>
      {sessions.getExpiredRole() && <Notice>Sesioni ka skaduar ose nuk është më i vlefshëm. Hyr përsëri.</Notice>}
      <Text style={s.label}>Email</Text>
      <View style={s.inputRow}><Mail size={20} color={colors.orange} /><Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => <TextInput style={s.input} accessibilityLabel="Email" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!mutation.isPending} placeholder="Email" placeholderTextColor="#687586" />} /></View>
      {errors.email && <Notice>{errors.email.message}</Notice>}
      <Text style={s.label}>Fjalëkalimi</Text>
      <View style={s.inputRow}><LockKeyhole size={20} color={colors.orange} /><Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => <TextInput style={s.input} accessibilityLabel="Fjalëkalimi" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" editable={!mutation.isPending} onSubmitEditing={handleSubmit(input => mutation.mutate(input))} returnKeyType="go" placeholder="Fjalëkalimi" placeholderTextColor="#687586" />} /></View>
      {errors.password && <Notice>{errors.password.message}</Notice>}
      {mutation.error && <Notice>{loginMessage(mutation.error)}</Notice>}
      <Button title={mutation.isPending ? 'Duke hyrë...' : 'Hyr'} disabled={mutation.isPending} onPress={handleSubmit(input => mutation.mutate(input))} />
      <Pressable accessibilityRole="button" onPress={() => setShowReset(!showReset)} style={s.link}><Text style={s.linkText}>Harrova fjalëkalimin</Text></Pressable>
      {showReset && <View style={{ gap: 12 }}><Body>Hap faqen e rikuperimit të llogarisë:</Body><Button secondary title="Rikupero llogarinë e motorristit" onPress={() => { void openReset('RIDER'); }} /><Button secondary title="Rikupero llogarinë e biznesit" onPress={() => { void openReset('BUSINESS'); }} /></View>}
      {linkError && <Notice>{linkError}</Notice>}
    </Card>
  </Screen></KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  label: { fontFamily: 'Manrope_400Regular', fontSize: 14, color: colors.text },
  inputRow: { flexDirection: 'row', gap: 12, minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.soft, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, fontFamily: 'Manrope_400Regular', fontSize: 14, color: colors.text },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontFamily: 'Manrope_600SemiBold', color: colors.orange, fontSize: 14 },
});

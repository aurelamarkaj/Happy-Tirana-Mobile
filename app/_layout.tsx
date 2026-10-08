import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from '../src/auth/provider';
import { queryClient } from '../src/auth/runtime';
import { colors, Notice } from '../src/components/ui';
import { RiderRealtime } from '../src/realtime/rider';
import { BusinessRealtime } from '../src/realtime/business';
import { AdminRealtime } from '../src/realtime/admin';
import { RiderGpsProvider } from '../src/gps/provider';
import { PushProvider } from '../src/push/provider';

function Navigation() {
  const { session, ready, error } = useAuth();
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.orange} accessibilityLabel="Po lexojmë sesionin" /></View>;
  return <>
    <RiderRealtime />
    <BusinessRealtime />
    <AdminRealtime />
    {error && <View style={{ paddingTop: 48, paddingHorizontal: 20 }}><Notice>{error}</Notice></View>}
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={session?.role === 'RIDER'}><Stack.Screen name="(rider)" /></Stack.Protected>
      <Stack.Protected guard={session?.role === 'BUSINESS'}><Stack.Screen name="(business)" /></Stack.Protected>
      <Stack.Protected guard={session?.role === 'ADMIN'}><Stack.Screen name="(admin)" /></Stack.Protected>
    </Stack>
  </>;
}
export default function RootLayout() {
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.white, justifyContent: 'center' }}><ActivityIndicator color={colors.orange} /></View>;
  if (error) return <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}><Text>Fonti nuk u ngarkua. Mbyll dhe rihap aplikacionin.</Text></View>;
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><AuthProvider><PushProvider><RiderGpsProvider><StatusBar style="dark" /><Navigation /></RiderGpsProvider></PushProvider></AuthProvider></QueryClientProvider></SafeAreaProvider>;
}

import { Tabs } from 'expo-router';
import { LayoutDashboard, Bike, Wallet } from 'lucide-react-native';
import { colors } from '../../src/components/ui';
export default function RiderTabs() {
  return <Tabs initialRouteName="dashboard" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.orange, tabBarInactiveTintColor: colors.muted, tabBarHideOnKeyboard: true, tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: colors.white }, tabBarItemStyle: { borderRadius: 14 }, tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 } }}>
    <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <LayoutDashboard color={color} size={size} /> }} />
    <Tabs.Screen name="deliveries" options={{ title: 'Dërgesa', tabBarIcon: ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <Bike color={color} size={size} /> }} />
    <Tabs.Screen name="earnings" options={{ title: 'Fitimet', tabBarIcon: ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <Wallet color={color} size={size} /> }} />
  </Tabs>;
}

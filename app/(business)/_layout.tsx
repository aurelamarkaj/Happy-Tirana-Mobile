import { Tabs } from 'expo-router';
import { ClipboardList, CirclePlus, History } from 'lucide-react-native';
import { colors } from '../../src/components/ui';
export default function BusinessTabs() {
  return <Tabs initialRouteName="orders" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.orange, tabBarInactiveTintColor: colors.muted, tabBarHideOnKeyboard: true, tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: colors.white }, tabBarItemStyle: { borderRadius: 14 }, tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 } }}>
    <Tabs.Screen name="orders" options={{ title: 'Porositë', tabBarIcon: ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <ClipboardList color={color} size={size} /> }} />
    <Tabs.Screen name="new-order" options={{ title: 'Porosi e re', tabBarIcon: ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <CirclePlus color={color} size={size} /> }} />
    <Tabs.Screen name="history" options={{ title: 'Historia', tabBarIcon: ({ color, size }: { color: import('react-native').ColorValue; size: number }) => <History color={color} size={size} /> }} />
    <Tabs.Screen name="order-details" options={{ href: null }} />
  </Tabs>;
}

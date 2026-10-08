import { StyleSheet, Text, View } from 'react-native';
import type { RiderItinerary, RiderOrder, RoutePoint } from '../../contracts/rider';
import { colors } from '../../components/ui';
import { MapCanvas, type MapPoint } from '../../components/map-canvas';
import { useRiderGps } from '../../gps/provider';

export function DeliveryMap({ order, orders, route, itinerary }: { order: RiderOrder; orders?: RiderOrder[]; route?: RoutePoint[]; itinerary?: RiderItinerary }) {
  const { state: gps } = useRiderGps();
  const mapPoints: MapPoint[] = [];
  if (gps.location) mapPoints.push({ lat: gps.location.lat, lng: gps.location.lng, label: 'Ti', title: 'Vendndodhja jote', color: colors.blue });
  const displayedOrders = orders?.length ? orders : [order];
  displayedOrders.forEach((item, index) => {
    const suffix = displayedOrders.length > 1 ? String(index + 1) : '';
    mapPoints.push({ lat: item.pickupLat, lng: item.pickupLng, label: `B${suffix}`, title: `Marrje · ${item.code}\n${item.businessName}\n${item.pickupAddress}`, color: colors.text });
    mapPoints.push({ lat: item.dropoffLat, lng: item.dropoffLng, label: `D${suffix}`, title: `Dorëzim · ${item.code}\n${item.customerName ?? 'Klienti'}\n${item.dropoffAddress}`, color: colors.orange });
  });
  const displayedRoute = itinerary?.coordinates ?? route ?? [];
  return <View style={{ gap: 10 }}><MapCanvas height={310} points={mapPoints} route={displayedRoute} /><View style={styles.legend}><View style={[styles.dot, { backgroundColor: colors.text }]} /><Text style={styles.legendText}>Marrja</Text><View style={[styles.dot, { backgroundColor: colors.orange }]} /><Text style={styles.legendText}>Dorëzimi</Text><View style={[styles.dot, { backgroundColor: colors.blue }]} /><Text style={styles.legendText}>Ti</Text></View></View>;
}
const styles = StyleSheet.create({ legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4 }, legendText: { fontFamily: 'Manrope_600SemiBold', color: colors.muted, fontSize: 11, marginRight: 5 } });

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, Polyline, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
import { colors } from './ui';

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  title: string;
  color: string;
}

const tirana = { latitude: 41.3275, longitude: 19.8187 };

export function MapCanvas({ points, route = [], height = 300 }: { points: MapPoint[]; route?: Array<{ lat: number; lng: number }>; height?: number }) {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const coordinates = useMemo<LatLng[]>(() => [
    ...points.map(point => ({ latitude: point.lat, longitude: point.lng })),
    ...route.map(point => ({ latitude: point.lat, longitude: point.lng })),
  ].filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)), [points, route]);

  useEffect(() => {
    if (!ready || !coordinates.length) return;
    const timer = setTimeout(() => {
      if (coordinates.length === 1) mapRef.current?.animateToRegion({ ...coordinates[0]!, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 350);
      else mapRef.current?.fitToCoordinates(coordinates, { edgePadding: { top: 56, right: 56, bottom: 56, left: 56 }, animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [coordinates, ready]);

  return <View style={[styles.frame, { height }]}> 
    <MapView ref={mapRef} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} style={StyleSheet.absoluteFill} initialRegion={{ ...tirana, latitudeDelta: 0.08, longitudeDelta: 0.08 }} showsCompass showsScale showsBuildings toolbarEnabled={false} scrollEnabled={false} pitchEnabled={false} rotateEnabled={false} loadingEnabled loadingIndicatorColor={colors.orange} loadingBackgroundColor="#e9edf2" onMapReady={() => setReady(true)} accessibilityLabel="Harta Google Maps">
      {route.length > 1 && <Polyline coordinates={route.map(point => ({ latitude: point.lat, longitude: point.lng }))} strokeColor={colors.orange} strokeWidth={5} />}
      {points.map((point, index) => <Marker key={`${point.label}-${point.lat}-${point.lng}-${index}`} coordinate={{ latitude: point.lat, longitude: point.lng }} title={point.title}>
        <View style={[styles.marker, { backgroundColor: point.color }]}><Text style={styles.markerText}>{point.label}</Text></View>
        <Callout><View style={styles.callout}><Text style={styles.calloutText}>{point.title}</Text></View></Callout>
      </Marker>)}
    </MapView>
    {!ready && <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color={colors.orange} /><Text style={styles.message}>Po ngarkohet Google Maps…</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#e9edf2', borderWidth: 1, borderColor: '#dde2e8' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: '#f5f6f8' },
  message: { fontFamily: 'Manrope_500Medium', color: colors.muted, fontSize: 13 },
  marker: { minWidth: 34, height: 34, paddingHorizontal: 7, borderRadius: 17, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  markerText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 12 },
  callout: { maxWidth: 230, padding: 4 },
  calloutText: { color: colors.text, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
});

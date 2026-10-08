import type { LocationPreview } from '../../api/business';
import { MapCanvas } from '../../components/map-canvas';
export default function LocationMap({ location }: { location: LocationPreview }) {
  return <MapCanvas height={260} points={[{ lat: location.lat, lng: location.lng, label: 'D', title: location.addressText, color: '#ff5500' }]} />;
}

import { Body, Card } from '../../components/ui';
import type { LocationPreview } from '../../api/business';
export default function LocationMap({ location }: { location: LocationPreview }) { return <Card><Body>Harta hapet në Android/iOS.</Body><Body>{location.addressText} · {location.lat}, {location.lng}</Body></Card>; }

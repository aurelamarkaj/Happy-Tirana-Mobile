import { Body, Card } from '../../components/ui';
import type { RiderOrder, RoutePoint } from '../../contracts/rider';
export function DeliveryMap({ order }: { order: RiderOrder; route?: RoutePoint[] }) {
  return <Card><Body>Harta native shfaqet në Android/iOS.</Body><Body>{order.pickupAddress} → {order.dropoffAddress}</Body></Card>;
}

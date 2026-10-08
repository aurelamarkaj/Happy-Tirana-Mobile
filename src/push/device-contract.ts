import { z } from 'zod';

export interface PushDevice { expoPushToken: string; platform: 'android' | 'ios' }
export interface RiderDeviceContract {
  body: (device: PushDevice) => unknown;
  validateResponse: (response: unknown) => void;
}
const responseSchema = z.object({ ok: z.literal(true) });

// Mobile-side contract for the backend endpoint requested by the product.
// Registration remains feature-flagged until production deploys this route and
// the Expo/FCM project credentials are supplied.
export const riderDeviceContract: RiderDeviceContract = {
  body: device => ({ expoPushToken: device.expoPushToken, platform: device.platform }),
  validateResponse: response => { responseSchema.parse(response); },
};

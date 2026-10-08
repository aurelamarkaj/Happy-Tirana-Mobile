import { z } from 'zod';
// apps/api/src/server.ts:3999–4010 and rider-app/lib/api.ts:225–245.
export const riderLocationSchema = z.object({
  riderId: z.string().uuid(), orderId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  accuracy: z.number().finite().min(0).optional(), speed: z.number().finite().optional(), heading: z.number().finite().optional(),
});
export type RiderLocationInput = Omit<z.output<typeof riderLocationSchema>, 'riderId'>;

import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { GPS_TASK, gpsMessage, receiveFix } from './service';
// Module scope registration is required for a headless background launch.
if (!TaskManager.isTaskDefined(GPS_TASK)) TaskManager.defineTask<{ locations: LocationObject[] }>(GPS_TASK, async ({ data, error }) => {
  if (error) { gpsMessage('GPS nuk u gjet. Kontrollo vendndodhjen e pajisjes.'); return; }
  // OS can deliver a batch: send only the latest fix, never replay historical positions.
  const latest = data?.locations?.reduce<LocationObject | undefined>((last, next) => !last || next.timestamp > last.timestamp ? next : last, undefined);
  if (latest) { try { await receiveFix(latest); } catch { gpsMessage('GPS nuk u dërgua. Kontrollo internetin dhe lejet.'); } }
});

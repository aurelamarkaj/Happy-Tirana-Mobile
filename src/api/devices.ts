import { pushApi, sessions } from '../auth/runtime';
import { env } from '../config/env';
import { sessionExpired } from '../contracts/auth';
import { riderDeviceContract, type PushDevice, type RiderDeviceContract } from '../push/device-contract';
export async function registerRiderDevice(device: PushDevice, expectedToken: string, signal?: AbortSignal, contract: RiderDeviceContract | null = riderDeviceContract) {
  if (!env.pushRegistration) throw new Error('PUSH_REGISTRATION_DISABLED');
  if (!contract) throw new Error('PUSH_DEVICE_CONTRACT_PENDING');
  const session = sessions.getSession();
  if (session?.role !== 'RIDER' || session.account.token !== expectedToken || sessionExpired(session)) throw new Error('PUSH_SESSION_CHANGED');
  const response = await pushApi<unknown>('/riders/me/devices', { method: 'PUT', body: JSON.stringify(contract.body(device)), signal });
  if (sessions.getSession()?.account.token !== expectedToken) throw new Error('PUSH_SESSION_CHANGED');
  contract.validateResponse(response);
}

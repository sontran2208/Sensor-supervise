import { ref, set, push } from 'firebase/database';
import { firebaseConfigured, rtdb } from '../firebase';
import type { ActuatorCommand } from '../ai/ActuatorController';

const BASE_PATH = 'servoCommands';

export async function publishServoCommandToRTDB(
  deviceId: string,
  command: ActuatorCommand
): Promise<void> {
  if (!firebaseConfigured || !rtdb) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[servoCommands] Firebase RTDB is not configured.');
    }
    return;
  }

  const sanitized = {
    ...command,
    timestamp: command.timestamp ?? Date.now()
  };

  const devicePath = `${BASE_PATH}/${deviceId}`;
  await Promise.all([
    set(ref(rtdb, `${devicePath}/lastCommand`), sanitized),
    set(push(ref(rtdb, `${devicePath}/history`)), sanitized)
  ]);
}







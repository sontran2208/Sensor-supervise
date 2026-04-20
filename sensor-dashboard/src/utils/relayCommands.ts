import { ref, set } from 'firebase/database'
import { firebaseConfigured, rtdb } from '../firebase'

const RELAY_PATH = '/relayControl'

export async function publishRelayStateToRTDB(state: 'ON' | 'OFF'): Promise<void> {
  if (!firebaseConfigured || !rtdb) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[relayCommands] Firebase RTDB is not configured.')
    }
    return
  }
  await set(ref(rtdb, RELAY_PATH), state)
}

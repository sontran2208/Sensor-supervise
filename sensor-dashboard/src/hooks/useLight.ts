import { useLightFeed } from './useLightFeed';
import { useMockLightFeed } from './useMockLightFeed';
import { firebaseConfigured } from '../firebase';

export function useLight(maxItems: number = 200) {
  const live = useLightFeed(maxItems);
  const mock = useMockLightFeed(30, 60_000);
  return firebaseConfigured ? live : mock;
}

export type { LightDoc } from './useLightFeed';



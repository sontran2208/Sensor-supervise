import { useTemperatureFeed } from './useTemperatureFeed';
import { useMockTemperatureFeed } from './useMockTemperatureFeed';
import { firebaseConfigured } from '../firebase';

export function useTemperature(maxItems: number = 200) {
  const live = useTemperatureFeed(maxItems);
  const mock = useMockTemperatureFeed(30, 60_000);
  return firebaseConfigured ? live : mock;
}



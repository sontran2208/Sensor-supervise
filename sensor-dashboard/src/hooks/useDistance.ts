import { useDistanceFeed } from './useDistanceFeed';
import { useMockDistanceFeed } from './useMockDistanceFeed';
import { firebaseConfigured } from '../firebase';

export function useDistance(maxItems: number = 200) {
  const live = useDistanceFeed(maxItems);
  const mock = useMockDistanceFeed(30, 60_000);
  return firebaseConfigured ? live : mock;
}

export type { DistanceDoc } from './useDistanceFeed';



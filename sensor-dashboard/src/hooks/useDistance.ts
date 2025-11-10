import { useDistanceFeed } from './useDistanceFeed';

export function useDistance(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  // Force live data - không dùng mock nữa
  return useDistanceFeed(maxItems, timeRangeMinutes, startDate, endDate);
}

export type { DistanceDoc } from './useDistanceFeed';



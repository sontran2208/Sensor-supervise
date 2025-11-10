import { useLightFeed } from './useLightFeed';

export function useLight(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  // Force live data - không dùng mock nữa
  return useLightFeed(maxItems, timeRangeMinutes, startDate, endDate);
}

export type { LightDoc } from './useLightFeed';



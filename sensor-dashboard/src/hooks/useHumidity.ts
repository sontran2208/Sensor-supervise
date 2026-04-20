import { useHumidityFeed } from './useHumidityFeed';

export function useHumidity(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  return useHumidityFeed(maxItems, timeRangeMinutes, startDate, endDate);
}

export type { HumidityDoc } from './useHumidityFeed';

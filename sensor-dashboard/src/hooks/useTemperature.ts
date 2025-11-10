import { useTemperatureFeed } from './useTemperatureFeed';

export function useTemperature(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  // Force live data - không dùng mock nữa
  return useTemperatureFeed(maxItems, timeRangeMinutes, startDate, endDate);
}



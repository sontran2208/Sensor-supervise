import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db, firebaseConfigured, type TemperatureRecord } from '../firebase';

export type TemperatureDoc = TemperatureRecord & { id: string };

export function useTemperatureFeed(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  const [data, setData] = useState<TemperatureDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !db) {
      setLoading(false);
      setError('Firebase chưa được cấu hình. Vui lòng thêm .env.');
      return;
    }
    
    const ref = collection(db, 'temperature');
    const needsFiltering = Boolean(timeRangeMinutes || (startDate && endDate));
    const fetchLimit = needsFiltering ? Math.max(maxItems * 4, 400) : maxItems;
    const q = query(ref, orderBy('timestamp', 'desc'), limit(fetchLimit));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: TemperatureDoc[] = snap.docs
          .map((d) => {
            const raw = d.data() as any;
            // Support both numeric millis and Firestore Timestamp
            let ts: number;
            const value = Number(raw.value);
            const humidityRaw = Number(raw.humidity);
            const humidity = Number.isFinite(humidityRaw) ? humidityRaw : undefined;
            if (raw.timestamp instanceof Timestamp) {
              ts = raw.timestamp.toMillis();
            } else {
              ts = Number(raw.timestamp);
            }
            if (!Number.isFinite(ts) || !Number.isFinite(value)) {
              return null;
            }
            return { id: d.id, timestamp: ts, value, humidity } as TemperatureDoc;
          })
          .filter(Boolean) as TemperatureDoc[];
        let filtered = items;
        if (timeRangeMinutes) {
          const now = Date.now();
          const startTime = now - (timeRangeMinutes * 60 * 1000);
          filtered = filtered.filter(item => item.timestamp >= startTime);
        } else if (startDate && endDate) {
          const startTime = startDate.getTime();
          const endTime = endDate.getTime();
          filtered = filtered.filter(item => item.timestamp >= startTime && item.timestamp <= endTime);
        }

        // sort ascending by time for charting
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        if (filtered.length > maxItems) {
          filtered = filtered.slice(-maxItems);
        }

        setData(filtered);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [maxItems, timeRangeMinutes, startDate, endDate]);

  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  return { data, latest, loading, error } as const;
}



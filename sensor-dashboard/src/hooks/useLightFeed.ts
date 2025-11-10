import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db, firebaseConfigured, type LightRecord } from '../firebase';

export type LightDoc = LightRecord & { id: string };

export function useLightFeed(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  const [data, setData] = useState<LightDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !db) {
      setLoading(false);
      setError('Firebase chưa được cấu hình. Vui lòng thêm .env.');
      return;
    }
    const ref = collection(db, 'light');
    const needsFiltering = Boolean(timeRangeMinutes || (startDate && endDate));
    const fetchLimit = needsFiltering ? Math.max(maxItems * 4, 400) : maxItems;
    const q = query(ref, orderBy('timestamp', 'desc'), limit(fetchLimit));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: LightDoc[] = snap.docs
          .map((d) => {
            const raw = d.data() as any;
            let ts: number;
            const value = Number(raw.value);
            if (raw.timestamp instanceof Timestamp) {
              ts = raw.timestamp.toMillis();
            } else {
              ts = Number(raw.timestamp);
            }
            if (!Number.isFinite(ts) || !Number.isFinite(value)) {
              return null;
            }
            return { id: d.id, timestamp: ts, value } as LightDoc;
          })
          .filter(Boolean) as LightDoc[];
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

export default useLightFeed;



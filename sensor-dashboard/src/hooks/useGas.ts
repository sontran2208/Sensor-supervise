import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, firebaseConfigured } from '../firebase';

export interface GasDoc {
  id: string;
  mq2_raw: number;   // Raw MQ-2 sensor reading (0-4095 for ESP32)
  timestamp: number;
  createdAt?: Timestamp;
}

export function useGas(
  maxItems: number = 200,
  timeRangeMinutes?: number,
  startDate?: Date,
  endDate?: Date
) {
  const [data, setData] = useState<GasDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !db) {
      setError(new Error('Firebase not initialized'));
      setLoading(false);
      return;
    }

    const ref = collection(db, 'mq2_raw');
    const needsFiltering = Boolean(timeRangeMinutes || (startDate && endDate));
    const fetchLimit = needsFiltering ? Math.max(maxItems * 4, 400) : maxItems;
    const q = query(ref, orderBy('timestamp', 'desc'), limit(fetchLimit));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items: GasDoc[] = snapshot.docs
          .map((d) => {
            const raw = d.data() as any;
            let ts: number;
            // Hỗ trợ cả mq2_raw (format mới) và field value (từ gateway)
            const mq2_raw = Number(raw.mq2_raw ?? raw.value ?? 0);
            
            if (raw.timestamp instanceof Timestamp) {
              ts = raw.timestamp.toMillis();
            } else if (typeof raw.timestamp === 'string') {
              ts = Number(raw.timestamp);
            } else {
              ts = Number(raw.timestamp);
            }
            
            if (!Number.isFinite(ts) || !Number.isFinite(mq2_raw)) {
              return null;
            }
            
            return { id: d.id, timestamp: ts, mq2_raw } as GasDoc;
          })
          .filter(Boolean) as GasDoc[];
        
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
        setError(null);
      },
      (err) => {
        console.error('Error fetching gas data:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxItems, timeRangeMinutes, startDate, endDate]);

  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  return { data, latest, loading, error };
}

export function useGasFeed(maxItems: number = 200) {
  return useGas(maxItems);
}

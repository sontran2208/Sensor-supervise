import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db, firebaseConfigured, type DistanceRecord } from '../firebase';

export type DistanceDoc = DistanceRecord & { id: string };

export function useDistanceFeed(maxItems: number = 200) {
  const [data, setData] = useState<DistanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !db) {
      setLoading(false);
      setError('Firebase chưa được cấu hình. Vui lòng thêm .env.');
      return;
    }
    const ref = collection(db, 'distance');
    const q = query(ref, orderBy('timestamp', 'desc'), limit(maxItems));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: DistanceDoc[] = snap.docs
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
            return { id: d.id, timestamp: ts, value } as DistanceDoc;
          })
          .filter(Boolean) as DistanceDoc[];
        items.sort((a, b) => a.timestamp - b.timestamp);
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [maxItems]);

  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  return { data, latest, loading, error } as const;
}

export default useDistanceFeed;



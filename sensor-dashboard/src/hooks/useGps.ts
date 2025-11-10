import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface GpsDoc {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  accuracy: number;
  satellites: number;
  timestamp: number;
  createdAt: Timestamp;
}

export function useGps(maxItems: number = 200) {
  const [data, setData] = useState<GpsDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firebase not initialized'));
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'gps_data'),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GpsDoc[];
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching GPS data:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxItems]);

  return { data, loading, error };
}

export function useGpsFeed(maxItems: number = 200) {
  return useGps(maxItems);
}

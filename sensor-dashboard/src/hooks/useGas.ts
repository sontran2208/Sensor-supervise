import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface GasDoc {
  id: string;
  co: number;        // Carbon Monoxide (ppm)
  co2: number;       // Carbon Dioxide (ppm)
  smoke: number;     // Smoke level
  lpg: number;       // Liquefied Petroleum Gas
  alcohol: number;    // Alcohol level
  methane: number;    // Methane level
  hydrogen: number;  // Hydrogen level
  airQuality: number; // Air Quality Index (0-500)
  temperature: number; // Sensor temperature
  humidity: number;   // Sensor humidity
  timestamp: number;
  createdAt: Timestamp;
}

export function useGas(maxItems: number = 200) {
  const [data, setData] = useState<GasDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firebase not initialized'));
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'gas_data'),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GasDoc[];
        setData(docs);
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
  }, [maxItems]);

  return { data, loading, error };
}

export function useGasFeed(maxItems: number = 200) {
  return useGas(maxItems);
}

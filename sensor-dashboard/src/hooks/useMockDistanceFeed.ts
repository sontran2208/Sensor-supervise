import { useEffect, useMemo, useRef, useState } from 'react';
import { firebaseConfigured } from '../firebase';

export type DistanceDoc = { id: string; timestamp: number; value: number };

function generateDistance(base: number, idx: number): number {
  // Simulate moderate room distance with small oscillations
  const wave = Math.sin(idx / 10) * 5; // ±5 cm wave
  const noise = (Math.random() - 0.5) * 4; // ±2 cm noise
  return Math.max(0, Number((base + wave + noise).toFixed(1)));
}

function maybeInjectDistanceAnomaly(prevValue: number | null, normalValue: number): number {
  const outlierProb = 0.03;
  const jumpProb = 0.05;
  const r = Math.random();
  if (r < outlierProb) {
    const magnitude = 30 + Math.random() * 40; // 30..70 cm spike/dip
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Number((normalValue + direction * magnitude).toFixed(1)));
  }
  if (r < outlierProb + jumpProb && prevValue != null) {
    const magnitude = 15 + Math.random() * 20; // 15..35 cm jump
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Number((prevValue + direction * magnitude).toFixed(1)));
  }
  return normalValue;
}

export function useMockDistanceFeed(minutes: number = 30, stepMs: number = 60_000, injectAnomalies: boolean = true) {
  const [data, setData] = useState<DistanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (firebaseConfigured) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const now = Date.now();
    const start = now - minutes * stepMs;
    const initial: DistanceDoc[] = [];
    for (let i = 0; i < minutes; i += 1) {
      const normal = generateDistance(120, i); // base ~120 cm
      const prevVal = i === 0 ? null : initial[i - 1].value;
      const value = injectAnomalies ? maybeInjectDistanceAnomaly(prevVal, normal) : normal;
      initial.push({ id: `distance-mock-${i}`, timestamp: start + i * stepMs, value });
    }
    setData(initial);
    setLoading(false);
    counterRef.current = minutes;

    const interval = setInterval(() => {
      counterRef.current += 1;
      const lastTs = (data[data.length - 1]?.timestamp ?? start) + stepMs;
      const normal = generateDistance(120, counterRef.current);
      const prevVal = (data[data.length - 1]?.value ?? initial[initial.length - 1]?.value ?? normal);
      const next = {
        id: `distance-mock-${counterRef.current}`,
        timestamp: lastTs,
        value: injectAnomalies ? maybeInjectDistanceAnomaly(prevVal, normal) : normal,
      } as DistanceDoc;
      setData((prev) => [...prev.slice(-minutes + 1), next]);
    }, Math.min(stepMs, 5_000));

    return () => clearInterval(interval);
  }, [minutes, stepMs, injectAnomalies]);

  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  return { data, latest, loading, error } as const;
}

export default useMockDistanceFeed;



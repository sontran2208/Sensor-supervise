import { useEffect, useMemo, useRef, useState } from 'react';
import { firebaseConfigured } from '../firebase';

export type LightDoc = { id: string; timestamp: number; value: number };

function generateLux(base: number, idx: number): number {
  // Simulate gradual changes with noise
  const wave = Math.sin(idx / 8) * 50; // ±50 lux wave
  const noise = (Math.random() - 0.5) * 30; // ±15 lux noise
  return Math.max(0, Number((base + wave + noise).toFixed(0)));
}

function maybeInjectLightAnomaly(prevValue: number | null, normalValue: number): number {
  const outlierProb = 0.03;
  const jumpProb = 0.05;
  const r = Math.random();
  if (r < outlierProb) {
    const magnitude = 300 + Math.random() * 400; // 300..700 lux
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Math.round(normalValue + direction * magnitude));
  }
  if (r < outlierProb + jumpProb && prevValue != null) {
    const magnitude = 150 + Math.random() * 150; // 150..300 lux
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Math.round(prevValue + direction * magnitude));
  }
  return normalValue;
}

export function useMockLightFeed(minutes: number = 30, stepMs: number = 60_000, injectAnomalies: boolean = true) {
  const [data, setData] = useState<LightDoc[]>([]);
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
    const initial: LightDoc[] = [];
    for (let i = 0; i < minutes; i += 1) {
      const normal = generateLux(600, i); // base ~600 lux
      const prevVal = i === 0 ? null : initial[i - 1].value;
      const value = injectAnomalies ? maybeInjectLightAnomaly(prevVal, normal) : normal;
      initial.push({ id: `light-mock-${i}`, timestamp: start + i * stepMs, value });
    }
    setData(initial);
    setLoading(false);
    counterRef.current = minutes;

    const interval = setInterval(() => {
      counterRef.current += 1;
      const lastTs = (data[data.length - 1]?.timestamp ?? start) + stepMs;
      const normal = generateLux(600, counterRef.current);
      const prevVal = (data[data.length - 1]?.value ?? initial[initial.length - 1]?.value ?? normal);
      const next = {
        id: `light-mock-${counterRef.current}`,
        timestamp: lastTs,
        value: injectAnomalies ? maybeInjectLightAnomaly(prevVal, normal) : normal,
      } as LightDoc;
      setData((prev) => [...prev.slice(-minutes + 1), next]);
    }, Math.min(stepMs, 5_000));

    return () => clearInterval(interval);
  }, [minutes, stepMs, injectAnomalies]);

  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  return { data, latest, loading, error } as const;
}

export default useMockLightFeed;



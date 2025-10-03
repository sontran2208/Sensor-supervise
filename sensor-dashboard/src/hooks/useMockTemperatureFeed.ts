import { useEffect, useMemo, useRef, useState } from 'react';
import type { TemperatureDoc } from './useTemperatureFeed';
import { firebaseConfigured } from '../firebase';

function generateValue(base: number, idx: number): number {
  const wave = Math.sin(idx / 12) * 0.2;
  const noise = (Math.random() - 0.5) * 0.4;
  return Number((base + wave + noise).toFixed(2));
}

function maybeInjectAnomaly(prevValue: number | null, normalValue: number): number {
  // Probability settings
  const outlierProb = 0.03; // 3% outlier chance
  const jumpProb = 0.05;    // 5% sudden jump chance

  const r = Math.random();
  if (r < outlierProb) {
    // Outlier: spike or dip by ~3-5°C
    const magnitude = 3 + Math.random() * 2; // 3..5
    const direction = Math.random() < 0.5 ? -1 : 1;
    const outlier = normalValue + direction * magnitude;
    return Number(outlier.toFixed(2));
  }

  if (r < outlierProb + jumpProb && prevValue != null) {
    // Sudden jump relative to previous point by ~1.5-3°C
    const magnitude = 1.5 + Math.random() * 1.5; // 1.5..3.0
    const direction = Math.random() < 0.5 ? -1 : 1;
    const jumped = prevValue + direction * magnitude;
    return Number(jumped.toFixed(2));
  }

  return normalValue;
}

export function useMockTemperatureFeed(minutes: number = 30, stepMs: number = 60_000, injectAnomalies: boolean = true) {
  const [data, setData] = useState<TemperatureDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    // If Firebase is configured, this mock should be inert but still mounted to satisfy hooks rules
    if (firebaseConfigured) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const now = Date.now();
    const start = now - minutes * stepMs;
    const initial: TemperatureDoc[] = [];
    for (let i = 0; i < minutes; i += 1) {
      const normal = generateValue(27.5, i);
      const prevVal = i === 0 ? null : initial[i - 1].value;
      const value = injectAnomalies ? maybeInjectAnomaly(prevVal, normal) : normal;
      initial.push({ id: `mock-${i}`, timestamp: start + i * stepMs, value });
    }
    setData(initial);
    setLoading(false);
    counterRef.current = minutes;

    const interval = setInterval(() => {
      counterRef.current += 1;
      const lastTs = (data[data.length - 1]?.timestamp ?? start) + stepMs;
      const normal = generateValue(27.5, counterRef.current);
      const prevVal = (data[data.length - 1]?.value ?? initial[initial.length - 1]?.value ?? normal);
      const next = {
        id: `mock-${counterRef.current}`,
        timestamp: lastTs,
        value: injectAnomalies ? maybeInjectAnomaly(prevVal, normal) : normal,
      } as TemperatureDoc;
      setData((prev) => [...prev.slice(-minutes + 1), next]);
    }, Math.min(stepMs, 5_000));

    return () => clearInterval(interval);
  }, [minutes, stepMs, injectAnomalies]);

  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  return { data, latest, loading, error } as const;
}

export default useMockTemperatureFeed;



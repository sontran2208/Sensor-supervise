import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

function generateRoomTemperatureC(base: number, minuteIndex: number): number {
  const diurnalDrift = Math.sin(minuteIndex / 12) * 0.2; // gentle oscillation ~0.2°C
  const randomNoise = (Math.random() - 0.5) * 0.4; // ±0.2°C
  return base + diurnalDrift + randomNoise;
}

function maybeInjectAnomaly(prevValue: number | null, normalValue: number): number {
  const outlierProb = 0.04; // 4%
  const jumpProb = 0.06;    // 6%
  const r = Math.random();
  if (r < outlierProb) {
    const magnitude = 3 + Math.random() * 2; // 3..5°C spike/dip
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Number((normalValue + direction * magnitude).toFixed(2));
  }
  if (r < outlierProb + jumpProb && prevValue != null) {
    const magnitude = 1.5 + Math.random() * 1.5; // 1.5..3.0°C jump
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Number((prevValue + direction * magnitude).toFixed(2));
  }
  return Number(normalValue.toFixed(2));
}

export async function seedTemperatureLastMinutes(minutes: number = 30, intervalMs: number = 60_000) {
  if (!import.meta.env.DEV) {
    throw new Error('Seeding is only allowed in development');
  }

  const now = Date.now();
  const start = now - minutes * intervalMs;
  if (!db) {
    throw new Error('Firestore is not initialized. Ensure Firebase env vars are set.');
  }
  const ref = collection(db, 'temperature');

  const tasks: Promise<unknown>[] = [];
  for (let i = 0; i < minutes; i += 1) {
    const ts = start + i * intervalMs;
    const value = generateRoomTemperatureC(27.5, i);
    tasks.push(
      addDoc(ref, {
        timestamp: ts,
        value: Number(value.toFixed(2)),
      })
    );
  }

  await Promise.all(tasks);
}

export async function seedTemperatureLastMinutesWithAnomalies(minutes: number = 30, intervalMs: number = 60_000) {
  if (!import.meta.env.DEV) {
    throw new Error('Seeding is only allowed in development');
  }
  const now = Date.now();
  const start = now - minutes * intervalMs;
  if (!db) {
    throw new Error('Firestore is not initialized. Ensure Firebase env vars are set.');
  }
  const ref = collection(db, 'temperature');

  const tasks: Promise<unknown>[] = [];
  let prevValue: number | null = null;
  for (let i = 0; i < minutes; i += 1) {
    const ts = start + i * intervalMs;
    const normal = generateRoomTemperatureC(27.5, i);
    const anomalous = maybeInjectAnomaly(prevValue, normal);
    prevValue = anomalous;
    tasks.push(
      addDoc(ref, {
        timestamp: ts,
        value: anomalous,
      })
    );
  }

  await Promise.all(tasks);
}

// -------- Light seeding (lux) --------
function generateLux(base: number, minuteIndex: number): number {
  const wave = Math.sin(minuteIndex / 8) * 50;
  const noise = (Math.random() - 0.5) * 30;
  return Math.max(0, Math.round(base + wave + noise));
}

function maybeInjectLightAnomaly(prevValue: number | null, normalValue: number): number {
  const outlierProb = 0.04;
  const jumpProb = 0.06;
  const r = Math.random();
  if (r < outlierProb) {
    const magnitude = 300 + Math.random() * 400; // 300..700
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Math.round(normalValue + direction * magnitude));
  }
  if (r < outlierProb + jumpProb && prevValue != null) {
    const magnitude = 150 + Math.random() * 150; // 150..300
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Math.round(prevValue + direction * magnitude));
  }
  return Math.max(0, Math.round(normalValue));
}

export async function seedLightLastMinutes(minutes: number = 30, intervalMs: number = 60_000) {
  if (!import.meta.env.DEV) {
    throw new Error('Seeding is only allowed in development');
  }
  const now = Date.now();
  const start = now - minutes * intervalMs;
  if (!db) {
    throw new Error('Firestore is not initialized. Ensure Firebase env vars are set.');
  }
  const ref = collection(db, 'light');
  const tasks: Promise<unknown>[] = [];
  for (let i = 0; i < minutes; i += 1) {
    const ts = start + i * intervalMs;
    const value = generateLux(600, i);
    tasks.push(addDoc(ref, { timestamp: ts, value }));
  }
  await Promise.all(tasks);
}

export async function seedLightLastMinutesWithAnomalies(minutes: number = 30, intervalMs: number = 60_000) {
  if (!import.meta.env.DEV) {
    throw new Error('Seeding is only allowed in development');
  }
  const now = Date.now();
  const start = now - minutes * intervalMs;
  if (!db) {
    throw new Error('Firestore is not initialized. Ensure Firebase env vars are set.');
  }
  const ref = collection(db, 'light');
  const tasks: Promise<unknown>[] = [];
  let prev: number | null = null;
  for (let i = 0; i < minutes; i += 1) {
    const ts = start + i * intervalMs;
    const normal = generateLux(600, i);
    const val = maybeInjectLightAnomaly(prev, normal);
    prev = val;
    tasks.push(addDoc(ref, { timestamp: ts, value: val }));
  }
  await Promise.all(tasks);
}

// -------- Distance seeding (cm) --------
function generateDistance(base: number, minuteIndex: number): number {
  const wave = Math.sin(minuteIndex / 10) * 5;
  const noise = (Math.random() - 0.5) * 4;
  return Math.max(0, Number((base + wave + noise).toFixed(1)));
}

function maybeInjectDistanceAnomaly(prevValue: number | null, normalValue: number): number {
  const outlierProb = 0.04;
  const jumpProb = 0.06;
  const r = Math.random();
  if (r < outlierProb) {
    const magnitude = 30 + Math.random() * 40; // 30..70 cm
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Number((normalValue + direction * magnitude).toFixed(1)));
  }
  if (r < outlierProb + jumpProb && prevValue != null) {
    const magnitude = 15 + Math.random() * 20; // 15..35 cm
    const direction = Math.random() < 0.5 ? -1 : 1;
    return Math.max(0, Number((prevValue + direction * magnitude).toFixed(1)));
  }
  return normalValue;
}

export async function seedDistanceLastMinutes(minutes: number = 30, intervalMs: number = 60_000) {
  if (!import.meta.env.DEV) throw new Error('Seeding is only allowed in development');
  const now = Date.now();
  const start = now - minutes * intervalMs;
  if (!db) throw new Error('Firestore is not initialized. Ensure Firebase env vars are set.');
  const ref = collection(db, 'distance');
  const tasks: Promise<unknown>[] = [];
  for (let i = 0; i < minutes; i += 1) {
    const ts = start + i * intervalMs;
    const value = generateDistance(120, i);
    tasks.push(addDoc(ref, { timestamp: ts, value }));
  }
  await Promise.all(tasks);
}

export async function seedDistanceLastMinutesWithAnomalies(minutes: number = 30, intervalMs: number = 60_000) {
  if (!import.meta.env.DEV) throw new Error('Seeding is only allowed in development');
  const now = Date.now();
  const start = now - minutes * intervalMs;
  if (!db) throw new Error('Firestore is not initialized. Ensure Firebase env vars are set.');
  const ref = collection(db, 'distance');
  const tasks: Promise<unknown>[] = [];
  let prev: number | null = null;
  for (let i = 0; i < minutes; i += 1) {
    const ts = start + i * intervalMs;
    const normal = generateDistance(120, i);
    const val = maybeInjectDistanceAnomaly(prev, normal);
    prev = val;
    tasks.push(addDoc(ref, { timestamp: ts, value: val }));
  }
  await Promise.all(tasks);
}



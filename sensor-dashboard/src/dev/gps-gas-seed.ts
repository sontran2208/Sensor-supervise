import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// GPS Seed Data
export async function seedGpsLastMinutes(minutes: number) {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  const now = Date.now();
  const interval = 30 * 1000; // 30 seconds between readings
  const count = Math.floor((minutes * 60 * 1000) / interval);

  // Starting coordinates (Ho Chi Minh City)
  let lat = 10.8231;
  let lng = 106.6297;
  let altitude = 10;

  for (let i = 0; i < count; i++) {
    const timestamp = now - (i * interval);
    
    // Simulate movement (small random changes)
    lat += (Math.random() - 0.5) * 0.0001;
    lng += (Math.random() - 0.5) * 0.0001;
    altitude += (Math.random() - 0.5) * 2;

    const gpsData = {
      latitude: lat,
      longitude: lng,
      altitude: Math.max(0, altitude),
      speed: Math.random() * 50, // 0-50 km/h
      accuracy: Math.random() * 5 + 1, // 1-6 meters
      satellites: Math.floor(Math.random() * 8) + 4, // 4-12 satellites
      timestamp: timestamp,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'gps_data'), gpsData);
    } catch (error) {
      console.error('Error seeding GPS data:', error);
    }
  }

  console.log(`Seeded ${count} GPS records for last ${minutes} minutes`);
}

// Gas Seed Data
export async function seedGasLastMinutes(minutes: number) {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  const now = Date.now();
  const interval = 30 * 1000; // 30 seconds between readings
  const count = Math.floor((minutes * 60 * 1000) / interval);

  for (let i = 0; i < count; i++) {
    const timestamp = now - (i * interval);
    
    // Simulate realistic gas readings
    const gasData = {
      co: Math.random() * 20, // 0-20 ppm CO
      co2: Math.random() * 2000 + 400, // 400-2400 ppm CO2
      smoke: Math.random() * 500, // 0-500 smoke level
      lpg: Math.random() * 300, // 0-300 LPG
      alcohol: Math.random() * 100, // 0-100 alcohol level
      methane: Math.random() * 2000, // 0-2000 methane
      hydrogen: Math.random() * 200, // 0-200 hydrogen
      airQuality: Math.random() * 200 + 50, // 50-250 AQI
      temperature: Math.random() * 20 + 20, // 20-40°C
      humidity: Math.random() * 40 + 30, // 30-70%
      timestamp: timestamp,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'gas_data'), gasData);
    } catch (error) {
      console.error('Error seeding gas data:', error);
    }
  }

  console.log(`Seeded ${count} gas records for last ${minutes} minutes`);
}

// Gas Seed Data with Anomalies
export async function seedGasLastMinutesWithAnomalies(minutes: number) {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  const now = Date.now();
  const interval = 30 * 1000; // 30 seconds between readings
  const count = Math.floor((minutes * 60 * 1000) / interval);

  for (let i = 0; i < count; i++) {
    const timestamp = now - (i * interval);
    
    // Simulate gas readings with occasional anomalies
    const isAnomaly = Math.random() < 0.1; // 10% chance of anomaly
    
    const gasData = {
      co: isAnomaly ? Math.random() * 100 + 50 : Math.random() * 20, // Anomaly: 50-150 ppm
      co2: isAnomaly ? Math.random() * 5000 + 3000 : Math.random() * 2000 + 400,
      smoke: isAnomaly ? Math.random() * 1000 + 500 : Math.random() * 500,
      lpg: isAnomaly ? Math.random() * 800 + 400 : Math.random() * 300,
      alcohol: Math.random() * 100,
      methane: isAnomaly ? Math.random() * 5000 + 3000 : Math.random() * 2000,
      hydrogen: isAnomaly ? Math.random() * 500 + 300 : Math.random() * 200,
      airQuality: isAnomaly ? Math.random() * 200 + 300 : Math.random() * 200 + 50,
      temperature: Math.random() * 20 + 20,
      humidity: Math.random() * 40 + 30,
      timestamp: timestamp,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'gas_data'), gasData);
    } catch (error) {
      console.error('Error seeding gas data with anomalies:', error);
    }
  }

  console.log(`Seeded ${count} gas records with anomalies for last ${minutes} minutes`);
}

// GPS with jumps/outliers
export async function seedGpsWithJumps(minutes: number) {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }
  const now = Date.now();
  const interval = 30 * 1000;
  const count = Math.floor((minutes * 60 * 1000) / interval);
  let lat = 10.8231;
  let lng = 106.6297;
  let altitude = 10;
  for (let i = 0; i < count; i++) {
    const timestamp = now - (i * interval);
    // Small movement
    lat += (Math.random() - 0.5) * 0.0001;
    lng += (Math.random() - 0.5) * 0.0001;
    altitude += (Math.random() - 0.5) * 2;
    // Occasionally inject a large jump
    if (Math.random() < 0.12) {
      lat += (Math.random() - 0.5) * 0.02; // big jump ~ kilometers
      lng += (Math.random() - 0.5) * 0.02;
    }
    const gpsData = {
      latitude: lat,
      longitude: lng,
      altitude: Math.max(0, altitude),
      speed: Math.random() * 20, // m/s-ish
      accuracy: Math.random() * 5 + 1,
      satellites: Math.floor(Math.random() * 8) + 4,
      timestamp,
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, 'gps_data'), gpsData);
    } catch (error) {
      console.error('Error seeding GPS jumps:', error);
    }
  }
}

// Gas with slow drift
export async function seedGasDrift(minutes: number) {
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }
  const now = Date.now();
  const interval = 30 * 1000;
  const count = Math.floor((minutes * 60 * 1000) / interval);
  let coBase = 4;
  let co2Base = 600;
  let aqiBase = 80;
  for (let i = 0; i < count; i++) {
    const timestamp = now - (i * interval);
    coBase += 0.05 + (Math.random() - 0.5) * 0.02;
    co2Base += 5 + (Math.random() - 0.5) * 3;
    aqiBase += 0.8 + (Math.random() - 0.5) * 0.4;
    const gasData = {
      co: Math.max(0, coBase + (Math.random() - 0.5) * 0.5),
      co2: Math.max(400, co2Base + (Math.random() - 0.5) * 50),
      smoke: Math.max(0, 200 + Math.random() * 80),
      lpg: Math.max(0, 120 + Math.random() * 40),
      alcohol: Math.max(0, Math.random() * 100),
      methane: Math.max(0, 800 + Math.random() * 100),
      hydrogen: Math.max(0, 80 + Math.random() * 30),
      airQuality: Math.max(0, aqiBase + (Math.random() - 0.5) * 10),
      temperature: 26 + (Math.random() - 0.5) * 1.5,
      humidity: 55 + (Math.random() - 0.5) * 5,
      timestamp,
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, 'gas_data'), gasData);
    } catch (error) {
      console.error('Error seeding gas drift:', error);
    }
  }
}

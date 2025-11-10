import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAN6LREsqi28cuyyuSuVwoF6ZKuMnuVB7k",
  authDomain: "sensor-superviser.firebaseapp.com",
  projectId: "sensor-superviser",
  storageBucket: "sensor-superviser.firebasestorage.app",
  messagingSenderId: "212486679523",
  appId: "1:212486679523:web:ba2a73715aa2c730ceced6",
  measurementId: "G-9FWJNPN55L"
};

function hasAllConfig(cfg: Record<string, unknown>): boolean {
  return [
    cfg.apiKey,
    cfg.authDomain,
    cfg.projectId,
    cfg.storageBucket,
    cfg.messagingSenderId,
    cfg.appId,
  ].every(Boolean);
}

export const firebaseConfigured: boolean = hasAllConfig(firebaseConfig);

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

if (firebaseConfigured) {
  function initializeFirebaseApp(): FirebaseApp {
    if (!getApps().length) {
      return initializeApp(firebaseConfig);
    }
    return getApps()[0]!;
  }
  appInstance = initializeFirebaseApp();
  dbInstance = getFirestore(appInstance);

  // Ensure the web app has an authenticated user (anonymous) so Firestore rules with request.auth pass
  const auth = getAuth(appInstance);
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch((err) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[Firebase] Anonymous sign-in failed:', err?.message || err);
        }
      });
    }
  });
} else {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[Firebase] Chưa cấu hình biến môi trường. Tạo file .env và thêm VITE_FIREBASE_*');
  }
}

export const app = appInstance;
export const db = dbInstance;

export type TemperatureRecord = {
  timestamp: number; // milliseconds since epoch
  value: number; // temperature in Celsius
};

export type LightRecord = {
  timestamp: number; // milliseconds since epoch
  value: number; // illuminance in lux
};

export type DistanceRecord = {
  timestamp: number; // milliseconds since epoch
  value: number; // distance in centimeters
};



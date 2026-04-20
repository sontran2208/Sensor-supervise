import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface GpsDoc {
  id: string;
  latitude: number;
  longitude: number;
  // New format from Arduino: lat, lng, mode
  lat?: number;  // Alternative field name from Arduino
  lng?: number;  // Alternative field name from Arduino
  mode?: 'REAL' | 'SIMULATED';  // GPS mode indicator
  // Optional fields (may not be present in new format)
  altitude?: number;
  speed?: number;
  accuracy?: number;
  satellites?: number;
  timestamp: number;
  createdAt?: Timestamp;
}

// Helper để parse timestamp từ nhiều format
function parseTimestamp(ts: any): number | null {
  if (ts instanceof Timestamp) {
    return ts.toMillis();
  } else if (typeof ts === 'string') {
    const num = Number(ts);
    return Number.isFinite(num) && num > 0 ? num : null;
  } else if (typeof ts === 'number') {
    return Number.isFinite(ts) && ts > 0 ? ts : null;
  }
  return null;
}

export function useGps(maxItems: number = 200) {
  const [data, setData] = useState<GpsDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs để tránh re-render không cần thiết
  const dataMapRef = useRef<Map<number, Partial<GpsDoc>>>(new Map());
  const loadedCountRef = useRef(0);
  const mergeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMergingRef = useRef(false);

  // Debounced merge function với tối ưu hơn
  const checkAndMerge = useCallback(() => {
    // Tránh merge đồng thời
    if (isMergingRef.current) return;
    
    // Clear timeout cũ nếu có
    if (mergeTimeoutRef.current) {
      clearTimeout(mergeTimeoutRef.current);
    }
    
    // Tăng debounce lên 300ms để giảm số lần merge
    mergeTimeoutRef.current = setTimeout(() => {
      if (loadedCountRef.current < 3) return; // Chờ cả 3 collection load xong
      if (isMergingRef.current) return; // Đang merge thì bỏ qua

      isMergingRef.current = true;
      
      try {
        const dataMap = dataMapRef.current;
        const TIMESTAMP_TOLERANCE = 1000; // 1 giây
        
        // Tối ưu: Group timestamps theo bucket (mỗi bucket = 1 giây)
        const timestampBuckets = new Map<number, number[]>();
        const allTimestamps = Array.from(dataMap.keys());
        
        // Group timestamps vào buckets
        for (const ts of allTimestamps) {
          const bucket = Math.floor(ts / TIMESTAMP_TOLERANCE);
          if (!timestampBuckets.has(bucket)) {
            timestampBuckets.set(bucket, []);
          }
          timestampBuckets.get(bucket)!.push(ts);
        }
        
        // Merge từng bucket
        const merged: GpsDoc[] = [];
        const sortedBuckets = Array.from(timestampBuckets.keys()).sort((a, b) => b - a).slice(0, maxItems);
        
        for (const bucket of sortedBuckets) {
          const timestamps = timestampBuckets.get(bucket)!.sort((a, b) => b - a);
          
          // Lấy timestamp lớn nhất trong bucket làm key
          const mainTimestamp = timestamps[0];
          let mergedDoc: Partial<GpsDoc> = {};
          
          // Merge tất cả data trong bucket - ưu tiên timestamp mới nhất
          // Timestamps đã được sort desc, nên phần tử đầu tiên là mới nhất
          for (const ts of timestamps) {
            const doc = dataMap.get(ts);
            if (doc) {
              // Latitude/Longitude - lấy từ bất kỳ doc nào có (ưu tiên doc đầu tiên)
              if (mergedDoc.latitude === undefined && doc.latitude !== undefined) {
                mergedDoc.latitude = doc.latitude;
                mergedDoc.lat = doc.lat;
              }
              if (mergedDoc.longitude === undefined && doc.longitude !== undefined) {
                mergedDoc.longitude = doc.longitude;
                mergedDoc.lng = doc.lng;
              }
              
              // Mode - ưu tiên timestamp mới nhất (chỉ set từ doc đầu tiên)
              if (ts === mainTimestamp && doc.mode !== undefined) {
                mergedDoc.mode = doc.mode;
              } else if (mergedDoc.mode === undefined && doc.mode !== undefined) {
                // Fallback: nếu mainTimestamp không có mode, lấy từ doc khác
                mergedDoc.mode = doc.mode;
              }
              
              // ID - lấy từ timestamp mới nhất
              if (ts === mainTimestamp && doc.id) {
                mergedDoc.id = doc.id;
              }
              
              // Optional fields - lấy từ bất kỳ doc nào có (ưu tiên doc đầu tiên)
              if (mergedDoc.altitude === undefined && doc.altitude !== undefined) {
                mergedDoc.altitude = doc.altitude;
              }
              if (mergedDoc.speed === undefined && doc.speed !== undefined) {
                mergedDoc.speed = doc.speed;
              }
              if (mergedDoc.accuracy === undefined && doc.accuracy !== undefined) {
                mergedDoc.accuracy = doc.accuracy;
              }
              if (mergedDoc.satellites === undefined && doc.satellites !== undefined) {
                mergedDoc.satellites = doc.satellites;
              }
              if (!mergedDoc.createdAt && doc.createdAt) {
                mergedDoc.createdAt = doc.createdAt;
              }
            }
          }
          
          // Chỉ thêm nếu có đủ lat và lng
          if (mergedDoc.latitude !== undefined && mergedDoc.longitude !== undefined) {
            const finalDoc: GpsDoc = {
              id: mergedDoc.id || `gps-${mainTimestamp}`,
              latitude: mergedDoc.latitude,
              longitude: mergedDoc.longitude,
              lat: mergedDoc.latitude,
              lng: mergedDoc.longitude,
              mode: mergedDoc.mode || undefined, // Đảm bảo mode được set đúng
              altitude: mergedDoc.altitude,
              speed: mergedDoc.speed,
              accuracy: mergedDoc.accuracy,
              satellites: mergedDoc.satellites,
              timestamp: mainTimestamp,
              createdAt: mergedDoc.createdAt
            };
            
            // Debug: log mode để kiểm tra
            if (import.meta.env.DEV && finalDoc.mode) {
              console.log(`[GPS Merge] Timestamp ${mainTimestamp}: mode=${finalDoc.mode}, lat=${finalDoc.latitude}, lng=${finalDoc.longitude}`);
            }
            
            merged.push(finalDoc);
          }
        }

        // Đã sắp xếp theo bucket rồi, chỉ cần giới hạn số lượng
        const limited = merged.slice(0, maxItems);
        
        // Chỉ update nếu có thay đổi
        setData(prev => {
          if (prev.length === limited.length && 
              prev.every((p, i) => p.timestamp === limited[i]?.timestamp && 
                                p.latitude === limited[i]?.latitude &&
                                p.longitude === limited[i]?.longitude)) {
            return prev; // Không thay đổi, giữ nguyên reference
          }
          return limited;
        });
        
        setLoading(false);
        setError(null);
      } finally {
        isMergingRef.current = false;
      }
    }, 300); // Tăng lên 300ms
  }, [maxItems]);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firebase not initialized'));
      setLoading(false);
      return;
    }

    // Reset refs
    dataMapRef.current = new Map();
    loadedCountRef.current = 0;

    // Đọc từ 3 collection riêng biệt: lat, lng, mode
    const latQuery = query(collection(db, 'lat'), orderBy('timestamp', 'desc'), limit(maxItems));
    const lngQuery = query(collection(db, 'lng'), orderBy('timestamp', 'desc'), limit(maxItems));
    const modeQuery = query(collection(db, 'mode'), orderBy('timestamp', 'desc'), limit(maxItems));

    let latUnsub: (() => void) | null = null;
    let lngUnsub: (() => void) | null = null;
    let modeUnsub: (() => void) | null = null;

    // Subscribe to lat collection
    latUnsub = onSnapshot(
      latQuery,
      (snapshot) => {
        const dataMap = dataMapRef.current;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const timestamp = parseTimestamp(data.timestamp);
          const value = typeof data.value === 'number' ? data.value : null;
          
          if (timestamp && value !== null) {
            if (!dataMap.has(timestamp)) {
              dataMap.set(timestamp, { id: doc.id });
            }
            const entry = dataMap.get(timestamp)!;
            entry.latitude = value;
            entry.lat = value;
          }
        });
        loadedCountRef.current++;
        checkAndMerge();
      },
      (err) => {
        console.error('Error fetching lat data:', err);
        loadedCountRef.current++;
        if (loadedCountRef.current === 3) {
          setError(err);
          setLoading(false);
        }
      }
    );

    // Subscribe to lng collection
    lngUnsub = onSnapshot(
      lngQuery,
      (snapshot) => {
        const dataMap = dataMapRef.current;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const timestamp = parseTimestamp(data.timestamp);
          const value = typeof data.value === 'number' ? data.value : null;
          
          if (timestamp && value !== null) {
            if (!dataMap.has(timestamp)) {
              dataMap.set(timestamp, { id: doc.id });
            }
            const entry = dataMap.get(timestamp)!;
            entry.longitude = value;
            entry.lng = value;
          }
        });
        loadedCountRef.current++;
        checkAndMerge();
      },
      (err) => {
        console.error('Error fetching lng data:', err);
        loadedCountRef.current++;
        if (loadedCountRef.current === 3) {
          setError(err);
          setLoading(false);
        }
      }
    );

    // Subscribe to mode collection
    modeUnsub = onSnapshot(
      modeQuery,
      (snapshot) => {
        const dataMap = dataMapRef.current;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const timestamp = parseTimestamp(data.timestamp);
          const value = typeof data.value === 'string' ? data.value : null;
          
          if (timestamp && value) {
            if (!dataMap.has(timestamp)) {
              dataMap.set(timestamp, { id: doc.id });
            }
            const entry = dataMap.get(timestamp)!;
            entry.mode = (value.toUpperCase() === 'REAL' || value.toUpperCase() === 'SIMULATED') 
              ? value.toUpperCase() as 'REAL' | 'SIMULATED' 
              : undefined;
          }
        });
        loadedCountRef.current++;
        checkAndMerge();
      },
      (err) => {
        console.error('Error fetching mode data:', err);
        loadedCountRef.current++;
        if (loadedCountRef.current === 3) {
          setError(err);
          setLoading(false);
        }
      }
    );

    return () => {
      if (mergeTimeoutRef.current) {
        clearTimeout(mergeTimeoutRef.current);
      }
      if (latUnsub) latUnsub();
      if (lngUnsub) lngUnsub();
      if (modeUnsub) modeUnsub();
    };
  }, [maxItems, checkAndMerge]);

  return { data, loading, error };
}

export function useGpsFeed(maxItems: number = 200) {
  return useGps(maxItems);
}

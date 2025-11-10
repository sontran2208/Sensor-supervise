import type { SensorReading } from '../ai/EdgeAnomalyDetector'

export interface BaselineFile {
  metadata: {
    collectedAt: number
    startTime: number
    endTime: number
    startDate: string
    endDate: string
    sensors: string[]
    totalReadings: number
    readingsBySensor: Record<string, number>
  }
  data: SensorReading[]
}

const BASELINE_DB = 'edge_ai_baseline'
const BASELINE_STORE = 'baseline'

async function openBaselineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BASELINE_DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(BASELINE_STORE)) {
        db.createObjectStore(BASELINE_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Load baseline data from JSON file
 */
export async function loadBaselineFromFile(file: File): Promise<SensorReading[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsed: BaselineFile = JSON.parse(content)
        
        if (!parsed.data || !Array.isArray(parsed.data)) {
          reject(new Error('Invalid baseline file format: missing data array'))
          return
        }

        // Validate and convert to SensorReading[]
        const readings: SensorReading[] = parsed.data
          .filter(r => 
            r.timestamp && 
            typeof r.value === 'number' && 
            Number.isFinite(r.value) &&
            ['temperature', 'light', 'distance', 'gas', 'gps'].includes(r.sensorType)
          )
          .map(r => ({
            timestamp: Number(r.timestamp),
            value: Number(r.value),
            sensorType: r.sensorType as SensorReading['sensorType']
          }))
          .sort((a, b) => a.timestamp - b.timestamp)

        console.log(`✅ Loaded ${readings.length} baseline readings from file`)
        console.log(`📊 Metadata:`, parsed.metadata)
        resolve(readings)
      } catch (error) {
        reject(new Error(`Failed to parse baseline file: ${error}`))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Save baseline data to IndexedDB for persistence
 */
export async function saveBaselineToIndexedDB(readings: SensorReading[]): Promise<void> {
  return new Promise((resolve, reject) => {
    openBaselineDB().then(db => {
      const tx = db.transaction(BASELINE_STORE, 'readwrite')
      const store = tx.objectStore(BASELINE_STORE)
      const data = {
        readings,
        savedAt: Date.now(),
        count: readings.length
      }
      store.put(data, 'baseline_data')
      tx.oncomplete = () => {
        console.log('✅ Baseline saved to IndexedDB')
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }).catch(reject)
  })
}

/**
 * Load baseline data from IndexedDB
 */
export async function loadBaselineFromIndexedDB(): Promise<SensorReading[] | null> {
  return new Promise((resolve, reject) => {
    openBaselineDB().then(db => {
      const tx = db.transaction(BASELINE_STORE, 'readonly')
      const store = tx.objectStore(BASELINE_STORE)
      const getReq = store.get('baseline_data')
      getReq.onsuccess = () => {
        const data = getReq.result
        if (data && data.readings && Array.isArray(data.readings)) {
          console.log(`✅ Loaded ${data.readings.length} baseline readings from IndexedDB`)
          resolve(data.readings)
        } else {
          resolve(null)
        }
      }
      getReq.onerror = () => reject(getReq.error)
    }).catch(reject)
  })
}


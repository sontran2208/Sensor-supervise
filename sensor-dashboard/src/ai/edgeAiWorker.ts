// Web Worker: runs EdgeAISystem off the main thread
// Message protocol:
// { type: 'init' }
// { type: 'process', readings: SensorReading[] }
// { type: 'getStatus' }
// { type: 'ack', id: string }
// { type: 'calibrate', maxPerSensor?: number }
// { type: 'updateConfig', config: Partial<EdgeAISystemConfig> }
// { type: 'labelAlert', id: string, label: 'tp'|'fp'|'tn'|'fn' }
// { type: 'exportEval' }
// { type: 'trainFromBaseline', sensorData: SensorReading[] }
// { type: 'resetThreshold' }
// Responses:
// { type: 'ready' }
// { type: 'result', payload }
// { type: 'status', payload }
// { type: 'error', message }

import { createEdgeAISystem } from './EdgeAISystem'
import type { EdgeAISystemConfig } from './EdgeAISystem'
import { initTfBackend } from './tfBackend'
import type { SensorReading } from './EdgeAnomalyDetector'

const system = createEdgeAISystem()
let started = false
let lastPersistAt = 0

// Minimal IndexedDB helpers for persisting detector state
const DB_NAME = 'edge_ai'
const STORE = 'state'
const KEY = 'detector'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key: string): Promise<any | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.put(value, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // ignore
  }
}

async function loadBaselineFromIndexedDB(): Promise<any[] | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('baseline', 'readonly')
      const store = tx.objectStore('baseline')
      const req = store.get('baseline_data')
      req.onsuccess = () => {
        const data = req.result
        if (data && data.readings && Array.isArray(data.readings)) {
          resolve(data.readings)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function ensureStarted() {
  if (!started) {
    await initTfBackend('wasm')
    await system.start()
    // Try restore detector state from IndexedDB
    try {
      const saved = await idbGet(KEY)
      if (saved) {
        system.setDetectorState(saved)
      }
    } catch {}
    
    // Try load and train from baseline if available
    try {
      const baseline = await loadBaselineFromIndexedDB()
      if (baseline && baseline.length > 0) {
        console.log(`📊 Auto-loading baseline: ${baseline.length} readings`)
        await system.trainFromBaselineData(baseline)
        // Persist state after training
        try {
          const state = system.getDetectorState()
          if (state) await idbSet(KEY, state)
        } catch {}
      }
    } catch (err) {
      console.warn('Failed to auto-load baseline:', err)
    }
    
    started = true
  }
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  try {
    switch (msg.type) {
      case 'init': {
        await ensureStarted()
        ;(self as any).postMessage({ type: 'ready' })
        break
      }
      case 'process': {
        await ensureStarted()
        const readings: SensorReading[] = msg.readings || []
        const result = await system.processSensorData(readings)
        ;(self as any).postMessage({ type: 'result', payload: result })
        // Persist detector state periodically (every 30s)
        const now = Date.now()
        if (now - lastPersistAt > 30000) {
          lastPersistAt = now
          try {
            const state = system.getDetectorState()
            if (state) await idbSet(KEY, state)
          } catch {}
        }
        break
      }
      case 'getStatus': {
        const status = system.getSystemStatus()
        const alerts = system.getActiveAlerts()
        ;(self as any).postMessage({ type: 'status', payload: { ...status, alerts } })
        break
      }
      case 'ack': {
        const ok = system.acknowledgeAlert(msg.id)
        ;(self as any).postMessage({ type: 'ack_result', ok })
        break
      }
      case 'calibrate': {
        await ensureStarted()
        const maxPerSensor = typeof msg.maxPerSensor === 'number' ? msg.maxPerSensor : 200
        await system.calibrateFromHistory(maxPerSensor)
        // Persist state immediately after calibration
        try {
          const state = system.getDetectorState()
          if (state) await idbSet(KEY, state)
        } catch {}
        ;(self as any).postMessage({ type: 'calibrate_result', ok: true })
        break
      }
      case 'updateConfig': {
        await ensureStarted()
        try {
          const cfg: Partial<EdgeAISystemConfig> = msg.config || {}
          system.updateConfig(cfg)
          ;(self as any).postMessage({ type: 'updateConfig_result', ok: true })
        } catch (e: any) {
          ;(self as any).postMessage({ type: 'updateConfig_result', ok: false, error: String(e?.message || e) })
        }
        break
      }
      case 'labelAlert': {
        await ensureStarted()
        const ok = system.labelAlert(msg.id, msg.label)
        ;(self as any).postMessage({ type: 'label_result', ok })
        break
      }
      case 'exportEval': {
        await ensureStarted()
        const csv = system.exportEvaluationCSV()
        ;(self as any).postMessage({ type: 'export_result', csv })
        break
      }
      case 'trainFromBaseline': {
        await ensureStarted()
        try {
          const sensorData: SensorReading[] = msg.sensorData || []
          if (sensorData.length === 0) {
            ;(self as any).postMessage({ type: 'train_result', ok: false, error: 'No sensor data provided' })
            break
          }
          await system.trainFromBaselineData(sensorData)
          // Persist state after training
          try {
            const state = system.getDetectorState()
            if (state) await idbSet(KEY, state)
          } catch {}
          ;(self as any).postMessage({ type: 'train_result', ok: true })
        } catch (e: any) {
          ;(self as any).postMessage({ type: 'train_result', ok: false, error: String(e?.message || e) })
        }
        break
      }
      case 'resetThreshold': {
        await ensureStarted()
        try {
          system.resetThreshold()
          const state = system.getDetectorState()
          if (state) await idbSet(KEY, state)
          ;(self as any).postMessage({ type: 'resetThreshold_result', ok: true })
        } catch (e: any) {
          ;(self as any).postMessage({ type: 'resetThreshold_result', ok: false, error: String(e?.message || e) })
        }
        break
      }
      default:
        ;(self as any).postMessage({ type: 'error', message: 'Unknown message type' })
    }
  } catch (err: any) {
    ;(self as any).postMessage({ type: 'error', message: String(err?.message || err) })
  }
}



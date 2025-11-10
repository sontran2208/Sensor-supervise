import { useState, useEffect, useCallback } from 'react'
import type { SensorReading } from '../ai/EdgeAnomalyDetector'

let sharedWorker: Worker | null = null
const messageListeners = new Set<(event: MessageEvent) => void>()
let statusInterval: number | null = null

function ensureSharedWorker(): Worker {
  if (!sharedWorker) {
    const worker = new Worker(new URL('../ai/edgeAiWorker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent) => {
      messageListeners.forEach((listener) => listener(event))
    })
    worker.postMessage({ type: 'init' })
    sharedWorker = worker
  }
  return sharedWorker
}

// Hook để sử dụng Edge AI System trong React components
export function useEdgeAI() {
  // Web Worker reference
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [optimizations] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    const workerInstance = ensureSharedWorker()
    setWorker(workerInstance)

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.type === 'ready') {
        setIsRunning(true)
      } else if (msg.type === 'status') {
        setSystemStatus(msg.payload)
        if (msg.payload && Array.isArray(msg.payload.alerts)) {
          setAlerts(msg.payload.alerts)
        }
      } else if (msg.type === 'result') {
        const r = msg.payload
        if (r?.alerts) setAlerts(r.alerts)
      }
    }

    messageListeners.add(handleMessage)

    if (statusInterval === null) {
      workerInstance.postMessage({ type: 'getStatus' })
      statusInterval = window.setInterval(() => {
        workerInstance.postMessage({ type: 'getStatus' })
      }, 4000)
    }

    return () => {
      messageListeners.delete(handleMessage)
      if (messageListeners.size === 0 && statusInterval !== null) {
        clearInterval(statusInterval)
        statusInterval = null
      }
    }
  }, [])

  const processSensorData = useCallback(async (sensorData: SensorReading[]) => {
    if (!worker) return null
    return new Promise((resolve) => {
      const handle = (e: MessageEvent) => {
        if (e.data?.type === 'result') {
          worker.removeEventListener('message', handle as any)
          resolve(e.data.payload)
        }
      }
      worker.addEventListener('message', handle as any)
      worker.postMessage({ type: 'process', readings: sensorData })
    })
  }, [worker])

  const acknowledgeAlert = useCallback((alertId: string) => {
    if (!worker) return false
    worker.postMessage({ type: 'ack', id: alertId })
    return true
  }, [worker])

  const calibrateBaseline = useCallback(async (maxPerSensor: number = 200) => {
    if (!worker) return false
    return new Promise<boolean>((resolve) => {
      const handle = (e: MessageEvent) => {
        if (e.data?.type === 'calibrate_result') {
          worker.removeEventListener('message', handle as any)
          resolve(true)
        }
      }
      worker.addEventListener('message', handle as any)
      worker.postMessage({ type: 'calibrate', maxPerSensor })
    })
  }, [worker])

  const updateConfig = useCallback(async (config: any) => {
    if (!worker) return false
    return new Promise<boolean>((resolve) => {
      const handle = (e: MessageEvent) => {
        if (e.data?.type === 'updateConfig_result') {
          worker.removeEventListener('message', handle as any)
          resolve(Boolean(e.data?.ok))
        }
      }
      worker.addEventListener('message', handle as any)
      worker.postMessage({ type: 'updateConfig', config })
    })
  }, [worker])

  const labelAlert = useCallback(async (id: string, label: 'tp'|'fp'|'tn'|'fn') => {
    if (!worker) return false
    return new Promise<boolean>((resolve) => {
      const handle = (e: MessageEvent) => {
        if (e.data?.type === 'label_result') {
          worker.removeEventListener('message', handle as any)
          resolve(Boolean(e.data?.ok))
        }
      }
      worker.addEventListener('message', handle as any)
      worker.postMessage({ type: 'labelAlert', id, label })
    })
  }, [worker])

  const exportEvaluation = useCallback(async () => {
    if (!worker) return ''
    return new Promise<string>((resolve) => {
      const handle = (e: MessageEvent) => {
        if (e.data?.type === 'export_result') {
          worker.removeEventListener('message', handle as any)
          resolve(String(e.data?.csv || ''))
        }
      }
      worker.addEventListener('message', handle as any)
      worker.postMessage({ type: 'exportEval' })
    })
  }, [worker])

  const trainFromBaseline = useCallback(async (sensorData: SensorReading[]) => {
    if (!worker) return { ok: false, error: 'Worker not initialized' }
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const handle = (e: MessageEvent) => {
        if (e.data?.type === 'train_result') {
          worker.removeEventListener('message', handle as any)
          resolve({ ok: Boolean(e.data?.ok), error: e.data?.error })
        }
      }
      worker.addEventListener('message', handle as any)
      worker.postMessage({ type: 'trainFromBaseline', sensorData })
    })
  }, [worker])

  const getSystemLogs = useCallback(() => [], [])
  const getAllSensorStats = useCallback(() => new Map(), [])
  const getResponseHistory = useCallback(() => [], [])

  return {
    system: null,
    isRunning,
    systemStatus,
    alerts,
    optimizations,
    processSensorData,
    acknowledgeAlert,
    calibrateBaseline,
    getSensorStats: (_sensorType: string) => null,
    getAllSensorStats,
    getResponseHistory,
    getSystemLogs,
    updateConfig,
    labelAlert,
    exportEvaluation,
    trainFromBaseline
  }
}

// Hook để tích hợp với sensor data hiện có
export function useSensorAI(sensorType: 'temperature' | 'light' | 'distance' | 'gas' | 'gps') {
  const { processSensorData, alerts, optimizations } = useEdgeAI()
  const [aiAlerts, setAiAlerts] = useState<any[]>([])
  const [aiOptimizations, setAiOptimizations] = useState<any>(null)

  // Convert sensor data to AI format
  const convertToSensorReading = useCallback((data: any[]): SensorReading[] => {
    return data.map(item => ({
      timestamp: item.timestamp || Date.now(),
      value: item.value || item[sensorType] || 0,
      sensorType: sensorType
    }))
  }, [sensorType])

  const processWithAI = useCallback(async (sensorData: any[]) => {
    const readings = convertToSensorReading(sensorData)
    const result: any = await processSensorData(readings)
    
    if (result && (result as any).alerts) {
      setAiAlerts((result as any).alerts.filter((alert: any) => alert.sensorType === sensorType))
    }
    
    if (result && (result as any).responses) {
      const sensorOptimizations = (result as any).responses
        .filter((response: any) => response.sensorType === sensorType)
        .map((response: any) => ({
          samplingRate: response.parameters?.samplingRate || 60,
          thresholdAdjustment: response.parameters?.thresholdAdjustment || 1.0,
          priority: response.priority,
          reason: response.parameters?.reason || 'AI optimization'
        }))
      
      if (sensorOptimizations.length > 0) {
        setAiOptimizations(sensorOptimizations[0])
      }
    }
    
    return result
  }, [processSensorData, convertToSensorReading, sensorType])

  return {
    processWithAI,
    aiAlerts,
    aiOptimizations,
    alerts: alerts.filter((alert: any) => alert.sensorType === sensorType),
    optimizations: optimizations.get(sensorType)
  }
}

export type { SensorReading } from '../ai/EdgeAnomalyDetector'

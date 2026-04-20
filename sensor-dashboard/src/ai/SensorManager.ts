import { EdgeAnomalyDetector } from './EdgeAnomalyDetector'
import type { SensorReading, AnomalyResult, SensorOptimization } from './EdgeAnomalyDetector'

export interface SensorManagerConfig {
  enableRealTimeDetection: boolean
  detectionInterval: number // milliseconds
  maxHistorySize: number
  enableOptimization: boolean
  alertThrottleMs?: number
  dedupWindowMs?: number
  optimizationThrottleMs?: number
}

export interface SensorAlert {
  id: string
  timestamp: number
  sensorType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
  recommendation: string
  acknowledged: boolean
  source?: 'ai_model' | 'point_detection' // Nguồn gốc: từ EdgeAnomalyDetector (AI) hoặc detectPointAnomaly (thuật toán đơn giản)
}

export class SensorManager {
  private detector: EdgeAnomalyDetector
  private config: SensorManagerConfig
  private sensorHistory: Map<string, SensorReading[]> = new Map()
  private alerts: SensorAlert[] = []
  private optimizationRules: Map<string, SensorOptimization> = new Map()
  private detectionInterval: number | null = null
  // State for edge-trigger per sensor
  private sensorState: Map<string, 'normal' | 'anomaly'> = new Map()
  private consecutiveNormalCount: Map<string, number> = new Map()
  private readonly normalResetThreshold = 3
  private lastAlertAt: Map<string, number> = new Map()
  private recentAlertKeys: Array<{ key: string; at: number }> = []
  private labels: Map<string, { label: 'tp' | 'fp' | 'tn' | 'fn'; notedAt: number }> = new Map()
  private lastOptimizationAt: Map<string, number> = new Map()

  /** Shared `detector` must be the same instance as `EdgeAISystem.detector` so status/training match inference. */
  constructor(config: SensorManagerConfig, detector?: EdgeAnomalyDetector) {
    this.config = config
    this.detector = detector ?? new EdgeAnomalyDetector()
    this.initializeSensorTypes()
  }

  private initializeSensorTypes() {
    const sensorTypes = ['temperature', 'light', 'distance', 'gas', 'gps']
    sensorTypes.forEach(type => {
      this.sensorHistory.set(type, [])
    })
  }

  public async addSensorReading(reading: SensorReading): Promise<{
    anomalyResult?: AnomalyResult
    optimization?: SensorOptimization[]
    alert?: SensorAlert
  }> {
    // Add to history
    const history = this.sensorHistory.get(reading.sensorType) || []
    history.push(reading)
    
    // Keep only recent data
    if (history.length > this.config.maxHistorySize) {
      history.shift()
    }
    this.sensorHistory.set(reading.sensorType, history)

    const result: any = {}

    // Real-time anomaly detection
    if (this.config.enableRealTimeDetection) {
      const allRecentData = this.getAllRecentSensorData()
      const anomalyResult = await this.detector.detectAnomaly(allRecentData)
      result.anomalyResult = anomalyResult

      // Generate optimization if anomaly detected
      if (anomalyResult.isAnomaly && this.config.enableOptimization) {
        const now = Date.now()
        const throttleMs = this.config.optimizationThrottleMs ?? 10000
        const optimizations = this.detector.optimizeSensorResponse(anomalyResult)
        result.optimization = optimizations
        optimizations.forEach(opt => {
          const lastAt = this.lastOptimizationAt.get(opt.sensorType) || 0
          if (now - lastAt > throttleMs) {
            this.optimizationRules.set(opt.sensorType, opt)
            this.lastOptimizationAt.set(opt.sensorType, now)
            console.log(`🔧 Applied optimization for ${opt.sensorType}:`, opt)
          }
        })
      }

      // Tạo alert từ Edge AI System (TensorFlow) khi phát hiện anomaly
      if (anomalyResult.isAnomaly) {
        const state = this.sensorState.get(reading.sensorType) || 'normal'
        if (state === 'normal' || state === 'anomaly') {
          const now = Date.now()
          const throttleMs = this.config.alertThrottleMs ?? 30000
          const lastAt = this.lastAlertAt.get(reading.sensorType) || 0
          // Dedup by sensor+message within dedupWindow
          const tmpAlert = this.createAlert(reading, anomalyResult)
          const key = `${tmpAlert.sensorType}_${tmpAlert.message}`
          const dedupWindow = this.config.dedupWindowMs ?? 15000
          const hasRecentSame = this.recentAlertKeys.some(e => e.key === key && (now - e.at) < dedupWindow)
          if ((now - lastAt) > throttleMs && !hasRecentSame) {
            const alert = tmpAlert
            alert.source = 'ai_model'
            this.alerts.push(alert)
            this.lastAlertAt.set(reading.sensorType, now)
            this.recentAlertKeys.push({ key, at: now })
            // Trim recent keys
            const cutoff = now - dedupWindow
            this.recentAlertKeys = this.recentAlertKeys.filter(e => e.at >= cutoff)
            if (!result.alert) result.alert = alert
            this.sensorState.set(reading.sensorType, 'anomaly')
            this.consecutiveNormalCount.set(reading.sensorType, 0)
          }
        }
      }

      // Per-sample point anomaly detection (z-score + spike) - CHỈ DÙNG ĐỂ BACKUP, KHÔNG TẠO ALERT
      // Alerts chỉ được tạo từ Edge AI System (TensorFlow) ở trên
      // Phần này giữ lại để có thể dùng trong tương lai nếu cần
      const point = this.detectPointAnomaly(reading.sensorType)
      if (!point.isAnomaly) {
        // Count normal readings; when enough normals, allow next anomaly alert
        const cur = this.consecutiveNormalCount.get(reading.sensorType) || 0
        const next = cur + 1
        this.consecutiveNormalCount.set(reading.sensorType, next)
        if (next >= this.normalResetThreshold) {
          this.sensorState.set(reading.sensorType, 'normal')
        }
      } else {
        this.consecutiveNormalCount.set(reading.sensorType, 0)
      }
    }

    return result
  }

  private getAllRecentSensorData(): SensorReading[] {
    const allData: SensorReading[] = []
    
    this.sensorHistory.forEach((readings) => {
      // Get last 10 readings from each sensor
      const recentReadings = readings.slice(-10)
      allData.push(...recentReadings)
    })
    
    return allData
  }

  private createAlert(reading: SensorReading, anomalyResult: AnomalyResult): SensorAlert {
    const alert: SensorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sensorType: reading.sensorType,
      severity: anomalyResult.severity,
      message: anomalyResult.recommendation,
      value: reading.value,
      threshold: anomalyResult.sensorThresholds?.[reading.sensorType] ?? this.getThresholdForSensor(reading.sensorType),
      recommendation: anomalyResult.recommendation,
      acknowledged: false
    }
    
    return alert
  }

  private getThresholdForSensor(_sensorType: string): number {
    const thresholds = {
      temperature: 30,
      light: 500,
      distance: 100,
      gas: 10,
      gps: 0.01
    }
    return thresholds[_sensorType as keyof typeof thresholds] || 0
  }

  // Detect anomaly at the latest point of a given sensor using local window
  private detectPointAnomaly(sensorType: string): { isAnomaly: boolean; z: number; delta: number; confidence: number; severity: 'low'|'medium'|'high'|'critical' } {
    const history = this.sensorHistory.get(sensorType) || []
    const windowSize = 20
    const recent = history.slice(-windowSize)
    if (recent.length < 5) return { isAnomaly: false, z: 0, delta: 0, confidence: 0.1, severity: 'low' }

    const last = recent[recent.length - 1]
    const prev = recent[recent.length - 2]
    const values = recent.slice(0, -1).map(r => r.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length
    const std = Math.sqrt(variance) || 1e-6
    const z = Math.abs((last.value - mean) / std)
    const delta = prev ? Math.abs(last.value - prev.value) : 0

    const spikeThresholds: Record<string, number> = { temperature: 1.5, light: 50, distance: 10, gas: 5, gps: 0.001 }
    const spike = delta >= (spikeThresholds[sensorType] ?? 5)
    // Require BOTH: significant spike (delta threshold) AND z-score; prevent false positives from tiny std noise
    const isAnomaly = (z >= 3.0 && std > 0.5) || (spike && z >= 2.0)
    const confidence = Math.min((z / 3) + (spike ? 0.3 : 0), 1)
    const severity: 'low'|'medium'|'high'|'critical' = confidence > 0.9 ? 'critical' : confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low'

    return { isAnomaly, z, delta, confidence, severity }
  }

  public startRealTimeDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
    }

    this.detectionInterval = setInterval(async () => {
      const allData = this.getAllRecentSensorData()
      if (allData.length > 0) {
        await this.detector.detectAnomaly(allData)
        
        // Suppress console spam during periodic detection; alerts are already throttled elsewhere
      }
    }, this.config.detectionInterval) as unknown as number
  }

  public stopRealTimeDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
      this.detectionInterval = null
    }
  }

  public getOptimizationForSensor(sensorType: string): SensorOptimization | null {
    return this.optimizationRules.get(sensorType) || null
  }

  public getAllOptimizations(): Map<string, SensorOptimization> {
    return new Map(this.optimizationRules)
  }

  public getAlerts(): SensorAlert[] {
    return [...this.alerts]
  }

  public getUnacknowledgedAlerts(): SensorAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged)
  }

  // Evaluation: label an alert id
  public labelAlert(alertId: string, label: 'tp' | 'fp' | 'tn' | 'fn'): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false
    this.labels.set(alertId, { label, notedAt: Date.now() })
    return true
  }

  public getEvaluationEntries(): Array<{ id: string; timestamp: number; sensorType: string; severity: string; message: string; label?: string }> {
    return this.alerts.map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      sensorType: a.sensorType,
      severity: a.severity,
      message: a.message,
      label: this.labels.get(a.id)?.label
    }))
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  public clearOldAlerts(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff)
  }

  public getSensorHistory(sensorType: string): SensorReading[] {
    return [...(this.sensorHistory.get(sensorType) || [])]
  }

  public getAllSensorHistory(): Map<string, SensorReading[]> {
    return new Map(this.sensorHistory)
  }

  public getSensorStats(sensorType: string): {
    count: number
    latest: SensorReading | null
    average: number
    min: number
    max: number
    stdDev: number
  } {
    const history = this.sensorHistory.get(sensorType) || []
    
    if (history.length === 0) {
      return {
        count: 0,
        latest: null,
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0
      }
    }

    const values = history.map(r => r.value)
    const sum = values.reduce((a, b) => a + b, 0)
    const average = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return {
      count: history.length,
      latest: history[history.length - 1],
      average,
      min,
      max,
      stdDev
    }
  }

  public updateConfig(newConfig: Partial<SensorManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart detection if interval changed
    if (newConfig.detectionInterval && this.detectionInterval) {
      this.startRealTimeDetection()
    }
  }

  public getConfig(): SensorManagerConfig {
    return { ...this.config }
  }

  public dispose(): void {
    this.stopRealTimeDetection()
    this.detector.dispose()
    this.sensorHistory.clear()
    this.optimizationRules.clear()
    this.alerts = []
  }
}

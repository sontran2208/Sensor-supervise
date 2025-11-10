// Simple fallback Edge AI System without TensorFlow.js
export interface SensorReading {
  timestamp: number
  value: number
  sensorType: 'temperature' | 'light' | 'distance' | 'gas' | 'gps'
}

export interface AnomalyResult {
  isAnomaly: boolean
  confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  anomalyType: 'outlier' | 'drift' | 'spike' | 'pattern_break' | 'insufficient_data' | 'stable' | 'normal' | 'sensor_disconnected' | 'sudden_drop'
  affectedSensors: string[]
  recommendation: string
  timestamp: number
}

export interface SensorOptimization {
  sensorType: string
  samplingRate: number
  thresholdAdjustment: number
  priority: 'low' | 'medium' | 'high'
  reason: string
}

export class SimpleAnomalyDetector {
  constructor() {
    console.log('✅ Simple Anomaly Detector initialized (fallback mode)')
  }

  public async detectAnomaly(sensorData: SensorReading[]): Promise<AnomalyResult> {
    // Simple statistical fallback when AI model is not available
    if (sensorData.length < 3) {
      // Giảm minimum data points từ 5 xuống 3
      return {
        isAnomaly: false,
        confidence: 0.1,
        severity: 'low',
        anomalyType: 'insufficient_data',
        affectedSensors: sensorData.map(d => d.sensorType),
        recommendation: 'Cần thêm dữ liệu để phân tích',
        timestamp: Date.now()
      }
    }

    const values = sensorData.map(d => d.value)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const stdDev = this.calculateStdDev(values)
    
    // NOTE: Bỏ cảnh báo "sensor_disconnected" do không chính xác với nhiều thiết lập
    // Trước đây: coi giá trị <=1.0 hoặc >=100.0 là ngắt cảm biến
    // Hiện tại: không đánh dấu ngắt cảm biến chỉ dựa trên giá trị biên
    
    // Detect sudden drops (temperature drop > 20°C)
    if (values.length >= 2) {
      const latestValue = values[values.length - 1]
      const previousValue = values[values.length - 2]
      const drop = previousValue - latestValue
      
      if (drop > 20.0) {
        return {
          isAnomaly: true,
          confidence: 0.8,
          severity: 'high',
          anomalyType: 'sudden_drop',
          affectedSensors: sensorData.map(d => d.sensorType),
          recommendation: `⚠️ Phát hiện giảm đột ngột ${drop.toFixed(1)}°C. Kiểm tra nguồn và môi trường đo.`,
          timestamp: Date.now()
        }
      }
    }
    
    // Nếu stdDev quá nhỏ (< 1% của mean), coi như không có variation
    if (stdDev < Math.abs(mean) * 0.01) {
      return {
        isAnomaly: false,
        confidence: 0.1,
        severity: 'low',
        anomalyType: 'stable',
        affectedSensors: sensorData.map(d => d.sensorType),
        recommendation: 'Dữ liệu ổn định, không có bất thường',
        timestamp: Date.now()
      }
    }
    
    // Giảm threshold xuống 2 sigma để detect outliers tốt hơn
    const outliers = values.filter(val => Math.abs(val - mean) > 2 * stdDev)
    const outlierPercentage = outliers.length / values.length
    
    // Giảm threshold: chỉ cần 5% outliers hoặc 1 outlier
    const isAnomaly = outlierPercentage >= 0.05 || outliers.length >= 1
    const confidence = isAnomaly ? Math.min(outlierPercentage * 2, 1.0) : 0.1
    
    // Xác định severity dựa trên outlier percentage
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (isAnomaly) {
      if (outlierPercentage >= 0.3) severity = 'critical'
      else if (outlierPercentage >= 0.2) severity = 'high'
      else if (outlierPercentage >= 0.05) severity = 'medium'
    }
    
    return {
      isAnomaly,
      confidence,
      severity,
      anomalyType: isAnomaly ? 'outlier' : 'normal',
      affectedSensors: sensorData.map(d => d.sensorType),
      recommendation: isAnomaly 
        ? `Phát hiện ${outliers.length} giá trị ngoại lệ (${(outlierPercentage * 100).toFixed(1)}%)`
        : 'Dữ liệu bình thường',
      timestamp: Date.now()
    }
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  public optimizeSensorResponse(anomalyResult: AnomalyResult): SensorOptimization[] {
    const optimizations: SensorOptimization[] = []
    
    anomalyResult.affectedSensors.forEach(sensorType => {
      const optimization = this.getOptimizationForSensor(sensorType, anomalyResult.severity)
      optimizations.push(optimization)
    })
    
    return optimizations
  }

  private getOptimizationForSensor(sensorType: string, severity: string): SensorOptimization {
    const baseOptimizations = {
      temperature: {
        low: { samplingRate: 60, thresholdAdjustment: 0.1, priority: 'low' as const },
        medium: { samplingRate: 30, thresholdAdjustment: 0.2, priority: 'medium' as const },
        high: { samplingRate: 10, thresholdAdjustment: 0.3, priority: 'high' as const },
        critical: { samplingRate: 5, thresholdAdjustment: 0.5, priority: 'high' as const }
      },
      gas: {
        low: { samplingRate: 30, thresholdAdjustment: 0.1, priority: 'medium' as const },
        medium: { samplingRate: 15, thresholdAdjustment: 0.2, priority: 'high' as const },
        high: { samplingRate: 5, thresholdAdjustment: 0.3, priority: 'high' as const },
        critical: { samplingRate: 2, thresholdAdjustment: 0.5, priority: 'high' as const }
      },
      light: {
        low: { samplingRate: 60, thresholdAdjustment: 0.1, priority: 'low' as const },
        medium: { samplingRate: 30, thresholdAdjustment: 0.2, priority: 'medium' as const },
        high: { samplingRate: 15, thresholdAdjustment: 0.3, priority: 'medium' as const },
        critical: { samplingRate: 10, thresholdAdjustment: 0.4, priority: 'high' as const }
      },
      distance: {
        low: { samplingRate: 30, thresholdAdjustment: 0.1, priority: 'medium' as const },
        medium: { samplingRate: 15, thresholdAdjustment: 0.2, priority: 'medium' as const },
        high: { samplingRate: 10, thresholdAdjustment: 0.3, priority: 'high' as const },
        critical: { samplingRate: 5, thresholdAdjustment: 0.4, priority: 'high' as const }
      }
    }
    
    const config = baseOptimizations[sensorType as keyof typeof baseOptimizations]?.[severity as keyof typeof baseOptimizations.temperature] || 
                   baseOptimizations.temperature.low
    
    return {
      sensorType,
      samplingRate: config.samplingRate,
      thresholdAdjustment: config.thresholdAdjustment,
      priority: config.priority,
      reason: `Tối ưu cho ${severity} anomaly`
    }
  }

  public dispose() {
    // No cleanup needed for simple detector
  }
}

// Simple Sensor Manager
export class SimpleSensorManager {
  private detector: SimpleAnomalyDetector
  private sensorHistory: Map<string, SensorReading[]> = new Map()
  private alerts: any[] = []
  private optimizationRules: Map<string, SensorOptimization> = new Map()
  private lastAlertTime: Map<string, number> = new Map() // Cooldown tracking

  constructor() {
    this.detector = new SimpleAnomalyDetector()
    this.initializeSensorTypes()
  }

  private initializeSensorTypes() {
    const sensorTypes = ['temperature', 'light', 'distance', 'gas', 'gps']
    sensorTypes.forEach(type => {
      this.sensorHistory.set(type, [])
    })
  }

  public async startRealTimeDetection(): Promise<void> {
    console.log('✅ Simple Sensor Manager started')
  }

  public stopRealTimeDetection(): void {
    console.log('❌ Simple Sensor Manager stopped')
  }

  public async addSensorReading(reading: SensorReading): Promise<any> {
    console.log(`🔍 AI received sensor reading:`, { 
      sensorType: reading.sensorType, 
      value: reading.value, 
      timestamp: new Date(reading.timestamp).toLocaleTimeString() 
    })
    
    // Add to history
    const history = this.sensorHistory.get(reading.sensorType) || []
    history.push(reading)
    
    // Keep only recent data
    if (history.length > 100) {
      history.shift()
    }
    this.sensorHistory.set(reading.sensorType, history)

    const result: any = {}

    // Bỏ cảnh báo ngắt cảm biến tức thời dựa trên giá trị biên

    // Simple anomaly detection
    const allRecentData = this.getAllRecentSensorData()
    if (allRecentData.length > 0) {
      const anomalyResult = await this.detector.detectAnomaly(allRecentData)
      result.anomalyResult = anomalyResult

      // Generate optimization if anomaly detected
      if (anomalyResult.isAnomaly) {
        const optimizations = this.detector.optimizeSensorResponse(anomalyResult)
        result.optimization = optimizations
        
        // Apply optimizations
        optimizations.forEach(opt => {
          this.optimizationRules.set(opt.sensorType, opt)
        })
      }

      // Generate alert if critical or high severity
      if (anomalyResult.severity === 'critical' || anomalyResult.severity === 'high') {
        // Check cooldown period (30 seconds for same sensor type)
        const lastAlert = this.lastAlertTime.get(reading.sensorType) || 0
        const cooldownPeriod = 30000 // 30 seconds
        const now = Date.now()
        
        if (now - lastAlert > cooldownPeriod) {
          const alert = this.createAlert(reading, anomalyResult)
          this.alerts.push(alert)
          result.alert = alert
          this.lastAlertTime.set(reading.sensorType, now)
          
          console.log(`🚨 Alert generated for ${reading.sensorType}: ${anomalyResult.recommendation}`)
        } else {
          console.log(`⏳ Alert cooldown active for ${reading.sensorType}, skipping alert`)
        }
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

  private createAlert(reading: SensorReading, anomalyResult: AnomalyResult): any {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sensorType: reading.sensorType,
      severity: anomalyResult.severity,
      message: anomalyResult.recommendation,
      value: reading.value,
      threshold: this.getThresholdForSensor(reading.sensorType),
      recommendation: anomalyResult.recommendation,
      acknowledged: false
    }
  }

  private getThresholdForSensor(sensorType: string): number {
    const thresholds = {
      temperature: 30,
      light: 500,
      distance: 100,
      gas: 10,
      gps: 0.01
    }
    return thresholds[sensorType as keyof typeof thresholds] || 0
  }

  public getOptimizationForSensor(sensorType: string): SensorOptimization | null {
    return this.optimizationRules.get(sensorType) || null
  }

  public getAllOptimizations(): Map<string, SensorOptimization> {
    return new Map(this.optimizationRules)
  }

  public getAlerts(): any[] {
    return [...this.alerts]
  }

  public getUnacknowledgedAlerts(): any[] {
    return this.alerts.filter(alert => !alert.acknowledged)
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  public getSensorStats(sensorType: string): any {
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

  public getAllSensorStats(): Map<string, any> {
    const stats = new Map()
    const allHistory = this.sensorHistory
    
    allHistory.forEach((_, sensorType) => {
      stats.set(sensorType, this.getSensorStats(sensorType))
    })
    
    return stats
  }

  public dispose(): void {
    this.sensorHistory.clear()
    this.optimizationRules.clear()
    this.alerts = []
    this.detector.dispose()
  }
}

// Simple Response Optimizer
export class SimpleResponseOptimizer {
  private responseHistory: any[] = []

  constructor() {
    // No sensorManager dependency needed for simple version
  }

  public async processAnomaly(anomaly: AnomalyResult): Promise<any[]> {
    const responses: any[] = []

    // Simple response based on severity
    if (anomaly.severity === 'critical') {
      responses.push({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sensorType: anomaly.affectedSensors[0],
        actionType: 'send_alert',
        parameters: {
          message: `🚨 KHẨN CẤP: ${anomaly.recommendation}`,
          urgency: 'critical'
        },
        priority: 'critical',
        status: 'completed'
      })
    }

    this.responseHistory.push(...responses)
    return responses
  }

  public getResponseHistory(): any[] {
    return [...this.responseHistory]
  }

  public dispose(): void {
    this.responseHistory = []
  }
}

// Simple Edge AI System
export class SimpleEdgeAISystem {
  private sensorManager: SimpleSensorManager
  private responseOptimizer: SimpleResponseOptimizer
  private startTime: number
  private isRunning: boolean = false
  private systemLogs: Array<{ timestamp: number; level: string; message: string; data?: any }> = []

  constructor() {
    this.startTime = Date.now()
    this.sensorManager = new SimpleSensorManager()
    this.responseOptimizer = new SimpleResponseOptimizer()
    this.log('info', 'Simple Edge AI System initialized')
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'System is already running')
      return
    }

    try {
      await this.sensorManager.startRealTimeDetection()
      this.isRunning = true
      this.log('info', 'Simple Edge AI System started successfully')
    } catch (error) {
      this.log('error', 'Failed to start Simple Edge AI System', error)
      throw error
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('warn', 'System is not running')
      return
    }

    try {
      this.sensorManager.stopRealTimeDetection()
      this.isRunning = false
      this.log('info', 'Simple Edge AI System stopped')
    } catch (error) {
      this.log('error', 'Error stopping Simple Edge AI System', error)
    }
  }

  public async processSensorData(sensorData: SensorReading[]): Promise<any> {
    if (!this.isRunning) {
      throw new Error('System is not running')
    }

    const results: any = {}

    try {
      // Process each sensor reading
      for (const reading of sensorData) {
        const result = await this.sensorManager.addSensorReading(reading)
        
        if (result.anomalyResult) {
          results.anomalyResult = result.anomalyResult
          
          // Process anomaly with response optimizer
          const responses = await this.responseOptimizer.processAnomaly(result.anomalyResult)
          results.responses = responses
          
          this.log('info', `Processed anomaly for ${reading.sensorType}`, {
            severity: result.anomalyResult.severity,
            confidence: result.anomalyResult.confidence
          })
        }
        
        if (result.alert) {
          if (!results.alerts) results.alerts = []
          results.alerts.push(result.alert)
          
          this.log('warn', `Alert generated for ${reading.sensorType}`, result.alert)
        }
      }

      return results
      
    } catch (error) {
      this.log('error', 'Error processing sensor data', error)
      throw error
    }
  }

  public getSystemStatus(): any {
    const alerts = this.sensorManager.getUnacknowledgedAlerts()
    
    let health: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (alerts.some(alert => alert.severity === 'critical')) {
      health = 'critical'
    } else if (alerts.some(alert => alert.severity === 'high')) {
      health = 'warning'
    }

    return {
      isRunning: this.isRunning,
      sensorsConnected: this.sensorManager.getAllSensorStats().size,
      activeAlerts: alerts.length,
      activeResponses: 0,
      systemHealth: health,
      uptime: Date.now() - this.startTime,
      lastUpdate: Date.now()
    }
  }

  public getSensorOptimizations(): Map<string, any> {
    return this.sensorManager.getAllOptimizations()
  }

  public getActiveAlerts(): any[] {
    return this.sensorManager.getUnacknowledgedAlerts()
  }

  public getResponseHistory(): any[] {
    return this.responseOptimizer.getResponseHistory()
  }

  public getSystemLogs(): Array<{ timestamp: number; level: string; message: string; data?: any }> {
    return [...this.systemLogs]
  }

  public getSensorStats(sensorType: string): any {
    return this.sensorManager.getSensorStats(sensorType)
  }

  public getAllSensorStats(): Map<string, any> {
    return this.sensorManager.getAllSensorStats()
  }

  public acknowledgeAlert(alertId: string): boolean {
    return this.sensorManager.acknowledgeAlert(alertId)
  }

  private log(level: string, message: string, data?: any): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data
    }
    
    this.systemLogs.push(logEntry)
    
    // Keep only last 1000 logs
    if (this.systemLogs.length > 1000) {
      this.systemLogs.shift()
    }
    
    // Console output for development
    console.log(`[${level.toUpperCase()}] ${message}`, data || '')
  }

  public dispose(): void {
    this.stop()
    this.sensorManager.dispose()
    this.responseOptimizer.dispose()
    this.systemLogs = []
    this.log('info', 'Simple Edge AI System disposed')
  }
}

// Factory function to create a pre-configured system
export function createSimpleEdgeAISystem(): SimpleEdgeAISystem {
  return new SimpleEdgeAISystem()
}

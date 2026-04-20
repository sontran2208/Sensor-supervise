import { SensorManager } from './SensorManager'
import { ResponseOptimizer } from './ResponseOptimizer'
import { EdgeAnomalyDetector } from './EdgeAnomalyDetector'
import { ActuatorController, type ActuatorCommand } from './ActuatorController'
import {
  RelayAutomationController,
  type RelayAutomationDecision
} from './RelayAutomationController'
import type { SensorManagerConfig } from './SensorManager'
import type { ResponseOptimizerConfig } from './ResponseOptimizer'
import type { SensorReading, AnomalyResult, SensorOptimization } from './EdgeAnomalyDetector'

export interface EdgeAISystemConfig {
  sensorManager: SensorManagerConfig
  responseOptimizer: ResponseOptimizerConfig
  enableLogging: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export interface SystemStatus {
  isRunning: boolean
  sensorsConnected: number
  activeAlerts: number
  activeResponses: number
  systemHealth: 'healthy' | 'warning' | 'critical'
  uptime: number
  lastUpdate: number
  detectorMetrics?: {
    latestError: number | null
    threshold: number
    globalThreshold: number
    sensorThresholds: Record<string, number>
  }
  trainingStatus?: {
    isTrained: boolean
    trainingType: 'baseline' | 'synthetic' | 'none'
    baselineLoaded: boolean
    modelLoaded: boolean
  }
  optimizations?: SensorOptimization[]
  relayAutomation?: {
    relayState: 'ON' | 'OFF'
    lastDecision: RelayAutomationDecision | null
    recentDecisions: RelayAutomationDecision[]
  }
}

export class EdgeAISystem {
  private sensorManager: SensorManager
  private responseOptimizer: ResponseOptimizer
  private detector: EdgeAnomalyDetector
  private actuatorController: ActuatorController
  private relayAutomationController: RelayAutomationController
  private config: EdgeAISystemConfig
  private startTime: number
  private isRunning: boolean = false
  private systemLogs: Array<{ timestamp: number; level: string; message: string; data?: any }> = []

  constructor(config: EdgeAISystemConfig) {
    this.config = config
    this.startTime = Date.now()
    
    // Single detector shared with SensorManager — status/training/persistence must match inference
    this.detector = new EdgeAnomalyDetector()
    this.sensorManager = new SensorManager(config.sensorManager, this.detector)
    this.responseOptimizer = new ResponseOptimizer(this.sensorManager, config.responseOptimizer)
    this.actuatorController = new ActuatorController()
    this.relayAutomationController = new RelayAutomationController()
    
    this.log('info', 'Edge AI System initialized')
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'System is already running')
      return
    }

    try {
      // Start sensor manager
      this.sensorManager.startRealTimeDetection()
      
      this.isRunning = true
      this.log('info', 'Edge AI System started successfully')
      
      // Start system health monitoring
      this.startHealthMonitoring()
      
    } catch (error) {
      this.log('error', 'Failed to start Edge AI System', error)
      throw error
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('warn', 'System is not running')
      return
    }

    try {
      // Stop sensor manager
      this.sensorManager.stopRealTimeDetection()
      
      this.isRunning = false
      this.log('info', 'Edge AI System stopped')
      
    } catch (error) {
      this.log('error', 'Error stopping Edge AI System', error)
    }
  }

  public async processSensorData(sensorData: SensorReading[]): Promise<{
    anomalyResult?: AnomalyResult
    responses?: any[]
    alerts?: any[]
    actuatorActions?: ActuatorCommand[]
    relayActions?: RelayAutomationDecision[]
    optimizations?: SensorOptimization[]
  }> {
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

        if (Array.isArray(result.optimization) && result.optimization.length > 0) {
          if (!results.optimizations) results.optimizations = []
          result.optimization.forEach((optimization: SensorOptimization) => {
            const existingIndex = results.optimizations.findIndex(
              (item: SensorOptimization) => item.sensorType === optimization.sensorType
            )
            if (existingIndex >= 0) {
              results.optimizations[existingIndex] = optimization
            } else {
              results.optimizations.push(optimization)
            }
          })
        }

        const actuatorAction = this.actuatorController.evaluateTemperatureAutomation(
          reading,
          result.anomalyResult
        )
        if (actuatorAction) {
          if (!results.actuatorActions) results.actuatorActions = []
          results.actuatorActions.push(actuatorAction)
          this.log('info', `Actuator command ${actuatorAction.action}`, actuatorAction)
        }

        const relayDecision = this.relayAutomationController.evaluate(
          reading,
          result.anomalyResult
        )
        if (relayDecision) {
          if (!results.relayActions) results.relayActions = []
          results.relayActions.push(relayDecision)
          this.log('info', `Relay automation ${relayDecision.targetState}`, relayDecision)
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

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkSystemHealth()
    }, 30000) // Check every 30 seconds
  }

  private checkSystemHealth(): void {
    try {
      const alerts = this.sensorManager.getUnacknowledgedAlerts()
      const activeResponses = this.responseOptimizer.getActiveResponses()
      
      let health: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (alerts.some(alert => alert.severity === 'critical')) {
        health = 'critical'
      } else if (alerts.some(alert => alert.severity === 'high') || activeResponses.length > 5) {
        health = 'warning'
      }
      
      this.log('debug', `System health check: ${health}`, {
        alerts: alerts.length,
        activeResponses: activeResponses.length
      })
      
    } catch (error) {
      this.log('error', 'Error in health monitoring', error)
    }
  }

  public getSystemStatus(): SystemStatus {
    const alerts = this.sensorManager.getUnacknowledgedAlerts()
    const activeResponses = this.responseOptimizer.getActiveResponses()
    const allHistory = this.sensorManager.getAllSensorHistory()
    // Count only sensors that actually have data
    const sensorsConnected = Array.from(allHistory.values()).filter(list => list && list.length > 0).length

    let health: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (alerts.some(alert => alert.severity === 'critical')) {
      health = 'critical'
    } else if (alerts.some(alert => alert.severity === 'high') || activeResponses.length > 5) {
      health = 'warning'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDetector: any = this.detector as any
    const metrics = {
      latestError: typeof anyDetector.getLatestError === 'function' ? anyDetector.getLatestError() : null,
      threshold: typeof anyDetector.getCurrentThreshold === 'function' ? anyDetector.getCurrentThreshold() : 0,
      globalThreshold: typeof anyDetector.getCurrentThreshold === 'function' ? anyDetector.getCurrentThreshold() : 0,
      sensorThresholds: typeof anyDetector.getSensorThresholdsForDisplay === 'function'
        ? anyDetector.getSensorThresholdsForDisplay()
        : {}
    }

    const trainingStatus = typeof anyDetector.getTrainingStatus === 'function' 
      ? anyDetector.getTrainingStatus() 
      : undefined
    const optimizations = Array.from(this.sensorManager.getAllOptimizations().values())
    const relayHistory = this.relayAutomationController.getHistory()
    const relayAutomation = {
      relayState: this.relayAutomationController.getRelayState(),
      lastDecision: relayHistory.length > 0 ? relayHistory[relayHistory.length - 1] : null,
      recentDecisions: relayHistory.slice(-3).reverse()
    }

    return {
      isRunning: this.isRunning,
      sensorsConnected,
      activeAlerts: alerts.length,
      activeResponses: activeResponses.length,
      systemHealth: health,
      uptime: Date.now() - this.startTime,
      lastUpdate: Date.now(),
      detectorMetrics: metrics,
      trainingStatus,
      optimizations,
      relayAutomation
    }
  }

  public getSensorOptimizations(): Map<string, any> {
    return this.sensorManager.getAllOptimizations()
  }

  public getActiveAlerts(): any[] {
    return this.sensorManager.getUnacknowledgedAlerts()
  }

  public getActiveResponses(): any[] {
    return this.responseOptimizer.getActiveResponses()
  }

  public getActuatorHistory(): ActuatorCommand[] {
    return this.actuatorController.getHistory()
  }

  public getServoState(): 'open' | 'closed' {
    return this.actuatorController.getServoState()
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
    const stats = new Map()
    const allHistory = this.sensorManager.getAllSensorHistory()
    
    allHistory.forEach((_, sensorType) => {
      stats.set(sensorType, this.sensorManager.getSensorStats(sensorType))
    })
    
    return stats
  }

  public acknowledgeAlert(alertId: string): boolean {
    return this.sensorManager.acknowledgeAlert(alertId)
  }

  // Evaluation hooks
  public labelAlert(alertId: string, label: 'tp' | 'fp' | 'tn' | 'fn'): boolean {
    return this.sensorManager.labelAlert(alertId, label)
  }

  public exportEvaluationCSV(): string {
    const rows = this.sensorManager.getEvaluationEntries()
    const header = ['id','timestamp','sensorType','severity','message','label']
    const lines = [header.join(',')]
    rows.forEach(r => {
      const vals = [
        r.id,
        String(r.timestamp),
        r.sensorType,
        r.severity,
        JSON.stringify(r.message),
        r.label || ''
      ]
      lines.push(vals.join(','))
    })
    return lines.join('\n')
  }

  // Expose detector state for persistence
  public getDetectorState(): any {
    // Only expose necessary internal state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDetector: any = this.detector as any
    if (typeof anyDetector.getState === 'function') {
      return anyDetector.getState()
    }
    return null
  }

  public setDetectorState(state: any): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDetector: any = this.detector as any
    if (state && typeof anyDetector.setState === 'function') {
      anyDetector.setState(state)
      this.log('info', 'Detector state restored')
    }
  }

  public async calibrateFromHistory(maxPerSensor: number = 200): Promise<void> {
    // Gather recent history per sensor
    const allHistory = this.sensorManager.getAllSensorHistory()
    const batch: SensorReading[] = []
    allHistory.forEach((list) => {
      if (list && list.length > 0) {
        const take = list.slice(-maxPerSensor)
        batch.push(...take)
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDetector: any = this.detector as any
    if (typeof anyDetector.calibrateBaseline === 'function') {
      await anyDetector.calibrateBaseline(batch)
      this.log('info', 'Detector calibrated from history', { size: batch.length })
    }
  }

  public async trainFromBaselineData(sensorData: SensorReading[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDetector: any = this.detector as any
    if (typeof anyDetector.trainFromRealData === 'function') {
      await anyDetector.trainFromRealData(sensorData)
      this.log('info', 'Model trained from baseline data', { size: sensorData.length })
    } else {
      throw new Error('trainFromRealData not available on detector')
    }
  }

  public resetThreshold(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyDetector: any = this.detector as any
    if (typeof anyDetector.resetThresholdState === 'function') {
      anyDetector.resetThresholdState()
      this.log('info', 'Detector threshold state reset')
    }
  }

  public addCustomOptimizationRule(rule: any): void {
    this.responseOptimizer.addCustomRule(rule)
    this.log('info', `Added custom optimization rule: ${rule.name}`)
  }

  public removeOptimizationRule(ruleId: string): boolean {
    const result = this.responseOptimizer.removeRule(ruleId)
    if (result) {
      this.log('info', `Removed optimization rule: ${ruleId}`)
    }
    return result
  }

  public updateConfig(newConfig: Partial<EdgeAISystemConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.sensorManager) {
      this.sensorManager.updateConfig(newConfig.sensorManager)
    }
    
    if (newConfig.responseOptimizer) {
      this.responseOptimizer.updateConfig(newConfig.responseOptimizer)
    }
    
    this.log('info', 'System configuration updated', newConfig)
  }

  public getConfig(): EdgeAISystemConfig {
    return { ...this.config }
  }

  private log(level: string, message: string, data?: any): void {
    if (!this.config.enableLogging) return
    
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 }
    const currentLevel = logLevels[this.config.logLevel as keyof typeof logLevels]
    const messageLevel = logLevels[level as keyof typeof logLevels]
    
    if (messageLevel >= currentLevel) {
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
      // console.log(`[${level.toUpperCase()}] ${message}`, data || '')
    }
  }

  public dispose(): void {
    this.stop()
    this.sensorManager.dispose()
    this.responseOptimizer.dispose()
    this.detector.dispose()
    this.actuatorController.reset()
    this.relayAutomationController.reset()
    this.systemLogs = []
    this.log('info', 'Edge AI System disposed')
  }
}

// Factory function to create a pre-configured system
export function createEdgeAISystem(): EdgeAISystem {
  const config: EdgeAISystemConfig = {
    sensorManager: {
      enableRealTimeDetection: true,
      detectionInterval: 5000, // 5 seconds
      maxHistorySize: 100,
      enableOptimization: true,
      alertThrottleMs: 12000,
      dedupWindowMs: 10000,
      optimizationThrottleMs: 10000
    },
    responseOptimizer: {
      enableAutoResponse: true,
      responseDelay: 1000, // 1 second
      maxConcurrentResponses: 3,
      enableLearning: true
    },
    enableLogging: true,
    logLevel: 'info'
  }
  
  return new EdgeAISystem(config)
}

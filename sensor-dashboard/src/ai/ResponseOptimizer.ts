import { SensorManager } from './SensorManager'
import type { AnomalyResult } from './EdgeAnomalyDetector'

export interface ResponseOptimizerConfig {
  enableAutoResponse: boolean
  responseDelay: number // milliseconds
  maxConcurrentResponses: number
  enableLearning: boolean
}

export interface ResponseAction {
  id: string
  timestamp: number
  sensorType: string
  actionType: 'adjust_threshold' | 'change_sampling' | 'send_alert' | 'calibrate' | 'maintenance'
  parameters: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: any
  error?: string
}

export interface OptimizationRule {
  id: string
  name: string
  condition: (anomaly: AnomalyResult, sensorType: string) => boolean
  action: (anomaly: AnomalyResult, sensorType: string) => ResponseAction
  priority: number
  enabled: boolean
}

export class ResponseOptimizer {
  private sensorManager: SensorManager
  private config: ResponseOptimizerConfig
  private responseQueue: ResponseAction[] = []
  private activeResponses: Map<string, ResponseAction> = new Map()
  private optimizationRules: OptimizationRule[] = []
  private responseHistory: ResponseAction[] = []
  private learningData: Map<string, number[]> = new Map()

  constructor(sensorManager: SensorManager, config: ResponseOptimizerConfig) {
    this.sensorManager = sensorManager
    this.config = config
    this.initializeDefaultRules()
  }

  private initializeDefaultRules(): void {
    // Temperature anomaly rules
    this.optimizationRules.push({
      id: 'temp_critical_spike',
      name: 'Temperature Critical Spike',
      condition: (_anomaly, sensorType) => 
        sensorType === 'temperature' && 
        _anomaly.severity === 'critical' && 
        _anomaly.anomalyType === 'spike',
      action: (_anomaly, sensorType) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sensorType,
        actionType: 'send_alert',
        parameters: {
          message: '🚨 Nhiệt độ tăng đột biến! Kiểm tra hệ thống làm mát ngay lập tức!',
          recipients: ['admin', 'maintenance'],
          urgency: 'critical'
        },
        priority: 'critical',
        status: 'pending'
      }),
      priority: 1,
      enabled: true
    })

    // Gas leak detection
    this.optimizationRules.push({
      id: 'gas_leak_detection',
      name: 'Gas Leak Detection',
      condition: (_anomaly, sensorType) => 
        sensorType === 'gas' && 
        _anomaly.severity === 'high' && 
        _anomaly.confidence > 0.8,
      action: (_anomaly, sensorType) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sensorType,
        actionType: 'send_alert',
        parameters: {
          message: '⚠️ Phát hiện rò rỉ khí gas! Sơ tán và kiểm tra ngay!',
          recipients: ['admin', 'safety', 'emergency'],
          urgency: 'high',
          autoEvacuate: true
        },
        priority: 'critical',
        status: 'pending'
      }),
      priority: 1,
      enabled: true
    })

    // Light sensor drift
    this.optimizationRules.push({
      id: 'light_sensor_drift',
      name: 'Light Sensor Drift',
      condition: (_anomaly, sensorType) => 
        sensorType === 'light' && 
        _anomaly.anomalyType === 'drift' && 
        _anomaly.severity === 'medium',
      action: (_anomaly, sensorType) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sensorType,
        actionType: 'calibrate',
        parameters: {
          calibrationType: 'offset',
          targetValue: 300,
          tolerance: 50
        },
        priority: 'medium',
        status: 'pending'
      }),
      priority: 3,
      enabled: true
    })

    // Distance sensor maintenance
    this.optimizationRules.push({
      id: 'distance_sensor_maintenance',
      name: 'Distance Sensor Maintenance',
      condition: (_anomaly, sensorType) => 
        sensorType === 'distance' && 
        _anomaly.anomalyType === 'pattern_break' && 
        _anomaly.confidence > 0.7,
      action: (_anomaly, sensorType) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sensorType,
        actionType: 'maintenance',
        parameters: {
          maintenanceType: 'cleaning',
          scheduleTime: Date.now() + 3600000, // 1 hour later
          priority: 'medium'
        },
        priority: 'medium',
        status: 'pending'
      }),
      priority: 4,
      enabled: true
    })

    // Adaptive threshold adjustment
    this.optimizationRules.push({
      id: 'adaptive_threshold',
      name: 'Adaptive Threshold Adjustment',
      condition: (_anomaly, sensorType) => 
        _anomaly.anomalyType === 'outlier' && 
        _anomaly.severity === 'low' && 
        this.getAnomalyFrequency(sensorType) > 0.1,
      action: (_anomaly, sensorType) => ({
        id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sensorType,
        actionType: 'adjust_threshold',
        parameters: {
          adjustmentFactor: 1.2,
          reason: 'Frequent outliers detected'
        },
        priority: 'low',
        status: 'pending'
      }),
      priority: 5,
      enabled: true
    })
  }

  public async processAnomaly(anomaly: AnomalyResult): Promise<ResponseAction[]> {
    const responses: ResponseAction[] = []

    // Find applicable rules
    const applicableRules = this.optimizationRules
      .filter(rule => rule.enabled && rule.condition(anomaly, anomaly.affectedSensors[0]))
      .sort((a, b) => a.priority - b.priority)

    // Generate responses
    for (const rule of applicableRules) {
      const response = rule.action(anomaly, anomaly.affectedSensors[0])
      responses.push(response)
    }

    // Queue responses if auto-response is enabled
    if (this.config.enableAutoResponse) {
      for (const response of responses) {
        await this.queueResponse(response)
      }
    }

    return responses
  }

  private async queueResponse(response: ResponseAction): Promise<void> {
    // Check if we can handle more concurrent responses
    if (this.activeResponses.size >= this.config.maxConcurrentResponses) {
      this.responseQueue.push(response)
      return
    }

    // Execute response immediately
    await this.executeResponse(response)
  }

  private async executeResponse(response: ResponseAction): Promise<void> {
    this.activeResponses.set(response.id, response)
    response.status = 'executing'

    try {
      // Simulate response execution with delay
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay))

      // Execute based on action type
      switch (response.actionType) {
        case 'adjust_threshold':
          response.result = await this.adjustThreshold(response)
          break
        case 'change_sampling':
          response.result = await this.changeSamplingRate(response)
          break
        case 'send_alert':
          response.result = await this.sendAlert(response)
          break
        case 'calibrate':
          response.result = await this.calibrateSensor(response)
          break
        case 'maintenance':
          response.result = await this.scheduleMaintenance(response)
          break
        default:
          throw new Error(`Unknown action type: ${response.actionType}`)
      }

      response.status = 'completed'
      
      // Learn from successful response if learning is enabled
      if (this.config.enableLearning) {
        this.learnFromResponse(response)
      }

    } catch (error) {
      response.status = 'failed'
      response.error = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      this.activeResponses.delete(response.id)
      this.responseHistory.push(response)
      
      // Process next queued response
      if (this.responseQueue.length > 0) {
        const nextResponse = this.responseQueue.shift()!
        await this.executeResponse(nextResponse)
      }
    }
  }

  private async adjustThreshold(response: ResponseAction): Promise<any> {
    const { sensorType, parameters } = response
    const optimization = this.sensorManager.getOptimizationForSensor(sensorType)
    
    if (optimization) {
      optimization.thresholdAdjustment *= parameters.adjustmentFactor
      console.log(`🔧 Adjusted threshold for ${sensorType} by factor ${parameters.adjustmentFactor}`)
    }
    
    return { success: true, newThreshold: optimization?.thresholdAdjustment }
  }

  private async changeSamplingRate(response: ResponseAction): Promise<any> {
    const { sensorType, parameters } = response
    const optimization = this.sensorManager.getOptimizationForSensor(sensorType)
    
    if (optimization) {
      optimization.samplingRate = Math.max(1, optimization.samplingRate * parameters.rateMultiplier)
      console.log(`📊 Changed sampling rate for ${sensorType} to ${optimization.samplingRate}s`)
    }
    
    return { success: true, newSamplingRate: optimization?.samplingRate }
  }

  private async sendAlert(response: ResponseAction): Promise<any> {
    const { parameters } = response
    
    // Simulate sending alert
    console.log(`🚨 ALERT: ${parameters.message}`)
    console.log(`📧 Recipients: ${parameters.recipients.join(', ')}`)
    
    if (parameters.autoEvacuate) {
      console.log(`🚨 AUTO-EVACUATION TRIGGERED!`)
    }
    
    return { 
      success: true, 
      alertId: `alert_${Date.now()}`,
      recipients: parameters.recipients.length
    }
  }

  private async calibrateSensor(response: ResponseAction): Promise<any> {
    const { sensorType, parameters } = response
    
    console.log(`🔧 Calibrating ${sensorType} sensor...`)
    console.log(`🎯 Target: ${parameters.targetValue}, Tolerance: ${parameters.tolerance}`)
    
    // Simulate calibration process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return { 
      success: true, 
      calibratedValue: parameters.targetValue,
      accuracy: '±' + parameters.tolerance
    }
  }

  private async scheduleMaintenance(response: ResponseAction): Promise<any> {
    const { sensorType, parameters } = response
    
    console.log(`🔧 Scheduled maintenance for ${sensorType}`)
    console.log(`⏰ Time: ${new Date(parameters.scheduleTime).toLocaleString()}`)
    
    return { 
      success: true, 
      scheduledTime: parameters.scheduleTime,
      maintenanceId: `maint_${Date.now()}`
    }
  }

  private learnFromResponse(response: ResponseAction): void {
    const key = `${response.sensorType}_${response.actionType}`
    const successRate = response.status === 'completed' ? 1 : 0
    
    if (!this.learningData.has(key)) {
      this.learningData.set(key, [])
    }
    
    const data = this.learningData.get(key)!
    data.push(successRate)
    
    // Keep only recent data (last 100 responses)
    if (data.length > 100) {
      data.shift()
    }
    
    // Update rule priority based on success rate
    const avgSuccessRate = data.reduce((sum, rate) => sum + rate, 0) / data.length
    const rule = this.optimizationRules.find(r => 
      r.action.toString().includes(response.actionType) && 
      r.condition.toString().includes(response.sensorType)
    )
    
    if (rule && avgSuccessRate < 0.5) {
      rule.priority = Math.min(rule.priority + 1, 10)
      console.log(`📚 Learning: Adjusted priority for rule ${rule.name} to ${rule.priority}`)
    }
  }

  private getAnomalyFrequency(sensorType: string): number {
    const alerts = this.sensorManager.getAlerts()
    const recentAlerts = alerts.filter(alert => 
      alert.sensorType === sensorType && 
      alert.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    )
    
    return recentAlerts.length / 24 // Alerts per hour
  }

  public addCustomRule(rule: OptimizationRule): void {
    this.optimizationRules.push(rule)
    console.log(`✅ Added custom rule: ${rule.name}`)
  }

  public removeRule(ruleId: string): boolean {
    const index = this.optimizationRules.findIndex(rule => rule.id === ruleId)
    if (index !== -1) {
      this.optimizationRules.splice(index, 1)
      console.log(`❌ Removed rule: ${ruleId}`)
      return true
    }
    return false
  }

  public getActiveResponses(): ResponseAction[] {
    return Array.from(this.activeResponses.values())
  }

  public getResponseHistory(): ResponseAction[] {
    return [...this.responseHistory]
  }

  public getOptimizationRules(): OptimizationRule[] {
    return [...this.optimizationRules]
  }

  public getLearningData(): Map<string, number[]> {
    return new Map(this.learningData)
  }

  public updateConfig(newConfig: Partial<ResponseOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public getConfig(): ResponseOptimizerConfig {
    return { ...this.config }
  }

  public dispose(): void {
    this.responseQueue = []
    this.activeResponses.clear()
    this.responseHistory = []
    this.learningData.clear()
    this.optimizationRules = []
  }
}

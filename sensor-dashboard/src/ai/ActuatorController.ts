import type { SensorReading, AnomalyResult } from './EdgeAnomalyDetector'

export type ServoState = 'open' | 'closed'

export interface ActuatorCommand {
  id: string
  timestamp: number
  device: 'ventilation_servo'
  action: 'open' | 'close'
  status: 'executing' | 'blocked'
  reason: string
  sensorValue: number
  anomalyBlocked?: boolean
}

/**
 * Lightweight actuator controller that decides when to drive the ventilation servo.
 * - Opens the servo when temperature exceeds the open threshold *and* no anomaly is detected.
 * - Keeps the servo closed or blocks the action if the AI flags the reading as anomalous.
 * - Uses hysteresis so we do not rapidly toggle around the threshold.
 */
export class ActuatorController {
  private readonly SERVO_OPEN_THRESHOLD = 33 // °C
  private readonly SERVO_CLOSE_THRESHOLD = 30 // °C (hysteresis)
  private servoState: ServoState = 'closed'
  private history: ActuatorCommand[] = []

  public evaluateTemperatureAutomation(
    reading: SensorReading,
    anomalyResult?: AnomalyResult
  ): ActuatorCommand | null {
    if (reading.sensorType !== 'temperature') return null

    const isAnomaly = Boolean(anomalyResult?.isAnomaly)
    const now = Date.now()

    // Should attempt to open?
    if (reading.value >= this.SERVO_OPEN_THRESHOLD) {
      if (isAnomaly) {
        return this.recordCommand({
          id: `servo_block_${now}`,
          timestamp: now,
          device: 'ventilation_servo',
          action: 'open',
          status: 'blocked',
          reason: 'Temperature spike flagged as anomaly - skip servo open',
          sensorValue: reading.value,
          anomalyBlocked: true
        })
      }

      if (this.servoState === 'closed') {
        this.servoState = 'open'
        return this.recordCommand({
          id: `servo_open_${now}`,
          timestamp: now,
          device: 'ventilation_servo',
          action: 'open',
          status: 'executing',
          reason: 'Temperature exceeds safe threshold, opening ventilation',
          sensorValue: reading.value
        })
      }

      return null // already open, no-op
    }

    // Should we close because it's cooled down?
    if (this.servoState === 'open' && reading.value <= this.SERVO_CLOSE_THRESHOLD) {
      this.servoState = 'closed'
      return this.recordCommand({
        id: `servo_close_${now}`,
        timestamp: now,
        device: 'ventilation_servo',
        action: 'close',
        status: 'executing',
        reason: 'Temperature back to safe range, closing ventilation',
        sensorValue: reading.value
      })
    }

    return null
  }

  public getServoState(): ServoState {
    return this.servoState
  }

  public getHistory(): ActuatorCommand[] {
    return [...this.history]
  }

  public reset(): void {
    this.history = []
    this.servoState = 'closed'
  }

  private recordCommand(command: ActuatorCommand): ActuatorCommand {
    this.history.push(command)
    if (this.history.length > 100) {
      this.history.shift()
    }
    return command
  }
}


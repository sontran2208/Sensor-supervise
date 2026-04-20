import type { SensorReading, AnomalyResult } from './EdgeAnomalyDetector'

export type RelayRtdbState = 'ON' | 'OFF'

export interface RelayAutomationDecision {
  id: string
  timestamp: number
  targetState: RelayRtdbState
  status: 'executing' | 'blocked'
  reason: string
  sensorValue: number
  anomalyBlocked?: boolean
}

/**
 * Tự động ghi ON/OFF vào RTDB `relayControl` theo ngữ cảnh:
 * - Bật relay khi nhiệt độ >= ngưỡng và AI không đánh dấu đọc là bất thường (tránh bật tải khi nghi cảm biến lỗi/spike giả).
 * - Tắt relay khi nhiệt độ hạ xuống dưới ngưỡng đóng (hysteresis, tránh nhấp nháy).
 */
export class RelayAutomationController {
  private readonly RELAY_ON_THRESHOLD = 33 // °C
  private readonly RELAY_OFF_THRESHOLD = 30 // °C
  private relayState: RelayRtdbState = 'OFF'
  private history: RelayAutomationDecision[] = []

  public evaluate(
    reading: SensorReading,
    anomalyResult?: AnomalyResult
  ): RelayAutomationDecision | null {
    if (reading.sensorType !== 'temperature') return null

    const isAnomaly = Boolean(anomalyResult?.isAnomaly)
    const now = Date.now()

    if (reading.value >= this.RELAY_ON_THRESHOLD) {
      if (isAnomaly) {
        return this.record({
          id: `relay_block_${now}`,
          timestamp: now,
          targetState: 'ON',
          status: 'blocked',
          reason:
            'Nhiệt độ cao nhưng AI gắn cờ bất thường — không bật relay (phòng cảm biến lỗi)',
          sensorValue: reading.value,
          anomalyBlocked: true
        })
      }

      if (this.relayState === 'OFF') {
        this.relayState = 'ON'
        return this.record({
          id: `relay_on_${now}`,
          timestamp: now,
          targetState: 'ON',
          status: 'executing',
          reason: 'Nhiệt độ vượt ngưỡng an toàn — bật relay (ví dụ quạt/thiết bị)',
          sensorValue: reading.value
        })
      }

      return null
    }

    if (this.relayState === 'ON' && reading.value <= this.RELAY_OFF_THRESHOLD) {
      this.relayState = 'OFF'
      return this.record({
        id: `relay_off_${now}`,
        timestamp: now,
        targetState: 'OFF',
        status: 'executing',
        reason: 'Nhiệt độ về vùng an toàn — tắt relay',
        sensorValue: reading.value
      })
    }

    return null
  }

  public getRelayState(): RelayRtdbState {
    return this.relayState
  }

  public getHistory(): RelayAutomationDecision[] {
    return [...this.history]
  }

  public reset(): void {
    this.history = []
    this.relayState = 'OFF'
  }

  private record(decision: RelayAutomationDecision): RelayAutomationDecision {
    this.history.push(decision)
    if (this.history.length > 100) {
      this.history.shift()
    }
    return decision
  }
}

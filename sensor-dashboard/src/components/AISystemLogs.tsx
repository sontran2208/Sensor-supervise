import { useEffect, useState } from 'react'
import { useEdgeAI } from '../hooks/useEdgeAI'

interface AISystemLogsProps {
  className?: string
}

export default function AISystemLogs({ className = '' }: AISystemLogsProps) {
  const { systemStatus, alerts } = useEdgeAI()
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    if (systemStatus) {
      const timestamp = new Date().toLocaleTimeString()
      const newLog = `[${timestamp}] AI System: ${systemStatus.isRunning ? 'RUNNING' : 'STOPPED'} | Health: ${systemStatus.systemHealth} | Sensors: ${systemStatus.sensorsConnected} | Alerts: ${systemStatus.activeAlerts}`
      
      setLogs(prev => [newLog, ...prev.slice(0, 9)]) // Keep last 10 logs
    }
  }, [systemStatus])

  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[alerts.length - 1]
      const timestamp = new Date().toLocaleTimeString()
      const newLog = `[${timestamp}] ALERT: ${latestAlert.severity.toUpperCase()} - ${latestAlert.sensorType}: ${latestAlert.message}`
      
      setLogs(prev => [newLog, ...prev.slice(0, 9)])
    }
  }, [alerts])

  return (
    <div className={`bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-400">🖥️</span>
        <span className="text-white font-semibold">AI System Console</span>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500">Waiting for AI system status...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-xs">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

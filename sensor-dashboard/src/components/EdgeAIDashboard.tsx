import { useState, useMemo } from 'react'
import { useEdgeAI } from '../hooks/useEdgeAI'

interface EdgeAIDashboardProps {
  className?: string
}

export default function EdgeAIDashboard({ className = '' }: EdgeAIDashboardProps) {
  const { 
    systemStatus, 
    alerts, 
    optimizations, 
    acknowledgeAlert 
  } = useEdgeAI()

  const [activeTab, setActiveTab] = useState<'status' | 'alerts' | 'optimizations' | 'logs'>('status')

  // Generate logs from system status and alerts
  const logs = useMemo(() => {
    const logEntries: Array<{ timestamp: number; level: string; message: string; data?: any }> = []
    const now = Date.now()

    // Add system status logs
    if (systemStatus) {
      if (systemStatus.isRunning) {
        logEntries.push({
          timestamp: systemStatus.lastUpdate || now,
          level: 'info',
          message: `System is running - Health: ${systemStatus.systemHealth}, Sensors: ${systemStatus.sensorsConnected}, Alerts: ${systemStatus.activeAlerts}`
        })
      } else {
        logEntries.push({
          timestamp: systemStatus.lastUpdate || now,
          level: 'warn',
          message: 'System is not running'
        })
      }

      if (systemStatus.systemHealth === 'critical') {
        logEntries.push({
          timestamp: systemStatus.lastUpdate || now,
          level: 'error',
          message: 'System health is CRITICAL - Immediate attention required'
        })
      } else if (systemStatus.systemHealth === 'warning') {
        logEntries.push({
          timestamp: systemStatus.lastUpdate || now,
          level: 'warn',
          message: 'System health is WARNING - Monitor closely'
        })
      }

      if (systemStatus.detectorMetrics) {
        logEntries.push({
          timestamp: systemStatus.lastUpdate || now,
          level: 'info',
          message: `Detector metrics - Latest Error: ${systemStatus.detectorMetrics.latestError?.toFixed(4) || 'N/A'}, Threshold: ${systemStatus.detectorMetrics.threshold.toFixed(4)}`
        })
      }
    }

    // Add alert logs
    alerts.forEach(alert => {
      logEntries.push({
        timestamp: alert.timestamp || now,
        level: alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warn' : 'info',
        message: `[${alert.sensorType.toUpperCase()}] ${alert.message} - Value: ${alert.value?.toFixed(2) || 'N/A'}, Threshold: ${alert.threshold?.toFixed(2) || 'N/A'}`,
        data: alert
      })
    })

    // Sort by timestamp (newest first)
    return logEntries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100)
  }, [systemStatus, alerts])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">🤖 Edge AI System</h2>
            <p className="text-sm text-gray-600">Real-time anomaly detection & sensor optimization</p>
          </div>
          {systemStatus && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(systemStatus.systemHealth)}`}>
              {systemStatus.systemHealth.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'status', label: '📊 Status', gradient: 'from-blue-500 via-cyan-500 to-teal-500' },
            { id: 'alerts', label: '🚨 Alerts', gradient: 'from-red-500 via-rose-500 to-pink-500' },
            { id: 'optimizations', label: '⚙️ Optimizations', gradient: 'from-purple-500 via-indigo-500 to-blue-500' },
            { id: 'logs', label: '📝 Logs', gradient: 'from-orange-500 via-amber-500 to-yellow-500' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg transform scale-105 border-transparent`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'status' && systemStatus && (
          <div className="space-y-6">
            {/* System Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {systemStatus.sensorsConnected}
                </div>
                <div className="text-sm text-blue-800">Sensors Connected</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {systemStatus.activeAlerts}
                </div>
                <div className="text-sm text-red-800">Active Alerts</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {systemStatus.activeResponses}
                </div>
                <div className="text-sm text-green-800">Active Responses</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.floor(systemStatus.uptime / 1000 / 60)}m
                </div>
                <div className="text-sm text-purple-800">Uptime</div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">System Health</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getHealthColor(systemStatus.systemHealth)}`}>
                    {systemStatus.systemHealth}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Running:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${systemStatus.isRunning ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {systemStatus.isRunning ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Update:</span>
                  <span className="text-xs text-gray-500">
                    {new Date(systemStatus.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Model Training Status */}
            {systemStatus.trainingStatus && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🤖</span>
                  <span>Model Training Status</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Training Type:</span>
                    <span className={`px-3 py-1 rounded text-xs font-semibold ${
                      systemStatus.trainingStatus.trainingType === 'baseline'
                        ? 'text-green-700 bg-green-100 border border-green-300'
                        : systemStatus.trainingStatus.trainingType === 'synthetic'
                        ? 'text-yellow-700 bg-yellow-100 border border-yellow-300'
                        : 'text-gray-700 bg-gray-100 border border-gray-300'
                    }`}>
                      {systemStatus.trainingStatus.trainingType === 'baseline' && '📊 Baseline Trained'}
                      {systemStatus.trainingStatus.trainingType === 'synthetic' && '⚙️ Synthetic Trained'}
                      {systemStatus.trainingStatus.trainingType === 'none' && '❌ Not Trained'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Model Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      systemStatus.trainingStatus.modelLoaded
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50'
                    }`}>
                      {systemStatus.trainingStatus.modelLoaded ? '✅ Loaded' : '❌ Not Loaded'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Baseline:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      systemStatus.trainingStatus.baselineLoaded
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 bg-gray-50'
                    }`}>
                      {systemStatus.trainingStatus.baselineLoaded ? '✅ Loaded' : '⚪ Not Loaded'}
                    </span>
                  </div>
                  {systemStatus.trainingStatus.trainingType === 'synthetic' && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      ⚠️ <strong>Tip:</strong> Train với baseline data để đạt độ chính xác tốt hơn, đặc biệt cho drift detection.
                    </div>
                  )}
                  {systemStatus.trainingStatus.trainingType === 'baseline' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                      ✅ Model đã được train với baseline data. Độ chính xác tối ưu!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Active Alerts</h3>
              <span className="text-sm text-gray-500">{alerts.length} alerts</span>
            </div>
            
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{alert.sensorType}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Value: {alert.value} | Threshold: {alert.threshold}
                      </div>
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'optimizations' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Sensor Optimizations</h3>
              <span className="text-sm text-gray-500">{optimizations.size} active</span>
            </div>
            
            {optimizations.size === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">⚙️</div>
                <p>No active optimizations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from(optimizations.entries()).map(([sensorType, optimization]) => (
                  <div key={sensorType} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800">{sensorType}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(optimization.priority)}`}>
                        {optimization.priority.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Sampling Rate:</span>
                        <span className="ml-2 font-medium">{optimization.samplingRate}s</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Threshold:</span>
                        <span className="ml-2 font-medium">×{optimization.thresholdAdjustment}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">{optimization.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">System Logs</h3>
              <span className="text-sm text-gray-500">{logs.length} entries</span>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-hide">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No logs available</p>
                  <p className="text-xs mt-2 text-gray-500">Logs will appear here as the system processes sensor data</p>
                </div>
              ) : (
                <div className="space-y-1.5 font-mono text-sm">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 py-1 border-b border-gray-800 last:border-0">
                      <span className="text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        })}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        log.level === 'error' ? 'text-red-400 bg-red-900/30' :
                        log.level === 'warn' ? 'text-yellow-400 bg-yellow-900/30' :
                        log.level === 'info' ? 'text-blue-400 bg-blue-900/30' :
                        'text-gray-400 bg-gray-800'
                      }`}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-gray-300 flex-1 break-words">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

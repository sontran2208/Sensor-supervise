import { useState, useMemo } from 'react'
import { useEdgeAI } from '../hooks/useEdgeAI'
import { 
  HiChartBar, HiRefresh, HiExclamationCircle, HiCog, HiDocumentText,
  HiChip, HiSearch, HiTag, HiBell, HiAdjustments,
  HiCheckCircle, HiXCircle, HiInformationCircle
} from 'react-icons/hi'
import { FaRobot, FaSignal, FaFlask, FaClock } from 'react-icons/fa'

interface EdgeAIDashboardProps {
  className?: string
}

interface FlowStepProps {
  step: number
  title: string
  description: string
  icon: React.ReactNode
  status: 'active' | 'inactive'
  details: string
  color: 'blue' | 'purple' | 'indigo' | 'orange' | 'yellow' | 'red' | 'green'
  metrics?: {
    latestError: number | null
    threshold: number
  }
  anomalyTypes?: Array<{
    type: string
    severity: string
    sensor: string
  }>
}

function FlowStep({ step, title, description, icon, status, details, color, metrics, anomalyTypes }: FlowStepProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    orange: 'from-orange-500 to-orange-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600'
  }

  const bgColorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    orange: 'bg-orange-50 border-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200'
  }

  return (
    <div className="relative">
      {/* Connector Line (except for first step) */}
      {step > 1 && (
        <div className="absolute left-6 top-0 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200 -translate-y-full" />
      )}

      <div className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
        status === 'active' 
          ? `${bgColorClasses[color]} shadow-md scale-[1.02]` 
          : 'bg-white border-gray-200 opacity-60'
      }`}>
        {/* Step Number & Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
          {step}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xl text-gray-700">{icon}</div>
            <h4 className={`font-semibold text-gray-800 ${status === 'active' ? 'text-lg' : 'text-base'}`}>
              {title}
            </h4>
            {status === 'active' && (
              <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full animate-pulse">
                ● Active
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{description}</p>
          
          <div className="text-xs text-gray-500 mb-2">
            {details}
          </div>

          {/* Metrics */}
          {metrics && status === 'active' && (
            <div className="mt-2 p-2 bg-white/60 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Latest Error:</span>
                <span className="font-mono font-semibold text-orange-600">
                  {metrics.latestError?.toFixed(4) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Threshold:</span>
                <span className="font-mono font-semibold text-purple-600">
                  {metrics.threshold.toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {/* Anomaly Types */}
          {anomalyTypes && anomalyTypes.length > 0 && status === 'active' && (
            <div className="mt-2 flex flex-wrap gap-1">
              {anomalyTypes.slice(0, 3).map((at, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white/80 rounded text-xs font-medium border"
                  style={{
                    borderColor: at.severity === 'critical' ? '#ef4444' :
                                 at.severity === 'high' ? '#f97316' :
                                 at.severity === 'medium' ? '#eab308' : '#3b82f6',
                    color: at.severity === 'critical' ? '#dc2626' :
                           at.severity === 'high' ? '#ea580c' :
                           at.severity === 'medium' ? '#ca8a04' : '#2563eb'
                  }}
                >
                  {at.type} ({at.sensor})
                </span>
              ))}
              {anomalyTypes.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  +{anomalyTypes.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EdgeAIDashboard({ className = '' }: EdgeAIDashboardProps) {
  const { 
    systemStatus, 
    alerts, 
    optimizations, 
    acknowledgeAlert,
    resetThreshold
  } = useEdgeAI()

  const [activeTab, setActiveTab] = useState<'status' | 'alerts' | 'optimizations' | 'logs' | 'flow'>('status')
  const [isResettingThreshold, setIsResettingThreshold] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

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
          message: `Detector metrics - Latest Error: ${systemStatus.detectorMetrics.latestError?.toFixed(4) || 'N/A'}, Global Threshold: ${systemStatus.detectorMetrics.globalThreshold.toFixed(4)}`
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

  const getRelayDecisionColor = (status: string | undefined) => {
    switch (status) {
      case 'executing': return 'text-green-700 bg-green-100 border-green-200'
      case 'blocked': return 'text-red-700 bg-red-100 border-red-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const optimizationEntries = useMemo(
    () =>
      Array.from(optimizations.entries()).sort(([, a], [, b]) => {
        const score = { critical: 4, high: 3, medium: 2, low: 1 }
        return (score[b?.priority as keyof typeof score] || 0) - (score[a?.priority as keyof typeof score] || 0)
      }),
    [optimizations]
  )

  const formatSamplingRate = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 'Realtime'
    return `Moi ${value}s`
  }

  const formatThresholdAdjustment = (value: number) => {
    if (!Number.isFinite(value)) return 'Khong ro'
    const percent = Math.round(value * 100)
    return `${percent >= 0 ? '+' : ''}${percent}%`
  }

  const getOptimizationSummary = (optimization: any) => {
    const sampling = formatSamplingRate(Number(optimization?.samplingRate))
    const threshold = formatThresholdAdjustment(Number(optimization?.thresholdAdjustment))
    return `AI de xuat tang tan suat lay mau ${sampling.toLowerCase()} va dieu chinh do nhay nguong ${threshold}.`
  }

  const handleResetThreshold = async () => {
    setIsResettingThreshold(true)
    setResetMessage(null)
    try {
      const result = await resetThreshold()
      if (result.ok) {
        setResetMessage('Threshold da duoc reset. He thong se hoc lai nguong tu du lieu moi.')
      } else {
        setResetMessage(`Reset that bai: ${result.error || 'Unknown error'}`)
      }
    } finally {
      setIsResettingThreshold(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FaRobot className="text-purple-600" />
              Edge AI System
            </h2>
            <p className="text-sm text-gray-600">Real-time spike detection & sensor optimization</p>
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
            { id: 'status', label: 'Status', icon: HiChartBar, gradient: 'from-blue-500 via-cyan-500 to-teal-500' },
            { id: 'flow', label: 'AI Flow', icon: HiRefresh, gradient: 'from-indigo-500 via-purple-500 to-pink-500' },
            { id: 'alerts', label: 'Alerts', icon: HiExclamationCircle, gradient: 'from-red-500 via-rose-500 to-pink-500' },
            { id: 'optimizations', label: 'Optimizations', icon: HiCog, gradient: 'from-purple-500 via-indigo-500 to-blue-500' },
            { id: 'logs', label: 'Logs', icon: HiDocumentText, gradient: 'from-orange-500 via-amber-500 to-yellow-500' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 outline-none focus:outline-none focus:ring-0 ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg transform scale-105 border-transparent`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
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
                  <FaRobot className="text-purple-600" />
                  <span>Model Training Status</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Training Type:</span>
                    <span className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                      systemStatus.trainingStatus.trainingType === 'baseline'
                        ? 'text-green-700 bg-green-100 border border-green-300'
                        : systemStatus.trainingStatus.trainingType === 'synthetic'
                        ? 'text-yellow-700 bg-yellow-100 border border-yellow-300'
                        : 'text-gray-700 bg-gray-100 border border-gray-300'
                    }`}>
                      {systemStatus.trainingStatus.trainingType === 'baseline' && (
                        <>
                          <HiChartBar className="w-3 h-3" />
                          Baseline Trained
                        </>
                      )}
                      {systemStatus.trainingStatus.trainingType === 'synthetic' && (
                        <>
                          <HiCog className="w-3 h-3" />
                          Synthetic Trained
                        </>
                      )}
                      {systemStatus.trainingStatus.trainingType === 'none' && (
                        <>
                          <HiXCircle className="w-3 h-3" />
                          Not Trained
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Model Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      systemStatus.trainingStatus.modelLoaded
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50'
                    }`}>
                      <span className="flex items-center gap-1">
                        {systemStatus.trainingStatus.modelLoaded ? (
                          <>
                            <HiCheckCircle className="w-3 h-3" />
                            Loaded
                          </>
                        ) : (
                          <>
                            <HiXCircle className="w-3 h-3" />
                            Not Loaded
                          </>
                        )}
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Baseline:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      systemStatus.trainingStatus.baselineLoaded
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 bg-gray-50'
                    }`}>
                      {systemStatus.trainingStatus.baselineLoaded ? (
                        <>
                          <HiCheckCircle className="w-3 h-3" />
                          Loaded
                        </>
                      ) : (
                        <>
                          <HiInformationCircle className="w-3 h-3" />
                          Not Loaded
                        </>
                      )}
                    </span>
                  </div>
                  {systemStatus.trainingStatus.trainingType === 'synthetic' && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-start gap-2">
                      <HiExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Tip:</strong> Train với baseline data để phát hiện spike ổn định hơn và giảm false positive.
                      </div>
                    </div>
                  )}
                  {systemStatus.trainingStatus.trainingType === 'baseline' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-start gap-2">
                      <HiCheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>Model đã được train với baseline data. Độ chính xác tối ưu!</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {systemStatus.relayAutomation && (
              <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-lg p-4 border border-emerald-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <HiAdjustments className="text-emerald-600" />
                  <span>Relay Automation</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Relay State:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        systemStatus.relayAutomation.relayState === 'ON'
                          ? 'text-green-700 bg-green-100'
                          : 'text-gray-700 bg-gray-100'
                      }`}>
                        {systemStatus.relayAutomation.relayState}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Latest AI Decision:</span>
                      {systemStatus.relayAutomation.lastDecision ? (
                        <span className={`px-2 py-1 rounded border text-xs font-medium ${getRelayDecisionColor(systemStatus.relayAutomation.lastDecision.status)}`}>
                          {systemStatus.relayAutomation.lastDecision.status === 'executing' ? 'Executing' : 'Blocked'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium text-gray-600 bg-gray-50">
                          No decision yet
                        </span>
                      )}
                    </div>
                    {systemStatus.relayAutomation.lastDecision && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Target:</span>
                          <span className="text-sm font-medium text-gray-800">
                            {systemStatus.relayAutomation.lastDecision.targetState}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Sensor Value:</span>
                          <span className="text-sm font-medium text-gray-800">
                            {Number(systemStatus.relayAutomation.lastDecision.sensorValue).toFixed(2)} degC
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Time:</span>
                          <span className="text-xs text-gray-500">
                            {new Date(systemStatus.relayAutomation.lastDecision.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Reason:</div>
                    <div className="rounded-lg bg-white/70 border border-white px-3 py-2 text-sm text-gray-700">
                      {systemStatus.relayAutomation.lastDecision?.reason || 'AI chua dua ra quyet dinh relay nao.'}
                    </div>
                  </div>
                </div>

                {systemStatus.relayAutomation.recentDecisions?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Recent Decisions</div>
                    <div className="space-y-2">
                      {systemStatus.relayAutomation.recentDecisions.map((decision: any) => (
                        <div key={decision.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 border border-white px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded border font-medium ${getRelayDecisionColor(decision.status)}`}>
                              {decision.status === 'executing' ? `${decision.targetState} sent` : `${decision.targetState} blocked`}
                            </span>
                            <span className="text-gray-700">{decision.reason}</span>
                          </div>
                          <div className="text-gray-500">
                            {new Date(decision.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detector Metrics */}
            {systemStatus.detectorMetrics && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Detector Metrics</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      Latest Error: <span className="font-mono">{systemStatus.detectorMetrics.latestError?.toFixed(4) || 'N/A'}</span>
                      {' '}| Global Threshold: <span className="font-mono">{systemStatus.detectorMetrics.globalThreshold.toFixed(4)}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-3">
                      {Object.entries(systemStatus.detectorMetrics.sensorThresholds || {}).map(([sensorType, value]) => (
                        <span key={sensorType}>
                          {sensorType}: <span className="font-mono">{Number(value).toFixed(4)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleResetThreshold}
                    disabled={isResettingThreshold}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      isResettingThreshold
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {isResettingThreshold ? 'Dang reset...' : 'Reset Threshold'}
                  </button>
                </div>
                {resetMessage && (
                  <p className="mt-2 text-xs text-gray-700">{resetMessage}</p>
                )}
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
                <HiCheckCircle className="text-4xl mx-auto mb-2 text-green-500" />
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
                <HiCog className="text-4xl mx-auto mb-2 text-gray-400" />
                <p>No active optimizations</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <HiAdjustments className="mt-0.5 text-xl text-indigo-600" />
                    <div>
                      <h4 className="font-semibold text-gray-800">AI recommendation mode</h4>
                      <p className="text-sm text-gray-600">
                        Cac optimization ben duoi la goi y AI dang ap dung de theo doi sat hon sau khi phat hien bat thuong.
                        Dashboard hien uu tien hien thi nhung de xuat moi nhat theo tung cam bien.
                      </p>
                    </div>
                  </div>
                </div>

                {optimizationEntries.map(([sensorType, optimization]) => (
                  <div key={sensorType} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <h4 className="font-medium text-gray-800 capitalize">{sensorType}</h4>
                        <p className="text-xs text-gray-500 mt-1">{optimization.reason}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(optimization.priority)}`}>
                        {String(optimization.priority || 'low').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Sampling:</span>
                        <span className="ml-2 font-medium">{formatSamplingRate(Number(optimization.samplingRate))}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Threshold adjust:</span>
                        <span className="ml-2 font-medium">{formatThresholdAdjustment(Number(optimization.thresholdAdjustment))}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Source:</span>
                        <span className="ml-2 font-medium">Edge AI detector</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
                      {getOptimizationSummary(optimization)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">AI Processing Flow</h3>
              <span className="text-xs text-gray-500">Real-time workflow visualization</span>
            </div>

            {/* Flow Diagram */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
              <div className="space-y-8">
                {/* Step 1: Sensor Data Input */}
                <FlowStep
                  step={1}
                  title="Sensor Data Input"
                  description="Raw sensor readings from temperature, light, distance, gas, GPS"
                  icon={<FaSignal className="w-6 h-6" />}
                  status={systemStatus?.isRunning ? 'active' : 'inactive'}
                  details={systemStatus ? `${systemStatus.sensorsConnected} sensors connected` : 'No sensors'}
                  color="blue"
                />

                {/* Step 2: Feature Extraction */}
                <FlowStep
                  step={2}
                  title="Feature Extraction"
                  description="Extract statistical features: z-scores, std deviations, trends"
                  icon={<FaFlask className="w-6 h-6" />}
                  status={systemStatus?.isRunning ? 'active' : 'inactive'}
                  details="10 features per window (5 sensors × 2 metrics)"
                  color="purple"
                />

                {/* Step 3: Model Prediction */}
                <FlowStep
                  step={3}
                  title="Autoencoder Model"
                  description="TensorFlow.js autoencoder reconstructs normal patterns"
                  icon={<FaRobot className="w-6 h-6" />}
                  status={systemStatus?.trainingStatus?.modelLoaded ? 'active' : 'inactive'}
                  details={systemStatus?.trainingStatus 
                    ? `Trained: ${systemStatus.trainingStatus.trainingType}`
                    : 'Model not loaded'}
                  color="indigo"
                  metrics={systemStatus?.detectorMetrics ? {
                    latestError: systemStatus.detectorMetrics.latestError,
                    threshold: systemStatus.detectorMetrics.threshold
                  } : undefined}
                />

                {/* Step 4: Spike Detection */}
                <FlowStep
                  step={4}
                  title="Spike Detection"
                  description="Calculate reconstruction error and compare with the spike threshold"
                  icon={<HiSearch className="w-6 h-6" />}
                  status={systemStatus?.isRunning ? 'active' : 'inactive'}
                  details={systemStatus?.detectorMetrics 
                    ? `Error: ${systemStatus.detectorMetrics.latestError?.toFixed(4) || 'N/A'} | Global Threshold: ${systemStatus.detectorMetrics.globalThreshold.toFixed(4)}`
                    : 'Not available'}
                  color="orange"
                />

                {/* Step 5: Spike Classification */}
                <FlowStep
                  step={5}
                  title="Spike Classification"
                  description="Spike-only mode: classify sudden jumps as spike anomalies"
                  icon={<HiTag className="w-6 h-6" />}
                  status={alerts.length > 0 ? 'active' : 'inactive'}
                  details={alerts.length > 0 
                    ? `${alerts.length} spike events detected`
                    : 'No spike anomalies detected'}
                  color="yellow"
                  anomalyTypes={alerts.map(a => ({
                    type: 'spike',
                    severity: a.severity,
                    sensor: a.sensorType
                  }))}
                />

                {/* Step 6: Alert Generation */}
                <FlowStep
                  step={6}
                  title="Alert Generation"
                  description="Generate alerts with severity levels and recommendations"
                  icon={<HiBell className="w-6 h-6" />}
                  status={alerts.length > 0 ? 'active' : 'inactive'}
                  details={`${alerts.length} active alerts`}
                  color="red"
                />

                {/* Step 7: Response Optimization */}
                <FlowStep
                  step={7}
                  title="Response Optimization"
                  description="Auto-optimize sensor sampling rates and thresholds"
                  icon={<HiAdjustments className="w-6 h-6" />}
                  status={optimizations.size > 0 ? 'active' : 'inactive'}
                  details={`${optimizations.size} active optimizations`}
                  color="green"
                />
              </div>
            </div>

            {/* Flow Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">Processing Rate</div>
                <div className="text-lg font-bold text-blue-800">
                  {systemStatus?.isRunning ? 'Active' : 'Idle'}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="text-xs text-purple-600 mb-1">Model Status</div>
                <div className="text-lg font-bold text-purple-800 flex items-center justify-center gap-1">
                  {systemStatus?.trainingStatus?.modelLoaded ? (
                    <>
                      <HiCheckCircle className="w-5 h-5" />
                      Loaded
                    </>
                  ) : (
                    <>
                      <HiXCircle className="w-5 h-5" />
                      Not Loaded
                    </>
                  )}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="text-xs text-orange-600 mb-1">Spikes Detected</div>
                <div className="text-lg font-bold text-orange-800">{alerts.length}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-600 mb-1">Optimizations</div>
                <div className="text-lg font-bold text-green-800">{optimizations.size}</div>
              </div>
            </div>
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
                  <HiDocumentText className="text-4xl mx-auto mb-2 text-gray-500" />
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

import { useState, useCallback } from 'react'
import { useEdgeAI } from '../hooks/useEdgeAI'
import type { SensorReading } from '../ai/SimpleEdgeAI'

interface SensorAIDemoProps {
  sensorType: 'temperature' | 'light' | 'distance' | 'gas'
  className?: string
}

export default function SensorAIDemo({ sensorType, className = '' }: SensorAIDemoProps) {
  const { processSensorData } = useEdgeAI()
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationData, setSimulationData] = useState<SensorReading[]>([])
  const [aiResults, setAiResults] = useState<any>(null)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms

  // Generate realistic sensor data with anomalies
  const generateSensorData = useCallback((count: number = 20): SensorReading[] => {
    const data: SensorReading[] = []
    const now = Date.now()
    
    // Base values for different sensors
    const baseValues = {
      temperature: 27.5,
      light: 300,
      distance: 50,
      gas: 5
    }
    
    const baseValue = baseValues[sensorType]
    
    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * 60000 // 1 minute intervals
      let value = baseValue
      
      // Add normal variation
      const variation = (Math.random() - 0.5) * 2
      value += variation
      
      // Inject anomalies occasionally
      if (Math.random() < 0.15) { // 15% chance of anomaly
        const anomalyType = Math.random()
        if (anomalyType < 0.3) {
          // Spike anomaly
          value += (Math.random() < 0.5 ? 1 : -1) * (5 + Math.random() * 5)
        } else if (anomalyType < 0.6) {
          // Drift anomaly
          value += (Math.random() < 0.5 ? 1 : -1) * (2 + Math.random() * 3)
        } else {
          // Outlier anomaly
          value += (Math.random() < 0.5 ? 1 : -1) * (8 + Math.random() * 7)
        }
      }
      
      // Ensure reasonable bounds
      if (sensorType === 'temperature') {
        value = Math.max(15, Math.min(45, value))
      } else if (sensorType === 'light') {
        value = Math.max(0, Math.min(1000, value))
      } else if (sensorType === 'distance') {
        value = Math.max(0, Math.min(200, value))
      } else if (sensorType === 'gas') {
        value = Math.max(0, Math.min(50, value))
      }
      
      data.push({
        timestamp,
        value: Number(value.toFixed(2)),
        sensorType
      })
    }
    
    return data
  }, [sensorType])

  const startSimulation = useCallback(async () => {
    setIsSimulating(true)
    setSimulationData([])
    setAiResults(null)
    
    const data = generateSensorData(30) // Generate 30 data points
    
    // Simulate real-time data arrival
    for (let i = 0; i < data.length; i++) {
      const currentData = data.slice(0, i + 1)
      setSimulationData([...currentData])
      
      // Process with AI every 5 data points
      if ((i + 1) % 5 === 0) {
        try {
          const result = await processSensorData(currentData)
          setAiResults(result)
        } catch (error) {
          console.error('Error processing sensor data:', error)
        }
      }
      
      // Wait before next data point
      await new Promise(resolve => setTimeout(resolve, simulationSpeed))
    }
    
    setIsSimulating(false)
  }, [generateSensorData, processSensorData, simulationSpeed])

  const stopSimulation = useCallback(() => {
    setIsSimulating(false)
  }, [])

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return '🌡️'
      case 'light': return '💡'
      case 'distance': return '📏'
      case 'gas': return '⛽'
      default: return '📊'
    }
  }

  const getSensorUnit = (type: string) => {
    switch (type) {
      case 'temperature': return '°C'
      case 'light': return 'lx'
      case 'distance': return 'cm'
      case 'gas': return 'ppm'
      default: return ''
    }
  }

  const getValueColor = (value: number, type: string) => {
    switch (type) {
      case 'temperature':
        if (value > 35) return 'text-red-600'
        if (value < 20) return 'text-blue-600'
        return 'text-green-600'
      case 'gas':
        if (value > 15) return 'text-red-600'
        if (value > 8) return 'text-yellow-600'
        return 'text-green-600'
      case 'light':
        if (value > 600) return 'text-yellow-600'
        if (value < 100) return 'text-gray-600'
        return 'text-green-600'
      case 'distance':
        if (value > 100) return 'text-red-600'
        if (value < 10) return 'text-yellow-600'
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {getSensorIcon(sensorType)} {sensorType.charAt(0).toUpperCase() + sensorType.slice(1)} AI Demo
          </h3>
          <p className="text-sm text-gray-600">Real-time anomaly detection simulation</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Speed:</label>
            <select
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              disabled={isSimulating}
            >
              <option value={500}>Fast</option>
              <option value={1000}>Normal</option>
              <option value={2000}>Slow</option>
            </select>
          </div>
          
          {!isSimulating ? (
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ▶️ Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              ⏹️ Stop
            </button>
          )}
        </div>
      </div>

      {/* Simulation Status */}
      {isSimulating && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 text-sm">Simulating sensor data...</span>
          </div>
        </div>
      )}

      {/* Data Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Latest Values */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">Latest Values</h4>
          <div className="space-y-2">
            {simulationData.slice(-5).map((reading) => (
              <div key={reading.timestamp} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {new Date(reading.timestamp).toLocaleTimeString()}
                </span>
                <span className={`font-medium ${getValueColor(reading.value, sensorType)}`}>
                  {reading.value.toFixed(2)} {getSensorUnit(sensorType)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Results */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">AI Analysis</h4>
          {aiResults ? (
            <div className="space-y-2">
              {aiResults.anomalyResult && (
                <div className={`p-2 rounded text-sm ${
                  aiResults.anomalyResult.isAnomaly 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  <div className="font-medium">
                    {aiResults.anomalyResult.isAnomaly ? '🚨 Anomaly Detected' : '✅ Normal'}
                  </div>
                  <div className="text-xs mt-1">
                    Confidence: {(aiResults.anomalyResult.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs">
                    Severity: {aiResults.anomalyResult.severity}
                  </div>
                </div>
              )}
              
              {aiResults.responses && aiResults.responses.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <div className="text-sm font-medium text-blue-800">Auto Response:</div>
                  <div className="text-xs text-blue-700 mt-1">
                    {aiResults.responses[0].actionType.replace('_', ' ')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No AI analysis yet</div>
          )}
        </div>
      </div>

      {/* Data Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Data Trend</h4>
        <div className="h-32 flex items-end space-x-1">
          {simulationData.map((reading) => {
            const maxValue = Math.max(...simulationData.map(d => d.value))
            const height = (reading.value / maxValue) * 100
            const isAnomaly = aiResults?.anomalyResult?.isAnomaly && 
              Math.abs(reading.timestamp - Date.now()) < 300000 // Last 5 minutes
            
            return (
              <div
                key={reading.timestamp}
                className={`flex-1 rounded-t ${
                  isAnomaly ? 'bg-red-400' : 
                  getValueColor(reading.value, sensorType).includes('red') ? 'bg-red-300' :
                  getValueColor(reading.value, sensorType).includes('yellow') ? 'bg-yellow-300' :
                  'bg-blue-300'
                }`}
                style={{ height: `${height}%` }}
                title={`${reading.value.toFixed(2)} ${getSensorUnit(sensorType)}`}
              />
            )
          })}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {simulationData.length} data points | Latest: {simulationData[simulationData.length - 1]?.value.toFixed(2)} {getSensorUnit(sensorType)}
        </div>
      </div>
    </div>
  )
}

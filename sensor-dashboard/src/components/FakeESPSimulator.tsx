import { useState, useRef, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, firebaseConfigured } from '../firebase'
import toast from 'react-hot-toast'

type SensorType = 'temperature' | 'light' | 'distance' | 'gps' | 'gas'
type AnomalyType = 'normal' | 'spike' | 'drift' | 'outlier' | 'pattern_break'

export default function FakeESPSimulator() {
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSensor, setSelectedSensor] = useState<SensorType>('temperature')
  const [anomalyType, setAnomalyType] = useState<AnomalyType>('normal')
  const [intervalMs, setIntervalMs] = useState(2000) // 2 seconds default
  const [sentCount, setSentCount] = useState(0)
  const [phase, setPhase] = useState<'warmup' | 'anomaly'>('warmup')
  const [warmupSeconds, setWarmupSeconds] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)
  const warmupStartRef = useRef<number | null>(null)
  const phaseRef = useRef<'warmup' | 'anomaly'>('warmup')
  
  // State for each sensor
  const stateRef = useRef<{
    temperature: number
    light: number
    distance: number
    gas: { co: number; co2: number; smoke: number; lpg: number; methane: number; hydrogen: number; airQuality: number }
    gps: { lat: number; lng: number; altitude: number; speed: number }
    drift: Record<string, number>
  }>({
    temperature: 27.5,
    light: 600,
    distance: 120,
    gas: { co: 5, co2: 600, smoke: 100, lpg: 50, methane: 800, hydrogen: 50, airQuality: 80 },
    gps: { lat: 10.8231, lng: 106.6297, altitude: 10, speed: 0.5 },
    drift: {}
  })

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  const generateValue = (sensor: SensorType, anomaly: AnomalyType): any => {
    const state = stateRef.current
    const drift = state.drift[sensor] || 0

    switch (sensor) {
      case 'temperature': {
        let base = state.temperature + drift
        if (anomaly === 'spike') {
          base += 4 + Math.random() * 3 // +4 to +7°C spike
        } else if (anomaly === 'outlier') {
          base = 35 + Math.random() * 5 // 35-40°C outlier
        } else if (anomaly === 'drift') {
          state.drift.temperature = (state.drift.temperature || 0) + 0.03
          base = state.temperature + state.drift.temperature
        } else if (anomaly === 'pattern_break') {
          base = 22 + Math.random() * 2 // new baseline
        } else {
          base += (Math.random() - 0.5) * 0.2 // normal noise
        }
        state.temperature = base
        return { 
          timestamp: Date.now(), 
          value: Number(base.toFixed(2)),
          createdAt: serverTimestamp()
        }
      }

      case 'light': {
        let base = state.light + drift
        if (anomaly === 'spike') {
          base += 800 + Math.random() * 600 // +800 to +1400 lx spike
        } else if (anomaly === 'outlier') {
          base = 50 + Math.random() * 20 // very low outlier
        } else if (anomaly === 'drift') {
          state.drift.light = (state.drift.light || 0) + 8
          base = state.light + state.drift.light
        } else if (anomaly === 'pattern_break') {
          base = 200 + Math.random() * 100 // new baseline
        } else {
          base += (Math.random() - 0.5) * 30 // normal noise
        }
        state.light = Math.max(0, base)
        return { 
          timestamp: Date.now(), 
          value: Math.round(state.light),
          createdAt: serverTimestamp()
        }
      }

      case 'distance': {
        let base = state.distance + drift
        if (anomaly === 'spike') {
          base += 40 + Math.random() * 30 // +40 to +70 cm spike
        } else if (anomaly === 'outlier') {
          base = 200 + Math.random() * 50 // far outlier
        } else if (anomaly === 'drift') {
          state.drift.distance = (state.drift.distance || 0) + 0.5
          base = state.distance + state.drift.distance
        } else if (anomaly === 'pattern_break') {
          base = 80 + Math.random() * 10 // new baseline
        } else {
          base += (Math.random() - 0.5) * 2 // normal noise
        }
        state.distance = Math.max(0, base)
        return { 
          timestamp: Date.now(), 
          value: Number(state.distance.toFixed(1)),
          createdAt: serverTimestamp()
        }
      }

      case 'gas': {
        const gas = { ...state.gas }
        if (anomaly === 'spike') {
          gas.co += 30 + Math.random() * 40
          gas.co2 += 2000 + Math.random() * 1000
          gas.smoke += 300 + Math.random() * 200
          gas.airQuality = Math.min(500, gas.airQuality + 150 + Math.random() * 100)
        } else if (anomaly === 'outlier') {
          gas.co = 100 + Math.random() * 50
          gas.airQuality = 400 + Math.random() * 100
        } else if (anomaly === 'drift') {
          state.drift.gas = (state.drift.gas || 0) + 0.5
          gas.co += state.drift.gas
          gas.co2 += state.drift.gas * 50
          gas.airQuality += state.drift.gas * 5
        } else if (anomaly === 'pattern_break') {
          gas.co = 2 + Math.random() * 1
          gas.co2 = 400 + Math.random() * 50
          gas.airQuality = 50 + Math.random() * 20
        } else {
          gas.co += (Math.random() - 0.5) * 0.5
          gas.co2 += (Math.random() - 0.5) * 50
          gas.smoke += (Math.random() - 0.5) * 10
          gas.airQuality += (Math.random() - 0.5) * 5
        }
        Object.assign(state.gas, gas)
        return {
          timestamp: Date.now(),
          co: Math.max(0, Number(gas.co.toFixed(2))),
          co2: Math.max(400, Number(gas.co2.toFixed(0))),
          smoke: Math.max(0, Number(gas.smoke.toFixed(0))),
          lpg: Math.max(0, Number(gas.lpg.toFixed(0))),
          alcohol: Math.max(0, Number((Math.random() * 100).toFixed(0))),
          methane: Math.max(0, Number(gas.methane.toFixed(0))),
          hydrogen: Math.max(0, Number(gas.hydrogen.toFixed(0))),
          airQuality: Math.min(500, Math.max(0, Number(gas.airQuality.toFixed(0)))),
          temperature: 26 + (Math.random() - 0.5) * 2,
          humidity: 55 + (Math.random() - 0.5) * 5,
          createdAt: serverTimestamp()
        }
      }

      case 'gps': {
        const gps = { ...state.gps }
        if (anomaly === 'spike') {
          // Large position jump
          gps.lat += (Math.random() - 0.5) * 0.02
          gps.lng += (Math.random() - 0.5) * 0.02
          gps.speed = 25 + Math.random() * 15 // 25-40 m/s jump
        } else if (anomaly === 'outlier') {
          gps.lat = 0 // invalid
          gps.lng = 0
          gps.speed = 100 // impossible
        } else if (anomaly === 'drift') {
          state.drift.gps = (state.drift.gps || 0) + 0.2
          gps.speed += state.drift.gps
        } else if (anomaly === 'pattern_break') {
          gps.lat = 10.8 + Math.random() * 0.1
          gps.lng = 106.6 + Math.random() * 0.1
          gps.speed = 0.1
        } else {
          gps.lat += (Math.random() - 0.5) * 0.0001
          gps.lng += (Math.random() - 0.5) * 0.0001
          gps.speed = Math.max(0, gps.speed + (Math.random() - 0.5) * 0.1)
        }
        Object.assign(state.gps, gps)
        return {
          timestamp: Date.now(),
          latitude: Number(gps.lat.toFixed(6)),
          longitude: Number(gps.lng.toFixed(6)),
          altitude: Math.max(0, Number((gps.altitude + (Math.random() - 0.5) * 2).toFixed(1))),
          speed: Math.max(0, Number(gps.speed.toFixed(2))),
          accuracy: Number((Math.random() * 5 + 1).toFixed(1)),
          satellites: Math.floor(Math.random() * 8) + 4,
          createdAt: serverTimestamp()
        }
      }
    }
  }

  const sendToFirebase = async (sensor: SensorType, data: any) => {
    if (!firebaseConfigured || !db) {
      console.error('Firebase not configured or db is null')
      toast.error('Firebase not initialized. Check .env file.')
      return
    }

    try {
      let collectionName = ''
      switch (sensor) {
        case 'temperature':
          collectionName = 'temperature'
          break
        case 'light':
          collectionName = 'light'
          break
        case 'distance':
          collectionName = 'distance'
          break
        case 'gps':
          collectionName = 'gps_data'
          break
        case 'gas':
          collectionName = 'gas_data'
          break
      }

      const timestamp = data.timestamp
      console.log(`📤 Sending ${sensor} to ${collectionName}:`, { ...data, timestamp, timestampType: typeof timestamp })
      const docRef = await addDoc(collection(db, collectionName), data)
      console.log(`✅ Successfully sent ${sensor} with ID: ${docRef.id}, timestamp: ${timestamp} (${new Date(timestamp).toLocaleString()})`)
      setSentCount(prev => prev + 1)
    } catch (error: any) {
      console.error(`❌ Error sending ${sensor} to Firebase:`, error)
      toast.error(`Failed to send ${sensor}: ${error.message}`)
    }
  }

  const startSimulation = () => {
    if (isRunning) return

    setSentCount(0)
    setPhase('warmup')
    phaseRef.current = 'warmup'
    setWarmupSeconds(120) // 2 minutes = 120 seconds
    const startTime = Date.now()
    warmupStartRef.current = startTime
    setIsRunning(true)
    
    const tick = async () => {
      // During warmup, always send normal data; after warmup, use selected anomalyType
      const isWarmup = phaseRef.current === 'warmup'
      const currentAnomalyType = isWarmup ? 'normal' : anomalyType
      const data = generateValue(selectedSensor, currentAnomalyType)
      await sendToFirebase(selectedSensor, data)
    }

    // Countdown timer for warmup phase (updates every second)
    const updateCountdown = () => {
      if (warmupStartRef.current && phaseRef.current === 'warmup') {
        const elapsed = Math.floor((Date.now() - warmupStartRef.current) / 1000)
        const remaining = Math.max(0, 120 - elapsed)
        setWarmupSeconds(remaining)
        
        if (remaining === 0) {
          phaseRef.current = 'anomaly'
          setPhase('anomaly')
          warmupStartRef.current = null
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          toast.success(`Warmup complete! Starting ${anomalyType} anomaly for ${selectedSensor}`)
        }
      }
    }

    tick() // immediate first tick
    intervalRef.current = setInterval(tick, intervalMs) as unknown as number
    countdownRef.current = setInterval(updateCountdown, 1000) as unknown as number
    toast.success(`Started simulation: 2min warmup (normal) → ${anomalyType} anomaly for ${selectedSensor}`)
  }

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    warmupStartRef.current = null
    phaseRef.current = 'warmup'
    setPhase('warmup')
    setWarmupSeconds(0)
    setIsRunning(false)
    toast.success(`Stopped simulation (sent ${sentCount} records)`)
  }

  if (!firebaseConfigured) {
    return (
      <div className="bg-yellow-50 rounded-xl shadow-lg border border-yellow-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">📡 Fake ESP Simulator</h3>
        <p className="text-yellow-800 text-sm">
          ⚠️ Firebase chưa được cấu hình. Vui lòng thêm các biến VITE_FIREBASE_* vào .env và khởi động lại dev server.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        📡 Fake ESP Simulator
        {isRunning && (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium animate-pulse">
            RUNNING
          </span>
        )}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Sensor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sensor</label>
          <select
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value as SensorType)}
            disabled={isRunning}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="temperature">🌡️ Temperature</option>
            <option value="light">💡 Light</option>
            <option value="distance">📏 Distance</option>
            <option value="gas">🌬️ Gas</option>
            <option value="gps">🗺️ GPS</option>
          </select>
        </div>

        {/* Anomaly Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Anomaly Type</label>
          <select
            value={anomalyType}
            onChange={(e) => setAnomalyType(e.target.value as AnomalyType)}
            disabled={isRunning}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="normal">✅ Normal</option>
            <option value="spike">📈 Spike</option>
            <option value="drift">📊 Drift</option>
            <option value="outlier">⚠️ Outlier</option>
            <option value="pattern_break">🔄 Pattern Break</option>
          </select>
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interval (ms)
          </label>
          <input
            type="number"
            value={intervalMs}
            onChange={(e) => setIntervalMs(Math.max(500, parseInt(e.target.value) || 2000))}
            disabled={isRunning}
            min={500}
            step={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={startSimulation}
          disabled={isRunning}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          ▶️ Start
        </button>
        <button
          onClick={stopSimulation}
          disabled={!isRunning}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            !isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          ⏹️ Stop
        </button>
      </div>

      {/* Status Info */}
      {isRunning && (
        <div className="mt-4 p-3 rounded-lg text-sm">
          {phase === 'warmup' ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <strong>🔥 Warmup Phase:</strong> Sending normal data to establish baseline...
                </div>
                <div className="font-bold text-yellow-900">
                  ⏱️ {Math.floor(warmupSeconds / 60)}:{(warmupSeconds % 60).toString().padStart(2, '0')} remaining
                </div>
              </div>
              <div className="text-xs text-yellow-700">
                After warmup, will switch to <strong>{anomalyType}</strong> anomaly automatically
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <strong>🚨 Anomaly Phase:</strong> Sending <strong>{anomalyType}</strong> data for {selectedSensor} every {intervalMs}ms
                </div>
                <div className="font-semibold text-red-900">
                  📊 Sent: {sentCount} records
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


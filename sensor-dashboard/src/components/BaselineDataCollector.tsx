import { useState, useRef } from 'react'
import { useTemperature } from '../hooks/useTemperature'
import { useLight } from '../hooks/useLight'
import { useDistance } from '../hooks/useDistance'
import { useGps } from '../hooks/useGps'
import { useGas } from '../hooks/useGas'
import { useEdgeAI } from '../hooks/useEdgeAI'
import { loadBaselineFromFile, saveBaselineToIndexedDB, loadBaselineFromIndexedDB } from '../utils/baselineLoader'
import type { SensorReading } from '../ai/EdgeAnomalyDetector'
import toast from 'react-hot-toast'

export default function BaselineDataCollector() {
  const [collecting, setCollecting] = useState(false)
  const [training, setTraining] = useState(false)
  const [loadingBaseline, setLoadingBaseline] = useState(false)
  const [baselineInfo, setBaselineInfo] = useState<{ count: number; savedAt?: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { trainFromBaseline } = useEdgeAI()

  // Collect baseline from current data
  const { data: tempData = [] } = useTemperature(1000, 60) // Last 60 minutes
  const { data: lightData = [] } = useLight(1000, 60)
  const { data: distanceData = [] } = useDistance(1000, 60)
  const { data: gpsData = [] } = useGps(1000)
  const { data: gasData = [] } = useGas(1000)

  const collectBaseline = async () => {
    setCollecting(true)
    try {
      // Convert all sensor data to SensorReading format
      const readings: SensorReading[] = []
      
      tempData.forEach(d => {
        readings.push({
          timestamp: d.timestamp,
          value: d.temperature,
          sensorType: 'temperature'
        })
      })
      
      lightData.forEach(d => {
        readings.push({
          timestamp: d.timestamp,
          value: d.light,
          sensorType: 'light'
        })
      })
      
      distanceData.forEach(d => {
        readings.push({
          timestamp: d.timestamp,
          value: d.distance,
          sensorType: 'distance'
        })
      })
      
      gpsData.forEach(d => {
        // Convert GPS speed from m/s to km/h for consistency
        const speedKmh = d.speed * 3.6
        readings.push({
          timestamp: d.timestamp,
          value: speedKmh,
          sensorType: 'gps'
        })
      })
      
      gasData.forEach(d => {
        // Composite gas value
        const composite = (d.co2 || 0) * 0.4 + (d.tvoc || 0) * 0.3 + (d.iaq || 0) * 0.3
        readings.push({
          timestamp: d.timestamp,
          value: composite,
          sensorType: 'gas'
        })
      })

      if (readings.length === 0) {
        toast.error('Không có dữ liệu để collect')
        return
      }

      // Sort by timestamp
      readings.sort((a, b) => a.timestamp - b.timestamp)

      // Create metadata
      const startTime = readings[0].timestamp
      const endTime = readings[readings.length - 1].timestamp
      const readingsBySensor: Record<string, number> = {}
      readings.forEach(r => {
        readingsBySensor[r.sensorType] = (readingsBySensor[r.sensorType] || 0) + 1
      })

      const baselineFile = {
        metadata: {
          collectedAt: Date.now(),
          startTime,
          endTime,
          startDate: new Date(startTime).toISOString(),
          endDate: new Date(endTime).toISOString(),
          sensors: Object.keys(readingsBySensor),
          totalReadings: readings.length,
          readingsBySensor
        },
        data: readings
      }

      // Save to IndexedDB
      await saveBaselineToIndexedDB(readings)
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(baselineFile, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `baseline_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setBaselineInfo({ count: readings.length, savedAt: Date.now() })
      toast.success(`✅ Đã collect ${readings.length} readings và export file`)
    } catch (error: any) {
      console.error('Failed to collect baseline:', error)
      toast.error(`❌ Lỗi: ${error.message}`)
    } finally {
      setCollecting(false)
    }
  }

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingBaseline(true)
    try {
      const readings = await loadBaselineFromFile(file)
      await saveBaselineToIndexedDB(readings)
      setBaselineInfo({ count: readings.length, savedAt: Date.now() })
      toast.success(`✅ Đã load ${readings.length} readings từ file`)
    } catch (error: any) {
      console.error('Failed to load baseline file:', error)
      toast.error(`❌ Lỗi: ${error.message}`)
    } finally {
      setLoadingBaseline(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const loadFromIndexedDB = async () => {
    setLoadingBaseline(true)
    try {
      const readings = await loadBaselineFromIndexedDB()
      if (!readings || readings.length === 0) {
        toast.error('Không có baseline trong IndexedDB')
        return
      }
      setBaselineInfo({ count: readings.length })
      toast.success(`✅ Đã load ${readings.length} readings từ IndexedDB`)
    } catch (error: any) {
      console.error('Failed to load from IndexedDB:', error)
      toast.error(`❌ Lỗi: ${error.message}`)
    } finally {
      setLoadingBaseline(false)
    }
  }

  const trainFromBaselineData = async () => {
    setTraining(true)
    try {
      const readings = await loadBaselineFromIndexedDB()
      if (!readings || readings.length === 0) {
        toast.error('Không có baseline để train. Hãy collect hoặc load file trước.')
        return
      }

      toast.loading('Đang train model từ baseline...', { id: 'training' })
      const result = await trainFromBaseline(readings)
      
      if (result.ok) {
        toast.success('✅ Model đã được train từ baseline!', { id: 'training' })
      } else {
        toast.error(`❌ Lỗi: ${result.error}`, { id: 'training' })
      }
    } catch (error: any) {
      console.error('Failed to train from baseline:', error)
      toast.error(`❌ Lỗi: ${error.message}`, { id: 'training' })
    } finally {
      setTraining(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Baseline Data Collector</h3>
      <p className="text-sm text-gray-600 mb-4">
        Collect baseline data từ dữ liệu hiện tại (60 phút gần nhất) hoặc load từ file để train model.
      </p>

      {baselineInfo && (
        <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
          <strong>Baseline đã load:</strong> {baselineInfo.count} readings
          {baselineInfo.savedAt && (
            <span className="text-gray-500 ml-2">
              ({new Date(baselineInfo.savedAt).toLocaleString()})
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={collectBaseline}
          disabled={collecting}
          className={`w-full px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
            collecting 
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60' 
              : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 hover:from-blue-600 hover:via-cyan-600 hover:to-teal-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
          }`}
        >
          {collecting ? '⏳ Đang collect...' : '📊 Collect Baseline (60 phút gần nhất)'}
        </button>

        <div className="flex gap-2">
          <label className={`flex-1 px-4 py-3 rounded-lg font-semibold text-center cursor-pointer transition-all duration-200 ${
            loadingBaseline
              ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-md hover:shadow-lg transform hover:scale-[1.02]'
          }`}>
            📁 Load từ File
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileLoad}
              className="hidden"
              disabled={loadingBaseline}
            />
          </label>
          <button
            onClick={loadFromIndexedDB}
            disabled={loadingBaseline}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
              loadingBaseline
                ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 text-white hover:from-violet-600 hover:via-fuchsia-600 hover:to-rose-600 shadow-md hover:shadow-lg transform hover:scale-[1.02]'
            }`}
          >
            🔄 Load từ IndexedDB
          </button>
        </div>

        <button
          onClick={trainFromBaselineData}
          disabled={training || !baselineInfo}
          className={`w-full px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
            training || !baselineInfo
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
          }`}
        >
          {training ? '⏳ Đang train...' : '🚀 Train Model từ Baseline'}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Workflow:</strong></p>
        <ol className="list-decimal list-inside space-y-1 mt-1">
          <li>Collect baseline từ dữ liệu hiện tại (môi trường dev)</li>
          <li>Export file JSON để lưu trữ</li>
          <li>Trên môi trường production: Load file và Train model</li>
          <li>Model sẽ dùng baseline này thay vì synthetic data</li>
        </ol>
      </div>
    </div>
  )
}


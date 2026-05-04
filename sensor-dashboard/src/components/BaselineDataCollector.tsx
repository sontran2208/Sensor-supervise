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
import { HiChartBar, HiFolder, HiRefresh, HiCheckCircle, HiDatabase, HiSparkles } from 'react-icons/hi'
import { FaHourglassHalf, FaRocket } from 'react-icons/fa'

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
  const sourceStats = [
    { key: 'temperature', label: 'Nhiệt độ', count: tempData.length, accent: 'text-rose-600 bg-rose-50 border-rose-200' },
    { key: 'light', label: 'Ánh sáng', count: lightData.length, accent: 'text-amber-700 bg-amber-50 border-amber-200' },
    { key: 'distance', label: 'Khoảng cách', count: distanceData.length, accent: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { key: 'gps', label: 'GPS', count: gpsData.length, accent: 'text-sky-700 bg-sky-50 border-sky-200' },
    { key: 'gas', label: 'Khí gas', count: gasData.length, accent: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200' }
  ]
  const totalSourceReadings = sourceStats.reduce((sum, item) => sum + item.count, 0)
  const availableSources = sourceStats.filter(item => item.count > 0).length

  const collectBaseline = async () => {
    setCollecting(true)
    try {
      // Convert all sensor data to SensorReading format
      const readings: SensorReading[] = []
      
      tempData.forEach(d => {
        readings.push({
          timestamp: d.timestamp,
          value: d.value,
          sensorType: 'temperature'
        })
      })
      
      lightData.forEach(d => {
        readings.push({
          timestamp: d.timestamp,
          value: d.value,
          sensorType: 'light'
        })
      })
      
      distanceData.forEach(d => {
        readings.push({
          timestamp: d.timestamp,
          value: d.value,
          sensorType: 'distance'
        })
      })
      
      gpsData.forEach(d => {
        // Convert GPS speed from m/s to km/h for consistency
        const speedKmh = (d.speed ?? 0) * 3.6
        readings.push({
          timestamp: d.timestamp,
          value: speedKmh,
          sensorType: 'gps'
        })
      })
      
      gasData.forEach(d => {
        // Sử dụng mq2_raw (format mới từ Arduino code)
        // Chuyển đổi mq2_raw thành giá trị composite (0-100) cho baseline
        const mq2_raw = d.mq2_raw || 0;
        let composite = 0;
        if (mq2_raw < 500) {
          composite = (mq2_raw / 500) * 25; // 0-25
        } else if (mq2_raw < 1500) {
          composite = 25 + ((mq2_raw - 500) / 1000) * 25; // 25-50
        } else if (mq2_raw < 3000) {
          composite = 50 + ((mq2_raw - 1500) / 1500) * 25; // 50-75
        } else {
          composite = 75 + Math.min(25, ((mq2_raw - 3000) / 1095) * 25); // 75-100
        }
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-lg">
      <div className="border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
                <HiDatabase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Baseline Data Collector</h3>
                <p className="text-sm text-slate-600">
                  Thu thập hoặc nạp baseline để huấn luyện mô hình bằng dữ liệu thực.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Quy trình 3 bước
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Nguồn dữ liệu sẵn sàng</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{availableSources}/5</div>
            <div className="mt-1 text-sm text-slate-500">Cảm biến đang có dữ liệu để tạo baseline</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Tổng mẫu hiện có</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{totalSourceReadings}</div>
            <div className="mt-1 text-sm text-slate-500">Lấy từ các hook dữ liệu gần nhất của dashboard</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái baseline</div>
            <div className="mt-2 text-sm font-semibold text-slate-800">
              {baselineInfo ? `${baselineInfo.count} readings đã sẵn sàng` : 'Chưa có baseline được nạp'}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {baselineInfo?.savedAt ? new Date(baselineInfo.savedAt).toLocaleString() : 'Hãy collect hoặc load trước khi train'}
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {sourceStats.map((item) => (
            <span
              key={item.key}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${item.accent}`}
            >
              {item.label}: {item.count}
            </span>
          ))}
        </div>

        {baselineInfo && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <HiCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Baseline đã sẵn sàng để train</div>
              <div>
                Đã lưu <span className="font-semibold">{baselineInfo.count}</span> readings
                {baselineInfo.savedAt ? ` lúc ${new Date(baselineInfo.savedAt).toLocaleString()}` : ''}.
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 p-5 text-white shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Bước 1</div>
                <h4 className="mt-2 text-xl font-semibold">Thu thập baseline từ dữ liệu hiện tại</h4>
                <p className="mt-2 text-sm text-cyan-50/90">
                  Tự động gom dữ liệu 60 phút gần nhất, lưu vào IndexedDB và xuất file JSON để mang sang môi trường khác.
                </p>
              </div>
              <div className="rounded-xl bg-white/15 p-3">
                <HiChartBar className="h-6 w-6" />
              </div>
            </div>

            <button
              onClick={collectBaseline}
              disabled={collecting}
              className="mt-5 w-full appearance-none rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-white/10 disabled:translate-y-0"
              style={{
                background: collecting ? 'rgba(148, 163, 184, 0.45)' : 'rgba(255, 255, 255, 0.12)',
                cursor: collecting ? 'not-allowed' : 'pointer',
                WebkitTextFillColor: '#ffffff'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                {collecting ? (
                  <>
                    <FaHourglassHalf className="h-4 w-4 animate-spin" />
                    Đang thu thập baseline...
                  </>
                ) : (
                  <>
                    <HiChartBar className="h-4 w-4" />
                    Collect baseline (60 phút gần nhất)
                  </>
                )}
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Bước 2</div>
                  <h4 className="mt-1 text-base font-semibold text-slate-800">Nạp baseline có sẵn</h4>
                  <p className="mt-1 text-sm text-slate-500">Chọn file JSON hoặc khôi phục bản lưu gần nhất từ IndexedDB.</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                  <HiFolder className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className="group flex cursor-pointer flex-col justify-between rounded-xl border border-violet-200 bg-violet-50 p-4 transition hover:border-violet-300 hover:bg-violet-100"
                  style={{
                    opacity: loadingBaseline ? 0.65 : 1,
                    cursor: loadingBaseline ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                    <HiFolder className="h-4 w-4" />
                    Load từ file
                  </div>
                  <div className="mt-2 text-xs text-violet-600">Import baseline JSON từ máy của bạn</div>
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
                  className="appearance-none rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-left transition hover:border-fuchsia-300 hover:bg-fuchsia-100"
                  style={{
                    opacity: loadingBaseline ? 0.65 : 1,
                    cursor: loadingBaseline ? 'not-allowed' : 'pointer',
                    WebkitTextFillColor: '#86198f'
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-700">
                    <HiRefresh className={`h-4 w-4 ${loadingBaseline ? 'animate-spin' : ''}`} />
                    Load từ IndexedDB
                  </div>
                  <div className="mt-2 text-xs text-fuchsia-600">Dùng baseline đã lưu trong trình duyệt</div>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Bước 3</div>
                  <h4 className="mt-1 text-base font-semibold">Huấn luyện mô hình từ baseline</h4>
                  <p className="mt-1 text-sm text-emerald-50/90">
                    Chỉ khả dụng khi đã có baseline trong bộ nhớ hoặc vừa được load xong.
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 p-2">
                  <HiSparkles className="h-5 w-5" />
                </div>
              </div>

              <button
                onClick={trainFromBaselineData}
                disabled={training || !baselineInfo}
                className="mt-4 w-full appearance-none rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:translate-y-0"
                style={{
                  background: training || !baselineInfo ? 'rgba(148, 163, 184, 0.38)' : 'rgba(255, 255, 255, 0.12)',
                  cursor: training || !baselineInfo ? 'not-allowed' : 'pointer',
                  WebkitTextFillColor: '#ffffff'
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {training ? (
                    <>
                      <FaHourglassHalf className="h-4 w-4 animate-spin" />
                      Đang train model...
                    </>
                  ) : (
                    <>
                      <FaRocket className="h-4 w-4" />
                      Train model từ baseline
                    </>
                  )}
                </span>
              </button>

              {!baselineInfo && (
                <div className="mt-3 text-xs text-emerald-50/80">
                  Hãy hoàn thành bước 1 hoặc bước 2 trước khi train.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-800">Workflow đề xuất</div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              '1. Thu thập baseline từ dữ liệu hiện tại ở môi trường dev',
              '2. Xuất file JSON để lưu trữ hoặc chia sẻ giữa các môi trường',
              '3. Trên production, load file hoặc IndexedDB để khôi phục baseline',
              '4. Train mô hình để dùng baseline thật thay cho synthetic data'
            ].map((step, index) => (
              <div key={step} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
                  {index + 1}
                </div>
                <div>{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


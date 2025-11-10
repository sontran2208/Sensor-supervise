import { useRef, useEffect, useState, useCallback } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { Hands } from '@mediapipe/hands'
import type { Results } from '@mediapipe/hands'
import Header from '../components/Header'

interface FingerCount { count: number; confidence: number }

interface CameraLiveProps {
  onNavigateToDashboard: () => void;
}

export default function CameraLive({ onNavigateToDashboard }: CameraLiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handsRef = useRef<Hands | null>(null)
  const timerRef = useRef<number | null>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)
  const loopingRef = useRef<boolean>(false)
  const fingerCountHistory = useRef<number[]>([])

  const [ip, setIp] = useState('192.168.1.154')
  const [isStreaming, setIsStreaming] = useState(false)
  const [fingerCount, setFingerCount] = useState<FingerCount>({ count: 0, confidence: 0 })
  const [ledStatus, setLedStatus] = useState<number[]>(Array(10).fill(0))
  const [error, setError] = useState<string | null>(null)

  // Improved finger detection with stricter thresholds
  function isExtendedFinger(landmarks: any[], tip: number, pip: number, mcp: number) {
    // Check if tip is above PIP (more strict)
    const tipAbove = landmarks[tip].y < landmarks[pip].y
    if (!tipAbove) return false
    
    // Check vertical extension (must be significantly extended)
    const distance = Math.abs(landmarks[tip].y - landmarks[pip].y)
    const avgDist = (Math.abs(landmarks[pip].y - landmarks[mcp].y) + 0.01)
    
    // Increased threshold from 30% to 40% for better accuracy
    return distance / avgDist > 0.4
  }

  // Improved counting with stabilization - Only count 4 fingers (not thumb)
  function countExtendedFingers(landmarks: any[]) {
    let count = 0
    let confidence = 0
    
    // DON'T count thumb - it's too unreliable and causes over-detection
    // Just count the 4 fingers
    
    // Check each finger (using stable landmarks)
    // Index finger (8 = tip, 6 = PIP, 5 = MCP)
    if (isExtendedFinger(landmarks, 8, 6, 5)) {
      count++
      confidence += 0.95
    }
    
    // Middle finger (12 = tip, 10 = PIP, 9 = MCP)
    if (isExtendedFinger(landmarks, 12, 10, 9)) {
      count++
      confidence += 0.95
    }
    
    // Ring finger (16 = tip, 14 = PIP, 13 = MCP)
    if (isExtendedFinger(landmarks, 16, 14, 13)) {
      count++
      confidence += 0.95
    }
    
    // Pinky (20 = tip, 18 = PIP, 17 = MCP)
    if (isExtendedFinger(landmarks, 20, 18, 17)) {
      count++
      confidence += 0.95
    }
    
    return { count, confidence: confidence / 4 }
  }

  // Stabilization: use median of last 5 frames to reduce jitter
  function getStabilizedCount(newCount: number) {
    fingerCountHistory.current.push(newCount)
    if (fingerCountHistory.current.length > 5) {
      fingerCountHistory.current.shift()
    }
    
    const sorted = [...fingerCountHistory.current].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    
    // Only update if change is significant (reduces flicker)
    const diff = Math.abs(median - newCount)
    if (diff <= 1) {
      return newCount
    }
    return median
  }

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    })
    
    // Improved settings for better accuracy
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // 0=fast, 1=better, 2=best (but slower)
      minDetectionConfidence: 0.8, // Increased from 0.6 for better accuracy
      minTrackingConfidence: 0.8, // Increased from 0.6 for stability
    })
    
    hands.onResults((results: Results) => {
      const lm = results.multiHandLandmarks?.[0]
      const handness = results.multiHandedness?.[0]
      
      // Clear old text
      const c = canvasRef.current
      if (c) {
        const ctx = c.getContext('2d')!
        ctx.fillStyle = 'rgba(0,0,0,0.8)'
        ctx.fillRect(0, 0, 200, 100)
      }
      
      if (!lm) {
        setFingerCount({ count: 0, confidence: 0 })
        return
      }
      
      // Use improved counting
      const detection = countExtendedFingers(lm)
      
      // Stabilize with history (reduces flicker)
      const stabilizedCount = getStabilizedCount(detection.count)
      
      setFingerCount({ 
        count: stabilizedCount, 
        confidence: detection.confidence 
      })
  
      // Draw detection info on canvas
      if (c) {
        const ctx = c.getContext('2d')!
        ctx.fillStyle = '#00ff00'
        ctx.font = 'bold 24px Arial'
        ctx.fillText(`Fingers: ${stabilizedCount}`, 10, 30)
        
        ctx.fillStyle = '#ffff00'
        ctx.font = '16px Arial'
        ctx.fillText(`Confidence: ${Math.round(detection.confidence * 100)}%`, 10, 50)
        
        if (handness) {
          ctx.fillText(`Hand: ${handness.label}`, 10, 70)
        }
      }
    })
  
    handsRef.current = hands
  
    // ✅ cleanup
    return () => {
      void hands.close()
    }
  }, [])
  

  const fetchSnapshotBlob = useCallback(async (ipAddr: string) => {
    const u1 = `http://${ipAddr}/capture?ts=${Date.now()}`
    const u2 = `http://${ipAddr}/jpg?ts=${Date.now()}`
    fetchAbortRef.current?.abort()
    const ctl = new AbortController()
    fetchAbortRef.current = ctl

    let res = await fetch(u1, { mode: 'cors', cache: 'no-store', signal: ctl.signal })
    if (res.status === 404) {
      res = await fetch(u2, { mode: 'cors', cache: 'no-store', signal: ctl.signal })
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.blob()
  }, [])

  const loopTick = useCallback(async () => {
    if (!loopingRef.current) return
    try {
      const blob = await fetchSnapshotBlob(ip)
      const img = await new Promise<HTMLImageElement>((resolve) => {
        const im = new Image()
        im.onload = () => resolve(im)
        im.src = URL.createObjectURL(blob)
      })
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(img.src)
      await handsRef.current!.send({ image: canvas })
      setError(null)
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(`Lỗi lấy ảnh từ ESP32: ${e?.message ?? e}`)
      }
    } finally {
      timerRef.current = window.setTimeout(() => {
        if (loopingRef.current) requestAnimationFrame(loopTick)
      }, 80) as unknown as number
    }
  }, [fetchSnapshotBlob, ip])

  const start = useCallback(() => {
    setError(null)
    setIsStreaming(true)
    loopingRef.current = true
    requestAnimationFrame(loopTick)
  }, [loopTick])

  const stop = useCallback(() => {
    loopingRef.current = false
    setIsStreaming(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    fetchAbortRef.current?.abort()
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  useEffect(() => {
    const arr = Array(10).fill(0)
    for (let i = 0; i < Math.min(fingerCount.count, 10); i++) arr[i] = 1
    setLedStatus(arr)
  }, [fingerCount.count])

  const sendAllLedStates = useCallback(async () => {
    if (!db) return console.error('Firebase not initialized')
    try {
      await addDoc(collection(db, 'led_commands'), {
        ledStates: ledStatus,
        timestamp: serverTimestamp(),
        fingerCount: fingerCount.count,
        command: 'update_all',
      })
    } catch (e) {
      console.error('Error sending LED states:', e)
    }
  }, [ledStatus, fingerCount.count])

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full lg:max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
        <Header
          currentPage="camera"
          onPageChange={(page) => {
            if (page === "dashboard") onNavigateToDashboard()
          }}
        />

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-blue-700">ESP32 IP:</label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value.trim())}
              placeholder="192.168.1.xxx"
              className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (isStreaming) { stop(); setTimeout(start, 120) }
                else { start() }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              Áp dụng
            </button>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            FE gọi thẳng: <code>http://&lt;IP&gt;/capture</code> (fallback <code>/jpg</code>). ESP32 cần bật CORS ở handler.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">❌ {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📷 Canvas Preview</h3>

              <div className="mb-4 flex gap-2">
                <button
                  onClick={start}
                  disabled={isStreaming}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isStreaming ? 'bg-gray-300 text-gray-500' : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isStreaming ? 'Đang phát' : 'Bắt đầu'}
                </button>
                <button
                  onClick={stop}
                  disabled={!isStreaming}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    !isStreaming ? 'bg-gray-300 text-gray-500' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Dừng
                </button>
              </div>

              <div className="relative bg-black rounded-lg overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-64" />
              </div>

              {isStreaming && (
                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-blue-800">
                      👆 {fingerCount.count} ngón tay
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      fingerCount.confidence > 0.8 ? 'bg-green-100 text-green-700' :
                      fingerCount.confidence > 0.5 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(fingerCount.confidence * 100)}% confidence
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    💡 Cải tiến: Sử dụng median filter (5 frames) để giảm nhiễu và tăng độ ổn định
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">💡 LED Control</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {ledStatus.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-1 ${s ? 'bg-yellow-400 shadow-lg' : 'bg-gray-300'}`} />
                    <div className="text-xs text-gray-600">LED {i + 1}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={sendAllLedStates}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
              >
                Gửi trạng thái LED đến ESP32
              </button>
              <div className="text-sm text-gray-600 mt-2">
                <strong>Trạng thái hiện tại:</strong> {ledStatus.filter(Boolean).length}/10 LED bật
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-2">🔗 Trạng thái</h4>
              <div className="text-xs text-green-700 space-y-1">
                <div><strong>ESP32 IP:</strong> {ip}</div>
                <div><strong>Snapshot endpoint:</strong> {`http://${ip}/capture`}</div>
                <div><strong>Trạng thái:</strong> {isStreaming ? '🟢 Đang kết nối' : '🔴 Chưa kết nối'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

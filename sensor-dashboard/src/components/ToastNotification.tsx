import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export default function ToastNotification({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 text-white border-red-600'
      case 'warning':
        return 'bg-yellow-500 text-white border-yellow-600'
      case 'success':
        return 'bg-green-500 text-white border-green-600'
      case 'info':
        return 'bg-blue-500 text-white border-blue-600'
      default:
        return 'bg-gray-500 text-white border-gray-600'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '🚨'
      case 'warning':
        return '⚠️'
      case 'success':
        return '✅'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }

  if (!isVisible) return null

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`${getToastStyles()} rounded-lg shadow-lg border p-4 flex items-start space-x-3`}>
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="text-white hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string) => {
    addToast({ message, type: 'success' })
  }, [addToast])

  const showWarning = useCallback((message: string) => {
    addToast({ message, type: 'warning' })
  }, [addToast])

  const showError = useCallback((message: string) => {
    addToast({ message, type: 'error' })
  }, [addToast])

  const showInfo = useCallback((message: string) => {
    addToast({ message, type: 'info' })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showWarning,
    showError,
    showInfo
  }
}

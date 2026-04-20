
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'react-hot-toast'
import { initTfBackend } from './ai/tfBackend'

function bootstrap() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#22c55e',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </StrictMode>,
  )
}

// Initialize TensorFlow backend; don't block UI if not supported
initTfBackend('wasm')
  .catch(() => {})
  .finally(() => {
    bootstrap()
  })

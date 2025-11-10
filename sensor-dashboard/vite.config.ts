import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Sensor-supervise/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy cho stream (nếu bạn vẫn muốn xem stream trong <img>):
      '/esp': {
        target: 'http://192.168.1.154:81', // ĐỔI IP của ESP32
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/esp/, ''),
      },
      // Proxy cho snapshot /capture (port 80)
      '/esp80': {
        target: 'http://192.168.1.154:80', // ĐỔI IP của ESP32
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/esp80/, ''),
      },
    },
  },
})

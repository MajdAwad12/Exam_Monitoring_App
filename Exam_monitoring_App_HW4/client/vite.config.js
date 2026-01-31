import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ✅ Local dev: proxy API + WebSocket to backend (prevents dashboard/login failures)
  server: {
    open: true,
    proxy: {
      "/api": "http://localhost:5000",
      "/ws": {
        target: "ws://localhost:5000",
        ws: true,
      },
    },
  },

  // 🔧 חשוב מאוד – פותר Outdated Optimize Dep (504)
  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "chart.js",
    ],
  },
})

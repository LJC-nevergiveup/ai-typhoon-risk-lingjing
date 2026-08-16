import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' —— 使用相对路径，保证可部署到 GitHub Pages 子路径 / Vercel 等静态托管平台
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // 将大体积第三方库拆分为独立 chunk，便于缓存
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl'],
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})

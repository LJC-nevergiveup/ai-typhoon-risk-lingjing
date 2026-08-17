import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

// base: './' —— 使用相对路径，保证可部署到 GitHub Pages 子路径 / Vercel 等静态托管平台
//
// public/data/raw/ 是离线导入用的原始大文件（Copernicus DEM、Kontur gpkg、FY-4B NC/JPG 等，
// 数百 MB），仅供 scripts/ 离线处理，前端运行时从不加载。构建时将其从产物中剔除，
// 避免把这些“未处理原始数据”随作品部署（既无必要，也会让部署体积膨胀、并暴露下载源文件）。
function excludeRawDataFromBuild(): Plugin {
  return {
    name: 'exclude-raw-data-from-build',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      rmSync(resolve(process.cwd(), 'dist', 'data', 'raw'), { recursive: true, force: true })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), excludeRawDataFromBuild()],
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

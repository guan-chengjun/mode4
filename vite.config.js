import { defineConfig } from 'vite';

// Vite 配置：根目录即项目目录，构建输出到 dist
export default defineConfig({
  server: {
    port: 5173,
    open: true, // 启动后自动打开浏览器
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

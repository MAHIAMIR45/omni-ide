import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: 'all',
    hmr: {
      // HMR events come through the Express proxy on port 5000
      clientPort: process.env.REPLIT_DEV_DOMAIN ? 443 : 5000,
      host: process.env.REPLIT_DEV_DOMAIN || 'localhost',
      protocol: process.env.REPLIT_DEV_DOMAIN ? 'wss' : 'ws',
    },
    // Vite itself doesn't need to proxy — Express handles /api
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          monaco: ['@monaco-editor/react'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@monaco-editor/react'],
  },
}));

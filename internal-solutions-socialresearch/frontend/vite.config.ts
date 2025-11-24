import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },

  build: {
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],

          'visualization': ['d3', 'd3-cloud'],

          'redux-vendor': ['react-redux', '@reduxjs/toolkit']
        }
      }
    }
  },

  server: {
    port: 5173,
    host: true,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: false,
    },
  }
})
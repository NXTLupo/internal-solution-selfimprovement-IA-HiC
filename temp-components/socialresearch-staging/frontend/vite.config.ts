import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

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

  preview: {
    port: 3000,
    strictPort: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    origin: "http://localhost:5173",
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 3000,
      clientPort: 3000,
      overlay: true,
    },
  }
})

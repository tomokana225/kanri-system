import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the client
    'process.env': {
      'API_KEY': JSON.stringify(process.env.API_KEY),
      // FIX: Removed Firebase environment variables from the define block.
      // They are now accessed via import.meta.env, which is the standard Vite way.
    }
  }
})
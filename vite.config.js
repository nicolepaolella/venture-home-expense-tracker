import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for Venture Home Solar expense tracker.
// Cloud Run expects the container to serve on port 8080.
// allowedHosts: true is required so vite preview accepts the Cloud Run hostname
// (Vite 5+ blocks unknown hosts as a DNS-rebinding protection).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: true,
  },
});

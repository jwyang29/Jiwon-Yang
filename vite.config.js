import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: parseInt(process.env.PORT || '5173'),
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});

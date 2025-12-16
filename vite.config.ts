import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    base: './', // Use relative paths for assets to support any deployment subpath
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
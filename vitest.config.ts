import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Deliberately NOT extending vite.config.ts — the PWA plugin has nothing to do
// with unit tests and makes every run slower.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/**',
        'src/hooks/useAuth.tsx',
        'src/components/auth/**',
        'src/components/common/**',
        'supabase/functions/_shared/otp-core.ts',
      ],
    },
  },
});

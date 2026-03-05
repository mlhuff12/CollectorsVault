import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react(), basicSsl()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/tests/setupTests.ts',
        include: ['src/tests/**/*.{test,spec}.{ts,tsx}']
    },
    server: {
        host: true,
        port: 3000,
        https: true
    },
    preview: {
        host: true,
        port: 4173,
        https: true
    }
});

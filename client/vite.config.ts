import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';

const lanCertPath = path.resolve(__dirname, '../server/.certs/lan-api-cert.pem');
const lanKeyPath = path.resolve(__dirname, '../server/.certs/lan-api-key.pem');
const hasLanCertFiles = fs.existsSync(lanCertPath) && fs.existsSync(lanKeyPath);

const httpsConfig = hasLanCertFiles
    ? {
        cert: fs.readFileSync(lanCertPath),
        key: fs.readFileSync(lanKeyPath)
    }
    : true;

export default defineConfig({
    plugins: hasLanCertFiles ? [react()] : [react(), basicSsl()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/tests/setupTests.ts',
        include: ['src/tests/**/*.{test,spec}.{ts,tsx}']
    },
    server: {
        host: true,
        port: 3000,
        https: httpsConfig
    },
    preview: {
        host: true,
        port: 4173,
        https: httpsConfig
    }
});

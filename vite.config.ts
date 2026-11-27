/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const CSP =
  "default-src 'self'; connect-src 'self' https://servicodados.ibge.gov.br https://api.bcb.gov.br; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'self'; form-action 'self'";

/** GitHub Pages cannot send headers, so the policy goes in the document. The dev server needs inline scripts. */
const contentSecurityPolicy: Plugin = {
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
};

export default defineConfig({
  // Relative asset paths work under any GitHub Pages repository name.
  base: './',
  plugins: [react(), contentSecurityPolicy],
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'] },
});

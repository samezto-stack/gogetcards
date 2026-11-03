import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // react-router-dom ships a dual CJS/ESM build; left externalized (Vite's
    // SSR default), Node's own interop for it drops named exports (Link,
    // Routes, Route, StaticRouter, ...) under Vite's dev SSR module runner.
    // Bundling it through Vite instead of Node's native resolution sidesteps
    // that entirely, for both dev and the `vite build --ssr` output.
    ssr: {
      noExternal: ['react-router-dom', 'react-router'],
      // Force Vite's SSR resolver to prefer the pure-ESM build condition
      // ahead of "node" — react-router-dom's exports map nests a CJS
      // fallback ("default") under the "node" condition, and with "node"
      // checked first (Vite's SSR default) that CJS file gets bundled as if
      // it were ESM, throwing "module is not defined".
      resolve: {
        conditions: ['import', 'module', 'browser', 'default'],
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

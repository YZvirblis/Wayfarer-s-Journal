import { defineConfig } from 'vite';

/**
 * Builds the Electron main process into dist/electron as CommonJS. The server
 * source is compiled in (so no tsx at runtime); express and its dependencies
 * stay external and ship as node_modules, because they load files by name at
 * runtime and cannot be bundled safely. `main` and `server` are separate
 * entries so main.ts can set the environment before the server code runs.
 */
export default defineConfig({
  build: {
    ssr: true,
    outDir: 'dist/electron',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    sourcemap: false,
    lib: {
      entry: { main: 'electron/main.ts', server: 'electron/server.ts' },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.cjs`,
    },
    rollupOptions: {
      external: ['electron', 'express'],
      output: { chunkFileNames: '[name]-[hash].cjs' },
    },
  },
  ssr: {
    // Bundle zod and nanoid (pure, ESM-only) so the CommonJS output can load them.
    noExternal: true,
    external: ['electron', 'express'],
  },
});

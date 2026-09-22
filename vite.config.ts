import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = `http://127.0.0.1:${process.env.WJ_PORT ?? 4777}`;
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Which vendor chunk a module belongs to, so the app's own code stays small and cacheable on its own. */
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
  if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return 'radix';
  if (/[\\/]node_modules[\\/]d3-/.test(id)) return 'd3';
  if (
    /[\\/]node_modules[\\/](react-markdown|remark-|rehype-|unified|micromark|mdast-|hast-|unist-|vfile|bail|trough|zwitch|devlop|property-information|space-separated-tokens|comma-separated-tokens|html-url-attributes|estree-util|decode-named-character-reference|character-entities|ccount|markdown-table|longest-streak|trim-lines|is-plain-obj|extend|style-to-object|style-to-js|inline-style-parser)/.test(
      id,
    )
  ) {
    return 'markdown';
  }
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  // The About dialog shows the version without shipping package.json to the browser.
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: {
      '~fonts': fileURLToPath(new URL('./node_modules/@fontsource-variable', import.meta.url)),
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4778,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
});

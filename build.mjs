import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const entryPoints = {
  renderer: 'src/renderer/main.js',
  app: 'src/styles/app.css',
  fonts: 'src/styles/fonts.css',
};
if (existsSync('src/renderer/present.js')) entryPoints.present = 'src/renderer/present.js';

const options = {
  entryPoints,
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome130',
  sourcemap: true,
  loader: { '.woff2': 'file' },
  // Chromium zawsze używa woff2 — pliki .woff nie są potrzebne w paczce.
  // jsPDF ma opcjonalne zależności, których nie używamy.
  external: ['*.woff', 'html2canvas', 'dompurify', 'canvg'],
  assetNames: 'fonts/[name]-[hash]',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('Obserwuję zmiany…');
} else {
  await esbuild.build(options);
}

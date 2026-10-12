// Web build: bundles src/ into ONE self-contained HTML file (game code, Fredoka font, icon all inlined).
// Works on any static host and also when opened straight from disk (file://), which plain ES modules can't do.
// Output: dist/web/index.html (also used by the PC build). Usage: node tools/build-web.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'web');
fs.mkdirSync(out, { recursive: true });

const res = await build({
  entryPoints: [path.join(root, 'src', 'main.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none',
});
// A literal "</script" inside the bundle would end the inline <script> early.
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// Hand-made replacement art (assets/custom/, listed in manifest.json) is inlined so the single file stays self-contained.
const overrides = {};
try {
  const man = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'custom', 'manifest.json'), 'utf8'));
  for (const [file, key] of Object.entries(man)) {
    const f = path.join(root, 'assets', 'custom', file);
    if (fs.existsSync(f)) overrides[key] = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  }
} catch (_) {}
const overrideScript = Object.keys(overrides).length ? `<script>window.__ASSET_OVERRIDES=${JSON.stringify(overrides)};</script>\n` : '';
const font = fs.readFileSync(path.join(root, 'assets', 'fonts', 'fredoka-latin.woff2')).toString('base64');
const icon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%232f57b8'/><path d='M32 10l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 43.2 19 50l2.5-14.5L11 25.3l14.5-2.1z' fill='%23f6cf3e' stroke='%23fff' stroke-width='3' stroke-linejoin='round'/></svg>`;

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#fbf3e6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="description" content="Bintang Kecil: game puzzle krayon untuk anak prasekolah. Bantu Ibu, Ayah dan bayi Bintang.">
<title>Bintang Kecil</title>
<link rel="icon" href="data:image/svg+xml,${icon}">
<style>
  @font-face { font-family: 'Fredoka'; font-style: normal; font-weight: 300 700; font-display: block;
    src: url(data:font/woff2;base64,${font}) format('woff2'); }
  html, body { margin: 0; height: 100%; background: #fbf3e6; overflow: hidden; overscroll-behavior: none;
    touch-action: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  canvas { position: fixed; inset: 0; display: block; width: 100vw; height: 100vh; height: 100dvh; }
</style>
</head>
<body>
<canvas id="c"></canvas>
${overrideScript}<script>${js}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`dist/web/index.html  ${(html.length / 1024).toFixed(0)} KB  (${Object.keys(overrides).length} custom asset(s))`);

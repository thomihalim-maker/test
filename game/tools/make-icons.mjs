// Generates the app icons procedurally (no external assets): a cute Demak-style 3-tier tajug masjid
// with a gold mustaka on a teal -> cream sky. Renders SVG -> <canvas> in headless Chromium, writes PNGs.
// usage: node tools/make-icons.mjs        (writes into game/icons/; commit the results)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'icons');
fs.mkdirSync(outDir, { recursive: true });

const INK = '#5a3a1e';
const defs = `
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4fc3cf"/><stop offset=".45" stop-color="#9fe3d6"/><stop offset=".8" stop-color="#ffe9ad"/><stop offset="1" stop-color="#ffd99a"/>
  </linearGradient>
  <radialGradient id="halo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#fffbe8"/><stop offset=".62" stop-color="#fff6e0" stop-opacity=".95"/><stop offset="1" stop-color="#fff6e0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e9a356"/><stop offset="1" stop-color="#b9652d"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe58a"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#f3a21a"/>
  </linearGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#ffe9b8"/>
  </linearGradient>
</defs>`;

// Scene drawn in a 512x512 space. `s` scales the masjid around the centre (maskable safe zone).
function art(s = 1) {
  const g = `
  <g transform="translate(256 262) scale(${s}) translate(-256 -262)" stroke="${INK}" stroke-linejoin="round" stroke-linecap="round">
    <!-- tier 1 (widest) -->
    <path d="M78 334 L168 264 H344 L434 334 Q256 350 78 334 Z" fill="url(#roof)" stroke-width="9"/>
    <path d="M110 324 Q256 336 402 324" fill="none" stroke="#f6c27a" stroke-width="6" opacity=".9"/>
    <!-- walls -->
    <rect x="150" y="326" width="212" height="88" rx="10" fill="url(#wall)" stroke-width="9"/>
    <rect x="174" y="346" width="30" height="42" rx="15" fill="#ffd45a" stroke-width="6"/>
    <rect x="308" y="346" width="30" height="42" rx="15" fill="#ffd45a" stroke-width="6"/>
    <path d="M230 414 V372 a26 26 0 0 1 52 0 V414 Z" fill="#7a4a22" stroke-width="7"/>
    <rect x="124" y="404" width="264" height="24" rx="10" fill="#f0c874" stroke-width="9"/>
    <!-- clerestory 1 + tier 2 -->
    <rect x="190" y="232" width="132" height="36" rx="5" fill="url(#wall)" stroke-width="8"/>
    <path d="M214 240 v20 M238 240 v20 M262 240 v20 M286 240 v20 M298 240 v20" stroke="#c9a468" stroke-width="5" opacity=".8"/>
    <path d="M140 250 L206 198 H306 L372 250 Q256 262 140 250 Z" fill="url(#roof)" stroke-width="9"/>
    <path d="M168 242 Q256 250 344 242" fill="none" stroke="#f6c27a" stroke-width="5" opacity=".9"/>
    <!-- clerestory 2 + tier 3 -->
    <rect x="220" y="172" width="72" height="30" rx="4" fill="url(#wall)" stroke-width="7"/>
    <path d="M190 186 L256 120 L322 186 Q256 194 190 186 Z" fill="url(#roof)" stroke-width="9"/>
    <path d="M232 150 L256 128" stroke="#f6c27a" stroke-width="5" fill="none" opacity=".9"/>
    <!-- mustaka (gold crown finial) -->
    <g stroke="#a85c0a" stroke-width="6" fill="url(#gold)">
      <path d="M232 126 Q256 102 280 126 Z"/>
      <rect x="249" y="92" width="14" height="22" rx="4"/>
      <circle cx="256" cy="86" r="15"/>
      <path d="M256 44 C268 58 270 68 256 76 C242 68 244 58 256 44 Z"/>
      <path d="M241 80 C230 76 228 66 234 60 M271 80 C282 76 284 66 278 60" fill="none"/>
    </g>
    <circle cx="250" cy="82" r="4" fill="#fff6c0" stroke="none"/>
  </g>`;
  return g;
}
const backdrop = `
  <rect width="512" height="512" fill="url(#sky)"/>
  <circle cx="256" cy="236" r="190" fill="url(#halo)"/>
  <path d="M368 92 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z" fill="#fff" opacity=".95"/>
  <path d="M124 150 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z" fill="#fff" opacity=".85"/>
  <path d="M0 424 Q128 392 256 410 T512 404 V512 H0 Z" fill="#8fdc6a"/>
  <path d="M0 456 Q150 430 300 452 T512 446 V512 H0 Z" fill="#5cb84a"/>`;

const svg = ({ size = 512, rounded = true, scale = 1 }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${defs}
  ${rounded ? '<clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath><g clip-path="url(#r)">' : '<g>'}${backdrop}${art(scale)}</g></svg>`;

const targets = [
  ['icon-192.png', 192, { rounded: true }],
  ['icon-512.png', 512, { rounded: true }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 0.8 }],   // content kept inside the 80% safe circle
  ['icon-maskable-192.png', 192, { rounded: false, scale: 0.8 }],
  ['apple-touch-icon.png', 180, { rounded: false, scale: 0.92 }],   // iOS masks corners itself; no transparency
  ['favicon-32.png', 32, { rounded: true }],
];

const b = await chromium.launch();
const pg = await b.newPage();
await pg.setContent('<!doctype html><body></body>');
for (const [name, size, o] of targets) {
  const dataUrl = await pg.evaluate(async ({ s, size }) => {
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
  }, { s: svg({ size: Math.max(size, 512), ...o }), size });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote icons/' + name, size + 'px');
}
fs.writeFileSync(path.join(outDir, 'icon.svg'), svg({ size: 512, rounded: true }).replace(/\n\s*/g, ' ').replace(/<!--.*?-->/g, '') + '\n');
console.log('wrote icons/icon.svg');

// Social preview card (1200x630) with the bundled Nunito font.
const font = fs.readFileSync(path.join(root, 'src/ui/fonts/nunito-latin-900-normal.woff2')).toString('base64');
await pg.setViewportSize({ width: 1200, height: 630 });
await pg.setContent(`<!doctype html><html><head><style>
@font-face{font-family:N;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:900}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;font-family:N,sans-serif;
 background:linear-gradient(#58c9d6 0%,#9fe3d6 40%,#ffe9ad 78%,#ffc98a 100%)}
.ic{width:400px;height:400px;flex:none;filter:drop-shadow(0 18px 0 rgba(150,90,20,.25)) drop-shadow(0 26px 40px rgba(60,30,0,.25))}
h1{margin:0;font-size:104px;line-height:.95;color:#fff;text-shadow:0 8px 0 #1f8f84,0 16px 30px rgba(10,60,55,.35);letter-spacing:1px}
h1 b{display:block;color:#ffc83d;text-shadow:0 8px 0 #b86a0c,0 16px 30px rgba(80,40,0,.35)}
p{margin:30px 0 0;font-size:34px;color:#5a3a1e;line-height:1.25}
small{display:block;margin-top:10px;font-size:24px;color:#8a6038}
</style></head><body><div class="ic">${svg({ size: 400, rounded: true })}</div>
<div><h1>Marbot<b>Masjid</b></h1><p>Rawat hewan kurban &amp;<br>bangun masjid desa!</p><small>A cozy village masjid game for kids</small></div></body></html>`);
await pg.evaluate(() => document.fonts.ready);
await pg.screenshot({ path: path.join(outDir, 'og-image.png') });
console.log('wrote icons/og-image.png 1200x630');
await b.close();

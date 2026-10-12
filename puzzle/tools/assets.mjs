// Manual asset workflow (see ASSETS.md).
//   node tools/assets.mjs export   → renders every scene and saves each replaceable sprite as a PNG in
//                                    assets/export/ (+ catalog.json and a browsable index.html)
//   node tools/assets.mjs sync     → scans assets/custom/*.png and writes assets/custom/manifest.json
//                                    (file name → sprite key), which the game loads at start-up
//   node tools/assets.mjs list     → prints which custom files are active / unknown
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT = path.join(root, 'assets', 'export');
const CUSTOM = path.join(root, 'assets', 'custom');
const fileFor = key => key.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') + '.png';
const cmd = process.argv[2] || 'help';
const RATIO = (() => { const i = process.argv.indexOf('--ratio'); return i > 0 ? Number(process.argv[i + 1]) : 2; })();

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0);
  return server;
}

async function exportAll() {
  fs.mkdirSync(EXPORT, { recursive: true });
  const server = serve(), port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  // ratio=2 → sprites rendered at 2 px per design unit (good editing resolution). noassets: export the ORIGINAL art.
  await page.goto(`http://localhost:${port}/index.html?ratio=${RATIO}&unlock&mute&speed=4&noassets`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const scenes = { menu: 'menu', level1: 'level1', level2: 'level2', level3: 'level3', finale: 'finale' };
  const seen = new Map();
  const grab = async (scene) => {
    const items = await page.evaluate(async () => {
      const { spriteRegistry } = await import('./src/engine/raster.js');
      const out = [];
      for (const [key, sp] of spriteRegistry) {
        try { out.push({ key, w: sp.w, h: sp.h, data: sp.img.toDataURL('image/png') }); } catch (_) {}
      }
      return out;
    });
    for (const it of items) {
      if (!seen.has(it.key)) seen.set(it.key, { ...it, scenes: new Set() });
      seen.get(it.key).scenes.add(scene);
    }
  };
  for (const [name, scene] of Object.entries(scenes)) {
    await page.evaluate(s => window.__game.go(s), scene);
    await page.waitForTimeout(5000);
    await grab(name);
    // play the level to its end so finale-only art (sleep scene, celebrations, win screen) gets generated too
    if (name.startsWith('level')) {
      await page.evaluate(() => window.__game.scene.debugSolve?.(Infinity));
      await page.waitForTimeout(9000);
      await grab(name);
    }
  }
  await browser.close(); server.close();

  const catalog = {};
  for (const e of fs.readdirSync(EXPORT)) if (e.endsWith('.png')) fs.rmSync(path.join(EXPORT, e));
  for (const [key, it] of [...seen].sort((a, b) => a[0].localeCompare(b[0]))) {
    const file = fileFor(key);
    fs.writeFileSync(path.join(EXPORT, file), Buffer.from(it.data.split(',')[1], 'base64'));
    catalog[file] = { key, w: it.w, h: it.h, scenes: [...it.scenes] };
  }
  fs.writeFileSync(path.join(EXPORT, 'catalog.json'), JSON.stringify(catalog, null, 2));
  const cards = Object.entries(catalog).map(([f, c]) =>
    `<figure><div class="im"><img src="${f}" loading="lazy" alt=""></div><figcaption><b>${f}</b><span>${c.w}×${c.h} · ${c.scenes.join(', ')}</span></figcaption></figure>`).join('\n');
  fs.writeFileSync(path.join(EXPORT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Bintang Kecil — aset</title>
<style>body{font:14px system-ui;margin:0;padding:16px;background:#f6efe2;color:#3f3a38}h1{font-size:20px}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
figure{margin:0;background:#fff;border-radius:10px;padding:8px;box-shadow:0 1px 3px #0002}
.im{height:150px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0/16px 16px;border-radius:6px}
img{max-width:100%;max-height:150px}figcaption{margin-top:6px;word-break:break-all}figcaption span{display:block;color:#888;font-size:12px}</style>
<h1>Aset yang bisa diganti (${Object.keys(catalog).length})</h1>
<p>Salin file yang ingin diubah ke <code>assets/custom/</code> dengan NAMA YANG SAMA, edit, lalu jalankan <code>node tools/assets.mjs sync</code>. Ukuran (w×h) = proporsi gambar; resolusi bebas.</p>
<main>${cards}</main>`);
  console.log(`exported ${Object.keys(catalog).length} sprites → assets/export/ (open assets/export/index.html)`);
}

function sync({ quiet = false } = {}) {
  fs.mkdirSync(CUSTOM, { recursive: true });
  let catalog = {};
  try { catalog = JSON.parse(fs.readFileSync(path.join(EXPORT, 'catalog.json'), 'utf8')); } catch (_) {}
  const manifest = {}, unknown = [];
  for (const f of fs.readdirSync(CUSTOM).sort()) {
    if (!f.toLowerCase().endsWith('.png')) continue;
    if (catalog[f]) manifest[f] = catalog[f].key;
    else unknown.push(f);
  }
  fs.writeFileSync(path.join(CUSTOM, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!quiet) {
    console.log(`${Object.keys(manifest).length} custom asset(s) active:`);
    for (const [f, k] of Object.entries(manifest)) console.log(`  ✓ ${f}  →  ${k}`);
    if (unknown.length) {
      console.log(`\n${unknown.length} file(s) NOT recognised (name must match a file in assets/export/; run "export" first if empty):`);
      for (const f of unknown) console.log(`  ✗ ${f}`);
    }
  }
  return manifest;
}

if (cmd === 'export') await exportAll();
else if (cmd === 'sync') sync();
else if (cmd === 'list') sync();
else console.log('usage: node tools/assets.mjs export | sync | list   (see ASSETS.md)');
export { sync };

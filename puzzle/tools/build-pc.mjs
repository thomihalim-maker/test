// PC build: wraps dist/web/index.html in Electron and packages Windows x64 + Linux x64 apps, zipped into dist/.
// Run after tools/build-web.mjs (npm run build:pc does both). Usage: node tools/build-pc.mjs [win32|linux ...]
import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const web = path.join(dist, 'web', 'index.html');
if (!fs.existsSync(web)) throw new Error('Run tools/build-web.mjs first');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// Staging folder = the Electron app's contents.
const stage = path.join(dist, 'pc-app');
fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(stage, { recursive: true });
fs.copyFileSync(web, path.join(stage, 'index.html'));
fs.copyFileSync(path.join(root, 'pc', 'main.cjs'), path.join(stage, 'main.cjs'));
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
  name: 'bintang-kecil', productName: 'Bintang Kecil', version: pkg.version, main: 'main.cjs', description: pkg.description,
}, null, 2));

// Window icon (PNG) rendered from the same star icon as the web favicon.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><rect width="64" height="64" rx="14" fill="#2f57b8"/><path d="M32 10l6.5 13.2 14.5 2.1-10.5 10.2 2.5 14.5L32 43.2 19 50l2.5-14.5L11 25.3l14.5-2.1z" fill="#f6cf3e" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page.screenshot({ path: path.join(stage, 'icon.png'), omitBackground: true });
await browser.close();

const platforms = process.argv.slice(2).length ? process.argv.slice(2) : ['win32', 'linux'];
for (const platform of platforms) {
  const [appDir] = await packager({
    dir: stage, out: path.join(dist, 'pc'), overwrite: true, platform, arch: 'x64',
    name: 'Bintang Kecil', executableName: 'BintangKecil', appVersion: pkg.version, asar: true,
    appCopyright: 'Bintang Kecil', quiet: true,
  });
  const label = { win32: 'windows', linux: 'linux', darwin: 'mac' }[platform] || platform;
  const zip = path.join(dist, `BintangKecil-${label}-x64.zip`);
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-qry', zip, path.basename(appDir)], { cwd: path.dirname(appDir) });
  console.log(`${path.relative(root, zip)}  ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`);
}

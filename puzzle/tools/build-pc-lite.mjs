// Lightweight PC build (Neutralino): a ~3 MB native window that uses the OS web view
// (WebView2 on Windows 10/11, WKWebView on macOS, WebKitGTK on Linux) to run dist/web/index.html.
// Much smaller than the Electron build (tools/build-pc.mjs). Run after tools/build-web.mjs.
// Output: dist/BintangKecil-lite-{windows,linux,mac}.zip. Usage: node tools/build-pc-lite.mjs
import { createPackage } from '@electron/asar';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEU_VERSION = 'v5.4.0';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const web = path.join(dist, 'web', 'index.html');
if (!fs.existsSync(web)) throw new Error('Run tools/build-web.mjs first');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// Neutralino runtime binaries (cached under dist/.cache).
const cache = path.join(dist, '.cache', `neutralino-${NEU_VERSION}`);
if (!fs.existsSync(path.join(cache, 'neutralino-win_x64.exe'))) {
  fs.mkdirSync(cache, { recursive: true });
  const url = `https://github.com/neutralinojs/neutralinojs/releases/download/${NEU_VERSION}/neutralinojs-${NEU_VERSION}.zip`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  const zip = path.join(cache, 'neu.zip');
  fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-o', '-q', zip, '-d', cache]);
}

// resources.neu = asar archive holding the config + the web build.
const stage = path.join(dist, 'pc-lite-stage');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, 'resources'), { recursive: true });
fs.copyFileSync(web, path.join(stage, 'resources', 'index.html'));
const iconSrc = path.join(dist, 'pc-app', 'icon.png');
if (fs.existsSync(iconSrc)) fs.copyFileSync(iconSrc, path.join(stage, 'resources', 'icon.png'));
const config = {
  applicationId: 'id.bintangkecil.game', version: pkg.version, defaultMode: 'window',
  documentRoot: '/resources/', url: '/', enableServer: true, enableNativeAPI: false,
  tokenSecurity: 'one-time', logging: { enabled: false },
  modes: { window: {
    title: 'Bintang Kecil', width: 1280, height: 720, minWidth: 800, minHeight: 450, center: true,
    icon: '/resources/icon.png', enableInspector: false, resizable: true, exitProcessOnClose: true,
  } },
};
fs.writeFileSync(path.join(stage, 'neutralino.config.json'), JSON.stringify(config, null, 2));
const neu = path.join(dist, 'resources.neu');
await createPackage(stage, neu);

const targets = [
  ['windows', 'neutralino-win_x64.exe', 'BintangKecil.exe'],
  ['linux', 'neutralino-linux_x64', 'BintangKecil'],
  ['mac', 'neutralino-mac_universal', 'BintangKecil'],
];
for (const [label, bin, exe] of targets) {
  const dir = path.join(dist, 'pc-lite', `BintangKecil-${label}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(cache, bin), path.join(dir, exe));
  fs.chmodSync(path.join(dir, exe), 0o755);
  fs.copyFileSync(neu, path.join(dir, 'resources.neu'));
  const zip = path.join(dist, `BintangKecil-lite-${label}.zip`);
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-qry', zip, path.basename(dir)], { cwd: path.dirname(dir) });
  console.log(`${path.relative(root, zip)}  ${(fs.statSync(zip).size / 1048576).toFixed(1)} MB`);
}

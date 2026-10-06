// Production build -> game/dist (static, relative URLs, works under any sub-path, offline via sw.js).
// usage: node tools/build.mjs            env: SITE_URL=https://user.github.io/repo/ (absolute og:image/og:url, optional)
//                                             MARBOT_VERSION=1.2.3 (override the version label, optional)
// No dependencies: node built-ins only. Sources stay readable (no minification).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { parseImports, readImportMap, resolveSpec, readOrderList, expandTemplate, PLAYER_PARAMS, readUrlParams, readDebugParams, writeDebugParams } from './modgraph.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const t0 = Date.now();
const fail = (msg) => { console.error('build failed: ' + msg); process.exit(1); };

// ---- version ----
const pkg = JSON.parse(read('package.json'));
let sha = '';
try { sha = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
if (!sha && process.env.GITHUB_SHA) sha = process.env.GITHUB_SHA.slice(0, 7);
const version = process.env.MARBOT_VERSION || (pkg.version || '0.0.0') + (sha ? '+' + sha : '');

// ---- collect source files ----
function walk(dir) {
  const res = [];
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const r = dir + '/' + e.name;
    if (e.isDirectory()) res.push(...walk(r)); else res.push(r);
  }
  return res;
}
// Test pages (src/masjid/test.html), scratch files (_*.*) and notes are dev-only. Of the rest, code/styles/fonts/text/data
// ship; any other file (reference images, exports ...) ships only when the game references it (new URL('x', import.meta.url)
// or a url() in a stylesheet), so art dropped into src/ for comparison is never deployed or precached.
const SRC_EXT = /\.(m?js|css|woff2?|txt|json)$/i;
const srcAll = walk('src').filter((f) => !/\.html?$/i.test(f) && !path.basename(f).startsWith('_') && !/\.md$/i.test(f));
const srcFiles = srcAll.filter((f) => SRC_EXT.test(f));
const srcOther = srcAll.filter((f) => !SRC_EXT.test(f));
const html = read('index.html');
const importMap = readImportMap(html);

// ---- module graph: which vendor files are really imported ----
const exists = (r) => fs.existsSync(path.join(root, r)) && fs.statSync(path.join(root, r)).isFile();
const vendor = new Set(); const errors = []; const edges = new Map();   // file -> [deps]
const assets = new Set();                                                 // non-module files the code references
const queue = srcFiles.filter((f) => f.endsWith('.js'));
const seen = new Set(queue);
while (queue.length) {
  const f = queue.shift(); const code = read(f); const deps = [];
  const order = readOrderList(code);
  for (const imp of parseImports(code)) {
    let specs = [imp.spec], template = imp.template;
    if (template && imp.kind === 'dynamic' && order) { specs = expandTemplate(imp.spec, order); template = false; }
    for (const spec of specs) {
      const r = resolveSpec(spec, f, importMap, template);
      if (r.error) { errors.push(`${f}: ${r.error}`); continue; }
      if (r.external) { errors.push(`${f}: external import "${spec}" (the game must work offline)`); continue; }
      if (r.pattern) { if (!srcFiles.some((s) => r.pattern.test(s)) && ![...vendor].some((s) => r.pattern.test(s))) errors.push(`${f}: nothing matches ${imp.spec}`); continue; }
      if (!exists(r.path)) {
        if (imp.kind === 'dynamic') { console.warn(`  note: ${f} dynamically imports missing ${r.path} (skipped at runtime)`); continue; }
        errors.push(`${f}: cannot resolve "${spec}" -> ${r.path}`); continue;
      }
      if (imp.kind !== 'asset') deps.push(r.path); else assets.add(r.path);
      if (r.path.startsWith('vendor/')) vendor.add(r.path);
      if (r.path.endsWith('.js') && !seen.has(r.path)) { seen.add(r.path); queue.push(r.path); }
    }
  }
  edges.set(f, deps);
}
if (errors.length) fail('\n  ' + errors.join('\n  '));
for (const f of srcFiles.filter((x) => x.endsWith('.css'))) {
  for (const m of read(f).matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    if (/^(data:|https?:|#)/.test(m[2])) continue;
    assets.add(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[2].split(/[?#]/)[0])));
  }
}
for (const f of srcOther) {
  if (assets.has(f)) srcFiles.push(f);
  else console.warn(`  note: ${f} is not shipped (only .js/.css/.woff2/.txt/.json, or files referenced via new URL(..., import.meta.url) / CSS url())`);
}

// ---- debug URL params (boot.js sandbox): everything src/ reads, except player params ----
const bootSrc = read('boot.js');
const debugStatic = readDebugParams(bootSrc);
if (!debugStatic) fail("boot.js is missing the \"var DEBUG_PARAMS = '...'.split(' '); // build:debug-params\" line");
const urlParams = new Set();
for (const f of srcFiles.filter((x) => x.endsWith('.js'))) for (const n of readUrlParams(read(f))) urlParams.add(n);
const debugNew = [...urlParams].filter((n) => !PLAYER_PARAMS.has(n) && !debugStatic.includes(n)).sort();
const debugParams = [...new Set([...debugStatic, ...debugNew])].sort();

// Modules reachable from the entry (static + main.js module list) -> <link rel="modulepreload">.
const preload = []; const stack = ['src/main.js']; const pre = new Set(stack);
while (stack.length) { const f = stack.pop(); preload.push(f); for (const d of edges.get(f) || []) if (d.endsWith('.js') && !pre.has(d)) { pre.add(d); stack.push(d); } }
preload.sort((a, b) => (a.startsWith('vendor/') ? 0 : 1) - (b.startsWith('vendor/') ? 0 : 1) || a.localeCompare(b));

// ---- write dist ----
fs.rmSync(out, { recursive: true, force: true });
const written = [];
function put(r, data) { const p = path.join(out, r); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); written.push(r); }
const copy = (r) => put(r, fs.readFileSync(path.join(root, r)));

for (const f of srcFiles) copy(f);
for (const f of [...vendor].sort()) copy(f);
for (const f of walk('icons')) copy(f);
put('boot.js', writeDebugParams(bootSrc, debugParams));
copy('manifest.webmanifest');
copy('LICENSES.txt');                 // three.js MIT text + pointer to the Nunito OFL (src/ui/fonts/OFL.txt)
copy('privacy.html');                 // privacy policy page (Play Store / Families needs a public URL)

const site = (process.env.SITE_URL || '').trim().replace(/\/?$/, '/');
let page = html.replace(/<meta name="marbot-version" content="[^"]*">/, `<meta name="marbot-version" content="${version}">`);
if (!page.includes(`content="${version}"`)) fail('index.html is missing <meta name="marbot-version">');
const links = preload.map((f) => `<link rel="modulepreload" href="${f}">`).join('\n');
page = page.includes('<!-- build:modulepreload -->') ? page.replace('<!-- build:modulepreload -->', links) : page.replace('</head>', links + '\n</head>');
if (site !== '/') {
  page = page.replace(/(<meta property="og:image" content=")([^"]+)(")/, (_, a, b, c) => a + new URL(b, site).href + c)
             .replace('<meta property="og:type"', `<link rel="canonical" href="${site}">\n<meta property="og:url" content="${site}">\n<meta property="og:type"`);
}
put('index.html', page);
put('.nojekyll', '');

// ---- service worker: full precache list + content-hashed cache name ----
// og-image.png is only for link previews (social scrapers fetch it online), so it is not precached. version.json is
// written after this list on purpose: sw.js always fetches it from the network (it reports what is live right now).
const precache = ['./', ...written.filter((f) => f !== '.nojekyll' && f !== 'icons/og-image.png').sort()];
const sw = read('sw.js');
const hash = crypto.createHash('sha256');
hash.update('sw.js\0' + sw);          // a service-worker-only change still gets a fresh cache name
for (const f of [...written].sort()) { hash.update(f + '\0'); hash.update(fs.readFileSync(path.join(out, f))); }
const buildId = hash.digest('hex').slice(0, 10);
// sw.js appends '|<scope path>' at runtime (one origin can host several copies of the game).
const cacheName = `marbot-${version.replace(/[^\w.-]+/g, '-')}-${buildId}`;
const swOut = sw.replace(/^const BUILD = .*;$/m, `const BUILD = ${JSON.stringify({ version, cache: cacheName, files: precache })};`);
if (swOut === sw) fail('sw.js is missing the "const BUILD = ...;" line');
put('sw.js', swOut);
put('version.json', JSON.stringify({ name: pkg.name, version, build: buildId, cache: cacheName, date: new Date().toISOString() }, null, 2) + '\n');

// ---- summary ----
const size = (f) => fs.statSync(path.join(out, f)).size;
const kb = (n) => (n / 1024).toFixed(1).padStart(8) + ' KB';
const groups = {};
for (const f of written) { const g = f.startsWith('vendor/') ? 'vendor (three.js)' : f.startsWith('src/ui/fonts/') ? 'fonts' : f.startsWith('src/') ? 'src' : f.startsWith('icons/') ? 'icons' : 'root'; (groups[g] ??= { n: 0, b: 0 }).n++; groups[g].b += size(f); }
const total = written.reduce((a, f) => a + size(f), 0);
const vendorAll = walk('vendor').reduce((a, f) => a + fs.statSync(path.join(root, f)).size, 0);
console.log(`\nMarbot Masjid ${version}  (cache ${cacheName})`);
console.log(`dist/ -> ${written.length} files, ${(total / 1048576).toFixed(2)} MB  [${Date.now() - t0} ms]`);
for (const [g, v] of Object.entries(groups).sort((a, b) => b[1].b - a[1].b)) console.log(`  ${g.padEnd(18)} ${String(v.n).padStart(4)} files ${kb(v.b)}`);
console.log(`  three.js files kept: ${vendor.size} of ${walk('vendor').length} (${(vendorAll / 1048576).toFixed(1)} MB in vendor/ -> ${(groups['vendor (three.js)'].b / 1048576).toFixed(2)} MB)`);
for (const f of [...vendor].sort()) console.log('    ' + f);
console.log(`  precache: ${precache.length} entries; modulepreload: ${preload.length} modules`);
console.log(`  debug URL params (no-save sandbox): ${debugParams.length}` + (debugNew.length ? `, new since boot.js: ${debugNew.join(', ')} (add them to DEBUG_PARAMS in boot.js for the source page)` : ''));
if (site !== '/') console.log(`  SITE_URL: ${site}`);

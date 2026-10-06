// Static check of a build (no browser): every module import, import-map target, page/manifest/precache
// reference must resolve to a file inside dist/, with relative URLs only (sub-path hosting) and no network.
// usage: node tools/verify-dist.mjs [dir=dist]      exit code 1 on any problem
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { spawnSync } from 'node:child_process';
import { parseImports, readImportMap, resolveSpec, readOrderList, expandTemplate, PLAYER_PARAMS, readUrlParams, readDebugParams } from './modgraph.mjs';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(game, process.argv[2] || 'dist');
const errors = []; const err = (m) => errors.push(m);
const has = (r) => { const p = path.join(dist, r); return fs.existsSync(p) && fs.statSync(p).isFile(); };
const read = (r) => fs.readFileSync(path.join(dist, r), 'utf8');
function walk(dir = '') {
  const res = [];
  for (const e of fs.readdirSync(path.join(dist, dir), { withFileTypes: true })) {
    const r = dir ? dir + '/' + e.name : e.name;
    if (e.isDirectory()) res.push(...walk(r)); else res.push(r);
  }
  return res;
}
if (!has('index.html')) { console.error(`verify: ${dist}/index.html not found (run node tools/build.mjs)`); process.exit(1); }
const files = walk();
const html = read('index.html');
const importMap = readImportMap(html);

// 1. import map targets
for (const [k, v] of Object.entries(importMap.imports || {})) {
  if (/^(https?:)?\/\//.test(v) || v.startsWith('/')) err(`import map "${k}" -> "${v}" must be a relative local path`);
  else if (k.endsWith('/')) { const d = path.posix.normalize(v); if (!files.some((f) => f.startsWith(d))) err(`import map prefix "${k}" -> "${v}" has no files`); }
  else if (!has(path.posix.normalize(v))) err(`import map "${k}" -> "${v}" missing`);
}

// 2. every JS module's imports
let checked = 0;
for (const f of files.filter((x) => /\.m?js$/.test(x) && x !== 'sw.js' && x !== 'boot.js')) {
  const code = read(f); const order = readOrderList(code);
  for (const imp of parseImports(code)) {
    let specs = [imp.spec], template = imp.template;
    if (template && imp.kind === 'dynamic' && order) { specs = expandTemplate(imp.spec, order); template = false; }
    for (const spec of specs) {
      checked++;
      const r = resolveSpec(spec, f, importMap, template);
      if (r.error) err(`${f}: ${r.error}`);
      else if (r.external) err(`${f}: network import "${spec}" (game must run offline)`);
      else if (r.pattern) { if (!files.some((x) => r.pattern.test(x))) err(`${f}: nothing in dist matches ${imp.spec}`); }
      else if (!has(r.path)) err(`${f}: "${spec}" -> ${r.path} not in dist`);
    }
  }
}

// 2b. syntax: modules parse as ES modules, boot.js / sw.js as classic scripts
for (const f of files.filter((x) => /\.m?js$/.test(x))) {
  const type = f === 'sw.js' || f === 'boot.js' ? 'commonjs' : 'module';
  const r = spawnSync(process.execPath, ['--input-type=' + type, '--check'], { input: fs.readFileSync(path.join(dist, f)), encoding: 'utf8' });
  if (r.status !== 0) err(`${f}: syntax error\n      ${(r.stderr || '').split('\n').filter((l) => /Error|\^/.test(l)).slice(0, 2).join('\n      ')}`);
}

// 3. page references (href/src, CSS url()) in every page — relative and present
for (const page of files.filter((x) => /\.html$/.test(x))) {
  for (const m of read(page).matchAll(/\b(?:href|src)=["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const u = m[1] || m[2];
    if (/^(https?:|data:|#|mailto:)/.test(u)) continue;
    if (u.startsWith('/')) { err(`${page}: absolute URL "${u}" breaks sub-path hosting`); continue; }
    let target = path.posix.normalize(path.posix.join(path.posix.dirname(page), u.split(/[?#]/)[0]));
    if (u.split(/[?#]/)[0].endsWith('/') || target === '.') target = path.posix.join(target, 'index.html');
    if (!has(target)) err(`${page}: "${u}" not in dist`);
  }
}
const bootJs = has('boot.js') ? read('boot.js') : (err('boot.js missing'), '');
for (const m of bootJs.matchAll(/new URL\('([^']+)', doc\.baseURI\)/g)) if (!m[1].endsWith('/') && !has(m[1])) err(`boot.js loads "${m[1]}" which is not in dist`);
// 3b. debug sandbox list covers every URL param the shipped code reads (shared links with other params must still save)
const debugList = readDebugParams(bootJs);
if (!debugList) err('boot.js: DEBUG_PARAMS line not found');
else for (const f of files.filter((x) => x.startsWith('src/') && x.endsWith('.js'))) for (const n of readUrlParams(read(f))) if (!PLAYER_PARAMS.has(n) && !debugList.includes(n)) err(`${f} reads ?${n}, which boot.js does not treat as a debug param (rebuild)`);
for (const f of ['LICENSES.txt', 'privacy.html', 'src/ui/fonts/OFL.txt']) if (!has(f)) err(`${f} missing (license / privacy paperwork)`);
if (!/<meta name="marbot-version" content="(?!dev")[^"]+">/.test(html)) err('index.html: version meta not injected');

// 4. manifest
try {
  const man = JSON.parse(read('manifest.webmanifest'));
  if (man.start_url !== './' || man.scope !== './') err('manifest: start_url/scope must be "./"');
  for (const ic of man.icons || []) if (!has(ic.src)) err(`manifest icon missing: ${ic.src}`);
  if (!(man.icons || []).some((i) => /maskable/.test(i.purpose || ''))) err('manifest: no maskable icon');
} catch (e) { err('manifest.webmanifest unreadable: ' + e.message); }

// 5. service worker precache list
let pre = [];
try {
  const m = read('sw.js').match(/^const BUILD = (.*);$/m);
  const b = JSON.parse(m[1]); pre = b.files;
  if (b.version === 'dev' || !b.files.length) err('sw.js: build info not injected');
  for (const f of b.files) if (f !== './' && !has(f)) err(`sw.js precaches missing file: ${f}`);
  for (const f of files) if (/\.(m?js|css|woff2|html|webmanifest)$/.test(f) && f !== 'sw.js' && !b.files.includes(f)) err(`sw.js does not precache ${f} (offline would break)`);
} catch (e) { err('sw.js: cannot read BUILD line: ' + e.message); }

if (errors.length) { console.error(`verify: ${errors.length} problem(s) in ${path.relative(process.cwd(), dist) || dist}`); for (const e of errors) console.error('  - ' + e); process.exit(1); }
console.log(`verify: OK  (${files.length} files, ${checked} imports resolved, ${pre.length} precache entries)`);

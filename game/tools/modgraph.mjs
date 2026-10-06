// Tiny static ES-module graph helpers shared by tools/build.mjs and tools/verify-dist.mjs (node built-ins only).
// Paths are POSIX, relative to the page root (the folder holding index.html).
import path from 'node:path';

const P = path.posix;

// import x from '...', import '...', export {..} from '...', export * from '...'
const STATIC_RE = /(?:^|[;}\n\r])\s*(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?(['"])([^'"\n\r]+)\1/g;
const DYNAMIC_RE = /\bimport\s*\(\s*(['"`])((?:(?!\1)[^\n\r])*)\1\s*[,)]/g;
const ASSET_RE = /\bnew\s+URL\s*\(\s*(['"`])((?:(?!\1)[^\n\r])*)\1\s*,\s*import\.meta\.url\s*\)/g;

/** Returns [{kind:'static'|'dynamic'|'asset', spec, template:boolean}] */
export function parseImports(code) {
  const out = [];
  for (const m of code.matchAll(STATIC_RE)) out.push({ kind: 'static', spec: m[2], template: false });
  for (const m of code.matchAll(DYNAMIC_RE)) out.push({ kind: 'dynamic', spec: m[2], template: m[1] === '`' && m[2].includes('${') });
  for (const m of code.matchAll(ASSET_RE)) out.push({ kind: 'asset', spec: m[2], template: m[1] === '`' && m[2].includes('${') });
  return out;
}

/** {imports:{...}} from the first <script type="importmap"> in an HTML string. */
export function readImportMap(html) {
  const m = html.match(/<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return { imports: {} };
  return JSON.parse(m[1]);
}

const SENTINEL = '\u0000';

/**
 * Resolve a specifier imported by `from` (root-relative file path).
 * Returns {path} | {external:true} | {error:string} | {pattern:RegExp} (for template literals).
 */
export function resolveSpec(spec, from, importMap, template = false) {
  let s = template ? spec.replace(/\$\{[^}]*\}/g, SENTINEL) : spec;
  if (/^(https?:|data:|blob:)/.test(s)) return { external: true };
  if (s.startsWith('/')) return { error: `absolute path "${spec}" breaks sub-path hosting (use a relative path)` };
  let target;
  if (s.startsWith('./') || s.startsWith('../')) {
    target = P.normalize(P.join(P.dirname(from), s));
  } else {
    const map = importMap.imports || {};
    if (map[s] != null) target = map[s];
    else {
      const key = Object.keys(map).filter((k) => k.endsWith('/') && s.startsWith(k)).sort((a, b) => b.length - a.length)[0];
      if (key == null) return { error: `bare specifier "${spec}" is not in the import map` };
      target = map[key] + s.slice(key.length);
    }
    if (/^(https?:|data:)/.test(target)) return { external: true };
    if (target.startsWith('/')) return { error: `import map target "${target}" is absolute (breaks sub-path hosting)` };
    target = P.normalize(target);
  }
  if (target.startsWith('../')) return { error: `"${spec}" escapes the page root` };
  if (!template) return { path: target };
  const esc = target.split(SENTINEL).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)');
  return { pattern: new RegExp('^' + esc + '$') };
}

/** Names from `const order = ['a/b', ...]` (main.js module list), used to expand `./${name}.js`. */
export function readOrderList(code) {
  const m = code.match(/const\s+order\s*=\s*\[([^\]]*)\]/);
  if (!m) return null;
  return [...m[1].matchAll(/(['"])([^'"]+)\1/g)].map((x) => x[2]);
}

/** Expand a template dynamic import using an order list (e.g. `./${name}.js`). */
export function expandTemplate(spec, names) {
  return names.map((n) => spec.replace(/\$\{[^}]*\}/, n));
}

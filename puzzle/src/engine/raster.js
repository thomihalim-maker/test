// SVG -> crisp bitmap at the current device resolution. Art is authored as SVG strings
// (with the crayon filters from art/style.js) and rasterized once, then drawn on the canvas.
//
// Manual asset overrides: every sprite created with a cache `key` (svgSprite, canvasSprite, makeSprite)
// can be replaced by a hand-made PNG. Put `<fileFor(key)>` into assets/custom/ and list it in
// assets/custom/manifest.json (tools/assets.mjs does both). See ASSETS.md.
import { game } from './game.js';

const cache = new Map();

// ---------------------------------------------------------------- overrides
/** key -> HTMLImageElement of a user-supplied replacement. Filled by loadOverrides() before the first scene. */
export const overrides = new Map();
/** key -> {w, h, img} of every keyed sprite the game generated (used by tools/assets.mjs export). */
export const spriteRegistry = new Map();
/** Safe file name for a sprite key. */
export const fileFor = key => key.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') + '.png';

function loadImage(src) {
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

/**
 * Load replacements. Sources, in order:
 *  1. window.__ASSET_OVERRIDES = { key: dataURL }  (inlined by tools/build-web.mjs)
 *  2. assets/custom/manifest.json = { "file.png": "key", ... }  (source / dev version)
 * Never throws; missing files are skipped.
 */
export async function loadOverrides() {
  try {
    if (new URLSearchParams(location.search).has('noassets')) return; // export tool: original art only
    const jobs = [];
    const inline = window.__ASSET_OVERRIDES;
    if (inline && typeof inline === 'object') {
      for (const [key, src] of Object.entries(inline)) jobs.push(loadImage(src).then(im => im && overrides.set(key, im)));
    } else if (location.protocol !== 'file:') {
      const r = await fetch('assets/custom/manifest.json', { cache: 'no-store' }).catch(() => null);
      const m = r && r.ok ? await r.json().catch(() => ({})) : {};
      for (const [file, key] of Object.entries(m)) if (file && key && !file.startsWith('_'))
        jobs.push(loadImage('assets/custom/' + file + '?v=' + Date.now()).then(im => im && overrides.set(key, im)));
    }
    await Promise.all(jobs);
    if (overrides.size) console.info(`[assets] ${overrides.size} custom asset(s) loaded`);
  } catch (_) { /* overrides are optional */ }
}

/** If `key` has a replacement, return it as a sprite of w×h design units (scaled to fit exactly). */
export function overrideSprite(key, w, h, ratio = game.pxRatio) {
  const im = key && overrides.get(key);
  if (!im) return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * ratio)); c.height = Math.max(1, Math.ceil(h * ratio));
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(im, 0, 0, c.width, c.height);
  return { img: c, w, h, custom: true };
}
/** Record a generated sprite so it can be exported. */
export function registerSprite(key, sp) { if (key && sp && !sp.custom) spriteRegistry.set(key, sp); }

// ---------------------------------------------------------------- sprite makers
/**
 * Rasterize an SVG string. `w`,`h` are design units (the SVG must use viewBox="0 0 w h").
 * Returns a Promise of a sprite {img, w, h} usable with node.setImage(sprite).
 * Pass a stable `key` to cache across scenes (and to make it replaceable).
 */
export function svgSprite(svg, w, h, key) {
  const ratio = game.pxRatio;
  const ck = key ? key + '@' + ratio.toFixed(3) : null;
  if (ck && cache.has(ck)) return cache.get(ck);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * ratio)); c.height = Math.max(1, Math.ceil(h * ratio));
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const sp = { img: c, w, h };
      registerSprite(key, sp);
      resolve(overrideSprite(key, w, h, ratio) || sp);
    };
    img.onerror = e => { URL.revokeObjectURL(url); console.error('SVG raster failed', key, e); reject(new Error('svg raster failed: ' + key)); };
    img.src = url;
  });
  if (ck) cache.set(ck, p);
  return p;
}

/** Draw into an offscreen canvas with a 2D context in design units. fn(ctx, w, h). Returns sprite.
 *  Pass a `key` to make it replaceable by a custom PNG. */
export function canvasSprite(w, h, fn, key) {
  const ratio = game.pxRatio;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * ratio)); c.height = Math.max(1, Math.ceil(h * ratio));
  const x = c.getContext('2d');
  x.scale(ratio, ratio);
  fn(x, w, h);
  const sp = { img: c, w, h };
  registerSprite(key, sp);
  return overrideSprite(key, w, h, ratio) || sp;
}

export function clearRasterCache() { cache.clear(); }

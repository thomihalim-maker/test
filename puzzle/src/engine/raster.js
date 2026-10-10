// SVG -> crisp bitmap at the current device resolution. Art is authored as SVG strings
// (with the crayon filters from art/style.js) and rasterized once, then drawn on the canvas.
import { game } from './game.js';

const cache = new Map();

/**
 * Rasterize an SVG string. `w`,`h` are design units (the SVG must use viewBox="0 0 w h").
 * Returns a Promise of a sprite {img, w, h} usable with node.setImage(sprite).
 * Pass a stable `key` to cache across scenes.
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
      resolve({ img: c, w, h });
    };
    img.onerror = e => { URL.revokeObjectURL(url); console.error('SVG raster failed', key, e); reject(new Error('svg raster failed: ' + key)); };
    img.src = url;
  });
  if (ck) cache.set(ck, p);
  return p;
}

/** Draw into an offscreen canvas with a 2D context in design units. fn(ctx, w, h). Returns sprite. */
export function canvasSprite(w, h, fn) {
  const ratio = game.pxRatio;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * ratio)); c.height = Math.max(1, Math.ceil(h * ratio));
  const x = c.getContext('2d');
  x.scale(ratio, ratio);
  fn(x, w, h);
  return { img: c, w, h };
}

export function clearRasterCache() { cache.clear(); }

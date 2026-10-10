// Crayon kit + shared backdrops (owned by the UI builder). Procedural canvas drawing that matches the
// reference: grainy pastel crayon fills (paper tooth shows through, diagonal hatching), wobbly soft-grey
// pencil outlines, cream paper. Everything here rasterizes once at load time.
//
// Kit:   makeSprite(w, h, fn(ctx,w,h), {ratio, key}) -> sprite {img,w,h}   (cached by key)
//        crayonFill(ctx, pts, color, {grain, hatch, seed, shade, light})   pencil(ctx, pts, {w, color, closed, seed})
//        crayonShape(ctx, pts, color, opts)  (fill + pencil)              crayonText(text, size, color, opts) -> sprite
//        shapes: ellipsePts, circlePts, roundRectPts, starPts, heartPts, wobble(pts, seed, amp)
//        shade(hex, amt) (amt<0 darker, >0 lighter), grainPattern(), paperTile()
// Scenes: nightSky(w,h,opts) sprite, hills sprite, cloudSprite, moonSprite, starSprite, Starfield node, Fireflies node
import { game } from '../engine/game.js';
import { Node } from '../engine/node.js';
import { rng } from '../engine/tween.js';
import { PAL } from './style.js';

export const FONT = 'Fredoka, "Baloo 2", "Comic Sans MS", system-ui, sans-serif';

// ---------------------------------------------------------------- colour
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; } else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// ---------------------------------------------------------------- canvases
const spriteCache = new Map();
export function makeSprite(w, h, fn, { ratio = game.pxRatio, key = null } = {}) {
  const ck = key ? key + '@' + ratio.toFixed(3) : null;
  if (ck && spriteCache.has(ck)) return spriteCache.get(ck);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * ratio)); c.height = Math.max(1, Math.ceil(h * ratio));
  const x = c.getContext('2d'); x.scale(ratio, ratio); x.lineCap = 'round'; x.lineJoin = 'round';
  fn(x, w, h);
  const sp = { img: c, w, h };
  if (ck) spriteCache.set(ck, sp);
  return sp;
}

let scratch = null;
function getScratch(W, H) {
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = 4; scratch.height = 4; }
  if (scratch.width < W || scratch.height < H) { scratch.width = Math.max(scratch.width, W); scratch.height = Math.max(scratch.height, H); }
  return scratch;
}

/** Device-pixel crayon tooth: speckled, slightly diagonal-streaked alpha noise (tileable 192px). */
let grainC = null;
export function grainCanvas() {
  if (grainC) return grainC;
  const S = 192, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), id = x.createImageData(S, S), r = rng(77);
  const v = new Float32Array(S * S); for (let i = 0; i < v.length; i++) v[i] = r();
  // streak along a shallow diagonal (crayon drag direction), wrap-around for tiling
  const o = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let X = 0; X < S; X++) {
    let s = 0; for (let k = -3; k <= 3; k++) { const xx = (X + k * 2 + S) % S, yy = (y + k + S) % S; s += v[yy * S + xx]; }
    o[y * S + X] = s / 7 * 0.65 + v[y * S + X] * 0.35;
  }
  for (let i = 0; i < o.length; i++) {
    const a = Math.max(0, Math.min(1, (o[i] - 0.5) * 4.2));
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 0; id.data[i * 4 + 3] = a * 255;
  }
  x.putImageData(id, 0, 0); grainC = c; return c;
}

// ---------------------------------------------------------------- shapes (point lists)
export function ellipsePts(cx, cy, rx, ry, n = 48, a0 = 0) { const p = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
export const circlePts = (cx, cy, r, n) => ellipsePts(cx, cy, r, r, n || Math.max(24, Math.round(r / 3)));
export function roundRectPts(x, y, w, h, r, per = 6) {
  r = Math.min(r, w / 2, h / 2); const p = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= per; i++) { const a = a0 + (i / per) * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return densify(p, 24);
}
export function starPts(cx, cy, R, r, n = 5, rot = -Math.PI / 2, round = 0) {
  const p = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : R; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return round ? roundCorners(p, round) : p;
}
export function heartPts(cx, cy, s, n = 60) {
  const p = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); p.push([cx + x * s / 17, cy + y * s / 17]); } return p;
}
/** Round polygon corners by cutting each corner into a short arc. */
export function roundCorners(pts, rad, per = 4) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const d1 = Math.hypot(a[0] - b[0], a[1] - b[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const k1 = Math.min(rad, d1 / 2) / d1, k2 = Math.min(rad, d2 / 2) / d2;
    const p1 = [b[0] + (a[0] - b[0]) * k1, b[1] + (a[1] - b[1]) * k1], p2 = [b[0] + (c[0] - b[0]) * k2, b[1] + (c[1] - b[1]) * k2];
    for (let j = 0; j <= per; j++) { const t = j / per, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
  }
  return out;
}
export function densify(pts, maxSeg = 20, closed = true) {
  const out = [], n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / maxSeg));
    for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
/** Hand-drawn wobble: smooth low-frequency jitter applied to every point. */
export function wobble(pts, seed = 1, amp = 2) {
  const r = rng(seed), n = pts.length, ph1 = r() * 6.3, ph2 = r() * 6.3, f1 = 2 + ((r() * 3) | 0), f2 = 5 + ((r() * 4) | 0);
  return pts.map(([x, y], i) => { const t = (i / n) * Math.PI * 2; return [x + (Math.sin(t * f1 + ph1) * 0.6 + Math.sin(t * f2 + ph2) * 0.4) * amp + (r() - 0.5) * amp * 0.3, y + (Math.cos(t * f1 + ph2) * 0.6 + Math.cos(t * f2 + ph1) * 0.4) * amp + (r() - 0.5) * amp * 0.3]; });
}
/** Smooth path through points (midpoint quadratic). */
export function tracePath(ctx, pts, closed = true, begin = true) {
  const n = pts.length; if (n < 2) return;
  if (begin) ctx.beginPath();
  if (!closed) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]); return;
  }
  const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  ctx.closePath();
}
function bbox(pts, pad = 8) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/** Draw `draw(layerCtx)` on a scratch layer (same transform as ctx), eat crayon tooth out of it, composite back. */
export function withLayer(ctx, box, draw, grain = 0.35) {
  const m = ctx.getTransform(), cw = ctx.canvas.width, ch = ctx.canvas.height;
  // device-space bbox (axis aligned; transforms here are scale/translate only)
  const dx0 = Math.max(0, Math.floor(m.a * box.x + m.c * box.y + m.e)), dy0 = Math.max(0, Math.floor(m.b * box.x + m.d * box.y + m.f));
  const dx1 = Math.min(cw, Math.ceil(m.a * (box.x + box.w) + m.c * (box.y + box.h) + m.e)), dy1 = Math.min(ch, Math.ceil(m.b * (box.x + box.w) + m.d * (box.y + box.h) + m.f));
  const W = dx1 - dx0, H = dy1 - dy0; if (W <= 0 || H <= 0) return;
  const s = getScratch(W, H), x = s.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H);
  x.setTransform(m.a, m.b, m.c, m.d, m.e - dx0, m.f - dy0); x.lineCap = 'round'; x.lineJoin = 'round';
  draw(x);
  if (grain > 0) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = grain;
    x.fillStyle = x.createPattern(grainCanvas(), 'repeat'); x.translate(-dx0 % 192, -dy0 % 192); x.fillRect(0, 0, W + 192, H + 192);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(s, 0, 0, W, H, dx0, dy0, W, H); ctx.restore();
}

/** Crayon fill: wobbly edge, diagonal hatching strokes of lighter/darker tone, paper tooth. */
export function crayonFill(ctx, pts, color, o = {}) {
  const seed = o.seed ?? 5, r = rng(seed), b = bbox(pts, 6);
  const wp = o.wobble === 0 ? pts : wobble(densify(pts, 14), seed, o.wobble ?? 1.6);
  withLayer(ctx, b, x => {
    tracePath(x, wp); x.fillStyle = color; x.fill();
    if (o.hatch !== false) {
      x.save(); tracePath(x, wp); x.clip();
      const len = Math.max(b.w, b.h) * 1.5, step = o.hatchStep ?? 7, ang = o.angle ?? -0.9;
      const ca = Math.cos(ang), sa = Math.sin(ang), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const dark = o.shade ?? shade(color, -0.1), light = o.light ?? shade(color, 0.22);
      for (let d = -len / 2; d < len / 2; d += step * (0.6 + r() * 0.8)) {
        x.strokeStyle = r() < 0.5 ? dark : light; x.globalAlpha = 0.18 + r() * 0.3; x.lineWidth = 2 + r() * 4;
        const px = cx - sa * d, py = cy + ca * d, l = len / 2 * (0.6 + r() * 0.4);
        x.beginPath(); x.moveTo(px - ca * l, py - sa * l); x.lineTo(px + ca * l, py + sa * l); x.stroke();
      }
      // soft shading toward the bottom-right for volume
      if (o.volume !== false) {
        const g = x.createLinearGradient(b.x, b.y, b.x + b.w * 0.4, b.y + b.h);
        g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(dark, 0.45));
        x.globalAlpha = 1; x.fillStyle = g; x.fillRect(b.x, b.y, b.w, b.h);
      }
      x.restore();
    }
  }, o.grain ?? 0.32);
  return wp;
}

/** Pencil outline: two slightly offset wobbly passes, graphite grain. */
export function pencil(ctx, pts, o = {}) {
  const w = o.w ?? 3.4, col = o.color ?? PAL.line, closed = o.closed !== false, seed = o.seed ?? 9;
  const src = o.raw ? pts : densify(pts, 12, closed);
  const b = bbox(src, w * 2 + 8);
  withLayer(ctx, b, x => {
    x.strokeStyle = col;
    for (let pass = 0; pass < (o.passes ?? 2); pass++) {
      const p = wobble(src, seed + pass * 31, (o.amp ?? 1.3) * (pass ? 1.4 : 1));
      x.globalAlpha = pass ? 0.45 : 0.9; x.lineWidth = pass ? w * 0.7 : w;
      tracePath(x, p, closed); x.stroke();
    }
  }, o.grain ?? 0.3);
}
export function crayonShape(ctx, pts, color, o = {}) {
  const wp = crayonFill(ctx, pts, color, o);
  if (o.line !== false) pencil(ctx, wp, { w: o.lw ?? 3.4, color: o.lineColor, seed: (o.seed ?? 5) + 3, raw: true });
  return wp;
}
/** Free pencil/crayon stroke along an open polyline. */
export function scribble(ctx, pts, color, w = 4, o = {}) { pencil(ctx, pts, { ...o, w, color, closed: false }); }

// ---------------------------------------------------------------- text
/**
 * Crayon lettering sprite: Fredoka filled with grainy crayon colour, a sketchy pencil outline and an optional
 * cream "sticker" halo. opts: {line, halo, haloColor, weight, hatch}
 */
export function crayonText(text, size, color, o = {}) {
  const key = o.key ?? `txt|${text}|${size}|${color}|${o.halo ?? 1}|${o.line ?? PAL.lineDark}`;
  const weight = o.weight ?? 700, font = `${weight} ${size}px ${FONT}`;
  const mc = document.createElement('canvas').getContext('2d'); mc.font = font;
  const tw = Math.ceil(mc.measureText(text).width), pad = Math.ceil(size * 0.22);
  const w = tw + pad * 2, h = Math.ceil(size * 1.32) + pad;
  return makeSprite(w, h, (x) => {
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    const cx = w / 2, cy = h / 2 + size * 0.04;
    if (o.halo !== 0) { x.strokeStyle = o.haloColor ?? '#fffaf0'; x.lineWidth = size * 0.2 * (o.halo ?? 1); x.lineJoin = 'round'; x.strokeText(text, cx, cy); }
    withLayer(x, { x: 0, y: 0, w, h }, l => {
      l.font = font; l.textAlign = 'center'; l.textBaseline = 'middle'; l.fillStyle = color; l.fillText(text, cx, cy);
      l.globalCompositeOperation = 'source-atop'; const r = rng(text.length * 7 + size);
      for (let d = -h; d < w; d += 5 + r() * 5) { l.strokeStyle = r() < 0.5 ? shade(color, -0.14) : shade(color, 0.3); l.globalAlpha = 0.25 + r() * 0.3; l.lineWidth = 2 + r() * 3; l.beginPath(); l.moveTo(d, h); l.lineTo(d + h * 0.8, 0); l.stroke(); }
      const g = l.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      l.globalAlpha = 1; l.fillStyle = g; l.fillRect(0, 0, w, h);
    }, 0.28);
    withLayer(x, { x: 0, y: 0, w, h }, l => {
      l.font = font; l.textAlign = 'center'; l.textBaseline = 'middle'; l.strokeStyle = o.line ?? PAL.lineDark; l.lineJoin = 'round';
      l.lineWidth = Math.max(2, size * 0.045); l.globalAlpha = 0.85; l.strokeText(text, cx + 0.6, cy - 0.4);
      l.lineWidth = Math.max(1.2, size * 0.025); l.globalAlpha = 0.45; l.strokeText(text, cx - 1.1, cy + 0.9);
    }, 0.35);
  }, { key });
}

// ---------------------------------------------------------------- paper
/** Cream paper tile (256 design units) with fibres + tooth, for patterns. */
export function paperTile(color = PAL.paper) {
  const ratio = Math.max(1, Math.round(256 * game.pxRatio)) / 256;
  return makeSprite(256, 256, (x, w, h) => {
    x.fillStyle = color; x.fillRect(-2, -2, w + 4, h + 4);
    const r = rng(11);
    for (let i = 0; i < 220; i++) { x.fillStyle = r() < 0.5 ? 'rgba(160,130,90,0.05)' : 'rgba(255,255,255,0.35)'; const s = 0.6 + r() * 2.2; x.fillRect(r() * w, r() * h, s, s); }
    for (let i = 0; i < 26; i++) { x.strokeStyle = 'rgba(150,120,80,0.06)'; x.lineWidth = 0.8; const px = r() * w, py = r() * h, a = r() * 6.3, l = 6 + r() * 18; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l, py + Math.sin(a) * l * 0.4, px + Math.cos(a + 0.4) * l * 1.6, py + Math.sin(a + 0.4) * l); x.stroke(); }
  }, { key: 'paperTile' + color, ratio });
}
/** Fill a rect on a live (per-frame) context with a paper pattern in design units. */
export function paperPattern(ctx, color) {
  const t = paperTile(color), p = ctx.createPattern(t.img, 'repeat');
  try { p.setTransform(new DOMMatrix().scale(256 / Math.floor(t.img.width))); } catch (_) {}
  return p;
}

// ---------------------------------------------------------------- scenery sprites
/** Dusk sky: indigo -> lavender -> warm peach glow, crayon streaks. Low-res (soft) and stretched to cover. */
export function nightSky(w = 2200, h = 1300, o = {}) {
  const top = o.top ?? '#2b3a7a', mid = o.mid ?? '#5d63a8', low = o.low ?? '#c99bc2', glow = o.glow ?? '#ffd6a8';
  return makeSprite(w, h, (x) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(0.45, mid); g.addColorStop(0.78, low); g.addColorStop(1, glow);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // big diagonal crayon strokes in neighbouring tones
    const r = rng(o.seed ?? 3);
    for (let i = 0; i < 900; i++) {
      const y = r() * h, k = y / h, cols = k < 0.45 ? [top, mid, '#3c4a92'] : k < 0.78 ? [mid, low, '#8a78b8'] : [low, glow, '#f2b8b0'];
      x.strokeStyle = cols[(r() * 3) | 0]; x.globalAlpha = 0.06 + r() * 0.12; x.lineWidth = 10 + r() * 22;
      const px = r() * w, l = 120 + r() * 260, a = (r() - 0.5) * 0.25; x.beginPath(); x.moveTo(px, y); x.quadraticCurveTo(px + l / 2, y + Math.sin(a) * l - 10, px + l, y + Math.sin(a) * l * 2); x.stroke();
    }
    x.globalAlpha = 1;
    const v = x.createRadialGradient(w / 2, h * 0.95, h * 0.1, w / 2, h * 0.9, h * 0.9);
    v.addColorStop(0, rgba(glow, 0.35)); v.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
  }, { ratio: Math.min(1, game.pxRatio * 0.6), key: 'sky2' + (o.seed ?? 3) + top });
}

/** Rolling crayon hill band (w×h, ground at bottom). layer: 0 far .. 2 near. */
export function hillSprite(w, h, color, seed = 1, o = {}) {
  return makeSprite(w, h, (x) => {
    const r = rng(seed), pts = [], n = 28, base = o.base ?? h * 0.35, amp = o.amp ?? h * 0.18;
    const ph = r() * 6, f = o.freq ?? 1.6;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([t * w, base + Math.sin(t * Math.PI * 2 * f + ph) * amp * 0.6 + Math.sin(t * Math.PI * 2 * f * 2.3 + ph * 2) * amp * 0.4]); }
    pts.push([w + 20, h + 20], [-20, h + 20]);
    crayonShape(x, pts, color, { seed, wobble: 2, lw: o.lw ?? 3, hatchStep: 9, lineColor: o.line ?? shade(color, -0.35) });
    // grass tufts and tiny flowers on the near hill
    if (o.tufts) {
      for (let i = 0; i < o.tufts; i++) {
        const t = r(), px = t * w, yy = base + Math.sin(t * Math.PI * 2 * f + ph) * amp * 0.6 + Math.sin(t * Math.PI * 2 * f * 2.3 + ph * 2) * amp * 0.4 + 18 + r() * (h - base) * 0.6;
        const tuft = []; for (let k = -2; k <= 2; k++) tuft.push([[px + k * 5, yy], [px + k * 9, yy - 14 - r() * 10]]);
        for (const s of tuft) scribble(x, s, shade(color, -0.25), 2.4, { seed: i * 3 + 1, passes: 1 });
        if (r() < 0.45) { const fc = [PAL.yellow, '#ffffff', '#f7a9b8', PAL.purple][(r() * 4) | 0]; crayonShape(x, starPts(px + 8, yy - 20, 8, 4, 5, r(), 2), fc, { lw: 1.6, seed: i, hatch: false, wobble: 0.5 }); }
      }
    }
  }, { key: `hill|${w}|${h}|${color}|${seed}`, ratio: Math.min(1.6, game.pxRatio) });
}

export function cloudSprite(seed = 1, w = 300, h = 140, color = '#fff6ec') {
  return makeSprite(w, h, (x) => {
    const r = rng(seed), circles = [], bumps = 4 + ((r() * 2) | 0);
    for (let i = 0; i < bumps; i++) {
      const t = (i + 0.5) / bumps, rad = h * (0.2 + 0.16 * Math.sin(t * Math.PI)) * (0.85 + r() * 0.3);
      circles.push([28 + t * (w - 56), h * 0.66 - rad * 0.55, rad]);
    }
    circles.push([w * 0.5, h * 0.62, h * 0.2], [w * 0.3, h * 0.66, h * 0.17], [w * 0.7, h * 0.66, h * 0.17]);
    const outline = 'rgba(110,100,150,0.75)', base = h * 0.8;
    const shape = (l) => { l.beginPath(); for (const [cx, cy, rr] of circles) { const pts = wobble(circlePts(cx, Math.min(cy, base - rr * 0.2), rr, 30), seed + cx, 1.2); tracePath(l, pts, true, false); } };
    withLayer(x, { x: 0, y: 0, w, h }, l => {
      l.save(); l.beginPath(); l.rect(0, 0, w, base); l.clip();
      shape(l); l.strokeStyle = outline; l.lineWidth = 5; l.stroke();
      shape(l); l.fillStyle = color; l.fill();
      l.restore();
      // flat bottom
      l.strokeStyle = outline; l.lineWidth = 2.5; l.beginPath(); l.moveTo(circles[0][0] - circles[0][2] * 0.8, base - 1); l.lineTo(circles[bumps - 1][0] + circles[bumps - 1][2] * 0.8, base - 1); l.stroke();
      // soft lavender underside + crayon hatching
      l.globalCompositeOperation = 'source-atop';
      const g = l.createLinearGradient(0, h * 0.3, 0, base); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(200,180,225,0.55)');
      l.fillStyle = g; l.fillRect(0, 0, w, h);
      for (let d = -h; d < w; d += 6 + r() * 6) { l.strokeStyle = r() < 0.5 ? '#ffffff' : '#e3d6ee'; l.globalAlpha = 0.25 + r() * 0.3; l.lineWidth = 2 + r() * 3; l.beginPath(); l.moveTo(d, base); l.lineTo(d + h * 0.6, 0); l.stroke(); }
    }, 0.3);
  }, { key: `cloud2|${seed}|${w}|${color}` });
}

/** Smiling sleepy moon with pink cheeks (matches the cast's faces). */
export function moonSprite(r = 90) {
  const S = r * 2 + 40;
  return makeSprite(S, S, (x) => {
    const c = S / 2;
    crayonShape(x, circlePts(c, c, r), '#fff3c4', { seed: 4, light: '#fffbe6', shade: '#f4dc8a', lineColor: '#9a8a6a', lw: 3 });
    // craters
    for (const [dx, dy, rr] of [[-0.42, -0.3, 0.16], [0.35, -0.45, 0.1], [0.45, 0.25, 0.12]]) crayonFill(x, circlePts(c + dx * r, c + dy * r, rr * r, 16), '#f3dd9a', { seed: 8, hatch: false, grain: 0.45 });
    // sleepy eyes + smile
    const e = r * 0.28;
    scribble(x, [[c - e - 14, c - 2], [c - e, c + 8], [c - e + 14, c - 2]], PAL.lineDark, 3.6, { seed: 2 });
    scribble(x, [[c + e - 14, c - 2], [c + e, c + 8], [c + e + 14, c - 2]], PAL.lineDark, 3.6, { seed: 3 });
    scribble(x, [[c - 12, c + r * 0.32], [c, c + r * 0.4], [c + 12, c + r * 0.32]], PAL.lineDark, 3.2, { seed: 4 });
    x.save(); x.filter = 'blur(4px)'; x.fillStyle = rgba(PAL.cheek, 0.85);
    x.beginPath(); x.ellipse(c - r * 0.5, c + r * 0.22, 15, 9, 0, 0, 7); x.ellipse(c + r * 0.5, c + r * 0.22, 15, 9, 0, 0, 7); x.fill(); x.restore();
  }, { key: 'moon' + r });
}

export function starSprite(size = 40, color = PAL.yellow, o = {}) {
  const S = size + 16;
  return makeSprite(S, S, (x) => {
    const pts = starPts(S / 2, S / 2 + 1, size / 2, size / 2 * (o.inner ?? 0.48), 5, -Math.PI / 2, size * 0.07);
    crayonShape(x, pts, color, { seed: o.seed ?? 3, lw: o.lw ?? Math.max(1.6, size * 0.05), lineColor: o.line ?? shade(color, -0.45), wobble: size * 0.02, hatchStep: Math.max(3, size / 10) });
  }, { key: `star|${size}|${color}|${o.line}|${o.inner}` });
}
/** Soft radial glow sprite (for additive halos). */
export function glowSprite(size = 64, color = '#fff2b0') {
  return makeSprite(size, size, (x) => {
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, rgba(color, 0.9)); g.addColorStop(0.35, rgba(color, 0.35)); g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
  }, { key: 'glow' + size + color });
}

// ---------------------------------------------------------------- ambient nodes
/** Twinkling stars across a region (relayout with .layout(w,h)). */
export class Starfield extends Node {
  constructor(o = {}) {
    super(); this.o = o; this.stars = [];
    this.sp = [starSprite(26, '#fff1a8', { line: '#c9a94a' }), starSprite(18, '#ffffff', { line: '#b9b0d8' }), starSprite(34, PAL.yellow)];
    this.glow = glowSprite(64, '#fff4c0');
    this.drawFn = (ctx) => this._draw(ctx);
  }
  layout(w, h) {
    const r = rng(this.o.seed ?? 21), n = Math.round((this.o.density ?? 1) * w * h / 26000); this.stars = [];
    for (let i = 0; i < n; i++) {
      const y = Math.pow(r(), 1.4) * h;
      this.stars.push({ x: r() * w, y, k: r() < 0.18 ? 2 : r() < 0.55 ? 0 : 1, s: 0.4 + r() * 0.75, ph: r() * 7, sp: 0.8 + r() * 2.2, rot: r() * 1.2, dot: r() < 0.45 });
    }
  }
  _draw(ctx) {
    const t = game.time;
    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      if (s.dot) { ctx.globalAlpha = 0.4 + tw * 0.5; ctx.fillStyle = '#fff7da'; ctx.beginPath(); ctx.arc(s.x, s.y, 2 + s.s * 1.6, 0, 7); ctx.fill(); continue; }
      const sp = this.sp[s.k], sc = s.s * (0.85 + tw * 0.25);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot + Math.sin(t * 0.5 + s.ph) * 0.15);
      ctx.globalAlpha = 0.3 * tw; ctx.globalCompositeOperation = 'lighter';
      const gs = sp.w * sc * 2; ctx.drawImage(this.glow.img, -gs / 2, -gs / 2, gs, gs);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.65 + tw * 0.35;
      ctx.drawImage(sp.img, -sp.w * sc / 2, -sp.h * sc / 2, sp.w * sc, sp.h * sc);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/** Glowing fireflies drifting in a region. */
export class Fireflies extends Node {
  constructor(n = 14, seed = 5) {
    super(); this.n = n; this.seed = seed; this.flies = []; this.glow = glowSprite(48, '#fff0a0'); this.drawFn = c => this._draw(c);
  }
  layout(x, y, w, h) {
    const r = rng(this.seed); this.flies = [];
    for (let i = 0; i < this.n; i++) this.flies.push({ x: x + r() * w, y: y + r() * h, ph: r() * 7, sp: 0.3 + r() * 0.5, ax: 30 + r() * 60, ay: 20 + r() * 40 });
  }
  _draw(ctx) {
    const t = game.time; ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      const px = f.x + Math.sin(t * f.sp + f.ph) * f.ax, py = f.y + Math.sin(t * f.sp * 1.7 + f.ph * 2) * f.ay, a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 + f.ph * 3));
      ctx.globalAlpha = a * 0.9; ctx.drawImage(this.glow.img, px - 24, py - 24, 48, 48);
      ctx.globalAlpha = a; ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}

/** Shooting star that streaks across now and then. */
export class ShootingStar extends Node {
  constructor() { super(); this.next = 3 + Math.random() * 4; this.s = null; this.drawFn = c => this._draw(c); this.area = { w: 1600, h: 400 }; }
  _draw(ctx) {
    const t = game.time;
    if (!this.s && t > this.next) { const w = this.area.w; this.s = { t0: t, x: w * (0.15 + Math.random() * 0.6), y: 40 + Math.random() * this.area.h * 0.5, dx: 520 + Math.random() * 200, dy: 180 + Math.random() * 80 }; }
    if (!this.s) return;
    const k = (t - this.s.t0) / 1.1; if (k >= 1) { this.s = null; this.next = t + 5 + Math.random() * 7; return; }
    const e = 1 - Math.pow(1 - k, 2), hx = this.s.x + this.s.dx * e, hy = this.s.y + this.s.dy * e, a = Math.sin(k * Math.PI);
    const g = ctx.createLinearGradient(hx, hy, hx - this.s.dx * 0.35, hy - this.s.dy * 0.35);
    g.addColorStop(0, `rgba(255,248,210,${a})`); g.addColorStop(1, 'rgba(255,248,210,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - this.s.dx * 0.35, hy - this.s.dy * 0.35); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
}

/** Bunting garland (triangle flags) sprite spanning w with sag. */
export function buntingSprite(w = 1600, h = 160, seed = 2) {
  return makeSprite(w, h, (x) => {
    const sag = h * 0.45, pts = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([t * w, 14 + Math.sin(t * Math.PI) * sag]); }
    scribble(x, pts, '#8a7a6a', 3, { seed });
    const cols = [PAL.red, PAL.yellow, PAL.blue, PAL.green, PAL.orange, PAL.purple, '#f7a9b8'], n = Math.floor(w / 90);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, cx = t * w, cy = 14 + Math.sin(t * Math.PI) * sag, slope = Math.cos(t * Math.PI) * sag * Math.PI / w;
      const a = Math.atan(slope), fw = 30, fh = 62;
      const p = [[-fw, 0], [fw, 0], [0, fh]].map(([px, py]) => [cx + px * Math.cos(a) - py * Math.sin(a), cy + px * Math.sin(a) + py * Math.cos(a)]);
      crayonShape(x, roundCorners(p, 4), cols[i % cols.length], { seed: seed + i, lw: 2.4, wobble: 1 });
    }
  }, { key: `bunting|${w}|${h}|${seed}` });
}

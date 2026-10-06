// Procedural canvas textures for the masjid (no external assets, no text glyphs: geometric / arabesque only)
import * as THREE from 'three';

let seed = 1337;
export const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const cache = {};

function mk(w, h, draw, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
function noise(g, w, h, n, a, cols) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = a * (0.4 + rnd() * 0.6);
    g.fillStyle = cols[(rnd() * cols.length) | 0];
    const r = 1 + rnd() * 3; g.fillRect(rnd() * w, rnd() * h, r, r);
  }
  g.globalAlpha = 1;
}
function once(k, f) { return cache[k] ??= f(); }
// hex helpers for palette-driven textures (masjid customisation): '#rrggbb' -> [r,g,b] 0..255
const HEX = /^#?[0-9a-f]{6}$/i;
export const isHex = v => typeof v === 'string' && HEX.test(v);
const rgbOf = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const css = (c, a = 1) => a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mul = (c, k) => c.map(v => Math.max(0, Math.min(255, v * k)));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hexOf = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export const texUtil = { rgbOf, hexOf, mul, mix };
export const tex = {
  plaster: () => once('plaster', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#f3e7cf'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { // soft blotches
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = rnd() < .5 ? '255,250,235' : '214,190,150';
      gr.addColorStop(0, `rgba(${c},0.22)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    noise(g, w, h, 1800, .18, ['#b79c70', '#fff', '#c9ad80']);
  })),
  roofTile: () => once('roofTile', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#7e3a22'; g.fillRect(0, 0, w, h);
    const cols = 6, rows = 6, cw = w / cols, rh = h / rows;
    for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * rh, v = rnd();
      const base = [[186, 84, 50], [200, 96, 56], [172, 74, 46], [210, 108, 60]][(v * 4) | 0];
      const gr = g.createLinearGradient(x, 0, x + cw, 0);
      gr.addColorStop(0, `rgb(${base[0] * .72},${base[1] * .7},${base[2] * .7})`);
      gr.addColorStop(.35, `rgb(${base[0]},${base[1]},${base[2]})`);
      gr.addColorStop(.65, `rgb(${base[0] * 1.07},${base[1] * 1.08},${base[2] * 1.05})`);
      gr.addColorStop(1, `rgb(${base[0] * .62},${base[1] * .6},${base[2] * .6})`);
      g.fillStyle = gr; g.fillRect(x, y, cw, rh * 1.15);
      const sh = g.createLinearGradient(0, y + rh * .55, 0, y + rh * 1.15); // overlap shadow at bottom lip
      sh.addColorStop(0, 'rgba(60,20,10,0)'); sh.addColorStop(1, 'rgba(60,20,10,.62)');
      g.fillStyle = sh; g.fillRect(x, y + rh * .55, cw, rh * .6);
      g.fillStyle = 'rgba(255,220,170,.18)'; g.fillRect(x + cw * .42, y, cw * .1, rh * .55);
    }
    noise(g, w, h, 900, .22, ['#3a1a10', '#e9a070', '#6a3020']);
  })),
  marble: () => once('marble', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, r = 25 + rnd() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(210,214,220,.28)'); gr.addColorStop(1, 'rgba(210,214,220,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `rgba(${130 + rnd() * 40},${135 + rnd() * 30},${150 + rnd() * 30},${.25 + rnd() * .25})`;
      g.lineWidth = .6 + rnd() * 1.3; g.beginPath();
      let x = rnd() * w, y = 0; g.moveTo(x, y);
      while (y < h) { x += (rnd() - .5) * 30; y += 12 + rnd() * 18; g.lineTo(x, y); }
      g.stroke();
    }
  })),
  wood: () => once('wood', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#b07a46'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) {
      const t = .5 + .5 * Math.sin(x * .21 + Math.sin(x * .05) * 3 + rnd() * .5);
      g.fillStyle = `rgba(${90 + t * 50},${50 + t * 30},${20 + t * 14},${.14 + rnd() * .16})`;
      g.fillRect(x, 0, 2, h);
    }
    for (let i = 0; i < 14; i++) { // knots / long streaks
      g.strokeStyle = 'rgba(40,20,8,.28)'; g.lineWidth = 1; g.beginPath();
      const x = rnd() * w; g.moveTo(x, 0);
      for (let y = 0; y < h; y += 16) g.lineTo(x + Math.sin(y * .05 + i) * 3, y);
      g.stroke();
    }
    noise(g, w, h, 500, .14, ['#5a3414', '#d8a070']);
  })),
  gold: () => once('gold', () => mk(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#9c6b10'); gr.addColorStop(.3, '#ffd75e'); gr.addColorStop(.5, '#fff1a8');
    gr.addColorStop(.7, '#e7ab26'); gr.addColorStop(1, '#8b5a0c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    noise(g, w, h, 300, .2, ['#fff7c0', '#6a4208']);
  })),
  // 8-point star tessellation; tileable. mode: 'teal' | 'cream'
  // mode: 'teal' | 'cream' | '#rrggbb' (trim colour: palette derived from the hex, gold or cream accents)
  arabesque: (mode = 'teal') => once('arab' + mode, () => mk(256, 256, (g, w, h) => {
    let P;
    if (isHex(mode)) {
      const b = rgbOf(mode), lum = (b[0] * .3 + b[1] * .59 + b[2] * .11) / 255, warm = b[0] > b[2] * 1.6 && b[1] > b[2] * 1.2;
      P = { bg: hexOf(mul(b, .5)), a: warm ? '#fff3c9' : '#f4d77a', b: mode, c: warm ? '#7a4a12' : '#fff3c9', d: hexOf(mul(b, lum > .45 ? .62 : .34)) };
    } else P = mode === 'teal'
      ? { bg: '#0f5d63', a: '#f4d77a', b: '#17898f', c: '#fff3c9', d: '#093f47' }
      : { bg: '#f1e3c3', a: '#b9852d', b: '#e5cfa0', c: '#6c3d12', d: '#d9bf86' };
    g.fillStyle = P.bg; g.fillRect(0, 0, w, h);
    const star = (cx, cy, R, fill, stroke, lw) => {
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? R * .62 : R; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
    };
    const diamond = (cx, cy, r, fill) => { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fillStyle = fill; g.fill(); };
    for (const [ox, oy] of [[0, 0], [w, 0], [0, h], [w, h]]) diamond(ox, oy, w * .27, P.b); // corner diamonds (tile edges)
    diamond(w / 2, h / 2, 0, P.b);
    star(w / 2, h / 2, w * .46, P.b, P.a, 4);
    star(w / 2, h / 2, w * .3, P.d, P.c, 2.5);
    g.beginPath(); g.arc(w / 2, h / 2, w * .1, 0, 7); g.fillStyle = P.a; g.fill();
    g.beginPath(); g.arc(w / 2, h / 2, w * .05, 0, 7); g.fillStyle = P.d; g.fill();
    for (const [dx, dy] of [[.5, 0], [0, .5], [1, .5], [.5, 1]]) diamond(w * dx, h * dy, w * .1, P.a);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; g.beginPath(); g.arc(w / 2 + Math.cos(a) * w * .22, h / 2 + Math.sin(a) * w * .22, 5, 0, 7); g.fillStyle = P.c; g.fill(); }
    g.strokeStyle = P.a; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  })),
  // Stained glass arch panel (rect canvas; arch shape comes from geometry). Also used as emissiveMap.
  glass: () => once('glass', () => mk(128, 256, (g, w, h) => {
    g.fillStyle = '#10141c'; g.fillRect(0, 0, w, h);
    const pal = ['#d7263d', '#f5a623', '#1f9bd7', '#1fbf75', '#8a3fd1', '#f6d743', '#ff6f91', '#00a6a6'];
    const cx = w / 2, cy = h * .36;
    // radial sectors in the upper rose
    for (let i = 0; i < 12; i++) {
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w * .62, i * Math.PI / 6, (i + 1) * Math.PI / 6); g.closePath();
      g.fillStyle = pal[i % pal.length]; g.fill();
    }
    g.beginPath(); g.arc(cx, cy, w * .2, 0, 7); g.fillStyle = '#fff3b0'; g.fill();
    // lower mosaic cells
    const cs = 16;
    for (let y = h * .62; y < h; y += cs) for (let x = 0; x < w; x += cs) {
      g.fillStyle = pal[(rnd() * pal.length) | 0]; g.fillRect(x, y, cs, cs);
    }
    // lead lines
    g.strokeStyle = '#0b0d12'; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(i * Math.PI / 6) * w * .62, cy + Math.sin(i * Math.PI / 6) * w * .62); g.stroke(); }
    g.beginPath(); g.arc(cx, cy, w * .2, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, w * .4, 0, 7); g.stroke();
    for (let y = h * .62; y < h; y += cs) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += cs) { g.beginPath(); g.moveTo(x, h * .62); g.lineTo(x, h); g.stroke(); }
    g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    g.lineWidth = 4; g.beginPath(); g.moveTo(0, h * .6); g.lineTo(w, h * .6); g.stroke();
  }, { repeat: false })),
  // prayer-mat: light neutral so instance color tints it
  sajadah: () => once('sajadah', () => mk(128, 256, (g, w, h) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; for (let x = 4; x < w; x += 8) { g.fillRect(x, 0, 3, 10); g.fillRect(x, h - 10, 3, 10); } // tassels
    g.strokeStyle = '#b0b0b0'; g.lineWidth = 5; g.strokeRect(14, 16, w - 28, h - 32);
    g.strokeStyle = '#d8d8d8'; g.lineWidth = 2; g.strokeRect(22, 24, w - 44, h - 48);
    // mihrab arch motif
    g.fillStyle = '#c4c4c4'; g.beginPath(); g.moveTo(34, h * .78); g.lineTo(34, h * .4); g.quadraticCurveTo(w / 2, h * .1, w - 34, h * .4); g.lineTo(w - 34, h * .78); g.closePath(); g.fill();
    g.fillStyle = '#e8e8e8'; g.beginPath(); g.moveTo(44, h * .76); g.lineTo(44, h * .42); g.quadraticCurveTo(w / 2, h * .16, w - 44, h * .42); g.lineTo(w - 44, h * .76); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h * .44, 9, 0, 7); g.fill();
    g.fillStyle = '#9a9a9a'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 15, h * .44 + Math.sin(a) * 15, 3, 0, 7); g.fill(); }
    g.fillStyle = '#c0c0c0'; for (let y = h * .62; y < h * .74; y += 9) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + 6, y + 4); g.lineTo(w / 2, y + 8); g.lineTo(w / 2 - 6, y + 4); g.fill(); }
    noise(g, w, h, 600, .12, ['#888', '#fff']);
  })),
  plazaTile: () => once('plazaTile', () => mk(128, 128, (g, w, h) => {
    g.fillStyle = '#f0e6d2'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 700, .2, ['#a99478', '#fff']);
    g.strokeStyle = 'rgba(120,95,60,.55)'; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.strokeRect(10, 10, w - 20, h - 20);
    g.save(); g.translate(w / 2, h / 2); g.fillStyle = 'rgba(150,115,60,.45)';
    for (let k = 0; k < 2; k++) { g.rotate(Math.PI / 4); g.fillRect(-26, -26, 52, 52); }
    g.fillStyle = 'rgba(240,228,200,.9)'; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); g.restore();
  })),
  ceiling: () => once('ceiling', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#6a3d20'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      g.fillStyle = '#8a5530'; g.fillRect(x + 6, y + 6, 52, 52);
      g.fillStyle = '#a56d3b'; g.fillRect(x + 12, y + 12, 40, 40);
      g.fillStyle = '#e0b25a'; g.beginPath(); g.arc(x + 32, y + 32, 7, 0, 7); g.fill();
      g.strokeStyle = '#3d210f'; g.lineWidth = 2; g.strokeRect(x + 6, y + 6, 52, 52);
    }
    noise(g, w, h, 500, .15, ['#2a1408', '#c28a58']);
  })),
  // hall carpet; base = '#rrggbb' recolours field + border band (default keeps the original green/maroon)
  carpet: (base = null) => once('carpet' + (isHex(base) ? base : ''), () => mk(256, 256, (g, w, h) => {
    const b = isHex(base) ? rgbOf(base) : null, gold = b && b[0] > 150 && b[1] > 110 && b[2] < 90;
    g.fillStyle = b ? css(mul(b, .78)) : '#1f5a45'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 1500, .22, b ? [hexOf(mul(b, .5)), hexOf(mix(b, [255, 255, 255], .25))] : ['#0f3a2c', '#3c8a6a']);
    g.strokeStyle = gold ? '#fff0c0' : '#e2c26a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = b ? (gold ? '#6e1f3a' : hexOf(mul(b, .42))) : '#8a1f2d'; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 48);
    g.strokeStyle = gold ? '#fff0c0' : '#e2c26a'; g.lineWidth = 3; g.strokeRect(38, 38, w - 76, h - 76);
    g.fillStyle = gold ? 'rgba(110,40,30,.4)' : 'rgba(190,160,90,.45)';
    for (let x = 64; x < w - 40; x += 32) for (let y = 64; y < h - 40; y += 32) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 4, y); g.lineTo(x, y + 4); g.lineTo(x - 4, y); g.fill(); }
  })),
  brick: () => once('brick', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#eadcbf'; g.fillRect(0, 0, w, h);
    const bw = 64, bh = 26;
    for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2, v = rnd();
      const col = [[176, 70, 42], [192, 84, 50], [160, 62, 38], [204, 98, 60], [184, 78, 46]][(v * 5) | 0];
      const gr = g.createLinearGradient(0, y, 0, y + bh - 4);
      gr.addColorStop(0, `rgb(${col[0] * 1.08},${col[1] * 1.08},${col[2] * 1.06})`); gr.addColorStop(1, `rgb(${col[0] * .82},${col[1] * .8},${col[2] * .8})`);
      g.fillStyle = gr; g.fillRect(x, y, bw - 4, bh - 4);
    }
    noise(g, w, h, 1400, .22, ['#5a2410', '#f0b080', '#8a3a20']);
  })),
  sign: () => once('sign', () => mk(512, 256, (g, w, h) => {
    g.fillStyle = '#f6ecd2'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 1500, .15, ['#c8b48a', '#ffffff']);
    g.strokeStyle = '#2c7a64'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
    g.strokeStyle = '#e0a83a'; g.lineWidth = 4; g.strokeRect(24, 24, w - 48, h - 48);
    // painted mosque icon: tiered tajug roof + hall + crescent
    const cx = 116, by = 196;
    g.fillStyle = '#fff8e8'; g.fillRect(cx - 62, by - 62, 124, 62);
    g.fillStyle = '#2c7a64'; g.beginPath(); g.moveTo(cx - 18, by); g.lineTo(cx - 18, by - 34); g.quadraticCurveTo(cx, by - 52, cx + 18, by - 34); g.lineTo(cx + 18, by); g.fill();
    const tier = (y, hw, th) => { g.fillStyle = '#c4532e'; g.beginPath(); g.moveTo(cx - hw, y); g.lineTo(cx + hw, y); g.lineTo(cx + hw * .45, y - th); g.lineTo(cx - hw * .45, y - th); g.closePath(); g.fill(); };
    tier(by - 60, 86, 30); tier(by - 92, 58, 24); g.fillStyle = '#c4532e'; g.beginPath(); g.moveTo(cx - 36, by - 116); g.lineTo(cx + 36, by - 116); g.lineTo(cx, by - 150); g.closePath(); g.fill();
    g.fillStyle = '#e0a83a'; g.beginPath(); g.arc(cx, by - 166, 13, 0, 7); g.fill(); g.fillStyle = '#f6ecd2'; g.beginPath(); g.arc(cx + 6, by - 170, 11, 0, 7); g.fill();
    g.fillStyle = '#7a4a26'; g.fillRect(cx - 90, by, 180, 10);
    // title
    g.fillStyle = '#2c4a3e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 58px sans-serif'; g.fillText('Calon', 350, 98); g.fillText('Masjid', 350, 160);
    g.fillStyle = '#e0a83a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(282 + i * 34, 208, 6, 0, 7); g.fill(); }
  }, { repeat: false })),
  // wooden shingles (sirap): dark grey-brown, soft stagger
  sirap: (hex = null) => once('sirap' + (isHex(hex) ? hex : ''), () => mk(256, 256, (g, w, h) => {
    const hb = isHex(hex) ? rgbOf(hex) : null, BASES = hb ? [.9, 1.0, .95, 1.07].map(k => mul(hb, k)) : [[154, 115, 80], [176, 132, 88], [164, 122, 82], [186, 140, 94]];
    g.fillStyle = hb ? css(mul(hb, .55)) : '#5a4028'; g.fillRect(0, 0, w, h);
    const rows = 6, rh = h / rows;
    for (let r = rows - 1; r >= 0; r--) {
      let x = (r % 2) * -22;
      while (x < w) {
        const sw = 34 + rnd() * 18, v = rnd(), y = r * rh;
        const base = BASES[(v * 4) | 0];
        const gr = g.createLinearGradient(0, y, 0, y + rh);
        gr.addColorStop(0, `rgb(${base[0] * .9},${base[1] * .9},${base[2] * .9})`); gr.addColorStop(.55, `rgb(${base[0]},${base[1]},${base[2]})`);
        gr.addColorStop(.8, `rgb(${base[0] * .9},${base[1] * .88},${base[2] * .86})`); gr.addColorStop(1, `rgb(${base[0] * .42},${base[1] * .38},${base[2] * .34})`);
        g.fillStyle = gr; g.fillRect(x + 1.5, y, sw - 3, rh);
        g.fillStyle = 'rgba(255,236,200,.12)'; g.fillRect(x + 3, y + 2, sw * .3, 3); // soft top highlight
        g.fillStyle = 'rgba(60,36,18,.35)'; g.fillRect(x + sw - 3, y, 1.5, rh); // gap shadow
        x += sw;
      }
    }
    noise(g, w, h, 500, .08, ['#4a3020', '#d8b080']);
  })),
  // interlocking clay roof tiles (genteng): rows of rounded pans, each lip shading the row below. glazed = glossy streaks.
  genteng: (hex = '#c8643a', glazed = false) => once('genteng' + hex + (glazed ? 'g' : ''), () => mk(256, 256, (g, w, h) => {
    const b = rgbOf(isHex(hex) ? hex : '#c8643a');
    g.fillStyle = css(mul(b, .45)); g.fillRect(0, 0, w, h);
    const cols = 6, rows = 6, cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * rh, k = .9 + rnd() * .18, base = mul(b, k);
      const gr = g.createLinearGradient(x, 0, x + cw, 0); // rounded pan: dark valley - bright crest - dark valley
      gr.addColorStop(0, css(mul(base, .62))); gr.addColorStop(.3, css(base)); gr.addColorStop(.5, css(mul(base, 1.16)));
      gr.addColorStop(.72, css(base)); gr.addColorStop(1, css(mul(base, .58)));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + 1, y + rh); g.lineTo(x + 1, y + 6); g.quadraticCurveTo(x + cw / 2, y - 3, x + cw - 1, y + 6); g.lineTo(x + cw - 1, y + rh); g.closePath(); g.fill();
      const sh = g.createLinearGradient(0, y + rh * .62, 0, y + rh); // the next row's lip shades this one
      sh.addColorStop(0, 'rgba(40,16,8,0)'); sh.addColorStop(1, 'rgba(40,16,8,.5)'); g.fillStyle = sh; g.fillRect(x, y + rh * .62, cw, rh * .38);
      if (glazed) { g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x + cw * .37, y + 6, cw * .08, rh * .5); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + cw * .5, y + 7, cw * .05, rh * .36); }
      else { g.fillStyle = 'rgba(255,225,190,.16)'; g.fillRect(x + cw * .42, y + 4, cw * .1, rh * .5); }
    }
    g.fillStyle = css(mul(b, .5)); for (let r = 0; r < rows; r++) g.fillRect(0, r * rh, w, 2); // lip line
    noise(g, w, h, glazed ? 300 : 900, glazed ? .1 : .2, [hexOf(mul(b, .45)), hexOf(mix(b, [255, 240, 220], .5))]);
  })),
  // warm limestone (batu putih) blocks with low-contrast veins
  batu: () => once('batu', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#c9b996'; g.fillRect(0, 0, w, h);
    const bh = 64;
    for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) {
      const bw = 128, x = c * bw + (r % 2 ? 64 : 0) + 2, y = r * bh + 2, v = .92 + rnd() * .1;
      g.fillStyle = `rgb(${217 * v | 0},${204 * v | 0},${178 * v | 0})`; g.fillRect(x, y, bw - 4, bh - 4);
      for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(170,150,115,.25)'; g.lineWidth = 1; g.beginPath(); let vx = x + rnd() * bw, vy = y; g.moveTo(vx, vy); while (vy < y + bh - 4) { vx += (rnd() - .5) * 14; vy += 8; g.lineTo(vx, vy); } g.stroke(); }
    }
    noise(g, w, h, 900, .1, ['#a89470', '#f4ead4']);
  })),
  // glow mask for the louvers: only the slat gaps emit
  louverGlow: () => once('louverGlow', () => mk(128, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; for (let y = 6; y < h - 6; y += 12) g.fillRect(8, y + 9, w - 16, 3);
  })),
  whitewash: () => once('whitewash', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#fff6e6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h, r = 30 + rnd() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(236,222,196,.18)'); gr.addColorStop(1, 'rgba(236,222,196,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    noise(g, w, h, 500, .06, ['#d8c8a8', '#ffffff']);
  })),
  // wooden louvers (vent band between roof tiers)
  louver: () => once('louver', () => mk(128, 128, (g, w, h) => {
    g.fillStyle = '#3a2618'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) { const gr = g.createLinearGradient(0, y, 0, y + 10); gr.addColorStop(0, '#d9a56a'); gr.addColorStop(1, '#8a5a30'); g.fillStyle = gr; g.fillRect(8, y, w - 16, 9); }
    g.fillStyle = '#c08a52'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  })),
  // carved wooden lattice (krawangan) with transparent holes: use with alphaTest
  krawangan: () => once('kraw', () => mk(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#b98250'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const c = 32;
    for (let y = 0; y < h; y += c) for (let x = 0; x < w; x += c) {
      g.beginPath(); // 4-petal kawung motif hole
      for (const [dx, dy] of [[.5, .2], [.8, .5], [.5, .8], [.2, .5]]) { g.moveTo(x + dx * c + 4.5, y + dy * c); g.ellipse(x + dx * c, y + dy * c, 4.5, 4.5, 0, 0, 7); }
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#8a5a30'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.fillStyle = 'rgba(120,76,36,.5)'; for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.beginPath(); g.arc(x + 16, y + 16, 3, 0, 7); g.fill(); }
  }, { srgb: true })),
  // small coloured transom glass (no rose)
  transom: () => once('transom', () => mk(128, 64, (g, w, h) => {
    const pal = ['#2e8b57', '#f2b134', '#1f7fa8', '#c0392b', '#f6e3a1'];
    g.fillStyle = '#2b1a0e'; g.fillRect(0, 0, w, h);
    const cw = w / 6;
    for (let i = 0; i < 6; i++) { g.fillStyle = pal[[0, 1, 4, 4, 1, 0][i]]; g.fillRect(i * cw + 3, 4, cw - 6, h - 8); }
    g.fillStyle = pal[2]; g.fillRect(w / 2 - 14, h / 2 - 10, 28, 20); g.fillStyle = pal[3]; g.beginPath(); g.arc(w / 2, h / 2, 6, 0, 7); g.fill();
  }, { repeat: false })),
  // glazed ceramic plate (Kudus-style inlay), white with blue rings
  plate: () => once('plate', () => mk(64, 64, (g, w, h) => {
    g.fillStyle = '#b8562f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f2ea'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
    g.strokeStyle = '#2c5aa0'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke();
    g.fillStyle = '#3a6fc0'; g.beginPath(); g.arc(32, 32, 9, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.arc(32 + Math.cos(a) * 17, 32 + Math.sin(a) * 17, 3, 0, 7); g.fill(); }
  }, { repeat: false })),
  water: () => once('water', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#4fc3d1'; g.fillRect(0, 0, w, h);
    g.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const x = rnd() * w, y = rnd() * h, r = 6 + rnd() * 18;
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        g.strokeStyle = `rgba(255,255,255,${.1 + rnd() * .3})`; g.beginPath(); g.arc(x + ox, y + oy, r, rnd() * 3, 3 + rnd() * 3); g.stroke();
      }
    }
  })),
  leaf: () => once('leaf', () => mk(64, 64, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 200, .25, ['#9a9', '#dfd']);
  })),
};


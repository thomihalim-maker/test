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
    g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) {
      const t = .5 + .5 * Math.sin(x * .21 + Math.sin(x * .05) * 3 + rnd() * .5);
      g.fillStyle = `rgba(${40 + t * 40},${20 + t * 22},${8 + t * 10},${.18 + rnd() * .22})`;
      g.fillRect(x, 0, 2, h);
    }
    for (let i = 0; i < 14; i++) { // knots / long streaks
      g.strokeStyle = 'rgba(40,20,8,.28)'; g.lineWidth = 1; g.beginPath();
      const x = rnd() * w; g.moveTo(x, 0);
      for (let y = 0; y < h; y += 16) g.lineTo(x + Math.sin(y * .05 + i) * 3, y);
      g.stroke();
    }
    noise(g, w, h, 500, .2, ['#2a1408', '#b98150']);
  })),
  gold: () => once('gold', () => mk(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#9c6b10'); gr.addColorStop(.3, '#ffd75e'); gr.addColorStop(.5, '#fff1a8');
    gr.addColorStop(.7, '#e7ab26'); gr.addColorStop(1, '#8b5a0c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    noise(g, w, h, 300, .2, ['#fff7c0', '#6a4208']);
  })),
  // 8-point star tessellation; tileable. mode: 'teal' | 'cream'
  arabesque: (mode = 'teal') => once('arab' + mode, () => mk(256, 256, (g, w, h) => {
    const P = mode === 'teal'
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
  carpet: () => once('carpet', () => mk(256, 256, (g, w, h) => {
    g.fillStyle = '#1f5a45'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 1500, .22, ['#0f3a2c', '#3c8a6a']);
    g.strokeStyle = '#e2c26a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = '#8a1f2d'; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 48);
    g.strokeStyle = '#e2c26a'; g.lineWidth = 3; g.strokeRect(38, 38, w - 76, h - 76);
    g.fillStyle = '#e2c26a';
    for (let x = 64; x < w - 40; x += 32) for (let y = 64; y < h - 40; y += 32) { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.fill(); }
  })),
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


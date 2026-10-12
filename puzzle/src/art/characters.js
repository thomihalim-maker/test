// Characters: Ibu (mom), Ayah (dad), Bintang (baby) — rigged crayon puppets matching assets/reference.png.
//
// Public API (see CONTRACT.md):
//   const mom = await createCharacter('mom'|'dad'|'baby'); scene.root.add(mom); mom.x = 400; mom.y = 860;
//   mom.setMood(m)            persistent mood: idle | happy | cheer | surprised | think | sad | sleep | adore | soft
//   mom.react(m, seconds?)    temporary mood with squash & stretch, then eases back to the setMood() mood
//   mom.talk(seconds?)        mouth flaps
//   mom.lookAt(worldX, worldY) / mom.lookAt(null)
//   await portraitSprite(w, h)            → family-portrait sprite {img,w,h} (level-3 jigsaw picture)
//   PORTRAIT_LAYOUT, applyPortraitPose(), portraitBackdropSprite(w, h), drawPortraitBackdrop(ctx, w, h)
//                                         → rebuild the same portrait live (see bottom of file)
// Origin (0,0) = bottom centre (base of the shirt / swaddle). Heights at scale 1: mom ≈ 560, dad ≈ 600, baby ≈ 230.
//
// Construction: every body part is a small SVG rasterized ONCE (cached by key): an opaque base fill whose
// edge is displaced by a seeded low-frequency wobble field, crayon streak grain on top, and a hand-made
// pencil line (variable width, tapered ends, tiny gaps). Arms are drawn live (cheap path fills with cached
// crayon patterns) as one silhouette per segment so hand + forearm never show a seam:
//   Character ─ rig (squash/stretch, hop, lean)
//                ├ back   upper arms (+ Ayah's sleeves) — behind the torso / hijab drape
//                ├ body   (breathing)
//                ├ headPivot (neck, tilt) ─ head ─ hood/ears · face · features(look offset) · hoodFront/hair · "?"
//                ├ front  forearms + hands (outline pass, then fill pass → one silhouette)
//                └ knot   Ibu's hijab ribbon, always on top
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { svgSprite, canvasSprite } from '../engine/raster.js';
import { rng } from '../engine/tween.js';

export const MOODS = ['idle', 'happy', 'cheer', 'surprised', 'think', 'sad', 'sleep', 'adore', 'soft', 'shh'];

// ---------------------------------------------------------------- palette (sampled from the reference)
const C = {
  line: '#6d6765', ink: '#4a4442', inkSoft: '#5d5755',
  skin: '#ffffff', skinGrain: '#e6ddd7',
  cheek: '#f7a3b6',
  hijab: '#e6825f', hijabShade: '#c4613f', hijabLight: '#f7ab8c', hijabLine: '#b0563a', lace: '#df6e50',
  pink: '#fcc8de', pinkShade: '#ef9fc3', pinkLine: '#c48aa4',
  green: '#35b98f', greenShade: '#1f9572', greenLight: '#83dcbb', greenLine: '#2a7f62',
  hair: '#858483', hairDark: '#555453', hairMid: '#6f6e6d', hairLight: '#b4b3b1',
  blue: '#2b53b4', blueDeep: '#1d3c8e', blueLine: '#1f3473', swirl: '#6fa2ef', swirl2: '#9cc2f7', swirl3: '#4a7bd6',
  star: '#f2cd52', starLight: '#fbe7a0',
  mouth: '#c4505f', tongue: '#f58c9d',
};

// ---------------------------------------------------------------- hand-drawn geometry helpers
const NS = 'http://www.w3.org/2000/svg';
const n1 = v => (Math.round(v * 10) / 10).toString();
let PR = rng(1); // seeded stream for stroke widths / gaps (reset per kind → deterministic art)

// Position-based low-frequency wobble field: any path through the same spot moves the same way, so separately
// drawn fills and lines stay registered while every edge loses its perfect vector curve.
function field(x, y) {
  return [1.15 * (Math.sin(x * 0.043 + y * 0.019 + 1.3) + 0.6 * Math.sin(-x * 0.021 + y * 0.047 + 4.1) + 0.35 * Math.sin(x * 0.09 + y * 0.07)),
    1.15 * (Math.sin(x * 0.024 - y * 0.041 + 2.2) + 0.6 * Math.sin(x * 0.051 + y * 0.016 + 0.7) + 0.35 * Math.sin(-x * 0.08 + y * 0.095))];
}
// Fast path flattener (absolute M L H V C Q A Z; relative commands fall back to the DOM).
function flatten(sub) {
  const tok = sub.match(/[MLHVCQAZmlhvcqaz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const pts = []; let i = 0, cmd = '', x = 0, y = 0, x0 = 0, y0 = 0;
  const num = () => parseFloat(tok[i++]);
  const push = (px, py) => pts.push([px, py]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    if (cmd !== cmd.toUpperCase() && cmd !== 'z') return null;
    if (cmd === 'M') { x = x0 = num(); y = y0 = num(); push(x, y); cmd = 'L'; }
    else if (cmd === 'L') { x = num(); y = num(); push(x, y); }
    else if (cmd === 'H') { x = num(); push(x, y); }
    else if (cmd === 'V') { y = num(); push(x, y); }
    else if (cmd === 'C') {
      const a1 = num(), b1 = num(), a2 = num(), b2 = num(), ex = num(), ey = num();
      const n = Math.max(4, Math.ceil((Math.hypot(a1 - x, b1 - y) + Math.hypot(a2 - a1, b2 - b1) + Math.hypot(ex - a2, ey - b2)) / 4));
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push(u * u * u * x + 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * b1 + 3 * u * t * t * b2 + t * t * t * ey); }
      x = ex; y = ey;
    } else if (cmd === 'Q') {
      const a1 = num(), b1 = num(), ex = num(), ey = num();
      const n = Math.max(4, Math.ceil((Math.hypot(a1 - x, b1 - y) + Math.hypot(ex - a1, ey - b1)) / 4));
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push(u * u * x + 2 * u * t * a1 + t * t * ex, u * u * y + 2 * u * t * b1 + t * t * ey); }
      x = ex; y = ey;
    } else if (cmd === 'A') {
      let rx = Math.abs(num()), ry = Math.abs(num()); const phi = num() * Math.PI / 180, fa = num(), fs = num(), ex = num(), ey = num();
      const cp = Math.cos(phi), sp = Math.sin(phi), dx = (x - ex) / 2, dy = (y - ey) / 2;
      const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
      let lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      let sq = (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1); sq = Math.sqrt(Math.max(0, sq)) * (fa === fs ? -1 : 1);
      const cxp = sq * rx * y1 / ry, cyp = -sq * ry * x1 / rx, cx = cp * cxp - sp * cyp + (x + ex) / 2, cy = sp * cxp + cp * cyp + (y + ey) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
      if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
      const n = Math.max(4, Math.ceil(Math.abs(dt) * Math.max(rx, ry) / 4));
      for (let k = 1; k <= n; k++) { const t = t1 + dt * k / n; push(cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp); }
      x = ex; y = ey;
    } else if (cmd === 'Z' || cmd === 'z') { if (x !== x0 || y !== y0) push(x0, y0); x = x0; y = y0; cmd = ''; if (i < tok.length && !/[A-Za-z]/.test(tok[i])) return null; }
    else return null;
  }
  return pts;
}
let probe = null;
function sample(d, step = 3, wobble = true) {
  const out = [];
  for (const sub of d.trim().split(/(?=M)/)) {
    if (!sub.trim()) continue;
    const closed = /[zZ]\s*$/.test(sub);
    let raw = flatten(sub), L = 0;
    if (!raw) { // DOM fallback
      if (!probe) probe = document.createElementNS(NS, 'path');
      probe.setAttribute('d', sub); L = probe.getTotalLength(); raw = [];
      const n = Math.max(2, Math.ceil(L / 2)); for (let k = 0; k <= n; k++) { const p = probe.getPointAtLength(L * k / n); raw.push([p.x, p.y]); }
    }
    // resample by arc length
    const cum = [0]; for (let k = 1; k < raw.length; k++) cum.push(cum[k - 1] + Math.hypot(raw[k][0] - raw[k - 1][0], raw[k][1] - raw[k - 1][1]));
    L = cum[cum.length - 1];
    const n = Math.max(2, Math.ceil(L / step)), pts = [];
    let j = 0;
    for (let k = 0; k <= n; k++) {
      const sTarget = L * k / n; while (j < cum.length - 2 && cum[j + 1] < sTarget) j++;
      const seg = (cum[j + 1] - cum[j]) || 1, u = Math.min(1, Math.max(0, (sTarget - cum[j]) / seg));
      const px = raw[j][0] + (raw[Math.min(j + 1, raw.length - 1)][0] - raw[j][0]) * u, py = raw[j][1] + (raw[Math.min(j + 1, raw.length - 1)][1] - raw[j][1]) * u;
      const f = wobble ? field(px, py) : [0, 0];
      pts.push([px + f[0], py + f[1]]);
    }
    out.push({ pts, L, closed });
  }
  return out;
}
const polyD = subs => subs.map(s => 'M' + s.pts.map(p => n1(p[0]) + ' ' + n1(p[1])).join('L') + (s.closed ? 'Z' : '')).join('');

function ribbon(run) {
  const Lp = [], Rp = [], n = run.length;
  for (let i = 0; i < n; i++) {
    const a = run[Math.max(i - 1, 0)], b = run[Math.min(i + 1, n - 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1, nx = -ty / m, ny = tx / m, h = run[i][2] / 2;
    Lp.push(n1(run[i][0] + nx * h) + ' ' + n1(run[i][1] + ny * h));
    Rp.push(n1(run[i][0] - nx * h) + ' ' + n1(run[i][1] - ny * h));
  }
  return 'M' + Lp.join('L') + 'L' + Rp.reverse().join('L') + 'Z';
}
/** Pencil line: wobbled path → filled ribbon with varying weight, tapered open ends and occasional tiny gaps. */
function pencil(d, w = 3, col = C.line, op = 1, o = {}) {
  const { taper = true, gaps = false, step = 2.2, vary = 1 } = o;
  let out = '';
  for (const s of sample(d, step)) {
    const P = s.pts, n = P.length, L = s.L, ds = L / Math.max(1, n - 1);
    const ph1 = PR() * 6.28, ph2 = PR() * 6.28;
    const cut = new Uint8Array(n);
    if (gaps && L > 80) {
      const g = Math.floor(L / 190 + PR() * 0.95);
      for (let k = 0; k < g; k++) {
        const at = ((0.12 + 0.76 * PR()) * n) | 0, len = Math.max(1, Math.round((2.2 + PR() * 2.4) / ds));
        for (let j = at; j < at + len && j < n; j++) cut[j] = 1;
      }
    }
    let run = [];
    const flush = () => { if (run.length >= 2) out += ribbon(run); run = []; };
    for (let i = 0; i < n; i++) {
      if (cut[i]) { flush(); continue; }
      const t = i * ds;
      let wd = w * (1 + vary * (0.17 * Math.sin(t * 0.045 + ph1) + 0.1 * Math.sin(t * 0.14 + ph2)));
      if (taper && !s.closed) { const e = Math.min(t, L - t); wd *= 0.3 + 0.7 * Math.min(1, e / Math.min(10, L / 3)); }
      run.push([P[i][0], P[i][1], wd]);
    }
    flush();
  }
  if (!out) return '';
  const p = pat(col, 'speck', 0, 60);
  return p.def + `<path d="${out}" fill="url(#${p.id})" opacity="${op}"/>`;
}

function filters(x, y, w, h, D, seed) {
  const R = `filterUnits="userSpaceOnUse" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"`;
  const Q = `filterUnits="userSpaceOnUse" x="${-D}" y="${-D}" width="${2 * D}" height="${2 * D}"`;
  return `
  <filter id="wob" ${R}><feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="grn" ${Q}><feTurbulence type="fractalNoise" baseFrequency="0.95 0.22" numOctaves="3" seed="${seed + 11}" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.3 0 0 0 -1.38" result="a"/>
    <feComposite in="SourceGraphic" in2="a" operator="in"/></filter>
  <filter id="hil" ${Q}><feTurbulence type="fractalNoise" baseFrequency="1.1 0.25" numOctaves="2" seed="${seed + 29}" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.3 0 0 0 -1.46" result="a"/>
    <feComposite in="SourceGraphic" in2="a" operator="in"/></filter>
  <filter id="pgr" ${R}><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed="${seed + 7}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.5" result="ga"/>
    <feComposite in="SourceGraphic" in2="ga" operator="in"/></filter>
  <filter id="pen" ${R}><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${seed + 5}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="blr" ${R}><feGaussianBlur stdDeviation="4.2"/></filter>
  <filter id="blr2" ${R}><feGaussianBlur stdDeviation="9"/></filter>`;
}

/** One rasterizable part. `inner` is authored in pivot-local coords (pivot at cx,cy of a w×h canvas). */
function part(key, w, h, cx, cy, inner, seed = 5, extraDefs = '') {
  const D = Math.ceil(Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy))) + 24;
  const s = `<svg xmlns="${NS}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${filters(-cx - 20, -cy - 20, w + 40, h + 40, D, seed)}${extraDefs}</defs><g transform="translate(${cx} ${cy})">${inner}</g></svg>`;
  return { key: 'chr3-' + key, svg: s, w, h, ax: cx / w, ay: cy / h };
}

// Crayon textures as tiny tileable canvas images (generated once per colour, embedded as SVG <pattern>s).
// Much cheaper to rasterize than feTurbulence filters, so characters load fast on phones.
const TEXC = {}; let PATN = 0;
function texURL(col, type) {
  const key = col + type;
  if (TEXC[key]) return TEXC[key];
  const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), R = rng(type.length * 31 + col.length * 7 + parseInt(col.slice(1, 4), 16));
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
  x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round';
  if (type === 'speck') { // pencil line: solid with pin-holes
    x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) { x.globalAlpha = 0.25 + R() * 0.55; x.fillRect(R() * S, R() * S, 0.8 + R() * 1.4, 0.8 + R() * 1.2); }
  } else { // crayon streaks: short, slightly curved strokes, mostly along x
    const n = type === 'light' ? 520 : 700;
    for (let i = 0; i < n; i++) {
      const px = R() * S, py = R() * S, len = 3 + R() * 12, a = (R() - 0.5) * 0.35, w = 0.6 + R() * 1.5;
      x.globalAlpha = 0.18 + R() * 0.62; x.lineWidth = w;
      wrap(() => { x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + len * 0.5, py + (R() - 0.5) * 2, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke(); });
    }
  }
  return (TEXC[key] = cv.toDataURL('image/png'));
}
function pat(col, type, ang = 0, size = 80) {
  const id = 'tp' + (++PATN);
  return { id, def: `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}" patternTransform="rotate(${ang})"><image href="${texURL(col, type)}" width="${size}" height="${size}"/></pattern></defs>` };
}
const grainLayers = (dd, shade, light, g, l, ang, rule) => {
  let o = '';
  if (shade) { const p = pat(shade, 'shade', ang); o += p.def + `<path d="${dd}" fill-rule="${rule}" fill="url(#${p.id})" opacity="${Math.min(1, g * 1.25)}"/>`; }
  if (light) { const p = pat(light, 'light', ang + 8, 72); o += p.def + `<path d="${dd}" fill-rule="${rule}" fill="url(#${p.id})" opacity="${Math.min(1, l * 1.2)}"/>`; }
  return o;
};
/** Crayon-filled shape: wobbled opaque base + streak grain + pencil outline (registered by the wobble field). */
function blob(d, col, o = {}) {
  const { shade, light, g = 0.42, l = 0.3, lw = 3.1, line = C.line, ang = -32, outline = true, open = null, rule = 'nonzero' } = o;
  const dd = polyD(sample(d, 3));
  return `<path d="${dd}" fill="${col}" fill-rule="${rule}"/>` + grainLayers(dd, shade, light, g, l, ang, rule) + (outline ? pencil(open || d, lw, line) : '');
}
const dot = (x, y, rx, ry, col = C.ink) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${rx}" ry="${ry}" fill="${col}"/>`;
function ellD(cx, cy, rx, ry, rot = 0) {
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const p = (t) => [cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c];
  const [x0, y0] = p(0), [x1, y1] = p(Math.PI);
  return `M${n1(x0)} ${n1(y0)} A${rx} ${ry} ${rot} 0 1 ${n1(x1)} ${n1(y1)} A${rx} ${ry} ${rot} 0 1 ${n1(x0)} ${n1(y0)} Z`;
}
const cubicPt = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };

// ---------------------------------------------------------------- shared face parts
function eyeParts(k, lashes, big = 1) {
  const L = lashes ? pencil('M5.5 -6.5 L10.5 -11.5 M8.5 -2.5 L14 -5', 2.1, C.inkSoft, 1, { gaps: false }) : '';
  const Lc = lashes ? pencil('M9 0 L13.5 4.5 M5 3.5 L8 8', 2.1, C.inkSoft, 1, { gaps: false }) : '';
  const arc = (d, w = 3.4) => pencil(d, w, C.ink, 1, { gaps: false, vary: 0.6 });
  return [
    part(`${k}-eye-open`, 44, 44, 22, 22, dot(0, 0, 6 * big, 8.6 * big) + L),
    part(`${k}-eye-wide`, 44, 48, 22, 24, dot(0, 0, 7.2 * big, 10.6 * big) + `<ellipse cx="${-2 * big}" cy="${-4 * big}" rx="1.8" ry="2.2" fill="#fff" opacity=".9"/>` + L),
    part(`${k}-eye-closed`, 44, 40, 22, 20, arc(`M${-11 * big} -2 Q0 ${8 * big} ${11 * big} -2`) + Lc),
    part(`${k}-eye-happy`, 44, 40, 22, 20, arc(`M${-11 * big} 4 Q0 ${-9 * big} ${11 * big} 4`, 3.6)),
    part(`${k}-eye-blink`, 44, 30, 22, 15, arc(`M${-9 * big} 0 Q0 2.5 ${9 * big} 0`, 3.2) + (lashes ? pencil('M9 0 L13 -3', 2.1, C.inkSoft) : '')),
    part(`${k}-eye-content`, 44, 40, 22, 20, arc(`M${-12 * big} -3 Q0 ${8 * big} ${12 * big} -3`, 3.3) + Lc),
  ];
}
function mouthParts(k, s = 1) {
  const open = (wd, dp, tongue) => {
    const d = `M${-wd} -4 Q0 ${-1} ${wd} -4 Q${wd - 2} ${dp} 0 ${dp + 1} Q${-wd + 2} ${dp} ${-wd} -4 Z`;
    const dd = polyD(sample(d, 2));
    return `<path d="${dd}" fill="${C.mouth}"/>` + (tongue ? `<clipPath id="mc"><path d="${dd}"/></clipPath><ellipse clip-path="url(#mc)" cx="0" cy="${dp - 3}" rx="${wd * 0.55}" ry="${dp * 0.42}" fill="${C.tongue}"/>` : '') + pencil(d, 2.9, C.ink, 1, { gaps: false });
  };
  const ln = (d, w = 3.3) => pencil(d, w, C.ink, 1, { gaps: false, vary: 0.6 });
  return [
    part(`${k}-m-smile`, 70, 44, 35, 18, ln(`M${-12 * s} -2 Q0 ${9 * s} ${12 * s} -2`)),
    part(`${k}-m-grin`, 70, 50, 35, 18, open(16 * s, 15 * s, true)),
    part(`${k}-m-laugh`, 80, 60, 40, 20, open(20 * s, 22 * s, true)),
    part(`${k}-m-o`, 50, 50, 25, 25, `<ellipse cx="0" cy="0" rx="${6.5 * s}" ry="${8.5 * s}" fill="${C.mouth}"/><ellipse cx="0" cy="${4 * s}" rx="${4 * s}" ry="${3 * s}" fill="${C.tongue}"/>` + pencil(ellD(0, 0, 6.5 * s, 8.5 * s), 2.9, C.ink, 1, { gaps: false })),
    part(`${k}-m-wavy`, 70, 40, 35, 20, ln(`M${-14 * s} 1 Q${-7 * s} -5 0 0 Q${7 * s} 5 ${14 * s} -1`, 3.1)),
    part(`${k}-m-closed`, 50, 30, 25, 15, ln(`M${-6 * s} 0 Q0 ${3 * s} ${6 * s} 0`, 3.1)),
    part(`${k}-m-frown`, 60, 36, 30, 18, ln(`M${-11 * s} 5 Q0 ${-5 * s} ${11 * s} 5`)),
  ];
}
const brow = (k, wdt = 3.2) => part(`${k}-brow`, 40, 24, 20, 12, pencil('M-11 3 Q-1 -4 11 1', wdt, C.inkSoft, 1, { gaps: false }));
const cheek = (k, rx = 21, ry = 12) => part(`${k}-cheek`, rx * 2 + 34, ry * 2 + 34, rx + 17, ry + 17, `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${C.cheek}" opacity=".9" filter="url(#blr)"/>`);
const question = k => part(`${k}-q`, 60, 80, 30, 40, pencil('M-12 -14 C-12 -30 12 -32 13 -16 C14 -4 0 -2 0 10', 4.2, C.inkSoft) + dot(0, 24, 3.6, 3.6, C.inkSoft));

// ---------------------------------------------------------------- hands (pivot = wrist, fingers point to -y)
// Each hand = an outline silhouette sprite (-o) and a fill sprite (-f). The arm renderer draws
// forearm outline → hand outline → forearm fill → hand fill, so hand + forearm read as ONE silhouette.
function fingersPath(f, start, end, gap = 0) {
  let d = start;
  f.forEach(([a, b, top], i) => {
    const r = (b - a) / 2;
    d += ` L${a} ${top + r} A${r} ${r} 0 0 1 ${b} ${top + r}`;
    if (i < f.length - 1) d += ` L${b} ${top + r + (i === 1 ? 9 : 7) + gap}`;
  });
  return d + end;
}
const HANDS = {
  open: {
    d: fingersPath([[-22.5, -11.5, -57], [-11.5, 0, -67], [0, 11.5, -69], [11.5, 22, -61]], 'M-19 14 L-19 3 C-22 -12 -23.5 -26 -22.5 -40',
      ' L22 -36 C26 -40 31 -47 35 -49 C40 -51 43 -46 40 -40 C35 -30 28 -18 24 -12 C22 -6 21 -2 19 3 L19 14 Z'),
    lines: 'M-11.5 -45 L-11.5 -49 M0 -51 L0 -56 M11.5 -49 L11.5 -53',
    soft: 'M-6 -22 Q2 -18 10 -24',
  },
  rest: { // relaxed hand seen from the back: four little rounded fingers together, thumb peeking at the side
    d: fingersPath([[-22, -11, -50], [-11, 0, -55], [0, 11, -55], [11, 21.5, -49]], 'M-18 14 L-18 4 C-23 -8 -24 -22 -22 -36',
      ' L21.5 -30 C25 -34 30 -38 34 -38 C39 -38 40 -32 37 -27 C33 -20 27 -13 23 -8 C21 -4 20 0 19 4 L19 14 Z', 0),
    lines: 'M-11 -39 L-11 -42 M0 -42 L0 -46 M11 -39 L11 -42',
    soft: 'M-6 -16 Q2 -12 10 -16',
  },
  point: { // "shh" hand: smooth rounded fist with the index finger rising from its thumb-side EDGE (never centred)
    d: 'M-19 14 L-19 2 C-23 -12 -23 -26 -16 -33 C-10 -38 0 -38 5 -36 L5 -68 A6.5 6.5 0 0 1 18 -68 L18 -30 C22 -20 22 -6 18 2 L18 14 Z',
    lines: 'M18 -20 C8 -13 -4 -13 -13 -18 M7 -66 Q11.5 -64 16 -66',
    soft: 'M-14 -28 Q-6 -24 2 -27',
  },
};
function handParts(k) {
  const out = [];
  for (const [name, h] of Object.entries(HANDS)) {
    const dd = polyD(sample(h.d, 2.4));
    out.push(part(`${k}-hand-${name}-o`, 110, 130, 55, 98, `<path d="${dd}" fill="${C.line}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>`, 9));
    out.push(part(`${k}-hand-${name}-f`, 110, 130, 55, 98, `<path d="${dd}" fill="#fff"/>` + grainLayers(dd, C.skinGrain, null, 0.14, 0, -32, 'nonzero') +
      pencil(h.lines, 2.1, C.line, 0.85, { gaps: false }) + pencil(h.soft, 1.8, C.line, 0.45, { gaps: false }), 9));
  }
  return out;
}

// crayon textures for the live-drawn arms (tileable, rasterized once)
function texPart(key, col, shade, light, g = 0.5, l = 0.32) {
  const S = 192, st = 'stitchTiles="stitch"';
  const inner = `<rect x="0" y="0" width="${S}" height="${S}" fill="${col}"/>` +
    (shade ? `<filter id="tg" x="0" y="0" width="${S}" height="${S}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.0625 0.015625" numOctaves="3" ${st} seed="3" result="t0"/><feTurbulence type="fractalNoise" baseFrequency="0.9375 0.25" numOctaves="3" ${st} seed="13" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.3 0 0 0 -1.38" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/></filter><rect width="${S}" height="${S}" fill="${shade}" opacity="${g}" filter="url(#tg)"/>` : '') +
    (light ? `<filter id="tl" x="0" y="0" width="${S}" height="${S}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="1.0417 0.25" numOctaves="2" ${st} seed="31" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.3 0 0 0 -1.46" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/></filter><rect width="${S}" height="${S}" fill="${light}" opacity="${l}" filter="url(#tl)"/>` : '');
  return { key: 'chr3-tex-' + key, svg: `<svg xmlns="${NS}" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${inner}</svg>`, w: S, h: S, ax: 0, ay: 0 };
}
function lineTex(key, col) {
  const S = 192;
  return { key: 'chr3-tex-' + key, w: S, h: S, ax: 0, ay: 0, svg: `<svg xmlns="${NS}" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><filter id="g" x="0" y="0" width="${S}" height="${S}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.9375" numOctaves="1" stitchTiles="stitch" seed="5" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="ga"/><feComposite in="SourceGraphic" in2="ga" operator="in"/></filter><rect width="${S}" height="${S}" fill="${col}" filter="url(#g)"/></svg>` };
}

// soft crayon fade at the very bottom of the torsos (so a hem never reads as a hard box edge)
const FADE = `<linearGradient id="fadeG" x1="0" y1="-300" x2="0" y2="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="0.93" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0.3"/></linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="-300" y="-320" width="600" height="360"><rect x="-300" y="-320" width="600" height="360" fill="url(#fadeG)"/></mask>`;

// ---------------------------------------------------------------- MOM
const MOM_FACE = 'M0 -112 C72 -112 122 -70 124 -6 C127 56 90 113 0 115 C-90 113 -127 56 -124 -6 C-122 -70 -72 -112 0 -112 Z';
function momParts() {
  const k = 'mom';
  // hood: dome + side drapes + bib under the chin with a softly wavy hem (drawn over the upper arms)
  const hood = 'M-168 -18 C-172 -132 -96 -202 0 -202 C100 -202 172 -132 168 -18 C168 62 178 128 188 182 C176 196 160 200 146 206 C120 222 100 218 76 232 C52 246 30 240 0 250 C-30 240 -54 246 -78 232 C-104 218 -126 222 -150 206 C-164 198 -178 194 -188 182 C-178 128 -168 62 -168 -18 Z';
  const fold = pencil('M-14 140 C-12 176 -8 208 -4 240 M58 128 C68 160 78 190 88 222 M-78 132 C-94 162 -106 188 -118 212', 2.4, C.hijabShade, 0.75) +
    pencil('M-158 -52 C-138 -58 -124 -62 -110 -64 M-157 -30 C-140 -33 -128 -34 -114 -33', 2.3, C.hijabShade, 0.8);
  // soft shadow the drape casts on the shirt / arms
  const hoodSvg = `<path d="M-180 196 C-120 236 -60 262 0 266 C60 262 120 236 180 196 L176 176 C120 214 60 236 0 240 C-60 236 -120 214 -176 176 Z" fill="#b5577a" opacity=".22" filter="url(#blr)"/>` +
    blob(hood, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, g: 0.5, l: 0.35 }) + fold;
  // ribbon knot (separate part so it can sit above raised arms)
  const tail1 = 'M-168 -38 C-190 -8 -200 32 -196 76 C-191 80 -186 80 -181 76 C-185 36 -178 2 -158 -28 Z';
  const tail2 = 'M-171 -42 C-202 -30 -219 -4 -226 30 C-222 35 -216 36 -212 33 C-206 6 -192 -16 -163 -31 Z';
  const loop = 'M-166 -50 C-186 -66 -206 -96 -222 -88 C-236 -80 -214 -56 -172 -44';
  const knot = blob(tail2, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, lw: 2.8 }) +
    blob(tail1, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, lw: 2.8 }) +
    `<path d="${polyD(sample(loop, 3))}" fill="none" stroke="${C.hijabLine}" stroke-width="11" stroke-linecap="round"/><path d="${polyD(sample(loop, 3))}" fill="none" stroke="${C.hijab}" stroke-width="6.5" stroke-linecap="round"/>` +
    blob(ellD(-169, -44, 12, 14, 10), C.hijab, { shade: C.hijabShade, line: C.hijabLine, lw: 2.6 });

  // forehead band + scalloped lace cap peeking under it
  const E1 = [[-123, 2], [-126, -60], [-76, -101], [0, -101]], E2 = [[0, -101], [76, -101], [126, -60], [123, 2]];
  const pts = []; const N = 7;
  for (let i = 0; i <= N; i++) pts.push(cubicPt(...E1, 0.18 + 0.82 * i / N));
  for (let i = 1; i <= N; i++) pts.push(cubicPt(...E2, 0.82 * i / N));
  let sc = `M${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) { const r = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / 2 + 0.6; sc += ` A${n1(r)} ${n1(r)} 0 0 0 ${n1(pts[i][0])} ${n1(pts[i][1])}`; }
  const scFill = sc + ` L${n1(pts[pts.length - 1][0])} ${n1(pts[pts.length - 1][1] - 10)} L${n1(pts[0][0])} ${n1(pts[0][1] - 10)} Z`;
  const band = 'M-123 2 C-126 -60 -76 -101 0 -101 C76 -101 126 -60 123 2 L139 8 C146 -82 86 -130 0 -130 C-86 -130 -146 -82 -139 8 Z';
  const hoodFront = `<path d="${polyD(sample(scFill, 2))}" fill="#fff"/>` + pencil(sc, 2.5, C.lace, 1, { gaps: false }) +
    blob(band, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, open: 'M-123 2 C-126 -60 -76 -101 0 -101 C76 -101 126 -60 123 2', g: 0.5 });

  // shirt: rounded shoulders, slightly tapered sides, soft wavy hem that scenes may crop
  const shirt = 'M-80 -250 C-126 -246 -160 -230 -176 -198 C-190 -168 -188 -132 -182 -104 C-176 -76 -172 -42 -166 -8 C-128 6 -80 13 -30 14 C20 15 80 13 122 8 C146 5 160 0 166 -8 C172 -42 176 -76 182 -104 C188 -132 190 -168 176 -198 C160 -230 126 -246 80 -250 C40 -258 -40 -258 -80 -250 Z';
  const body = `<g mask="url(#fade)">` + blob(shirt, C.pink, { shade: C.pinkShade, light: '#fff', g: 0.5, l: 0.35, line: C.pinkLine, open: 'M-166 -8 C-172 -42 -176 -76 -182 -104 C-188 -132 -190 -168 -176 -198 C-160 -230 -126 -246 -80 -250 C-40 -258 40 -258 80 -250 C126 -246 160 -230 176 -198 C190 -168 188 -132 182 -104 C176 -76 172 -42 166 -8' }) +
    pencil('M-166 -8 C-128 6 -80 13 -40 14 M-10 15 C30 15 80 13 122 8 C146 5 160 0 166 -8', 2.4, C.pinkLine, 0.75) + pencil('M-170 -96 C-150 -90 -132 -92 -118 -98 M170 -96 C150 -90 132 -92 118 -98', 2, C.pinkShade, 0.7) + '</g>' +
    pencil('M-150 -52 C-80 -38 70 -40 148 -54', 2.4, C.pinkShade, 0.9) + pencil('M-60 -150 C-50 -110 -54 -80 -64 -60', 2.1, C.pinkShade, 0.6);
  const fadeDefs = FADE;

  return [
    part('mom-body', 410, 300, 205, 270, body, 21, fadeDefs),
    part('mom-hood', 420, 500, 210, 222, hoodSvg, 17),
    part('mom-knot', 130, 210, 250, 110, knot, 19),
    part('mom-face', 290, 270, 145, 133, blob(MOM_FACE, C.skin, { shade: C.skinGrain, g: 0.14 }), 4),
    part('mom-hoodfront', 330, 175, 165, 145, hoodFront, 17),
    part('mom-nose', 40, 40, 20, 20, pencil('M-1 -8 C8 -9 10 2 2 4', 2.7, C.inkSoft, 1, { gaps: false })),
    ...eyeParts(k, true), ...mouthParts(k), brow(k), cheek(k), question(k), ...handParts(k),
    texPart('pink', C.pink, C.pinkShade, '#fff'), lineTex('pinkLine', C.pinkLine),
  ];
}

// ---------------------------------------------------------------- DAD
const DAD_FACE = 'M0 -124 C86 -124 145 -76 147 -2 C149 70 104 128 0 128 C-104 128 -149 70 -147 -2 C-145 -76 -86 -124 0 -124 Z';
function dadHair() {
  const R = rng(77);
  // wavy cloud silhouette over the top + swept fringe with curl tips (no closed outline — strokes break the edge)
  const cx = 0, cy = -96, rx = 178, ry = 150;
  const a0 = Math.PI * 1.03, a1 = -Math.PI * 0.035, N = 9;
  const P = t => [cx + rx * Math.cos(t), cy - ry * Math.sin(t)];
  let top = 'M-150 -6 C-166 -24 -176 -52 ' + P(a0).map(n1).join(' ');
  for (let i = 1; i <= N; i++) {
    const ta = a0 + (a1 - a0) * (i - 1) / N, tb = a0 + (a1 - a0) * i / N, tm = (ta + tb) / 2, bulge = 1.07 + R() * 0.05;
    top += ` Q${n1(cx + rx * bulge * Math.cos(tm - 0.05))} ${n1(cy - ry * bulge * Math.sin(tm - 0.05))} ${P(tb).map(n1).join(' ')}`;
  }
  top += ' C174 -60 164 -26 150 -12';
  const fringe = ' Q140 -40 128 -58 Q124 -44 112 -40 Q100 -60 84 -70 Q70 -58 56 -60 Q44 -80 22 -86 Q6 -74 -10 -80 Q-30 -98 -56 -94 Q-66 -80 -82 -82 Q-100 -90 -116 -78 Q-122 -60 -134 -56 Q-144 -34 -150 -6 Z';
  const d = top + fringe;
  const dd = polyD(sample(d, 3));
  const loop = (x, y, s, rot, col, w, op) => `<path transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(rot)}) scale(${n1(s)})" d="M-8 2 C-4 -10 10 -10 10 -1 C10 7 0 9 -3 3 C-6 -3 2 -8 8 -6 C14 -4 16 2 15 7" stroke="${col}" stroke-width="${n1(w / s)}" fill="none" stroke-linecap="round" opacity="${op}"/>`;
  // layer 1: sweeping strokes following the head curve
  let tex = '';
  const cols = [C.hairDark, C.hairDark, '#626160', C.hairMid, C.hairMid, '#9a9997', C.hairLight];
  for (let i = 0; i < 300; i++) {
    const u = R(), v = 0.25 + 0.8 * Math.sqrt(R());
    const ang = Math.PI * (1.1 - u * 1.2);
    const px = rx * 0.98 * v * Math.cos(ang), py = -40 - ry * 1.12 * v * Math.sin(ang);
    const tang = ang - Math.PI / 2 + 0.35 + (R() - 0.5) * 0.5;
    const len = 30 + R() * 60, nx = -Math.sin(tang), ny = -Math.cos(tang);
    const dx = Math.cos(tang) * len / 2, dy = -Math.sin(tang) * len / 2, bend = (R() - 0.5) * 22;
    tex += `<path d="M${n1(px - dx)} ${n1(py - dy)} Q${n1(px + nx * bend)} ${n1(py + ny * bend)} ${n1(px + dx)} ${n1(py + dy)}" stroke="${cols[(R() * cols.length) | 0]}" stroke-width="${n1(1.4 + R() * 2.6)}" fill="none" stroke-linecap="round" opacity="${n1(0.5 + R() * 0.45)}"/>`;
  }
  // layers 2–3: dark scribble curls + a few light ones
  for (let i = 0; i < 26; i++) {
    const ang = Math.PI * (1.08 - R() * 1.16), v = 0.3 + 0.7 * Math.sqrt(R());
    tex += loop(rx * 0.9 * v * Math.cos(ang), -50 - ry * 1.05 * v * Math.sin(ang), 0.7 + R() * 0.6, R() * 360, ['#555', '#5e5e5e', '#666'][(R() * 3) | 0], 1.8 + R() * 1.2, 0.6);
  }
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * (1.0 - R() * 1.0), v = 0.4 + 0.5 * R();
    tex += loop(rx * 0.85 * v * Math.cos(ang), -60 - ry * v * Math.sin(ang), 0.8 + R() * 0.6, R() * 360, '#c9c8c6', 1.6, 0.45);
  }
  // broken silhouette: short dark strokes + curls riding the edge (half outside the shape)
  let edge = '';
  const [S] = sample(top, 3);
  for (let i = 2; i < S.pts.length - 3; i += 4 + ((R() * 3) | 0)) {
    const a = S.pts[i], b = S.pts[Math.min(i + 5, S.pts.length - 1)], o = (R() - 0.3) * 4;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - o;
    edge += `<path d="M${n1(a[0])} ${n1(a[1])} Q${n1(mx)} ${n1(my - 3)} ${n1(b[0])} ${n1(b[1])}" stroke="${R() < 0.7 ? C.hairDark : '#777'}" stroke-width="${n1(2 + R() * 1.4)}" fill="none" stroke-linecap="round" opacity=".85"/>`;
    if (R() < 0.12) edge += loop(a[0], a[1] - 2, 0.9 + R() * 0.5, R() * 360, '#5a5a5a', 2.2, 0.85);
  }
  const fringeLine = pencil('M150 -12' + fringe.replace(/ Z$/, ''), 2.6, C.hairDark, 0.75);
  const curl = pencil('M18 -84 C10 -72 12 -58 24 -58 C34 -58 34 -70 26 -70', 2.8, C.hairDark, 0.9, { gaps: false }) + pencil('M-40 -92 C-46 -82 -44 -74 -36 -72', 2.4, C.hairDark, 0.8, { gaps: false });
  const defs = `<clipPath id="hc"><path d="${dd}"/></clipPath>`;
  return { svgIn: `<path d="${dd}" fill="${C.hair}"/><g clip-path="url(#hc)"><g filter="url(#pen)">${tex}</g></g><g filter="url(#pen)">${edge}</g>` + fringeLine + curl, defs };
}
function dadParts() {
  const k = 'dad';
  const hair = dadHair();
  const ear = blob('M-8 -26 C16 -34 32 -12 28 8 C24 28 4 32 -8 24 Z', C.skin, { shade: C.skinGrain, g: 0.14, open: 'M-8 -26 C16 -34 32 -12 28 8 C24 28 4 32 -8 24' }) + pencil('M4 -12 C16 -10 18 4 9 11 M9 -2 Q12 2 8 5', 2.3);
  const shirt = 'M-94 -230 C-134 -224 -162 -206 -176 -176 C-186 -150 -184 -112 -178 -76 C-174 -48 -172 -26 -170 -4 C-150 0 -134 -6 -116 2 C-80 10 -40 8 0 10 C40 12 90 8 130 6 C150 5 160 2 170 -2 C172 -26 174 -48 178 -76 C184 -112 186 -150 176 -176 C162 -206 134 -224 94 -230 C74 -233 54 -231 42 -226 C22 -212 -22 -212 -42 -226 C-54 -231 -74 -233 -94 -230 Z';
  const neck = 'M-40 -270 L-40 -224 C-22 -208 22 -208 40 -224 L40 -270 Z';
  const body = blob(neck, C.skin, { shade: C.skinGrain, g: 0.14, open: 'M-40 -262 L-40 -224 M40 -224 L40 -262' }) + `<g mask="url(#fade)">` +
    blob(shirt, C.green, { shade: C.greenShade, light: C.greenLight, g: 0.5, l: 0.3, line: C.greenLine, open: 'M-170 -4 C-172 -26 -174 -48 -178 -76 C-184 -112 -186 -150 -176 -176 C-162 -206 -134 -224 -94 -230 C-74 -233 -54 -231 -42 -226 C-22 -212 22 -212 42 -226 C54 -231 74 -233 94 -230 C134 -224 162 -206 176 -176 C186 -150 184 -112 178 -76 C174 -48 172 -26 170 -2' }) +
    pencil('M-170 -4 C-150 0 -134 -6 -116 2 C-80 10 -40 8 -6 10 M30 11 C70 10 104 8 130 6 C150 5 160 2 170 -2', 2.4, C.greenLine, 0.7) + pencil('M-158 -150 C-142 -136 -132 -120 -128 -100 M158 -150 C142 -136 132 -120 128 -100 M-150 -4 C-140 -14 -124 -16 -112 -10', 2.1, C.greenShade, 0.7) + '</g>' +
    pencil('M-46 -224 C-26 -204 26 -204 46 -224', 2.5, C.greenLine, 0.9) +     pencil('M-40 -150 C-30 -110 -36 -70 -46 -46', 2.1, C.greenShade, 0.5);
  const R = rng(19); let stub = '';
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.05 + R() * 0.9) * (R() < 0.42 ? -1 : 1), rr = 0.78 + R() * 0.32;
    const x = Math.cos(a) * 46 * rr, y = 6 + Math.sin(a) * 26 * rr;
    if (Math.abs(x) < 16 && y > -10 && y < 18) continue;
    stub += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(1.5 + R() * 0.8)}" fill="#8b8583"/>`;
  }
  return [
    part('dad-body', 420, 320, 210, 296, body, 23, FADE),
    part('dad-ear', 70, 80, 22, 40, ear, 6),
    part('dad-face', 320, 280, 160, 138, blob(DAD_FACE, C.skin, { shade: C.skinGrain, g: 0.14 }), 8),
    part('dad-hair', 440, 310, 220, 274, hair.svgIn, 31, hair.defs),
    part('dad-nose', 40, 40, 20, 20, pencil('M5 -9 C-6 -11 -9 4 3 5', 2.8, C.inkSoft, 1, { gaps: false })),
    part('dad-stubble', 130, 90, 65, 40, `<g>${stub}</g>`),
    ...eyeParts(k, false), ...mouthParts(k, 1.08), brow(k, 3.7), cheek(k, 22, 12), question(k), ...handParts(k),
    texPart('skin', '#ffffff', C.skinGrain, null, 0.2), texPart('green', C.green, C.greenShade, C.greenLight, 0.5, 0.3),
    lineTex('line', C.line), lineTex('greenLine', C.greenLine),
  ];
}

// ---------------------------------------------------------------- BABY
function babyParts() {
  const k = 'baby';
  const R = rng(5);
  const sw = 'M-66 -124 C-96 -116 -114 -86 -118 -54 C-122 -20 -98 4 -50 7 C-20 9 20 9 50 7 C98 4 122 -20 118 -54 C114 -86 96 -116 66 -124 C36 -132 -36 -132 -66 -124 Z';
  const swdd = polyD(sample(sw, 3));
  const centres = [[-60, -44, 30], [-10, -20, 17], [70, -30, 18], [-80, -86, 14]];
  const scol = [C.swirl, C.swirl2, C.swirl3];
  const swirls = (cs, rings) => {
    let s = '';
    for (const [x0, y0, rmax] of cs) for (let ring = 0; ring < rings; ring++) {
      const r0 = 5 + ring * rmax / 4.2, a0 = R() * 6.28, span = 3.6 + R() * 1.8;
      let d = '';
      for (let q = 0; q <= 18; q++) { const a = a0 + span * q / 18, rr = r0 * (1 + 0.25 * q / 18); d += (q ? ' L' : 'M') + n1(x0 + Math.cos(a) * rr * 1.25) + ' ' + n1(y0 + Math.sin(a) * rr * 0.8); }
      s += `<path d="${d}" stroke="${scol[ring % 3]}" stroke-width="${n1(2.4 + R() * 1.6)}" fill="none" stroke-linecap="round" opacity=".9"/>`;
    }
    return s;
  };
  let sw2 = swirls(centres, 5);
  for (let i = 0; i < 16; i++) {
    const y = -118 + i * 8 + R() * 5, x = -110 + R() * 20, len = 60 + R() * 120;
    sw2 += `<path d="M${n1(x)} ${n1(y)} q${n1(len * 0.3)} ${n1(-12 + R() * 8)} ${n1(len * 0.55)} ${n1(-2 + R() * 6)} t${n1(len * 0.45)} ${n1(-4 + R() * 8)}" stroke="${scol[(R() * 3) | 0]}" stroke-width="${n1(1.8 + R() * 1.6)}" fill="none" stroke-linecap="round" opacity=".65"/>`;
  }
  const starSvg = list => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="${C.starLight}" stroke-width="2" opacity=".55"/>` +
    `<path d="${polyD(sample(ellD(x, y, r, r * 0.92, R() * 40), 2))}" fill="${C.star}"/>` + `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="${C.starLight}" opacity=".7"/>`).join('');
  // tucked flap: the blanket corner wrapped diagonally across the chest
  const flap = 'M-30 -128 C-16 -96 -2 -66 22 -36 C40 -14 64 2 92 2 C114 -10 122 -32 118 -56 C114 -88 96 -116 66 -124 C34 -132 0 -132 -30 -128 Z';
  const flapdd = polyD(sample(flap, 3));
  const swDefs = `<clipPath id="sc"><path d="${swdd}"/></clipPath><clipPath id="fc"><path d="${flapdd}"/></clipPath>`;
  const swaddle = `<ellipse cx="0" cy="2" rx="96" ry="8" fill="#1d2b55" opacity=".18" filter="url(#blr)"/><path d="${swdd}" fill="${C.blue}"/>` +
    `<g clip-path="url(#sc)"><g filter="url(#pen)">${sw2}</g>${starSvg([[-66, -40, 13], [-26, -16, 8], [-92, -76, 6], [-6, -60, 5]])}` +
    grainLayers(swdd, C.blueDeep, null, 0.45, 0, -30, 'nonzero') + '</g>' +
    // flap (slightly lighter, its own swirls + stars) with a soft shadow under its edge
    `<path d="M-36 -126 C-22 -94 -8 -64 16 -34 C34 -12 58 4 86 6" stroke="#14275f" stroke-width="9" fill="none" opacity=".4" filter="url(#blr)"/>` +
    `<path d="${flapdd}" fill="#3460c2"/><g clip-path="url(#fc)"><g filter="url(#pen)">${swirls([[60, -80, 24], [70, -24, 16]], 4)}</g>${starSvg([[40, -100, 9], [94, -50, 6]])}</g>` +
    pencil('M-30 -128 C-16 -96 -2 -66 22 -36 C40 -14 64 2 92 2', 2.9, C.blueLine, 0.95) +
    pencil('M-104 -96 C-76 -84 -50 -82 -26 -88 M-100 -62 C-80 -54 -60 -52 -40 -58', 2.3, C.blueDeep, 0.85) + pencil('M30 -116 C44 -104 60 -98 80 -98', 2.1, '#1a3070', 0.7) + pencil(sw, 3, C.blueLine, 0.85);

  const head = 'M0 -76 C64 -76 106 -46 106 4 C106 50 62 76 0 76 C-62 76 -106 50 -106 4 C-106 -46 -64 -76 0 -76 Z';
  const earR = 'M96 -10 C114 -16 124 2 116 14 C110 24 98 24 92 18';
  const earL = 'M-96 -10 C-114 -16 -124 2 -116 14 C-110 24 -98 24 -92 18';
  const headSvg = blob(earR + ' Z', C.skin, { open: earR, lw: 2.9 }) + blob(earL + ' Z', C.skin, { open: earL, lw: 2.9 }) +
    pencil('M-108 3 C-114 -3 -116 8 -110 12', 2.1) +
    blob(head, C.skin, { shade: C.skinGrain, g: 0.14 }) +
    pencil('M-94 -22 C-84 -54 -46 -68 -6 -69 M10 -69 C46 -67 80 -54 94 -30', 2.3, C.line, 0.85) +
    pencil('M-16 -69 Q-10 -60 -3 -55 M-2 -70 Q3 -62 9 -58 M24 -68 Q30 -61 37 -59', 2.3, C.line, 0.9, { gaps: false }) +
    pencil('M106 6 C112 4 113 12 108 14', 2.1, C.line, 0.6);
  return [
    part('baby-swaddle', 270, 160, 135, 146, swaddle, 41, swDefs),
    part('baby-head', 260, 190, 130, 95, headSvg, 3),
    ...eyeParts(k, false, 1.02), ...mouthParts(k, 0.9), brow(k, 2.6), cheek(k, 18, 10.5), question(k),
  ];
}

// ---------------------------------------------------------------- rig configs
const CFG = {
  mom: { parts: momParts, h: 560, w: 370, neck: [0, -232], face: -118, shoulder: [136, -200], L1: 92, L2: 88, handS: 1, facing: 13, faceR: [124, 114], elbow: [186, -146],
    eye: [37, 4], brow: [41, -30], cheek: [80, 36], mouth: [3, 56], nose: [8, 27],
    arm: { upperW: 54, foreW: 50, fill: 'pink', line: 'pinkLine', toWrist: true, shadow: 'rgba(226,138,178,0.55)' } },
  dad: { parts: dadParts, h: 600, w: 380, neck: [0, -236], face: -128, shoulder: [144, -198], L1: 96, L2: 92, handS: 1.1, facing: -13, faceR: [147, 126], elbow: [184, -116],
    eye: [42, 2], brow: [45, -34], cheek: [92, 34], mouth: [0, 64], nose: [-3, 28], stubble: [0, 58], ears: 146,
    arm: { upperW: 42, foreW: 40, fill: 'skin', line: 'line', shadow: 'rgba(240,214,204,0.55)', sleeve: { w: 66, len: 0.62, fill: 'green', line: 'greenLine' } } },
  baby: { parts: babyParts, h: 230, w: 230, neck: [0, -92], face: -58, facing: 0, faceR: [106, 76],
    eye: [33, 6], brow: [33, -16], cheek: [62, 24], mouth: [0, 27] },
};

// mood → face + pose description
const FACE = {
  idle: { eye: 'open', mouth: 'smile', brow: [0, 0], cheek: 1 },
  happy: { eye: 'happy', mouth: 'grin', brow: [-7, 0.05], cheek: 1.18 },
  cheer: { eye: 'happy', mouth: 'laugh', brow: [-10, 0.08], cheek: 1.25 },
  surprised: { eye: 'wide', mouth: 'o', brow: [-13, 0.22], cheek: 1.05 },
  adore: { eye: 'happy', mouth: 'smile', brow: [-6, 0.2], cheek: 1.25 },
  soft: { eye: 'happy', mouth: 'smile', brow: [-3, 0.16], cheek: 1.15 },
  shh: { eye: 'content', mouth: 'closed', brow: [-4, 0.18], cheek: 1.1, gaze: [0, 0.3] },
  think: { eye: 'open', mouth: 'wavy', brow: [-4, 0], browR: [-12, -0.12], cheek: 0.9, gaze: [0.55, -0.75] },
  sad: { eye: 'open', mouth: 'frown', brow: [-4, 0.35], cheek: 0.8, gaze: [0, 0.7] },
  sleep: { eye: 'closed', mouth: 'closed', brow: [3, -0.05], cheek: 1 },
};
const BABY_FACE = {
  idle: { eye: 'content', mouth: 'smile', cheek: 1.05 },
  happy: { eye: 'happy', mouth: 'grin', cheek: 1.2 },
  cheer: { eye: 'happy', mouth: 'laugh', cheek: 1.3 },
  surprised: { eye: 'wide', mouth: 'o', brow: [-6, 0.1], cheek: 1 },
  adore: { eye: 'content', mouth: 'smile', cheek: 1.15 },
  soft: { eye: 'content', mouth: 'smile', cheek: 1.1 },
  shh: { eye: 'content', mouth: 'closed', cheek: 1.05 },
  think: { eye: 'open', mouth: 'wavy', brow: [-3, -0.1], cheek: 0.9, gaze: [0.5, -0.8] },
  sad: { eye: 'open', mouth: 'frown', brow: [-2, 0.4], cheek: 0.8, gaze: [0, 0.6] },
  sleep: { eye: 'content', mouth: 'closed', cheek: 1.05 },
};
const POSE = { // arm pose per side (viewer-left, viewer-right) + head tilt + body lean
  idle: { arms: ['rest', 'rest'], tilt: 0, lean: 0 },
  happy: { arms: ['up', 'up'], tilt: 0.03, lean: 0 },
  cheer: { arms: ['clap', 'clap'], tilt: 0, lean: 0 },
  surprised: { arms: ['cheek', 'cheek'], tilt: 0, lean: -0.02 },
  adore: { arms: ['cheek', 'cheek'], tilt: 0.07, lean: 0.02 },
  soft: { arms: ['chest', 'chest'], tilt: 0.09, lean: 0 },
  shh: { arms: ['shh', 'shh'], tilt: 0.08, lean: 0.03 },
  think: { arms: ['think', 'think'], tilt: 0.1, lean: 0 },
  sad: { arms: ['clasp', 'clasp'], tilt: 0.08, lean: 0 },
  sleep: { arms: ['clasp', 'clasp'], tilt: 0.13, lean: 0 },
};

// ---------------------------------------------------------------- Character
const damp = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const patCache = new WeakMap();

export class Character extends Node {
  constructor(kind, sprites, opts = {}) {
    super();
    this.kind = kind; this.cfg = CFG[kind]; this.S = sprites;
    this.base = 'idle'; this.mood = 'idle';
    this._t = Math.random() * 10; this._react = 0; this._talk = 0; this.look = null;
    this.frozen = !!opts.frozen;
    this._blink = 0; this._nextBlink = 1 + Math.random() * 3;
    this._gaze = { x: 0, y: 0 }; this._wander = { x: 0, y: 0 }; this._nextWander = 1 + Math.random() * 2;
    this._sq = 0; this._sqv = 0; this._tilt = 0; this._lean = 0; this._cheek = 1; this._browY = 0; this._browR = 0; this._browY2 = 0; this._browR2 = 0;
    this._hop = 0; this._hopT = 0; this._wig = 0; this._q = 0;
    this.w = this.cfg.w; this.h = this.cfg.h + 10; this.ax = 0.5; this.ay = 1;
    this._build();
  }
  node(key, o = {}) { const sp = this.S[key]; const nd = new Node({ ax: sp.ax, ay: sp.ay, ...o }); nd.setImage(sp); return nd; }
  _build() {
    const c = this.cfg, k = this.kind;
    this.rig = this.add(new Node());
    if (c.arm) this.back = this.rig.add(new Node({ drawFn: ctx => this._drawBack(ctx) }));
    this.body = this.rig.add(this.node(k === 'baby' ? 'baby-swaddle' : `${k}-body`));
    if (c.arm) this.mid = this.rig.add(new Node({ drawFn: ctx => this._drawMid(ctx) }));
    this.headPivot = this.rig.add(new Node({ x: c.neck[0], y: c.neck[1] }));
    this.head = this.headPivot.add(new Node({ y: c.face }));
    if (k === 'mom') this.hood = this.head.add(this.node('mom-hood'));
    if (k === 'dad') { this.earL = this.head.add(this.node('dad-ear', { x: -c.ears, y: 6, sx: -1 })); this.earR = this.head.add(this.node('dad-ear', { x: c.ears, y: 6 })); }
    this.face = this.head.add(this.node(k === 'baby' ? 'baby-head' : `${k}-face`));
    const F = this.features = this.head.add(new Node({ x: c.facing }));
    this.cheekL = F.add(this.node(`${k}-cheek`, { x: -c.cheek[0], y: c.cheek[1] }));
    this.cheekR = F.add(this.node(`${k}-cheek`, { x: c.cheek[0], y: c.cheek[1] }));
    if (c.stubble) F.add(this.node('dad-stubble', { x: c.stubble[0], y: c.stubble[1] }));
    this.eyeL = F.add(this.node(`${k}-eye-open`, { x: -c.eye[0], y: c.eye[1], sx: -1 }));
    this.eyeR = F.add(this.node(`${k}-eye-open`, { x: c.eye[0], y: c.eye[1] }));
    this.browL = F.add(this.node(`${k}-brow`, { x: -c.brow[0], y: c.brow[1], sx: -1 }));
    this.browR = F.add(this.node(`${k}-brow`, { x: c.brow[0], y: c.brow[1] }));
    if (c.nose) F.add(this.node(`${k}-nose`, { x: c.nose[0], y: c.nose[1] }));
    this.mouth = F.add(this.node(`${k}-m-smile`, { x: c.mouth[0], y: c.mouth[1] }));
    if (k === 'mom') this.front = this.head.add(this.node('mom-hoodfront'));
    if (k === 'dad') this.front = this.head.add(this.node('dad-hair'));
    const qs = c.facing >= 0 ? 1 : -1;
    this._qy = k === 'baby' ? -c.faceR[1] * 0.95 : -c.faceR[1] * 0.75;
    this.qmark = this.head.add(this.node(`${k}-q`, { x: qs * (c.faceR[0] + (k === 'baby' ? 18 : 64)), y: this._qy, alpha: 0, rot: qs * 0.2 }));
    if (k === 'baby') { this.browL.alpha = this.browR.alpha = 0; }
    if (c.arm) {
      this.frontArms = this.rig.add(new Node({ drawFn: ctx => this._drawFront(ctx) }));
      this._order = [0, 1];
      this.arms = [-1, 1].map(side => {
        const a = { side, vx: 0, vy: 0, hr: 0, type: 'rest' };
        const rest = this._target(side, 'rest'); a.x = rest.x; a.y = rest.y;
        return a;
      });
    }
    if (k === 'mom') { // ribbon knot rides on top of everything (never hidden by a raised arm)
      this.knotPivot = this.rig.add(new Node());
      this.knot = this.knotPivot.add(this.node('mom-knot', { y: c.face }));
    }
  }
  // ---- API
  setMood(m) { if (!FACE[m]) m = 'idle'; this.base = m; if (this._react <= 0) this.mood = m; return this; }
  react(m, sec = 1.6) {
    if (!FACE[m]) m = 'idle';
    this.mood = m; this._react = Math.max(0.2, sec);
    this._sqv += m === 'sad' || m === 'think' || m === 'soft' || m === 'shh' ? -1.2 : -2.4; // anticipation squash → springs into a stretch
    if (m === 'surprised') this._hop = Math.max(this._hop, 1);
    return this;
  }
  talk(sec = 1.2) { this._talk = sec; return this; }
  lookAt(x, y) { this.look = x == null ? null : { x, y }; return this; }

  // ---- internals
  _headXY(hx, hy) { // head-local point → rig coords (through head tilt)
    const p = this.headPivot, r = p.rot, cs = Math.cos(r), sn = Math.sin(r);
    const x = hx + this.head.x, y = hy + this.head.y;
    return { x: p.x + x * cs - y * sn, y: p.y + x * sn + y * cs };
  }
  _target(side, type) {
    const c = this.cfg, [sx, sy] = c.shoulder, reach = c.L1 + c.L2, t = this._t;
    switch (type) {
      case 'cheek': { const p = this._headXY(side * c.faceR[0] * 0.84 + c.facing * 0.4, c.faceR[1] * 0.92); return { x: p.x, y: p.y, hand: 'open', rot: -side * 0.2 + this.headPivot.rot, abs: true, elbow: [side * c.elbow[0], c.elbow[1]] }; }
      case 'think': { // palm on one cheek (head tilts into it), the other arm resting
        const cs = c.facing >= 0 ? 1 : -1;
        if (side === cs) { const p = this._headXY(side * c.faceR[0] * 0.8 + c.facing * 0.4, c.faceR[1] * 0.86); return { x: p.x, y: p.y, hand: 'open', rot: -side * 0.32 + this.headPivot.rot, abs: true, elbow: [side * (c.elbow[0] - 30), c.elbow[1] + 30] }; }
        return this._target(side, 'rest');
      }
      case 'shh': { // index finger to the lips (fist visible below the mouth), the other arm resting
        const cs = c.facing >= 0 ? 1 : -1;
        if (side !== cs) return this._target(side, 'rest');
        const hs = c.handS, rot = this.headPivot.rot - side * 0.42, m = this._headXY(c.facing + c.mouth[0], c.mouth[1] - 4);
        const tx = 11.5 * (-side * hs), ty = -75 * hs, cr = Math.cos(rot), sr = Math.sin(rot);
        return { x: m.x - (tx * cr - ty * sr), y: m.y - (tx * sr + ty * cr), hand: 'point', rot, abs: true, elbow: [side * (c.elbow[0] - 40), c.elbow[1] + 30] };
      }
      case 'clap': { const g = 6 + 34 * (0.5 + 0.5 * Math.cos(t * 14)); return this.kind === 'dad' ? { x: side * (g + 14), y: sy + 2, hand: 'open', rot: side * 0.15, abs: true, low: true, mode: 'whole' } : { x: side * (g + 14), y: sy + 6, hand: 'open', rot: side * 0.15, abs: true, elbow: [side * (c.elbow[0] - 22), c.elbow[1] + 40] }; }
      case 'up': { const w = Math.sin(t * 6 + side) * 12; if (this.kind === 'mom') { const a = 0.87, R = reach * 0.9; return { x: side * (sx + R * Math.sin(a)) + w, y: sy - R * Math.cos(a), hand: 'open', rot: side * 0.42 + Math.sin(t * 6 + side) * 0.15, abs: true }; } return { x: side * (sx + 78) + w, y: sy - reach * 0.84, hand: 'open', rot: side * 0.18 + Math.sin(t * 6 + side) * 0.2, abs: true }; }
      case 'chest': return this.kind === 'mom' ? { x: side * 34, y: -88, hand: 'rest', rot: -side * 1.3, abs: true, low: true, mode: 'whole' } : { x: side * 20, y: sy + 40, hand: 'rest', rot: -side * 0.35, low: true, mode: 'whole' };
      case 'clasp': return this.kind === 'mom' ? { x: side * 36, y: -82, hand: 'rest', rot: -side * 1.3, abs: true, low: true, mode: 'whole' } : { x: side * 40, y: -104, hand: 'rest', rot: -side * 1.3, abs: true, low: true, mode: 'whole' };
      default: return this.kind === 'mom' ? { x: side * 60, y: -76, hand: 'rest', rot: -side * 1.32, abs: true, low: true, mode: 'whole' } : { x: side * 72, y: -100, hand: 'rest', rot: -side * 1.32, abs: true, low: true, mode: 'whole' };
    }
  }
  _set(nd, key) { if (nd._key !== key) { nd._key = key; nd.setImage(this.S[key]); nd.ax = this.S[key].ax; nd.ay = this.S[key].ay; } }

  update(dt) {
    dt = Math.min(dt, 0.05);
    const c = this.cfg, k = this.kind, baby = k === 'baby';
    if (!this.frozen) this._t += dt;
    const t = this._t;
    if (this._react > 0) { this._react -= dt; if (this._react <= 0) { this._react = 0; this.mood = this.base; } }
    if (this._talk > 0) this._talk -= dt;
    const mood = this.mood, face = (baby ? BABY_FACE : FACE)[mood] || FACE.idle, pose = POSE[mood] || POSE.idle;
    const asleep = mood === 'sleep';

    // gaze: explicit lookAt > mood gaze > idle wander
    let gx, gy;
    if (this.look && !asleep) {
      const lp = this.toLocal(this.look.x, this.look.y);
      const hx = c.neck[0], hy = c.neck[1] + c.face;
      gx = clamp((lp.x - hx) / 260, -1, 1); gy = clamp((lp.y - hy) / 260, -1, 1);
    } else if (face.gaze) { [gx, gy] = face.gaze; if (mood === 'think' && !baby) gx = -(c.facing >= 0 ? 1 : -1) * 0.45; }
    else {
      if (!this.frozen && (this._nextWander -= dt) <= 0) {
        this._nextWander = 1.4 + Math.random() * 2.6;
        this._wander = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 0.8, y: (Math.random() - 0.4) * 0.5 };
      }
      gx = this._wander.x; gy = this._wander.y;
    }
    if (this.gazeOverride) [gx, gy] = this.gazeOverride;
    this._gaze.x = damp(this._gaze.x, gx, 9, dt); this._gaze.y = damp(this._gaze.y, gy, 9, dt);

    // blink
    if (!this.frozen) {
      if (this._blink > 0) this._blink -= dt;
      else if ((this._nextBlink -= dt) <= 0) { this._blink = 0.13; this._nextBlink = Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 3.5; }
    }

    // squash & stretch spring (react kicks it) + hops
    this._sqv += (-300 * this._sq - 12 * this._sqv) * dt; this._sq += this._sqv * dt;
    let hopY = 0, hopSq = 0;
    if (mood === 'cheer' || this._hop > 0) {
      const P = baby ? 0.42 : 0.56; this._hopT += dt;
      const u = (this._hopT % P) / P, H = baby ? 12 : 30;
      if (u < 0.78) { const v = u / 0.78; hopY = -H * 4 * v * (1 - v); hopSq = 0.04 * Math.sin(v * Math.PI); }
      else { const v = (u - 0.78) / 0.22; hopSq = -0.09 * Math.sin(v * Math.PI); }
      if (this._hop > 0 && mood !== 'cheer') { this._hop -= dt / P; if (this._hop <= 0) { this._hop = 0; this._hopT = 0; } }
    } else this._hopT = 0;

    // breathing
    const br = asleep ? Math.sin(t * 1.5) : Math.sin(t * 2.3);
    const breath = 1 + br * (asleep ? 0.022 : 0.012);
    this.body.sy = breath; this.body.sx = 1 - br * 0.006;
    this._breath = breath;

    // rig
    const s = this._sq + hopSq;
    this.rig.sy = 1 + s; this.rig.sx = 1 - s * 0.7; this.rig.y = hopY;
    this._lean = damp(this._lean, pose.lean, 6, dt);
    let wig = 0;
    if (baby) {
      if (mood === 'happy' || mood === 'cheer') wig = Math.sin(t * 20) * 0.045 + Math.sin(t * 7) * 0.03;
      else if (asleep || mood === 'soft') wig = Math.sin(t * 0.9) * 0.012;
      else wig = Math.sin(t * 1.4) * 0.035;
    }
    this._wig = damp(this._wig, wig, 14, dt);
    this.rig.rot = this._lean + this._wig;

    // head
    let tilt = (mood === 'think' || mood === 'shh' ? (c.facing >= 0 ? 1 : -1) * pose.tilt : pose.tilt) + Math.sin(t * 0.85) * 0.022 + this._gaze.x * 0.05;
    if (baby && (mood === 'happy' || mood === 'cheer')) tilt += Math.sin(t * 9) * 0.06;
    if (this.tiltOverride != null) tilt = this.tiltOverride;
    this._tilt = damp(this._tilt, tilt, 5, dt);
    const talking = this._talk > 0 && !asleep;
    this.headPivot.rot = this._tilt + (talking ? Math.sin(t * 13) * 0.012 : 0);
    this.headPivot.y = c.neck[1] * breath + (talking ? Math.abs(Math.sin(t * 13)) * -2 : 0);
    this.head.y = c.face + (asleep ? 3 : 0);
    if (this.knotPivot) { this.knotPivot.x = this.headPivot.x; this.knotPivot.y = this.headPivot.y; this.knotPivot.rot = this.headPivot.rot; this.knot.y = this.head.y; }

    // face parallax "turn": features move most, face a little, hair/hood opposite
    this.features.x = damp(this.features.x, c.facing + this._gaze.x * 11, 12, dt);
    this.features.y = damp(this.features.y, this._gaze.y * 7, 12, dt);
    this.face.x = this._gaze.x * 2.5;
    if (this.front) this.front.x = -this._gaze.x * 2.5;
    if (this.earL) { this.earL.x = -c.ears - this._gaze.x * 4; this.earR.x = c.ears - this._gaze.x * 4; }
    this._q = damp(this._q, mood === 'think' ? 1 : 0, 6, dt);
    this.qmark.alpha = this._q; this.qmark.y = this._qy - this._q * 8 + Math.sin(t * 3) * 3;
    this.qmark.sx = this.qmark.sy = 0.6 + this._q * 0.4;

    // eyes
    let eye = face.eye;
    if (this._blink > 0 && (eye === 'open' || eye === 'wide') && mood !== 'think') eye = 'blink';
    if (talking && eye === 'open' && Math.sin(t * 2) > 0.92) eye = 'happy';
    this._set(this.eyeL, `${k}-eye-${eye}`); this._set(this.eyeR, `${k}-eye-${eye}`);
    const pupil = eye === 'open' || eye === 'wide';
    const ex = pupil ? this._gaze.x * 4 : 0, ey = pupil ? this._gaze.y * 3 : 0;
    this.eyeL.x = -c.eye[0] + ex; this.eyeR.x = c.eye[0] + ex; this.eyeL.y = this.eyeR.y = c.eye[1] + ey;

    // brows
    const [by, bro] = face.brow || [0, 0], [by2, bro2] = face.browR || face.brow || [0, 0];
    this._browY = damp(this._browY, by, 10, dt); this._browR = damp(this._browR, bro, 10, dt);
    this._browY2 = damp(this._browY2, by2, 10, dt); this._browR2 = damp(this._browR2, bro2, 10, dt);
    this.browL.y = c.brow[1] + this._browY + ey * 0.5; this.browL.rot = -this._browR;
    this.browR.y = c.brow[1] + this._browY2 + ey * 0.5; this.browR.rot = this._browR2;
    this.browL.x = -c.brow[0] + ex * 0.5; this.browR.x = c.brow[0] + ex * 0.5;
    if (baby) { const show = face.brow ? 1 : 0; this.browL.alpha = this.browR.alpha = damp(this.browL.alpha, show, 10, dt); }

    // mouth (+ talk flaps)
    let mouth = face.mouth, msy = 1;
    if (talking) { mouth = ['o', 'grin', 'smile', 'laugh'][Math.floor(t * 9) % 4]; msy = 0.85 + 0.25 * Math.abs(Math.sin(t * 28)); }
    this._set(this.mouth, `${k}-m-${mouth}`);
    this.mouth.sy = msy;

    // cheeks
    this._cheek = damp(this._cheek, face.cheek, 6, dt);
    this.cheekL.sx = this.cheekL.sy = this.cheekR.sx = this.cheekR.sy = this._cheek;

    // arms: springy wrists → 2-bone IK (state is drawn by _drawBack / _drawFront)
    if (this.arms) {
      for (const a of this.arms) {
        const tg = this._target(a.side, pose.arms[a.side < 0 ? 0 : 1]);
        if (this.frozen) { a.x = tg.x; a.y = tg.y; a.vx = a.vy = 0; }
        else {
          const kk = 190, dd = 2 * Math.sqrt(kk) * 0.66;
          a.vx += (kk * (tg.x - a.x) - dd * a.vx) * dt; a.vy += (kk * (tg.y - a.y) - dd * a.vy) * dt;
          a.x += a.vx * dt; a.y += a.vy * dt;
        }
        a.hr = this.frozen ? tg.rot : damp(a.hr, tg.rot, 12, dt);
        a.type = tg.hand; a.mode = this.kind === 'dad' ? 'whole' : (tg.mode || 'split');
        this._solve(a, tg, breath);
      }
      // layering: in "think" the vertical (chin) forearm sits in front of the horizontal one
      const cs = c.facing >= 0 ? 1 : 0;
      this._order = mood === 'think' ? [1 - cs, cs] : [0, 1];
    }
  }
  _solve(a, tg, breath) {
    const c = this.cfg, side = a.side, L1 = c.L1, L2 = c.L2;
    const Sx = side * c.shoulder[0], Sy = c.shoulder[1] * breath;
    const dx = a.x - Sx, dy = a.y - Sy, d = Math.hypot(dx, dy) || 1;
    const dc = clamp(d, Math.abs(L1 - L2) + 8, L1 + L2 - 1);
    const ang = Math.atan2(dy, dx), B = Math.acos(clamp((L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc), -1, 1));
    const e1 = [Sx + L1 * Math.cos(ang + B), Sy + L1 * Math.sin(ang + B)], e2 = [Sx + L1 * Math.cos(ang - B), Sy + L1 * Math.sin(ang - B)];
    const score = tg.low ? (e => e[1] + 0.3 * side * e[0]) : (e => side * e[0] + 0.35 * e[1]);
    let E = score(e1) > score(e2) ? e1 : e2;
    let Wx = Sx + Math.cos(ang) * dc, Wy = Sy + Math.sin(ang) * dc;
    if (tg.elbow) { E = [tg.elbow[0], tg.elbow[1] * breath]; Wx = a.x; Wy = a.y; }
    else if (tg.down) { // tucked elbow: forearm hangs below the wrist; the upper arm foreshortens (hidden behind the torso)
      const Ed = [a.x + side * 10, a.y + L2 * 0.97];
      if (Math.hypot(Ed[0] - Sx, Ed[1] - Sy) < L1 * 1.05) { E = Ed; Wx = a.x; Wy = a.y; }
    }
    a.S = [Sx, Sy]; a.E = E; a.W = [Wx, Wy];
    a.rot = (tg.abs ? 0 : Math.atan2(Wx - E[0], -(Wy - E[1]))) + a.hr;
  }
  // ---- live arm drawing (cached crayon patterns; a handful of path fills per frame)
  _pat(ctx, name) {
    let m = patCache.get(ctx); if (!m) { m = {}; patCache.set(ctx, m); }
    if (!m[name]) {
      const sp = this.S['tex-' + name];
      const p = ctx.createPattern(sp.img, 'repeat');
      const s = sp.w / sp.img.width;
      if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
      m[name] = p;
    }
    return m[name];
  }
  // wobbly centreline: stable along the arm (param = arc length), so the line "breathes" like a hand-drawn stroke
  _wob(pts, ph) {
    const out = [];
    let s0 = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], B = pts[i + 1], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 0.001, nx = -dy / L, ny = dx / L;
      const n = Math.max(1, Math.ceil(L / 7));
      for (let j = i ? 1 : 0; j <= n; j++) {
        const u = j / n, s = s0 + L * u, w = (u > 0.02 && u < 0.98) || (i === 0 && j === 0) ? 1.1 * Math.sin(s * 0.075 + ph) + 0.55 * Math.sin(s * 0.19 + ph * 1.7) : 0;
        out.push([A[0] + dx * u + nx * w, A[1] + dy * u + ny * w]);
      }
      s0 += L;
    }
    return out;
  }
  _poly(ctx, pts, width, style, alpha = 1) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = style; ctx.lineWidth = width;
    const ga = ctx.globalAlpha; ctx.globalAlpha = ga * alpha;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.01, pts[0][1]);
    ctx.stroke(); ctx.globalAlpha = ga;
  }
  /** A limb as one silhouette: varied-weight pencil outline (two offset passes) under a crayon fill + a few gaps. */
  _limb(ctx, pts, r, linePat, fillPat, lineA = 1, seed = 0) {
    const t = 3.1, P = this._wob(pts, seed), Q = this._wob(pts, seed + 2.3);
    this._poly(ctx, P, 2 * (r + t), linePat, lineA);
    this._poly(ctx, Q, 2 * (r + t) + 1.6, linePat, 0.35 * lineA);
    this._poly(ctx, P, 2 * r, fillPat);
    // soft warm shadow on the underside of the limb (like the faces' crayon shading)
    const sh = this.cfg.arm.shadow;
    if (sh) {
      const U = [];
      for (let i = 0; i < P.length; i++) {
        const A = P[Math.max(0, i - 1)], B = P[Math.min(P.length - 1, i + 1)], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
        let nx = -dy / L, ny = dx / L; if (ny < 0 || (Math.abs(ny) < 0.05 && nx < 0)) { nx = -nx; ny = -ny; }
        U.push([P[i][0] + nx * r * 0.5, P[i][1] + ny * r * 0.5]);
      }
      this._poly(ctx, U, r * 0.5, sh, 0.32);
    }
  }
  _sprite(ctx, key, x, y, rot, sx, sy) {
    const sp = this.S[key]; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.drawImage(sp.img, -sp.ax * sp.w, -sp.ay * sp.h, sp.w, sp.h); ctx.restore();
  }
  /** Short t-shirt sleeve along the upper arm. open=true: no outline on the shoulder side (blends into the shirt). */
  _sleeve(ctx, a, open) {
    const sl = this.cfg.arm.sleeve, dx = a.E[0] - a.S[0], dy = a.E[1] - a.S[1], L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, len = Math.min(L + 4, this.cfg.L1 * sl.len), r0 = sl.w / 2 - 2, r1 = sl.w / 2 + 3, s0 = -12;
    const P = (s, o) => [a.S[0] + ux * s + nx * o, a.S[1] + uy * s + ny * o];
    const shape = pad => {
      ctx.beginPath(); const an = Math.atan2(ny, nx), sh = open ? 18 : 0; // open: keep the cap tucked inside the shoulder
      ctx.arc(a.S[0] + ux * sh, a.S[1] + uy * sh, r0 + pad, an, an + Math.PI, false);
      for (const q of [P(len + pad * 0.6, -(r1 + pad)), P(len + 3 + pad * 0.6, 0), P(len + pad * 0.6, r1 + pad), P(open ? 18 : s0, r0 + pad)]) ctx.lineTo(q[0], q[1]);
      ctx.closePath();
    };
    const line = this._pat(ctx, sl.line), fill = this._pat(ctx, sl.fill);
    if (!open) { ctx.fillStyle = line; shape(3.1); ctx.fill(); }
    ctx.fillStyle = fill; shape(0); ctx.fill();
    if (open) { // outline only the two sides + hem, with varied weight
      const side = this._wob([P(22, -r0 - 1.5), P(len, -r1 - 1.5), P(len + 3, 0), P(len, r1 + 1.5), P(22, r0 + 1.5)], a.side * 3);
      this._poly(ctx, side, 3, line, 0.9);
      this._poly(ctx, this._wob([P(len - 2, -r1), P(len + 1, 0), P(len - 2, r1)], 1.3), 4.4, line, 0.3);
    }
    const h0 = P(len - 8, -r1 + 5), h1 = P(len - 6, r1 - 5);
    this._poly(ctx, [h0, h1], 2, line, 0.5);
  }
  _hand(ctx, a, layer) {
    const hs = this.cfg.handS;
    this._sprite(ctx, `${this.kind}-hand-${a.type}-${layer}`, a.W[0], a.W[1], a.rot, -a.side * hs, hs);
  }
  /** Whole arm shoulder→elbow→hand as ONE continuous silhouette (no end caps on the shirt). */
  _drawWhole(ctx, a) {
    const A = this.cfg.arm, line = C.line, fill = this._pat(ctx, A.fill), r = A.foreW / 2;
    if (A.sleeve) {
      const dx = a.E[0] - a.S[0], dy = a.E[1] - a.S[1], L = Math.hypot(dx, dy) || 1, k = Math.min(22, L * 0.45) / L, S = [a.S[0] + dx * k, a.S[1] + dy * k];
      if (a.W[1] < a.E[1] - 12) { // hand raised: upper arm, sleeve over it, then the forearm in FRONT from a visible elbow
        this._limb(ctx, [S, a.E], r, line, fill, 1, a.side < 0 ? 0.4 : 2.9);
        this._sleeve(ctx, a, true);
        this._hand(ctx, a, 'o');
        this._limb(ctx, [a.E, a.W], r - 1, line, fill, 1, a.side < 0 ? 1.7 : 3.3);
        this._hand(ctx, a, 'f');
        return;
      }
      this._hand(ctx, a, 'o');
      this._limb(ctx, [S, a.E, a.W], r, line, fill, 1, a.side < 0 ? 0.4 : 2.9);
      this._hand(ctx, a, 'f');
      this._sleeve(ctx, a, true);
      return;
    }
    this._hand(ctx, a, 'o');
    if (A.toWrist) this._hand(ctx, a, 'f');
    this._limb(ctx, [a.S, a.E, a.W], r, line, fill, 1, a.side < 0 ? 0.4 : 2.9);
    if (A.toWrist) { this._cuff(ctx, a, r, line, fill); this._hand(ctx, a, 'o'); this._hand(ctx, a, 'f'); } else this._hand(ctx, a, 'f');
  }
  _cuff(ctx, a, r, line, fill) { // sleeve tapers into a little cuff over the wrist
    const dir = Math.atan2(a.W[1] - a.E[1], a.W[0] - a.E[0]), cx = a.W[0] - Math.cos(dir) * 4, cy = a.W[1] - Math.sin(dir) * 4;
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(cx, cy, 7, r + 1.5, dir, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,90,115,0.22)'; ctx.lineCap = 'round'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(a.W[0], a.W[1], r + 1, dir - 1.0, dir + 1.0); ctx.stroke();
    ctx.strokeStyle = line; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(a.W[0], a.W[1], r - 2, dir - 1.2, dir + 1.2); ctx.stroke();
    const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.45; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(cx - Math.cos(dir) * 8, cy - Math.sin(dir) * 8, r - 6, dir - 0.9, dir + 0.9); ctx.stroke(); ctx.globalAlpha = ga;
  }
  _drawBack(ctx) {
    const A = this.cfg.arm, line = C.line, fill = this._pat(ctx, A.fill);
    for (const a of this.arms) {
      if (!a.S || a.mode !== 'split') continue;
      this._limb(ctx, [a.S, a.E], A.upperW / 2, line, fill, 1, a.side < 0 ? 1.1 : 3.7);
      if (A.sleeve) this._sleeve(ctx, a, false);
    }
  }
  _drawMid(ctx) { // Ibu: resting arms live under the hijab drape, only forearm + cuff + hand emerge below the hem
    if (this.kind !== 'mom') return;
    for (const i of this._order) { const a = this.arms[i]; if (a.S && a.mode === 'whole') this._drawWhole(ctx, a); }
  }
  _drawFront(ctx) {
    const c = this.cfg, A = c.arm, line = C.line, fill = this._pat(ctx, A.fill), rE = A.foreW / 2;
    for (const i of this._order) {
      const a = this.arms[i]; if (!a.E) continue;
      if (a.mode === 'whole') { if (this.kind !== 'mom') this._drawWhole(ctx, a); continue; }
      this._hand(ctx, a, 'o');
      if (A.toWrist) { this._hand(ctx, a, 'f'); this._limb(ctx, [a.E, a.W], rE, line, fill, 1, a.side < 0 ? 5.1 : 6.6); this._cuff(ctx, a, rE, line, fill); if (a.type === 'point') { this._hand(ctx, a, 'o'); this._hand(ctx, a, 'f'); } }
      else { this._limb(ctx, [a.E, a.W], rE, line, fill, 1, a.side < 0 ? 5.1 : 6.6); this._hand(ctx, a, 'f'); }
    }
  }
  /** Render only part of the character (used by the portrait to slip the baby between bodies and hands). */
  renderLayer(ctx, layer) {
    const front = layer === 'front', keep = [this.frontArms, this.knotPivot];
    const saved = this.rig.children.map(n => n.visible);
    this.rig.children.forEach(n => { n.visible = keep.includes(n) ? front : !front; });
    this.render(ctx);
    this.rig.children.forEach((n, i) => { n.visible = saved[i]; });
  }
}

// ---------------------------------------------------------------- factory
const spriteCache = {};
function loadSprites(kind) {
  if (!spriteCache[kind]) {
    PR = rng(kind.length * 977 + 13);
    const _t0 = performance.now(); const parts = CFG[kind].parts(); if (window.__prof) console.log('gen', kind, Math.round(performance.now() - _t0), parts.reduce((n, p) => n + p.svg.length, 0));
    spriteCache[kind] = Promise.all(parts.map(p => svgSprite(p.svg, p.w, p.h, p.key).then(sp => [p.key.slice(5), { img: sp.img, w: sp.w, h: sp.h, ax: p.ax, ay: p.ay }])))
      .then(list => Object.fromEntries(list));
    spriteCache[kind].catch(() => { delete spriteCache[kind]; });
  }
  return spriteCache[kind];
}

export async function createCharacter(kind, opts = {}) {
  if (!CFG[kind]) kind = 'mom';
  const S = await loadSprites(kind);
  const ch = new Character(kind, S, opts);
  ch.update(0.016);
  if (!opts.frozen) game.onUpdate(dt => ch.update(dt));
  return ch;
}

// ---------------------------------------------------------------- family portrait (level-3 jigsaw)
/**
 * Composition of the family portrait, as fractions of the picture: x,y = character origin (bottom centre)
 * in w,h units; scale is multiplied by h/600; rot = whole-body lean. gaze/tilt are fed to gazeOverride /
 * tiltOverride. Use applyPortraitPose(ch, kind, w, h) to place a live character exactly like the picture.
 */
export const PORTRAIT_LAYOUT = {
  mom: { x: 0.172, y: 0.63, scale: 0.62, rot: 0.0, mood: 'adore', gaze: [0.7, 0.35], tilt: 0.07 },
  dad: { x: 0.842, y: 0.612, scale: 0.56, rot: 0.0, mood: 'adore', gaze: [-0.7, 0.35], tilt: -0.07 },
  baby: { x: 0.5, y: 0.44, scale: 0.6, rot: 0, mood: 'adore', gaze: [0, 0], tilt: 0.03 },
};
export function applyPortraitPose(ch, kind, w = 900, h = 600, ox = 0, oy = 0) {
  const L = PORTRAIT_LAYOUT[kind], s = h / 600;
  ch.x = ox + L.x * w; ch.y = oy + L.y * h; ch.sx = ch.sy = L.scale * s; ch.rot = L.rot;
  ch.setMood(L.mood); ch.gazeOverride = L.gaze; ch.tiltOverride = L.tilt;
  return ch;
}

function backdropPart(w, h) {
  const R = rng(321);
  const cloud = (x, y, s) => {
    const d = `M${x - 60 * s} ${y + 14 * s} C${x - 84 * s} ${y + 14 * s} ${x - 84 * s} ${y - 16 * s} ${x - 58 * s} ${y - 14 * s} C${x - 56 * s} ${y - 40 * s} ${x - 18 * s} ${y - 44 * s} ${x - 8 * s} ${y - 24 * s} C${x + 4 * s} ${y - 52 * s} ${x + 50 * s} ${y - 46 * s} ${x + 52 * s} ${y - 16 * s} C${x + 82 * s} ${y - 20 * s} ${x + 86 * s} ${y + 14 * s} ${x + 60 * s} ${y + 14 * s} Z`;
    return blob(d, '#ffffff', { shade: '#cfe4ee', g: 0.35, line: '#9cbfcf', lw: 2.4 });
  };
  const star = (x, y, r) => {
    let d = '';
    for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? r * 0.48 : r; d += (j ? 'L' : 'M') + n1(x + Math.cos(a) * rr) + ' ' + n1(y + Math.sin(a) * rr); }
    return blob(d + 'Z', C.star, { shade: '#d9a520', g: 0.3, line: '#c99a2a', lw: 2 });
  };
  const heart = (x, y, sc, col) => blob(`M${x} ${y + 10 * sc} C${x - 26 * sc} ${y - 8 * sc} ${x - 14 * sc} ${y - 30 * sc} ${x} ${y - 16 * sc} C${x + 14 * sc} ${y - 30 * sc} ${x + 26 * sc} ${y - 8 * sc} ${x} ${y + 10 * sc} Z`, col, { shade: '#d0607a', g: 0.35, light: '#fff', l: 0.3, line: '#c25a72', lw: 2.4 });
  const wallD = `M0 0 H${w} V${h} H0 Z`;
  const sofaBack = `M${w * 0.03} ${h * 0.7} C${w * 0.02} ${h * 0.54} ${w * 0.06} ${h * 0.44} ${w * 0.16} ${h * 0.43} C${w * 0.36} ${h * 0.41} ${w * 0.64} ${h * 0.41} ${w * 0.84} ${h * 0.43} C${w * 0.94} ${h * 0.44} ${w * 0.98} ${h * 0.54} ${w * 0.97} ${h * 0.7} Z`;
  let stars = '';
  for (const [u, v, r] of [[0.04, 0.07, 10], [0.39, 0.25, 8], [0.61, 0.27, 9], [0.96, 0.07, 10], [0.37, 0.07, 6], [0.63, 0.06, 6], [0.04, 0.38, 7], [0.96, 0.36, 7]]) stars += star(u * w, v * h, r * (0.9 + R() * 0.3));
  const inner = `<defs><radialGradient id="glow" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="#f4fbf8"/><stop offset="0.55" stop-color="#d6f0ec"/><stop offset="1" stop-color="#a9d8dc"/></radialGradient>
    <radialGradient id="vig" cx="50%" cy="48%" r="72%"><stop offset="0.62" stop-color="#5a8f9e" stop-opacity="0"/><stop offset="1" stop-color="#5a8f9e" stop-opacity=".38"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>` +
    grainLayers(wallD, '#7fb8c4', '#ffffff', 0.2, 0.4, -32, 'nonzero') +
    cloud(w * 0.5, h * 0.33, 0.5) +
    blob(sofaBack, '#c9b2e8', { shade: '#9c80c9', g: 0.42, light: '#fff', l: 0.3, line: '#8a70b4', lw: 2.6 }) +
    pencil(`M${w * 0.36} ${h * 0.46} C${w * 0.35} ${h * 0.52} ${w * 0.35} ${h * 0.56} ${w * 0.36} ${h * 0.6} M${w * 0.64} ${h * 0.46} C${w * 0.65} ${h * 0.52} ${w * 0.65} ${h * 0.56} ${w * 0.64} ${h * 0.6}`, 2.2, '#8a70b4', 0.6) + stars +
    heart(w * 0.5, h * 0.11, 1.15, '#f590a8') + heart(w * 0.42, h * 0.15, 0.65, '#f9b2c3') + heart(w * 0.58, h * 0.145, 0.7, '#f7a0b6') +
    `<rect width="${w}" height="${h}" fill="url(#vig)"/>`;
  return part(`portrait-bd-${w}x${h}`, w, h, 0, 0, inner, 61);
}
function propsParts(w, h) {
  const k = `${w}x${h}`;
  const seat = `M${w * 0.0} ${h * 0.63} C${w * 0.0} ${h * 0.6} ${w * 0.03} ${h * 0.59} ${w * 0.08} ${h * 0.59} C${w * 0.35} ${h * 0.58} ${w * 0.65} ${h * 0.58} ${w * 0.92} ${h * 0.59} C${w * 0.97} ${h * 0.59} ${w} ${h * 0.6} ${w} ${h * 0.63} L${w} ${h} L0 ${h} Z`;
  const armL = `M${-w * 0.02} ${h * 0.56} C${w * 0.03} ${h * 0.52} ${w * 0.1} ${h * 0.55} ${w * 0.1} ${h * 0.62} L${w * 0.1} ${h} L${-w * 0.02} ${h} Z`;
  const armR = `M${w * 1.02} ${h * 0.56} C${w * 0.97} ${h * 0.52} ${w * 0.9} ${h * 0.55} ${w * 0.9} ${h * 0.62} L${w * 0.9} ${h} L${w * 1.02} ${h} Z`;
  const patch = (x, y, inner) => `<g transform="translate(${x} ${y})">${inner}</g>`;
  let star = ''; for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? 15 : 32; star += (j ? 'L' : 'M') + n1(Math.cos(a) * rr) + ' ' + n1(Math.sin(a) * rr); }
  const seatSvg = blob(seat, '#d8c4f0', { shade: '#a58bd0', g: 0.42, light: '#fff', l: 0.32, line: '#8a70b4', lw: 2.8 }) +
    pencil(`M${w * 0.04} ${h * 0.65} C${w * 0.35} ${h * 0.64} ${w * 0.65} ${h * 0.64} ${w * 0.96} ${h * 0.65}`, 2.2, '#8a70b4', 0.55) +
    patch(w * 0.21, h * 0.8, blob('M-78 -50 C-40 -64 40 -64 78 -50 C92 -20 92 20 78 50 C40 64 -40 64 -78 50 C-92 20 -92 -20 -78 -50 Z', '#fbe08a', { shade: '#e0b54a', g: 0.4, light: '#fff', l: 0.3, line: '#c99a2a', lw: 2.6 }) +
      pencil('M-60 -40 C-20 -30 20 -30 60 -40 M-60 40 C-20 30 20 30 60 40', 1.8, '#d6a83e', 0.5) + blob(star + 'Z', '#f6b93b', { shade: '#d98f20', g: 0.3, line: '#c4832a', lw: 2.4 })) +
    patch(w * 0.79, h * 0.8, blob('M-78 -50 C-40 -64 40 -64 78 -50 C92 -20 92 20 78 50 C40 64 -40 64 -78 50 C-92 20 -92 -20 -78 -50 Z', '#a9cdf5', { shade: '#6f9be8', g: 0.4, light: '#fff', l: 0.3, line: '#5a83c4', lw: 2.6 }) +
      pencil('M-60 -40 C-20 -30 20 -30 60 -40 M-60 40 C-20 30 20 30 60 40', 1.8, '#6f9be8', 0.5) + blob('M0 22 C-46 -10 -26 -50 0 -26 C26 -50 46 -10 0 22 Z', '#f590a8', { shade: '#d0607a', g: 0.35, line: '#c25a72', lw: 2.4 })) +
    blob(armL, '#c9b2e8', { shade: '#9c80c9', g: 0.42, light: '#fff', l: 0.3, line: '#8a70b4', lw: 2.6 }) + blob(armR, '#c9b2e8', { shade: '#9c80c9', g: 0.42, light: '#fff', l: 0.3, line: '#8a70b4', lw: 2.6 });
  // little woven basket for Bintang
  const bx = w * 0.5, by = h * 0.415, bw = w * 0.135;
  const back = blob(`M${bx - bw} ${by} C${bx - bw} ${by - 26} ${bx + bw} ${by - 26} ${bx + bw} ${by} Z`, '#c98f55', { shade: '#8f5a2c', g: 0.45, line: '#8a5a32', lw: 2.6 });
  const front = `M${bx - bw - 6} ${by} C${bx - bw * 0.7} ${by + 12} ${bx + bw * 0.7} ${by + 12} ${bx + bw + 6} ${by} L${bx + bw * 0.86} ${by + h * 0.4} C${bx + bw * 0.4} ${by + h * 0.43} ${bx - bw * 0.4} ${by + h * 0.43} ${bx - bw * 0.86} ${by + h * 0.4} Z`;
  let weave = '';
  for (let i = 1; i < 9; i++) weave += `M${n1(bx - bw * (1 - i * 0.016))} ${n1(by + i * h * 0.044)} C${n1(bx - bw * 0.4)} ${n1(by + i * h * 0.044 + 10)} ${n1(bx + bw * 0.4)} ${n1(by + i * h * 0.044 + 10)} ${n1(bx + bw * (1 - i * 0.016))} ${n1(by + i * h * 0.044)} `;
  for (let i = -3; i <= 3; i++) weave += `M${n1(bx + i * bw * 0.27)} ${n1(by + 10)} L${n1(bx + i * bw * 0.24)} ${n1(by + h * 0.4)} `;
  const bow = blob(`M${bx} ${by + 26} C${bx - 30} ${by + 6} ${bx - 40} ${by + 46} ${bx} ${by + 30} C${bx + 40} ${by + 46} ${bx + 30} ${by + 6} ${bx} ${by + 26} Z`, '#f590a8', { shade: '#d0607a', g: 0.35, line: '#c25a72', lw: 2.4 });
  const frontSvg = blob(front, '#dca46a', { shade: '#a26a36', g: 0.45, light: '#fff', l: 0.25, line: '#8a5a32', lw: 2.8 }) + pencil(weave, 2, '#9a6436', 0.7) +
    pencil(`M${bx - bw - 6} ${by + 2} C${bx - bw * 0.7} ${by + 14} ${bx + bw * 0.7} ${by + 14} ${bx + bw + 6} ${by + 2}`, 5, '#b77f48', 0.9) + bow;
  return { seat: part(`portrait-seat-${k}`, w, h, 0, 0, seatSvg, 71), basketBack: part(`portrait-bb-${k}`, w, h, 0, 0, back, 72), basketFront: part(`portrait-bf-${k}`, w, h, 0, 0, frontSvg, 73) };
}
/** Foreground props of the portrait → {seat, basketBack, basketFront} sprites (each w×h, draw at 0,0).
 *  Draw order: backdrop → parents (renderLayer 'base') → seat → basketBack → baby → basketFront → parents ('front') → frame. */
export async function portraitPropsSprites(w = 900, h = 600) {
  PR = rng(5151);
  const P = propsParts(w, h), out = {};
  for (const [n, p] of Object.entries(P)) out[n] = await svgSprite(p.svg, w, h, p.key);
  return out;
}
/** Soft mint "photo studio" backdrop (clouds, stars, hearts, vignette) — no frame. → sprite {img,w,h}. */
export function portraitBackdropSprite(w = 900, h = 600) {
  PR = rng(4242);
  const p = backdropPart(w, h);
  return svgSprite(p.svg, w, h, p.key);
}
/** Draw the backdrop into ctx at (0,0,w,h). Async the first time (rasterizes once, then cached). */
export async function drawPortraitBackdrop(ctx, w = 900, h = 600) {
  const bd = await portraitBackdropSprite(w, h);
  ctx.drawImage(bd.img, 0, 0, w, h);
}
/** Cream photo border drawn by portraitSprite (exported so a live rebuild can match it). */
export function drawPortraitFrame(ctx, w, h) {
  const s = h / 600;
  ctx.save(); ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 18 * s; ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(120,90,70,.3)'; ctx.lineWidth = 2 * s; ctx.strokeRect(10 * s, 10 * s, w - 20 * s, h - 20 * s); ctx.restore();
}

export async function portraitSprite(w = 900, h = 600) {
  const [mom, dad, baby] = await Promise.all(['mom', 'dad', 'baby'].map(k => createCharacter(k, { frozen: true })));
  const bd = await portraitBackdropSprite(w, h), pr = await portraitPropsSprites(w, h);
  applyPortraitPose(mom, 'mom', w, h); applyPortraitPose(dad, 'dad', w, h); applyPortraitPose(baby, 'baby', w, h);
  mom._t = dad._t = baby._t = 0.2;
  for (let i = 0; i < 90; i++) { mom.update(1 / 30); dad.update(1 / 30); baby.update(1 / 30); }
  return canvasSprite(w, h, (x) => {
    x.save(); x.beginPath(); x.rect(0, 0, w, h); x.clip();
    x.drawImage(bd.img, 0, 0, w, h);
    mom.renderLayer(x, 'base'); dad.renderLayer(x, 'base');
    x.drawImage(pr.seat.img, 0, 0, w, h);
    x.drawImage(pr.basketBack.img, 0, 0, w, h);
    baby.render(x);
    x.drawImage(pr.basketFront.img, 0, 0, w, h);
    mom.renderLayer(x, 'front'); dad.renderLayer(x, 'front');
    x.restore();
    drawPortraitFrame(x, w, h);
  }, `portrait-photo-${w}x${h}`); // replaceable: assets/custom/portrait-photo-WxH.png (510x340 = the level-3 jigsaw picture)
}

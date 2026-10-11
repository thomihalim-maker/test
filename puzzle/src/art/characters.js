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

export const MOODS = ['idle', 'happy', 'cheer', 'surprised', 'think', 'sad', 'sleep', 'adore', 'soft'];

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
let probe = null;
function sample(d, step = 3, wobble = true) {
  if (!probe) probe = document.createElementNS(NS, 'path');
  const out = [];
  for (const sub of d.trim().split(/(?=M)/)) {
    if (!sub.trim()) continue;
    probe.setAttribute('d', sub);
    const L = probe.getTotalLength();
    const n = Math.max(2, Math.ceil(L / step));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const p = probe.getPointAtLength(L * i / n);
      const f = wobble ? field(p.x, p.y) : [0, 0];
      pts.push([p.x + f[0], p.y + f[1]]);
    }
    out.push({ pts, L, closed: /[zZ]\s*$/.test(sub) });
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
  const { taper = true, gaps = true, step = 2.2, vary = 1 } = o;
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
  return out ? `<path d="${out}" fill="${col}" opacity="${op}" filter="url(#pgr)"/>` : '';
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

const grainLayers = (dd, shade, light, g, l, ang, rule) =>
  (shade ? `<g transform="rotate(${ang})"><g filter="url(#grn)" opacity="${g}"><path transform="rotate(${-ang})" d="${dd}" fill-rule="${rule}" fill="${shade}"/></g></g>` : '') +
  (light ? `<g transform="rotate(${ang + 8})"><g filter="url(#hil)" opacity="${l}"><path transform="rotate(${-ang - 8})" d="${dd}" fill-rule="${rule}" fill="${light}"/></g></g>` : '');
/** Crayon-filled shape: wobbled opaque base + streak grain + pencil outline (registered by the wobble field). */
function blob(d, col, o = {}) {
  const { shade, light, g = 0.42, l = 0.3, lw = 3.1, line = C.line, ang = -32, outline = true, open = null, rule = 'nonzero' } = o;
  const dd = polyD(sample(d, 3));
  return `<path d="${dd}" fill="${col}" fill-rule="${rule}"/>` + grainLayers(dd, shade, light, g, l, ang, rule) + (outline ? pencil(open || d, lw, line) : '');
}
const dot = (x, y, rx, ry, col = C.ink) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${rx}" ry="${ry}" fill="${col}" filter="url(#pgr)"/>`;
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
function fingersPath(f, start, end) {
  let d = start;
  f.forEach(([a, b, top], i) => {
    const r = (b - a) / 2;
    d += ` L${a} ${top + r} A${r} ${r} 0 0 1 ${b} ${top + r}`;
    if (i < f.length - 1) d += ` L${b} ${top + r + (i === 1 ? 9 : 7)}`;
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
    d: fingersPath([[-21, -10.5, -55], [-10.5, 0, -61], [0, 10.5, -60], [10.5, 20, -54]], 'M-18 14 L-18 3 C-21 -12 -22 -26 -21 -40',
      ' L20 -34 C25 -34 29 -28 28 -20 C27 -12 22 -6 19 -1 L19 14 Z'),
    lines: 'M-10.5 -42 L-10.5 -47 M0 -47 L0 -52 M10.5 -41 L10.5 -46',
    soft: 'M20 -30 C17 -24 15 -18 14 -12',
  },
  point: { // curled fist with the index finger up
    d: 'M-18 14 L-18 3 C-22 -12 -22 -30 -14 -37 C-11 -39 -9 -40 -7 -40 L-7 -66 A6.5 6.5 0 0 1 6 -66 L6 -40 C11 -40 15 -37 18 -33 C22 -22 22 -8 18 3 L18 14 Z',
    lines: 'M-16 -26 Q-6 -21 6 -27 M-16 -15 Q-4 -11 10 -16',
    soft: 'M18 -30 C10 -26 2 -24 -5 -27',
  },
};
function handParts(k) {
  const out = [];
  for (const [name, h] of Object.entries(HANDS)) {
    const dd = polyD(sample(h.d, 2.4));
    out.push(part(`${k}-hand-${name}-o`, 110, 130, 55, 98, `<path d="${dd}" fill="${C.line}" stroke="${C.line}" stroke-width="6" stroke-linejoin="round" filter="url(#pgr)"/>`, 9));
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
    `<path d="${polyD(sample(loop, 3))}" fill="none" stroke="${C.hijabLine}" stroke-width="11" stroke-linecap="round" filter="url(#pgr)"/><path d="${polyD(sample(loop, 3))}" fill="none" stroke="${C.hijab}" stroke-width="6.5" stroke-linecap="round"/>` +
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
  const shirt = 'M-108 -242 C-150 -238 -178 -208 -182 -160 C-186 -110 -180 -52 -168 -14 C-150 -2 -124 6 -92 2 C-60 -2 -34 6 0 3 C34 0 64 6 96 2 C126 -2 152 4 168 -14 C180 -52 186 -110 182 -160 C178 -208 150 -238 108 -242 C60 -254 -60 -254 -108 -242 Z';
  const body = `<ellipse cx="0" cy="6" rx="160" ry="10" fill="#7a4f5f" opacity=".12" filter="url(#blr)"/>` +
    blob(shirt, C.pink, { shade: C.pinkShade, light: '#fff', g: 0.5, l: 0.35, line: C.pinkLine }) +
    pencil('M-150 -52 C-80 -38 70 -40 148 -54', 2.4, C.pinkShade, 0.9) + pencil('M-60 -150 C-50 -110 -54 -80 -64 -60', 2.1, C.pinkShade, 0.6);

  return [
    part('mom-body', 400, 290, 200, 262, body, 21),
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
    tex += loop(rx * 0.85 * v * Math.cos(ang), -60 - ry * v * Math.sin(ang), 0.8 + R() * 0.6, R() * 360, '#c9c8c6', 1.8, 0.75);
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
  const shirt = 'M-98 -228 C-140 -226 -170 -206 -178 -166 C-186 -116 -182 -50 -172 -12 C-152 -2 -126 4 -94 1 C-60 -2 -30 5 0 2 C30 -1 62 5 96 1 C128 -2 154 4 172 -12 C182 -50 186 -116 178 -166 C170 -206 140 -226 98 -228 C76 -232 54 -230 42 -226 C22 -212 -22 -212 -42 -226 C-54 -230 -76 -232 -98 -228 Z';
  const neck = 'M-40 -270 L-40 -224 C-22 -208 22 -208 40 -224 L40 -270 Z';
  const body = `<ellipse cx="0" cy="6" rx="160" ry="10" fill="#2e5a4b" opacity=".13" filter="url(#blr)"/>` +
    blob(neck, C.skin, { shade: C.skinGrain, g: 0.14, open: 'M-40 -262 L-40 -224 M40 -224 L40 -262' }) +
    blob(shirt, C.green, { shade: C.greenShade, light: C.greenLight, g: 0.5, l: 0.3, line: C.greenLine }) +
    pencil('M-46 -224 C-26 -204 26 -204 46 -224', 2.5, C.greenLine, 0.9) + pencil('M-60 -150 C-50 -110 -56 -70 -66 -46 M70 -120 C80 -90 76 -60 70 -40', 2.3, C.greenShade, 0.7) +
    pencil('M-150 -196 C-140 -176 -138 -160 -142 -140 M150 -196 C140 -176 138 -160 142 -140', 2.2, C.greenShade, 0.55);
  const R = rng(19); let stub = '';
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.05 + R() * 0.9) * (R() < 0.42 ? -1 : 1), rr = 0.78 + R() * 0.32;
    const x = Math.cos(a) * 46 * rr, y = 6 + Math.sin(a) * 26 * rr;
    if (Math.abs(x) < 16 && y > -10 && y < 18) continue;
    stub += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(1.5 + R() * 0.8)}" fill="#8b8583"/>`;
  }
  return [
    part('dad-body', 400, 310, 200, 290, body, 23),
    part('dad-ear', 70, 80, 22, 40, ear, 6),
    part('dad-face', 320, 280, 160, 138, blob(DAD_FACE, C.skin, { shade: C.skinGrain, g: 0.14 }), 8),
    part('dad-hair', 440, 310, 220, 274, hair.svgIn, 31, hair.defs),
    part('dad-nose', 40, 40, 20, 20, pencil('M5 -9 C-6 -11 -9 4 3 5', 2.8, C.inkSoft, 1, { gaps: false })),
    part('dad-stubble', 130, 90, 65, 40, `<g filter="url(#pgr)">${stub}</g>`),
    ...eyeParts(k, false), ...mouthParts(k, 1.08), brow(k, 3.7), cheek(k, 22, 12), question(k), ...handParts(k),
    texPart('skin', '#ffffff', C.skinGrain, null, 0.16), texPart('green', C.green, C.greenShade, C.greenLight, 0.5, 0.3),
    lineTex('line', C.line), lineTex('greenLine', C.greenLine),
  ];
}

// ---------------------------------------------------------------- BABY
function babyParts() {
  const k = 'baby';
  const R = rng(5);
  const sw = 'M-96 -100 C-112 -70 -110 -26 -86 -7 C-50 6 50 6 86 -7 C110 -26 112 -70 96 -100 C62 -130 -62 -130 -96 -100 Z';
  const swdd = polyD(sample(sw, 3));
  const centres = [[-52, -40, 30], [48, -60, 22], [62, -18, 18], [-8, -16, 15]];
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
  const flap = 'M-100 -94 C-70 -70 -30 -54 20 -52 C56 -50 86 -58 104 -70 C106 -84 104 -96 98 -104 C60 -120 -40 -124 -100 -94 Z';
  const flapdd = polyD(sample(flap, 3));
  const swDefs = `<clipPath id="sc"><path d="${swdd}"/></clipPath><clipPath id="fc"><path d="${flapdd}"/></clipPath>`;
  const swaddle = `<ellipse cx="0" cy="2" rx="96" ry="8" fill="#1d2b55" opacity=".18" filter="url(#blr)"/><path d="${swdd}" fill="${C.blue}"/>` +
    `<g clip-path="url(#sc)"><g filter="url(#pen)">${sw2}</g>${starSvg([[-60, -36, 12], [62, -40, 11], [-28, -16, 7], [30, -14, 5], [-88, -50, 5]])}` +
    grainLayers(swdd, C.blueDeep, null, 0.45, 0, -30, 'nonzero') + '</g>' +
    // flap (slightly lighter, its own swirls + stars) with a soft shadow under its edge
    `<path d="M-100 -88 C-70 -62 -30 -46 20 -44 C56 -42 86 -50 104 -62" stroke="#14275f" stroke-width="8" fill="none" opacity=".35" filter="url(#blr)"/>` +
    `<path d="${flapdd}" fill="#3460c2"/><g clip-path="url(#fc)"><g filter="url(#pen)">${swirls([[-40, -92, 22], [52, -80, 18]], 4)}</g>${starSvg([[8, -88, 8], [80, -84, 5]])}</g>` +
    pencil('M-100 -94 C-70 -70 -30 -54 20 -52 C56 -50 86 -58 104 -70', 2.8, C.blueLine, 0.9) +
    pencil('M-74 -24 C-44 -12 -6 -10 26 -16 M40 -30 C60 -28 78 -32 92 -40', 2.3, C.blueDeep, 0.85) + pencil(sw, 3, C.blueLine, 0.85);

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
    part('baby-swaddle', 260, 156, 130, 140, swaddle, 41, swDefs),
    part('baby-head', 260, 190, 130, 95, headSvg, 3),
    ...eyeParts(k, false, 1.02), ...mouthParts(k, 0.9), brow(k, 2.6), cheek(k, 18, 10.5), question(k),
  ];
}

// ---------------------------------------------------------------- rig configs
const CFG = {
  mom: { parts: momParts, h: 560, w: 370, neck: [0, -232], face: -118, shoulder: [136, -200], L1: 92, L2: 88, handS: 1, facing: 13, faceR: [124, 114], elbow: [186, -146],
    eye: [37, 4], brow: [41, -30], cheek: [80, 36], mouth: [3, 56], nose: [8, 27],
    arm: { upperW: 54, foreW: 50, fill: 'pink', line: 'pinkLine', toWrist: true } },
  dad: { parts: dadParts, h: 600, w: 380, neck: [0, -236], face: -128, shoulder: [144, -198], L1: 96, L2: 92, handS: 1.1, facing: -13, faceR: [147, 126], elbow: [190, -146],
    eye: [42, 2], brow: [45, -34], cheek: [92, 34], mouth: [0, 64], nose: [-3, 28], stubble: [0, 58], ears: 146,
    arm: { upperW: 42, foreW: 40, fill: 'skin', line: 'line', sleeve: { w: 66, len: 0.62, fill: 'green', line: 'greenLine' } } },
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
  think: { eye: 'open', mouth: 'wavy', brow: [-4, 0], browR: [-12, -0.12], cheek: 0.9, gaze: [0.55, -0.75] },
  sad: { eye: 'open', mouth: 'frown', brow: [-4, 0.35], cheek: 0.8, gaze: [0, 0.7] },
  sleep: { eye: 'closed', mouth: 'closed', brow: [3, -0.05], cheek: 1 },
};
const BABY_FACE = {
  idle: { eye: 'open', mouth: 'smile', cheek: 1 },
  happy: { eye: 'happy', mouth: 'grin', cheek: 1.2 },
  cheer: { eye: 'happy', mouth: 'laugh', cheek: 1.3 },
  surprised: { eye: 'wide', mouth: 'o', brow: [-6, 0.1], cheek: 1 },
  adore: { eye: 'content', mouth: 'smile', cheek: 1.15 },
  soft: { eye: 'content', mouth: 'smile', cheek: 1.1 },
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
  think: { arms: ['think', 'think'], tilt: -0.08, lean: 0 },
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
    this._sqv += m === 'sad' || m === 'think' || m === 'soft' ? -1.2 : -2.4; // anticipation squash → springs into a stretch
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
      case 'think': {
        const cs = c.facing >= 0 ? 1 : -1;
        const p = this._headXY(c.facing + cs * 4, c.faceR[1] * 0.97 + 64 * c.handS);
        const ey = p.y + c.L2 * 0.97, ex = p.x + cs * 10;
        if (side === cs) return { x: p.x, y: p.y, hand: 'point', rot: this.headPivot.rot, abs: true, down: true };
        return { x: ex + cs * 26, y: ey + 6, hand: 'rest', rot: cs * Math.PI / 2, abs: true, low: true };
      }
      case 'clap': { const g = 6 + 34 * (0.5 + 0.5 * Math.cos(t * 14)); return { x: side * (g + 14), y: sy + 6, hand: 'open', rot: side * 0.15, abs: true, elbow: [side * (c.elbow[0] - 22), c.elbow[1] + 40] }; }
      case 'up': { const w = Math.sin(t * 6 + side) * 12; return { x: side * (sx + 78) + w, y: sy - reach * 0.84, hand: 'open', rot: side * 0.18 + Math.sin(t * 6 + side) * 0.2, abs: true }; }
      case 'chest': return { x: side * 20, y: sy + 40, hand: 'rest', rot: -side * 0.35, low: true };
      case 'clasp': return { x: side * 18, y: sy + reach * 0.64, hand: 'rest', rot: -side * 0.2, low: true };
      default: return { x: side * (sx * 0.5), y: sy + reach * 0.7, hand: 'rest', rot: -side * 0.3, low: true };
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
    } else if (face.gaze) { [gx, gy] = face.gaze; }
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
    let tilt = pose.tilt + Math.sin(t * 0.85) * 0.022 + this._gaze.x * 0.05;
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
    if (this._blink > 0 && (eye === 'open' || eye === 'wide')) eye = 'blink';
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
        a.type = tg.hand;
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
  _capsule(ctx, A, B, rA, rB, style) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 0.001, a = Math.atan2(dy, dx);
    const k = clamp((rA - rB) / L, -0.95, 0.95), phi = Math.acos(k);
    ctx.fillStyle = style; ctx.beginPath();
    ctx.arc(A[0], A[1], rA, a + phi, a - phi + Math.PI * 2);
    ctx.arc(B[0], B[1], rB, a - phi, a + phi);
    ctx.closePath(); ctx.fill();
  }
  _sprite(ctx, key, x, y, rot, sx, sy) {
    const sp = this.S[key]; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.drawImage(sp.img, -sp.ax * sp.w, -sp.ay * sp.h, sp.w, sp.h); ctx.restore();
  }
  _drawBack(ctx) {
    const A = this.cfg.arm, t = 3.1, line = this._pat(ctx, A.line), fill = this._pat(ctx, A.fill), rU = A.upperW / 2;
    for (const a of this.arms) {
      if (!a.S) continue;
      this._capsule(ctx, a.S, a.E, rU + t, rU * 0.94 + t, line);
      this._capsule(ctx, a.S, a.E, rU, rU * 0.94, fill);
      if (A.sleeve) { // short t-shirt sleeve, flaring a little toward the hem
        const sl = A.sleeve, dx = a.E[0] - a.S[0], dy = a.E[1] - a.S[1], L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, len = Math.min(L + 6, this.cfg.L1 * sl.len), r0 = sl.w / 2 - 2, r1 = sl.w / 2 + 3;
        const P = (s, o) => [a.S[0] + ux * s + nx * o, a.S[1] + uy * s + ny * o];
        const poly = (pad, style) => {
          ctx.fillStyle = style; ctx.beginPath();
          const s0 = -8;
          const an = Math.atan2(ny, nx); ctx.arc(a.S[0], a.S[1], r0 + pad, an, an + Math.PI, false);
          let q = P(len + pad * 0.6, -(r1 + pad)); ctx.lineTo(q[0], q[1]);
          q = P(len + 4 + pad * 0.6, 0); ctx.lineTo(q[0], q[1]);
          q = P(len + pad * 0.6, r1 + pad); ctx.lineTo(q[0], q[1]);
          q = P(s0, r0 + pad); ctx.lineTo(q[0], q[1]);
          ctx.closePath(); ctx.fill();
        };
        poly(t, this._pat(ctx, sl.line)); poly(0, this._pat(ctx, sl.fill));
        // hem crease
        const h0 = P(len - 7, -r1 + 4), h1 = P(len - 5, r1 - 4);
        ctx.strokeStyle = this._pat(ctx, sl.line); ctx.lineWidth = 2; ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke(); ctx.globalAlpha /= 0.6;
      }
    }
  }
  _drawFront(ctx) {
    const c = this.cfg, A = c.arm, t = 3.1, line = this._pat(ctx, A.line), fill = this._pat(ctx, A.fill), rE = A.foreW / 2, rW = rE * 0.86, hs = c.handS, k = this.kind;
    for (const i of this._order) {
      const a = this.arms[i]; if (!a.E) continue;
      const hx = a.W[0], hy = a.W[1], sx = -a.side * hs;
      this._capsule(ctx, a.E, a.W, rE + t, rW + t, line);
      this._sprite(ctx, `${k}-hand-${a.type}-o`, hx, hy, a.rot, sx, hs);
      if (A.toWrist) { // sleeve to the wrist: hand tucks into the cuff
        this._sprite(ctx, `${k}-hand-${a.type}-f`, hx, hy, a.rot, sx, hs);
        this._capsule(ctx, a.E, a.W, rE, rW, fill);
        const dir = Math.atan2(a.W[1] - a.E[1], a.W[0] - a.E[0]);
        ctx.strokeStyle = line; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(hx, hy, rW - 1, dir - 1.25, dir + 1.25); ctx.stroke();
      } else {
        this._capsule(ctx, a.E, a.W, rE, rW, fill);
        this._sprite(ctx, `${k}-hand-${a.type}-f`, hx, hy, a.rot, sx, hs);
      }
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
    const parts = CFG[kind].parts();
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
  mom: { x: 0.185, y: 1.0, scale: 0.99, rot: 0.1, mood: 'adore', gaze: [0.75, 0.55], tilt: 0.1 },
  dad: { x: 0.815, y: 1.03, scale: 0.99, rot: -0.1, mood: 'adore', gaze: [-0.75, 0.55], tilt: -0.1 },
  baby: { x: 0.5, y: 0.765, scale: 1.15, rot: 0, mood: 'adore', gaze: [0, 0], tilt: 0.04 },
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
  const floorD = `M0 ${h * 0.74} C${w * 0.3} ${h * 0.7} ${w * 0.7} ${h * 0.7} ${w} ${h * 0.74} V${h} H0 Z`;
  let stars = '';
  for (const [u, v, r] of [[0.05, 0.12, 11], [0.36, 0.08, 8], [0.66, 0.1, 9], [0.95, 0.14, 10], [0.04, 0.55, 8], [0.96, 0.5, 9], [0.3, 0.22, 6], [0.71, 0.24, 6]]) stars += star(u * w, v * h, r * (0.9 + R() * 0.3));
  const inner = `<defs><radialGradient id="glow" cx="50%" cy="45%" r="62%"><stop offset="0" stop-color="#f4fbf8"/><stop offset="0.55" stop-color="#d6f0ec"/><stop offset="1" stop-color="#a9d8dc"/></radialGradient>
    <radialGradient id="vig" cx="50%" cy="48%" r="72%"><stop offset="0.62" stop-color="#5a8f9e" stop-opacity="0"/><stop offset="1" stop-color="#5a8f9e" stop-opacity=".38"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>` +
    `<g transform="rotate(-32)"><g filter="url(#grn)" opacity=".2"><path transform="rotate(32)" d="${wallD}" fill="#7fb8c4"/></g></g>` +
    `<g transform="rotate(-24)"><g filter="url(#hil)" opacity=".4"><path transform="rotate(24)" d="${wallD}" fill="#fff"/></g></g>` +
    cloud(w * 0.13, h * 0.3, 0.9) + cloud(w * 0.86, h * 0.33, 0.85) + cloud(w * 0.5, h * 0.06, 0.55) +
    blob(floorD, '#cfeadf', { shade: '#8fc7b3', g: 0.35, light: '#fff', l: 0.3, line: '#8fbfae', lw: 2.4 }) + stars +
    heart(w * 0.5, h * 0.105, 1.15, '#f590a8') + heart(w * 0.41, h * 0.17, 0.7, '#f9b2c3') + heart(w * 0.59, h * 0.165, 0.75, '#f7a0b6') +
    `<rect width="${w}" height="${h}" fill="url(#vig)"/>`;
  return part(`portrait-bd-${w}x${h}`, w, h, 0, 0, inner, 61);
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
  const bd = await portraitBackdropSprite(w, h);
  applyPortraitPose(mom, 'mom', w, h); applyPortraitPose(dad, 'dad', w, h); applyPortraitPose(baby, 'baby', w, h);
  mom._t = dad._t = baby._t = 0.2;
  for (let i = 0; i < 90; i++) { mom.update(1 / 30); dad.update(1 / 30); baby.update(1 / 30); }
  const s = h / 600, B = PORTRAIT_LAYOUT.baby;
  return canvasSprite(w, h, (x) => {
    x.save(); x.beginPath(); x.rect(0, 0, w, h); x.clip();
    x.drawImage(bd.img, 0, 0, w, h);
    mom.renderLayer(x, 'base'); dad.renderLayer(x, 'base');
    x.save(); x.globalAlpha = 0.16; x.fillStyle = '#2f5a5a'; x.beginPath(); x.ellipse(B.x * w, B.y * h + 2 * s, 120 * s, 12 * s, 0, 0, Math.PI * 2); x.fill(); x.restore();
    baby.render(x);
    mom.renderLayer(x, 'front'); dad.renderLayer(x, 'front');
    x.restore();
    drawPortraitFrame(x, w, h);
  });
}

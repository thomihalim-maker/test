// Characters: Ibu (mom), Ayah (dad), Bintang (baby) — rigged crayon puppets matching assets/reference.png.
//
// Public API (see CONTRACT.md):
//   const mom = await createCharacter('mom'|'dad'|'baby'); scene.root.add(mom); mom.x = 400; mom.y = 860;
//   mom.setMood(m)            persistent mood: idle | happy | cheer | surprised | think | sad | sleep  (+ 'adore')
//   mom.react(m, seconds?)    temporary mood with squash & stretch, then back to the setMood() mood
//   mom.talk(seconds?)        mouth flaps
//   mom.lookAt(worldX, worldY) / mom.lookAt(null)
//   await portraitSprite(w, h) → family-portrait sprite {img,w,h} (level-3 jigsaw picture)
// Origin (0,0) = bottom centre (base of the shirt / swaddle). Heights at scale 1: mom ≈ 560, dad ≈ 600, baby ≈ 230.
//
// Construction: every body part is its own small SVG (solid base fill + crayon grain overlays + wobbly pencil
// outline), rasterized ONCE (cached by key) and assembled as Nodes:
//   Character ─ rig (squash/stretch, hop, lean)
//                ├ body                       (breathing)
//                ├ headPivot (neck, tilt) ─ head ─ hood/ears · face · features(look offset: cheeks, eyes, brows,
//                │                                  nose, stubble, mouth) · hoodFront/hair
//                └ arm L/R: upper · fore · hand  (2-bone IK toward per-mood wrist targets, springy)
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { svgSprite, canvasSprite } from '../engine/raster.js';
import { rng } from '../engine/tween.js';
import { PAL } from './style.js';

export const MOODS = ['idle', 'happy', 'cheer', 'surprised', 'think', 'sad', 'sleep', 'adore'];

// ---------------------------------------------------------------- palette (sampled from the reference)
const C = {
  line: '#6d6765', ink: '#4a4442', inkSoft: '#5d5755',
  skin: '#ffffff', skinGrain: '#e9e0da',
  cheek: '#f7a3b6',
  hijab: '#e6825f', hijabShade: '#c4613f', hijabLight: '#f7ab8c', hijabLine: '#b85a3d', lace: '#df6e50',
  pink: '#fcc8de', pinkShade: '#ef9fc3', pinkLine: '#c98aa5',
  green: '#35b98f', greenShade: '#1f9572', greenLight: '#83dcbb', greenLine: '#2a8466',
  hair: '#858483', hairDark: '#5c5b5a', hairMid: '#757474', hairLight: '#b4b3b1',
  blue: '#2b53b4', blueDeep: '#1d3c8e', swirl: '#6fa2ef', swirl2: '#9cc2f7', swirl3: '#4a7bd6',
  star: '#f2cd52', starLight: '#fbe7a0',
  mouth: '#c4505f', tongue: '#f58c9d',
};

// ---------------------------------------------------------------- SVG helpers
const n1 = v => (Math.round(v * 10) / 10).toString();

function filters(x, y, w, h, D, seed) {
  const R = `filterUnits="userSpaceOnUse" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"`;
  const Q = `filterUnits="userSpaceOnUse" x="${-D}" y="${-D}" width="${2 * D}" height="${2 * D}"`;
  return `
  <filter id="wob" ${R}><feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="grn" ${Q}><feTurbulence type="fractalNoise" baseFrequency="0.95 0.22" numOctaves="3" seed="${seed + 11}" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.3 0 0 0 -1.38" result="a"/>
    <feComposite in="SourceGraphic" in2="a" operator="in"/></filter>
  <filter id="hil" ${Q}><feTurbulence type="fractalNoise" baseFrequency="1.1 0.25" numOctaves="2" seed="${seed + 29}" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.3 0 0 0 -1.46" result="a"/>
    <feComposite in="SourceGraphic" in2="a" operator="in"/></filter>
  <filter id="pen" ${R}><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="${seed + 5}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="${seed + 7}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.42" result="ga"/>
    <feComposite in="d" in2="ga" operator="in"/></filter>
  <filter id="blr" ${R}><feGaussianBlur stdDeviation="4.2"/></filter>`;
}

/** One rasterizable part. `inner` is authored in pivot-local coords (pivot at cx,cy of a w×h canvas). */
function part(key, w, h, cx, cy, inner, seed = 5, extraDefs = '') {
  const D = Math.ceil(Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy))) + 24;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${filters(-cx - 20, -cy - 20, w + 40, h + 40, D, seed)}${extraDefs}</defs><g transform="translate(${cx} ${cy})">${inner}</g></svg>`;
  return { key: 'chr2-' + key, svg: s, w, h, ax: cx / w, ay: cy / h };
}

/** Crayon-filled shape: solid opaque base (wobbly edge) + darker streak grain + light streak grain + pencil line. */
function blob(d, col, o = {}) {
  const { shade, light, g = 0.42, l = 0.3, lw = 3.4, line = C.line, ang = -32, outline = true, open = null, rule = 'nonzero' } = o;
  let s = `<path d="${d}" fill="${col}" fill-rule="${rule}" filter="url(#wob)"/>`;
  if (shade) s += `<g transform="rotate(${ang})"><g filter="url(#grn)" opacity="${g}"><path transform="rotate(${-ang})" d="${d}" fill-rule="${rule}" fill="${shade}"/></g></g>`;
  if (light) s += `<g transform="rotate(${ang + 8})"><g filter="url(#hil)" opacity="${l}"><path transform="rotate(${-ang - 8})" d="${d}" fill-rule="${rule}" fill="${light}"/></g></g>`;
  if (outline) s += ln(open || d, lw, line);
  return s;
}
const ln = (d, w = 3.2, col = C.line, op = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" filter="url(#pen)"/>`;
const dot = (x, y, rx, ry, col = C.ink) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${rx}" ry="${ry}" fill="${col}" filter="url(#pen)"/>`;
function ellD(cx, cy, rx, ry, rot = 0) {
  const a = rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const p = (t) => [cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c];
  const [x0, y0] = p(0), [x1, y1] = p(Math.PI);
  return `M${n1(x0)} ${n1(y0)} A${rx} ${ry} ${rot} 0 1 ${n1(x1)} ${n1(y1)} A${rx} ${ry} ${rot} 0 1 ${n1(x0)} ${n1(y0)} Z`;
}
const cubicPt = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };

// ---------------------------------------------------------------- shared face parts
function eyeParts(k, lashes, big = 1) {
  const L = lashes ? ln('M5.5 -6.5 L10.5 -11.5 M8.5 -2.5 L14 -5', 2.2, C.inkSoft) : '';
  const Lc = lashes ? ln('M9 0 L13.5 4.5 M5 3.5 L8 8', 2.2, C.inkSoft) : '';
  return [
    part(`${k}-eye-open`, 44, 44, 22, 22, dot(0, 0, 6 * big, 8.6 * big) + L),
    part(`${k}-eye-wide`, 44, 48, 22, 24, dot(0, 0, 7.2 * big, 10.6 * big) + `<ellipse cx="${-2 * big}" cy="${-4 * big}" rx="1.8" ry="2.2" fill="#fff" opacity=".9"/>` + L),
    part(`${k}-eye-closed`, 44, 40, 22, 20, ln(`M${-11 * big} -2 Q0 ${8 * big} ${11 * big} -2`, 3.4, C.ink) + Lc),
    part(`${k}-eye-happy`, 44, 40, 22, 20, ln(`M${-11 * big} 4 Q0 ${-9 * big} ${11 * big} 4`, 3.6, C.ink)),
    part(`${k}-eye-blink`, 44, 30, 22, 15, ln(`M${-9 * big} 0 Q0 2.5 ${9 * big} 0`, 3.2, C.ink) + (lashes ? ln('M9 0 L13 -3', 2.2, C.inkSoft) : '')),
  ];
}
function mouthParts(k, s = 1) {
  const open = (wd, dp, tongue) => {
    const d = `M${-wd} -4 Q0 ${-1} ${wd} -4 Q${wd - 2} ${dp} 0 ${dp + 1} Q${-wd + 2} ${dp} ${-wd} -4 Z`;
    return `<path d="${d}" fill="${C.mouth}"/>` + (tongue ? `<clipPath id="mc"><path d="${d}"/></clipPath><ellipse clip-path="url(#mc)" cx="0" cy="${dp - 3}" rx="${wd * 0.55}" ry="${dp * 0.42}" fill="${C.tongue}"/>` : '') + ln(d, 3, C.ink);
  };
  return [
    part(`${k}-m-smile`, 70, 44, 35, 18, ln(`M${-12 * s} -2 Q0 ${9 * s} ${12 * s} -2`, 3.3, C.ink)),
    part(`${k}-m-grin`, 70, 50, 35, 18, open(16 * s, 15 * s, true)),
    part(`${k}-m-laugh`, 80, 60, 40, 20, open(20 * s, 22 * s, true)),
    part(`${k}-m-o`, 50, 50, 25, 25, `<ellipse cx="0" cy="0" rx="${6.5 * s}" ry="${8.5 * s}" fill="${C.mouth}"/><ellipse cx="0" cy="${4 * s}" rx="${4 * s}" ry="${3 * s}" fill="${C.tongue}"/>` + ln(ellD(0, 0, 6.5 * s, 8.5 * s), 3, C.ink)),
    part(`${k}-m-wavy`, 70, 40, 35, 20, ln(`M${-14 * s} 1 Q${-7 * s} -5 0 0 Q${7 * s} 5 ${14 * s} -1`, 3.2, C.ink)),
    part(`${k}-m-closed`, 50, 30, 25, 15, ln(`M${-6 * s} 0 Q0 ${3 * s} ${6 * s} 0`, 3.2, C.ink)),
    part(`${k}-m-frown`, 60, 36, 30, 18, ln(`M${-11 * s} 5 Q0 ${-5 * s} ${11 * s} 5`, 3.3, C.ink)),
  ];
}
const brow = (k, wdt = 3.2) => part(`${k}-brow`, 40, 24, 20, 12, ln('M-11 3 Q-1 -4 11 1', wdt, C.inkSoft));
const cheek = (k, rx = 21, ry = 12) => part(`${k}-cheek`, rx * 2 + 34, ry * 2 + 34, rx + 17, ry + 17, `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${C.cheek}" opacity=".9" filter="url(#blr)"/>`);

// ---------------------------------------------------------------- hands (pivot = wrist, fingers point to -y)
function handOpen() {
  const f = [[-22.5, -11.5, -57], [-11.5, 0, -67], [0, 11.5, -69], [11.5, 22, -61]];
  let d = 'M-19 3 C-22 -12 -23.5 -26 -22.5 -40';
  f.forEach(([a, b, top], i) => {
    const r = (b - a) / 2;
    d += ` L${a} ${top + r} A${r} ${r} 0 0 1 ${b} ${top + r}`;
    if (i < f.length - 1) d += ` L${b} ${-41 + i}`;
  });
  d += ' L22 -36 C26 -40 31 -47 35 -49 C40 -51 43 -46 40 -40 C35 -30 28 -18 24 -12 C22 -6 21 -2 19 3';
  const creases = ln('M-11.5 -41 L-11.5 -46 M0 -42 L0 -47 M11.5 -41 L11.5 -45', 2.2, C.line, 0.9) + ln('M-6 -22 Q2 -18 10 -24', 1.8, C.line, 0.45);
  return blob(d, C.skin, { shade: C.skinGrain, g: 0.14, open: d, lw: 3 }) + creases;
}
function handRest() {
  const d = 'M-17 3 C-21 -14 -22 -38 -15 -51 C-8 -62 10 -62 16 -51 C21 -40 21 -28 20 -20 C26 -24 31 -30 30 -36 C30 -40 26 -42 22 -38 M20 -20 C20 -10 19 -3 17 3';
  const fill = 'M-17 3 C-21 -14 -22 -38 -15 -51 C-8 -62 10 -62 16 -51 C21 -40 21 -28 20 -20 C26 -24 31 -30 30 -36 C30 -40 26 -42 21 -38 L20 -20 C20 -10 19 -3 17 3 Z';
  return blob(fill, C.skin, { shade: C.skinGrain, g: 0.14, outline: false }) + ln('M-17 3 C-21 -14 -22 -38 -15 -51 C-8 -62 10 -62 16 -51 C21 -40 21 -28 20 -18 C20 -10 19 -3 17 3', 3) +
    ln('M20 -22 C26 -25 31 -31 30 -37 C29 -42 24 -42 21 -37', 2.8) + ln('M-6 -59 L-6 -50 M5 -59 L5 -51', 2.2, C.line, 0.85);
}
function handPoint() {
  const fist = 'M-18 3 C-22 -12 -22 -30 -14 -37 C-4 -43 12 -43 18 -33 C22 -22 22 -8 18 3';
  const finger = 'M-7 -32 L-7 -66 A6.5 6.5 0 0 1 6 -66 L6 -34 Z';
  return blob(finger, C.skin, { shade: C.skinGrain, g: 0.14, lw: 3 }) + blob(fist + ' Z', C.skin, { shade: C.skinGrain, g: 0.14, open: fist, lw: 3 }) +
    ln('M-16 -24 Q-4 -19 12 -25 M-15 -13 Q-3 -9 12 -14', 2, C.line, 0.7) + ln('M18 -30 C10 -26 2 -24 -6 -26', 2.4, C.line, 0.9);
}
const handParts = k => [
  part(`${k}-hand-open`, 100, 110, 50, 88, handOpen(), 9),
  part(`${k}-hand-rest`, 100, 104, 50, 82, handRest(), 9),
  part(`${k}-hand-point`, 100, 104, 50, 84, handPoint(), 9),
];

// capsule pointing +y, top cap centre at (0,0), bottom cap centre at (0,L)
const capD = (r, L) => `M${-r} 0 L${-r} ${L} A${r} ${r} 0 0 0 ${r} ${L} L${r} 0 A${r} ${r} 0 0 0 ${-r} 0 Z`;
const capOpen = (r, L) => `M${-r} 6 L${-r} ${L} A${r} ${r} 0 0 0 ${r} ${L} L${r} 6`;
const capPart = (key, r, L, inner) => part(key, Math.ceil(2 * r + 40), Math.ceil(L + 2 * r + 40), Math.ceil(r + 20), Math.ceil(r + 20), inner, 13);

// ---------------------------------------------------------------- MOM
const MOM_FACE = 'M0 -112 C72 -112 122 -70 124 -6 C127 56 90 113 0 115 C-90 113 -127 56 -124 -6 C-122 -70 -72 -112 0 -112 Z';
function momParts() {
  const k = 'mom';
  // hood: dome + side drapes + bib under the chin, knot on the viewer's left
  const hood = 'M-168 -18 C-172 -132 -96 -202 0 -202 C100 -202 172 -132 168 -18 C168 62 176 132 184 186 C132 236 62 252 0 252 C-62 252 -132 236 -184 186 C-176 132 -168 62 -168 -18 Z';
  const tail1 = 'M-168 -38 C-190 -8 -200 32 -196 76 C-191 80 -186 80 -181 76 C-185 36 -178 2 -158 -28 Z';
  const tail2 = 'M-171 -42 C-202 -30 -219 -4 -226 30 C-222 35 -216 36 -212 33 C-206 6 -192 -16 -163 -31 Z';
  const loop = 'M-166 -50 C-186 -66 -206 -96 -222 -88 C-236 -80 -214 -56 -172 -44';
  const fold = ln('M-14 140 C-12 176 -8 208 -4 244 M58 128 C68 160 78 190 92 226 M-78 132 C-94 162 -106 190 -120 216', 2.6, C.hijabShade, 0.75) +
    ln('M-158 -52 C-138 -58 -124 -62 -110 -64 M-157 -30 C-140 -33 -128 -34 -114 -33', 2.4, C.hijabShade, 0.8);
  const hoodSvg = blob(tail2, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, lw: 3 }) +
    blob(tail1, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, lw: 3 }) +
    blob(hood, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, g: 0.5, l: 0.35 }) + fold +
    `<path d="${loop}" fill="none" stroke="${C.hijabLine}" stroke-width="11" stroke-linecap="round" filter="url(#pen)"/><path d="${loop}" fill="none" stroke="${C.hijab}" stroke-width="6.5" stroke-linecap="round" filter="url(#wob)"/>` +
    blob(ellD(-169, -44, 12, 14, 10), C.hijab, { shade: C.hijabShade, line: C.hijabLine, lw: 2.8 });

  // forehead band + scalloped lace cap peeking under it
  const E1 = [[-123, 2], [-126, -60], [-76, -101], [0, -101]], E2 = [[0, -101], [76, -101], [126, -60], [123, 2]];
  const pts = []; const N = 7;
  for (let i = 0; i <= N; i++) pts.push(cubicPt(...E1, 0.18 + 0.82 * i / N));
  for (let i = 1; i <= N; i++) pts.push(cubicPt(...E2, 0.82 * i / N));
  let sc = `M${n1(pts[0][0])} ${n1(pts[0][1] - 6)} L${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) { const r = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / 2 + 0.6; sc += ` A${n1(r)} ${n1(r)} 0 0 0 ${n1(pts[i][0])} ${n1(pts[i][1])}`; }
  const scOpen = sc;
  sc += ` L${n1(pts[pts.length - 1][0])} ${n1(pts[pts.length - 1][1] - 8)} Z`;
  const band = 'M-123 2 C-126 -60 -76 -101 0 -101 C76 -101 126 -60 123 2 L139 8 C146 -82 86 -130 0 -130 C-86 -130 -146 -82 -139 8 Z';
  const hoodFront = `<path d="${sc}" fill="#fff"/>` + ln(scOpen, 2.7, C.lace) +
    blob(band, C.hijab, { shade: C.hijabShade, light: C.hijabLight, line: C.hijabLine, open: 'M-123 2 C-126 -60 -76 -101 0 -101 C76 -101 126 -60 123 2', g: 0.5 });

  // shirt (pink long sleeves)
  const shirt = 'M-118 -238 C-150 -230 -172 -192 -176 -132 C-180 -72 -183 -34 -179 -4 C-120 4 120 4 179 -4 C183 -34 180 -72 176 -132 C172 -192 150 -230 118 -238 C60 -252 -60 -252 -118 -238 Z';
  const body = blob(shirt, C.pink, { shade: C.pinkShade, light: '#fff', g: 0.5, l: 0.35, line: C.pinkLine }) +
    ln('M-150 -46 C-80 -30 70 -32 148 -48', 2.6, C.pinkShade, 0.9) + ln('M-60 -150 C-50 -110 -54 -80 -64 -60', 2.2, C.pinkShade, 0.6);

  const r1 = 29, r2 = 27, L1 = 92, L2 = 88;
  const upper = blob(capD(r1, L1), C.pink, { shade: C.pinkShade, light: '#fff', open: capOpen(r1, L1), line: C.pinkLine, g: 0.5 });
  const fore = blob(capD(r2, L2), C.pink, { shade: C.pinkShade, light: '#fff', line: C.pinkLine, g: 0.5 }) + ln(`M${-r2 + 3} ${L2 - 6} Q0 ${L2} ${r2 - 3} ${L2 - 6}`, 2.4, C.pinkShade, 0.9);

  return [
    part('mom-body', 400, 272, 200, 262, body, 21),
    part('mom-hood', 450, 490, 245, 222, hoodSvg, 17),
    part('mom-face', 290, 270, 145, 133, blob(MOM_FACE, C.skin, { shade: C.skinGrain, g: 0.14 }), 4),
    part('mom-hoodfront', 330, 175, 165, 145, hoodFront, 17),
    capPart('mom-upper', r1, L1, upper), capPart('mom-fore', r2, L2, fore),
    part('mom-nose', 40, 40, 20, 20, ln('M-1 -8 C8 -9 10 2 2 4', 2.8, C.inkSoft)),
    ...eyeParts(k, true), ...mouthParts(k), brow(k), cheek(k), ...handParts(k),
  ];
}

// ---------------------------------------------------------------- DAD
const DAD_FACE = 'M0 -124 C86 -124 145 -76 147 -2 C149 70 104 128 0 128 C-104 128 -149 70 -147 -2 C-145 -76 -86 -124 0 -124 Z';
function dadHair() {
  const R = rng(77);
  // curly cloud silhouette over the top + swept fringe with curl tips
  const cx = 0, cy = -96, rx = 178, ry = 150;
  const a0 = Math.PI * 1.03, a1 = -Math.PI * 0.035, N = 9;
  const P = t => [cx + rx * Math.cos(t), cy - ry * Math.sin(t)];
  let d = 'M-150 -6 C-166 -24 -176 -52 ' + P(a0).map(n1).join(' ');
  for (let i = 1; i <= N; i++) {
    const ta = a0 + (a1 - a0) * (i - 1) / N, tb = a0 + (a1 - a0) * i / N, tm = (ta + tb) / 2;
    const bulge = 1.07 + R() * 0.05;
    const c1 = [cx + rx * bulge * Math.cos(tm - 0.05), cy - ry * bulge * Math.sin(tm - 0.05)];
    d += ` Q${n1(c1[0])} ${n1(c1[1])} ${P(tb).map(n1).join(' ')}`;
  }
  d += ' C174 -60 164 -26 150 -12';
  // fringe (right → left), curl tips hanging down
  d += ' Q140 -40 128 -58 Q124 -44 112 -40 Q100 -60 84 -70 Q70 -58 56 -60 Q44 -80 22 -86 Q6 -74 -10 -80 Q-30 -98 -56 -94 Q-66 -80 -82 -82 Q-100 -90 -116 -78 Q-122 -60 -134 -56 Q-144 -34 -150 -6 Z';
  // texture: dense sweeping crayon strokes following the head curve (front-left → back-right), wavy
  let tex = '';
  const cols = [C.hairDark, C.hairDark, '#666564', C.hairMid, C.hairMid, '#a09f9d', C.hairLight, '#cfcecc'];
  for (let i = 0; i < 300; i++) {
    const u = R(), v = 0.25 + 0.8 * Math.sqrt(R());
    const ang = Math.PI * (1.1 - u * 1.2);
    const px = rx * 0.98 * v * Math.cos(ang), py = -40 - ry * 1.12 * v * Math.sin(ang);
    const tang = ang - Math.PI / 2 + 0.35 + (R() - 0.5) * 0.5;
    const len = 30 + R() * 60, nx = -Math.sin(tang), ny = -Math.cos(tang);
    const dx = Math.cos(tang) * len / 2, dy = -Math.sin(tang) * len / 2, bend = (R() - 0.5) * 22;
    const col = cols[(R() * cols.length) | 0];
    tex += `<path d="M${n1(px - dx)} ${n1(py - dy)} Q${n1(px + nx * bend)} ${n1(py + ny * bend)} ${n1(px + dx)} ${n1(py + dy)}" stroke="${col}" stroke-width="${n1(1.4 + R() * 2.6)}" fill="none" stroke-linecap="round" opacity="${n1(0.5 + R() * 0.45)}"/>`;
  }
  const defs = `<clipPath id="hc"><path d="${d}"/></clipPath>`;
  const svgIn = `<path d="${d}" fill="${C.hair}" filter="url(#wob)"/><g clip-path="url(#hc)"><g filter="url(#pen)">${tex}</g></g>` + ln(d, 3, C.hairDark, 0.7);
  return { svgIn, defs };
}
function dadParts() {
  const k = 'dad';
  const hair = dadHair();
  const ear = blob('M-8 -26 C16 -34 32 -12 28 8 C24 28 4 32 -8 24 Z', C.skin, { shade: C.skinGrain, g: 0.14, open: 'M-8 -26 C16 -34 32 -12 28 8 C24 28 4 32 -8 24' }) + ln('M4 -12 C16 -10 18 4 9 11 M9 -2 Q12 2 8 5', 2.4);
  const shirt = 'M-110 -226 C-150 -222 -176 -190 -180 -130 C-184 -70 -182 -32 -178 -4 C-120 4 120 4 178 -4 C182 -32 184 -70 180 -130 C176 -190 150 -222 110 -226 C80 -232 54 -230 42 -226 C22 -212 -22 -212 -42 -226 C-54 -230 -80 -232 -110 -226 Z';
  const neck = 'M-40 -270 L-40 -224 C-22 -208 22 -208 40 -224 L40 -270 Z';
  const body = blob(neck, C.skin, { shade: C.skinGrain, g: 0.25, open: 'M-40 -262 L-40 -224 M40 -224 L40 -262' }) +
    blob(shirt, C.green, { shade: C.greenShade, light: C.greenLight, g: 0.5, l: 0.3, line: C.greenLine }) +
    ln('M-46 -224 C-26 -204 26 -204 46 -224', 2.6, C.greenLine, 0.9) + ln('M-60 -150 C-50 -110 -56 -70 -66 -46 M70 -120 C80 -90 76 -60 70 -40', 2.4, C.greenShade, 0.7);
  const r1 = 22, r2 = 21, L1 = 96, L2 = 92;
  const sleeve = 'M-34 -32 C-36 20 -38 50 -36 70 C-14 78 16 78 36 66 C38 44 36 16 34 -32 Z';
  const upper = blob(capD(r1, L1), C.skin, { shade: C.skinGrain, g: 0.14, open: capOpen(r1, L1) }) +
    blob(sleeve, C.green, { shade: C.greenShade, light: C.greenLight, g: 0.5, line: C.greenLine, open: 'M-34 -4 C-36 20 -38 50 -36 70 C-14 78 16 78 36 66 C38 44 36 16 34 -4' });
  const fore = blob(capD(r2, L2), C.skin, { shade: C.skinGrain, g: 0.14 });
  // stubble dots around the mouth
  const R = rng(19); let stub = '';
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.05 + R() * 0.9) * (R() < 0.42 ? -1 : 1);
    const rr = 0.78 + R() * 0.32;
    const x = Math.cos(a) * 46 * rr, y = 6 + Math.sin(a) * 26 * rr;
    if (Math.abs(x) < 16 && y > -10 && y < 18) continue;
    stub += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(1.5 + R() * 0.8)}" fill="#8b8583"/>`;
  }
  return [
    part('dad-body', 400, 300, 200, 290, body, 23),
    part('dad-ear', 70, 80, 22, 40, ear, 6),
    part('dad-face', 320, 280, 160, 138, blob(DAD_FACE, C.skin, { shade: C.skinGrain, g: 0.14 }), 8),
    part('dad-hair', 420, 300, 210, 268, hair.svgIn, 31, hair.defs),
    capPart('dad-upper', 38, L1, `<g transform="translate(0 0)">${upper}</g>`), capPart('dad-fore', r2, L2, fore),
    part('dad-nose', 40, 40, 20, 20, ln('M5 -9 C-6 -11 -9 4 3 5', 2.9, C.inkSoft)),
    part('dad-stubble', 130, 90, 65, 40, `<g filter="url(#pen)">${stub}</g>`),
    ...eyeParts(k, false), ...mouthParts(k, 1.08), brow(k, 3.8), cheek(k, 22, 12), ...handParts(k),
  ];
}

// ---------------------------------------------------------------- BABY
function babyParts() {
  const k = 'baby';
  const R = rng(5);
  const sw = 'M-96 -100 C-112 -70 -110 -26 -86 -7 C-50 6 50 6 86 -7 C110 -26 112 -70 96 -100 C62 -130 -62 -130 -96 -100 Z';
  let sw2 = '';
  // Van Gogh swirls: concentric spiral strokes around a few centres + flowing streams
  const centres = [[-52, -52, 30], [40, -74, 24], [58, -28, 20], [-8, -22, 16]];
  const scol = [C.swirl, C.swirl2, C.swirl3];
  for (const [x0, y0, rmax] of centres) {
    for (let ring = 0; ring < 5; ring++) {
      const r0 = 5 + ring * rmax / 4.2, a0 = R() * 6.28, span = 3.6 + R() * 1.8;
      let d = '';
      for (let s = 0; s <= 18; s++) {
        const a = a0 + span * s / 18, rr = r0 * (1 + 0.25 * s / 18);
        d += (s ? ' L' : 'M') + n1(x0 + Math.cos(a) * rr * 1.25) + ' ' + n1(y0 + Math.sin(a) * rr * 0.8);
      }
      sw2 += `<path d="${d}" stroke="${scol[ring % 3]}" stroke-width="${n1(2.4 + R() * 1.6)}" fill="none" stroke-linecap="round" opacity=".9"/>`;
    }
  }
  for (let i = 0; i < 16; i++) {
    const y = -118 + i * 8 + R() * 5, x = -110 + R() * 20, len = 60 + R() * 120;
    sw2 += `<path d="M${n1(x)} ${n1(y)} q${n1(len * 0.3)} ${n1(-12 + R() * 8)} ${n1(len * 0.55)} ${n1(-2 + R() * 6)} t${n1(len * 0.45)} ${n1(-4 + R() * 8)}" stroke="${scol[(R() * 3) | 0]}" stroke-width="${n1(1.8 + R() * 1.6)}" fill="none" stroke-linecap="round" opacity=".65"/>`;
  }
  const stars = [[-60, -76, 13], [68, -48, 11.5], [10, -98, 7], [-30, -28, 8], [86, -90, 6], [-88, -42, 5], [32, -18, 5]];
  let st = '';
  for (const [x, y, r] of stars) {
    st += `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="${C.starLight}" stroke-width="2" opacity=".55"/>` +
      `<path d="${ellD(x, y, r, r * 0.92, R() * 40)}" fill="${C.star}" filter="url(#wob)"/>` + `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="${C.starLight}" opacity=".7"/>`;
  }
  const swDefs = `<clipPath id="sc"><path d="${sw}"/></clipPath>`;
  const swaddle = `<path d="${sw}" fill="${C.blue}" filter="url(#wob)"/>` +
    `<g clip-path="url(#sc)"><g filter="url(#pen)">${sw2}</g>${st}` +
    `<g transform="rotate(-30)"><g filter="url(#grn)" opacity=".45"><path transform="rotate(30)" d="${sw}" fill="${C.blueDeep}"/></g></g></g>` +
    ln('M-70 -112 C-40 -84 -10 -60 30 -40 C55 -28 80 -18 96 -24', 2.6, C.blueDeep, 0.8) + ln(sw, 3.2, '#2a3f78', 0.85);

  const head = 'M0 -76 C64 -76 106 -46 106 4 C106 50 62 76 0 76 C-62 76 -106 50 -106 4 C-106 -46 -64 -76 0 -76 Z';
  const earR = 'M96 -10 C114 -16 124 2 116 14 C110 24 98 24 92 18';
  const earL = 'M-96 -10 C-114 -16 -124 2 -116 14 C-110 24 -98 24 -92 18';
  const headSvg = blob(earR + ' Z', C.skin, { open: earR, lw: 3 }) + blob(earL + ' Z', C.skin, { open: earL, lw: 3 }) +
    ln('M-108 3 C-114 -3 -116 8 -110 12', 2.2) +
    blob(head, C.skin, { shade: C.skinGrain, g: 0.14 }) +
    ln('M-94 -22 C-84 -54 -46 -68 -6 -69 M10 -69 C46 -67 80 -54 94 -30', 2.4, C.line, 0.85) +
    ln('M-16 -69 Q-10 -60 -3 -55 M-2 -70 Q3 -62 9 -58 M24 -68 Q30 -61 37 -59', 2.4, C.line, 0.9) +
    ln('M106 6 C112 4 113 12 108 14', 2.2, C.line, 0.6);
  return [
    part('baby-swaddle', 260, 152, 130, 140, swaddle, 41, swDefs),
    part('baby-head', 260, 190, 130, 95, headSvg, 3),
    ...eyeParts(k, false, 1.02), ...mouthParts(k, 0.9), brow(k, 2.6), cheek(k, 18, 10.5),
    part('baby-eye-content', 44, 40, 22, 20, ln('M-12 -3 Q0 8 12 -3', 3.3, C.ink)),
  ];
}

// ---------------------------------------------------------------- rig configs
const CFG = {
  mom: { parts: momParts, h: 560, w: 370, neck: [0, -232], face: -118, shoulder: [126, -203], L1: 92, L2: 88, handS: 1, facing: 13, faceR: [124, 114],
    eye: [37, 4], brow: [41, -30], cheek: [80, 36], mouth: [3, 56], nose: [8, 27] },
  dad: { parts: dadParts, h: 600, w: 380, neck: [0, -236], face: -128, shoulder: [134, -198], L1: 96, L2: 92, handS: 1.1, facing: -13, faceR: [147, 126],
    eye: [42, 2], brow: [45, -34], cheek: [92, 34], mouth: [0, 64], nose: [-3, 28], stubble: [0, 58], ears: 146 },
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
  think: { eye: 'open', mouth: 'wavy', brow: [-3, -0.1], cheek: 0.9, gaze: [0.5, -0.8] },
  sad: { eye: 'open', mouth: 'frown', brow: [-2, 0.4], cheek: 0.8, gaze: [0, 0.6] },
  sleep: { eye: 'content', mouth: 'closed', cheek: 1.05 },
};
const POSE = { // arms (viewer-left, viewer-right) + head tilt + body lean
  idle: { arms: ['rest', 'rest'], tilt: 0, lean: 0 },
  happy: { arms: ['up', 'up'], tilt: 0.03, lean: 0 },
  cheer: { arms: ['clap', 'clap'], tilt: 0, lean: 0 },
  surprised: { arms: ['cheek', 'cheek'], tilt: 0, lean: -0.02 },
  adore: { arms: ['cheek', 'cheek'], tilt: 0.07, lean: 0.02 },
  think: { arms: ['hold', 'chin'], tilt: -0.08, lean: 0 },
  sad: { arms: ['clasp', 'clasp'], tilt: 0.08, lean: 0 },
  sleep: { arms: ['clasp', 'clasp'], tilt: 0.13, lean: 0 },
};

// ---------------------------------------------------------------- Character
const damp = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

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
    this._hop = 0; this._hopT = 0; this._wig = 0;
    this.w = this.cfg.w; this.h = this.cfg.h + 10; this.ax = 0.5; this.ay = 1;
    this._build();
  }
  node(key, o = {}) { const sp = this.S[key]; const nd = new Node({ ax: sp.ax, ay: sp.ay, ...o }); nd.setImage(sp); return nd; }
  _build() {
    const c = this.cfg, k = this.kind;
    this.rig = this.add(new Node());
    if (k === 'baby') this.body = this.rig.add(this.node('baby-swaddle'));
    else this.body = this.rig.add(this.node(`${k}-body`));
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
    if (k === 'baby') { this.browL.alpha = this.browR.alpha = 0; }
    if (k !== 'baby') {
      this.arms = [-1, 1].map(side => {
        const a = { side, upper: this.rig.add(this.node(`${k}-upper`)), fore: this.rig.add(this.node(`${k}-fore`)), hand: this.rig.add(this.node(`${k}-hand-rest`, { sx: -side * c.handS, sy: c.handS })) };
        const rest = this._target(side, 'rest');
        a.x = rest.x; a.y = rest.y; a.vx = 0; a.vy = 0; a.type = 'rest'; a.hr = 0;
        return a;
      });
    }
    this._img = {}; // current sprite keys (avoid redundant swaps)
  }
  // ---- API
  setMood(m) { if (!FACE[m]) m = 'idle'; this.base = m; if (this._react <= 0) this.mood = m; return this; }
  react(m, sec = 1.6) {
    if (!FACE[m]) m = 'idle';
    this.mood = m; this._react = sec;
    this._sqv += m === 'sad' || m === 'think' ? -1.2 : -2.4; // anticipation squash → springs into a stretch
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
      case 'cheek': { const p = this._headXY(side * c.faceR[0] * 0.84 + c.facing * 0.4, c.faceR[1] * 0.92); return { x: p.x, y: p.y, hand: 'open', rot: -side * 0.2 + this.headPivot.rot, abs: true, down: true }; }
      case 'chin': { const p = this._headXY(c.facing + side * 6, c.faceR[1] * 0.9 + 60 * c.handS); return { x: p.x, y: p.y, hand: 'point', rot: 0, abs: true }; }
      case 'clap': { const g = 6 + 34 * (0.5 + 0.5 * Math.cos(t * 14)); return { x: side * (g + 14), y: sy + 6, hand: 'open', rot: side * 0.15, abs: true, down: true }; }
      case 'up': { const w = Math.sin(t * 6 + side) * 14; return { x: side * (sx + 62) + w, y: sy - reach * 0.86, hand: 'open', rot: side * 0.15 + Math.sin(t * 6 + side) * 0.2, abs: true }; }
      case 'clasp': return { x: side * 16, y: sy + reach * 0.66, hand: 'rest', rot: side * 1.3, abs: true, low: true };
      case 'hold': return { x: side * -18, y: sy + reach * 0.5, hand: 'rest', rot: side * 1.1, abs: true };
      default: return { x: side * (sx * 0.62), y: sy + reach * 0.72, hand: 'rest', rot: side * 0.75, abs: true, low: true };
    }
  }
  _set(nd, key) { if (nd._key !== key) { nd._key = key; nd.setImage(this.S[key]); nd.ax = this.S[key].ax; nd.ay = this.S[key].ay; } }

  update(dt) {
    dt = Math.min(dt, 0.05);
    const c = this.cfg, k = this.kind, baby = k === 'baby';
    if (!this.frozen) this._t += dt;
    const t = this._t;
    if (this._react > 0) { this._react -= dt; if (this._react <= 0) this.mood = this.base; }
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
    const kS = 300, dS = 12;
    this._sqv += (-kS * this._sq - dS * this._sqv) * dt; this._sq += this._sqv * dt;
    let hopY = 0, hopSq = 0;
    const hopping = mood === 'cheer' || this._hop > 0;
    if (hopping) {
      const P = baby ? 0.42 : 0.56; this._hopT += dt;
      const u = (this._hopT % P) / P;
      const H = baby ? 12 : 30;
      if (u < 0.78) { const v = u / 0.78; hopY = -H * 4 * v * (1 - v); hopSq = 0.04 * Math.sin(v * Math.PI); } // stretch in the air
      else { const v = (u - 0.78) / 0.22; hopSq = -0.09 * Math.sin(v * Math.PI); } // squash on landing
      if (this._hop > 0 && mood !== 'cheer') { this._hop -= dt / P; if (this._hop <= 0) { this._hop = 0; this._hopT = 0; } }
    } else this._hopT = 0;

    // breathing
    const br = asleep ? Math.sin(t * 1.5) : Math.sin(t * 2.3);
    const breath = 1 + br * (asleep ? 0.022 : 0.012);
    this.body.sy = breath; this.body.sx = 1 - br * 0.006;

    // rig
    const s = this._sq + hopSq;
    this.rig.sy = 1 + s; this.rig.sx = 1 - s * 0.7;
    this.rig.y = hopY;
    this._lean = damp(this._lean, pose.lean, 6, dt);
    let wig = 0;
    if (baby) {
      if (mood === 'happy' || mood === 'cheer') wig = Math.sin(t * 20) * 0.045 + Math.sin(t * 7) * 0.03;
      else if (asleep) wig = Math.sin(t * 0.9) * 0.012;
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

    // face: parallax "turn" — features move most, face a little, hair/hood opposite
    const fx = c.facing + this._gaze.x * 11, fy = this._gaze.y * 7;
    this.features.x = damp(this.features.x, fx, 12, dt); this.features.y = damp(this.features.y, fy, 12, dt);
    this.face.x = this._gaze.x * 2.5;
    if (this.front) this.front.x = -this._gaze.x * 2.5;
    if (this.earL) { this.earL.x = -c.ears - this._gaze.x * 4; this.earR.x = c.ears - this._gaze.x * 4; }

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
    if (talking) { const ph = Math.floor(t * 9) % 4; mouth = ['o', 'grin', 'smile', 'laugh'][ph]; msy = 0.85 + 0.25 * Math.abs(Math.sin(t * 28)); }
    this._set(this.mouth, `${k}-m-${mouth}`);
    this.mouth.sy = msy;
    this.mouth.y = c.mouth[1];

    // cheeks
    this._cheek = damp(this._cheek, face.cheek, 6, dt);
    this.cheekL.sx = this.cheekL.sy = this.cheekR.sx = this.cheekR.sy = this._cheek;

    // arms: springy wrists → 2-bone IK
    if (this.arms) for (const a of this.arms) {
      const tg = this._target(a.side, pose.arms[a.side < 0 ? 0 : 1]);
      if (this.frozen) { a.x = tg.x; a.y = tg.y; a.vx = a.vy = 0; }
      else {
        const kk = 170, dd = 2 * Math.sqrt(kk) * 0.62;
        a.vx += (kk * (tg.x - a.x) - dd * a.vx) * dt; a.vy += (kk * (tg.y - a.y) - dd * a.vy) * dt;
        a.x += a.vx * dt; a.y += a.vy * dt;
      }
      a.hr = damp(a.hr, tg.rot, 10, dt);
      this._set(a.hand, `${k}-hand-${tg.hand}`);
      this._solve(a, tg.abs, breath, tg.down, tg.low);
    }
  }
  _solve(a, abs, breath, down, low) {
    const c = this.cfg, side = a.side, L1 = c.L1, L2 = c.L2;
    const Sx = side * c.shoulder[0], Sy = c.shoulder[1] * breath;
    let dx = a.x - Sx, dy = a.y - Sy; let d = Math.hypot(dx, dy) || 1;
    const dc = clamp(d, Math.abs(L1 - L2) + 8, L1 + L2 - 1);
    const ang = Math.atan2(dy, dx), cb = clamp((L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc), -1, 1), B = Math.acos(cb);
    const e1 = [Sx + L1 * Math.cos(ang + B), Sy + L1 * Math.sin(ang + B)], e2 = [Sx + L1 * Math.cos(ang - B), Sy + L1 * Math.sin(ang - B)];
    const score = low ? (e => e[1] + 0.3 * side * e[0]) : (e => side * e[0] + 0.35 * e[1]);
    let E = score(e1) > score(e2) ? e1 : e2;
    let Wx = Sx + Math.cos(ang) * dc, Wy = Sy + Math.sin(ang) * dc, usy = 1;
    if (down) { // tucked elbows: forearm hangs below the wrist, upper arm foreshortens toward the viewer
      const Ed = [a.x + side * 10, a.y + L2 * 0.97];
      const du = Math.hypot(Ed[0] - Sx, Ed[1] - Sy);
      if (du < L1) { E = Ed; Wx = a.x; Wy = a.y; usy = Math.max(0.3, du / L1); }
    }
    a.upper.sy = usy;
    a.upper.x = Sx; a.upper.y = Sy; a.upper.rot = Math.atan2(-(E[0] - Sx), E[1] - Sy);
    a.fore.x = E[0]; a.fore.y = E[1]; a.fore.rot = Math.atan2(-(Wx - E[0]), Wy - E[1]);
    a.hand.x = Wx; a.hand.y = Wy;
    const along = Math.atan2(Wx - E[0], -(Wy - E[1]));
    a.hand.rot = (abs ? 0 : along) + a.hr;
  }
}

// ---------------------------------------------------------------- factory
const spriteCache = {};
function loadSprites(kind) {
  if (!spriteCache[kind]) {
    spriteCache[kind] = Promise.all(CFG[kind].parts().map(p => svgSprite(p.svg, p.w, p.h, p.key).then(sp => [p.key.slice(5), { img: sp.img, w: sp.w, h: sp.h, ax: p.ax, ay: p.ay }])))
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
function portraitBg(w, h) {
  const R = rng(321);
  const bunt = [C.hijab, C.star, C.green, C.swirl, C.pink, '#b79be6'];
  let flags = '';
  const N = 11;
  const yAt = x => 42 + Math.sin(Math.PI * x / w) * 34;
  for (let i = 0; i < N; i++) {
    const x0 = w * (i + 0.18) / N, x1 = w * (i + 0.82) / N, xm = (x0 + x1) / 2;
    const d = `M${n1(x0)} ${n1(yAt(x0))} L${n1(x1)} ${n1(yAt(x1))} L${n1(xm)} ${n1(yAt(xm) + 46)} Z`;
    flags += blob(d, bunt[i % bunt.length], { shade: '#000', g: 0.08, light: '#fff', l: 0.3, lw: 2.6 });
  }
  let stars = '';
  const spots = [[0.07, 0.36], [0.16, 0.62], [0.9, 0.34], [0.95, 0.6], [0.38, 0.22], [0.62, 0.2], [0.05, 0.84], [0.94, 0.86], [0.27, 0.26], [0.74, 0.27]];
  for (const [u, v] of spots) {
    const x = u * w, y = v * h, r = 9 + R() * 7;
    let d = '';
    for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? r * 0.48 : r; d += (j ? 'L' : 'M') + n1(x + Math.cos(a) * rr) + ' ' + n1(y + Math.sin(a) * rr); }
    stars += blob(d + 'Z', C.star, { shade: '#d9a520', g: 0.3, line: '#c99a2a', lw: 2.2 });
  }
  const heart = (x, y, s, col) => { const d = `M${x} ${y + 10 * s} C${x - 26 * s} ${y - 8 * s} ${x - 14 * s} ${y - 30 * s} ${x} ${y - 16 * s} C${x + 14 * s} ${y - 30 * s} ${x + 26 * s} ${y - 8 * s} ${x} ${y + 10 * s} Z`; return blob(d, col, { shade: '#d0607a', g: 0.35, light: '#fff', l: 0.3, line: '#c25a72', lw: 2.6 }); };
  const cx = w / 2;
  const hearts = heart(cx, h * 0.3, 1.5, '#f590a8') + heart(cx - 62, h * 0.4, 0.95, '#f9b2c3') + heart(cx + 60, h * 0.38, 1.05, '#f7a0b6');
  const wallD = `M0 0 H${w} V${h} H0 Z`;
  const floorD = `M0 ${h * 0.8} C${w * 0.3} ${h * 0.76} ${w * 0.7} ${h * 0.76} ${w} ${h * 0.8} V${h} H0 Z`;
  const inner = `<defs><radialGradient id="glow" cx="50%" cy="52%" r="55%"><stop offset="0" stop-color="#fff6dc"/><stop offset="0.6" stop-color="#fde3cc"/><stop offset="1" stop-color="#f9cdb8"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>` +
    `<g transform="rotate(-32)"><g filter="url(#grn)" opacity=".22"><path transform="rotate(32)" d="${wallD}" fill="#e8a888"/></g></g>` +
    `<g transform="rotate(-24)"><g filter="url(#hil)" opacity=".35"><path transform="rotate(24)" d="${wallD}" fill="#fff"/></g></g>` +
    blob(floorD, '#f6d38f', { shade: '#d9a85a', g: 0.4, light: '#fff', l: 0.3, line: '#c99b5c', lw: 2.8 }) +
    stars + ln(`M0 ${n1(yAt(0))} Q${w / 2} ${n1(42 + 34 * 2)} ${w} ${n1(yAt(w))}`, 2.4, '#9b7f72') + flags + hearts;
  return part(`portrait-bg-${w}x${h}`, w, h, 0, 0, inner, 61);
}

export async function portraitSprite(w = 900, h = 600) {
  const [mom, dad, baby] = await Promise.all(['mom', 'dad', 'baby'].map(k => createCharacter(k, { frozen: true })));
  const bgP = portraitBg(w, h);
  const bg = await svgSprite(bgP.svg, w, h, bgP.key);
  mom.setMood('adore'); dad.setMood('adore'); baby.setMood('adore');
  mom.gazeOverride = [0.75, 0.75]; dad.gazeOverride = [-0.75, 0.75]; baby.gazeOverride = [0, 0];
  mom._t = dad._t = baby._t = 0.2;
  mom.tiltOverride = 0.1; dad.tiltOverride = -0.1; baby.tiltOverride = 0.04;
  for (let i = 0; i < 90; i++) { mom.update(1 / 30); dad.update(1 / 30); baby.update(1 / 30); }
  const s = h / 600;
  return canvasSprite(w, h, (x) => {
    x.save(); x.beginPath(); x.rect(0, 0, w, h); x.clip();
    x.drawImage(bg.img, 0, 0, w, h);
    const place = (ch, px, py, sc, rot) => { ch.x = px; ch.y = py; ch.sx = ch.sy = sc; ch.rot = rot; ch.render(x); };
    place(mom, w * 0.225, h + 46 * s, 0.86 * s, 0.11);
    place(dad, w * 0.785, h + 46 * s, 0.86 * s, -0.11);
    // soft contact shadow under the baby
    x.save(); x.globalAlpha = 0.16; x.fillStyle = '#8a5a3a'; x.beginPath(); x.ellipse(w * 0.5, h - 28 * s, 120 * s, 14 * s, 0, 0, Math.PI * 2); x.fill(); x.restore();
    place(baby, w * 0.5, h - 26 * s, 1.0 * s, 0);
    x.restore();
    // warm photo frame
    x.save(); x.strokeStyle = '#fffaf0'; x.lineWidth = 18 * s; x.strokeRect(0, 0, w, h);
    x.strokeStyle = 'rgba(120,90,70,.3)'; x.lineWidth = 2 * s; x.strokeRect(10 * s, 10 * s, w - 20 * s, h - 20 * s); x.restore();
  });
}

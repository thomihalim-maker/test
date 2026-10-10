// Level 2 "Warna-warni" art: sunny living-room play corner, woven colour baskets, toys, baby bouncer.
// Everything is authored as SVG strings (pencil outlines + crayon fills from style.js) and rasterized once
// at load via svgSprite with stable cache keys. Owned by the level-2 builder.
//
// Coordinates: the scene uses a "stage" space where the important 1600x900 design area spans x 0..1600,
// y 0..900. Backdrops extend beyond it (x -400..2000, y -200..1100) for wide phones and tall tablets.
import { svgSprite } from '../engine/raster.js';
import { rng } from '../engine/tween.js';
import { PAL, svg, stroke, fill } from './style.js';

// ------------------------------------------------------------------ helpers
const f = n => Math.round(n * 10) / 10;
let UID = 0;
const uid = p => `${p}${++UID}`;
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, t) {
  const pa = hx(a), pb = hx(b);
  return '#' + [0, 1, 2].map(i => Math.round(pa[i] + (pb[i] - pa[i]) * t).toString(16).padStart(2, '0')).join('');
}
const lighten = (c, t) => mix(c, '#ffffff', t);
/** stroke attrs WITHOUT a per-element filter (wrap many in a <g filter="url(#penU)"> group) */
const L = (w = 3.2, c = PAL.line) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** svg() wrapper adding a user-space pencil filter (for line groups) and soft-shadow blurs.
 *  `ox,oy` translate the content so it can be written in stage coordinates. */
function W(w, h, inner, { ox = 0, oy = 0, seed = 3 } = {}) {
  const extra = `<defs>
  <filter id="penU" filterUnits="userSpaceOnUse" x="${-ox}" y="${-oy}" width="${w}" height="${h}">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed + 2}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="${seed + 9}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="ga"/>
    <feComposite in="d" in2="ga" operator="in"/>
  </filter>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="softL" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
</defs>`;
  const body = ox || oy ? `<g transform="translate(${ox} ${oy})">${inner}</g>` : inner;
  return svg(w, h, extra + body, seed);
}

/** Catmull-Rom -> cubic bezier path through points. */
function smooth(pts, closed = true) {
  const n = pts.length, P = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
function blobD(cx, cy, rx, ry, { n = 16, j = 0.03, seed = 1, rot = 0 } = {}) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * j;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts);
}
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)}V${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
}
function starPts(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  const p = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, rr = i % 2 ? r : R; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return p;
}
const starD = (cx, cy, R, r, n, rot) => 'M' + starPts(cx, cy, R, r, n, rot).map(p => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
/** soft, puffy star (rounded through Catmull-Rom) */
const softStarD = (cx, cy, R, r, n, rot) => smooth(starPts(cx, cy, R, r, n, rot));
/** gently bowed line (never perfectly straight so per-element filters keep a non-degenerate bbox) */
const wl = (x1, y1, x2, y2, bow = 1.5) => `M${f(x1)} ${f(y1)}Q${f((x1 + x2) / 2 + bow)} ${f((y1 + y2) / 2 + bow)} ${f(x2)} ${f(y2)}`;

/** base (lighter, solid) + crayon fill + pencil outline */
function shape(d, col, o = {}) {
  const rule = o.rule ? ` fill-rule="${o.rule}"` : '';
  const base = o.base === undefined ? lighten(col, 0.3) : o.base;
  let s = '';
  if (base) s += `<path d="${d}" fill="${base}"${rule}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  s += `<path d="${d}" fill="${col}" filter="url(#crayon)"${rule}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  if (o.line !== false) s += `<path d="${d}" ${stroke(o.lw || 3.2, o.lc || PAL.line)}${rule}/>`;
  return s;
}
/** crayon hatching clipped to a shape */
function hatch(d, [x, y, w, h], col, { ang = -40, gap = 7, lw = 2, op = 0.35, seed = 1 } = {}) {
  const id = uid('h'), cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2 + 4, r = rng(seed);
  let p = '';
  for (let o = -R; o <= R; o += gap) p += `M${f(cx - R)} ${f(cy + o + (r() - 0.5) * 2)}L${f(cx + R)} ${f(cy + o + (r() - 0.5) * 2.5)}`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})" opacity="${op}"><path d="${p}" ${L(lw, col)} transform="rotate(${ang} ${f(cx)} ${f(cy)})" filter="url(#pencil)"/></g>`;
}
const softShadow = (cx, cy, rx, ry, op = 0.22, blur = 'soft') =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#6b4a3a" opacity="${op}" filter="url(#${blur})"/>`;

// ------------------------------------------------------------------ palette
export const COLS = {
  red: { c: '#ec6262', s: '#c84b4d', l: '#f8aaa6', name: 'merah', wick: '#f2a49b', wickS: '#d97c74', wickD: '#a85a56', rim: '#e48d84', cheek: '#ffd2cf' },
  yellow: { c: '#f6c93a', s: '#d9a11e', l: '#fde69a', name: 'kuning', wick: '#f7d684', wickS: '#dcb052', wickD: '#a9823a', rim: '#efc35e', cheek: '#f7a9b8' },
  blue: { c: '#5389e0', s: '#3a68bd', l: '#a9c6f3', name: 'biru', wick: '#a3c1f0', wickS: '#7898d6', wickD: '#526fa6', rim: '#87a8e2', cheek: '#f7a9b8' },
};
const R2 = {
  wall: '#fbe4cf', wallTex: '#f6d6bb', stripe: '#f8dcc4', panel: '#d5eadb', panelTex: '#c7e2d0', panelLine: '#a9cdb6',
  rail: '#fff8ee', trim: '#fffaf3', floor: '#f2d4a8', floorTex: '#e9c48f', plank: '#c4935c',
  wood: '#e8bd88', woodS: '#cf9a5f', woodD: '#a8743f', curtain: '#fbe6a0', curtainS: '#efcf72', tie: '#f3a59b',
  mint: '#bfe2cc', peach: '#f8cdb5', lilac: '#d9d0f2', cream: '#fff4e2', leaf: '#7cc68a', leafS: '#58ad6c', leafL: '#a6dca6',
  sky: '#a9d8f2', skyLow: '#e3f4f6', hill: '#cfe9b0', hill2: '#a9d98e', sun: '#fde27a',
  grey: '#b9b6c4', seat: '#d6cbf4', seatS: '#bba9ea', seat2: '#c8b9f0',
};

// ------------------------------------------------------------------ TOYS (160x160, base contact at y=148)
export const TOY_W = 160, TOY_H = 160, TOY_BASE = 148;
const TOY_ART = {
  ball(C) {
    const id = uid('cb'), d = blobD(80, 93, 54, 54, { n: 18, j: 0.012, seed: 11 });
    return `
    <clipPath id="${id}"><path d="${d}"/></clipPath>
    <path d="${d}" fill="${C.s}"/>
    <g clip-path="url(#${id})">
      <path d="${d}" fill="${C.s}" filter="url(#crayon)"/>
      <circle cx="72" cy="85" r="53" fill="${lighten(C.c, 0.25)}"/>
      <circle cx="72" cy="85" r="53" fill="${C.c}" filter="url(#crayon)"/>
      <path d="M14 76 Q80 116 148 70" fill="none" stroke="#fffaf2" stroke-width="15" filter="url(#crayon)"/>
      <path d="M14 69 Q80 108 148 63 M14 84 Q80 124 148 78" ${L(2.2, mix(C.s, PAL.line, 0.4))} opacity="0.7"/>
      ${hatch(d, [26, 39, 108, 108], C.s, { ang: -35, gap: 8, op: 0.3, seed: 4 })}
    </g>
    <ellipse cx="58" cy="66" rx="13" ry="8" fill="#fff" opacity="0.85" transform="rotate(-30 58 66)"/>
    <circle cx="76" cy="58" r="3.5" fill="#fff" opacity="0.8"/>
    <path d="${d}" ${stroke(3.4)}/>`;
  },
  block(C) {
    const front = 'M32 70H116V148H32Z', top = 'M32 70L54 48H138L116 70Z', side = 'M116 70L138 48V126L116 148Z';
    return `
    ${shape(top, C.l, { base: lighten(C.l, 0.3) })}
    ${shape(side, C.s, { base: C.s })}
    ${shape(front, C.c)}
    ${hatch(front, [32, 70, 84, 78], C.s, { ang: -50, gap: 9, op: 0.22, seed: 6 })}
    ${shape(softStarD(74, 110, 27, 12, 5), '#fffaf0', { base: '#fffaf0', lw: 2.6, lc: mix(C.s, PAL.line, 0.5) })}
    <path d="M40 78 L40 96" ${L(4, '#fff')} opacity="0.6"/>`;
  },
  car(C) {
    const body = 'M14 122C12 106 20 97 34 95L52 93C58 74 68 60 86 59L108 59C121 59 129 73 135 91L142 93C152 95 154 108 152 122C140 128 26 128 14 122Z';
    const w1 = 'M90 67L107 67C115 67 120 77 124 90L90 90Z', w2 = 'M58 90C62 78 70 67 80 67L83 67L83 90Z';
    const wheel = (x) => `${shape(`M${x - 20} 126a20 20 0 1 0 40 0a20 20 0 1 0 -40 0Z`, '#605b6c', { base: '#7a7586' })}
      <circle cx="${x}" cy="126" r="8.5" fill="#e4dfe9"/><circle cx="${x}" cy="126" r="8.5" ${stroke(2.4)}/>`;
    return `
    ${shape(body, C.c)}
    ${hatch(body, [12, 59, 142, 69], C.s, { ang: -30, gap: 8, op: 0.25, seed: 9 })}
    ${shape(w1, '#eef6ff', { base: '#f7fbff', lw: 2.8 })}${shape(w2, '#eef6ff', { base: '#f7fbff', lw: 2.8 })}
    <path d="M96 72 L104 72" ${L(3, '#fff')}/>
    <path d="M86 94 Q87 106 86 118" ${stroke(2.6)}/>
    <path d="M94 100 L102 100" ${stroke(3)}/>
    <path d="M30 103 Q60 99 80 101" ${L(4, '#fff')} opacity="0.55"/>
    <circle cx="145" cy="104" r="6" fill="#fffbe8"/><circle cx="145" cy="104" r="6" ${stroke(2.2)}/>
    <path d="M10 114 Q14 118 22 118" ${L(5, '#d7d2dc')}/>
    ${wheel(46)}${wheel(118)}`;
  },
  duck(C) {
    const body = 'M18 84C30 92 40 96 54 96C72 90 112 88 132 102C142 124 124 147 80 147C40 147 20 124 18 84Z';
    const head = blobD(100, 64, 30, 29, { n: 14, j: 0.02, seed: 21 });
    const beak = 'M124 62C138 56 152 62 150 70C146 77 134 79 123 75Z';
    const wing = 'M56 112C66 98 96 100 106 114C96 128 70 130 56 112Z';
    return `
    ${shape(body, C.c)}
    ${hatch(body, [18, 84, 124, 63], C.s, { ang: -30, gap: 8, op: 0.25, seed: 13 })}
    ${shape(head, C.c)}
    ${shape(beak, '#f59a46', { base: '#f9b56c', lw: 2.8 })}
    <path d="M126 70 Q138 72 148 69" ${stroke(2.2)}/>
    ${shape(wing, C.s, { base: mix(C.c, C.s, 0.5), lw: 2.8 })}
    <path d="M70 112 Q80 106 92 112" ${stroke(2)} opacity="0.7"/>
    <circle cx="107" cy="57" r="4.6" fill="${PAL.lineDark}"/><circle cx="108.5" cy="55.5" r="1.4" fill="#fff"/>
    <ellipse cx="98" cy="75" rx="7" ry="4.5" fill="${C.cheek}" filter="url(#blush)"/>
    <ellipse cx="88" cy="47" rx="8" ry="4.5" fill="#fff" opacity="0.75" transform="rotate(-25 88 47)"/>
    <path d="M36 104 Q46 120 66 128" ${L(4, '#fff')} opacity="0.45"/>`;
  },
  rings(C) {
    const wood = R2.wood;
    const base = rrect(30, 132, 100, 16, 7), pole = rrect(74, 40, 12, 96, 5);
    const rings = [[28, 112, 104, 23], [37, 92, 86, 21], [46, 74, 68, 19], [54, 58, 52, 17]];
    const cols = [C.c, mix(C.c, C.l, 0.45), C.c, mix(C.c, C.l, 0.45)];
    return `
    ${shape(base, wood, { lw: 2.8 })}
    ${shape(pole, wood, { lw: 2.6 })}
    ${rings.map(([x, y, w, h], i) => {
      const d = rrect(x, y, w, h, h / 2);
      return shape(d, cols[i], { lw: 2.8 }) + hatch(d, [x, y, w, h], C.s, { ang: -60, gap: 7, op: 0.22, seed: 30 + i }) +
        `<path d="M${x + 10} ${y + 6} Q${x + w / 2} ${y + 3} ${x + w - 14} ${y + 6}" ${L(3, '#fff')} opacity="0.6"/>`;
    }).join('')}
    ${shape(blobD(80, 44, 13, 13, { seed: 40 }), wood, { lw: 2.6 })}
    <circle cx="76" cy="40" r="3" fill="#fff" opacity="0.8"/>`;
  },
};
export const TOY_TYPES = Object.keys(TOY_ART);
const toySVG = (type, col) => W(TOY_W, TOY_H, TOY_ART[type](COLS[col]), { seed: 5 + type.length });

// ------------------------------------------------------------------ BASKETS (320x250, bottom centre at y=235)
export const BASKET_W = 320, BASKET_H = 250, BASKET_BASE = 235, BASKET_RIM = 78;
const BK = { cx: 160, rx: 140, ry: 32, ty: BASKET_RIM, by: BASKET_BASE };
const rimCurve = (x, off) => { // y on a weave row following the front rim arc, flattening towards the bottom
  const u = (x - BK.cx) / BK.rx, cur = BK.ry * Math.max(0.25, 1 - off / 260);
  return BK.ty + off + cur * Math.sqrt(Math.max(0, 1 - u * u));
};
function basketBackSVG(k) {
  const C = COLS[k], { cx, rx, ry, ty } = BK, gid = uid('g');
  const backRim = `M${cx - rx - 12} ${ty}A${rx + 12} ${ry + 10} 0 0 1 ${cx + rx + 12} ${ty}L${cx + rx - 8} ${ty}A${rx - 8} ${ry - 7} 0 0 0 ${cx - rx + 8} ${ty}Z`;
  let ticks = '';
  for (let i = 1; i < 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI, x = cx + Math.cos(a) * (rx + 2), y = ty + Math.sin(a) * (ry + 1.5);
    ticks += `M${f(x - 5)} ${f(y - 6)}L${f(x + 5)} ${f(y + 6)}`;
  }
  return W(BASKET_W, BASKET_H, `
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.wickS}"/><stop offset="1" stop-color="${C.wickD}"/></linearGradient>
    ${softShadow(cx, BK.by + 2, rx + 8, 15, 0.3)}
    <ellipse cx="${cx}" cy="${ty}" rx="${rx - 8}" ry="${ry - 7}" fill="url(#${gid})"/>
    <ellipse cx="${cx}" cy="${ty}" rx="${rx - 8}" ry="${ry - 7}" fill="${C.wickD}" opacity="0.4" filter="url(#crayon)"/>
    ${shape(backRim, C.rim, { lw: 3 })}
    <path d="${ticks}" ${L(2.2, C.wickD)} opacity="0.55" filter="url(#pencil)"/>`, { seed: 7 });
}
function basketFrontSVG(k) {
  const C = COLS[k], { cx, rx, ry, ty, by } = BK, cid = uid('c');
  const body = `M${cx - rx} ${ty}C${cx - rx + 6} ${ty + 60} ${cx - rx + 22} ${by - 30} ${cx - rx + 34} ${by - 10}Q${cx - rx + 40} ${by} ${cx - rx + 60} ${by}L${cx + rx - 60} ${by}Q${cx + rx - 40} ${by} ${cx + rx - 34} ${by - 10}C${cx + rx - 22} ${by - 30} ${cx + rx - 6} ${ty + 60} ${cx + rx} ${ty}A${rx} ${ry} 0 0 1 ${cx - rx} ${ty}Z`;
  // weave: rows following the rim curve, stakes converging down, alternating over/under bumps
  const rows = [], stakes = [];
  for (let off = 18; off < by - ty; off += 24) rows.push(off);
  const NS = 14;
  for (let i = 0; i <= NS; i++) stakes.push(i / NS);
  const stakeX = (t, y) => { const k2 = (y - ty) / (by - ty); const half = rx * (1 - 0.2 * k2); return cx - half + t * 2 * half; };
  let rowPath = '', stakePath = '', bumps = '', shades = '';
  for (const off of rows) {
    let p = '';
    for (let x = cx - rx - 6; x <= cx + rx + 6; x += 10) p += (p ? 'L' : 'M') + `${f(x)} ${f(rimCurve(x, off))}`;
    rowPath += p;
  }
  for (const t of stakes) {
    const y1 = ty + 10, y2 = by + 4;
    stakePath += `M${f(stakeX(t, y1))} ${f(y1)}Q${f(stakeX(t, (y1 + y2) / 2) + 1)} ${f((y1 + y2) / 2)} ${f(stakeX(t, y2))} ${f(y2)}`;
  }
  rows.forEach((off, j) => {
    for (let i = 0; i < NS; i++) {
      const t = (i + 0.5) / NS, ym = rimCurve(cx, off + 12), x = stakeX(t, ym), y = rimCurve(x, off + 12);
      const w = (2 * rx / NS) * 0.9;
      if ((i + j) % 2) bumps += `<path d="${rrect(x - w / 2, y - 9, w, 18, 8)}" fill="${C.wickS}"/>`;
      else shades += `M${f(x - w * 0.32)} ${f(y - 3)}Q${f(x)} ${f(y - 7)} ${f(x + w * 0.32)} ${f(y - 3)}`;
    }
  });
  const frontRim = `M${cx - rx - 12} ${ty}A${rx + 12} ${ry + 10} 0 0 0 ${cx + rx + 12} ${ty}L${cx + rx - 8} ${ty}A${rx - 8} ${ry - 7} 0 0 1 ${cx - rx + 8} ${ty}Z`;
  let ticks = '';
  for (let i = 1; i < 18; i++) {
    const a = Math.PI - (i / 18) * Math.PI, x = cx + Math.cos(a) * (rx + 2), y = ty + Math.sin(a) * (ry + 1.5);
    ticks += `M${f(x - 5)} ${f(y - 7)}L${f(x + 5)} ${f(y + 7)}`;
  }
  // fabric tag with a big colour blob that has a little face
  const tag = rrect(108, 118, 104, 94, 18);
  const blob = blobD(160, 163, 39, 36, { n: 9, j: 0.1, seed: k.length * 7 + 3 });
  const bow = `M64 104C42 84 26 96 34 112C40 124 56 116 64 104Z M64 104C86 84 102 96 94 112C88 124 72 116 64 104Z`;
  const tails = `M60 108L46 140L57 134L61 145Z M68 108L82 138L71 134L67 145Z`;
  return W(BASKET_W, BASKET_H, `
    <clipPath id="${cid}"><path d="${body}"/></clipPath>
    <path d="${body}" fill="${lighten(C.wick, 0.25)}"/>
    <path d="${body}" fill="${C.wick}" filter="url(#crayon)"/>
    <g clip-path="url(#${cid})">
      <g filter="url(#crayon)" opacity="0.9">${bumps}</g>
      <path d="${shades}" ${L(3, lighten(C.wick, 0.5))} opacity="0.8"/>
      <g filter="url(#penU)" opacity="0.55"><path d="${rowPath}" ${L(2.2, C.wickD)}/><path d="${stakePath}" ${L(2, C.wickD)}/></g>
      <path d="M${cx - rx} ${ty}C${cx - rx + 6} ${ty + 60} ${cx - rx + 22} ${by - 30} ${cx - rx + 34} ${by - 10}L${cx - rx + 70} ${by}L${cx - rx + 40} ${ty}Z" fill="${C.wickD}" opacity="0.2"/>
      <path d="M${cx + rx} ${ty}C${cx + rx - 6} ${ty + 60} ${cx + rx - 22} ${by - 30} ${cx + rx - 34} ${by - 10}L${cx + rx - 90} ${by}L${cx + rx - 60} ${ty}Z" fill="${C.wickD}" opacity="0.28"/>
      <ellipse cx="${cx}" cy="${by + 6}" rx="${rx}" ry="26" fill="${C.wickD}" opacity="0.25" filter="url(#soft)"/>
    </g>
    <path d="${body}" ${stroke(3.4)}/>
    ${shape(frontRim, C.rim, { lw: 3 })}
    <path d="${ticks}" ${L(2.4, C.wickD)} opacity="0.6" filter="url(#pencil)"/>
    <path d="M${cx - rx + 10} ${ty + 12}Q${cx - 60} ${ty + 34} ${cx - 20} ${ty + 37}" ${L(3.5, '#fff')} opacity="0.55"/>
    <g transform="rotate(-3 160 165)">
      <path d="${tag}" fill="#000" opacity="0.12" transform="translate(3 5)" filter="url(#soft)"/>
      ${shape(tag, '#fff6e8', { base: '#fffaf2', lw: 3 })}
      <path d="${rrect(116, 126, 88, 78, 13)}" fill="none" stroke="${mix(C.c, PAL.line, 0.2)}" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round" opacity="0.7" filter="url(#pencil)"/>
      ${shape(blob, C.c, { base: lighten(C.c, 0.15), lw: 3.2 })}
      ${hatch(blob, [121, 127, 78, 72], C.s, { ang: -35, gap: 7, op: 0.3, seed: 3 })}
      <ellipse cx="146" cy="145" rx="9" ry="6" fill="#fff" opacity="0.8" transform="rotate(-30 146 145)"/>
      <circle cx="150" cy="161" r="3.8" fill="${PAL.lineDark}"/><circle cx="170" cy="161" r="3.8" fill="${PAL.lineDark}"/>
      <path d="M153 172 Q160 179 167 172" ${L(2.8, PAL.lineDark)}/>
      <ellipse cx="141" cy="171" rx="6" ry="4" fill="${C.cheek}" filter="url(#blush)"/>
      <ellipse cx="179" cy="171" rx="6" ry="4" fill="${C.cheek}" filter="url(#blush)"/>
    </g>
    ${shape(bow, C.c, { lw: 2.8 })}${shape(tails, C.c, { lw: 2.6 })}
    <circle cx="64" cy="106" r="8" fill="${C.s}"/><circle cx="64" cy="106" r="8" ${stroke(2.6)}/>
    <path d="M44 98 Q48 94 54 96" ${L(2.6, '#fff')} opacity="0.7"/>`, { seed: 9 });
}

// ------------------------------------------------------------------ BOUNCER (320x300, base centre at y=288)
export const BOUNCER_W = 320, BOUNCER_H = 300, BOUNCER_BASE = 288;
function bouncerBackSVG() {
  const back = 'M74 236C60 150 92 56 160 52C228 56 260 150 246 236Z', cid = uid('c');
  let stars = '';
  const r = rng(77);
  for (let i = 0; i < 16; i++) {
    const x = 80 + r() * 160, y = 70 + r() * 160;
    stars += i % 3 ? `<path d="${softStarD(x, y, 9, 4.2, 5, -Math.PI / 2 + r())}" fill="#fff3b8"/>` : `<circle cx="${f(x)}" cy="${f(y)}" r="3.5" fill="#fff"/>`;
  }
  return W(BOUNCER_W, BOUNCER_H, `
    ${softShadow(160, 284, 146, 14, 0.3)}
    <path d="M32 278A128 16 0 0 1 288 278" ${L(8, R2.grey)}/>
    <path d="M32 278A128 16 0 0 1 288 278" ${stroke(2.4)}/>
    <path d="M36 278C38 250 44 220 58 196 M284 278C282 250 276 220 262 196" ${L(8, R2.grey)}/>
    <path d="M36 278C38 250 44 220 58 196 M284 278C282 250 276 220 262 196" ${stroke(2.4)}/>
    <clipPath id="${cid}"><path d="${back}"/></clipPath>
    ${shape(back, R2.seat, { line: false })}
    <g clip-path="url(#${cid})">${stars}
      <path d="M90 90 Q160 70 230 90" ${L(4, '#fff')} opacity="0.5"/>
      ${hatch(back, [60, 52, 200, 184], R2.seatS, { ang: -40, gap: 9, op: 0.3, seed: 5 })}
    </g>
    <path d="${back}" fill="none" stroke="${R2.seatS}" stroke-width="9" filter="url(#crayon)"/>
    <path d="${back}" ${stroke(3.2)}/>
    <path d="M86 214C80 160 104 82 160 76C216 82 240 160 234 214" fill="none" stroke="${R2.seatS}" stroke-width="2.4" stroke-dasharray="6 7" stroke-linecap="round" opacity="0.8"/>`, { seed: 13 });
}
function bouncerFrontSVG() {
  const bowl = 'M40 170C40 240 96 282 160 282C224 282 280 240 280 170C240 194 80 194 40 170Z', cid = uid('c');
  return W(BOUNCER_W, BOUNCER_H, `
    <clipPath id="${cid}"><path d="${bowl}"/></clipPath>
    ${shape(bowl, R2.seat2, { line: false })}
    <g clip-path="url(#${cid})">
      ${hatch(bowl, [40, 170, 240, 112], R2.seatS, { ang: -35, gap: 9, op: 0.35, seed: 8 })}
      <path d="M70 196 Q90 250 140 270 M250 196 Q230 250 180 270" ${L(2.4, R2.seatS)} opacity="0.9" stroke-dasharray="6 6"/>
      <ellipse cx="160" cy="282" rx="130" ry="30" fill="#7d6aa8" opacity="0.18" filter="url(#soft)"/>
    </g>
    <path d="M40 170C80 194 240 194 280 170" fill="none" stroke="${lighten(R2.seat2, 0.5)}" stroke-width="10" stroke-linecap="round" filter="url(#crayon)"/>
    <path d="${bowl}" ${stroke(3.2)}/>
    <path d="M44 178C84 200 236 200 276 178" ${stroke(2)} opacity="0.6"/>
    ${shape(rrect(144, 214, 32, 26, 8), '#fff6e6', { lw: 2.4 })}
    <path d="M152 227 L168 227" ${stroke(2)} opacity="0.7"/>
    <path d="M30 278A130 16 0 0 0 290 278" ${L(8, R2.grey)}/>
    <path d="M30 278A130 16 0 0 0 290 278" ${stroke(2.4)}/>
    <path d="M60 286A100 6 0 0 0 260 286" ${L(3, '#fff')} opacity="0.5"/>`, { seed: 15 });
}

// ------------------------------------------------------------------ ROOM: wall (stage x -400..2000, y -200..540)
const WIN = { x: 410, y: 80, w: 600, h: 320 }; // window opening (stage coords)
export const WINDOW = WIN;
function bunting(x1, y1, x2, y2, sag, n, seed) {
  const r = rng(seed), cols = ['#f7b9c4', R2.mint, '#fde69a', R2.lilac, R2.peach, '#bfe0f5'];
  const qx = (x1 + x2) / 2, qy = Math.max(y1, y2) + sag;
  const P = t => [(1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * qx + t * t * x2, (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * qy + t * t * y2];
  let flags = '';
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.15) / n, t1 = (i + 0.85) / n, a = P(t0), b = P(t1), m = P((t0 + t1) / 2);
    const tip = [m[0] + (r() - 0.5) * 6, m[1] + 52];
    flags += shape(`M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(tip[0])} ${f(tip[1])}Z`, cols[(i + seed) % cols.length], { lw: 2.6 });
  }
  return `<path d="M${x1} ${y1}Q${f(qx)} ${f(qy)} ${x2} ${y2}" ${stroke(2.6)}/>${flags}`;
}
function wallSVG() {
  const ox = 400, oy = 200, w = 2400, h = 740;
  const hole = `M-400 -200H2000V540H-400Z M${WIN.x} ${WIN.y}V${WIN.y + WIN.h}H${WIN.x + WIN.w}V${WIN.y}Z`;
  const cid = uid('c');
  let stripes = '';
  for (let x = -400; x < 2000; x += 72) stripes += `<rect x="${x}" y="-200" width="28" height="640" fill="${R2.stripe}"/>`;
  let dots = '';
  const r = rng(5);
  for (let x = -380; x < 2000; x += 72) for (let y = -170; y < 420; y += 64) dots += `<circle cx="${f(x + 50 + (Math.round(y / 64) % 2) * 36)}" cy="${f(y)}" r="${f(2.2 + r())}" fill="#fff"/>`;
  // wainscot panels
  let panels = '';
  for (let x = -390; x < 2000; x += 180) panels += `<path d="${rrect(x + 14, 452, 152, 54, 6)}"/>`;
  // window frame ring + mullions
  const fr = 22, frame = `M${WIN.x - fr} ${WIN.y - fr}H${WIN.x + WIN.w + fr}V${WIN.y + WIN.h + fr}H${WIN.x - fr}Z M${WIN.x} ${WIN.y}V${WIN.y + WIN.h}H${WIN.x + WIN.w}V${WIN.y}Z`;
  const mx = WIN.x + WIN.w / 2, my = WIN.y + WIN.h * 0.46;
  const mullV = rrect(mx - 8, WIN.y - 2, 16, WIN.h + 4, 3), mullH = rrect(WIN.x - 2, my - 7, WIN.w + 4, 14, 3);
  let sheen = '';
  for (const [px, py] of [[WIN.x, WIN.y], [mx, WIN.y], [WIN.x, my], [mx, my]]) {
    sheen += `<path d="M${px + 40} ${py + 10}L${px + 90} ${py + 10}L${px + 20} ${py + 130}L${px + 6} ${py + 130}Z M${px + 110} ${py + 10}L${px + 128} ${py + 10}L${px + 60} ${py + 130}L${px + 44} ${py + 130}Z" fill="#fff" opacity="0.22"/>`;
  }
  // kid's crayon drawing in a frame (sun, house, the family)
  const pic = { x: 1215, y: 40, w: 170, h: 140 };
  const picture = `
    ${softShadow(pic.x + pic.w / 2 + 6, pic.y + pic.h / 2 + 10, pic.w / 2, pic.h / 2, 0.18)}
    ${shape(rrect(pic.x, pic.y, pic.w, pic.h, 6), R2.wood, { lw: 3 })}
    ${shape(rrect(pic.x + 14, pic.y + 14, pic.w - 28, pic.h - 28, 3), '#fffdf7', { base: '#fffdf7', lw: 2.2 })}
    <circle cx="${pic.x + 128}" cy="${pic.y + 40}" r="13" fill="${PAL.yellow}" filter="url(#crayon)"/>
    <path d="M${pic.x + 128} ${pic.y + 20}V${pic.y + 15} M${pic.x + 147} ${pic.y + 40}H${pic.x + 152} M${pic.x + 142} ${pic.y + 26}L${pic.x + 146} ${pic.y + 22}" ${L(2.4, '#e9b52c')}/>
    <path d="M${pic.x + 30} ${pic.y + 104}V${pic.y + 72}L${pic.x + 52} ${pic.y + 52}L${pic.x + 74} ${pic.y + 72}V${pic.y + 104}Z" fill="#f7a9b8" filter="url(#crayon)"/>
    <path d="M${pic.x + 30} ${pic.y + 104}V${pic.y + 72}L${pic.x + 52} ${pic.y + 52}L${pic.x + 74} ${pic.y + 72}V${pic.y + 104}" ${L(2, '#c2667a')}/>
    <path d="M${pic.x + 90} ${pic.y + 108}l0 -16 M${pic.x + 104} ${pic.y + 108}l0 -20 M${pic.x + 117} ${pic.y + 108}l0 -10" ${L(3, '#7a8fd6')}/>
    <circle cx="${pic.x + 90}" cy="${pic.y + 86}" r="6" fill="none" stroke="#e8846a" stroke-width="2.4"/>
    <circle cx="${pic.x + 104}" cy="${pic.y + 82}" r="6" fill="none" stroke="#8d8d8d" stroke-width="2.4"/>
    <circle cx="${pic.x + 117}" cy="${pic.y + 93}" r="4.5" fill="none" stroke="#2f57b8" stroke-width="2.4"/>
    <path d="M${pic.x + 20} ${pic.y + 110}Q${pic.x + 85} ${pic.y + 104} ${pic.x + 150} ${pic.y + 111}" ${L(3, '#59c48c')}/>`;
  // round wall clock (wide screens)
  const clock = `${softShadow(1606, 160, 58, 58, 0.18)}
    ${shape(blobD(1600, 150, 58, 58, { seed: 3, j: 0.01 }), R2.mint, { lw: 3 })}
    ${shape(blobD(1600, 150, 44, 44, { seed: 4, j: 0.01 }), '#fffdf5', { base: '#fffdf5', lw: 2.4 })}
    <path d="M1600 150L1600 120 M1600 150L1620 160" ${L(4, PAL.lineDark)}/>
    <circle cx="1600" cy="150" r="4" fill="${PAL.lineDark}"/>
    <path d="M1600 112v6 M1638 150h-6 M1600 188v-6 M1562 150h6" ${L(3, PAL.line)}/>`;
  return W(w, h, `
    <clipPath id="${cid}"><path d="${hole}" clip-rule="evenodd"/></clipPath>
    <path d="${hole}" fill="${R2.wall}" fill-rule="evenodd"/>
    <g clip-path="url(#${cid})">
      <g opacity="0.75">${stripes}</g>
      <path d="${hole}" fill="${R2.wallTex}" fill-rule="evenodd" filter="url(#crayon)" opacity="0.55"/>
      <g opacity="0.6">${dots}</g>
      <rect x="-400" y="300" width="2400" height="140" fill="#e9b892" opacity="0.12" filter="url(#softL)"/>
    </g>
    <rect x="-400" y="436" width="2400" height="104" fill="${R2.panel}"/>
    <rect x="-400" y="436" width="2400" height="104" fill="${R2.panelTex}" filter="url(#crayon)" opacity="0.7"/>
    <g filter="url(#penU)" ${L(2.4, R2.panelLine)}>${panels}</g>
    ${shape(rrect(-410, 426, 2420, 16, 4), R2.rail, { lw: 2.6 })}
    <rect x="-400" y="442" width="2400" height="10" fill="#7a9a85" opacity="0.15" filter="url(#soft)"/>
    <!-- window -->
    <rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="16" fill="#5a7f9a" opacity="0.15" filter="url(#soft)"/>
    ${sheen}
    ${softShadow(WIN.x + WIN.w / 2 + 8, WIN.y + WIN.h / 2 + 10, WIN.w / 2 + 20, WIN.h / 2 + 20, 0.12, 'softL')}
    ${shape(frame, R2.trim, { rule: 'evenodd', base: '#ffffff', lw: 3.2 })}
    ${shape(mullV, R2.trim, { base: '#ffffff', lw: 2.6 })}
    ${shape(mullH, R2.trim, { base: '#ffffff', lw: 2.6 })}
    <path d="M${WIN.x - fr + 6} ${WIN.y + WIN.h + fr - 4}L${WIN.x + WIN.w + fr - 6} ${WIN.y + WIN.h + fr - 4}" ${L(4, '#e8dccb')} opacity="0.7"/>
    ${softShadow(WIN.x + WIN.w / 2, WIN.y + WIN.h + 40, WIN.w / 2 + 40, 10, 0.2)}
    ${shape(rrect(WIN.x - 42, WIN.y + WIN.h + 16, WIN.w + 84, 22, 6), R2.trim, { base: '#ffffff', lw: 3 })}
    <!-- curtain rod -->
    ${shape(rrect(282, 46, 856, 12, 6), R2.woodS, { lw: 2.6 })}
    ${shape(blobD(280, 52, 15, 15, { seed: 8 }), R2.wood, { lw: 2.6 })}${shape(blobD(1140, 52, 15, 15, { seed: 9 }), R2.wood, { lw: 2.6 })}
    ${bunting(-390, 6, -50, 12, 70, 7, 1)}${bunting(-50, 12, 268, 20, 60, 6, 3)}
    ${picture}${clock}
    <!-- skirting -->
    ${shape(rrect(-410, 516, 2420, 30, 3), R2.trim, { base: '#fffdf8', lw: 2.6 })}
  `, { ox, oy, seed: 4 });
}

// ------------------------------------------------------------------ ROOM: floor (stage x -400..2000, y 520..1100)
function floorSVG() {
  const ox = 400, oy = -520, w = 2400, h = 580;
  const r = rng(12);
  const rowsY = [];
  for (let k = 0, y = 548; y < 1110; k++) { rowsY.push(y); y += 16 + k * 6.5; }
  let rows = '', seams = '', grain = '';
  for (let i = 0; i < rowsY.length - 1; i++) {
    const y = rowsY[i], y2 = rowsY[i + 1];
    rows += `M-400 ${f(y + r() * 2)}L2000 ${f(y + r() * 2)}`;
    const step = 240 + i * 30;
    for (let x = -400 + r() * step; x < 2000; x += step * (0.7 + r() * 0.6)) {
      seams += `M${f(x)} ${f(y + 1)}L${f(x + (x - 800) * 0.04)} ${f(y2 - 1)}`;
      if (r() < 0.6) {
        const gx = x + 40 + r() * 80, gy = y + (y2 - y) * (0.3 + r() * 0.4);
        grain += `M${f(gx)} ${f(gy)}q${f(30 + r() * 30)} ${f(-3 - r() * 3)} ${f(70 + r() * 40)} 0`;
      }
    }
  }
  const gid = uid('g');
  return W(w, h, `
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34" stop-opacity="0.24"/><stop offset="0.3" stop-color="#8a5a34" stop-opacity="0.06"/><stop offset="1" stop-color="#8a5a34" stop-opacity="0"/></linearGradient>
    <rect x="-400" y="520" width="2400" height="580" fill="${R2.floor}"/>
    <rect x="-400" y="520" width="2400" height="580" fill="${R2.floorTex}" filter="url(#crayon)" opacity="0.65"/>
    <g filter="url(#penU)">
      <path d="${rows}" ${L(2.4, R2.plank)} opacity="0.55"/>
      <path d="${seams}" ${L(2.2, R2.plank)} opacity="0.5"/>
      <path d="${grain}" ${L(1.8, R2.plank)} opacity="0.35"/>
    </g>
    <rect x="-400" y="540" width="2400" height="560" fill="url(#${gid})"/>
    <!-- grounding shadows for furniture -->
    ${softShadow(1310, 566, 170, 16, 0.28)}
    ${softShadow(1600, 598, 90, 14, 0.26)}
    ${softShadow(-250, 612, 80, 12, 0.24)}
    ${softShadow(1850, 698, 170, 20, 0.26)}
    <rect x="-400" y="546" width="2400" height="14" fill="#8a5a34" opacity="0.14" filter="url(#soft)"/>
  `, { ox, oy, seed: 6 });
}

// ------------------------------------------------------------------ RUG (1640x330; centre (820,165) -> stage (800,790))
export const RUG_W = 1640, RUG_H = 330;
function rugSVG() {
  const cx = 820, cy = 160, bands = [[800, 150, R2.mint], [742, 130, R2.peach], [676, 112, R2.cream], [590, 92, R2.lilac], [470, 70, R2.cream], [330, 46, R2.peach]];
  const r = rng(31);
  let s = softShadow(cx, cy + 10, 806, 152, 0.25);
  let ticks = '';
  bands.forEach(([rx, ry, col], i) => {
    const d = i === 0 ? blobD(cx, cy, rx, ry, { n: 40, j: 0.008, seed: 3 }) : blobD(cx, cy, rx, ry, { n: 32, j: 0.006, seed: 10 + i });
    s += shape(d, col, { lw: i === 0 ? 3.4 : 2.6, lc: i === 0 ? PAL.line : mix(col, PAL.line, 0.45) });
    const N = Math.round(rx / 9);
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2, x = cx + Math.cos(a) * (rx - 10), y = cy + Math.sin(a) * (ry - 6);
      ticks += `M${f(x - 4)} ${f(y - 3)}L${f(x + 4)} ${f(y + 3)}`;
    }
  });
  // little stars in the centre field
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r(), rr = 0.35 + r() * 0.5;
    s += `<path d="${softStarD(cx + Math.cos(a) * 240 * rr, cy + Math.sin(a) * 30 * rr, 9, 4, 5, 0)}" fill="#fff8de" opacity="0.9"/>`;
  }
  s += `<path d="${ticks}" ${L(2, '#8c7a70')} opacity="0.3" filter="url(#pencil)"/>`;
  return W(RUG_W, RUG_H, s, { seed: 8 });
}

// ------------------------------------------------------------------ GARDEN (behind the window; stage 390..1030 x 60..420)
export const GARDEN = { x: 390, y: 60, w: 640, h: 360 };
function gardenSVG() {
  const { x, y, w, h } = GARDEN, gid = uid('g');
  let fence = '';
  for (let px = x + 4; px < x + w; px += 34) fence += `<path d="M${px} 382V${334}L${px + 11} 322L${px + 22} 334V382Z"/>`;
  const r = rng(51);
  let flowers = '';
  for (let i = 0; i < 26; i++) {
    const fx = x + r() * w, fy = 384 + r() * 30, c = ['#f7a9b8', '#fff', '#fde27a', '#d9c6f5'][i % 4];
    flowers += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(4 + r() * 3)}" fill="${c}"/>`;
  }
  return W(w, h, `
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R2.sky}"/><stop offset="1" stop-color="${R2.skyLow}"/></linearGradient>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${gid})"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfe1f4" filter="url(#crayon)" opacity="0.35"/>
    <circle cx="930" cy="128" r="70" fill="#fff6c8" opacity="0.7" filter="url(#softL)"/>
    ${shape(blobD(930, 128, 36, 36, { seed: 2 }), R2.sun, { lw: 2.6, lc: '#e3b54a' })}
    <path d="M${f(930)} 76v-12 M${f(982)} 128h12 M968 92l8 -8 M968 164l8 8 M878 128h-12 M892 92l-8 -8" ${L(3.2, '#f0c24d')} filter="url(#pencil)"/>
    ${shape(`M${x - 10} 300C500 250 600 268 700 290C800 252 900 240 ${x + w + 10} 282V${y + h + 10}H${x - 10}Z`, R2.hill, { lw: 2.4 })}
    ${shape(blobD(880, 262, 40, 34, { seed: 6 }), '#9ccf8a', { lw: 2.4 })}
    <path d="M880 296V280" ${stroke(4, '#a37650')}/>
    ${shape(`M${x - 10} 340C520 300 640 330 760 342C860 322 960 332 ${x + w + 10} 350V${y + h + 10}H${x - 10}Z`, R2.hill2, { lw: 2.4 })}
    ${shape('M488 372C494 330 496 290 492 236L512 236C508 290 510 330 520 372Z', '#c99a6a', { lw: 2.6 })}
    <g filter="url(#penU)"><g fill="#fffdf6" stroke="${PAL.line}" stroke-width="2.2" stroke-linejoin="round">${fence}
      <path d="${rrect(x - 4, 344, w + 8, 9, 3)}"/><path d="${rrect(x - 4, 366, w + 8, 9, 3)}"/></g></g>
    ${shape(`M${x - 10} 420V392C430 372 470 380 500 388C540 372 580 380 610 390C660 374 700 382 740 392C780 378 820 380 860 390C900 376 950 380 ${x + w + 10} 388V420Z`, '#8fcf7e', { lw: 2.4 })}
    ${flowers}`, { ox: -x, oy: -y, seed: 10 });
}
function treeCrownSVG() { // 280x240, trunk-top at (140,226)
  const r = rng(61);
  let blobs = '', fruit = '';
  const P = [[140, 120, 110, 95, R2.leaf], [80, 150, 66, 56, R2.leafS], [200, 150, 66, 56, R2.leafS], [140, 80, 80, 66, R2.leafL], [100, 110, 50, 44, R2.leaf], [184, 104, 54, 46, R2.leaf]];
  P.forEach(([x, y, rx, ry, c], i) => { blobs += shape(blobD(x, y, rx, ry, { n: 12, j: 0.08, seed: 70 + i }), c, { lw: 2.6 }); });
  for (let i = 0; i < 12; i++) fruit += `<circle cx="${f(70 + r() * 140)}" cy="${f(60 + r() * 120)}" r="${f(5 + r() * 2)}" fill="#f7a9b8"/><circle cx="${f(70 + r() * 140)}" cy="${f(60 + r() * 120)}" r="2.5" fill="#fff"/>`;
  return W(280, 240, blobs + fruit, { seed: 14 });
}
function cloudSVG(seed) { // 220x100
  const d = smooth([[20, 78], [30, 54], [62, 44], [80, 22], [118, 16], [146, 34], [176, 34], [200, 56], [204, 78]]);
  return W(220, 100, `${shape(d, '#ffffff', { base: '#ffffff', lw: 2.4, lc: '#9fb8cc' })}<path d="M40 70 Q110 82 190 70" ${L(2.4, '#d8e8f2')}/>`, { seed });
}

// ------------------------------------------------------------------ CURTAIN (200x450, hangs from top; left one, mirror for right)
export const CURTAIN_W = 200, CURTAIN_H = 450;
function curtainSVG() {
  const d = 'M10 8H190C182 120 132 228 94 292C122 340 152 398 166 444H16C12 380 22 330 30 292C18 220 12 120 10 8Z';
  const cid = uid('c');
  let dots = '';
  for (let y = 20; y < 450; y += 30) for (let x = 14 + ((y / 30) % 2) * 15; x < 200; x += 30) dots += `<circle cx="${x}" cy="${y}" r="4.2" fill="#fffaf0"/>`;
  return W(CURTAIN_W, CURTAIN_H, `
    <clipPath id="${cid}"><path d="${d}"/></clipPath>
    ${shape(d, R2.curtain, { line: false })}
    <g clip-path="url(#${cid})">
      <g opacity="0.85">${dots}</g>
      <path d="M60 8C60 120 56 220 46 292 M110 8C102 120 84 220 62 292 M150 8C136 120 108 220 80 292" ${L(10, R2.curtainS)} opacity="0.55" filter="url(#crayon)"/>
      <path d="M44 300C42 360 40 400 40 444 M62 300C74 360 92 400 100 444 M80 300C104 350 128 400 140 444" ${L(10, R2.curtainS)} opacity="0.55" filter="url(#crayon)"/>
      <path d="M60 8C60 120 56 220 46 292 M110 8C102 120 84 220 62 292 M150 8C136 120 108 220 80 292 M44 300C42 360 40 400 40 444 M62 300C74 360 92 400 100 444 M80 300C104 350 128 400 140 444" ${L(2, '#c9a548')} opacity="0.6" filter="url(#pencil)"/>
      <rect x="0" y="420" width="200" height="30" fill="${R2.curtainS}" opacity="0.6"/>
    </g>
    <path d="${d}" ${stroke(3.2)}/>
    <path d="M18 424 Q90 430 162 424" ${stroke(2)} opacity="0.6"/>
    ${shape('M18 278C40 272 80 270 104 280C108 292 106 302 102 308C80 300 40 300 22 306C16 298 16 288 18 278Z', R2.tie, { lw: 2.6 })}
    ${shape('M96 292C112 276 128 284 124 298C120 308 106 302 96 292Z', R2.tie, { lw: 2.4 })}
    ${shape('M96 292C104 312 96 326 86 322C80 316 86 302 96 292Z', R2.tie, { lw: 2.4 })}
    <circle cx="97" cy="292" r="6" fill="${mix(R2.tie, '#c0605a', 0.4)}"/>
    ${[22, 62, 102, 142, 178].map(x => `<circle cx="${x}" cy="8" r="7" fill="none" stroke="${R2.woodD}" stroke-width="3" filter="url(#pencil)"/>`).join('')}`, { seed: 17 });
}

// ------------------------------------------------------------------ PLANT (leaves 320x360, base centre (160,350)); pot 160x130
function plantLeavesSVG() {
  const leaves = [[-62, 230, 0.95], [-30, 280, 1.1], [10, 300, 1.05], [40, 250, 1], [70, 200, 0.9], [-80, 170, 0.8], [5, 200, 0.85]];
  let s = '';
  const r = rng(91);
  leaves.forEach(([ang, len, sc], i) => {
    const a = (ang * Math.PI) / 180, bx = 160, by = 350, tx = bx + Math.sin(a) * len, ty = by - Math.cos(a) * len;
    s += `<path d="M${bx} ${by}Q${f(bx + Math.sin(a) * len * 0.3)} ${f(by - len * 0.6)} ${f(tx)} ${f(ty)}" ${L(4, R2.leafS)} filter="url(#pencil)"/>`;
    const rot = ang + (r() - 0.5) * 20, lw = 54 * sc, lh = 66 * sc;
    const leaf = `M0 ${f(lh * 0.4)}C${f(-lw)} ${f(lh * 0.2)} ${f(-lw * 0.9)} ${f(-lh * 0.9)} 0 ${f(-lh)}C${f(lw * 0.9)} ${f(-lh * 0.9)} ${f(lw)} ${f(lh * 0.2)} 0 ${f(lh * 0.4)}Z`;
    const col = [R2.leaf, R2.leafS, R2.leafL][i % 3];
    s += `<g transform="translate(${f(tx)} ${f(ty)}) rotate(${f(rot)})">${shape(leaf, col, { lw: 2.6 })}
      <path d="M0 ${f(lh * 0.35)}Q${f(lw * 0.05)} ${f(-lh * 0.2)} 0 ${f(-lh * 0.85)}" ${stroke(2, mix(col, PAL.line, 0.5))}/></g>`;
  });
  return W(320, 360, s, { seed: 19 });
}
function potSVG() {
  const d = 'M22 14H138L124 118C122 126 116 128 108 128H52C44 128 38 126 36 118Z';
  return W(160, 130, `${shape(d, '#fff6ea', { base: '#fffcf6' })}
    <path d="M28 40C70 48 92 48 132 40L130 58C92 66 68 66 30 58Z" fill="${R2.mint}" filter="url(#crayon)"/>
    <path d="M28 40C70 48 92 48 132 40 M30 58C68 66 92 66 130 58" ${stroke(2.2)}/>
    ${shape(rrect(14, 6, 132, 18, 6), '#fffaf0', { base: '#ffffff', lw: 2.6 })}
    <path d="M100 74 Q110 90 106 112" ${L(4, '#e9dccb')} opacity="0.8"/>`, { seed: 21 });
}

// ------------------------------------------------------------------ BOOKSHELF (300x340, base at y=332)
function shelfSVG() {
  const r = rng(101), bookCols = ['#f7b9c4', R2.mint, R2.lilac, '#bfe0f5', R2.peach, '#fde69a', '#c9e7b8'];
  let books = '';
  const shelfBooks = (y0, y1, x0, x1, seed) => {
    let x = x0; const rr = rng(seed);
    while (x < x1 - 18) {
      const bw = 18 + rr() * 16, bh = (y1 - y0) * (0.62 + rr() * 0.3), c = bookCols[Math.floor(rr() * bookCols.length)];
      if (rr() < 0.15 && x + 50 < x1) { // leaning book
        books += `<g transform="rotate(14 ${f(x)} ${f(y1)})">${shape(rrect(x + 6, y1 - bh, bw, bh, 3), c, { lw: 2.4 })}</g>`;
        x += bw + 20; continue;
      }
      books += shape(rrect(x, y1 - bh, bw, bh, 3), c, { lw: 2.4 }) + `<path d="M${f(x + 4)} ${f(y1 - bh * 0.75)}L${f(x + bw - 4)} ${f(y1 - bh * 0.75)}" ${L(2, '#fff')} opacity="0.7"/>`;
      x += bw + 2;
    }
  };
  shelfBooks(28, 112, 26, 190, 3);
  shelfBooks(128, 212, 120, 276, 4);
  shelfBooks(228, 312, 30, 160, 5);
  const extras = `
    ${shape('M214 112L218 82H262L266 112Z', '#fff6ea', { lw: 2.4 })}
    ${shape(blobD(240, 66, 22, 20, { seed: 4 }), R2.leaf, { lw: 2.4 })}${shape(blobD(226, 56, 12, 14, { seed: 5 }), R2.leafL, { lw: 2.2 })}
    ${shape(rrect(30, 160, 60, 52, 10), '#fffaf0', { lw: 2.4 })}
    ${['#f7b9c4', '#bfe0f5', '#c9e7b8', '#d9d0f2'].map((c, i) => `<path d="M${40 + i * 12} 162L${38 + i * 12} 128" ${L(7, c)}/><path d="M${40 + i * 12} 162L${38 + i * 12} 128" ${stroke(1.6)}/>`).join('')}
    ${shape(softStarD(226, 268, 34, 16, 5), '#fde69a', { lw: 2.6 })}
    <circle cx="226" cy="268" r="44" fill="#fff6c8" opacity="0.4" filter="url(#soft)"/>`;
  return W(300, 340, `
    ${shape(rrect(6, 8, 288, 324, 10), R2.wood, { lw: 3.2 })}
    ${shape(rrect(20, 22, 260, 292, 4), '#e8c79a', { base: '#efd6b0', lw: 2.4 })}
    <rect x="20" y="22" width="260" height="20" fill="#8a5a34" opacity="0.15" filter="url(#soft)"/>
    ${books}${extras}
    ${shape(rrect(14, 112, 272, 14, 3), R2.woodS, { lw: 2.4 })}
    ${shape(rrect(14, 212, 272, 14, 3), R2.woodS, { lw: 2.4 })}
    ${shape(rrect(10, 312, 280, 22, 4), R2.woodS, { lw: 2.6 })}
    <path d="M30 120 Q150 117 270 120 M30 220 Q150 217 270 220" ${L(2.4, '#fff')} opacity="0.5"/>`, { seed: 23 });
}

// ------------------------------------------------------------------ LAMP (180x620, base 610) & TOY CHEST (320x240, base 228)
function lampSVG() {
  const shade = 'M38 20H142L172 150C130 162 50 162 8 150Z';
  let scallops = '';
  for (let i = 0; i < 8; i++) scallops += `<path d="M${f(10 + i * 20.5)} 150q10 18 20.5 0" fill="${R2.lilac}"/>`;
  return W(180, 620, `
    <ellipse cx="90" cy="90" rx="130" ry="110" fill="#fff3c0" opacity="0.5" filter="url(#softL)"/>
    ${shape(rrect(84, 150, 12, 440, 5), R2.woodS, { lw: 2.4 })}
    ${shape(blobD(90, 598, 50, 13, { seed: 2, j: 0.01 }), R2.woodS, { lw: 2.6 })}
    <g filter="url(#crayon)">${scallops}</g>
    ${shape(shade, '#fff1d8', { base: '#fffaf0' })}
    <path d="M40 50 Q90 56 140 50 M30 100 Q90 108 152 100" ${L(2.4, '#e8d3b0')} opacity="0.8"/>`, { seed: 25 });
}
function chestSVG() {
  const box = rrect(20, 96, 280, 132, 10), lid = 'M28 96L48 10H272L292 96Z';
  return W(320, 240, `
    ${shape(lid, R2.woodS, { lw: 3 })}
    ${shape('M48 26H272L286 90H34Z', '#a8743f', { base: '#9a6a3a', lw: 2.2 })}
    ${shape(box, R2.wood, { lw: 3.2 })}
    ${hatch(box, [20, 96, 280, 132], R2.woodS, { ang: -40, gap: 10, op: 0.3, seed: 2 })}
    ${shape(softStarD(160, 162, 38, 17, 5), '#fde69a', { lw: 2.6 })}
    <path d="M30 132 Q160 128 290 132 M30 196 Q160 192 290 196" ${L(2.4, R2.woodD)} opacity="0.5"/>
    ${shape(rrect(26, 96, 268, 14, 5), R2.woodS, { lw: 2.4 })}`, { seed: 27 });
}

// ------------------------------------------------------------------ SUNBEAM (900x840, placed at stage (160,80))
export const BEAM = { x: 160, y: 80, w: 900, h: 840 };
function beamSVG() {
  const gid = uid('g');
  const shaft = (a, b, c, d) => `<path d="M${a} 6L${b} 6L${d} 830L${c} 830Z" fill="url(#${gid})"/>`;
  return W(BEAM.w, BEAM.h, `
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6" stop-opacity="0.75"/><stop offset="0.65" stop-color="#fff6d0" stop-opacity="0.35"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>
    <g filter="url(#soft)">${shaft(262, 540, 0, 350)}${shaft(566, 848, 380, 690)}</g>`, { seed: 2 });
}

// ------------------------------------------------------------------ HINT HAND (130x150, fingertip at (52,8))
export const HAND_W = 130, HAND_H = 150, HAND_TIP = [52, 8];
function handSVG() {
  const d = 'M42 74C42 52 42 30 44 16C46 4 62 4 62 16L62 62C64 54 80 54 82 64C86 58 100 58 100 70C104 66 118 68 116 82L114 108C112 128 98 138 76 138C56 138 40 128 34 112L22 88C18 78 30 70 38 78Z';
  return W(HAND_W, HAND_H, `
    <path d="${d}" fill="#000" opacity="0.15" transform="translate(5 7)" filter="url(#soft)"/>
    ${shape(d, '#ffffff', { base: '#ffffff', lw: 3.4 })}
    <path d="M62 62L62 76 M82 64L82 78 M100 70L100 82" ${stroke(2.4)}/>
    <ellipse cx="52" cy="14" rx="6" ry="4" fill="#f7c9d2" opacity="0.8"/>
    <path d="${rrect(46, 128, 64, 22, 8)}" fill="${R2.mint}" filter="url(#crayon)"/><path d="${rrect(46, 128, 64, 22, 8)}" ${stroke(2.8)}/>`, { seed: 29 });
}

/** soft round shadow (160x50) */
function shadowSVG() { return W(200, 60, `<ellipse cx="100" cy="30" rx="80" ry="16" fill="#5a3a2a" opacity="0.5" filter="url(#soft)"/>`); }

// ------------------------------------------------------------------ loader
/** Rasterize all level-2 art in parallel. Returns { toys: {`${type}-${col}`: sprite}, baskets: {col: {back, front}}, ... } */
export async function loadLevel2Art(toyList) {
  const S = (fn, w, h, key) => svgSprite(fn(), w, h, 'l2-' + key);
  const jobs = {
    wall: S(wallSVG, 2400, 740, 'wall'), floor: S(floorSVG, 2400, 580, 'floor'), rug: S(rugSVG, RUG_W, RUG_H, 'rug'),
    garden: S(gardenSVG, GARDEN.w, GARDEN.h, 'garden'), crown: S(treeCrownSVG, 280, 240, 'crown'),
    cloud1: S(() => cloudSVG(31), 220, 100, 'cloud1'), cloud2: S(() => cloudSVG(37), 220, 100, 'cloud2'),
    curtain: S(curtainSVG, CURTAIN_W, CURTAIN_H, 'curtain'), leaves: S(plantLeavesSVG, 320, 360, 'leaves'), pot: S(potSVG, 160, 130, 'pot'),
    shelf: S(shelfSVG, 300, 340, 'shelf'), lamp: S(lampSVG, 180, 620, 'lamp'), chest: S(chestSVG, 320, 240, 'chest'),
    beam: S(beamSVG, BEAM.w, BEAM.h, 'beam'), hand: S(handSVG, HAND_W, HAND_H, 'hand'), shadow: S(shadowSVG, 200, 60, 'shadow'),
    bouncerBack: S(bouncerBackSVG, BOUNCER_W, BOUNCER_H, 'bouncer-b'), bouncerFront: S(bouncerFrontSVG, BOUNCER_W, BOUNCER_H, 'bouncer-f'),
  };
  for (const k of Object.keys(COLS)) {
    jobs['bk-back-' + k] = S(() => basketBackSVG(k), BASKET_W, BASKET_H, 'bk-back-' + k);
    jobs['bk-front-' + k] = S(() => basketFrontSVG(k), BASKET_W, BASKET_H, 'bk-front-' + k);
  }
  const need = new Set(toyList.map(t => `${t.type}-${t.col}`));
  for (const key of need) { const [type, col] = key.split('-'); jobs['toy-' + key] = S(() => toySVG(type, col), TOY_W, TOY_H, 'toy-' + key); }
  const keys = Object.keys(jobs), vals = await Promise.all(keys.map(k => jobs[k]));
  const out = { toys: {}, baskets: {} };
  keys.forEach((k, i) => {
    if (k.startsWith('toy-')) out.toys[k.slice(4)] = vals[i];
    else if (k.startsWith('bk-')) { const [, part, col] = k.split('-'); (out.baskets[col] ||= {})[part] = vals[i]; }
    else out[k] = vals[i];
  });
  return out;
}

// Level 3 "Foto Keluarga" art: warm wall, garland, sideboard table, wooden picture frame, table decor,
// plus the procedural jigsaw (bezier tab/blank edges) and the per-piece sprites cut from the family portrait.
// Everything is authored as SVG (style.js crayon/pencil filters) or drawn once into offscreen canvases at load.
import { PAL, svg, stroke, fill } from './style.js';
import { rng } from '../engine/tween.js';
import { svgSprite, canvasSprite } from '../engine/raster.js';
import { game } from '../engine/game.js';

// ---------------------------------------------------------------------------------------------
// Dimensions (design units)
export const L3 = {
  PW: 510, PH: 340,          // photo (portrait) size
  COLS: 3, ROWS: 2,
  B: 54,                     // frame border width
  OVER: 9,                   // frame lip overlapping the photo edge
  STRING: 78,                // hanging string height above the frame
  NAIL_Y: 24,                // nail y inside the frame sprite
  M: 46,                     // sprite margin around the frame (room for the soft wall shadow)
};
L3.OW = L3.PW - 2 * L3.OVER + 2 * L3.B;   // frame outer width
L3.OH = L3.PH - 2 * L3.OVER + 2 * L3.B;   // frame outer height
L3.FW = L3.OW + 2 * L3.M;                 // frame sprite size
L3.FH = L3.OH + L3.STRING + L3.M;
L3.CENTER_FROM_NAIL = L3.STRING + L3.OH / 2 - L3.NAIL_Y;

export const WOOD = { light: '#f0c28e', mid: '#d99a5f', dark: '#b4743f', deep: '#8f5a2e', frame: '#c98547', frameLight: '#e4ad6f', frameDark: '#a2652f' };
const WALL = { base: '#f9dfcb', stripe: '#f4cfb6', dot: '#fdeee2' };

const f1 = v => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------------------------
// small drawing helpers
export function rr(x, y, w, h, r) {
  return `M${f1(x + r)} ${f1(y)} H${f1(x + w - r)} Q${f1(x + w)} ${f1(y)} ${f1(x + w)} ${f1(y + r)} V${f1(y + h - r)} Q${f1(x + w)} ${f1(y + h)} ${f1(x + w - r)} ${f1(y + h)} H${f1(x + r)} Q${f1(x)} ${f1(y + h)} ${f1(x)} ${f1(y + h - r)} V${f1(y + r)} Q${f1(x)} ${f1(y)} ${f1(x + r)} ${f1(y)} Z`;
}
function heart(cx, cy, s) {
  return `M${f1(cx)} ${f1(cy + 0.62 * s)} C${f1(cx - 1.15 * s)} ${f1(cy - 0.05 * s)} ${f1(cx - 0.6 * s)} ${f1(cy - 0.95 * s)} ${f1(cx)} ${f1(cy - 0.38 * s)} C${f1(cx + 0.6 * s)} ${f1(cy - 0.95 * s)} ${f1(cx + 1.15 * s)} ${f1(cy - 0.05 * s)} ${f1(cx)} ${f1(cy + 0.62 * s)} Z`;
}
function star(cx, cy, R, r = R * 0.48, n = 5, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rad = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + f1(cx + Math.cos(a) * rad) + ' ' + f1(cy + Math.sin(a) * rad) + ' ';
  }
  return d + 'Z';
}
function flower(cx, cy, s, col) {
  let o = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    o += `<circle cx="${f1(cx + Math.cos(a) * s * 0.55)}" cy="${f1(cy + Math.sin(a) * s * 0.55)}" r="${f1(s * 0.42)}" ${fill(col)}/>`;
  }
  o += `<circle cx="${cx}" cy="${cy}" r="${f1(s * 0.3)}" ${fill(PAL.yellow)}/>`;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    o += `<circle cx="${f1(cx + Math.cos(a) * s * 0.55)}" cy="${f1(cy + Math.sin(a) * s * 0.55)}" r="${f1(s * 0.42)}" ${stroke(2.2)}/>`;
  }
  return o;
}
/** wobbly hand-drawn line as a path */
function wline(x1, y1, x2, y2, amp, r, segs = 4) {
  let d = `M${f1(x1)} ${f1(y1)}`;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 1; i <= segs; i++) {
    const t0 = (i - 0.5) / segs, t1 = i / segs, o = (r() * 2 - 1) * amp;
    d += ` Q${f1(x1 + dx * t0 + nx * o)} ${f1(y1 + dy * t0 + ny * o)} ${f1(x1 + dx * t1)} ${f1(y1 + dy * t1)}`;
  }
  return d;
}
const softDefs = (id, sd) => `<defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sd}"/></filter></defs>`;

// ---------------------------------------------------------------------------------------------
// Wall: soft peach striped wallpaper with a warm light pool behind the frame. Anchored so content y=0 is at WALL_TOP.
export const WALL_W = 2400, WALL_TOP = 420, TABLE_Y = 770, WALL_H = WALL_TOP + TABLE_Y;
export function wallSVG(frameCY) {
  const W = WALL_W, H = WALL_H, r = rng(311), cy = WALL_TOP + frameCY;
  let s = `<defs><radialGradient id="pool" cx="${W / 2}" cy="${cy}" r="760" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fffaf2" stop-opacity="0.85"/><stop offset="0.55" stop-color="#fff4e8" stop-opacity="0.35"/><stop offset="1" stop-color="#fff4e8" stop-opacity="0"/></radialGradient>
    <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.75" stop-color="#d9a27c" stop-opacity="0"/><stop offset="1" stop-color="#c98e68" stop-opacity="0.35"/></linearGradient>
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9b896" stop-opacity="0.45"/><stop offset="0.35" stop-color="#e9b896" stop-opacity="0"/></linearGradient></defs>`;
  s += `<rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" fill="${WALL.base}"/>`;
  s += `<rect x="-20" y="-20" width="${W + 40}" height="${H + 40}" ${fill('#f7d6bf')} opacity="0.75"/>`;
  // crayon stripes (centered on the middle of the wall)
  const step = 132;
  for (let x = W / 2 - step * 10 - 30; x < W + step; x += step) {
    s += `<path d="M${x} -10 L${x + 60} -10 L${x + 63} ${H + 10} L${x + 3} ${H + 10} Z" fill="${WALL.stripe}" filter="url(#crayon)" opacity="0.8"/>`;
  }
  // tiny wallpaper motif: little crayon dots + hearts in the gaps
  for (let x = W / 2 - step * 10 + 66, k = 0; x < W + step; x += step, k++) {
    for (let y = 40 + (k % 2) * 80; y < H - 40; y += 160) {
      if ((k + y / 80) % 3 < 1) s += `<path d="${heart(x, y, 9)}" fill="#f6c2b4" filter="url(#crayon)" opacity="0.85"/>`;
      else s += `<circle cx="${x}" cy="${y}" r="5" fill="#fbe9a6" filter="url(#crayon)" opacity="0.9"/>`;
    }
  }
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#topShade)"/>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#pool)"/>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#floorShade)"/>`;
  // dado rail just above the table
  const ry = H - 120;
  s += `<rect x="-10" y="${ry}" width="${W + 20}" height="22" ${fill('#f2c7a8')}/>`;
  s += `<path d="${wline(-10, ry, W + 10, ry, 1.5, r, 12)}" ${stroke(2.4, '#c99a7c')}/>`;
  s += `<path d="${wline(-10, ry + 22, W + 10, ry + 22, 1.5, r, 12)}" ${stroke(2.4, '#c99a7c')}/>`;
  return svg(W, H, s, 5);
}

// Garland of crayon flags across the top, both sides of the frame. Sprite centered on the frame (x = cx).
export const GARLAND_W = 1160, GARLAND_H = 200;
export function garlandSVG() {
  const W = GARLAND_W, H = GARLAND_H, r = rng(77);
  const cols = [PAL.red, PAL.yellow, PAL.blue, PAL.green, '#f39bb0', PAL.orange, PAL.purple];
  let s = '';
  const strand = (x0, y0, x1, y1, sag, dir, seed) => {
    const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + sag * 2 - (y0 + y1) / 2 * 0; // control
    const qx = mx, qy = (y0 + y1) / 2 + sag * 2;
    const P = t => ({ x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * qx + t * t * x1, y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * qy + t * t * y1 });
    let flags = '', outl = '';
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.6) / (n + 0.2), p = P(t), p2 = P(t + 0.01), a = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
      const col = cols[(i + seed) % cols.length], fw = 52, fh = 62 + r() * 8;
      const d = `M${-fw / 2} 0 L${fw / 2} 0 L${f1(r() * 4 - 2)} ${f1(fh)} Z`;
      flags += `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${f1(a + (r() * 6 - 3))})"><path d="${d}" ${fill(col)}/><path d="M${-fw / 2 + 8} 8 L${fw / 2 - 8} 8" stroke="#fff" stroke-width="3" opacity="0.5" stroke-linecap="round" filter="url(#pencil)"/><path d="${d}" ${stroke(2.6)}/></g>`;
    }
    s += `<path d="M${x0} ${y0} Q${qx} ${qy} ${x1} ${y1}" ${stroke(3, '#8f7f73')}/>` + flags;
    s += `<circle cx="${x0}" cy="${y0}" r="6" fill="#9aa0a8"/><circle cx="${x1}" cy="${y1}" r="6" fill="#9aa0a8"/>`;
  };
  // strands start clear of the home button (cx-540 = ox+260) and meet behind the frame's nail
  strand(W / 2 - 540, 22, W / 2 - 34, 44, 40, 1, 0);
  strand(W / 2 + 34, 44, W / 2 + 540, 22, 40, -1, 3);
  return svg(W, H, s, 9);
}

// Sideboard: light top surface + front face with drawers. Sprite top = TABLE_Y (content), centered on cx.
export const TABLE_W = 2400, TABLE_H = 560;
export function tableSVG() {
  const W = TABLE_W, H = TABLE_H, r = rng(54);
  let s = softDefs('tsoft', 6);
  s += `<rect x="-20" y="34" width="${W + 40}" height="${H}" fill="${WOOD.mid}"/>`;
  s += `<rect x="-20" y="34" width="${W + 40}" height="${H}" ${fill('#d28f55')}/>`;
  // one compact row of drawers + a plinth rail (keeps tall screens from showing a wall of drawers)
  const dw = 380, gap = 40, dh = 104, y = 62;
  for (let k = -3; k <= 3; k++) {
    const x = W / 2 + k * (dw + gap) - dw / 2;
    s += `<path d="${rr(x, y, dw, dh, 14)}" ${fill('#dda06a')}/>`;
    s += `<path d="${rr(x + 8, y + 8, dw - 16, dh - 16, 10)}" fill="none" stroke="#f0bf8a" stroke-width="5" opacity="0.6" filter="url(#crayon)"/>`;
    s += `<path d="${rr(x, y, dw, dh, 14)}" ${stroke(2.8, '#7d5638')}/>`;
    s += `<ellipse cx="${x + dw / 2}" cy="${y + dh / 2}" rx="17" ry="15" ${fill('#f6cf3e')}/><ellipse cx="${x + dw / 2}" cy="${y + dh / 2}" rx="17" ry="15" ${stroke(2.6, '#7d5638')}/>`;
    s += `<ellipse cx="${x + dw / 2 - 5}" cy="${y + dh / 2 - 5}" rx="5" ry="4" fill="#fff" opacity="0.7"/>`;
  }
  const py = y + dh + 26;
  s += `<rect x="-20" y="${py}" width="${W + 40}" height="${H}" ${fill('#c07f48')}/>`;
  s += `<path d="${wline(-20, py, W + 20, py, 1.5, r, 16)}" ${stroke(2.8, '#7d5638')}/>`;
  s += `<path d="${wline(-20, py + 12, W + 20, py + 12, 1.5, r, 16)}" stroke="#e7ad74" stroke-width="4" opacity="0.5" fill="none" filter="url(#crayon)"/>`;
  for (let k = -6; k <= 6; k++) { const x = W / 2 + k * 190; s += `<path d="M${x} ${py + 30} V${H}" ${stroke(2, '#9a6436')} opacity="0.45"/>`; }
  // wood grain
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = 60 + r() * (H - 80), l = 80 + r() * 200;
    s += `<path d="${wline(x, y, x + l, y + (r() * 6 - 3), 3, r, 3)}" ${stroke(1.8, '#b47a48')} opacity="0.55"/>`;
  }
  // shadow under the lip
  s += `<rect x="-20" y="34" width="${W + 40}" height="16" fill="#8f5a2e" opacity="0.35" filter="url(#tsoft)"/>`;
  // top surface
  s += `<path d="M-20 4 H${W + 20} V40 H-20 Z" fill="${WOOD.light}"/>`;
  s += `<path d="M-20 4 H${W + 20} V40 H-20 Z" ${fill('#eab47c')}/>`;
  s += `<path d="${wline(-20, 14, W + 20, 14, 1.5, r, 14)}" stroke="#fff" stroke-width="5" opacity="0.45" fill="none" stroke-linecap="round" filter="url(#crayon)"/>`;
  s += `<path d="${wline(-20, 4, W + 20, 4, 1.5, r, 16)}" ${stroke(3, '#7d5638')}/>`;
  s += `<path d="${wline(-20, 40, W + 20, 40, 1.5, r, 16)}" ${stroke(3, '#7d5638')}/>`;
  return svg(W, H, s, 13);
}

// Potted plant (origin bottom centre: sprite 180×250, ay = 1)
export function plantSVG() {
  const W = 180, H = 250, r = rng(8);
  let s = '';
  const leaf = (x, y, a, l, col) => {
    const d = `M0 0 C${l * 0.3} ${-l * 0.28} ${l * 0.75} ${-l * 0.2} ${l} 0 C${l * 0.75} ${l * 0.2} ${l * 0.3} ${l * 0.28} 0 0 Z`;
    return `<g transform="translate(${x} ${y}) rotate(${a})"><path d="${d}" ${fill(col)}/><path d="M4 0 L${l * 0.85} 0" ${stroke(1.6, '#3f8a5f')}/><path d="${d}" ${stroke(2.4)}/></g>`;
  };
  const lv = [[-150, 70], [-120, 84], [-95, 90], [-70, 80], [-40, 66], [-128, 60], [-60, 60]];
  lv.forEach(([a, l], i) => { s += leaf(90, 150, a, l, i % 2 ? PAL.green : '#7fd3a2'); });
  s += `<path d="M42 146 L138 146 L126 240 L54 240 Z" ${fill('#e48c66')}/>`;
  s += `<path d="M36 136 H144 V158 H36 Z" ${fill('#ee9f7a')}/>`;
  s += `<path d="M48 190 Q90 204 132 190" fill="none" stroke="#fff" stroke-width="4" opacity="0.5" stroke-linecap="round"/>`;
  s += `<path d="M42 158 L54 240 L126 240 L138 158" ${stroke(2.8)}/><path d="M36 136 H144 V158 H36 Z" ${stroke(2.8)}/>`;
  return svg(W, H, s, 17);
}
// Little table lamp (origin bottom centre: sprite 170×270)
export function lampSVG() {
  const W = 170, H = 270;
  let s = softDefs('lglow', 14);
  s += `<ellipse cx="85" cy="70" rx="80" ry="64" fill="#fff3c4" opacity="0.6" filter="url(#lglow)"/>`;
  s += `<rect x="78" y="112" width="9" height="126" rx="4" ${fill("#8d8d8d")}/><rect x="78" y="112" width="9" height="126" rx="4" ${stroke(2.2)}/>`;
  s += `<path d="M40 238 Q85 222 130 238 L130 250 Q85 262 40 250 Z" ${fill('#5b8fe0')}/><path d="M40 238 Q85 222 130 238 L130 250 Q85 262 40 250 Z" ${stroke(2.6)}/>`;
  s += `<path d="M38 112 L58 30 L112 30 L132 112 Z" ${fill('#fbe08a')}/>`;
  s += `<path d="M58 44 Q62 80 54 104" fill="none" stroke="#fff" stroke-width="6" opacity="0.55" stroke-linecap="round"/>`;
  s += `<path d="M38 112 L58 30 L112 30 L132 112 Z" ${stroke(2.8)}/>`;
  for (let i = 0; i < 4; i++) s += `<circle cx="${52 + i * 22}" cy="100" r="5" fill="#f39bb0" filter="url(#crayon)"/>`;
  return svg(W, H, s, 19);
}

// Frame back: soft drop shadow on the wall + cream backing board in the window.
export function frameBackSVG() {
  const { FW, FH, OW, OH, M, STRING: S, B } = L3;
  let s = softDefs('fsh', 12);
  s += `<path d="${rr(M + 10, S + 18, OW, OH, 22)}" fill="#7a4a2a" opacity="0.32" filter="url(#fsh)"/>`;
  s += `<rect x="${M + B - 14}" y="${S + B - 14}" width="${OW - 2 * B + 28}" height="${OH - 2 * B + 28}" fill="#fdf6ec"/>`;
  return svg(FW, FH, s, 21);
}

// Frame front: chunky crayon wood frame with bevels, corner doodles, nail and string. Window is transparent.
export function frameFrontSVG() {
  const { FW, FH, OW, OH, M, STRING: S, B, NAIL_Y } = L3;
  const r = rng(99), x0 = M, y0 = S, ix = x0 + B, iy = y0 + B, iw = OW - 2 * B, ih = OH - 2 * B;
  const outer = rr(x0, y0, OW, OH, 22), inner = `M${ix} ${iy} V${iy + ih} H${ix + iw} V${iy} Z`;
  let s = `<defs><clipPath id="win"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/></clipPath>
    <clipPath id="body"><path d="${outer} ${inner}" clip-rule="evenodd"/></clipPath>
    <filter id="isoft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter></defs>`;
  // string + nail
  const nx = FW / 2;
  s += `<path d="M${x0 + OW * 0.2} ${y0 + 16} L${nx} ${NAIL_Y + 2} L${x0 + OW * 0.8} ${y0 + 16}" ${stroke(3.2, '#7e6d60')}/>`;
  // shadow of the frame onto the photo (inside the window)
  s += `<g clip-path="url(#win)"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="#5a3418" stroke-opacity="0.45" stroke-width="18" filter="url(#isoft)"/>
        <rect x="${ix}" y="${iy}" width="${iw}" height="12" fill="#5a3418" opacity="0.18" filter="url(#isoft)"/></g>`;
  // wood body
  s += `<path d="${outer} ${inner}" fill-rule="evenodd" fill="${WOOD.frame}"/>`;
  s += `<path d="${outer} ${inner}" fill-rule="evenodd" ${fill('#cf8c4d')}/>`;
  s += `<g clip-path="url(#body)">`;
  // outer bevel highlight (top/left) and shade (bottom/right)
  s += `<path d="M${x0 + 10} ${y0 + OH - 22} V${y0 + 22} Q${x0 + 10} ${y0 + 10} ${x0 + 22} ${y0 + 10} H${x0 + OW - 22}" fill="none" stroke="#f2c48f" stroke-width="11" stroke-linecap="round" opacity="0.85" filter="url(#crayon)"/>`;
  s += `<path d="M${x0 + OW - 10} ${y0 + 22} V${y0 + OH - 22} Q${x0 + OW - 10} ${y0 + OH - 10} ${x0 + OW - 22} ${y0 + OH - 10} H${x0 + 22}" fill="none" stroke="${WOOD.frameDark}" stroke-width="11" stroke-linecap="round" opacity="0.6" filter="url(#crayon)"/>`;
  // inner step (darker lip around the photo)
  s += `<rect x="${ix - 13}" y="${iy - 13}" width="${iw + 26}" height="${ih + 26}" fill="none" stroke="#a9682f" stroke-width="13" opacity="0.75" filter="url(#crayon)"/>`;
  s += `<rect x="${ix - 20}" y="${iy - 20}" width="${iw + 40}" height="${ih + 40}" fill="none" stroke="#e7b077" stroke-width="3" opacity="0.8" filter="url(#crayon)"/>`;
  // wood grain
  const grain = (ax, ay, bx, by) => `<path d="${wline(ax, ay, bx, by, 2.5, r, 5)}" ${stroke(1.7, '#9c602c')} opacity="0.55"/>`;
  for (let i = 0; i < 3; i++) {
    const t = 12 + i * 11;
    s += grain(x0 + 60 + r() * 30, y0 + t, x0 + OW - 60 - r() * 30, y0 + t + 1);
    s += grain(x0 + 60 + r() * 30, y0 + OH - t, x0 + OW - 60 - r() * 30, y0 + OH - t - 1);
    s += grain(x0 + t, y0 + 60 + r() * 30, x0 + t + 1, y0 + OH - 60 - r() * 30);
    s += grain(x0 + OW - t, y0 + 60 + r() * 30, x0 + OW - t - 1, y0 + OH - 60 - r() * 30);
  }
  s += `</g>`;
  // mitre joints
  for (const [ax, ay, bx, by] of [[x0 + 7, y0 + 7, ix, iy], [x0 + OW - 7, y0 + 7, ix + iw, iy], [x0 + 7, y0 + OH - 7, ix, iy + ih], [x0 + OW - 7, y0 + OH - 7, ix + iw, iy + ih]])
    s += `<path d="M${ax} ${ay} L${bx} ${by}" ${stroke(2.4, '#7d4f2a')}/>`;
  // corner doodles (hand-painted on the wood)
  const c = B / 2;
  s += `<path d="${heart(x0 + c + 2, y0 + c + 3, 15)}" ${fill('#f48fa8')}/><path d="${heart(x0 + c + 2, y0 + c + 3, 15)}" ${stroke(2.4)}/>`;
  s += `<path d="${star(x0 + OW - c - 2, y0 + c + 2, 17)}" ${fill(PAL.yellow)}/><path d="${star(x0 + OW - c - 2, y0 + c + 2, 17)}" ${stroke(2.4)}/>`;
  s += flower(x0 + c + 2, y0 + OH - c - 2, 14, '#9cc3f2');
  s += `<path d="${heart(x0 + OW - c - 2, y0 + OH - c - 1, 15)}" ${fill('#f48fa8')}/><path d="${heart(x0 + OW - c - 2, y0 + OH - c - 1, 15)}" ${stroke(2.4)}/>`;
  // small dots along the top & bottom rails
  for (let i = 1; i < 6; i++) {
    const t = i / 6, x = ix + iw * t;
    s += `<circle cx="${f1(x)}" cy="${y0 + c - 4}" r="4" fill="#fbe2b8" filter="url(#crayon)" opacity="0.9"/>`;
    s += `<circle cx="${f1(x)}" cy="${y0 + OH - c + 4}" r="4" fill="#fbe2b8" filter="url(#crayon)" opacity="0.9"/>`;
  }
  // outlines
  s += `<path d="${outer}" ${stroke(4, '#6b4a33')}/>`;
  s += `<path d="${inner}" ${stroke(3.4, '#6b4a33')}/>`;
  // nail on top of the string
  s += `<circle cx="${nx}" cy="${NAIL_Y}" r="10" fill="#a9afb6" filter="url(#crayon)"/><circle cx="${nx}" cy="${NAIL_Y}" r="10" ${stroke(2.6)}/><circle cx="${nx - 3}" cy="${NAIL_Y - 3}" r="3" fill="#fff" opacity="0.8"/>`;
  return svg(FW, FH, s, 23);
}

// ---------------------------------------------------------------------------------------------
// Jigsaw geometry. A tab edge is 6 cubic segments in (u along edge, v outward) space, smooth & symmetric.
const TAB = [
  [0, 0], [0.22, 0], [0.40, 0], [0.385, 0.05],
  [0.365, 0.10], [0.25, 0.14], [0.31, 0.22],
  [0.35, 0.27], [0.40, 0.31], [0.50, 0.31],
  [0.60, 0.31], [0.65, 0.27], [0.69, 0.22],
  [0.75, 0.14], [0.635, 0.10], [0.615, 0.05],
  [0.60, 0], [0.78, 0], [1, 0],
];
/** Edge points in global photo coords: A + d*u*L + n*v*L*g. The knob is centred at `c` along the edge (off-centre so
 *  it misses faces) and narrowed by `ws` so it still clears the corners; `jit` adds a little hand-made variation. */
function tabEdge(ax, ay, dx, dy, nx, ny, L, g, c = 0.5, ws = 1, jit = null) {
  const shift = jit ? (jit() * 2 - 1) * 0.02 : 0, hs = jit ? 0.95 + jit() * 0.08 : 1;
  return TAB.map(([u, v], i) => {
    const uu = i === 0 || i === 18 ? u : c + shift + (u - 0.5) * ws, vv = v * hs;
    return [ax + dx * uu * L + nx * vv * L * g, ay + dy * uu * L + ny * vv * L * g];
  });
}
const KNOB_WS = 0.82;
/** Choose each tab's position (30% / 70% along the edge) and direction so the knob avoids every safe rect
 *  (faces, hands, swaddle). rects: [{x,y,w,h}] in photo px. Ties → the candidate farthest from any rect centre. */
function pickTab(ax, ay, dx, dy, nx, ny, L, rects, prefer) {
  let best = null;
  for (const c of [0.3, 0.7]) for (const g of [1, -1]) {
    const pts = tabEdge(ax, ay, dx, dy, nx, ny, L, g, c, KNOB_WS).slice(3, 16);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 8;
    const bx0 = Math.min(...xs) - pad, bx1 = Math.max(...xs) + pad, by0 = Math.min(...ys) - pad, by1 = Math.max(...ys) + pad;
    const kx = (bx0 + bx1) / 2, ky = (by0 + by1) / 2;
    let hit = 0, near = Infinity;
    for (const r of rects) {
      const ox = Math.max(0, Math.min(bx1, r.x + r.w) - Math.max(bx0, r.x)), oy = Math.max(0, Math.min(by1, r.y + r.h) - Math.max(by0, r.y));
      hit += ox * oy * (r.weight || 1);
      near = Math.min(near, Math.hypot(kx - (r.x + r.w / 2), ky - (r.y + r.h / 2)));
    }
    const score = hit * 1000 - near + (prefer && prefer(c, g) ? -5 : 0);
    if (!best || score < best.score) best = { c, g, score };
  }
  return best;
}

const cubicAt = (p0, p1, p2, p3, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; };

/** Build the 3×2 jigsaw. safeRects (photo px) steer each tab off faces/hands/swaddle.
 *  Returns {cw, ch, pad, SW, SH, pieces:[{i,c,r,d (sprite-local path), edge (sprite-local polyline), gx, gy}], ghostD, choice} */
export function buildJigsaw(seed = 7, safeRects = []) {
  const { PW, PH, COLS, ROWS } = L3, cw = PW / COLS, ch = PH / ROWS, r = rng(seed);
  const pad = Math.ceil(Math.max(cw, ch) * 0.36) + 46;   // room for tabs, cardboard thickness and the soft lift shadow
  const H = [], V = [], rects = safeRects || [], choice = [];
  // horizontal cut: knobs off the centre column's middle (the baby); alternate directions only as a tie-break
  for (let rr_ = 0; rr_ < ROWS - 1; rr_++) { H[rr_] = []; for (let c = 0; c < COLS; c++) {
    const pk = pickTab(c * cw, (rr_ + 1) * ch, 1, 0, 0, 1, cw, rects, (cc, g) => (c === 1 ? g === 1 : g === (c % 2 ? -1 : 1)));
    choice.push(['H', rr_, c, pk.c, pk.g]);
    H[rr_][c] = tabEdge(c * cw, (rr_ + 1) * ch, 1, 0, 0, 1, cw, pk.g, pk.c, KNOB_WS, r);
  } }
  for (let rr_ = 0; rr_ < ROWS; rr_++) { V[rr_] = []; for (let c = 0; c < COLS - 1; c++) {
    const pk = pickTab((c + 1) * cw, rr_ * ch, 0, 1, 1, 0, ch, rects, (cc, g) => g === ((rr_ + c) % 2 ? 1 : -1));
    choice.push(['V', rr_, c, pk.c, pk.g]);
    V[rr_][c] = tabEdge((c + 1) * cw, rr_ * ch, 0, 1, 1, 0, ch, pk.g, pk.c, KNOB_WS, r);
  } }
  const pieces = [], ghostD = [];
  for (let rw = 0; rw < ROWS; rw++) for (let c = 0; c < COLS; c++) {
    const build = (ox, oy) => {
      const poly = [];
      let d = `M${f1(c * cw - ox)} ${f1(rw * ch - oy)}`;
      let cur = [c * cw, rw * ch]; poly.push([cur[0] - ox, cur[1] - oy]);
      const line = (x, y) => { d += ` L${f1(x - ox)} ${f1(y - oy)}`; for (let k = 1; k <= 8; k++) poly.push([cur[0] + (x - cur[0]) * k / 8 - ox, cur[1] + (y - cur[1]) * k / 8 - oy]); cur = [x, y]; };
      const seg = pts => {
        for (let k = 1; k < pts.length; k += 3) {
          d += ` C${f1(pts[k][0] - ox)} ${f1(pts[k][1] - oy)} ${f1(pts[k + 1][0] - ox)} ${f1(pts[k + 1][1] - oy)} ${f1(pts[k + 2][0] - ox)} ${f1(pts[k + 2][1] - oy)}`;
          for (let t = 1; t <= 4; t++) { const q = cubicAt(pts[k - 1], pts[k], pts[k + 1], pts[k + 2], t / 4); poly.push([q[0] - ox, q[1] - oy]); }
        }
        cur = pts[pts.length - 1];
      };
      if (rw === 0) line((c + 1) * cw, 0); else seg(H[rw - 1][c]);
      if (c === COLS - 1) line((c + 1) * cw, (rw + 1) * ch); else seg(V[rw][c]);
      if (rw === ROWS - 1) line(c * cw, (rw + 1) * ch); else seg([...H[rw][c]].reverse());
      if (c === 0) line(c * cw, rw * ch); else seg([...V[rw][c - 1]].reverse());
      return { d: d + ' Z', poly };
    };
    const loc = build(c * cw - pad, rw * ch - pad);
    pieces.push({ i: rw * COLS + c, c, r: rw, d: loc.d, edge: loc.poly, gx: (c + 0.5) * cw, gy: (rw + 0.5) * ch });
    ghostD.push(build(0, 0).d);
  }
  return { cw, ch, pad, SW: cw + 2 * pad, SH: ch + 2 * pad, pieces, ghostD, choice };
}

// Pencil "cut" line: one continuous soft-grey stroke — a gentle low-frequency wobble only (no grain/speckle).
const cutDefs = seed => `<defs>
  <filter id="cutW" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="cutW2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="1" seed="${seed + 9}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.8" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;

// ---------------------------------------------------------------------------------------------
// Sprites cut from the portrait.
/** Ghost: desaturated, washed-out portrait on cream photo paper with dashed pencil slot outlines. */
export async function ghostSprite(portrait, geo) {
  const { PW, PH } = L3;
  const dash = await svgSprite(svg(PW, PH, geo.ghostD.map(d => `<path d="${d}" fill="none" stroke="#8a7d74" stroke-width="3" stroke-dasharray="11 9" stroke-linecap="round" opacity="0.7" filter="url(#pencil)"/>`).join(''), 31), PW, PH, 'l3-ghost-dash');
  return canvasSprite(PW, PH, x => {
    x.fillStyle = '#fdf6ec'; x.fillRect(0, 0, PW, PH);
    x.drawImage(portrait.img, 0, 0, PW, PH);
    x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0, 0, PW, PH);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(252,244,232,0.72)'; x.fillRect(0, 0, PW, PH);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(250,226,200,0.55)'; x.fillRect(0, 0, PW, PH);
    x.globalCompositeOperation = 'source-over';
    x.drawImage(dash.img, 0, 0, PW, PH);
  });
}

/** Per piece sprites:
 *  img    — physical piece: cream cardboard thickness + darker underside, clipped portrait, emboss, pencil cut edge
 *  flat   — just the clipped picture (crossfaded in once placed so the photo reads as finished)
 *  white  — white silhouette (snap flash)
 *  shadow / shadowSoft — resting and lifted drop shadows
 *  glow   — soft halo + crayon-yellow outline, light fill (magnet / hint) */
export async function pieceSprites(portrait, geo) {
  const { PW, PH } = L3, { SW, SH, pad, cw, ch } = geo, ratio = game.pxRatio;
  const T = 7; // cardboard thickness
  const out = [];
  for (const p of geo.pieces) {
    const path = new Path2D(p.d);
    const [line, glowLine] = await Promise.all([
      svgSprite(svg(SW, SH, cutDefs(40 + p.i * 7) +
        `<path d="${p.d}" fill="none" stroke="#fffaf0" stroke-width="2.4" opacity="0.65" transform="translate(1.3 1.5)"/>` +
        `<path d="${p.d}" fill="none" stroke="#857a73" stroke-width="3.6" opacity="0.35" stroke-linejoin="round" filter="url(#cutW2)"/>` +
        `<path d="${p.d}" fill="none" stroke="#6c625c" stroke-width="2.6" opacity="0.9" stroke-linejoin="round" stroke-linecap="round" filter="url(#cutW)"/>`, 41 + p.i), SW, SH, 'l3-pc-line3-' + p.i),
      svgSprite(svg(SW, SH, cutDefs(70 + p.i * 5) +
        `<path d="${p.d}" fill="none" stroke="#f6b81f" stroke-width="9" stroke-linejoin="round" filter="url(#cutW2)"/>` +
        `<path d="${p.d}" fill="none" stroke="#fff6c8" stroke-width="2.6" stroke-linejoin="round" filter="url(#cutW)"/>`, 61 + p.i), SW, SH, 'l3-pc-glowline2-' + p.i),
    ]);
    const picture = x => { x.fillStyle = '#fdf6ec'; x.fillRect(0, 0, SW, SH); x.drawImage(portrait.img, pad - p.c * cw, pad - p.r * ch, PW, PH); };
    const img = canvasSprite(SW, SH, x => {
      // cardboard thickness: darker underside, then cream layers stepping up to the face
      x.save(); x.translate(0, T + 1.5); x.fillStyle = '#8f7556'; x.fill(path); x.restore();
      for (let k = T; k >= 1; k--) {
        x.save(); x.translate(0, k); x.fillStyle = k > T * 0.6 ? '#cdb48d' : k > T * 0.3 ? '#e4d3b2' : '#f3e8d2'; x.fill(path); x.restore();
      }
      x.save(); x.translate(0, T + 0.5); x.lineWidth = 1.6; x.strokeStyle = 'rgba(90,70,50,0.55)'; x.stroke(path); x.restore();
      // face
      x.save(); x.clip(path);
      picture(x);
      x.lineJoin = 'round';
      x.translate(3, 3); x.lineWidth = 7; x.strokeStyle = 'rgba(255,255,255,0.5)'; x.stroke(path);
      x.translate(-6, -6); x.lineWidth = 8; x.strokeStyle = 'rgba(96,58,30,0.26)'; x.stroke(path);
      x.translate(3, 3); x.lineWidth = 4; x.strokeStyle = 'rgba(250,240,220,0.6)'; x.stroke(path); // cream cut rim
      x.restore();
      x.drawImage(line.img, 0, 0, SW, SH);
    });
    const flat = canvasSprite(SW, SH, x => { x.save(); x.clip(path); picture(x); x.restore(); });
    const white = canvasSprite(SW, SH, x => { x.fillStyle = '#fffdf4'; x.fill(path); x.lineWidth = 6; x.strokeStyle = '#fffdf4'; x.stroke(path); });
    const shadowOf = blur => canvasSprite(SW, SH, x => {
      const off = 4000;
      x.shadowColor = 'rgba(80,46,22,1)'; x.shadowBlur = blur * ratio; x.shadowOffsetX = off * ratio;
      x.translate(-off, 0); x.fillStyle = '#000'; x.fill(path);
    });
    const glow = canvasSprite(SW, SH, x => {
      x.lineJoin = 'round';
      x.shadowColor = 'rgba(255,196,50,1)'; x.shadowBlur = 30 * ratio;
      x.lineWidth = 12; x.strokeStyle = 'rgba(255,214,90,0.8)'; x.stroke(path); x.stroke(path);
      x.shadowBlur = 0;
      x.fillStyle = 'rgba(255,236,150,0.3)'; x.fill(path);
      x.drawImage(glowLine.img, 0, 0, SW, SH);
    });
    out.push({ img, flat, white, shadow: shadowOf(12), shadowSoft: shadowOf(30), glow, path });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Hint hand: crayon pointing hand, fingertip at (HAND.tx, HAND.ty) in a HAND.w×HAND.h sprite.
export const HAND = { w: 150, h: 200, tx: 58, ty: 14 };
export function handSVG() {
  const { w, h } = HAND;
  const skin = '#ffffff', line = '#5b5552';
  const finger = `M46 98 L46 30 Q46 12 58 12 Q70 12 70 30 L70 92`;
  const palm = `M40 96 Q34 84 46 80 L70 82 Q78 70 90 76 Q100 70 108 80 Q118 76 122 90 Q130 100 124 128 Q118 160 92 166 L64 166 Q40 160 34 132 Q24 120 22 104 Q20 92 32 92 Q40 92 46 106 Z`;
  let s = '';
  s += `<path d="${palm}" fill="${skin}"/><path d="${palm}" ${fill('#f3ece6')} opacity="0.5"/>`;
  s += `<path d="${finger} Z" fill="${skin}"/>`;
  s += `<path d="${finger}" ${stroke(3.4, line)}/>`;
  s += `<path d="${palm}" ${stroke(3.4, line)}/>`;
  s += `<path d="M76 84 Q80 100 78 108 M98 80 Q102 96 100 106" ${stroke(2.2, line)}/>`;
  s += `<ellipse cx="58" cy="26" rx="6" ry="5" fill="#f7a9b8" opacity="0.5" filter="url(#blush)"/>`;
  // pink cuff
  s += `<path d="M58 160 L118 156 L124 196 L56 198 Z" ${fill('#fbc6dc')}/><path d="M58 160 L118 156 L124 196 L56 198 Z" ${stroke(3, line)}/>`;
  s += `<path d="M62 176 L120 172" stroke="#fff" stroke-width="4" opacity="0.6" stroke-linecap="round"/>`;
  return svg(w, h, s, 27);
}
/** Small crayon star particle (36×36). */
export function starSVG(col = PAL.yellow) {
  return svg(40, 40, `<path d="${star(20, 21, 16)}" ${fill(col)}/><path d="${star(20, 21, 16)}" ${stroke(2.2, '#b8892a')}/>`, 29);
}

/** Fallback studio backdrop for the live photo (used only when characters.js does not export one). */
export function photoBackdropSVG(w, h) {
  const r = rng(404);
  let s = `<defs><radialGradient id="bd" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#eefaf6"/><stop offset="0.6" stop-color="#cdeef0"/><stop offset="1" stop-color="#a9dbe8"/></radialGradient></defs>`;
  s += `<rect width="${w}" height="${h}" fill="url(#bd)"/><rect width="${w}" height="${h}" ${fill('#bfe7ea')} opacity="0.45"/>`;
  const cols = [PAL.red, PAL.yellow, PAL.green, PAL.blue, '#f39bb0', PAL.purple];
  const yAt = x => h * 0.1 + Math.sin(Math.PI * x / w) * h * 0.08;
  s += `<path d="M0 ${f1(yAt(0))} Q${w / 2} ${f1(h * 0.26)} ${w} ${f1(yAt(w))}" ${stroke(2.2, '#7f8f96')}/>`;
  for (let i = 0; i < 9; i++) {
    const x0 = w * (i + 0.2) / 9, x1 = w * (i + 0.8) / 9, xm = (x0 + x1) / 2;
    const d = `M${f1(x0)} ${f1(yAt(x0))} L${f1(x1)} ${f1(yAt(x1))} L${f1(xm)} ${f1(yAt(xm) + h * 0.11)} Z`;
    s += `<path d="${d}" ${fill(cols[i % cols.length])}/><path d="${d}" ${stroke(2)}/>`;
  }
  for (let i = 0; i < 9; i++) { const x = w * (0.06 + r() * 0.88), y = h * (0.3 + r() * 0.4); s += `<path d="${star(x, y, 7 + r() * 5)}" ${fill(PAL.yellow)} opacity="0.9"/>`; }
  s += `<path d="M0 ${h * 0.8} C${w * 0.3} ${h * 0.76} ${w * 0.7} ${h * 0.76} ${w} ${h * 0.8} V${h} H0 Z" ${fill('#bfe3a8')}/>`;
  return svg(w, h, s, 33);
}

/** Hand-drawn crayon heart (48×46) for the celebration. */
export function heartSVG() {
  const d = heart(24, 24, 19);
  return svg(48, 46, `<path d="${d}" ${fill('#f47a92')}/><path d="M15 17 Q17 13 21 13" stroke="#fff" stroke-width="3" opacity="0.7" fill="none" stroke-linecap="round"/><path d="${d}" ${stroke(2.4, '#b8475e')}/>`, 37);
}

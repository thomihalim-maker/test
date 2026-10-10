// Shared UI (owned by the UI builder): chunky crayon buttons, HUD, win celebration, transition curtain.
// API (keep stable): createHud(scene) -> {layout(view), pointerDown(p)->bool, pointerUp(p)->bool,
//                                        setProgress(done,total), show(), hide(), home}
//                    showWin(scene, {stars, next}) -> {pointerDown(p)}
//                    makeButton({icon:'home'|'play'|'next'|'replay'|'sound'|'mute'|'lock', size, color}, onTap) -> Promise<Node>
// Added:  buttonSprite(icon,size,color) (sync), press(btn) / release(btn) animations, btn.setIcon(icon),
//         safeInset() -> design-unit inset for notches, curtain (game.transition, installed on import).
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { tween, wait, Ease, killTweensOf } from '../engine/tween.js';
import { PAL } from '../art/style.js';
import { burst, warmFx } from '../art/fx.js';
import {
  makeSprite, crayonShape, crayonFill, pencil, scribble, circlePts, ellipsePts, roundRectPts, starPts, roundCorners,
  crayonText, shade, rgba, paperPattern, starSprite, glowSprite, tracePath, FONT,
} from '../art/backgrounds.js';

// ------------------------------------------------------------------ icons (drawn in a ±50 box)
function outlined(x, path, w, fillIt = false, col = '#ffffff') {
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = rgba(PAL.lineDark, 0.75); x.lineWidth = w + 6; path(x); x.stroke();
  if (fillIt) { x.fillStyle = rgba(PAL.lineDark, 0.75); x.fill(); }
  x.strokeStyle = col; x.lineWidth = w; path(x); x.stroke();
  if (fillIt) { x.fillStyle = col; x.fill(); }
  x.restore();
}
const ICONS = {
  play: (x) => outlined(x, c => { c.beginPath(); c.moveTo(-15, -25); c.lineTo(27, 0); c.lineTo(-15, 25); c.closePath(); }, 9, true),
  home: (x, col) => {
    outlined(x, c => { c.beginPath(); c.moveTo(-24, -1); c.lineTo(0, -25); c.lineTo(24, -1); c.lineTo(24, 25); c.lineTo(-24, 25); c.closePath(); }, 7, true);
    x.fillStyle = shade(col, -0.15); x.beginPath(); x.roundRect(-7, 7, 14, 18, 4); x.fill();
  },
  next: (x) => outlined(x, c => { c.beginPath(); c.moveTo(-24, 0); c.lineTo(20, 0); c.moveTo(2, -19); c.lineTo(22, 0); c.lineTo(2, 19); }, 11),
  replay: (x) => {
    outlined(x, c => { c.beginPath(); c.arc(0, 2, 22, -Math.PI * 0.35, Math.PI * 1.45); }, 10);
    outlined(x, c => { c.beginPath(); c.moveTo(4, -32); c.lineTo(22, -18); c.lineTo(4, -6); c.closePath(); }, 5, true);
  },
  sound: (x) => {
    outlined(x, c => { c.beginPath(); c.moveTo(-26, -9); c.lineTo(-13, -9); c.lineTo(3, -24); c.lineTo(3, 24); c.lineTo(-13, 9); c.lineTo(-26, 9); c.closePath(); }, 5, true);
    outlined(x, c => { c.beginPath(); c.arc(4, 0, 14, -0.8, 0.8); }, 6);
    outlined(x, c => { c.beginPath(); c.arc(4, 0, 26, -0.75, 0.75); }, 6);
  },
  mute: (x) => {
    outlined(x, c => { c.beginPath(); c.moveTo(-26, -9); c.lineTo(-13, -9); c.lineTo(3, -24); c.lineTo(3, 24); c.lineTo(-13, 9); c.lineTo(-26, 9); c.closePath(); }, 5, true);
    outlined(x, c => { c.beginPath(); c.moveTo(13, -10); c.lineTo(31, 10); c.moveTo(31, -10); c.lineTo(13, 10); }, 7);
  },
  lock: (x) => {
    outlined(x, c => { c.beginPath(); c.arc(0, -6, 14, Math.PI, 0); c.lineTo(14, 4); c.moveTo(-14, 4); c.lineTo(-14, -6); }, 7);
    outlined(x, c => { c.beginPath(); c.roundRect(-22, 0, 44, 30, 7); }, 4, true);
    x.fillStyle = PAL.line; x.beginPath(); x.arc(0, 13, 4.5, 0, 7); x.fill(); x.fillRect(-2, 13, 4, 9);
  },
  close: (x) => outlined(x, c => { c.beginPath(); c.moveTo(-18, -18); c.lineTo(18, 18); c.moveTo(18, -18); c.lineTo(-18, 18); }, 10),
};

/** Chunky crayon button sprite (circle with a darker "lip", highlight, pencil outline, outlined white icon). */
export function buttonSprite(icon = 'play', size = 120, color = PAL.orange) {
  const W = size + 12, H = size + 20;
  return makeSprite(W, H, (x) => {
    const c = W / 2, cy = size / 2 + 4, r = size / 2 - 4, lip = Math.max(6, size * 0.07);
    // soft ground shadow
    x.save(); x.filter = `blur(${size * 0.04}px)`; x.fillStyle = 'rgba(60,40,30,0.22)';
    x.beginPath(); x.ellipse(c, cy + lip + r * 0.9, r * 0.82, r * 0.18, 0, 0, 7); x.fill(); x.restore();
    crayonShape(x, circlePts(c, cy + lip, r), shade(color, -0.2), { seed: 3, lw: 3, volume: false, hatchStep: 5 });
    const face = crayonShape(x, circlePts(c, cy, r), color, { seed: 5, lw: 3.2, hatchStep: 5, light: shade(color, 0.3) });
    // crayon highlight arc
    scribble(x, ellipsePts(c, cy, r * 0.72, r * 0.72, 18, Math.PI * 1.08).slice(0, 6), 'rgba(255,255,255,0.75)', size * 0.06, { seed: 8, passes: 1, grain: 0.4 });
    x.save(); x.translate(c, cy + 1); const s = size / 120; x.scale(s, s); (ICONS[icon] || ICONS.play)(x, color); x.restore();
  }, { key: `btn|${icon}|${size}|${color}` });
}

export async function makeButton({ icon = 'play', size = 120, color = PAL.orange }, onTap) {
  const b = new Node({ interactive: true, hitPad: Math.max(14, (120 - size) / 2 + 10) }).setImage(buttonSprite(icon, size, color));
  b.ay = (size / 2 + 4) / b.h; // anchor at face centre
  b.icon = icon; b.size = size; b.color = color; b.onTap = onTap;
  b.hitR = size / 2 + 10;
  b.setIcon = (ic) => { b.icon = ic; b.img = buttonSprite(ic, size, color).img; };
  return b;
}

export function press(b) {
  if (!b) return; audio.sfx('tap'); killTweensOf(b, 'press');
  const s = b.baseScale || 1;
  tween(b, { sx: s * 0.9, sy: s * 0.84 }, { dur: 0.07, tag: 'press' });
}
export function release(b) {
  if (!b) return; killTweensOf(b, 'press'); const s = b.baseScale || 1;
  b.sx = s * 1.08; b.sy = s * 0.94;
  tween(b, { sx: s, sy: s }, { dur: 0.5, ease: 'outElastic', tag: 'press' });
}
/** press + release + callback after a beat (for one-shot taps). */
export function tapButton(b, fn) { press(b); setTimeout(() => { release(b); setTimeout(() => fn?.(), 90); }, 80); }

/** Extra horizontal inset (design units) so corner buttons clear notches on wide phones. */
export function safeInset(v = game.view) { return v.w > 1700 ? Math.min(70, (v.w - 1700) * 0.3) : 0; }

// ------------------------------------------------------------------ transition curtain (paper sheet + star iris)
let patCache = null;
const curtainStars = Array.from({ length: 26 }, (_, i) => ({ x: (i * 0.618034) % 1, y: ((i * 0.381966 * 7) % 1), s: 0.5 + ((i * 37) % 10) / 14, r: i }));
export const curtain = {
  draw(ctx, k, v) {
    const W = v.w, H = v.h, cx = W / 2, cy = H / 2, diag = Math.hypot(W, H);
    const e = Math.pow(1 - k, 1.35), R = e * diag * 1.08, r = R * 0.5, rot = -Math.PI / 2 + (1 - k) * 0.9;
    const pts = starPts(cx, cy, R, r, 5, rot);
    const rp = roundCorners(pts, R * 0.08, 3);
    if (!patCache || patCache.ctx !== ctx) patCache = { ctx, p: paperPattern(ctx, '#fbf0de') };
    ctx.save();
    ctx.beginPath(); ctx.rect(-10, -10, W + 20, H + 20);
    if (R > 1) { ctx.moveTo(rp[0][0], rp[0][1]); for (const p of rp) ctx.lineTo(p[0], p[1]); ctx.closePath(); }
    ctx.fillStyle = patCache.p; ctx.fill('evenodd');
    ctx.clip('evenodd');
    // scattered pastel crayon stars on the paper
    const st = starSprite(40, '#f8dc86', { line: '#d7b45a' });
    for (const s of curtainStars) {
      const sz = 40 * s.s; ctx.globalAlpha = 0.55;
      ctx.save(); ctx.translate(s.x * W, s.y * H); ctx.rotate(s.r + game.time * 0.3 * (s.r % 2 ? 1 : -1)); ctx.drawImage(st.img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.restore();
    if (R > 150) {
      // crayon rim around the iris
      ctx.save(); ctx.lineJoin = 'round'; ctx.globalAlpha = Math.min(1, (R - 150) / 200);
      ctx.beginPath(); ctx.moveTo(rp[0][0], rp[0][1]); for (const p of rp) ctx.lineTo(p[0], p[1]); ctx.closePath();
      ctx.strokeStyle = 'rgba(246,207,62,0.85)'; ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,180,0.9)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = rgba(PAL.line, 0.8); ctx.lineWidth = 3.5; ctx.translate(1.5, 1.5); ctx.stroke();
      ctx.restore();
    }
    // loader star while fully covered
    if (k > 0.82) {
      const a = (k - 0.82) / 0.18, big = starSprite(150, PAL.yellow), sc = a * (1 + Math.sin(game.time * 6) * 0.05);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy + Math.sin(game.time * 4) * 8); ctx.rotate(Math.sin(game.time * 2) * 0.15);
      const g = glowSprite(64, '#fff1b0'); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(g.img, -170 * sc, -170 * sc, 340 * sc, 340 * sc); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(big.img, -big.w / 2 * sc, -big.h / 2 * sc, big.w * sc, big.h * sc); ctx.restore();
    }
  },
};
game.transition = curtain;

// ------------------------------------------------------------------ HUD
export async function createHud(scene) {
  try { warmFx(); } catch (_) {}
  const home = await makeButton({ icon: 'home', size: 118, color: PAL.blue }, () => game.go('menu'));
  scene.uiLayer.add(home);
  const prog = new Node({ visible: false });
  scene.uiLayer.add(prog);
  let pressed = null, done = 0, total = 0, slots = [];
  const empty = starSprite(56, '#e9dcc4', { line: '#a8957a' }), full = starSprite(56, PAL.yellow);
  // intro pop
  home.sx = home.sy = 0; tween(home, { sx: 1, sy: 1 }, { dur: 0.5, delay: 0.35, ease: 'outBack' });
  const hud = {
    home, progress: prog,
    layout(v) { const si = safeInset(v); home.x = 92 + si; home.y = 88; prog.x = v.w / 2; prog.y = 70; },
    pointerDown(p) { if (!home.visible) return false; if (home.hitTest(p.x, p.y)) { pressed = home; press(home); return true; } return false; },
    pointerUp(p) {
      if (!pressed) return false; const n = pressed; pressed = null; release(n);
      if (n.hitTest(p.x, p.y)) setTimeout(() => n.onTap(), 90);
      return true;
    },
    hide() { home.visible = false; prog.visible = false; },
    show() { home.visible = true; prog.visible = total > 0; },
    /** Show/advance a little star tally at the top centre. */
    setProgress(d, t) {
      d = Math.max(0, Math.min(t, d | 0)); t = t | 0;
      if (t !== total) {
        total = t; prog.children.length = 0; slots = [];
        const gap = 66, w = t * gap + 40;
        const pill = makeSprite(w, 90, (x) => crayonShape(x, roundRectPts(6, 8, w - 12, 74, 37), '#fff8ec', { seed: 4, lw: 2.6, shade: '#efe2cc', light: '#ffffff' }), { key: 'pill' + t });
        prog.add(new Node({ alpha: 0.95 }).setImage(pill));
        for (let i = 0; i < t; i++) { const s = new Node({ x: (i - (t - 1) / 2) * gap, y: 2, rot: (i % 2 ? 0.08 : -0.08) }).setImage(empty); s.filled = false; prog.add(s); slots.push(s); }
        prog.visible = t > 0 && home.visible; done = 0;
      }
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i], want = i < d;
        if (want && !s.filled) {
          s.filled = true; s.setImage(full); s.sx = s.sy = 1.9; s.rot = -0.6;
          tween(s, { sx: 1, sy: 1, rot: i % 2 ? 0.08 : -0.08 }, { dur: 0.55, ease: 'outBack', delay: Math.max(0, i - done) * 0.08 });
          burst(prog, s.x, s.y, 'sparkle', { count: 9, spread: 0.45, delay: Math.max(0, i - done) * 0.08 });
        } else if (!want && s.filled) { s.filled = false; s.setImage(empty); }
      }
      done = d;
    },
  };
  return hud;
}

// ------------------------------------------------------------------ win celebration
function raysSprite() {
  return makeSprite(1400, 1400, (x) => {
    const c = 700, n = 18;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
      const pts = [[c, c], [c + Math.cos(a0) * 700, c + Math.sin(a0) * 700], [c + Math.cos(a1) * 700, c + Math.sin(a1) * 700]];
      crayonFill(x, pts, i % 2 ? '#fff4c8' : '#ffe1a8', { seed: i, wobble: 3, hatchStep: 12, grain: 0.4, volume: false });
    }
    // fade the centre/edges with a radial mask
    x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(c, c, 60, c, c, 700); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 1400, 1400);
  }, { key: 'rays', ratio: Math.min(0.8, game.pxRatio * 0.5) });
}
function cardSprite(w, h) {
  return makeSprite(w + 30, h + 40, (x) => {
    x.save(); x.filter = 'blur(10px)'; x.fillStyle = 'rgba(50,30,40,0.3)'; x.beginPath(); x.roundRect(22, 34, w - 14, h - 10, Math.min(50, h / 2)); x.fill(); x.restore();
    crayonShape(x, roundRectPts(15, 15, w, h, Math.min(54, h / 2)), '#fff8ec', { seed: 12, lw: 3.6, shade: '#f0e0c6', light: '#ffffff', hatchStep: 10 });
    // inner dashed pencil frame
    const inner = roundRectPts(34, 34, w - 38, h - 38, Math.min(34, h / 2 - 22));
    x.save(); x.setLineDash([14, 12]); pencil(x, inner, { w: 2.4, color: '#d9b98a', seed: 4, passes: 1 }); x.restore();
    // corner doodle stars
    for (const [px, py, s] of [[52, h / 2 + 15, 16], [w - 22, h / 2 + 15, 16]]) crayonShape(x, starPts(px, py, s, s * 0.47, 5, -Math.PI / 2, 2), '#f8dc86', { seed: px, lw: 1.8, lineColor: '#c9a548', wobble: 0.6, hatchStep: 4 });
  }, { key: `wincard|${w}|${h}` });
}
function bannerSprite(w = 760, h = 190) {
  return makeSprite(w, h, (x) => {
    const col = '#ef7d6c', dark = shade(col, -0.3), mid = h * 0.5;
    // tails
    for (const sgn of [-1, 1]) {
      const ex = sgn < 0 ? 10 : w - 10, ix = sgn < 0 ? 150 : w - 150;
      crayonShape(x, [[ix, mid - 30], [ex, mid - 30], [ex + sgn * -40, mid + 18], [ex, mid + 66], [ix, mid + 66]], shade(col, -0.12), { seed: 20 + sgn, lw: 3 });
      crayonShape(x, [[ix, mid + 66], [ix + sgn * -2, mid + 40], [ix + sgn * 38, mid + 40]].map(p => p), dark, { seed: 23, lw: 2.4, hatch: false });
    }
    // main band with gentle arc
    const pts = []; const n = 20;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([110 + t * (w - 220), mid - 62 + Math.sin(t * Math.PI) * -14]); }
    for (let i = n; i >= 0; i--) { const t = i / n; pts.push([110 + t * (w - 220), mid + 44 + Math.sin(t * Math.PI) * -14]); }
    crayonShape(x, pts, col, { seed: 31, lw: 3.6, light: '#ffa999', hatchStep: 7 });
    // stitch line
    const st = []; for (let i = 0; i <= n; i++) { const t = i / n; st.push([126 + t * (w - 252), mid - 48 + Math.sin(t * Math.PI) * -14]); }
    x.save(); x.setLineDash([10, 9]); scribble(x, st, 'rgba(255,240,220,0.8)', 2.6, { seed: 5, passes: 1 }); x.restore();
    const sb = st.map(([a, b]) => [a, b + 78]); x.save(); x.setLineDash([10, 9]); scribble(x, sb, 'rgba(255,240,220,0.8)', 2.6, { seed: 6, passes: 1 }); x.restore();
  }, { key: `banner|${w}|${h}` });
}
/** Crayon word made of per-letter nodes (for wobble/bounce). Returns container with .letters */
export function crayonWord(text, size, colors, o = {}) {
  const box = new Node(); box.letters = [];
  const mc = document.createElement('canvas').getContext('2d'); mc.font = `700 ${size}px ${FONT}`;
  const total = mc.measureText(text).width, track = o.track ?? size * 0.02;
  let xx = -(total + track * (text.length - 1)) / 2;
  [...text].forEach((ch, i) => {
    const cw = mc.measureText(ch).width;
    if (ch !== ' ') {
      const col = Array.isArray(colors) ? colors[i % colors.length] : colors;
      const L = new Node({ x: xx + cw / 2, y: 0, rot: ((i * 7919) % 9 - 4) * 0.012 }).setImage(crayonText(ch, size, col, { halo: o.halo ?? 1, line: o.line }));
      L.baseX = L.x; L.baseRot = L.rot; L.i = i; box.add(L); box.letters.push(L);
    }
    xx += cw + track;
  });
  box.width = total;
  return box;
}

export async function showWin(scene, { stars = 3, next } = {}) {
  const v = game.view, ui = scene.uiLayer, alive = () => game.scene === scene;
  try { warmFx(); } catch (_) {}
  audio.sfx('win');
  setTimeout(() => { if (alive()) audio.voice('Hebat!'); }, 500);
  scene.hud?.hide?.();
  const root = ui.add(new Node({ z: 1000 }));
  const W = () => game.view.w, H = () => game.view.h;
  const cx = W() / 2, oy = (H() - 900) / 2;
  // dim + warm vignette
  const dim = root.add(new Node({ alpha: 0, drawFn: ctx => {
    // dim only the top and bottom bands so the level's payoff in the centre stays visible
    const w = W(), h = H(), g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(44,40,92,0.5)'); g.addColorStop(0.28, 'rgba(44,40,92,0.08)'); g.addColorStop(0.42, 'rgba(44,40,92,0)');
    g.addColorStop(0.74, 'rgba(44,40,92,0)'); g.addColorStop(1, 'rgba(44,40,92,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } }));
  tween(dim, { alpha: 1 }, { dur: 0.45 });
  const topY = Math.min(oy, 60) * 0.5;
  const rays = root.add(new Node({ x: cx, y: topY + 120, alpha: 0, sx: 0.3, sy: 0.3 }).setImage(raysSprite()));
  rays.w = rays.h = 1500;
  tween(rays, { alpha: 0.4, sx: 0.55, sy: 0.55 }, { dur: 0.9, delay: 0.25, ease: 'outCubic' });
  game.onUpdate((dt) => { rays.rot += dt * 0.12; });

  const cardY = topY + 196;

  // banner with per-letter "Hebat!"
  const banner = root.add(new Node({ x: cx, y: -260, sx: 0.86, sy: 0.86 }));
  banner.add(new Node().setImage(bannerSprite()));
  const word = banner.add(crayonWord('Hebat!', 118, ['#fff3b0', '#ffe27a', '#fff3b0', '#ffe27a', '#fff3b0', '#ffffff'], { line: '#7a3b2e', halo: 0.5 }));
  word.y = -12;
  const bannerY = topY + 84;
  tween(banner, { y: bannerY }, { dur: 0.75, delay: 0.35, ease: 'outBounce' }).then(() => {
    if (!alive()) return; banner.sy = 0.78; banner.sx = 0.92; tween(banner, { sx: 0.86, sy: 0.86 }, { dur: 0.5, ease: 'outElastic' });
  });
  game.onUpdate((dt, t) => {
    for (const L of word.letters) { L.y = Math.sin(t * 5 - L.i * 0.7) * 7; L.rot = L.baseRot + Math.sin(t * 3 - L.i) * 0.05; }
    banner.rot = Math.sin(t * 1.4) * 0.012;
  });

  // star slots + filled stars
  const sY = cardY + 6, slots = [];
  const emptyS = starSprite(150, '#efe4d0', { line: '#c2b192' }), fullS = starSprite(150, PAL.yellow, { line: '#b8892a' });
  for (let i = 0; i < 3; i++) {
    const big = i === 1 ? 0.66 : 0.56, sx = cx + (i - 1) * 118, sy = sY - (i === 1 ? 8 : 0);
    const slot = root.add(new Node({ x: sx, y: sy, sx: 0, sy: 0, rot: (i - 1) * 0.18 }).setImage(emptyS));
    slot.big = big; slots.push(slot);
    tween(slot, { sx: big, sy: big }, { dur: 0.4, delay: 0.45 + i * 0.06, ease: 'outBack' });
  }
  const btns = [];
  (async () => {
    await wait(1.0); if (!alive()) return;
    for (let i = 0; i < 3; i++) {
      if (i < stars) {
        const s = slots[i]; s.setImage(fullS); s.sx = s.sy = 0.1; s.rot = (i - 1) * 0.18 - 1.2;
        tween(s, { sx: s.big * 1.9, sy: s.big * 1.9, rot: (i - 1) * 0.18 }, { dur: 0.26, ease: 'outCubic' }).then(() => tween(s, { sx: s.big, sy: s.big }, { dur: 0.45, ease: 'outElastic' }));
        audio.sfx('star', { i });
        burst(root, s.x, s.y, 'sparkle', { count: 16, spread: 0.9 });
        burst(root, s.x, s.y, 'stars', { count: 7, spread: 1.2, scale: 0.6 });
        // glow pulse behind the star
        const gl = new Node({ x: s.x, y: s.y, alpha: 0.9, sx: 0.5, sy: 0.5, composite: 'lighter' }).setImage(glowSprite(64, '#fff0a0'));
        gl.w = gl.h = 190; gl.parent = root; root.children.splice(root.children.indexOf(s), 0, gl);
        tween(gl, { sx: 1.3, sy: 1.3, alpha: 0.35 }, { dur: 0.6, ease: 'outCubic' });
        await wait(0.38); if (!alive()) return;
      }
    }
    // confetti from the top corners, then a gentle rain
    audio.sfx('cheer');
    burst(root, 40, -20, 'confetti', { angle: Math.PI * 0.3, cone: 0.9, count: 40, spread: 1.15 });
    burst(root, W() - 40, -20, 'confetti', { angle: Math.PI * 0.7, cone: 0.9, count: 40, spread: 1.15 });
    for (let k = 0; k < 5; k++) setTimeout(() => { if (alive()) burst(root, W() * (0.15 + Math.random() * 0.7), -30, 'confetti', { angle: Math.PI / 2, cone: 1.2, count: 14, spread: 0.5 }); }, 350 + k * 420);
    // buttons
    const defs = [['replay', PAL.green, 140, () => game.go(game.sceneName)], ['home', PAL.blue, 140, () => game.go('menu')]];
    if (next) defs.push(['next', PAL.orange, 178, () => game.go(next)]);
    const by = H() - 112, gap = 215;
    for (let i = 0; i < defs.length; i++) {
      const [icon, col, size, fn] = defs[i];
      const b = await makeButton({ icon, size, color: col }, fn);
      if (!alive()) return;
      b.x = cx + (i - (defs.length - 1) / 2) * gap + (icon === 'next' ? 18 : 0); b.y = by; b.sx = b.sy = 0;
      root.add(b); btns.push(b);
      tween(b, { sx: 1, sy: 1 }, { dur: 0.5, delay: i * 0.12, ease: 'outBack' }).then(() => { b.ready = true; });
      setTimeout(() => alive() && audio.sfx('pop', { pitch: i * 2 }), i * 120 + 60);
      if (icon === 'next') b.pulse = true;
    }
    game.onUpdate((dt, t) => { for (const b of btns) if (b.pulse && b.ready && !b.pressed) { const s = 1 + Math.sin(t * 4) * 0.05; b.sx = b.sy = s; } });
  })();
  return {
    root,
    pointerDown(p) {
      const b = btns.find(b => b.ready && b.hitTest(p.x, p.y));
      if (b && !b.pressed) { b.pressed = true; b.pulse = false; tapButton(b, () => b.onTap()); }
    },
  };
}

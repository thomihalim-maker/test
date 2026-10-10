// Particles (owned by the UI/juice builder).
// API: burst(parentNode, x, y, kind = 'sparkle', opts) -> Node (self-removing emitter)
// kinds: sparkle, stars, confetti, hearts, dust, zzz.
// opts: { count, spread (speed multiplier), scale, colors:[hex], angle (rad, centre of emission), cone (rad width),
//         gravity, life (seconds multiplier), delay (sec), z }
// Particles are crayon sprites rasterized once (lazily), simulated with gravity, drag and spin; sparkles glow
// additively. Emitters are children of parentNode and remove themselves when done. Coordinates are parent-local.
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { PAL } from './style.js';
import { makeSprite, crayonShape, crayonFill, starPts, heartPts, circlePts, roundRectPts, glowSprite, crayonText, shade, rgba } from './backgrounds.js';

const CONFETTI = [PAL.red, PAL.yellow, PAL.blue, PAL.green, PAL.purple, PAL.orange, '#f7a9b8'];
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

// ---- sprite factories (cached in backgrounds.makeSprite by key) ----
const spr = {
  star: (col) => makeSprite(44, 44, x => crayonShape(x, starPts(22, 23, 18, 8.5, 5, -Math.PI / 2, 2.5), col, { seed: 3, lw: 2, lineColor: shade(col, -0.45), wobble: 0.6, hatchStep: 4 }), { key: 'fxstar' + col }),
  glint: (col) => makeSprite(48, 48, x => {
    // 4-point glint: soft core + crisp cross
    const g = x.createRadialGradient(24, 24, 0, 24, 24, 22); g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.3, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(0, 0, 48, 48);
    x.fillStyle = '#ffffff'; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 3.2 : 22; x.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r); }
    x.closePath(); x.fill();
  }, { key: 'fxglint' + col }),
  dot: (col) => makeSprite(20, 20, x => crayonFill(x, circlePts(10, 10, 7, 14), col, { seed: 2, hatch: false, grain: 0.25 }), { key: 'fxdot' + col }),
  confetti: (col, k) => makeSprite(30, 30, x => {
    if (k === 0) crayonShape(x, roundRectPts(7, 3, 16, 24, 3), col, { seed: 4, lw: 1.4, lineColor: shade(col, -0.4), wobble: 0.5, hatchStep: 3 });
    else if (k === 1) crayonShape(x, circlePts(15, 15, 10, 16), col, { seed: 5, lw: 1.4, lineColor: shade(col, -0.4), wobble: 0.5, hatchStep: 3 });
    else crayonShape(x, [[4, 25], [15, 4], [26, 25]], col, { seed: 6, lw: 1.4, lineColor: shade(col, -0.4), wobble: 0.5, hatchStep: 3 });
  }, { key: 'fxconf' + col + k }),
  heart: (col) => makeSprite(48, 46, x => crayonShape(x, heartPts(24, 24, 19), col, { seed: 7, lw: 2, lineColor: shade(col, -0.4), wobble: 0.6, hatchStep: 4 }), { key: 'fxheart' + col }),
  puff: () => makeSprite(56, 56, x => {
    crayonFill(x, circlePts(28, 28, 22, 20), '#efe3d0', { seed: 9, grain: 0.5, hatchStep: 5, shade: '#ddcdb4', light: '#fffaf0' });
  }, { key: 'fxpuff' }),
  z: (size) => crayonText('z', size, '#a9c3f5', { halo: 0.6, line: '#5a6a9a', key: 'fxz' + size }),
};

// ---- kind presets ----
const KINDS = {
  sparkle: o => ({ n: 14, make: () => ({ sp: Math.random() < 0.7 ? spr.glint(pick(o.colors || ['#fff6c2', '#ffffff', '#fde68a'])) : spr.dot(pick(o.colors || ['#fff1a0', '#ffffff'])),
    v: R(120, 520), life: R(0.45, 0.9), g: 120, drag: 3.2, s: R(0.5, 1.2), spin: R(-4, 4), add: true, pop: true, twinkle: true }) }),
  stars: o => ({ n: 10, make: () => ({ sp: spr.star(pick(o.colors || [PAL.yellow, PAL.yellow, '#ffe58a', PAL.orange])), v: R(260, 700), life: R(0.8, 1.3), g: 900, drag: 1.4, s: R(0.6, 1.25), spin: R(-7, 7), pop: true, glow: true }) }),
  confetti: o => ({ n: 34, make: () => ({ sp: spr.confetti(pick(o.colors || CONFETTI), (Math.random() * 3) | 0), v: R(300, 1050), life: R(1.8, 3.0), g: R(450, 750), s: R(0.7, 1.3), spin: R(-9, 9), flutter: R(6, 14), sway: R(40, 110), wob: R(2, 5), term: R(110, 320), drag: R(1.4, 3.2) }) }),
  hearts: o => ({ n: 7, cone: Math.PI * 0.7, angle: -Math.PI / 2, make: () => ({ sp: spr.heart(pick(o.colors || ['#f47a92', '#f7a9b8', PAL.red])), v: R(120, 260), life: R(1.2, 1.8), g: -140, drag: 1.6, s: R(0.6, 1.1), spin: 0, wob: R(1.5, 3), sway: R(20, 40), pop: true }) }),
  dust: o => ({ n: 9, cone: Math.PI * 0.9, angle: -Math.PI / 2, make: () => ({ sp: spr.puff(), v: R(80, 240), life: R(0.5, 0.9), g: -40, drag: 4, s: R(0.5, 1.0), grow: 1.6, spin: R(-1, 1), alpha: 0.85 }) }),
  zzz: o => ({ n: 3, stagger: 0.55, cone: 0.25, angle: -Math.PI * 0.35, make: (i) => ({ sp: spr.z([46, 58, 72][i % 3]), v: R(60, 90), life: 2.2, g: -10, drag: 0.4, s: 0.6, grow: 1.9, spin: 0, wob: 2, sway: 22, rot0: -0.2 }) }),
};

/** Spawn a particle burst. Returns the emitter node. */
export function burst(parent, x, y, kind = 'sparkle', opts = {}) {
  if (!parent) return null;
  const preset = (KINDS[kind] || KINDS.sparkle)(opts);
  const n = opts.count ?? preset.n, spread = opts.spread ?? 1, scale = opts.scale ?? 1, lifeK = opts.life ?? 1;
  const cone = opts.cone ?? preset.cone ?? Math.PI * 2, ang = opts.angle ?? preset.angle ?? 0;
  const ps = [];
  for (let i = 0; i < n; i++) {
    const p = preset.make(i), a = cone >= Math.PI * 2 ? Math.random() * Math.PI * 2 : ang + (Math.random() - 0.5) * cone;
    const v = p.v * spread;
    Object.assign(p, { x: (opts.jitter ? R(-opts.jitter, opts.jitter) : 0), y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: -(opts.delay || 0) - (preset.stagger ? i * preset.stagger : 0),
      rot: p.rot0 ?? R(0, 6.3), s: p.s * scale, life: p.life * lifeK, ph: Math.random() * 7, g: opts.gravity ?? p.g });
    ps.push(p);
  }
  const glow = glowSprite(64, '#fff1b0');
  let last = game.time;
  const em = new Node({ x, y, z: opts.z ?? 50 });
  em.drawFn = (ctx) => {
    const now = game.time, dt = Math.min(0.05, Math.max(0, now - last)); last = now;
    let alive = 0;
    for (const p of ps) {
      p.age += dt; if (p.age < 0) { alive++; continue; } if (p.age > p.life) continue; alive++;
      const k = p.age / p.life;
      const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vy += p.g * dt;
      if (p.term && p.vy > p.term) p.vy = p.term;
      p.x += p.vx * dt + (p.sway ? Math.sin(p.age * (p.wob || 4) + p.ph) * p.sway * dt : 0); p.y += p.vy * dt; p.rot += p.spin * dt;
      let sc = p.s * (p.grow ? 1 + (p.grow - 1) * k : 1);
      if (p.pop) sc *= k < 0.15 ? 0.4 + (k / 0.15) * 0.75 : k < 0.3 ? 1.15 - ((k - 0.15) / 0.15) * 0.15 : 1;
      let a = (p.alpha ?? 1) * (k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1);
      if (p.twinkle) a *= 0.6 + 0.4 * Math.sin(p.age * 30 + p.ph);
      if (kind === 'zzz') a *= Math.min(1, p.age * 3);
      const sp = p.sp, w = sp.w * sc, h = sp.h * sc;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.flutter) ctx.scale(Math.cos(p.age * p.flutter + p.ph), 1);
      const baseA = ctx.globalAlpha;
      if (p.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = baseA * a * 0.45; ctx.drawImage(glow.img, -w, -h, w * 2, h * 2); }
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.globalAlpha = baseA * a; ctx.drawImage(sp.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    if (!alive && !em._dead) { em._dead = true; em.visible = false; Promise.resolve().then(() => em.removeSelf()); }
  };
  parent.add(em);
  return em;
}

/** Preload particle sprites (optional; avoids a first-burst hitch). */
export function warmFx() {
  try {
    for (const c of CONFETTI) { spr.confetti(c, 0); spr.confetti(c, 1); spr.confetti(c, 2); }
    [PAL.yellow, '#ffe58a', PAL.orange].forEach(spr.star); ['#fff6c2', '#ffffff', '#fde68a'].forEach(spr.glint);
    ['#f47a92', '#f7a9b8', PAL.red].forEach(spr.heart); spr.puff(); [46, 58, 72].forEach(spr.z);
  } catch (_) {}
}

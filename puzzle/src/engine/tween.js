// Tweens, easing and timers, all driven by the game ticker (game.update -> Tweens.update(dt)).
export const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: t => Math.sin((t * Math.PI) / 2),
  inBack: t => 2.70158 * t * t * t - 1.70158 * t * t,
  outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

const active = new Set();

/** tween(target, {x: 100, alpha: 0}, {dur: 0.4, ease: 'outBack', delay: 0}) -> Promise (resolves on finish or kill). */
export function tween(target, props, opt = {}) {
  const t = {
    target, props, dur: Math.max(0.0001, opt.dur ?? 0.4), delay: opt.delay ?? 0,
    ease: typeof opt.ease === 'function' ? opt.ease : Ease[opt.ease || 'outQuad'],
    onUpdate: opt.onUpdate, from: null, time: 0, done: false, tag: opt.tag,
  };
  const p = new Promise(res => { t.resolve = res; });
  t.promise = p;
  active.add(t);
  p.kill = () => killTween(t);
  return p;
}
function killTween(t) { if (!t.done) { t.done = true; active.delete(t); t.resolve(); } }
/** Stop all tweens on a target (optionally only those with a tag). */
export function killTweensOf(target, tag) { for (const t of [...active]) if (t.target === target && (tag === undefined || t.tag === tag)) killTween(t); }
export function killAllTweens() { for (const t of [...active]) killTween(t); }
/** Promise-based wait on the game clock. */
export function wait(sec) { return tween({ v: 0 }, { v: 1 }, { dur: sec, ease: 'linear' }); }

export function updateTweens(dt) {
  for (const t of [...active]) {
    if (t.done) continue;
    if (t.delay > 0) { t.delay -= dt; if (t.delay > 0) continue; }
    if (!t.from) { t.from = {}; for (const k in t.props) t.from[k] = t.target[k]; }
    t.time += dt;
    const k = Math.min(1, t.time / t.dur), e = t.ease(k);
    for (const key in t.props) t.target[key] = t.from[key] + (t.props[key] - t.from[key]) * e;
    if (t.onUpdate) t.onUpdate(e, k);
    if (k >= 1) killTween(t);
  }
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
/** Seeded PRNG (mulberry32) — use for deterministic hand-drawn jitter so art does not change between loads. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

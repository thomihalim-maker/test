// Particles. STUB — the UI/juice builder owns this file. API: burst(parentNode, x, y, kind = 'sparkle', opts)
// kinds: sparkle, stars, confetti, hearts, dust, zzz. Particles are children of parentNode, self-removing.
import { Node } from '../engine/node.js';
import { tween, rand } from '../engine/tween.js';
import { PAL } from './style.js';

export function burst(parent, x, y, kind = 'sparkle', opts = {}) {
  const n = opts.count || 12, cols = [PAL.yellow, PAL.red, PAL.blue, PAL.green, PAL.purple];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(60, 160), col = cols[i % cols.length], r = rand(6, 12);
    const p = parent.add(new Node({ x, y, drawFn: c => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); } }));
    tween(p, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, sx: 0.3, sy: 0.3 }, { dur: rand(0.5, 0.9), ease: 'outCubic' }).then(() => p.removeSelf());
  }
}

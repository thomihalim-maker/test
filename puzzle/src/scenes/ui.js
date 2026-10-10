// Shared UI: HUD (home button), buttons, win celebration. STUB — the UI builder owns and polishes this file.
// API (keep stable): createHud(scene) -> {layout(view), pointerDown(p)->bool, pointerUp(p)->bool}
//                    showWin(scene, {stars, next}) -> {pointerDown(p)}
//                    makeButton({icon:'home'|'play'|'next'|'replay'|'sound'|'mute', size, color}, onTap) -> Promise<Node>
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { svgSprite } from '../engine/raster.js';
import { tween } from '../engine/tween.js';
import { PAL, svg, stroke, fill } from '../art/style.js';

const ICON = {
  home: c => `<path d="M${c - 26} ${c + 4} L${c} ${c - 22} L${c + 26} ${c + 4} M${c - 18} ${c - 2} V${c + 24} H${c + 18} V${c - 2}" ${stroke(7, '#fff')}/>`,
  play: c => `<path d="M${c - 14} ${c - 22} L${c + 22} ${c} L${c - 14} ${c + 22} Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>`,
  next: c => `<path d="M${c - 20} ${c} H${c + 18} M${c + 2} ${c - 18} L${c + 20} ${c} L${c + 2} ${c + 18}" ${stroke(8, '#fff')}/>`,
  replay: c => `<path d="M${c + 20} ${c} A20 20 0 1 1 ${c + 8} ${c - 18}" ${stroke(7, '#fff')}/><path d="M${c + 2} ${c - 30} L${c + 12} ${c - 18} L${c - 2} ${c - 10}" ${stroke(7, '#fff')}/>`,
  sound: c => `<path d="M${c - 22} ${c - 8} H${c - 10} L${c + 6} ${c - 22} V${c + 22} L${c - 10} ${c + 8} H${c - 22} Z" fill="#fff"/><path d="M${c + 14} ${c - 10} Q${c + 22} ${c} ${c + 14} ${c + 10}" ${stroke(5, '#fff')}/>`,
  mute: c => `<path d="M${c - 22} ${c - 8} H${c - 10} L${c + 6} ${c - 22} V${c + 22} L${c - 10} ${c + 8} H${c - 22} Z" fill="#fff"/><path d="M${c + 12} ${c - 8} L${c + 26} ${c + 8} M${c + 26} ${c - 8} L${c + 12} ${c + 8}" ${stroke(5, '#fff')}/>`,
};

export async function makeButton({ icon = 'play', size = 120, color = PAL.orange }, onTap) {
  const c = size / 2;
  const sp = await svgSprite(svg(size, size, `<circle cx="${c}" cy="${c + 4}" r="${c - 8}" fill="rgba(0,0,0,0.12)"/><circle cx="${c}" cy="${c}" r="${c - 8}" ${fill(color)}/><circle cx="${c}" cy="${c}" r="${c - 8}" ${stroke(4)}/>${ICON[icon](c)}`), size, size, `btn-${icon}-${size}-${color}`);
  const b = new Node({ interactive: true, hitPad: 14 }).setImage(sp);
  b.onTap = onTap;
  return b;
}

function press(b) { audio.sfx('tap'); tween(b, { sx: 0.88, sy: 0.88 }, { dur: 0.06 }).then(() => tween(b, { sx: 1, sy: 1 }, { dur: 0.35, ease: 'outBack' })); }

export async function createHud(scene) {
  const home = await makeButton({ icon: 'home', size: 110, color: PAL.blue }, () => game.go('menu'));
  scene.uiLayer.add(home);
  let pressed = null;
  return {
    layout(v) { home.x = 90; home.y = 90; },
    pointerDown(p) { const n = scene.uiLayer.pick(p.x, p.y); if (n === home) { pressed = n; press(n); return true; } return false; },
    pointerUp(p) { if (pressed) { const n = pressed; pressed = null; if (n.hitTest(p.x, p.y)) n.onTap(); return true; } return false; },
  };
}

export async function showWin(scene, { stars = 3, next }) {
  audio.sfx('win');
  const v = game.view;
  const dim = new Node({ alpha: 0, drawFn: ctx => { ctx.fillStyle = 'rgba(60,40,30,0.35)'; ctx.fillRect(0, 0, game.view.w, game.view.h); } });
  scene.uiLayer.add(dim);
  tween(dim, { alpha: 1 }, { dur: 0.4 });
  const btns = [];
  const defs = [['replay', PAL.green, () => game.go(game.sceneName)], ['home', PAL.blue, () => game.go('menu')]];
  if (next) defs.push(['next', PAL.orange, () => game.go(next)]);
  for (let i = 0; i < defs.length; i++) {
    const [icon, col, fn] = defs[i];
    const b = await makeButton({ icon, size: 150, color: col }, fn);
    b.x = v.w / 2 + (i - (defs.length - 1) / 2) * 200; b.y = v.h * 0.72; b.sx = b.sy = 0;
    scene.uiLayer.add(b); btns.push(b);
    tween(b, { sx: 1, sy: 1 }, { dur: 0.5, delay: 0.3 + i * 0.1, ease: 'outBack' });
  }
  return { pointerDown(p) { const b = btns.find(b => b.hitTest(p.x, p.y)); if (b) { press(b); setTimeout(b.onTap, 120); } } };
}

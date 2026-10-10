// Characters: Ibu (mom), Ayah (dad), Bintang (baby). PLACEHOLDER art — the character builder replaces the
// drawing but MUST keep this API (see CONTRACT.md):
//   const mom = await createCharacter('mom'); scene.root.add(mom); mom.x = 400; mom.y = 860;
//   mom.react('happy' | 'cheer' | 'surprised' | 'think' | 'sad' , seconds?)  mom.setMood(...)  mom.talk(seconds)
//   mom.lookAt(worldX, worldY) / mom.lookAt(null)   baby.setMood('sleep')
// Origin (0,0) = bottom centre (feet / base of the swaddle). Heights at scale 1: mom ≈ 560, dad ≈ 600, baby ≈ 230.
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { svgSprite } from '../engine/raster.js';
import { tween } from '../engine/tween.js';
import { PAL, svg, stroke, fill } from './style.js';

const SPEC = {
  mom: { w: 420, h: 580, body: PAL.momShirt, head: PAL.hijab },
  dad: { w: 440, h: 620, body: PAL.dadShirt, head: PAL.dadHair },
  baby: { w: 260, h: 240, body: PAL.babyBlue, head: PAL.skin },
};

export const MOODS = ['idle', 'happy', 'cheer', 'surprised', 'think', 'sad', 'sleep'];

export class Character extends Node {
  constructor(kind) { super(); this.kind = kind; this.mood = 'idle'; this._t = Math.random() * 10; this._react = 0; this._talk = 0; this.look = null; }
  setMood(m) { this.mood = m; }
  react(m, sec = 1.6) { this._prev = this._prev || this.mood; this.mood = m; this._react = sec;
    tween(this.body, { sy: 1.08, sx: 0.95 }, { dur: 0.12 }).then(() => tween(this.body, { sy: 1, sx: 1 }, { dur: 0.5, ease: 'outElastic' })); }
  talk(sec = 1.2) { this._talk = sec; }
  lookAt(x, y) { this.look = x == null ? null : { x, y }; }
  update(dt) {
    this._t += dt;
    if (this._react > 0) { this._react -= dt; if (this._react <= 0) { this.mood = this._prev || 'idle'; this._prev = null; } }
    if (this._talk > 0) this._talk -= dt;
    const b = Math.sin(this._t * 2.2);
    this.body.sy = 1 + b * 0.012; this.body.sx = 1 - b * 0.008;
    if (this.mood === 'cheer') this.body.y = -Math.abs(Math.sin(this._t * 8)) * 22; else this.body.y = 0;
  }
}

export async function createCharacter(kind) {
  const s = SPEC[kind];
  const ch = new Character(kind);
  const art = svg(s.w, s.h, `
    <ellipse cx="${s.w / 2}" cy="${s.h * 0.78}" rx="${s.w * 0.38}" ry="${s.h * 0.22}" ${fill(s.body)}/>
    <ellipse cx="${s.w / 2}" cy="${s.h * 0.78}" rx="${s.w * 0.38}" ry="${s.h * 0.22}" ${stroke()}/>
    <circle cx="${s.w / 2}" cy="${s.h * 0.36}" r="${s.w * 0.3}" ${fill(s.head)}/>
    <circle cx="${s.w / 2}" cy="${s.h * 0.4}" r="${s.w * 0.22}" ${fill(PAL.skin)}/>
    <circle cx="${s.w / 2}" cy="${s.h * 0.4}" r="${s.w * 0.22}" ${stroke()}/>
    <circle cx="${s.w * 0.43}" cy="${s.h * 0.39}" r="5" fill="${PAL.lineDark}"/><circle cx="${s.w * 0.57}" cy="${s.h * 0.39}" r="5" fill="${PAL.lineDark}"/>
    <ellipse cx="${s.w * 0.38}" cy="${s.h * 0.44}" rx="14" ry="8" fill="${PAL.cheek}" filter="url(#blush)"/>
    <ellipse cx="${s.w * 0.62}" cy="${s.h * 0.44}" rx="14" ry="8" fill="${PAL.cheek}" filter="url(#blush)"/>`, kind.length);
  const sp = await svgSprite(art, s.w, s.h, 'char-' + kind);
  ch.body = new Node({ ax: 0.5, ay: 1 }).setImage(sp);
  ch.add(ch.body);
  ch.w = s.w; ch.h = s.h; ch.ax = 0.5; ch.ay = 1; // for hit tests (no img on the root)
  game.onUpdate(dt => ch.update(dt));
  return ch;
}

/** Family portrait (Ibu, Ayah, Bintang together) for the level-3 jigsaw. PLACEHOLDER composition. */
export async function portraitSprite(w = 900, h = 600) {
  const { canvasSprite } = await import('../engine/raster.js');
  const parts = {};
  for (const k of ['mom', 'dad', 'baby']) { const s = SPEC[k]; parts[k] = await svgSprite(svg(s.w, s.h, `<circle cx="${s.w / 2}" cy="${s.h * 0.4}" r="${s.w * 0.3}" ${fill(s.head)}/><ellipse cx="${s.w / 2}" cy="${s.h * 0.8}" rx="${s.w * 0.38}" ry="${s.h * 0.2}" ${fill(s.body)}/>`), s.w, s.h, 'pp-' + k); }
  return canvasSprite(w, h, (x) => {
    x.fillStyle = '#fde9d6'; x.fillRect(0, 0, w, h);
    x.drawImage(parts.mom.img, w * 0.05, h * 0.1, w * 0.4, h * 0.85);
    x.drawImage(parts.dad.img, w * 0.55, h * 0.08, w * 0.4, h * 0.87);
    x.drawImage(parts.baby.img, w * 0.37, h * 0.55, w * 0.26, h * 0.4);
  });
}

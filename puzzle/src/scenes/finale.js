// Finale after level 3 (owned by the UI builder): the family celebrating under a starry sky, star fireworks,
// baby giggles, a short thank-you line; tap to return to the menu.
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { tween } from '../engine/tween.js';
import { createCharacter } from '../art/characters.js';
import { burst, warmFx } from '../art/fx.js';
import { PAL } from '../art/style.js';
import { crayonWord, makeButton, press, release, safeInset } from './ui.js';
import {
  makeSprite, crayonShape, circlePts, ellipsePts, nightSky, hillSprite, moonSprite, glowSprite, buntingSprite,
  Starfield, Fireflies, ShootingStar,
} from '../art/backgrounds.js';

const FW_COLS = [[PAL.yellow, '#ffe58a'], ['#f7a9b8', '#f47a92'], ['#a9c8ff', PAL.blue], ['#9fe0c0', PAL.green], ['#d2b8ff', PAL.purple], [PAL.orange, '#ffc98a']];

function rugSprite() {
  return makeSprite(760, 130, (x) => {
    x.save(); x.filter = 'blur(8px)'; x.fillStyle = 'rgba(20,30,40,0.28)'; x.beginPath(); x.ellipse(380, 84, 350, 30, 0, 0, 7); x.fill(); x.restore();
    crayonShape(x, ellipsePts(380, 64, 350, 50, 60), '#fbd6e3', { seed: 7, lw: 3, light: '#fff0f5', shade: '#eab0c6' });
    crayonShape(x, ellipsePts(380, 64, 290, 36, 60), '#fff1c9', { seed: 8, lw: 2.2, light: '#fffbe8', shade: '#f2dca0' });
    for (let i = 0; i < 9; i++) crayonShape(x, circlePts(140 + i * 60, 64 + Math.sin(i * 1.3) * 12, 7, 12), ['#f7a9b8', PAL.blue, PAL.green][i % 3], { seed: i, lw: 1.2, hatch: false });
  }, { key: 'finaleRug' });
}

export default class Finale {
  constructor() { this.root = new Node(); this.rockets = []; this.canLeave = false; this.leaving = false; }
  async load() {
    try { await Promise.race([document.fonts.load('700 80px Fredoka'), new Promise(r => setTimeout(r, 1200))]); } catch (_) {}
    warmFx();
    const R = this.root;
    this.sky = R.add(new Node({ ax: 0, ay: 0 }).setImage(nightSky(2200, 1300, { seed: 9, top: '#262f6e', mid: '#5a4f9e', low: '#c58fbf', glow: '#ffcf9e' })));
    this.stars = R.add(new Starfield({ density: 1.5, seed: 33 }));
    this.shoot = R.add(new ShootingStar());
    this.moonGlow = R.add(new Node({ composite: 'lighter', alpha: 0.5 }).setImage(glowSprite(64, '#fff2c0'))); this.moonGlow.w = this.moonGlow.h = 380;
    this.moon = R.add(new Node().setImage(moonSprite(70)));
    this.sky2 = R.add(new Node()); // fireworks layer (behind hills)
    this.hillFar = R.add(new Node({ ax: 0.5, ay: 1 }).setImage(hillSprite(2300, 360, '#7d86c2', 3, { base: 150, amp: 80, freq: 1.2, line: '#5a5f99' })));
    this.hillMid = R.add(new Node({ ax: 0.5, ay: 1 }).setImage(hillSprite(2300, 280, '#6fae8e', 5, { base: 110, amp: 60, freq: 0.9, line: '#4c8a6c' })));
    this.flies = R.add(new Fireflies(18, 9));
    this.hillNear = R.add(new Node({ ax: 0.5, ay: 1 }).setImage(hillSprite(2300, 230, '#8ccf8f', 8, { base: 70, amp: 34, freq: 0.7, tufts: 60, line: '#5c9e66' })));
    this.bunting = R.add(new Node({ ax: 0.5, ay: 0 }).setImage(buntingSprite(1700, 130, 4)));
    this.fam = R.add(new Node());
    this.rug = this.fam.add(new Node({ y: -20 }).setImage(rugSprite()));
    this.mom = this.fam.add(await createCharacter('mom'));
    this.dad = this.fam.add(await createCharacter('dad'));
    this.baby = this.fam.add(await createCharacter('baby'));
    this.mom.sx = this.mom.sy = 0.78; this.dad.sx = this.dad.sy = 0.78; this.baby.sx = this.baby.sy = 1.0;
    this.title = R.add(crayonWord('Terima kasih sudah bermain!', 92, ['#ffe27a', '#ffb3c7', '#9fe0c0', '#a9c8ff', '#ffc98a', '#d2b8ff'], { line: '#3c3466', halo: 0.75, track: 2 }));
    this.home = R.add(await makeButton({ icon: 'home', size: 130, color: PAL.blue }, () => this._leave()));
    this.home.visible = false;
    this.fx = R.add(new Node({ z: 100 }));
    game.onUpdate((dt, t) => this._tick(dt, t));
  }
  layout(v) {
    this.v = v; const W = v.w, H = v.h, oy = (H - 900) / 2, si = safeInset(v);
    this.sky.w = Math.max(W, H * 1.7) + 4; this.sky.h = H + 4; this.sky.x = this.sky.y = -2;
    this.stars.layout(W, H * 0.65); this.shoot.area = { w: W, h: H * 0.5 };
    this.moon.x = W - 200 - si; this.moon.y = 290 + oy * 0.4; this.moonGlow.x = this.moon.x; this.moonGlow.y = this.moon.y;
    for (const h of [this.hillFar, this.hillMid, this.hillNear]) { h.x = W / 2; h.y = H + 8; }
    this.hillMid.x = W / 2 - 80;
    this.flies.layout(0, H * 0.45, W, H * 0.45);
    this.bunting.x = W / 2; this.bunting.y = -6; this.bunting.sx = Math.max(1, W / 1700);
    this.title.x = W / 2; this.title.y = oy + 205;
    this.fam.x = W / 2; this.fam.y = H - 40;
    this.mom.x = -250; this.dad.x = 250; this.baby.x = 0; this.baby.y = -26;
    this.home.x = W - 110 - si; this.home.y = H - 110;
  }
  enter() {
    audio.music('finale');
    setTimeout(() => { if (game.scene === this) { audio.sfx('win'); audio.voice('Hore! Terima kasih sudah bermain!'); } }, 500);
    this.title.letters.forEach((L, i) => { L.y = -600; L.landed = false; tween(L, { y: 0 }, { dur: 0.8, delay: 0.3 + i * 0.035, ease: 'outBounce' }).then(() => { L.landed = true; }); });
    const fy = this.fam.y; this.fam.y = fy + 160; tween(this.fam, { y: fy }, { dur: 0.9, delay: 0.1, ease: 'outBack' });
    this.mom.setMood?.('happy'); this.dad.setMood?.('happy'); this.baby.setMood?.('happy');
    this.fwT = 1.0; this.gigT = 1.6; this.cheerT = 0.8; this.k = 0;
    setTimeout(() => {
      if (game.scene !== this) return;
      const W = this.v.w;
      burst(this.fx, 40, -20, 'confetti', { angle: Math.PI * 0.3, cone: 0.9, count: 40 });
      burst(this.fx, W - 40, -20, 'confetti', { angle: Math.PI * 0.7, cone: 0.9, count: 40 });
    }, 900);
    setTimeout(() => {
      if (game.scene !== this) return; this.canLeave = true; this.home.visible = true; this.home.sx = this.home.sy = 0;
      tween(this.home, { sx: 1, sy: 1 }, { dur: 0.5, ease: 'outBack' }).then(() => { this.home.ready = true; });
    }, 3200);
  }
  _launch() {
    const W = this.v.w, H = this.v.h, x0 = W * (0.1 + Math.random() * 0.8), y1 = 90 + Math.random() * H * 0.28;
    const col = FW_COLS[(Math.random() * FW_COLS.length) | 0];
    const r = { x: x0, y: H * 0.72, x1: x0 + (Math.random() - 0.5) * 160, y1, t: 0, dur: 0.85 + Math.random() * 0.3, col, trail: [] };
    this.rockets.push(r);
    audio.sfx('whoosh', { vol: 0.35 });
  }
  _tick(dt, t) {
    if (!this.v) return;
    for (const L of this.title.letters) if (L.landed) { L.y = Math.sin(t * 3 - L.i * 0.45) * 8; L.rot = L.baseRot + Math.sin(t * 2 - L.i) * 0.05; }
    this.moon.rot = Math.sin(t * 0.6) * 0.08;
    this.bunting.rot = Math.sin(t * 0.9) * 0.006;
    if (this.home.ready && !this.home.held) this.home.sx = this.home.sy = 1 + Math.sin(t * 4) * 0.05;
    // fireworks
    this.fwT -= dt; if (this.fwT <= 0) { this.fwT = 0.7 + Math.random() * 0.8; this._launch(); if (Math.random() < 0.3) setTimeout(() => game.scene === this && this._launch(), 200); }
    for (const r of [...this.rockets]) {
      r.t += dt; const k = Math.min(1, r.t / r.dur), e = 1 - Math.pow(1 - k, 2.2);
      r.cx = r.x + (r.x1 - r.x) * e; r.cy = r.y + (r.y1 - r.y) * e;
      r.trail.push([r.cx, r.cy]); if (r.trail.length > 14) r.trail.shift();
      if (k >= 1) {
        this.rockets.splice(this.rockets.indexOf(r), 1);
        burst(this.sky2, r.cx, r.cy, 'stars', { count: 14, spread: 0.95, colors: r.col, gravity: 300, life: 1.3 });
        burst(this.sky2, r.cx, r.cy, 'sparkle', { count: 16, spread: 1.0, colors: ['#ffffff', r.col[0]] });
        audio.sfx(Math.random() < 0.5 ? 'sparkle' : 'pop', { vol: 0.6, pitch: Math.round(Math.random() * 4) });
      }
    }
    if (!this.sky2.drawFn) this.sky2.drawFn = (ctx) => {
      const g = glowSprite(64, '#fff1b0');
      for (const r of this.rockets) {
        ctx.globalCompositeOperation = 'lighter';
        r.trail.forEach(([x, y], i) => { const a = i / r.trail.length; ctx.globalAlpha = a * 0.6; const s = 10 + a * 24; ctx.drawImage(g.img, x - s / 2, y - s / 2, s, s); });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(r.cx, r.cy, 4.5, 0, 7); ctx.fill();
      }
    };
    // family life
    this.cheerT -= dt;
    if (this.cheerT <= 0) { this.cheerT = 1.4 + Math.random() * 1.2; (this.k++ % 2 ? this.dad : this.mom).react?.('cheer', 1.3); }
    this.gigT -= dt;
    if (this.gigT <= 0) {
      this.gigT = 3 + Math.random() * 2.5; this.baby.react?.('happy', 1.6); audio.sfx('giggle');
      const top = this.baby.toWorld(0, -this.baby.h * 0.9); burst(this.fx, top.x, top.y, 'hearts', { count: 5 });
    }
  }
  _leave() { if (this.leaving) return; this.leaving = true; audio.sfx('whoosh'); game.go('menu'); }
  pointerDown(p) {
    if (this.home.ready && this.home.hitTest(p.x, p.y)) { this.home.held = true; press(this.home); return; }
    const ch = [this.baby, this.mom, this.dad].find(c => c.hitTest(p.x, p.y));
    if (ch) {
      ch.react?.(ch === this.baby ? 'happy' : 'cheer', 1.4); audio.sfx(ch === this.baby ? 'giggle' : 'cheer');
      const top = ch.toWorld(0, -ch.h * 0.85); burst(this.fx, top.x, top.y, 'hearts', { count: 6 }); return;
    }
    burst(this.fx, p.x, p.y, 'stars', { count: 8, scale: 0.8 }); audio.sfx('sparkle', { vol: 0.7 });
    if (this.canLeave && p.y > this.v.h * 0.3) this._leave();
  }
  pointerUp(p) { if (this.home.held) { this.home.held = false; release(this.home); if (this.home.hitTest(p.x, p.y)) setTimeout(() => this._leave(), 100); } }
}

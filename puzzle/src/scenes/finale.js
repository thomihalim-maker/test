// Finale after level 3 (owned by the UI builder): the family celebrating under a starry sky, star fireworks,
// baby giggles, a short thank-you line; tap to return to the menu.
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { tween } from '../engine/tween.js';
import { createCharacter } from '../art/characters.js';
import { burst, warmFx } from '../art/fx.js';
import { PAL } from '../art/style.js';
import { crayonWord, makeButton, press, release, safeInset, cornerScale } from './ui.js';
import {
  makeSprite, crayonShape, circlePts, ellipsePts, roundRectPts, starPts, roundCorners, tracePath, crayonFill, pencil, nightSky, hillSprite, moonSprite, glowSprite, buntingSprite,
  Starfield, Fireflies, ShootingStar,
} from '../art/backgrounds.js';

const FW_COLS = [[PAL.yellow, '#ffe58a'], ['#f7a9b8', '#f47a92'], ['#a9c8ff', PAL.blue], ['#9fe0c0', PAL.green], ['#d2b8ff', PAL.purple], [PAL.orange, '#ffc98a']];

function rugSprite() {
  // gingham picnic blanket seen from the front; its flat-ish top edge covers the characters' body cut evenly
  return makeSprite(1040, 200, (x) => {
    x.save(); x.filter = 'blur(10px)'; x.fillStyle = 'rgba(20,30,40,0.22)'; x.beginPath(); x.ellipse(520, 150, 500, 40, 0, 0, 7); x.fill(); x.restore();
    const shape = []; // slightly wavy top, wider bottom (perspective), soft corners
    for (let i = 0; i <= 24; i++) { const t = i / 24; shape.push([70 + t * 900, 22 + Math.sin(t * Math.PI * 3) * 4]); }
    for (let i = 24; i >= 0; i--) { const t = i / 24; shape.push([20 + t * 1000, 170 + Math.sin(t * Math.PI * 4) * 5]); }
    const base = crayonShape(x, roundCorners(shape, 30, 3), '#f6b8c9', { seed: 7, lw: 3, light: '#ffd9e3', shade: '#e79ab0' });
    // gingham checks clipped to the blanket
    x.save(); tracePath(x, base); x.clip();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 22; c++) {
      if ((r + c) % 2) continue;
      const y0 = 22 + r * 25, y1 = y0 + 25, k0 = (y0 - 22) / 148, k1 = (y1 - 22) / 148;
      const xa = (k) => 70 - 50 * k, wa = (k) => 900 + 100 * k;
      const p = [[xa(k0) + c / 22 * wa(k0), y0], [xa(k0) + (c + 1) / 22 * wa(k0), y0], [xa(k1) + (c + 1) / 22 * wa(k1), y1], [xa(k1) + c / 22 * wa(k1), y1]];
      crayonFill(x, p, '#fff4f6', { seed: r * 30 + c, hatch: false, wobble: 0.6, grain: 0.35 });
    }
    x.restore();
    pencil(x, base, { w: 3, seed: 12, raw: true });
    // a few stars sewn on
    for (let i = 0; i < 6; i++) crayonShape(x, starPts(170 + i * 140, 95 + Math.sin(i * 1.9) * 22, 12, 5.5, 5, -1.57, 2), ['#f6cf3e', '#a9c8ff', '#9fe0c0'][i % 3], { seed: 30 + i, lw: 1.3, hatch: false });
  }, { key: 'finaleRug4' });
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
    this.mom = this.fam.add(await createCharacter('mom'));
    this.dad = this.fam.add(await createCharacter('dad'));
    this.baby = this.fam.add(await createCharacter('baby'));
    // picnic blanket in FRONT of the family: grounds them and hides the flat body cut-offs
    this.rug = this.fam.add(new Node({ y: 42 }).setImage(rugSprite())); // top edge 40 above the body cut
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
    this.moon.x = W - 200 - si; this.moon.y = oy + 375; this.moonGlow.x = this.moon.x; this.moonGlow.y = this.moon.y;
    for (const h of [this.hillFar, this.hillMid, this.hillNear]) { h.x = W / 2; h.y = H + 8; }
    this.hillMid.x = W / 2 - 80;
    this.flies.layout(0, H * 0.45, W, H * 0.45);
    this.bunting.x = W / 2; this.bunting.y = -6; this.bunting.sx = Math.max(1, W / 1700);
    this.title.x = W / 2; this.title.y = oy + 205;
    const fs = Math.min(1.2, Math.max(1, H / 900)); this.fam.x = W / 2; this.fam.sx = this.fam.sy = fs;
    this.fam.y = H - 20 - (v.safe?.b || 0) * 0.5 - 142 * fs; // rug bottom (local +142) stays on screen
    this.famTop = this.fam.y - 600 * 0.78 * fs;
    this.mom.x = -250; this.dad.x = 250; this.baby.x = 0; this.baby.y = -26;
    const ck = cornerScale(); this.home.baseScale = ck; this.home.x = W - 110 * ck - safeInset(v, 'r'); this.home.y = H - 110 * ck - (v.safe?.b || 0) * 0.6;
  }
  enter() {
    audio.music('finale');
    setTimeout(() => { if (game.scene === this) { audio.sfx('win'); audio.voice('Hore! Terima kasih sudah bermain!'); } }, 500);
    this.title.letters.forEach((L, i) => { L.y = -600; L.landed = false; tween(L, { y: 0 }, { dur: 0.8, delay: 0.3 + i * 0.035, ease: 'outBounce' }).then(() => { L.landed = true; }); });
    const fy = this.fam.y; this.fam.y = fy + 160; tween(this.fam, { y: fy }, { dur: 0.9, delay: 0.1, ease: 'outBack' });
    this.mom.setMood?.('happy'); this.dad.setMood?.('happy'); this.baby.setMood?.('happy');
    this.fwT = 0.4; this.t0 = game.time; this.gigT = 1.6; this.cheerT = 0.8; this.k = 0;
    setTimeout(() => {
      if (game.scene !== this) return;
      const W = this.v.w;
      burst(this.fx, 40, -20, 'confetti', { angle: Math.PI * 0.3, cone: 0.9, count: 40 });
      burst(this.fx, W - 40, -20, 'confetti', { angle: Math.PI * 0.7, cone: 0.9, count: 40 });
    }, 900);
    setTimeout(() => {
      if (game.scene !== this) return; this.canLeave = true; this.home.visible = true; this.home.sx = this.home.sy = 0;
      tween(this.home, { sx: this.home.baseScale || 1, sy: this.home.baseScale || 1 }, { dur: 0.5, ease: 'outBack' }).then(() => { this.home.ready = true; });
    }, 3200);
  }
  _launch() {
    // burst zones: above the title line, or between title and family; sides when the centre band is too thin
    const W = this.v.w, H = this.v.h, ty = this.title.y, top = [150, ty - 120], mid = [ty + 90, this.famTop - 80];
    const zones = [];
    if (top[1] - top[0] > 40) zones.push({ y: top, x: [0.12, 0.88] });
    if (mid[1] - mid[0] > 40) zones.push({ y: mid, x: [0.2, 0.8] });
    zones.push({ y: [ty + 90, Math.min(H * 0.55, ty + 300)], x: Math.random() < 0.5 ? [0.04, Math.max(0.08, 0.5 - 600 / W)] : [Math.min(0.92, 0.5 + 600 / W), 0.96] });
    const z = zones[(Math.random() * zones.length) | 0], x0 = W * (z.x[0] + Math.random() * (z.x[1] - z.x[0])), y1 = z.y[0] + Math.random() * (z.y[1] - z.y[0]);
    const col = FW_COLS[(Math.random() * FW_COLS.length) | 0];
    const r = { size: 1.0 + Math.random() * 0.4, x: x0 + (Math.random() - 0.5) * 120, y: H + 20, x1: x0, y1, t: 0, dur: 0.85 + Math.random() * 0.3, col, trail: [] };
    this.rockets.push(r);
    audio.sfx('launch', { vol: 0.5, pitch: Math.round(Math.random() * 3) });
  }
  _tick(dt, t) {
    if (!this.v) return;
    for (const L of this.title.letters) if (L.landed) { L.y = Math.sin(t * 3 - L.i * 0.45) * 8; L.rot = L.baseRot + Math.sin(t * 2 - L.i) * 0.05; }
    this.moon.rot = Math.sin(t * 0.6) * 0.08;
    this.bunting.rot = Math.sin(t * 0.9) * 0.006;
    if (this.home.ready && !this.home.held) this.home.sx = this.home.sy = (this.home.baseScale || 1) * (1 + Math.sin(t * 4) * 0.05);
    // fireworks
    this.fwT -= dt; if (this.fwT <= 0) { this.fwT = game.time - this.t0 < 4 ? 0.6 + Math.random() * 0.3 : 1.1 + Math.random() * 0.6; this._launch(); if (Math.random() < 0.25) setTimeout(() => game.scene === this && this._launch(), 280); }
    for (const r of [...this.rockets]) {
      r.t += dt; const k = Math.min(1, r.t / r.dur), e = 1 - Math.pow(1 - k, 2.2);
      r.cx = r.x + (r.x1 - r.x) * e; r.cy = r.y + (r.y1 - r.y) * e;
      r.trail.push([r.cx, r.cy]); if (r.trail.length > 28) r.trail.shift();
      if (k >= 1) {
        this.rockets.splice(this.rockets.indexOf(r), 1);
        // big even ring + inner ring, a glow flash and slow falling glitter
        const rot = Math.random() * 6.3;
        burst(this.sky2, r.cx, r.cy, 'stars', { count: 26, even: true, angle: rot, spread: 0.62 * r.size, colors: r.col, gravity: 110, life: 1.5, scale: 0.75, spinK: 0.4 });
        burst(this.sky2, r.cx, r.cy, 'stars', { count: 12, even: true, angle: rot + 0.26, spread: 0.3 * r.size, colors: [r.col[1]], gravity: 110, life: 1.3, scale: 0.55, spinK: 0.4 });
        burst(this.sky2, r.cx, r.cy, 'sparkle', { count: 22, spread: 0.7 * r.size, colors: ['#ffffff', r.col[0]], gravity: 50, life: 2.6 });
        const fl = this.sky2.add(new Node({ x: r.cx, y: r.cy, composite: 'lighter', alpha: 0.95, sx: 0.4, sy: 0.4 }).setImage(glowSprite(64, '#fff6d0')));
        fl.w = fl.h = 420 * r.size; tween(fl, { alpha: 0, sx: 1.2, sy: 1.2 }, { dur: 0.55, ease: 'outCubic' }).then(() => fl.removeSelf());
        audio.sfx('crackle', { vol: 0.7, pitch: Math.round(Math.random() * 4) });
        const core = this.sky2.add(new Node({ x: r.cx, y: r.cy, composite: 'lighter', alpha: 1, sx: 0.2, sy: 0.2 }).setImage(glowSprite(64, '#ffffff')));
        core.w = core.h = 160 * r.size; tween(core, { alpha: 0, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outQuad' }).then(() => core.removeSelf());
      }
    }
    if (!this.sky2.drawFn) this.sky2.drawFn = (ctx) => {
      const g = glowSprite(64, '#fff1b0');
      for (const r of this.rockets) {
        ctx.globalCompositeOperation = 'lighter';
        r.trail.forEach(([x, y], i) => { const a = i / r.trail.length; ctx.globalAlpha = a * a * 0.75; const s = 8 + a * 34; ctx.drawImage(g.img, x - s / 2 + Math.sin(i * 1.7) * 2, y - s / 2, s, s); });
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

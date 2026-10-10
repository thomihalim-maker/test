// Title / level select (owned by the UI builder): dusk key-art with the family on a hill, crayon title,
// big PLAY, three illustrated level cards (stars / locks), ambient life, tappable characters, sound toggle.
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { save } from '../engine/save.js';
import { tween, wait, rng } from '../engine/tween.js';
import { createCharacter, portraitSprite } from '../art/characters.js';
import { makeButton, buttonSprite, press, release, tapButton, crayonWord, safeInset } from './ui.js';
import { burst, warmFx } from '../art/fx.js';
import { PAL } from '../art/style.js';
import {
  makeSprite, crayonShape, crayonFill, pencil, scribble, circlePts, ellipsePts, roundRectPts, starPts, heartPts,
  crayonText, shade, rgba, nightSky, hillSprite, cloudSprite, moonSprite, starSprite, glowSprite,
  Starfield, Fireflies, ShootingStar, FONT,
} from '../art/backgrounds.js';

const LEVEL_COL = [PAL.orange, PAL.green, PAL.blue];

// ------------------------------------------------------------------ thumbnails (200×150)
const TW = 200, TH = 150;
function thumbBedtime(x) {
  crayonFill(x, [[0, 0], [TW, 0], [TW, TH], [0, TH]], '#3b4b8f', { seed: 1, wobble: 0, shade: '#2c3a78', light: '#5164a8', volume: false });
  // window with moon + stars
  crayonShape(x, roundRectPts(18, 14, 70, 62, 10), '#26336b', { seed: 2, lw: 2.4, lineColor: '#f3e3c3' });
  crayonShape(x, circlePts(58, 40, 14, 18), '#fff3c4', { seed: 3, lw: 1.6, hatch: false, lineColor: '#c9b47a' });
  crayonFill(x, circlePts(64, 36, 12, 18), '#26336b', { seed: 4, hatch: false, grain: 0.1 });
  for (const [sx, sy] of [[30, 26], [36, 60], [76, 64]]) crayonShape(x, starPts(sx, sy, 5, 2.4, 5, -1.57, 1), PAL.yellow, { seed: sx, lw: 1, hatch: false });
  // floor
  crayonFill(x, [[0, 116], [TW, 110], [TW, TH], [0, TH]], '#8f6fb0', { seed: 5, wobble: 0.6, volume: false });
  // crib
  const wood = '#e6b47c';
  crayonShape(x, roundRectPts(70, 70, 120, 52, 10), '#fff2e0', { seed: 6, lw: 2, hatch: false });
  crayonShape(x, ellipsePts(128, 78, 46, 16, 28), '#2f57b8', { seed: 7, lw: 2, light: '#6f9be8' }); // blanket mound (swaddle hint)
  for (const [sx, sy] of [[112, 76], [140, 72], [150, 84]]) crayonShape(x, starPts(sx, sy, 4.5, 2, 5, -1.57, 1), PAL.yellow, { seed: sx + 1, lw: 0.8, hatch: false });
  crayonShape(x, roundRectPts(78, 62, 30, 18, 8), '#fbd6e3', { seed: 8, lw: 1.8 }); // pillow
  for (let i = 0; i < 8; i++) scribble(x, [[74 + i * 16, 66], [74 + i * 16, 124]], wood, 4, { seed: 10 + i, passes: 1 });
  crayonShape(x, roundRectPts(64, 58, 132, 10, 5), wood, { seed: 20, lw: 1.8, lineColor: '#9a6a3a' });
  crayonShape(x, roundRectPts(64, 118, 132, 10, 5), wood, { seed: 21, lw: 1.8, lineColor: '#9a6a3a' });
  // zzz
  x.font = `700 20px ${FONT}`; x.fillStyle = '#cfe0ff'; x.fillText('z', 150, 44); x.font = `700 15px ${FONT}`; x.fillText('z', 166, 30);
}
function thumbBaskets(x) {
  crayonFill(x, [[0, 0], [TW, 0], [TW, TH], [0, TH]], '#fde3c8', { seed: 31, wobble: 0, shade: '#f6cfa8', volume: false });
  crayonFill(x, [[0, 104], [TW, 100], [TW, TH], [0, TH]], '#e8c08f', { seed: 32, wobble: 0.6, shade: '#d7a974', volume: false });
  const cols = [PAL.red, PAL.yellow, PAL.blue];
  cols.forEach((c, i) => {
    const bx = 36 + i * 64, by = 120;
    // toys peeking out
    crayonShape(x, circlePts(bx - 8, by - 34, 11, 16), c, { seed: 40 + i, lw: 1.6, light: shade(c, 0.4) });
    crayonShape(x, roundRectPts(bx, by - 46, 18, 18, 3), c, { seed: 50 + i, lw: 1.6 });
    crayonShape(x, [[bx - 26, by - 28], [bx + 26, by - 28], [bx + 19, by + 14], [bx - 19, by + 14]], c, { seed: 60 + i, lw: 2, light: shade(c, 0.3), shade: shade(c, -0.2) });
    for (let k = 0; k < 3; k++) scribble(x, [[bx - 23 + k * 2, by - 16 + k * 10], [bx + 23 - k * 2, by - 16 + k * 10]], shade(c, -0.3), 1.6, { seed: 70 + k, passes: 1 });
  });
  // a duck
  crayonShape(x, ellipsePts(172, 72, 14, 10, 20), PAL.yellow, { seed: 80, lw: 1.6 });
  crayonShape(x, circlePts(182, 60, 7, 14), PAL.yellow, { seed: 81, lw: 1.6 });
  crayonFill(x, [[188, 59], [196, 61], [188, 63]], PAL.orange, { seed: 82, hatch: false, wobble: 0 });
  x.fillStyle = PAL.lineDark; x.beginPath(); x.arc(184, 58, 1.5, 0, 7); x.fill();
}
function thumbPhoto(x, portrait) {
  crayonFill(x, [[0, 0], [TW, 0], [TW, TH], [0, TH]], '#cfeedd', { seed: 91, wobble: 0, shade: '#b4e0c8', volume: false });
  // frame
  crayonShape(x, roundRectPts(24, 14, 152, 116, 8), '#d9a066', { seed: 92, lw: 2.4, lineColor: '#8a5a2e', light: '#f0c08a' });
  const ix = 36, iy = 26, iw = 128, ih = 92;
  if (portrait) x.drawImage(portrait.img, ix, iy, iw, ih); else crayonFill(x, roundRectPts(ix, iy, iw, ih, 2), '#fde9d6', { seed: 93 });
  // jigsaw seams
  x.save(); x.strokeStyle = 'rgba(90,80,70,0.55)'; x.lineWidth = 1.6; x.setLineDash([4, 3]);
  x.beginPath(); x.moveTo(ix + iw / 3, iy); x.lineTo(ix + iw / 3, iy + ih); x.moveTo(ix + iw * 2 / 3, iy); x.lineTo(ix + iw * 2 / 3, iy + ih); x.moveTo(ix, iy + ih / 2); x.lineTo(ix + iw, iy + ih / 2); x.stroke(); x.restore();
  // missing piece hole + lifted piece
  crayonFill(x, roundRectPts(ix + iw * 2 / 3, iy + ih / 2, iw / 3, ih / 2, 3), '#efe2cf', { seed: 94, hatch: false });
  x.save(); x.translate(168, 112); x.rotate(0.2);
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(-19, -13, 44, 32);
  if (portrait) x.drawImage(portrait.img, portrait.img.width * 2 / 3, portrait.img.height / 2, portrait.img.width / 3, portrait.img.height / 2, -22, -16, iw / 3, ih / 2);
  x.strokeStyle = PAL.line; x.lineWidth = 2; x.strokeRect(-22, -16, iw / 3, ih / 2);
  x.restore();
}

function cardSprite(level, locked, portrait) {
  const W = 236, H = 282;
  return makeSprite(W + 20, H + 26, (x) => {
    x.save(); x.filter = 'blur(7px)'; x.fillStyle = 'rgba(25,20,60,0.35)'; x.beginPath(); x.roundRect(16, 22, W - 8, H, 30); x.fill(); x.restore();
    crayonShape(x, roundRectPts(10, 8, W, H, 30), '#fff8ec', { seed: 100 + level, lw: 3.2, shade: '#efdfc6', light: '#ffffff', hatchStep: 9 });
    // thumbnail
    x.save(); x.translate(10 + (W - TW) / 2, 26);
    x.save(); x.beginPath(); x.roundRect(0, 0, TW, TH, 18); x.clip();
    [thumbBedtime, thumbBaskets, thumbPhoto][level - 1](x, portrait);
    if (locked) { x.fillStyle = 'rgba(236,230,248,0.62)'; x.fillRect(0, 0, TW, TH); }
    x.restore();
    pencil(x, roundRectPts(0, 0, TW, TH, 18), { w: 3, seed: 7 + level });
    x.restore();
    // colour tab at the bottom
    crayonShape(x, roundRectPts(22, 196, W - 24, 80, 22), locked ? '#d9d2c8' : shade(LEVEL_COL[level - 1], 0.45), { seed: 120 + level, lw: 2.4 });
  }, { key: `levelcard|${level}|${locked}|${!!portrait}` });
}

function houseSprite() {
  return makeSprite(260, 240, (x) => {
    crayonShape(x, [[30, 110], [230, 110], [230, 232], [30, 232]], '#f6dcc0', { seed: 1, lw: 3, shade: '#e8c39c' });
    crayonShape(x, [[10, 118], [130, 22], [250, 118]], '#e8846a', { seed: 2, lw: 3, shade: '#c9604a' });
    crayonShape(x, [[178, 40], [204, 40], [204, 88], [178, 70]], '#b77a5a', { seed: 3, lw: 2.4 });
    // warm lit windows
    for (const [wx, wy] of [[52, 132], [160, 132]]) {
      x.save(); x.filter = 'blur(10px)'; x.fillStyle = 'rgba(255,214,120,0.7)'; x.fillRect(wx - 8, wy - 8, 64, 60); x.restore();
      crayonShape(x, roundRectPts(wx, wy, 48, 44, 6), '#ffd877', { seed: wx, lw: 2.4, light: '#fff3c0' });
      scribble(x, [[wx + 24, wy + 2], [wx + 24, wy + 42]], '#c9935a', 2.6, { seed: wx + 1, passes: 1 });
      scribble(x, [[wx + 2, wy + 22], [wx + 46, wy + 22]], '#c9935a', 2.6, { seed: wx + 2, passes: 1 });
    }
    crayonShape(x, roundRectPts(108, 160, 42, 72, 18), '#9a6b4f', { seed: 9, lw: 2.4 });
    x.fillStyle = '#ffd877'; x.beginPath(); x.arc(140, 198, 3.5, 0, 7); x.fill();
  }, { key: 'menuHouse' });
}
function treeSprite(seed = 1) {
  return makeSprite(220, 340, (x) => {
    crayonShape(x, [[96, 200], [124, 200], [130, 336], [90, 336]], '#a77a58', { seed, lw: 2.6 });
    const c = [[110, 120, 80], [70, 160, 56], [150, 160, 58], [110, 70, 60]];
    for (const [cx, cy, r] of c) crayonShape(x, circlePts(cx, cy, r, 26), '#4f9a7c', { seed: seed + cx, lw: 2.6, light: '#73c09c', shade: '#3c7f64' });
    for (let i = 0; i < 5; i++) crayonShape(x, circlePts(60 + i * 26, 90 + (i % 2) * 70, 6, 10), '#f7a9b8', { seed: i, lw: 1.2, hatch: false });
  }, { key: 'menuTree' + seed });
}
function cushionSprite() {
  return makeSprite(300, 90, (x) => {
    x.save(); x.filter = 'blur(6px)'; x.fillStyle = 'rgba(30,40,40,0.25)'; x.beginPath(); x.ellipse(150, 64, 130, 16, 0, 0, 7); x.fill(); x.restore();
    crayonShape(x, ellipsePts(150, 46, 128, 30, 40), '#f6c3d6', { seed: 3, lw: 3, light: '#ffe0eb', shade: '#e39fbb' });
    for (let i = 0; i < 7; i++) crayonShape(x, circlePts(50 + i * 33, 44 + Math.sin(i) * 8, 5, 10), '#ffffff', { seed: i, lw: 1, hatch: false, line: false });
  }, { key: 'menuCushion' });
}

// ------------------------------------------------------------------ scene
export default class MenuScene {
  constructor() { this.root = new Node(); this.cards = []; this.pressed = null; }

  async load() {
    try { await Promise.race([document.fonts.load(`700 80px Fredoka`), new Promise(r => setTimeout(r, 1200))]); } catch (_) {}
    warmFx();
    const R = this.root;
    this.sky = R.add(new Node({ ax: 0, ay: 0 }).setImage(nightSky()));
    this.stars = R.add(new Starfield({ density: 1.1 }));
    this.shoot = R.add(new ShootingStar());
    this.moonGlow = R.add(new Node({ composite: 'lighter', alpha: 0.5 }).setImage(glowSprite(64, '#fff2c0'))); this.moonGlow.w = this.moonGlow.h = 420;
    this.moon = R.add(new Node({ interactive: true, hitPad: 10 }).setImage(moonSprite(84)));
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = R.add(new Node({ alpha: 0.85 }).setImage(cloudSprite(i + 1, 240 + (i % 3) * 50, 120 + (i % 2) * 16, i % 2 ? '#fff4ea' : '#f4e8f6')));
      c.speed = 7 + i * 3; c.fy = [0.3, 0.42, 0.22, 0.5][i]; this.clouds.push(c);
    }
    this.hillFar = R.add(new Node({ ax: 0.5, ay: 1 }).setImage(hillSprite(2300, 380, '#7d86c2', 3, { base: 150, amp: 80, freq: 1.2, line: '#5a5f99' })));
    this.house = R.add(new Node({ ax: 0.5, ay: 1, sx: 0.8, sy: 0.8, interactive: true }).setImage(houseSprite()));
    this.tree = R.add(new Node({ ax: 0.5, ay: 1, sx: 0.9, sy: 0.9 }).setImage(treeSprite(2)));
    this.hillMid = R.add(new Node({ ax: 0.5, ay: 1 }).setImage(hillSprite(2300, 300, '#6fae8e', 5, { base: 110, amp: 60, freq: 0.9, line: '#4c8a6c' })));
    this.flies = R.add(new Fireflies(16, 4));
    this.hillNear = R.add(new Node({ ax: 0.5, ay: 1 }).setImage(hillSprite(2300, 230, '#8ccf8f', 8, { base: 70, amp: 34, freq: 0.7, tufts: 60, line: '#5c9e66' })));

    // family
    this.fam = R.add(new Node());
    this.cushion = this.fam.add(new Node().setImage(cushionSprite()));
    this.mom = this.fam.add(await createCharacter('mom'));
    this.dad = this.fam.add(await createCharacter('dad'));
    this.baby = this.fam.add(await createCharacter('baby'));
    this.mom.sx = this.mom.sy = 0.76; this.dad.sx = this.dad.sy = 0.76; this.baby.sx = this.baby.sy = 0.92;

    // level cards
    let portrait = null; try { portrait = await portraitSprite(390, 280); } catch (_) {}
    this.cardLayer = R.add(new Node());
    for (let i = 1; i <= 3; i++) {
      const locked = !save.unlocked(i);
      const c = this.cardLayer.add(new Node({ interactive: true, hitPad: 6 }).setImage(cardSprite(i, locked, portrait)));
      c.level = i; c.locked = locked; c.ph = i * 1.7;
      // number badge
      const badge = c.add(new Node({ x: -76, y: 84 }).setImage(makeSprite(70, 70, x => {
        crayonShape(x, circlePts(35, 35, 28), locked ? '#bdb5aa' : LEVEL_COL[i - 1], { seed: i, lw: 2.6 });
        x.font = `700 38px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(60,50,50,0.7)'; x.lineWidth = 5; x.strokeText(String(i), 35, 37); x.fillText(String(i), 35, 37);
      }, { key: `badge${i}${locked}` })));
      const got = save.stars[i] || 0; c.starNodes = [];
      for (let k = 0; k < 3; k++) {
        const s = c.add(new Node({ x: -16 + k * 40, y: 84 - (k === 1 ? 6 : 0), rot: (k - 1) * 0.15 }).setImage(k < got ? starSprite(42, PAL.yellow) : starSprite(42, '#efe4d0', { line: '#bba98c' })));
        c.starNodes.push(s);
      }
      if (locked) { c.lock = c.add(new Node({ y: -50 }).setImage(buttonSprite('lock', 92, '#9d93c4'))); c.lock.ay = 0.46; }
      this.cards.push(c);
    }

    // big PLAY
    this.playGlow = R.add(new Node({ composite: 'lighter', alpha: 0.55 }).setImage(glowSprite(64, '#ffe9a8'))); this.playGlow.w = this.playGlow.h = 420;
    this.ring = R.add(new Node({ drawFn: (ctx) => this._ring(ctx) }));
    this.play = R.add(await makeButton({ icon: 'play', size: 200, color: PAL.orange }, () => game.go('level' + this._nextLevel())));
    this.ringStar = starSprite(30, PAL.yellow);

    // title
    this.title = R.add(crayonWord('Bintang Kecil', 132, ['#ffe27a', '#ffb3c7', '#9fe0c0', '#a9c8ff', '#ffc98a', '#d2b8ff', '#ffe27a'], { line: '#3c3466', halo: 0.75, track: 4 }));
    this.title.interactive = false;
    this.titleStar = this.title.add(new Node({ sx: 0.8, sy: 0.8 }).setImage(starSprite(54, PAL.yellow)));

    // sound toggle
    this.sound = R.add(await makeButton({ icon: audio.muted ? 'mute' : 'sound', size: 104, color: PAL.purple }, () => {
      audio.setMuted(!audio.muted); this.sound.setIcon(audio.muted ? 'mute' : 'sound'); if (!audio.muted) audio.sfx('pop');
    }));
    this.fx = R.add(new Node({ z: 100 }));

    game.onUpdate((dt, t) => this._tick(dt, t));
  }

  _nextLevel() { for (let i = 1; i <= 3; i++) if (save.unlocked(i) && !save.stars[i]) return i; return 1; }

  layout(v) {
    this.v = v;
    const W = v.w, H = v.h, oy = (H - 900) / 2, si = safeInset(v);
    this.sky.w = Math.max(W, H * 1.7) + 4; this.sky.h = H + 4; this.sky.x = -2; this.sky.y = -2;
    this.stars.layout(W, H * 0.62); this.shoot.area = { w: W, h: H * 0.5 };
    this.moon.x = W - 250 - si; this.moon.y = 150 + oy * 0.5; this.moonGlow.x = this.moon.x; this.moonGlow.y = this.moon.y;
    this.clouds.forEach((c, i) => { c.x = c.x || (W * (i + 0.5) / this.clouds.length); c.y = H * c.fy + oy * 0.3 + (i === 0 ? 40 : 0); });
    this.hillFar.x = W / 2; this.hillFar.y = H + 6;
    this.hillMid.x = W / 2 + 60; this.hillMid.y = H + 6;
    this.hillNear.x = W / 2; this.hillNear.y = H + 8;
    this.house.x = W * 0.475; this.house.y = H - 214; this.house.visible = W > 1800;
    this.tree.x = W - 90; this.tree.y = H - 180;
    this.flies.layout(0, H * 0.45, W, H * 0.45);
    // family cluster
    const fx = W * 0.265, fy = H - 34;
    this.fam.x = fx; this.fam.y = fy;
    this.mom.x = -175; this.mom.y = 0; this.dad.x = 175; this.dad.y = 2;
    this.baby.x = 0; this.baby.y = 6; this.cushion.x = 0; this.cushion.y = -6;
    // right column
    const cx = W * 0.705;
    this.play.x = cx; this.play.y = oy + 372; this.playGlow.x = cx; this.playGlow.y = this.play.y;
    this.cards.forEach((c, i) => { c.bx = cx + (i - 1) * 258; c.by = oy + 690; c.x = c.bx; c.y = c.by; c.baseRot = (i - 1) * 0.035; c.rot = c.baseRot; });
    this.title.x = W / 2; this.title.y = oy + 124;
    const last = this.title.letters[this.title.letters.length - 1];
    this.titleStar.x = last.baseX + 4; this.titleStar.y = -86; this.titleStar.bx = this.titleStar.x;
    this.sound.x = W - 86 - si; this.sound.y = 82;
  }

  enter() {
    audio.music('menu');
    // intro: title letters drop in, family rises, cards + play pop
    this.title.letters.forEach((L, i) => { L.y = -500; L.dropped = false; tween(L, { y: 0 }, { dur: 0.7, delay: 0.15 + i * 0.05, ease: 'outBounce' }).then(() => { L.dropped = true; }); });
    this.titleStar.sx = this.titleStar.sy = 0; tween(this.titleStar, { sx: 0.8, sy: 0.8 }, { dur: 0.6, delay: 1.0, ease: 'outBack' });
    const fy = this.fam.y; this.fam.y = fy + 120; tween(this.fam, { y: fy }, { dur: 0.8, delay: 0.1, ease: 'outBack' });
    this.play.sx = this.play.sy = 0; tween(this.play, { sx: 1, sy: 1 }, { dur: 0.6, delay: 0.55, ease: 'outBack' }).then(() => { this.play.ready = true; });
    this.cards.forEach((c, i) => { c.sx = c.sy = 0; tween(c, { sx: 1, sy: 1 }, { dur: 0.55, delay: 0.7 + i * 0.1, ease: 'outBack' }).then(() => { c.ready = true; }); });
    this.sound.sx = this.sound.sy = 0; tween(this.sound, { sx: 1, sy: 1 }, { dur: 0.5, delay: 0.9, ease: 'outBack' });
    this.mom.lookAt?.(this.baby.toWorld(0, -120).x, this.baby.toWorld(0, -120).y);
    this.dad.lookAt?.(this.baby.toWorld(0, -120).x, this.baby.toWorld(0, -120).y);
    this.idleT = 3;
    // celebrate a fresh unlock (came back from a level that unlocked the next one)
    const fresh = this.cards.find(c => !c.locked && c.level > 1 && !save.stars[c.level] && save.stars[c.level - 1]);
    if (fresh) setTimeout(() => { if (game.scene === this) { burst(this.fx, fresh.x, fresh.y - 60, 'sparkle', { count: 18 }); audio.sfx('unlock'); } }, 1300);
  }

  _ring(ctx) {
    if (!this.play) return;
    const t = game.time, n = 8, R = 138, s = this.play.sx;
    if (s < 0.05) return;
    for (let i = 0; i < n; i++) {
      const a = t * 0.6 + (i / n) * Math.PI * 2, x = this.play.x + Math.cos(a) * R * s, y = this.play.y + Math.sin(a) * R * s;
      const k = 0.55 + 0.45 * Math.sin(t * 3 + i), sz = 30 * k * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.globalAlpha = 0.85 * k;
      ctx.drawImage(this.ringStar.img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
  }

  _tick(dt, t) {
    const v = this.v || game.view;
    for (const c of this.clouds) { c.x += c.speed * dt; if (c.x - c.w / 2 > v.w + 40) c.x = -c.w / 2 - 40; }
    for (const L of this.title.letters) if (L.dropped) { L.y = Math.sin(t * 2.4 - L.i * 0.55) * 7 + (L.hop || 0); L.rot = L.baseRot + Math.sin(t * 1.7 - L.i) * 0.04; }
    this.titleStar.rot = Math.sin(t * 2) * 0.3; this.titleStar.y = -86 + Math.sin(t * 3) * 6;
    if (this.play.ready && !this.play.held) { const s = 1 + Math.sin(t * 3.2) * 0.045; this.play.sx = s; this.play.sy = 1 + Math.sin(t * 3.2 + 0.6) * 0.045; }
    this.playGlow.alpha = 0.4 + Math.sin(t * 3.2) * 0.15;
    this.moonGlow.alpha = 0.45 + Math.sin(t * 0.8) * 0.1; this.moon.rot = Math.sin(t * 0.5) * 0.06;
    for (const c of this.cards) if (c.ready && !c.held) { c.y = c.by + Math.sin(t * 1.6 + c.ph) * 5; c.rot = c.baseRot + Math.sin(t * 1.1 + c.ph) * 0.012; }
    // idle family life
    this.idleT -= dt;
    if (this.idleT <= 0) {
      this.idleT = 4 + Math.random() * 4;
      const r = Math.random();
      if (r < 0.33) this.mom.react?.('happy', 1.4);
      else if (r < 0.66) this.dad.react?.('happy', 1.4);
      else { this.baby.react?.('happy', 1.2); burst(this.fx, this.fam.x + this.baby.x, this.fam.y - 200, 'hearts', { count: 3, scale: 0.7 }); }
    }
  }

  _hitChar(p) {
    for (const ch of [this.baby, this.mom, this.dad]) if (ch && ch.hitTest(p.x, p.y)) return ch;
    return null;
  }

  pointerDown(p) {
    const btn = [this.sound, this.play].find(b => b.hitTest(p.x, p.y) && b.sx > 0.5);
    if (btn) { this.pressed = btn; btn.held = true; press(btn); return; }
    const card = [...this.cards].reverse().find(c => c.ready && c.hitTest(p.x, p.y));
    if (card) {
      if (card.locked) {
        audio.sfx('wrong'); card.held = true;
        tween(card, { rot: card.baseRot + 0.08 }, { dur: 0.06 }).then(() => tween(card, { rot: card.baseRot - 0.06 }, { dur: 0.08 })).then(() => tween(card, { rot: card.baseRot }, { dur: 0.4, ease: 'outElastic' })).then(() => { card.held = false; });
        if (card.lock) { card.lock.sx = card.lock.sy = 1.25; tween(card.lock, { sx: 1, sy: 1 }, { dur: 0.5, ease: 'outElastic' }); }
        this.mom.react?.('think', 1.2);
        return;
      }
      this.pressed = card; card.held = true; press(card); return;
    }
    const ch = this._hitChar(p);
    if (ch) {
      const top = ch.toWorld(0, -ch.h * 0.85);
      if (ch === this.baby) { ch.react?.('happy', 1.6); audio.sfx('giggle'); burst(this.fx, top.x, top.y, 'hearts', { count: 6 }); this.mom.react?.('happy', 1.2); this.dad.react?.('happy', 1.2); }
      else if (ch === this.mom) { ch.react?.('cheer', 1.4); audio.sfx('pop'); burst(this.fx, top.x, top.y, 'hearts', { count: 5 }); }
      else { ch.react?.('cheer', 1.4); audio.sfx('cheer'); burst(this.fx, top.x, top.y, 'stars', { count: 7, scale: 0.8 }); }
      ch.lookAt?.(p.x, p.y); setTimeout(() => { if (game.scene === this) ch.lookAt?.(this.baby.toWorld(0, -120).x, this.baby.toWorld(0, -120).y); }, 1500);
      return;
    }
    if (this.moon.hitTest(p.x, p.y)) { audio.sfx('sparkle'); burst(this.fx, this.moon.x, this.moon.y, 'sparkle', { count: 16 }); this.moon.sx = this.moon.sy = 1.15; tween(this.moon, { sx: 1, sy: 1 }, { dur: 0.6, ease: 'outElastic' }); return; }
    if (Math.abs(p.y - this.title.y) < 90 && Math.abs(p.x - this.title.x) < this.title.width / 2 + 40) {
      audio.sfx('sparkle');
      this.title.letters.forEach((L, i) => { const o = { v: 0 }; tween(o, { v: 1 }, { dur: 0.5, delay: i * 0.04, onUpdate: (e, k) => { L.hop = -Math.sin(k * Math.PI) * 40; } }); });
      burst(this.fx, p.x, p.y, 'sparkle', { count: 12 });
      return;
    }
    // tap on the sky: a little twinkle
    burst(this.fx, p.x, p.y, p.y < game.view.h * 0.55 ? 'stars' : 'sparkle', { count: 6, scale: 0.7, spread: 0.6 });
    audio.sfx('sparkle', { vol: 0.6 });
  }

  pointerUp(p) {
    const b = this.pressed; if (!b) return; this.pressed = null; b.held = false; release(b);
    if (!b.hitTest(p.x, p.y)) return;
    if (b === this.sound) { b.onTap(); return; }
    if (b === this.play) { audio.sfx('whoosh'); burst(this.fx, b.x, b.y, 'sparkle', { count: 18 }); setTimeout(() => b.onTap(), 120); return; }
    if (b.level) { audio.sfx('whoosh'); burst(this.fx, b.x, b.y - 40, 'stars', { count: 8, scale: 0.8 }); setTimeout(() => game.go('level' + b.level), 140); }
  }
}

// Level 2 "Warna-warni" (colour sort). Ayah tidies baby Bintang's toys: drag each toy into the basket
// of the same colour. Sunny living-room play corner. Owned by the level-2 builder. See CONTRACT.md.
import { Node } from '../engine/node.js';
import { tween, wait, Ease, killTweensOf, clamp, lerp } from '../engine/tween.js';
import { createCharacter } from '../art/characters.js';
import { burst } from '../art/fx.js';
import { LevelScene, game, audio } from './base.js';
import {
  loadLevel2Art, COLS, TOY_W, TOY_H, TOY_BASE, BASKET_W, BASKET_H, BASKET_BASE, BASKET_RIM,
  BOUNCER_W, BOUNCER_H, BOUNCER_BASE, GARDEN, BEAM, CURTAIN_W, RUG_W, RUG_H, HAND_W, HAND_H, HAND_TIP, WINDOW,
} from '../art/props_level2.js';

// Stage space: the important 1600x900 area is x 0..1600, y 0..900 (centred in the view).
const BASKETS = [{ col: 'red', x: 610 }, { col: 'yellow', x: 895 }, { col: 'blue', x: 1180 }];
const BASKET_Y = 640;
const TOYS = [
  { type: 'ball', col: 'red', x: 455, y: 792, rot: -0.12 },
  { type: 'duck', col: 'yellow', x: 585, y: 870, rot: 0.06 },
  { type: 'car', col: 'blue', x: 718, y: 786, rot: -0.07 },
  { type: 'block', col: 'red', x: 850, y: 866, rot: 0.13 },
  { type: 'rings', col: 'yellow', x: 975, y: 788, rot: 0.02 },
  { type: 'duck', col: 'blue', x: 1105, y: 870, rot: -0.07 },
  { type: 'car', col: 'red', x: 1240, y: 790, rot: 0.06 },
  { type: 'ball', col: 'yellow', x: 1372, y: 866, rot: 0.1 },
  { type: 'block', col: 'blue', x: 1500, y: 796, rot: -0.12 },
];
// toy resting slots inside a basket (basket-local; origin = basket bottom centre)
const SLOTS = [{ x: -64, y: -122, r: -0.22 }, { x: 62, y: -120, r: 0.2 }, { x: 0, y: -110, r: 0.03 }];
const SLOT_S = 0.84;
const DAD = { x: 165, y: 924, s: 0.95 };
const BOUNCER = { x: 1452, y: 664 };
const PRAISE = ['Pintar!', 'Hebat!', 'Bagus sekali!', 'Hore!'];

const spr = (sp, o = {}) => new Node(o).setImage(sp);

export default class Level2 extends LevelScene {
  static level = 2;
  static title = 'Warna-warni';

  async load() {
    await super.load();
    const [art, dad, baby] = await Promise.all([loadLevel2Art(TOYS), createCharacter('dad'), createCharacter('baby')]);
    this.art = art; this.dad = dad; this.baby = baby;
    const S = this.stage = this.world.add(new Node());

    // --- garden seen through the window (behind the wall, which has a hole) ---
    const G = S.add(new Node());
    G.add(spr(art.garden, { x: GARDEN.x, y: GARDEN.y, ax: 0, ay: 0 }));
    this.clouds = [
      G.add(spr(art.cloud1, { x: 520, y: 128, sx: 0.8, sy: 0.8 })),
      G.add(spr(art.cloud2, { x: 860, y: 196, sx: 0.55, sy: 0.55, alpha: 0.9 })),
    ];
    this.crown = G.add(spr(art.crown, { x: 502, y: 246, ax: 0.5, ay: 226 / 240, sx: 0.78, sy: 0.78 }));
    this.butterfly = G.add(new Node({ drawFn: (c, n) => drawButterfly(c, n) }));
    this.butterfly.t = 0;

    // --- room shell ---
    S.add(spr(art.wall, { x: -400, y: -200, ax: 0, ay: 0 }));
    S.add(spr(art.floor, { x: -400, y: 520, ax: 0, ay: 0 }));
    this.curtains = [
      S.add(spr(art.curtain, { x: 300, y: 50, ax: 0, ay: 0 })),
      S.add(spr(art.curtain, { x: 1120, y: 50, ax: 0, ay: 0, sx: -1 })),
    ];
    S.add(spr(art.lamp, { x: -250, y: 612, ax: 0.5, ay: 610 / 620 }));
    S.add(spr(art.shelf, { x: 1310, y: 568, ax: 0.5, ay: 332 / 340 }));
    S.add(spr(art.chest, { x: 1850, y: 700, ax: 0.5, ay: 228 / 240 }));
    this.leaves = S.add(spr(art.leaves, { x: 1600, y: 500, ax: 0.5, ay: 350 / 360, sx: 0.85, sy: 0.85 }));
    S.add(spr(art.pot, { x: 1600, y: 596, ax: 0.5, ay: 1, sx: 0.9, sy: 0.9 }));
    S.add(spr(art.rug, { x: 900, y: 792, ax: 0.5, ay: 0.5 - 5 / RUG_H }));
    this.beam = S.add(spr(art.beam, { x: BEAM.x, y: BEAM.y, ax: 0, ay: 0, alpha: 0.75 }));

    // --- characters' shadows, baskets, characters ---
    const shadows = S.add(new Node());
    this.baskets = BASKETS.map(b => {
      const n = S.add(new Node({ x: b.x, y: BASKET_Y }));
      n.col = b.col; n.items = []; n.hover = 0; n.base = { x: b.x, y: BASKET_Y };
      n.back = n.add(spr(art.baskets[b.col].back, { ax: 0.5, ay: BASKET_BASE / BASKET_H }));
      n.inner = n.add(new Node());
      n.front = n.add(spr(art.baskets[b.col].front, { ax: 0.5, ay: BASKET_BASE / BASKET_H }));
      return n;
    });
    dad.x = DAD.x; dad.y = DAD.y; dad.sx = dad.sy = DAD.s;
    S.add(dad);
    // baby in a bouncer (squash & stretch group anchored at the floor)
    const bo = this.bouncer = S.add(new Node({ x: BOUNCER.x, y: BOUNCER.y }));
    bo.add(spr(art.bouncerBack, { ax: 0.5, ay: BOUNCER_BASE / BOUNCER_H }));
    baby.x = 0; baby.y = -92; baby.sx = baby.sy = 0.66;
    bo.add(baby);
    bo.add(spr(art.bouncerFront, { ax: 0.5, ay: BOUNCER_BASE / BOUNCER_H }));
    this.spring = { y: 0, v: 0 };

    // tap targets for the characters (delight, not required to play)
    this.dadHit = S.add(new Node({ x: DAD.x, y: DAD.y - 260, w: 300, h: 520, interactive: true, alpha: 1 }));
    this.babyHit = S.add(new Node({ x: BOUNCER.x, y: BOUNCER.y - 150, w: 260, h: 260, interactive: true }));

    // --- toys ---
    this.toyLayer = S.add(new Node());
    this.toys = TOYS.map((t, i) => {
      const n = new Node({ x: t.x, y: t.y, rot: t.rot, w: TOY_W, h: TOY_H, ax: 0.5, ay: TOY_BASE / TOY_H, hitPad: 14, interactive: true, draggable: true });
      n.type = t.type; n.col = t.col; n.idx = i; n.placed = false;
      n.home = { x: t.x, y: t.y, rot: t.rot, sx: 1, sy: 1 };
      n.shadow = n.add(spr(art.shadow, { y: 0, sx: 0.75, sy: 0.75, alpha: 0.85 }));
      n.glow = n.add(new Node({ alpha: 0, drawFn: drawGlow }));
      n.art = n.add(spr(art.toys[`${t.type}-${t.col}`], { ax: 0.5, ay: TOY_BASE / TOY_H }));
      n.tilt = 0; n.shake = null;
      return n;
    });
    // back-to-front order
    [...this.toys].sort((a, b) => a.y - b.y).forEach(n => this.toyLayer.add(n));

    this.motes = S.add(new Node({ drawFn: c => this.drawMotes(c) }));
    this.initMotes();
    this.fxLayer = S.add(new Node());
    this.hintLayer = S.add(new Node());
    this.ghost = this.hintLayer.add(new Node({ alpha: 0, ax: 0.5, ay: TOY_BASE / TOY_H }));
    this.hand = this.hintLayer.add(spr(art.hand, { alpha: 0, ax: HAND_TIP[0] / HAND_W, ay: HAND_TIP[1] / HAND_H, rot: -0.35 }));

    this.drag.enabled = false;
    this.lastInput = 0;
    this.dragging = null;
    this.prevPt = null; this.vel = { x: 0, y: 0 };
  }

  onLayout(v) {
    this.stage.x = Math.round((v.w - 1600) / 2);
    this.stage.y = Math.round((v.h - 900) / 2);
    // Ayah is a bust: keep his waist below the bottom edge of the screen whatever the aspect ratio
    this.dad.y = v.h - this.stage.y + 24;
    this.dadHit.y = this.dad.y - 300;
  }

  // ---------------------------------------------------------------- intro choreography
  enter() {
    audio.music('level');
    this.intro();
  }

  async intro() {
    const t0 = game.time;
    // toys and baskets start hidden
    for (const n of this.toys) { n.y = n.home.y - 1100 - n.idx * 40; n.rot = (n.idx % 2 ? 1 : -1) * 2.2; n.shadow.alpha = 0; }
    for (const b of this.baskets) { b.sx = b.sy = 0.01; }
    await wait(0.35);
    // Ayah greets and asks for help
    this.dad.react('happy', 2.2);
    this.dad.talk(2.6);
    audio.voice('Ayo bantu Ayah merapikan mainan!');
    // baskets pop in
    this.baskets.forEach((b, i) => {
      tween(b, { sx: 1, sy: 1 }, { dur: 0.55, delay: 0.15 + i * 0.16, ease: 'outBack' }).then(() => {
        if (this.finished) return;
        audio.sfx('pop'); burst(this.fxLayer, b.x, b.y - 75, 'sparkle', { count: 8, scale: 0.8, colors: [COLS[b.col].c, '#fff6c8'] });
      });
    });
    await wait(0.75);
    // toys tumble in from above, bounce and settle
    const order = [...this.toys].sort((a, b) => Math.abs(a.home.x - 800) - Math.abs(b.home.x - 800));
    order.forEach((n, i) => {
      const d = 0.07 * i;
      tween(n, { y: n.home.y }, { dur: 0.75, delay: d, ease: 'outBounce' });
      tween(n, { rot: n.home.rot }, { dur: 0.8, delay: d, ease: 'outCubic' });
      tween(n.shadow, { alpha: 0.85 }, { dur: 0.5, delay: d + 0.2 });
      wait(d + 0.27).then(() => { if (n.placed) return; audio.sfx('drop', { volume: 0.5 }); burst(this.fxLayer, n.x, n.y - 4, 'dust', { count: 5, scale: 0.6 }); });
    });
    this.baby.react('happy', 1.5);
    await wait(0.07 * order.length + 0.6);
    this.dad.lookAt(null);
    if (!this.finished && !this.celebrating) this.drag.enabled = true;
    this.lastInput = game.time;
    this.introT = game.time - t0;
  }

  // ---------------------------------------------------------------- input
  pointerDown(p) {
    this.lastInput = game.time;
    this.cancelHint();
    super.pointerDown(p);
  }

  onTap(n) {
    if (n === this.dadHit) { this.dad.react('happy', 1.2); this.dad.talk(0.8); audio.sfx('pop'); return; }
    if (n === this.babyHit) this.babyJoy(0.7);
  }

  onPick(n) {
    if (!n.art) return;
    this.dragging = n; this.prevPt = { x: n.x, y: n.y }; this.vel = { x: 0, y: 0 };
    audio.sfx('pick');
    killTweensOf(n.art);
    tween(n.art, { y: -38, sx: 1.12, sy: 1.12 }, { dur: 0.22, ease: 'outBack', tag: 'lift' });
    tween(n, { rot: 0 }, { dur: 0.25, ease: 'outQuad', tag: 'drag' });
    const w = n.toWorld(0, -80);
    this.dad.lookAt(w.x, w.y);
  }

  onMove(n) { this.lastInput = game.time; }

  onDrop(n, p, moved) {
    if (!n.art) return false;
    this.dragging = null;
    this.lastInput = game.time;
    for (const b of this.baskets) b.hover = 0;
    if (!moved) { // a tap on a toy: little hop and say its colour
      this.lower(n);
      tween(n.art, { y: -50 }, { dur: 0.16, ease: 'outQuad' }).then(() => tween(n.art, { y: 0 }, { dur: 0.35, ease: 'outBounce' }));
      audio.sfx('tap'); audio.voice(cap(COLS[n.col].name));
      this.dad.lookAt(null);
      n.x = n.home.x; n.y = n.home.y;
      tween(n, { rot: n.home.rot }, { dur: 0.3, tag: 'drag' });
      return true;
    }
    const b = this.basketAt(n);
    if (b && b.col === n.col) { this.placeToy(n, b); return true; }
    if (b) { this.wrongDrop(n, b); return true; }
    // dropped on the floor: glide back home
    this.lower(n);
    this.dad.lookAt(null);
    audio.sfx('whoosh', { volume: 0.4 });
    this.drag.returnHome(n, 0.5).then(() => this.land(n, 0.5));
    return true;
  }

  /** Nearest basket whose generous mouth region contains the toy (magnetic snap). */
  basketAt(n) {
    const cx = n.x, cy = n.y - 70 + n.art.y;
    let best = null, bd = 1;
    for (const b of this.baskets) {
      const mx = b.x, my = b.y - (BASKET_BASE - BASKET_RIM) + 10;
      const dx = (cx - mx) / 205, dy = (cy - my) / (cy < my ? 190 : 170);
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  lower(n) {
    killTweensOf(n.art, 'lift');
    tween(n.art, { y: 0, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outQuad', tag: 'lift' });
  }

  land(n, k = 1) {
    if (n.placed) return;
    audio.sfx('drop', { volume: 0.6 * k });
    n.art.sx = 1 + 0.14 * k; n.art.sy = 1 - 0.16 * k;
    tween(n.art, { sx: 1, sy: 1 }, { dur: 0.5, ease: 'outElastic', tag: 'lift' });
  }

  // ---------------------------------------------------------------- correct drop
  async placeToy(n, b, instant = false) {
    n.placed = true; n.interactive = n.draggable = false;
    const slot = SLOTS[b.items.length] || SLOTS[2];
    b.items.push(n);
    killTweensOf(n); killTweensOf(n.art);
    const wpt = n.parent.toWorld(n.x, n.y);
    b.inner.add(n);
    const lp = b.inner.toLocal(wpt.x, wpt.y);
    n.x = lp.x; n.y = lp.y;
    n.shadow.visible = false; n.glow.alpha = 0;
    if (instant) {
      Object.assign(n, { x: slot.x, y: slot.y, rot: slot.r, sx: SLOT_S, sy: SLOT_S });
      Object.assign(n.art, { y: 0, rot: 0, sx: 1, sy: 1 });
      return;
    }
    this.dad.lookAt(b.toWorld(0, -150).x, b.toWorld(0, -150).y);
    tween(n.art, { y: 0, rot: 0, sx: 1, sy: 1 }, { dur: 0.25 });
    // hop up over the rim...
    const sx = n.x, sy = n.y, top = -300;
    n._k = 0;
    await tween(n, { _k: 1, sx: SLOT_S, sy: SLOT_S, rot: slot.r * 0.5 }, {
      dur: 0.26, ease: 'linear',
      onUpdate: (e, k) => { const q = Ease.outQuad(k); n.x = lerp(sx, slot.x, q); n.y = lerp(sy, top, Ease.outCubic(k)); },
    });
    // ...and drop in
    await tween(n, { y: slot.y, rot: slot.r }, { dur: 0.2, ease: 'inQuad' });
    audio.sfx('snap');
    n.art.sx = 1.18; n.art.sy = 0.82;
    tween(n.art, { sx: 1, sy: 1 }, { dur: 0.5, ease: 'outElastic' });
    b.sx = 1.1; b.sy = 0.88;
    tween(b, { sx: 1, sy: 1 }, { dur: 0.7, ease: 'outElastic' });
    burst(this.fxLayer, b.x, b.y - 170, 'sparkle', { count: 14, colors: [COLS[b.col].c, '#fff6c8', '#ffffff'] });
    burst(this.fxLayer, b.x, b.y - 150, 'stars', { count: 6, scale: 0.9, colors: [COLS[b.col].c, PAL_STAR] });
    wait(0.08).then(() => audio.sfx('sparkle'));
    // reactions
    this.dad.react('cheer', 1.4);
    this.dad.talk(0.9);
    const left = this.toys.filter(t => !t.placed).length;
    if (left > 0) audio.voice(`${cap(COLS[b.col].name)}! ${PRAISE[(9 - left) % PRAISE.length]}`);
    wait(0.15).then(() => this.babyJoy(1));
    wait(1.3).then(() => { if (!this.dragging) this.dad.lookAt(null); });
    if (left === 0) this.celebrate();
  }

  babyJoy(k = 1) {
    this.baby.react('happy', 1.6);
    audio.sfx('giggle');
    this.spring.v += 320 * k;
    burst(this.fxLayer, this.bouncer.x, this.bouncer.y - 230, 'hearts', { count: Math.round(3 + 3 * k), scale: 0.8 });
  }

  // ---------------------------------------------------------------- wrong drop
  wrongDrop(n, b) {
    audio.sfx('wrong');
    this.lower(n);
    // basket shakes "no", toy bounces off and hops home
    b.shake = { t: 0, dur: 0.6, amp: 0.07, freq: 26 };
    this.dad.react('think', 1.5);
    const bw = b.toWorld(0, -140); this.dad.lookAt(bw.x, bw.y);
    audio.voice('Hmm... coba lagi ya!');
    const sx = n.x, sy = n.y, h = n.home;
    n._k = 0;
    tween(n, { _k: 1, rot: h.rot }, {
      dur: 0.62, ease: 'linear', tag: 'drag',
      onUpdate: (e, k) => { const q = Ease.inOutSine(k); n.x = lerp(sx, h.x, q); n.y = lerp(sy, h.y, q) - Math.sin(k * Math.PI) * 130; },
    }).then(() => { if (n.x === h.x && n.y === h.y) this.land(n, 0.8); });
    // gentle teaching: the right basket gives a little "here!" bounce
    const right = this.baskets.find(x => x.col === n.col);
    wait(0.75).then(() => this.nudgeBasket(right));
    wait(1.4).then(() => { if (!this.dragging) this.dad.lookAt(null); });
  }

  nudgeBasket(b) {
    if (!b || this.finished) return;
    tween(b, { sy: 1.08, sx: 0.95 }, { dur: 0.12, ease: 'outQuad' }).then(() => tween(b, { sx: 1, sy: 1 }, { dur: 0.6, ease: 'outElastic' }));
  }

  // ---------------------------------------------------------------- hint
  showHint() {
    const toy = this.toys.find(t => !t.placed);
    if (!toy) return;
    const b = this.baskets.find(x => x.col === toy.col);
    const token = this.hintToken = {};
    const h = this.hand, g = this.ghost;
    h.x = toy.x + 18; h.y = toy.y - 50; h.alpha = 0; h.sx = h.sy = 0.6; h.rot = -0.35;
    g.img = toy.art.img; g.w = toy.art.w; g.h = toy.art.h; g.alpha = 0; g.x = toy.x; g.y = toy.y; g.sx = g.sy = 1;
    toy.shake = { t: 0, dur: 0.9, amp: 0.12, freq: 16 };
    tween(toy.glow, { alpha: 1 }, { dur: 0.3, tag: 'hint' });
    const alive = () => token === this.hintToken;
    (async () => {
      await tween(h, { alpha: 1, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outBack', tag: 'hint' });
      if (!alive()) return;
      await tween(h, { sx: 0.86, sy: 0.86 }, { dur: 0.14, tag: 'hint' });
      if (!alive()) return;
      g.alpha = 0.55;
      await tween(h, { sx: 1, sy: 1 }, { dur: 0.18, tag: 'hint' });
      if (!alive()) return;
      const x0 = h.x, y0 = h.y, x1 = b.x + 18, y1 = b.y - 190;
      h._k = 0;
      await tween(h, { _k: 1 }, {
        dur: 1.1, ease: 'linear', tag: 'hint',
        onUpdate: (e, k) => {
          const q = Ease.inOutSine(k);
          h.x = lerp(x0, x1, q); h.y = lerp(y0, y1, q) - Math.sin(k * Math.PI) * 120;
          g.x = h.x - 18; g.y = h.y + 70; g.sx = g.sy = lerp(1, SLOT_S, q);
        },
      });
      if (!alive()) return;
      this.nudgeBasket(b);
      tween(g, { alpha: 0 }, { dur: 0.3, tag: 'hint' });
      await tween(h, { alpha: 0 }, { dur: 0.35, delay: 0.2, tag: 'hint' });
      if (!alive()) return;
      tween(toy.glow, { alpha: 0 }, { dur: 0.4 });
      this.hintToken = null;
      this.lastInput = game.time - 2.5; // repeat sooner while still idle
    })();
  }

  cancelHint() {
    if (!this.hintToken) return;
    this.hintToken = null;
    killTweensOf(this.hand, 'hint'); killTweensOf(this.ghost, 'hint');
    tween(this.hand, { alpha: 0 }, { dur: 0.15 });
    tween(this.ghost, { alpha: 0 }, { dur: 0.15 });
    for (const t of this.toys) { killTweensOf(t.glow, 'hint'); tween(t.glow, { alpha: 0 }, { dur: 0.2 }); }
  }

  // ---------------------------------------------------------------- completion
  async celebrate() {
    if (this.celebrating) return;
    this.celebrating = true;
    this.drag.enabled = false;
    this.cancelHint();
    await wait(0.55);
    audio.sfx('cheer');
    this.dad.react('cheer', 3.2); this.dad.talk(1.6); this.dad.lookAt(null);
    audio.voice('Hore! Mainannya sudah rapi. Terima kasih!');
    this.baskets.forEach((b, i) => {
      wait(i * 0.14).then(() => {
        b.shake = { t: 0, dur: 1.1, amp: 0.1, freq: 14 };
        tween(b, { y: b.base.y - 36 }, { dur: 0.2, ease: 'outQuad' }).then(() => tween(b, { y: b.base.y }, { dur: 0.45, ease: 'outBounce' }));
        burst(this.fxLayer, b.x, b.y - 180, 'stars', { count: 8, colors: [COLS[b.col].c, PAL_STAR] });
      });
    });
    wait(0.3).then(() => { this.babyJoy(1.3); this.baby.react('cheer', 2.5); });
    for (let i = 0; i < 4; i++) wait(0.2 + i * 0.22).then(() => burst(this.fxLayer, 300 + i * 340, 40, 'confetti', { count: 26 }));
    wait(1.0).then(() => burst(this.fxLayer, this.bouncer.x, this.bouncer.y - 240, 'hearts', { count: 8 }));
    await wait(2.1);
    this.complete();
  }

  debugSolve(n = Infinity) {
    if (this.finished) return;
    let c = 0;
    for (const t of this.toys) {
      if (c >= n) break;
      if (t.placed) continue;
      this.placeToy(t, this.baskets.find(b => b.col === t.col), true);
      c++;
    }
    for (const t of this.toys) if (!t.placed) { killTweensOf(t); Object.assign(t, { x: t.home.x, y: t.home.y, rot: t.home.rot }); t.shadow.alpha = 0.85; }
    for (const b of this.baskets) { killTweensOf(b); b.sx = b.sy = 1; }
    if (this.toys.every(t => t.placed)) this.celebrate();
    else { this.drag.enabled = true; this.lastInput = game.time; }
  }

  // ---------------------------------------------------------------- per-frame life
  update(dt, t) {
    // ambient room life
    this.curtains[0].rot = Math.sin(t * 0.9) * 0.014 + Math.sin(t * 2.3) * 0.004;
    this.curtains[1].rot = -Math.sin(t * 0.9 + 1.3) * 0.014 - Math.sin(t * 2.1) * 0.004;
    this.curtains[0].sx = 1 + Math.sin(t * 1.1) * 0.01;
    this.curtains[1].sx = -1 - Math.sin(t * 1.1 + 1) * 0.01;
    this.crown.rot = Math.sin(t * 1.2) * 0.025;
    this.leaves.rot = Math.sin(t * 0.8 + 1) * 0.018;
    this.beam.alpha = 0.68 + Math.sin(t * 0.5) * 0.12;
    for (const [i, c] of this.clouds.entries()) {
      c.x += dt * (6 + i * 4);
      if (c.x > WINDOW.x + WINDOW.w + 110) c.x = WINDOW.x - 110;
    }
    this.butterfly.t += dt;
    this.updateMotes(dt);

    // bouncer spring (squash & stretch)
    const sp = this.spring;
    sp.v += (-90 * sp.y - 7 * sp.v) * dt; sp.y += sp.v * dt;
    const bob = Math.sin(t * 2.4) * 0.008;
    this.bouncer.sy = 1 - sp.y * 0.004 + bob; this.bouncer.sx = 1 + sp.y * 0.0025 - bob * 0.5;

    // dragged toy: tilt with velocity, Ayah follows it with his eyes, baskets lean in
    const d = this.dragging;
    if (d && dt > 0) {
      const vx = (d.x - this.prevPt.x) / dt, vy = (d.y - this.prevPt.y) / dt;
      this.vel.x = lerp(this.vel.x, vx, 0.25); this.vel.y = lerp(this.vel.y, vy, 0.25);
      this.prevPt = { x: d.x, y: d.y };
      d.tilt = lerp(d.tilt, clamp(this.vel.x * 0.00045, -0.4, 0.4), Math.min(1, dt * 14));
      d.art.rot = d.tilt + Math.sin(t * 7) * 0.025;
      const w = d.toWorld(0, -80); this.dad.lookAt(w.x, w.y);
      const near = this.basketAt(d);
      for (const b of this.baskets) b.hover = b === near ? 1 : 0;
    }
    for (const n of this.toys) {
      if (n !== d && !n.placed) { n.tilt = lerp(n.tilt, 0, Math.min(1, dt * 10)); if (!n.shake) n.art.rot = n.tilt; }
      if (n.shake) {
        const s = n.shake; s.t += dt; const k = s.t / s.dur;
        n.art.rot = k >= 1 ? 0 : Math.sin(s.t * s.freq) * s.amp * (1 - k);
        if (k >= 1) n.shake = null;
      }
      if (!n.placed) { // shadow shrinks and fades as the toy lifts
        const lift = clamp(-n.art.y / 60, 0, 1);
        n.shadow.sx = n.shadow.sy = 0.75 * (1 - lift * 0.3);
        n.shadow.x = lift * 10;
      }
    }
    for (const b of this.baskets) {
      b.hv = lerp(b.hv || 0, b.hover, Math.min(1, dt * 10));
      if (b.shake) {
        const s = b.shake; s.t += dt; const k = s.t / s.dur;
        b.rot = k >= 1 ? 0 : Math.sin(s.t * s.freq) * s.amp * (1 - k);
        if (k >= 1) b.shake = null;
      } else b.rot = 0;
      b.front.sx = b.back.sx = 1 + b.hv * 0.06;
      b.front.sy = b.back.sy = 1 + b.hv * 0.06;
      b.inner.sx = b.inner.sy = 1 + b.hv * 0.06;
    }

    // idle hint
    if (this.drag.enabled && !this.dragging && !this.hintToken && !this.finished && !this.celebrating && game.time - this.lastInput > 6) this.showHint();
  }

  // ---------------------------------------------------------------- dust motes in the sunbeam
  initMotes() {
    this.mote = [];
    for (let i = 0; i < 34; i++) this.mote.push({ u: Math.random(), v: Math.random(), s: 1.5 + Math.random() * 2.5, ph: Math.random() * 6, sp: 0.01 + Math.random() * 0.02 });
  }
  updateMotes(dt) {
    for (const m of this.mote) { m.u += m.sp * dt; m.ph += dt; m.v += Math.sin(m.ph * 0.7) * dt * 0.02; if (m.u > 1) { m.u = 0; m.v = Math.random(); } }
  }
  drawMotes(c) {
    // beam quad in stage coords: top edge (BEAM.x+262..BEAM.x+848, BEAM.y), bottom edge (BEAM.x+0..BEAM.x+690, BEAM.y+830)
    const tx0 = BEAM.x + 270, tx1 = BEAM.x + 840, bx0 = BEAM.x + 10, bx1 = BEAM.x + 680, ty = BEAM.y + 10, by = BEAM.y + 700;
    c.fillStyle = '#fffbe8';
    for (const m of this.mote) {
      const y = lerp(ty, by, m.u), xl = lerp(tx0, bx0, m.u), xr = lerp(tx1, bx1, m.u), x = lerp(xl, xr, (m.v % 1 + 1) % 1);
      const a = (0.35 + 0.45 * Math.sin(m.ph * 2)) * Math.sin(m.u * Math.PI);
      if (a <= 0) continue;
      c.globalAlpha = a; c.beginPath(); c.arc(x, y, m.s, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }
}

const PAL_STAR = '#f6cf3e';
const cap = s => s[0].toUpperCase() + s.slice(1);

/** pulsing warm glow ring under a hinted toy */
function drawGlow(c, n) {
  const t = game.time, r = 78 + Math.sin(t * 6) * 6;
  const g = c.createRadialGradient(0, -60, r * 0.3, 0, -60, r);
  g.addColorStop(0, 'rgba(255,246,200,0.75)'); g.addColorStop(1, 'rgba(255,246,200,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, -60, r, 0, Math.PI * 2); c.fill();
}

/** little pastel butterfly flitting in the garden (seen through the window) */
function drawButterfly(c, n) {
  const t = n.t, x = 720 + Math.sin(t * 0.45) * 230 + Math.sin(t * 1.3) * 30, y = 300 + Math.sin(t * 0.9) * 50 + Math.sin(t * 2.7) * 10;
  const flap = Math.abs(Math.sin(t * 11)) * 0.8 + 0.2, dir = Math.cos(t * 0.45) >= 0 ? 1 : -1;
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.lineWidth = 1.6; c.strokeStyle = '#6b6260';
  for (const s of [-1, 1]) {
    c.save(); c.scale(s * flap, 1);
    c.fillStyle = '#f7b9c4'; c.beginPath(); c.ellipse(7, -5, 8, 6, -0.4, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#fde69a'; c.beginPath(); c.ellipse(6, 5, 5, 4, 0.4, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  }
  c.fillStyle = '#6b6260'; c.beginPath(); c.ellipse(0, 0, 1.8, 6, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

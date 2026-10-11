// Level 2 "Warna-warni" (colour sort). Ayah tidies baby Bintang's toys: drag each toy into the basket
// of the same colour. Sunny living-room play corner. Owned by the level-2 builder. See CONTRACT.md.
import { Node } from '../engine/node.js';
import { tween, wait, Ease, killTweensOf, clamp, lerp } from '../engine/tween.js';
import { createCharacter } from '../art/characters.js';
import { burst } from '../art/fx.js';
import { LevelScene, game, audio } from './base.js';
import {
  loadLevel2Art, COLS, TOY_W, TOY_H, TOY_BASE, BASKET_H, BASKET_BASE, BASKET_RIM,
  BOUNCER_H, BOUNCER_BASE, GARDEN, BEAM, RUG_H, HAND_W, HAND_H, HAND_TIP, WINDOW, FACE_H, FACE_CY,
} from '../art/props_level2.js';

// Stage space: the important 1600x900 area is x 0..1600, y 0..900 (placed in the view by onLayout).
const BASKETS = [{ col: 'red', x: 585 }, { col: 'yellow', x: 865 }, { col: 'blue', x: 1145 }];
const BASKET_Y = 640;
const ROW_BACK = 768, ROW_FRONT = 824;
const TOYS = [
  { type: 'ball', col: 'red', x: 470, y: ROW_BACK, rot: -0.12 },
  { type: 'duck', col: 'yellow', x: 585, y: ROW_FRONT, rot: 0.06 },
  { type: 'car', col: 'blue', x: 700, y: ROW_BACK, rot: -0.07 },
  { type: 'block', col: 'red', x: 815, y: ROW_FRONT, rot: 0.13 },
  { type: 'rings', col: 'yellow', x: 930, y: ROW_BACK, rot: 0.02 },
  { type: 'duck', col: 'blue', x: 1045, y: ROW_FRONT, rot: -0.07 },
  { type: 'car', col: 'red', x: 1160, y: ROW_BACK, rot: 0.06 },
  { type: 'ball', col: 'yellow', x: 1275, y: ROW_FRONT, rot: 0.1 },
  { type: 'block', col: 'blue', x: 1390, y: ROW_BACK + 6, rot: -0.12 },
];
// resting slots inside a basket (basket-local; origin = basket bottom centre). The third toy sits on top of the pile.
const SLOTS = [{ x: -66, y: -128, r: -0.2 }, { x: 66, y: -124, r: 0.18 }, { x: 0, y: -158, r: 0.03 }];
const TYPE_DY = { rings: -16, car: -16, ball: 0, block: -4, duck: -6 };
const SLOT_S = 0.9;
const LIFT_Y = -50, LIFT_S = 1.15;
const DAD = { x: 250, s: 0.88, drop: 64 };
const BOUNCER = { x: 1460, y: 690 };
const PRAISE = ['Pintar!', 'Hebat!', 'Bagus sekali!', 'Hore!'];
const DUST = '#f3e3c8';

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
    S.add(spr(art.wall, { x: -400, y: -340, ax: 0, ay: 0 }));
    S.add(spr(art.floor, { x: -400, y: 520, ax: 0, ay: 0 }));
    this.curtains = [
      S.add(spr(art.curtain, { x: 300, y: 50, ax: 0, ay: 0 })),
      S.add(spr(art.curtain, { x: 1120, y: 50, ax: 0, ay: 0, sx: -1 })),
    ];
    S.add(spr(art.lamp, { x: -250, y: 612, ax: 0.5, ay: 610 / 620 }));
    S.add(spr(art.shelf, { x: 1300, y: 568, ax: 0.5, ay: 332 / 340 }));
    S.add(spr(art.chest, { x: 1850, y: 700, ax: 0.5, ay: 228 / 240 }));
    this.leaves = S.add(spr(art.leaves, { x: 1545, y: 520, ax: 0.5, ay: 350 / 360, sx: 0.6, sy: 0.6 }));
    S.add(spr(art.pot, { x: 1545, y: 598, ax: 0.5, ay: 1, sx: 0.68, sy: 0.68 }));
    S.add(spr(art.rug, { x: 900, y: 792, ax: 0.5, ay: 0.5 - 5 / RUG_H }));
    this.beam = S.add(spr(art.beam, { x: BEAM.x, y: BEAM.y, ax: 0, ay: 0, alpha: 0.55 }));

    // --- baskets (back · toys · front · label face · hover glow) ---
    this.baskets = BASKETS.map(b => {
      const n = S.add(new Node({ x: b.x, y: BASKET_Y }));
      const A = art.baskets[b.col];
      n.col = b.col; n.items = []; n.hover = 0; n.hv = 0; n.base = { x: b.x, y: BASKET_Y };
      n.faces = { idle: A.faceidle, open: A.faceopen, happy: A.facehappy };
      n.glowN = n.add(new Node({ alpha: 0, drawFn: (c, g) => drawRimGlow(c, COLS[b.col].c) }));
      n.back = n.add(spr(A.back, { ax: 0.5, ay: BASKET_BASE / BASKET_H }));
      n.inner = n.add(new Node());
      n.front = n.add(spr(A.front, { ax: 0.5, ay: BASKET_BASE / BASKET_H }));
      n.face = n.front.add(spr(A.faceidle, { x: 0, y: -72, rot: -0.052, ax: 0.5, ay: FACE_CY / FACE_H }));
      n.faceMood = 'idle'; n.faceHold = 0;
      return n;
    });
    // baby in a bouncer (squash & stretch group anchored at the floor)
    const bo = this.bouncer = S.add(new Node({ x: BOUNCER.x, y: BOUNCER.y }));
    bo.add(spr(art.bouncerBack, { ax: 0.5, ay: BOUNCER_BASE / BOUNCER_H }));
    baby.x = 0; baby.y = -68; baby.sx = baby.sy = 0.75;
    bo.add(baby);
    bo.add(spr(art.bouncerFront, { ax: 0.5, ay: BOUNCER_BASE / BOUNCER_H }));
    this.spring = { y: 0, v: 0 };

    // tap targets for the characters (delight, not required to play)
    this.babyHit = S.add(new Node({ x: BOUNCER.x, y: BOUNCER.y - 160, w: 260, h: 280, interactive: true }));

    // Ayah in the foreground, below the toy layer so a dragged toy is never hidden (a bust, cropped by the bottom edge of the screen)
    dad.x = DAD.x; dad.sx = dad.sy = DAD.s;
    S.add(dad);
    this.dadHit = S.add(new Node({ x: DAD.x, w: 320, h: 460, interactive: true }));
    // dust puffs live below the toys
    this.fxBelow = S.add(new Node());
    // --- toys ---
    this.toyLayer = S.add(new Node());
    this.toys = TOYS.map((t, i) => {
      const n = new Node({ x: t.x, y: t.y, rot: t.rot, w: TOY_W, h: TOY_H, ax: 0.5, ay: TOY_BASE / TOY_H, hitPad: 14, interactive: true, draggable: true });
      n.type = t.type; n.col = t.col; n.idx = i; n.placed = false;
      n.home = { x: t.x, y: t.y, rot: t.rot, sx: 1, sy: 1 };
      n.shadow = n.add(spr(art.shadow, { sx: 0.75, sy: 0.75, alpha: 0.6 }));
      n.glow = n.add(new Node({ alpha: 0, drawFn: drawHintRing }));
      n.art = n.add(spr(art.toys[`${t.type}-${t.col}`], { ax: 0.5, ay: TOY_BASE / TOY_H }));
      n.tilt = 0; n.shake = null; n.pulse = 0; n.spin = 0; n.shOff = 0;
      return n;
    });
    [...this.toys].sort((a, b) => a.y - b.y).forEach(n => this.toyLayer.add(n));

    this.cushion = S.add(spr(art.cushion, { ax: 0.5, ay: 0.55, visible: false }));

    this.motes = S.add(new Node({ drawFn: c => this.drawMotes(c) }));
    this.initMotes();
    this.fxLayer = S.add(new Node());
    this.hintLayer = S.add(new Node());
    this.trail = this.hintLayer.add(new Node({ alpha: 0, drawFn: c => this.drawTrail(c) }));
    this.ghost = this.hintLayer.add(new Node({ alpha: 0, ax: 0.5, ay: TOY_BASE / TOY_H }));
    this.hand = this.hintLayer.add(spr(art.hand, { alpha: 0, ax: HAND_TIP[0] / HAND_W, ay: HAND_TIP[1] / HAND_H }));

    this.drag.enabled = false;
    this.lastInput = 0;
    this.dragging = null;
    this.prevPt = null; this.vel = { x: 0, y: 0 };
    this.nextWave = 9;
  }

  onLayout(v) {
    this.stage.x = Math.round((v.w - 1600) / 2);
    // taller (tablet) views: show more wall above, keep the play area low so the rug is not empty
    this.stage.y = Math.round((v.h - 900) * 0.78);
    const bottom = v.h - this.stage.y; // stage-space y of the screen's bottom edge
    this.dad.y = bottom + DAD.drop;
    this.dadHit.y = this.dad.y - 330;
    const right = v.w - this.stage.x;
    this.cushion.visible = bottom > 960;
    this.cushion.x = right - 150; this.cushion.y = bottom - 30;
  }

  // ---------------------------------------------------------------- intro choreography
  enter() {
    audio.music('level');
    this.intro();
  }

  async intro() {
    for (const n of this.toys) { n.sx = n.sy = 0.01; n.shadow.alpha = 0; }
    for (const b of this.baskets) { b.sx = b.sy = 0.01; }
    await wait(0.35);
    this.dad.react('happy', 2.2);
    this.dad.talk(2.6);
    audio.voice('Ayo bantu Ayah merapikan mainan!');
    this.baskets.forEach((b, i) => {
      tween(b, { sx: 1, sy: 1 }, { dur: 0.55, delay: 0.15 + i * 0.16, ease: 'outBack' }).then(() => {
        if (this.finished) return;
        audio.sfx('pop'); burst(this.fxLayer, b.x, b.y - 75, 'sparkle', { count: 8, scale: 0.8, colors: [COLS[b.col].c, '#fff6c8'] });
        this.setFace(b, 'happy', 0.6);
      });
    });
    await wait(0.75);
    // toys spring up out of the rug at their own spots: pop (outBack) + hop + spin, bounce on landing
    const order = [...this.toys].sort((a, b) => Math.abs(a.home.x - 900) - Math.abs(b.home.x - 900));
    order.forEach((n, i) => {
      const d = 0.08 * i;
      n.spin = (n.idx % 2 ? 1 : -1) * 1.3;
      tween(n, { spin: 0 }, { dur: 0.9, delay: d, ease: 'outElastic' });
      wait(d).then(() => { if (!n.placed) { audio.sfx('pop', { volume: 0.45 }); this.puff(n.x, n.y, 0.6); } });
      tween(n, { sx: 1, sy: 1 }, { dur: 0.45, delay: d, ease: 'outBack' });
      tween(n.shadow, { alpha: 0.6 }, { dur: 0.4, delay: d + 0.1 });
      n.art.y = 0;
      tween(n.art, { y: n.home.y < 800 ? -55 : -100 }, { dur: 0.26, delay: d, ease: 'outQuad' })
        .then(() => tween(n.art, { y: 0 }, { dur: 0.5, ease: 'outBounce' }))
        .then(() => { if (!n.placed) { audio.sfx('drop', { volume: 0.4 }); this.puff(n.x, n.y, 0.8); } });
    });
    this.baby.react('happy', 1.5);
    await wait(0.35); // toys are grabbable while the rest are still popping
    if (!this.finished && !this.celebrating) this.drag.enabled = true;
    this.lastInput = game.time + 1;
    await wait(0.08 * order.length + 0.5);
    this.dad.lookAt(null);
    this.lastInput = Math.max(this.lastInput, game.time);
  }

  /** soft warm-cream dust puff on the floor (drawn below the toys) */
  puff(x, y, k = 1) {
    const parts = [];
    for (let i = 0; i < 5; i++) parts.push({ a: Math.PI + (i / 4) * Math.PI + (Math.random() - 0.5) * 0.4, r: 6 + Math.random() * 6 });
    const n = this.fxBelow.add(new Node({ x, y: y - 2 }));
    n.k = 0;
    n.drawFn = c => {
      const e = Ease.outCubic(n.k);
      c.fillStyle = DUST;
      c.globalAlpha *= (1 - n.k) * 0.7;
      for (const p of parts) {
        const d = (14 + 46 * e) * k, x2 = Math.cos(p.a) * d * 1.5, y2 = Math.sin(p.a) * d * 0.3 - 6 * e;
        c.beginPath(); c.ellipse(x2, y2, (p.r + 16 * e) * k * 1.3, (p.r + 16 * e) * k * 0.8, 0, 0, Math.PI * 2); c.fill();
      }
    };
    tween(n, { k: 1 }, { dur: 0.55, ease: 'linear' }).then(() => n.removeSelf());
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
    killTweensOf(n.art); n.pulse = 0; n.shake = null;
    tween(n.art, { y: LIFT_Y, sx: LIFT_S, sy: LIFT_S }, { dur: 0.22, ease: 'outBack', tag: 'lift' });
    tween(n, { rot: 0 }, { dur: 0.25, ease: 'outQuad', tag: 'drag' });
    const w = n.toWorld(0, -80);
    this.dad.lookAt(w.x, w.y);
  }

  onMove() { this.lastInput = game.time; }

  onDrop(n, p, moved) {
    if (!n.art) return false;
    this.dragging = null;
    this.lastInput = game.time;
    for (const b of this.baskets) b.hover = 0;
    if (!moved) { // tap on a toy: little hop and say its colour
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
    this.lower(n);
    this.dad.lookAt(null);
    audio.sfx('whoosh', { volume: 0.4 });
    this.drag.returnHome(n, 0.5).then(() => { if (n.x === n.home.x && n.y === n.home.y) this.land(n, 0.5); });
    return true;
  }

  /** Nearest basket whose generous mouth region contains the toy (magnetic snap). */
  basketAt(n) {
    const cx = n.x, cy = n.y - 70 + n.art.y;
    let best = null, bd = 1;
    for (const b of this.baskets) {
      const mx = b.x, my = b.y - (BASKET_BASE - BASKET_RIM) + 10;
      const dx = (cx - mx) / 200, dy = (cy - my) / (cy < my ? 190 : 170);
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  lower(n) {
    killTweensOf(n.art, 'lift');
    tween(n.art, { y: 0, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outQuad', tag: 'lift' });
  }

  /** settle at home (squash) — the idle-hint clock starts from here */
  land(n, k = 1) {
    this.lastInput = game.time;
    if (n.placed) return;
    audio.sfx('drop', { volume: 0.6 * k });
    n.art.sx = 1 + 0.14 * k; n.art.sy = 1 - 0.16 * k;
    tween(n.art, { sx: 1, sy: 1 }, { dur: 0.5, ease: 'outElastic', tag: 'lift' });
    this.puff(n.x, n.y, 0.5 * k);
  }

  setFace(b, mood, hold = 0) {
    if (b.faceMood !== mood) { b.faceMood = mood; b.face.setImage(b.faces[mood]); }
    b.faceHold = hold;
  }

  // ---------------------------------------------------------------- correct drop
  async placeToy(n, b, instant = false) {
    n.placed = true; n.interactive = n.draggable = false; n.pulse = 0; n.shake = null;
    const slot = SLOTS[b.items.length] || SLOTS[2], sy0 = slot.y + (TYPE_DY[n.type] || 0);
    b.items.push(n);
    killTweensOf(n); killTweensOf(n.art);
    const wpt = n.parent.toWorld(n.x, n.y);
    b.inner.add(n);
    const lp = b.inner.toLocal(wpt.x, wpt.y);
    n.x = lp.x; n.y = lp.y;
    n.shadow.visible = false; n.glow.alpha = 0;
    if (instant) {
      Object.assign(n, { x: slot.x, y: sy0, rot: slot.r, sx: SLOT_S, sy: SLOT_S });
      Object.assign(n.art, { y: 0, rot: 0, sx: 1, sy: 1 });
      return;
    }
    const bw = b.toWorld(0, -150); this.dad.lookAt(bw.x, bw.y);
    tween(n.art, { y: 0, rot: 0, sx: 1, sy: 1 }, { dur: 0.25 });
    const sx = n.x, sy = n.y, top = -320;
    n._k = 0;
    await tween(n, { _k: 1, sx: SLOT_S, sy: SLOT_S, rot: slot.r * 0.5 }, {
      dur: 0.26, ease: 'linear',
      onUpdate: (e, k) => { n.x = lerp(sx, slot.x, Ease.outQuad(k)); n.y = lerp(sy, top, Ease.outCubic(k)); },
    });
    await tween(n, { y: sy0, rot: slot.r }, { dur: 0.2, ease: 'inQuad' });
    audio.sfx('snap');
    n.art.sx = 1.18; n.art.sy = 0.82;
    tween(n.art, { sx: 1, sy: 1 }, { dur: 0.5, ease: 'outElastic' });
    b.sx = 1.1; b.sy = 0.88;
    tween(b, { sx: 1, sy: 1 }, { dur: 0.7, ease: 'outElastic' });
    this.setFace(b, 'happy', 1.4);
    burst(this.fxLayer, b.x, b.y - 170, 'sparkle', { count: 14, colors: [COLS[b.col].c, '#fff6c8', '#ffffff'] });
    burst(this.fxLayer, b.x, b.y - 150, 'stars', { count: 6, scale: 0.9, colors: [COLS[b.col].c, PAL_STAR] });
    wait(0.08).then(() => audio.sfx('sparkle'));
    this.dad.react('cheer', 1.4);
    this.dad.talk(0.9);
    const left = this.toys.filter(t => !t.placed).length;
    if (left > 0) audio.voice(`${cap(COLS[b.col].name)}! ${PRAISE[(9 - left) % PRAISE.length]}`);
    wait(0.15).then(() => this.babyJoy(1));
    wait(1.3).then(() => { if (!this.dragging) this.dad.lookAt(null); });
    this.lastInput = game.time;
    if (left === 0) this.celebrate();
  }

  babyJoy(k = 1, sound = true) {
    this.baby.react('happy', 1.6);
    if (sound) audio.sfx('giggle');
    this.spring.v += 320 * k;
    burst(this.fxLayer, this.bouncer.x, this.bouncer.y - 250, 'hearts', { count: Math.round(3 + 3 * k), scale: 0.8 });
  }

  // ---------------------------------------------------------------- wrong drop
  wrongDrop(n, b) {
    audio.sfx('wrong');
    this.lower(n);
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
    const right = this.baskets.find(x => x.col === n.col);
    wait(0.75).then(() => this.nudgeBasket(right));
    wait(1.4).then(() => { if (!this.dragging) this.dad.lookAt(null); });
  }

  nudgeBasket(b) {
    if (!b || this.finished) return;
    this.setFace(b, 'open', 0.8);
    tween(b, { sy: 1.08, sx: 0.95 }, { dur: 0.12, ease: 'outQuad' }).then(() => tween(b, { sx: 1, sy: 1 }, { dur: 0.6, ease: 'outElastic' }));
  }

  // ---------------------------------------------------------------- hint
  showHint() {
    // back-row toys first so the pointing hand (above the toy) never hides another toy
    const toy = this.toys.filter(t => !t.placed).sort((a, c) => a.y - c.y || a.idx - c.idx)[0];
    if (!toy) return;
    const b = this.baskets.find(x => x.col === toy.col);
    const token = this.hintToken = {};
    const h = this.hand, g = this.ghost;
    const cx = toy.x, cy = toy.y - 62; // toy centre
    this.trailPts = { x0: cx, y0: cy, x1: b.x, y1: b.y - 175, k: 0 };
    h.x = cx; h.y = cy; h.alpha = 0; h.sx = h.sy = 0.6; h.rot = Math.PI - 0.18; // pointing down at the toy
    g.img = toy.art.img; g.w = toy.art.w; g.h = toy.art.h; g.alpha = 0; g.x = toy.x; g.y = toy.y; g.sx = g.sy = 1; g.rot = 0;
    toy.pulse = 1;
    tween(toy.glow, { alpha: 1 }, { dur: 0.3, tag: 'hint' });
    const alive = () => token === this.hintToken;
    (async () => {
      await tween(h, { alpha: 1, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outBack', tag: 'hint' });
      if (!alive()) return;
      for (let i = 0; i < 2; i++) { // two taps on the toy
        await tween(h, { sx: 0.86, sy: 0.86, y: cy + 8 }, { dur: 0.13, tag: 'hint' });
        if (!alive()) return;
        await tween(h, { sx: 1, sy: 1, y: cy }, { dur: 0.2, tag: 'hint' });
        if (!alive()) return;
      }
      g.alpha = 0.75; this.trail.alpha = 1;
      const T = this.trailPts;
      h._k = 0;
      await tween(h, { _k: 1 }, {
        dur: 1.25, ease: 'linear', tag: 'hint',
        onUpdate: (e, k) => {
          const q = Ease.inOutSine(k), p = arcPt(T, q);
          T.k = q; g.x = p.x; g.y = p.y + 62; g.sx = g.sy = lerp(1, SLOT_S, q);
          h.x = p.x; h.y = p.y; h.rot = Math.PI - 0.18 + Math.sin(k * Math.PI) * 0.25;
        },
      });
      if (!alive()) return;
      this.nudgeBasket(b);
      tween(g, { alpha: 0 }, { dur: 0.35, tag: 'hint' });
      tween(this.trail, { alpha: 0 }, { dur: 0.6, delay: 0.3, tag: 'hint' });
      await tween(h, { alpha: 0 }, { dur: 0.35, delay: 0.25, tag: 'hint' });
      if (!alive()) return;
      toy.pulse = 0;
      tween(toy.glow, { alpha: 0 }, { dur: 0.4 });
      this.hintToken = null;
      this.lastInput = game.time - 2.5; // repeat sooner while still idle
    })();
  }

  cancelHint() {
    if (!this.hintToken) return;
    this.hintToken = null;
    for (const n of [this.hand, this.ghost, this.trail]) { killTweensOf(n, 'hint'); tween(n, { alpha: 0 }, { dur: 0.15 }); }
    for (const t of this.toys) { t.pulse = 0; killTweensOf(t.glow, 'hint'); tween(t.glow, { alpha: 0 }, { dur: 0.2 }); }
  }

  drawTrail(c) {
    const T = this.trailPts; if (!T) return;
    const N = 16;
    for (let i = 1; i < N; i++) {
      const q = i / N; if (q > T.k + 0.02) break;
      const p = arcPt(T, q), r = 7 - q * 2.5;
      c.fillStyle = '#fff3c4'; c.strokeStyle = '#b8913e'; c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y + 10, r, 0, Math.PI * 2); c.fill(); c.stroke();
    }
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
        this.setFace(b, 'happy', 999);
        b.shake = { t: 0, dur: 1.1, amp: 0.1, freq: 14 };
        tween(b, { y: b.base.y - 36 }, { dur: 0.2, ease: 'outQuad' }).then(() => tween(b, { y: b.base.y }, { dur: 0.45, ease: 'outBounce' }));
        burst(this.fxLayer, b.x, b.y - 180, 'stars', { count: 8, colors: [COLS[b.col].c, PAL_STAR] });
      });
    });
    wait(0.3).then(() => { this.babyJoy(1.3); this.baby.react('cheer', 2.5); });
    for (let i = 0; i < 4; i++) wait(0.2 + i * 0.22).then(() => burst(this.fxLayer, 300 + i * 340, 40, 'confetti', { count: 26 }));
    wait(1.0).then(() => burst(this.fxLayer, this.bouncer.x, this.bouncer.y - 250, 'hearts', { count: 8 }));
    await wait(2.1);
    this.dad.setMood?.('happy'); this.baby.setMood?.('happy');
    this.winLoop = 0.4;
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
    for (const t of this.toys) if (!t.placed) {
      killTweensOf(t); killTweensOf(t.art);
      Object.assign(t, { x: t.home.x, y: t.home.y, rot: t.home.rot, sx: 1, sy: 1, spin: 0 }); Object.assign(t.art, { y: 0, sx: 1, sy: 1, rot: 0 }); t.shadow.alpha = 0.6;
    }
    for (const b of this.baskets) { killTweensOf(b); b.sx = b.sy = 1; }
    if (this.toys.every(t => t.placed)) this.celebrate();
    else { this.drag.enabled = true; this.lastInput = game.time; }
  }

  // ---------------------------------------------------------------- per-frame life
  update(dt, t) {
    this.curtains[0].rot = Math.sin(t * 0.9) * 0.014 + Math.sin(t * 2.3) * 0.004;
    this.curtains[1].rot = -Math.sin(t * 0.9 + 1.3) * 0.014 - Math.sin(t * 2.1) * 0.004;
    this.curtains[0].sx = 1 + Math.sin(t * 1.1) * 0.01;
    this.curtains[1].sx = -1 - Math.sin(t * 1.1 + 1) * 0.01;
    this.crown.rot = Math.sin(t * 1.2) * 0.025;
    this.leaves.rot = Math.sin(t * 0.8 + 1) * 0.018;
    this.beam.alpha = 0.52 + Math.sin(t * 0.5) * 0.06;
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

    // dragged toy: tilt with velocity, Ayah follows it with his eyes, the basket under it reacts
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
      if (n !== d && !n.placed) { n.tilt = lerp(n.tilt, 0, Math.min(1, dt * 10)); if (!n.shake) n.art.rot = n.tilt + n.spin; }
      if (n.shake) {
        const s = n.shake; s.t += dt; const k = s.t / s.dur;
        n.art.rot = k >= 1 ? 0 : Math.sin(s.t * s.freq) * s.amp * (1 - k);
        if (k >= 1) n.shake = null;
      }
      if (n.pulse && n !== d) { const s = 1 + 0.06 * (1 - Math.cos(t * 6.5)); n.art.sx = n.art.sy = s; n.art.rot = Math.sin(t * 13) * 0.06; }
      if (!n.placed) {
        // held: a bigger, darker drop shadow offset down-right (reads over the baskets too);
        // hopping on its own (intro / tap / bounce): the floor shadow just shrinks and fades
        const held = n === d ? 1 : 0;
        n.shOff = lerp(n.shOff, held, Math.min(1, dt * 12));
        const h = clamp(-n.art.y / 150, 0, 1);
        n.shadow.sx = n.shadow.sy = lerp(0.75 * (1 - h * 0.4), 0.97, n.shOff);
        n.shadow.x = n.shOff * 20; n.shadow.y = n.shOff * 20;
        if (n.sx > 0.9) n.shadow.alpha = lerp(0.6 * (1 - h * 0.5), 1, n.shOff);
      }
    }
    for (const b of this.baskets) {
      b.hv = lerp(b.hv, b.hover, Math.min(1, dt * 10)); if (b.hv < 0.01 && !b.hover) b.hv = 0;
      if (b.shake) {
        const s = b.shake; s.t += dt; const k = s.t / s.dur;
        b.rot = k >= 1 ? 0 : Math.sin(s.t * s.freq) * s.amp * (1 - k);
        if (k >= 1) b.shake = null;
      } else b.rot = 0;
      const hs = 1 + b.hv * (0.05 + 0.02 * Math.sin(t * 9));
      b.front.sx = b.back.sx = b.inner.sx = hs;
      b.front.sy = b.back.sy = b.inner.sy = hs;
      b.glowN.alpha = b.hv;
      if (b.faceHold > 0) b.faceHold -= dt;
      else this.setFace(b, b.hover ? 'open' : 'idle');
      if (b.faceMood === 'open') b.face.y = -72 - 2 * b.hv;
    }

    // Ayah: an occasional friendly wave while the child is thinking
    if (!this.finished && !this.celebrating && !d && t > this.nextWave) {
      this.nextWave = t + 8 + Math.random() * 4;
      if (game.time - this.lastInput > 2) { this.dad.react('happy', 1.4); }
    }
    // after the win: keep the family celebrating under the win UI
    if (this.finished && this.winLoop !== undefined) {
      this.winLoop -= dt;
      if (this.winLoop <= 0) {
        this.winLoop = 2.4;
        this.wl = (this.wl || 0) + 1;
        this.dad.react(this.wl % 2 ? 'cheer' : 'happy', 1.6);
        this.babyJoy(0.6, false);
        const b = this.baskets[this.wl % 3];
        tween(b, { y: b.base.y - 24 }, { dur: 0.18, ease: 'outQuad' }).then(() => tween(b, { y: b.base.y }, { dur: 0.4, ease: 'outBounce' }));
      }
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
/** point on the hint arc from toy to basket */
function arcPt(T, q) { return { x: lerp(T.x0, T.x1, q), y: lerp(T.y0, T.y1, q) - Math.sin(q * Math.PI) * 120 }; }

/** warm white-gold pulsing ring with a thin pencil outline around a hinted toy */
function drawHintRing(c) {
  const t = game.time, r = 80 + Math.sin(t * 6.5) * 6, cy = -62;
  const g = c.createRadialGradient(0, cy, r * 0.4, 0, cy, r * 1.15);
  g.addColorStop(0, 'rgba(255,240,180,0.0)'); g.addColorStop(0.7, 'rgba(255,236,160,0.45)'); g.addColorStop(1, 'rgba(255,236,160,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, cy, r * 1.15, 0, Math.PI * 2); c.fill();
  c.lineCap = 'round';
  c.strokeStyle = '#fff5cf'; c.lineWidth = 9; c.beginPath(); c.ellipse(0, cy, r, r * 0.92, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#c99a3c'; c.lineWidth = 2.2;
  c.beginPath(); c.ellipse(0, cy, r + 5.5, r * 0.92 + 5.5, 0.03, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.ellipse(0, cy, r - 5.5, r * 0.92 - 5.5, -0.03, 0.2, Math.PI * 2 - 0.3); c.stroke();
}

/** soft glow around a basket rim in the basket's own colour (hover feedback) */
function drawRimGlow(c, col) {
  const cy = -(BASKET_BASE - BASKET_RIM);
  c.save();
  c.shadowColor = col; c.shadowBlur = 26;
  c.strokeStyle = col; c.globalAlpha *= 0.85; c.lineWidth = 14;
  c.beginPath(); c.ellipse(0, cy, 156, 46, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#fffbe8'; c.lineWidth = 4; c.globalAlpha *= 0.8;
  c.beginPath(); c.ellipse(0, cy - 2, 160, 50, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.restore();
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

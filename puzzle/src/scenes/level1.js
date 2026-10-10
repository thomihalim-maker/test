// Level 1 "Siap Tidur" (shape match). A cosy nursery at dusk: drag the five bedtime things from the shelf
// onto their dotted silhouettes around baby Bintang's crib. Ibu watches and reacts. When everything is in
// place the lights dim, the mobile plays a lullaby and Bintang falls asleep.
import { Node } from '../engine/node.js';
import { canvasSprite } from '../engine/raster.js';
import { tween, wait, killTweensOf, clamp, lerp, rand, rng } from '../engine/tween.js';
import { createCharacter } from '../art/characters.js';
import { burst } from '../art/fx.js';
import { LevelScene, game, audio } from './base.js';
import { PAL } from '../art/style.js';
import { loadLevel1Art, ITEMS, C, WINDOW, LAMP, SHELF, CRIB, STOOL, RUG, FRAME, ORN } from '../art/props_level1.js';

// ---- layout in the central 1600×900 design box (C-space) -------------------------------------
const FLOOR_Y = 640;
const L = {
  window: { x: 262, y: 22 },
  frame: { x: 1112, y: 178 },
  shelf: { x: 1190, y: 444 },
  lamp: { x: 1482, y: 452 },          // bottom centre
  shelfTop: { x: 1206, y: 332 },
  cribBack: { x: 500, y: 375 },
  cribFront: { x: 480, y: 375 },
  stool: { x: 330, y: 690 },
  rug: { x: 800, y: 868 },
  mom: { x: 205, y: 880, s: 0.94 },
  baby: { x: 818, y: 618, s: 0.86, rot: -0.34 },
  mobile: { x: 806, y: 0, ring: 148, R: 112 },
};
// The five items: slot = where it belongs (centre, scale 1); home = shelf cubby; foot = local y of its base.
const DEFS = [
  { key: 'bottle', slot: { x: 410, y: 622, rot: 0.04 }, layer: 'front', home: { cx: SHELF.upper[0], floor: SHELF.upperFloor, s: 0.74 }, foot: 188 },
  { key: 'rattle', slot: { x: 1110, y: 494, rot: -0.22 }, layer: 'top', home: { cx: SHELF.upper[1], floor: SHELF.upperFloor, s: 0.78 }, foot: 185 },
  { key: 'teddy', slot: { x: 992, y: 534, rot: 0.03 }, layer: 'front', home: { cx: SHELF.upper[2], floor: SHELF.upperFloor, s: 0.6 }, foot: 189 },
  { key: 'pillow', slot: { x: 652, y: 556, rot: -0.08 }, layer: 'back', home: { cx: SHELF.lower[0], floor: SHELF.lowerFloor, s: 0.7 }, foot: 116 },
  { key: 'blanket', slot: { x: 850, y: 628, rot: 0.02 }, layer: 'top', home: { cx: SHELF.lower[1], floor: SHELF.lowerFloor, s: 0.6 }, foot: 148 },
];
const SNAP_R = 125, MAGNET_R = 175, ORN_KINDS = ['star', 'moon', 'cloud', 'starPink', 'heart'];
const MELODY = [0, 2, 4, 2, 0, 4, 7, 4, 2, 0]; // music-box lullaby (semitone steps)

export default class Level1 extends LevelScene {
  static level = 1;
  static title = 'Siap Tidur';

  async load() {
    await super.load();
    const S = this.S = await loadLevel1Art();
    this.t = 0; this.idle = 0; this.introDone = false; this.finaleStarted = false; this.hinting = false;
    this.cam = { s: 1, fx: 800, fy: 520, dx: 0, dy: 0 };
    this.dimK = 0; this.lampK = 1; this.beamK = 0; this.mobSpin = 0; this.mobSpeed = 0.35; this.mobBoost = 0;
    this.placedCount = 0;

    // background (baked per view size in onLayout)
    this.bg = this.world.add(new Node({ ax: 0, ay: 0 }));
    // stage: all room content in C-space, transformed by the camera
    const st = this.stage = this.world.add(new Node());
    const sp = (key, o) => st.add(new Node({ ax: 0, ay: 0, ...o }).setImage(S[key]));

    this.windowNode = sp('window', L.window);
    this.windowNode.drawFn = (ctx) => this.drawWindowLife(ctx);
    sp('frame', { x: L.frame.x, y: L.frame.y, ax: 0.5, ay: 0.5 });
    this.mobile = st.add(new Node({ x: L.mobile.x, y: L.mobile.y, drawFn: ctx => this.drawMobile(ctx) }));
    sp('shelf', L.shelf);
    sp('shelfTop', L.shelfTop);
    this.lamp = sp('lamp', { x: L.lamp.x, y: L.lamp.y, ax: 0.5, ay: 1 });
    this.glow = st.add(new Node({ drawFn: ctx => this.drawLampGlow(ctx) }));
    sp('rug', { x: L.rug.x, y: L.rug.y, ax: 0.5, ay: 0.5 });

    this.mom = st.add(await createCharacter('mom'));
    Object.assign(this.mom, { x: L.mom.x, y: L.mom.y, sx: L.mom.s, sy: L.mom.s });
    this.mom.interactive = true;
    sp('stool', L.stool);
    sp('cribBack', L.cribBack);
    this.layers = {};
    this.layers.back = st.add(new Node());
    this.baby = st.add(await createCharacter('baby'));
    Object.assign(this.baby, { x: L.baby.x, y: L.baby.y, sx: L.baby.s, sy: L.baby.s, rot: L.baby.rot });
    this.baby.interactive = true;
    this.layers.front = st.add(new Node());
    sp('cribFront', L.cribFront);
    this.layers.top = st.add(new Node());
    this.shadowLayer = st.add(new Node());
    this.itemLayer = st.add(new Node());
    this.fxLayer = st.add(new Node());

    // full-view dim for the "lights out" moment, then a top stage layer (moonbeam, Zzz, notes, hint hand)
    this.dim = this.world.add(new Node({ drawFn: ctx => this.drawDim(ctx) }));
    this.top = this.world.add(new Node());
    this.beam = this.top.add(new Node({ drawFn: ctx => this.drawBeam(ctx) }));
    this.topFx = this.top.add(new Node());
    this.hand = this.top.add(new Node({ ax: 58 / 130, ay: 10 / 160, alpha: 0, rot: -0.35 }).setImage(S.hand));

    // tap targets for little delights (not draggable)
    const mobHit = this.mobile.add(new Node({ y: L.mobile.ring + 40, w: 300, h: 200, interactive: true }));
    mobHit.tapKind = 'mobile';
    const p = WINDOW.pane;
    const winHit = this.windowNode.add(new Node({ x: p.x + p.w / 2, y: p.y + p.h / 2, w: p.w, h: p.h, interactive: true }));
    winHit.tapKind = 'window';
    this.lamp.interactive = true; this.lamp.hitPad = 10; this.lamp.tapKind = 'lamp';

    // items + their silhouettes
    this.items = DEFS.map((d, i) => this.makeItem(d, i));

    // dust motes in the lamp light, twinkle phases
    const r = rng(12);
    this.motes = Array.from({ length: 18 }, () => ({ a: r() * 6.28, d: 40 + r() * 230, sp: 0.05 + r() * 0.12, ph: r() * 6.28, s: 1.2 + r() * 2.2, vy: 3 + r() * 6 }));
    this.shoot = { t: -1, next: 4 + r() * 4 };

    // progress pips (UI) on a little paper tab
    this.pipBar = this.uiLayer.add(new Node({ alpha: 0, drawFn: ctx => {
      const w = DEFS.length * 66 + 34, h = 78;
      ctx.save();
      ctx.fillStyle = 'rgba(90,50,40,0.16)'; ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -h / 2 + 6, w, h, 39); ctx.fill();
      ctx.fillStyle = '#fff8ee'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 39); ctx.fill();
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 3.2; ctx.stroke();
      ctx.restore();
    } }));
    this.pips = DEFS.map((d, i) => {
      const n = this.uiLayer.add(new Node({ alpha: 0 }).setImage(S.pipEmpty));
      n.fill = n.add(new Node({ alpha: 0, sx: 0.2, sy: 0.2 }).setImage(S.pipFull));
      return n;
    });

    game.onUpdate((dt, t) => this.tick(dt, t));
  }

  makeItem(d, i) {
    const S = this.S, def = ITEMS[d.key];
    const hx = L.shelf.x + d.home.cx, hy = L.shelf.y + d.home.floor - (d.foot - def.h / 2) * d.home.s;
    const sil = this.layers[d.layer].add(new Node({ x: d.slot.x, y: d.slot.y, rot: d.slot.rot, alpha: 0 }).setImage(S['sil_' + d.key]));
    const shadow = this.shadowLayer.add(new Node({ alpha: 0 }).setImage(S['shadow_' + d.key]));
    const glow = this.shadowLayer.add(new Node({ alpha: 0, composite: 'lighter' }).setImage(S['glow_' + d.key]));
    const n = this.itemLayer.add(new Node({ x: hx, y: hy, sx: 0, sy: 0, rot: (i % 2 ? 0.05 : -0.04) }).setImage(S['item_' + d.key]));
    n.interactive = n.draggable = true;
    n.hitPad = Math.max(18, (130 - Math.min(def.w, def.h) * d.home.s) / 2);
    n.home = { x: hx, y: hy, rot: n.rot, sx: d.home.s, sy: d.home.s };
    const it = { ...d, def, node: n, sil, shadow, glow, placed: false, silS: 1, lift: 0, glowK: 0, raw: { x: hx, y: hy }, prev: { x: hx, y: hy }, vx: 0, dragging: false, i };
    n.item = it;
    return it;
  }

  // ---------------------------------------------------------------- layout / background
  onLayout(v) {
    this.ox = (v.w - 1600) / 2; this.oy = (v.h - 900) / 2;
    const key = v.w.toFixed(0) + 'x' + v.h.toFixed(0);
    if (this.bgKey !== key) { this.bgKey = key; this.bg.setImage(this.bakeBackground(v)); }
    this.applyCam();
    const n = this.pips.length;
    const bw = n * 66 + 34, bx = v.w - 56 - bw / 2;
    this.pips.forEach((p, i) => { p.x = bx + (i - (n - 1) / 2) * 66; p.y = 72; p.sx = p.sy = 0.72; });
    this.pipBar.x = bx; this.pipBar.y = 70;
  }

  applyCam() {
    if (this.ox === undefined) return;
    const c = this.cam, s = this.stage;
    s.sx = s.sy = c.s;
    s.x = this.ox + c.fx * (1 - c.s) + c.dx; s.y = this.oy + c.fy * (1 - c.s) + c.dy;
    // top layer mirrors the stage transform
    this.top.x = s.x; this.top.y = s.y; this.top.sx = this.top.sy = c.s;
  }

  bakeBackground(v) {
    const S = this.S, ox = this.ox, oy = this.oy;
    return canvasSprite(v.w, v.h, (x, w, h) => {
      const fy = oy + FLOOR_Y, r = rng(3);
      const wob = (pts, lw, col, alpha = 1) => {
        x.save(); x.globalAlpha = alpha; x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
        x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px + (r() - 0.5) * 1.6, py + (r() - 0.5) * 1.6) : x.moveTo(px, py))); x.stroke(); x.restore();
      };
      const hline = (x0, x1, y, lw, col, a, step = 24) => { const pts = []; for (let px = x0; px <= x1 + step; px += step) pts.push([Math.min(px, x1), y + Math.sin(px * 0.013) * 1.2]); wob(pts, lw, col, a); };
      // wall
      let g = x.createLinearGradient(0, 0, 0, fy);
      g.addColorStop(0, '#f1c9b2'); g.addColorStop(0.55, C.wall); g.addColorStop(1, C.wallHi);
      x.fillStyle = g; x.fillRect(0, 0, w, fy);
      const T = 180, tx0 = ((ox % T) + T) % T - T, ty0 = ((oy % T) + T) % T - T;
      for (let ty = ty0; ty < oy + 470; ty += T) for (let tx = tx0; tx < w; tx += T) x.drawImage(S.wallpaper.img, tx, ty, T, T);
      // wainscot
      const wy = oy + 470;
      x.fillStyle = C.wains; x.fillRect(0, wy, w, fy - wy);
      for (let px = ((ox % 64) + 64) % 64; px < w; px += 64) {
        x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(px + 6, wy + 14, 5, fy - wy - 26);
        wob([[px, wy + 12], [px, fy - 10]], 2, C.wainsShade, 0.9);
      }
      x.fillStyle = 'rgba(120,150,130,0.18)'; x.fillRect(0, fy - 34, w, 24);
      // chair rail
      x.fillStyle = C.cream; x.fillRect(0, wy - 8, w, 20);
      x.fillStyle = C.creamShade; x.fillRect(0, wy + 6, w, 6);
      hline(0, w, wy - 8, 2.4, PAL.line, 0.8); hline(0, w, wy + 12, 2.2, PAL.line, 0.7);
      // floor
      g = x.createLinearGradient(0, fy, 0, h);
      g.addColorStop(0, C.floorShade); g.addColorStop(0.12, C.floor); g.addColorStop(1, '#cf9564');
      x.fillStyle = g; x.fillRect(0, fy, w, h - fy);
      let py = fy + 10, gap = 34, row = 0;
      while (py < h) {
        hline(0, w, py, 2.2, C.floorLine, 0.55);
        x.fillStyle = 'rgba(255,240,220,0.18)'; x.fillRect(0, py + 3, w, 3);
        const seg = 260 + row * 30, off = (row * 137) % seg;
        for (let px = ((ox + off) % seg + seg) % seg; px < w; px += seg) wob([[px, py + 2], [px + 1, py + gap - 2]], 2, C.floorLine, 0.5);
        for (let k = 0; k < w / 90; k++) { const sx0 = r() * w, sy0 = py + 6 + r() * (gap - 12); wob([[sx0, sy0], [sx0 + 30 + r() * 50, sy0 + (r() - 0.5) * 3]], 1.6, '#c58a58', 0.35); }
        py += gap; gap *= 1.16; row++;
      }
      // baseboard
      x.fillStyle = C.cream; x.fillRect(0, fy - 18, w, 22);
      x.fillStyle = C.creamShade; x.fillRect(0, fy - 2, w, 6);
      hline(0, w, fy - 18, 2.4, PAL.line, 0.8); hline(0, w, fy + 4, 2.2, PAL.line, 0.6);
      // soft contact shadow where floor meets wall
      g = x.createLinearGradient(0, fy + 4, 0, fy + 40); g.addColorStop(0, 'rgba(110,60,40,0.22)'); g.addColorStop(1, 'rgba(110,60,40,0)');
      x.fillStyle = g; x.fillRect(0, fy + 4, w, 36);
      // paper grain
      for (let gy = 0; gy < h; gy += 256) for (let gx = 0; gx < w; gx += 256) x.drawImage(S.grain.img, gx, gy, 256, 256);
      // warm dusk vignette
      g = x.createRadialGradient(w / 2, oy + 420, 200, w / 2, oy + 420, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(255,230,200,0)'); g.addColorStop(1, 'rgba(120,70,70,0.32)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
  }

  // ---------------------------------------------------------------- intro
  async enter() {
    audio.music('level');
    this.drag.enabled = false;
    const c = this.cam; c.s = 1.14; c.fx = 800; c.fy = 560; c.dy = 20; this.applyCam();
    tween(c, { s: 1, dy: 0 }, { dur: 2.0, ease: 'inOutCubic' });
    const mom = this.mom, mx = mom.x;
    mom.x = mx - 260; mom.alpha = 0;
    tween(mom, { alpha: 1 }, { dur: 0.3, delay: 0.2 });
    tween(mom, { x: mx }, { dur: 1.1, delay: 0.2, ease: 'outCubic' });
    tween(this.pipBar, { alpha: 1 }, { dur: 0.4, delay: 1.5 });
    this.pips.forEach((p, i) => tween(p, { alpha: 1 }, { dur: 0.4, delay: 1.6 + i * 0.06 }));
    await wait(0.75);
    if (this.finaleStarted) return;
    this.items.forEach((it, i) => {
      if (it.placed) return;
      const n = it.node;
      tween(n, { sx: n.home.sx, sy: n.home.sy }, { dur: 0.55, delay: i * 0.13, ease: 'outBack', tag: 'drag' }).then(() => { if (!it.placed) audio.sfx('pop'); });
    });
    await wait(0.55);
    if (this.finaleStarted) return;
    mom.talk(2.6); mom.react('happy', 2.2);
    audio.voice('Ayo bantu Ibu siapkan Bintang tidur!');
    mom.lookAt(...this.w(L.shelf.x + 200, L.shelf.y + 200));
    this.items.forEach((it, i) => {
      if (it.placed) return;
      it.silS = 1.3;
      tween(it.sil, { alpha: 1 }, { dur: 0.3, delay: 0.25 + i * 0.16 });
      tween(it, { silS: 1 }, { dur: 0.5, delay: 0.25 + i * 0.16, ease: 'outBack' });
    });
    await wait(1.0);
    if (this.finaleStarted) return;
    this.drag.enabled = true; this.introDone = true;
    await wait(1.0);
    if (!this.dragItem && !this.finaleStarted) mom.lookAt(...this.w(L.baby.x, L.baby.y - 120));
  }

  /** C-space -> world (design) coordinates, for lookAt. */
  w(x, y) { const p = this.stage.toWorld(x, y); return [p.x, p.y]; }

  // ---------------------------------------------------------------- input
  pointerDown(p) {
    this.idle = 0; this.hideHint();
    super.pointerDown(p);
  }

  onTap(n) {
    const S = this.stage;
    if (n === this.baby) {
      audio.sfx('giggle'); this.baby.react('happy', 1.2);
      const hp = this.baby.toWorld(0, -170); const lp = S.toLocal(hp.x, hp.y);
      burst(this.fxLayer, lp.x, lp.y, 'hearts', { count: 6 });
    } else if (n === this.mom) {
      this.mom.react('happy', 1.2); this.mom.talk(0.8); audio.sfx('giggle');
    } else if (n.tapKind === 'mobile') {
      this.mobBoost = 3.5; audio.sfx('star');
    } else if (n.tapKind === 'window') {
      this.shoot.t = 0; audio.sfx('sparkle');
    } else if (n.tapKind === 'lamp') {
      audio.sfx('pop');
      tween(this.lamp, { sy: 0.9, sx: 1.06 }, { dur: 0.08 }).then(() => tween(this.lamp, { sy: 1, sx: 1 }, { dur: 0.5, ease: 'outElastic' }));
      tween(this, { lampK: 1.6 }, { dur: 0.1 }).then(() => tween(this, { lampK: this.finaleStarted ? 0.35 : 1 }, { dur: 0.6 }));
    }
  }

  onPick(n) {
    const it = n.item; if (!it || it.placed) return;
    killTweensOf(n); killTweensOf(it);
    it.dragging = true; this.dragItem = it;
    it.raw = { x: n.x, y: n.y }; it.prev = { ...it.raw };
    tween(n, { sx: 1.1, sy: 1.1 }, { dur: 0.22, ease: 'outBack' });
    tween(it, { lift: 1 }, { dur: 0.2, ease: 'outQuad' });
    audio.sfx('pick');
    this.mom.lookAt(...this.w(n.x, n.y));
    this.mom.setMood?.('idle');
    tween(it, { silS: 1.08 }, { dur: 0.25, ease: 'outBack' });
  }

  onMove(n) {
    const it = n.item; if (!it || !it.dragging) return;
    it.raw = { x: n.x, y: n.y };
    this.positionDragged(it);
  }

  positionDragged(it) {
    const n = it.node, raw = it.raw, s = it.slot;
    const d = Math.hypot(raw.x - s.x, raw.y - s.y + 0);
    const k = d < MAGNET_R ? Math.pow(1 - d / MAGNET_R, 1.6) * 0.45 : 0;
    it.magnet = k;
    n.x = raw.x + (s.x - raw.x) * k;
    n.y = raw.y - 26 * it.lift + (s.y - raw.y) * k;
  }

  onDrop(n, p, moved) {
    const it = n.item; if (!it || it.placed) return true;
    it.dragging = false; this.dragItem = null;
    tween(it, { silS: 1 }, { dur: 0.3 });
    const s = it.slot, d = Math.hypot(it.raw.x - s.x, it.raw.y - s.y);
    if (d < SNAP_R || (it.magnet || 0) > 0.12) { this.place(it); return true; }
    if (!moved) { // a tap: show where it goes
      this.goHome(it, false);
      tween(it, { silS: 1.18 }, { dur: 0.18 }).then(() => tween(it, { silS: 1 }, { dur: 0.6, ease: 'outElastic' }));
      this.mom.lookAt(...this.w(s.x, s.y));
      return true;
    }
    // near another silhouette or over the crib = a real wrong guess -> Ibu thinks
    const nearOther = this.items.some(o => o !== it && !o.placed && Math.hypot(it.raw.x - o.slot.x, it.raw.y - o.slot.y) < SNAP_R * 1.1);
    const overCrib = it.raw.x > 330 && it.raw.x < 1180 && it.raw.y > 360 && it.raw.y < 800;
    this.goHome(it, nearOther || overCrib);
    return true;
  }

  goHome(it, wrong) {
    const n = it.node, h = n.home;
    tween(it, { lift: 0 }, { dur: 0.4 });
    if (wrong) {
      audio.sfx('wrong');
      this.mom.react('think', 1.4); this.mom.lookAt(...this.w(n.x, n.y));
      // little "no-no" shake before flying back
      const r0 = n.rot;
      tween(n, { rot: r0 + 0.25 }, { dur: 0.07, tag: 'drag' })
        .then(() => tween(n, { rot: r0 - 0.25 }, { dur: 0.1, tag: 'drag' }))
        .then(() => tween(n, { rot: r0 + 0.12 }, { dur: 0.08, tag: 'drag' }))
        .then(() => this.flyHome(it));
    } else { audio.sfx('drop'); this.flyHome(it); }
  }

  flyHome(it) {
    const n = it.node, h = n.home;
    if (it.placed || it.dragging) return;
    tween(n, { x: h.x, y: h.y, rot: h.rot, sx: h.sx, sy: h.sy }, { dur: 0.55, ease: 'outBack', tag: 'drag' }).then(() => {
      if (it.placed || it.dragging) return;
      tween(n, { sx: h.sx * 1.12, sy: h.sy * 0.88 }, { dur: 0.07, tag: 'drag' }).then(() => tween(n, { sx: h.sx, sy: h.sy }, { dur: 0.45, ease: 'outElastic', tag: 'drag' }));
    });
    setTimeout(() => { if (!this.dragItem && !this.finaleStarted) this.mom.lookAt(null); }, 900);
  }

  place(it, instant = false) {
    const n = it.node, s = it.slot, layer = this.layers[it.layer];
    it.placed = true; it.dragging = false; it.lift = 0; it.glowK = 0;
    n.interactive = n.draggable = false;
    killTweensOf(n); killTweensOf(it); killTweensOf(it.sil);
    // move the item (and its shadow) into its depth layer — same transform, so coordinates are unchanged
    layer.add(it.shadow); layer.add(n); it.glow.alpha = 0;
    this.placedCount++;
    const pip = this.pips[this.placedCount - 1];
    if (instant) {
      Object.assign(n, { x: s.x, y: s.y, rot: s.rot, sx: 1, sy: 1 }); it.sil.alpha = 0;
      if (pip) { pip.alpha = 1; Object.assign(pip.fill, { alpha: 1, sx: 1, sy: 1 }); }
      return;
    }
    tween(n, { x: s.x, y: s.y, rot: s.rot, sx: 1.06, sy: 1.06 }, { dur: 0.14, ease: 'outQuad' }).then(() => {
      tween(n, { sx: 1.16, sy: 0.84 }, { dur: 0.07 }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.6, ease: 'outElastic' }));
      this.itemFlourish(it);
    });
    tween(it.sil, { alpha: 0, sx: 1.25, sy: 1.25 }, { dur: 0.35, ease: 'outQuad' });
    audio.sfx('snap'); setTimeout(() => audio.sfx('sparkle'), 90);
    burst(this.fxLayer, s.x, s.y, 'sparkle', { count: 14 });
    setTimeout(() => burst(this.fxLayer, s.x, s.y - 20, 'stars', { count: 6 }), 120);
    if (pip) {
      pip.fill.alpha = 1;
      tween(pip.fill, { sx: 1.35, sy: 1.35 }, { dur: 0.2, ease: 'outBack', delay: 0.25 }).then(() => tween(pip.fill, { sx: 1, sy: 1 }, { dur: 0.4, ease: 'outElastic' }));
      setTimeout(() => { audio.sfx('star'); burst(this.uiLayer, pip.x, pip.y, 'sparkle', { count: 8 }); }, 260);
    }
    const done = this.items.every(o => o.placed);
    this.mom.react('cheer', done ? 1.8 : 1.3); this.mom.lookAt(...this.w(s.x, s.y));
    this.baby.react('happy', 1.3); setTimeout(() => audio.sfx('giggle'), 300);
    setTimeout(() => { if (!this.dragItem && !this.finaleStarted) this.mom.lookAt(...this.w(L.baby.x, L.baby.y - 120)); }, 1300);
    if (done) this.finale();
  }

  itemFlourish(it) {
    const n = it.node, r0 = it.slot.rot;
    if (it.key === 'rattle') { // shake shake
      let p = Promise.resolve();
      for (let k = 0; k < 4; k++) p = p.then(() => tween(n, { rot: r0 + (k % 2 ? -0.22 : 0.22) * (1 - k / 5) }, { dur: 0.08 }));
      p.then(() => tween(n, { rot: r0 }, { dur: 0.2 }));
    } else if (it.key === 'teddy') {
      tween(n, { rot: r0 + 0.12 }, { dur: 0.15, delay: 0.2 }).then(() => tween(n, { rot: r0 }, { dur: 0.6, ease: 'outElastic' }));
    }
  }

  // ---------------------------------------------------------------- hint
  showHint() {
    const it = this.items.find(o => !o.placed); if (!it) return;
    this.hinting = true;
    const h = this.hand, n = it.node, s = it.slot;
    killTweensOf(h);
    h.x = n.x + 30; h.y = n.y + 30; h.alpha = 0; h.sx = h.sy = 0.8;
    this.mom.lookAt(...this.w(n.x, n.y));
    tween(h, { alpha: 1, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outBack' })
      .then(() => tween(h, { sx: 0.88, sy: 0.88, y: h.y + 6 }, { dur: 0.15 }))
      .then(() => {
        if (!this.hinting) return;
        tween(it, { glowK: 1 }, { dur: 0.25 });
        const r0 = n.rot;
        tween(n, { rot: r0 + 0.14 }, { dur: 0.1, tag: 'drag' }).then(() => tween(n, { rot: r0 - 0.1 }, { dur: 0.12, tag: 'drag' })).then(() => tween(n, { rot: r0 }, { dur: 0.4, ease: 'outElastic', tag: 'drag' }));
        return tween(h, { sx: 1, sy: 1 }, { dur: 0.2 });
      })
      .then(() => {
        if (!this.hinting) return;
        const x0 = h.x, y0 = h.y, x1 = s.x + 20, y1 = s.y + 20;
        return tween({ k: 0 }, { k: 1 }, { dur: 1.3, ease: 'inOutSine', onUpdate: (e) => {
          if (!this.hinting) return;
          h.x = lerp(x0, x1, e); h.y = lerp(y0, y1, e) - Math.sin(e * Math.PI) * 140;
        } });
      })
      .then(() => {
        if (!this.hinting) return;
        this.mom.lookAt(...this.w(s.x, s.y));
        tween(it, { silS: 1.2 }, { dur: 0.18 }).then(() => tween(it, { silS: 1 }, { dur: 0.6, ease: 'outElastic' }));
        return wait(0.6);
      })
      .then(() => { this.hideHint(); });
  }
  hideHint() {
    if (!this.hinting) return;
    this.hinting = false; this.idle = 0;
    killTweensOf(this.hand);
    tween(this.hand, { alpha: 0 }, { dur: 0.25 });
    for (const it of this.items) tween(it, { glowK: 0 }, { dur: 0.3 });
  }

  // ---------------------------------------------------------------- finale
  async finale() {
    if (this.finaleStarted) return;
    this.finaleStarted = true; this.drag.enabled = false; this.introDone = true;
    this.hideHint();
    await wait(0.9);
    this.mom.react('cheer', 1.6); this.mom.talk(1.8); audio.sfx('cheer');
    audio.voice('Selamat tidur, Bintang!');
    burst(this.fxLayer, L.baby.x, L.baby.y - 160, 'hearts', { count: 8 });
    await wait(1.2);
    // lights down, moon up, music box starts
    tween(this, { dimK: 1 }, { dur: 2.4, ease: 'inOutSine' });
    tween(this, { lampK: 0.4 }, { dur: 2.4, ease: 'inOutSine' });
    tween(this, { beamK: 1 }, { dur: 2.8, ease: 'inOutSine' });
    tween(this, { mobSpeed: 1.3 }, { dur: 1.5, ease: 'inOutSine' });
    this.lullaby = true; this.noteT = 0; this.noteI = 0;
    this.mom.setMood('idle'); this.mom.lookAt(...this.w(L.baby.x, L.baby.y - 120));
    await wait(1.0);
    this.baby.setMood('sleep');
    tween(this.baby, { rot: L.baby.rot - 0.12 }, { dur: 1.8, ease: 'inOutSine' });
    this.zzz = true; this.zT = 0.2;
    burst(this.fxLayer, L.baby.x - 40, L.baby.y - 190, 'stars', { count: 8 });
    tween(this.cam, { s: 1.07, fx: 780, fy: 560 }, { dur: 3.2, ease: 'inOutSine' });
    await wait(3.4);
    this.complete();
  }

  complete() {
    for (const n of [this.pipBar, ...this.pips]) tween(n, { alpha: 0 }, { dur: 0.4 });
    return super.complete();
  }

  debugSolve(n = Infinity) {
    const list = this.items.filter(o => !o.placed);
    const k = Math.min(n, list.length);
    for (let i = 0; i < k; i++) {
      const it = list[i];
      it.sil.alpha = 0;
      this.place(it, true);
    }
    // make sure the remaining items are visible even if the intro is still running
    for (const it of this.items) if (!it.placed) { killTweensOf(it.node); Object.assign(it.node, { sx: it.node.home.sx, sy: it.node.home.sy }); killTweensOf(it.sil); killTweensOf(it); it.sil.alpha = 1; it.silS = 1; }
    this.pips.forEach(p => { killTweensOf(p); p.alpha = 1; }); killTweensOf(this.pipBar); this.pipBar.alpha = 1;
    if (this.items.every(o => o.placed)) this.finale();
    else { this.drag.enabled = true; this.introDone = true; }
  }

  // ---------------------------------------------------------------- per frame
  tick(dt, t) {
    this.t = t;
    this.mobSpin += dt * (this.mobSpeed + this.mobBoost);
    this.mobBoost = Math.max(0, this.mobBoost - dt * 1.6);
    this.mobile.rot = Math.sin(t * 0.7) * 0.025 + Math.sin(t * 1.9) * 0.008;
    if (this.cam) this.applyCam();

    for (const it of this.items) {
      const n = it.node;
      if (it.dragging) {
        this.positionDragged(it);
        const vx = (it.raw.x - it.prev.x) / Math.max(dt, 1e-3);
        it.prev = { ...it.raw };
        it.vx = lerp(it.vx, vx, Math.min(1, dt * 10));
        const target = clamp(it.vx * 0.00045, -0.38, 0.38) + Math.sin(t * 6) * 0.025;
        n.rot = lerp(n.rot, target, Math.min(1, dt * 12));
        it.glowK = lerp(it.glowK, (it.magnet || 0) > 0.05 ? 0.9 : 0, Math.min(1, dt * 8));
      }
      // shadow follows the item, offset by "height"
      const sh = it.shadow, lift = it.lift;
      if (it.placed) { sh.x = n.x + 3; sh.y = n.y + 6; sh.rot = n.rot; sh.sx = n.sx; sh.sy = n.sy; sh.alpha = 0.16; }
      else {
        sh.x = n.x + 6 + lift * 22; sh.y = n.y + 7 + lift * 30; sh.rot = n.rot; sh.sx = n.sx * (1 - lift * 0.04); sh.sy = n.sy * (1 - lift * 0.04);
        sh.alpha = (n.sx > 0.05 ? 1 : 0) * (0.2 + lift * 0.06);
      }
      const gl = it.glow;
      gl.x = n.x; gl.y = n.y; gl.rot = n.rot; gl.sx = n.sx; gl.sy = n.sy;
      gl.alpha = it.placed ? 0 : it.glowK * (0.75 + Math.sin(t * 8) * 0.25);
      // silhouettes breathe gently so they read as "put me here"
      if (!it.placed) it.sil.sx = it.sil.sy = it.silS * (1 + Math.sin(t * 2.4 + it.i * 1.3) * 0.025);
    }

    // idle hint
    if (this.introDone && !this.finaleStarted && !this.dragItem) {
      this.idle += dt;
      if (this.idle > 6 && !this.hinting) this.showHint();
    }

    // shooting star timer
    const sh = this.shoot;
    if (sh.t >= 0) { sh.t += dt; if (sh.t > 1.1) { sh.t = -1; sh.next = 7 + Math.random() * 6; } }
    else { sh.next -= dt; if (sh.next <= 0) sh.t = 0; }

    // dust motes drift
    for (const m of this.motes) { m.a += m.sp * dt; m.ph += dt; }

    // lullaby notes + Zzz
    if (this.lullaby) {
      this.noteT -= dt;
      if (this.noteT <= 0) {
        this.noteT = 0.62;
        const step = MELODY[this.noteI % MELODY.length]; this.noteI++;
        audio.sfx('star', { pitch: step, volume: 0.5 });
        this.floater(this.S.note, L.mobile.x + rand(-150, 150), L.mobile.ring + 150, { rise: 170, dur: 2.6, s: rand(0.85, 1.1), sway: 30 });
      }
    }
    if (this.zzz) {
      this.zT -= dt;
      if (this.zT <= 0) {
        this.zT = 1.15;
        const hp = this.baby.toWorld(0, -190), lp = this.stage.toLocal(hp.x, hp.y);
        this.floater(this.S.z, lp.x + 90, lp.y - 20, { rise: 150, dx: 70, dur: 2.6, s: rand(0.55, 0.8), sway: 14 });
      }
    }
  }

  floater(sprite, x, y, o) {
    const n = this.topFx.add(new Node({ x, y, alpha: 0, sx: o.s * 0.4, sy: o.s * 0.4, rot: rand(-0.2, 0.2) }).setImage(sprite));
    const x0 = x, ph = Math.random() * 6;
    tween(n, { alpha: 1, sx: o.s, sy: o.s }, { dur: 0.4, ease: 'outBack' });
    tween({ k: 0 }, { k: 1 }, { dur: o.dur, ease: 'linear', onUpdate: (e, k) => {
      n.y = y - o.rise * k; n.x = x0 + (o.dx || 0) * k + Math.sin(k * 6 + ph) * o.sway;
      if (k > 0.65) n.alpha = (1 - k) / 0.35;
    } }).then(() => n.removeSelf());
  }

  // ---------------------------------------------------------------- draw helpers
  drawWindowLife(ctx) {
    const p = WINDOW.pane, t = this.t || 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    for (let i = 0; i < WINDOW.twinkles.length; i++) {
      const [x, y, s] = WINDOW.twinkles[i];
      const k = 0.5 + 0.5 * Math.sin(t * (1.3 + i * 0.37) + i * 2.1);
      const r = (3 + 5 * s) * (0.6 + 0.5 * k);
      ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.fillStyle = '#fff6d2';
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    }
    const sh = this.shoot;
    if (sh && sh.t >= 0) {
      const k = sh.t / 1.1, x = p.x + p.w * (0.95 - k * 0.8), y = p.y + 30 + k * 110;
      const g = ctx.createLinearGradient(x, y, x + 70, y - 34);
      g.addColorStop(0, 'rgba(255,248,210,1)'); g.addColorStop(1, 'rgba(255,248,210,0)');
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70, y - 34); ctx.stroke();
      ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  drawMobile(ctx) {
    const S = this.S, t = this.t || 0, ring = L.mobile.ring, R = L.mobile.R, ry = R * 0.24;
    ctx.save();
    ctx.lineCap = 'round';
    // hanging string from the ceiling + three strings to the ring
    ctx.strokeStyle = 'rgba(91,85,82,0.75)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, -3000); ctx.lineTo(0, ring - 60);
    for (const a of [0.3, 2.4, 4.5]) { const ang = a + this.mobSpin; ctx.moveTo(0, ring - 60); ctx.lineTo(Math.cos(ang) * R, ring + Math.sin(ang) * ry); }
    ctx.stroke();
    ctx.fillStyle = C.coral; ctx.strokeStyle = PAL.line; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, ring - 60, 7, 0, 7); ctx.fill(); ctx.stroke();
    const N = ORN_KINDS.length, orns = [];
    for (let i = 0; i < N; i++) {
      const a = this.mobSpin + (i * Math.PI * 2) / N, d = Math.sin(a);
      orns.push({ i, x: Math.cos(a) * R, ry: d * ry, d, drop: 52 + (i % 2) * 34 });
    }
    orns.sort((a, b) => a.d - b.d);
    const drawRing = (front) => {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, ring, R, ry, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = C.wood; ctx.lineWidth = 5.5; ctx.stroke();
      ctx.restore();
    };
    const drawOrn = (o) => {
      const sc = 0.82 + 0.18 * (o.d + 1) / 2, y0 = ring + o.ry, y1 = y0 + o.drop;
      ctx.strokeStyle = 'rgba(91,85,82,0.6)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(o.x, y0); ctx.lineTo(o.x, y1 - ORN * 0.35 * sc); ctx.stroke();
      ctx.save();
      ctx.translate(o.x, y1); ctx.rotate(Math.sin(t * 1.4 + o.i * 1.7) * 0.14); ctx.scale(sc, sc);
      ctx.globalAlpha *= 0.8 + 0.2 * (o.d + 1) / 2;
      ctx.drawImage(S['orn_' + ORN_KINDS[o.i]].img, -ORN / 2, -ORN / 2, ORN, ORN);
      ctx.restore();
    };
    drawRing(false);
    for (const o of orns) if (o.d < 0) drawOrn(o);
    drawRing(true);
    for (const o of orns) if (o.d >= 0) drawOrn(o);
    ctx.restore();
  }

  drawLampGlow(ctx) {
    const t = this.t || 0, k = this.lampK * (0.94 + Math.sin(t * 2.1) * 0.03 + Math.sin(t * 5.3) * 0.015);
    const gx = L.lamp.x - LAMP.w / 2 + LAMP.glow.x, gy = L.lamp.y - LAMP.h + LAMP.glow.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 380);
    g.addColorStop(0, `rgba(255,214,140,${0.2 * k})`); g.addColorStop(0.3, `rgba(255,190,120,${0.07 * k})`); g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g; ctx.fillRect(gx - 440, gy - 440, 880, 880);
    // dust motes floating in the light
    ctx.fillStyle = '#fff3cf';
    for (const m of this.motes) {
      const x = gx + Math.cos(m.a) * m.d, y = gy + 60 + Math.sin(m.a * 1.3) * m.d * 0.7 - ((t * m.vy) % 60);
      const a = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(m.ph * 1.7))) * Math.min(1, k) * (1 - m.d / 300);
      ctx.globalAlpha = Math.max(0, a);
      ctx.beginPath(); ctx.arc(x, y, m.s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  drawDim(ctx) {
    if (this.dimK <= 0.001) return;
    const v = game.view, c = this.stage.toWorld(L.baby.x, L.baby.y - 60);
    ctx.save();
    const R = Math.max(v.w, v.h) * 0.62, k = this.dimK;
    const mix = (a) => `rgb(${Math.round(255 - (255 - 104) * a * k)},${Math.round(255 - (255 - 100) * a * k)},${Math.round(255 - (255 - 168) * a * k)})`;
    const g = ctx.createRadialGradient(c.x, c.y, 80, c.x, c.y, R);
    g.addColorStop(0, mix(0.25)); g.addColorStop(0.3, mix(0.7)); g.addColorStop(1, mix(1));
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.w, v.h);
    ctx.restore();
  }

  drawBeam(ctx) {
    if (this.beamK <= 0.001) return;
    const p = WINDOW.pane, wx = L.window.x + p.x, wy = L.window.y + p.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = this.beamK * (0.85 + Math.sin((this.t || 0) * 0.8) * 0.15);
    for (let k = 0; k < 4; k++) {
      const sp = k * 40, g = ctx.createLinearGradient(wx + p.w / 2, wy + p.h / 2, L.baby.x + 40, 780);
      g.addColorStop(0, 'rgba(170,180,255,0.07)'); g.addColorStop(1, 'rgba(170,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(wx + 20 + sp * 0.3, wy + 20); ctx.lineTo(wx + p.w - 20 - sp * 0.3, wy + 10);
      ctx.lineTo(L.baby.x + 260 - sp, 780); ctx.lineTo(L.baby.x - 200 + sp, 800); ctx.closePath(); ctx.fill();
    }
    // a soft pool of moonlight on the crib
    const r = ctx.createRadialGradient(L.baby.x, L.baby.y - 60, 10, L.baby.x, L.baby.y - 60, 300);
    r.addColorStop(0, 'rgba(200,205,255,0.20)'); r.addColorStop(1, 'rgba(200,205,255,0)');
    ctx.fillStyle = r; ctx.fillRect(L.baby.x - 300, L.baby.y - 360, 600, 600);
    ctx.restore();
  }
}

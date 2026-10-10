// Level 3 — "Foto Keluarga" (jigsaw). A wooden picture frame hangs on a warm wall above a sideboard; the family
// portrait is cut into a 3×2 jigsaw with real tab/blank shapes. Ibu and Ayah peek over the sideboard and react.
// Flow: frame shows the photo → it pops apart and the pieces fly to both sides → drag each piece into the frame
// (magnetic snap within ~95 units) → seams fade, camera flash, the photo comes alive → win.
import { Node } from '../engine/node.js';
import { tween, wait, Ease, killTweensOf, clamp, lerp } from '../engine/tween.js';
import { svgSprite } from '../engine/raster.js';
import { createCharacter, portraitSprite } from '../art/characters.js';
import { burst } from '../art/fx.js';
import { LevelScene, game, audio } from './base.js';
import * as A from '../art/props_level3.js';

const { L3 } = A;
const SNAP_R = 95;          // generous magnetic snap radius (design units)
const HINT_AFTER = 6;       // seconds of no interaction before a hint
const PHOTO_CY = 362;       // photo centre (content y, inside the central 1600×900)
const CHAR_SCALE = 0.54;
// home spot for each piece index (0..5) → scatter slot; L = left side top→bottom, R = right side
const HOME_OF = [3, 2, 0, 1, 5, 4];
const HOME_ROT = [-0.15, 0.11, -0.07, 0.13, -0.1, 0.08];

export default class Level3 extends LevelScene {
  static level = 3;
  static title = 'Foto Keluarga';

  async load() {
    await super.load();
    const geo = (this.geo = A.buildJigsaw(11));
    const [wall, garland, table, back, front, plant, lamp, portrait, mom, dad] = await Promise.all([
      svgSprite(A.wallSVG(PHOTO_CY), A.WALL_W, A.WALL_H, 'l3-wall'),
      svgSprite(A.garlandSVG(), A.GARLAND_W, A.GARLAND_H, 'l3-garland'),
      svgSprite(A.tableSVG(), A.TABLE_W, A.TABLE_H, 'l3-table'),
      svgSprite(A.frameBackSVG(), L3.FW, L3.FH, 'l3-frame-back'),
      svgSprite(A.frameFrontSVG(), L3.FW, L3.FH, 'l3-frame-front'),
      svgSprite(A.plantSVG(), 180, 250, 'l3-plant'),
      svgSprite(A.lampSVG(), 170, 270, 'l3-lamp'),
      portraitSprite(L3.PW, L3.PH),
      createCharacter('mom'),
      createCharacter('dad'),
    ]);
    this.portrait = portrait;
    const [ghost, pcs] = await Promise.all([A.ghostSprite(portrait, geo), A.pieceSprites(portrait, geo)]);

    const W = this.world;
    this.wallN = W.add(new Node({ ax: 0.5, ay: 0 }).setImage(wall));
    this.garlandN = W.add(new Node({ ax: 0.5, ay: 0 }).setImage(garland));

    // --- characters peek from behind the frame, over the sideboard
    this.charLayer = W.add(new Node());

    // --- frame group: origin = the nail, so wobbles swing like a hanging frame
    const C = L3.CENTER_FROM_NAIL;
    this.frameG = W.add(new Node());
    this.frameG.add(new Node({ ax: 0.5, ay: L3.NAIL_Y / L3.FH }).setImage(back));
    this.photoX = -L3.PW / 2; this.photoY = C - L3.PH / 2; // photo top-left in frame-local coords
    this.frameG.add(new Node({ x: 0, y: C }).setImage(ghost));
    this.glowLayer = this.frameG.add(new Node());
    this.placedLayer = this.frameG.add(new Node());
    this.fullPhoto = this.frameG.add(new Node({ x: 0, y: C, alpha: 0 }).setImage(portrait));
    this.fullPhoto.w = L3.PW; this.fullPhoto.h = L3.PH;
    this.glossK = -1;
    this.frameG.add(new Node({ drawFn: ctx => this.drawGloss(ctx) }));
    this.frameG.add(new Node({ ax: 0.5, ay: L3.NAIL_Y / L3.FH }).setImage(front));


    this.mom = this.charLayer.add(mom); this.dad = this.charLayer.add(dad);
    for (const c of [mom, dad]) { c.sx = c.sy = CHAR_SCALE; c.interactive = false; }
    this.charRise = 0;

    this.tableN = W.add(new Node({ ax: 0.5, ay: 0 }).setImage(table));
    this.plantN = W.add(new Node({ ax: 0.5, ay: 1 }).setImage(plant));
    this.lampN = W.add(new Node({ ax: 0.5, ay: 1 }).setImage(lamp));

    // --- pieces
    this.pieceLayer = W.add(new Node());
    this.pieces = geo.pieces.map((g, i) => {
      const sp = pcs[i];
      const n = new Node({ interactive: true, draggable: true, w: geo.cw, h: geo.ch, hitPad: 36, alpha: 0 });
      n.data = { i, c: g.c, r: g.r, slot: { x: this.photoX + g.gx, y: this.photoY + g.gy } };
      n.shadowImg = sp.shadow.img; n.lift = 0; n.placed = false; n.vx = 0;
      n.drawFn = (ctx, nd) => this.drawPieceShadow(ctx, nd);
      n.art = n.add(new Node().setImage(sp.img));
      n.glow = this.glowLayer.add(new Node({ x: n.data.slot.x, y: n.data.slot.y, alpha: 0 }).setImage(sp.glow));
      n.glowMag = 0;
      return this.pieceLayer.add(n);
    });

    this.fxLayer = W.add(new Node());
    this.flash = W.add(new Node({ alpha: 0, drawFn: ctx => this.drawFlash(ctx) }));
    this.flashK = 0;

    this.swing = { a: 0, v: 0 };
    this.introDone = false; this.introGen = 0;
    this.lastAct = 0; this.hintT = 0; this.hintPiece = null; this.hintIdx = 0;
    this.dragging = null; this.celebrating = false;
  }

  // ------------------------------------------------------------------------------------------- layout
  onLayout(v) {
    this.v = v;
    const cx = v.w / 2, ox = (v.w - 1600) / 2, oy = (v.h - 900) / 2;
    this.cx = cx; this.ox = ox; this.oy = oy;
    this.wallN.x = cx; this.wallN.y = oy - A.WALL_TOP;
    this.garlandN.x = cx; this.garlandN.y = oy * 0.35 + 2;
    this.frameG.x = cx; this.frameG.y = oy + PHOTO_CY - L3.CENTER_FROM_NAIL;
    this.tableN.x = cx; this.tableN.y = oy + A.TABLE_Y;
    this.plantN.x = cx - 905; this.plantN.y = oy + A.TABLE_Y + 22;
    this.lampN.x = cx + 905; this.lampN.y = oy + A.TABLE_Y + 22;
    this.charBase = { y: oy + A.TABLE_Y + 84 };
    this.mom.x = cx - 172; this.dad.x = cx + 178;
    this.placeChars();

    // scatter homes: three per side in a zig-zag, clear of the frame and the home button
    const half = L3.OW / 2, zl0 = ox + 40, zl1 = cx - half - 36, pw = this.geo.cw / 2 + 52;
    const outerL = zl0 + pw, innerL = zl1 - pw;
    const spots = [
      { x: outerL + 4, y: oy + 300 }, { x: innerL, y: oy + 512 }, { x: outerL + 14, y: oy + 722 },
      { x: 2 * cx - innerL, y: oy + 288 }, { x: 2 * cx - outerL - 6, y: oy + 500 }, { x: 2 * cx - innerL - 8, y: oy + 716 },
    ];
    this.pieces.forEach((n, i) => {
      const h = spots[HOME_OF[i]];
      n.home = { x: h.x, y: h.y, rot: HOME_ROT[i], sx: 1, sy: 1 };
      if (this.introDone && !n.placed && n !== this.dragging) { killTweensOf(n); killTweensOf(n, 'ret'); Object.assign(n, { x: h.x, y: h.y, rot: HOME_ROT[i], sx: 1, sy: 1 }); }
    });
  }
  placeChars() {
    if (!this.charBase) return;
    const k = this.charRise;
    this.mom.y = this.charBase.y + (1 - k) * 260;
    this.dad.y = this.charBase.y + 6 + (1 - Math.min(1, k * 1.08)) * 270;
  }

  slotWorld(n) { return this.frameG.toWorld(n.data.slot.x, n.data.slot.y); }

  // ------------------------------------------------------------------------------------------- intro
  enter() {
    audio.music('level');
    game.onUpdate((dt, t) => this.tick(dt, t));
    this.intro();
  }
  async intro() {
    const gen = ++this.introGen, alive = () => gen === this.introGen && !this.introDone;
    this.drag.enabled = false;
    this.fullPhoto.alpha = 1;
    this.frameG.sy = 1; this.swing.v = 0.22;          // frame swings in
    await wait(0.35); if (!alive()) return;
    tween(this, { charRise: 1 }, { dur: 0.6, ease: 'outBack', tag: 'intro' });
    audio.sfx('pop');
    await wait(0.45); if (!alive()) return;
    audio.voice('Ayo susun foto keluarga!');
    this.mom.talk?.(1.6); this.mom.react?.('happy', 1.6);
    this.dad.react?.('happy', 1.6);
    await wait(0.4); if (!alive()) return;
    // little anticipation shake, then the photo pops into pieces that fly to their homes
    tween(this.frameG, { sx: 1.04, sy: 0.97 }, { dur: 0.12, tag: 'intro' }).then(() => tween(this.frameG, { sx: 1, sy: 1 }, { dur: 0.4, ease: 'outElastic', tag: 'intro' }));
    this.swing.v += 0.12;
    await wait(0.16); if (!alive()) return;
    this.fullPhoto.alpha = 0;
    audio.sfx('whoosh');
    burst(this.fxLayer, this.cx, this.oy + PHOTO_CY, 'dust', { count: 10 });
    this.pieces.forEach((n, i) => {
      const s = this.slotWorld(n), h = n.home;
      Object.assign(n, { x: s.x, y: s.y, rot: 0, alpha: 1, sx: 1, sy: 1, lift: 0.6 });
      const sx = s.x, sy = s.y, cx = (sx + h.x) / 2, cy = Math.min(sy, h.y) - 170 - (i % 3) * 30;
      const spin = (h.x < this.cx ? -1 : 1) * Math.PI * 2;
      const o = { k: 0 };
      tween(o, { k: 1 }, {
        dur: 0.72, delay: 0.05 + i * 0.07, ease: 'inOutCubic', tag: 'intro',
        onUpdate: e => {
          const u = 1 - e;
          n.x = u * u * sx + 2 * u * e * cx + e * e * h.x;
          n.y = u * u * sy + 2 * u * e * cy + e * e * h.y;
          n.rot = h.rot * e + spin * e * (1 - e) * 0.18;
          n.sx = n.sy = 1 + Math.sin(e * Math.PI) * 0.14;
          n.lift = 0.6 + Math.sin(e * Math.PI) * 0.4 - e * 0.6;
        },
      }).then(() => { if (!alive()) return; tween(n, { sx: 1.08, sy: 0.92 }, { dur: 0.06 }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.35, ease: 'outElastic' })); });
      if (i % 2 === 0) setTimeout(() => alive() && audio.sfx('whoosh'), 80 + i * 70);
    });
    await wait(0.05 + 5 * 0.07 + 0.78); if (!alive()) return;
    this.finishIntro();
  }
  finishIntro() {
    if (this.introDone) return;
    this.introDone = true; this.introGen++;
    this.charRise = 1; this.placeChars();
    this.fullPhoto.alpha = this.celebrating ? this.fullPhoto.alpha : 0;
    for (const n of this.pieces) {
      if (n.placed) continue;
      killTweensOf(n); killTweensOf(n, 'intro');
      Object.assign(n, { x: n.home.x, y: n.home.y, rot: n.home.rot, sx: 1, sy: 1, alpha: 1, lift: 0 });
    }
    this.drag.enabled = !this.finished && !this.celebrating;
    this.lastAct = game.time;
  }

  // ------------------------------------------------------------------------------------------- per frame
  tick(dt, t) {
    // frame: damped spring swing around the nail + a tiny idle sway
    const s = this.swing;
    s.v += (-38 * s.a - 2.6 * s.v) * dt; s.a += s.v * dt;
    this.frameG.rot = s.a + Math.sin(t * 0.9) * 0.004;
    if (!this.introDone) this.placeChars();

    for (const n of this.pieces) {
      if (n.placed) { n.art.x = n.art.y = n.art.rot = 0; continue; }
      if (n === this.dragging) {
        // tilt with horizontal velocity
        const vx = (n.x - (n._px ?? n.x)) / Math.max(dt, 1e-3); n._px = n.x;
        n.vx = lerp(n.vx, vx, Math.min(1, dt * 10));
        const target = clamp(n.vx / 2600, -0.3, 0.3);
        n.rot += (target - n.rot) * Math.min(1, dt * 12);
        n.art.y = n.art.x = 0; n.art.rot = 0;
        // magnetic preview glow on its own slot
        const sw = this.slotWorld(n), d = Math.hypot(n.x - sw.x, n.y - sw.y);
        n.glowMag = lerp(n.glowMag, d < SNAP_R * 1.5 ? 0.75 : 0, Math.min(1, dt * 10));
      } else {
        n.glowMag = lerp(n.glowMag, 0, Math.min(1, dt * 8));
        n.art.y = Math.sin(t * 1.7 + n.data.i * 1.3) * 2.5;
        n.art.rot = 0;
      }
    }

    // hint: glow the slot and wiggle the matching piece
    if (this.introDone && !this.finished && !this.celebrating && !this.dragging && game.time - this.lastAct > HINT_AFTER) this.startHint();
    let hintA = 0;
    if (this.hintT > 0) {
      this.hintT -= dt;
      const env = Math.min(1, this.hintT / 0.4, (2.8 - this.hintT) / 0.3);
      const n = this.hintPiece;
      if (n && !n.placed && n !== this.dragging) {
        n.art.rot = env * Math.sin(t * 17) * 0.11;
        const sc = 1 + env * 0.05 * (0.5 + 0.5 * Math.sin(t * 8.5));
        n.art.sx = n.art.sy = sc;
        hintA = env * (0.55 + 0.4 * Math.sin(t * 7));
      }
      if (this.hintT <= 0) this.endHint();
    }
    for (const n of this.pieces) {
      if (n.placed) { n.glow.alpha = Math.max(0, n.glow.alpha - dt * 3); continue; }
      n.glow.alpha = Math.max(n.glowMag, n === this.hintPiece ? hintA : 0);
    }
  }
  startHint() {
    const cand = this.pieces.filter(p => !p.placed);
    this.lastAct = game.time + 2.8;
    if (!cand.length) return;
    const n = cand[this.hintIdx++ % cand.length];
    this.hintPiece = n; this.hintT = 2.8;
    audio.sfx('sparkle');
    const sw = this.slotWorld(n);
    this.mom.lookAt?.(n.x, n.y); this.dad.lookAt?.(n.x, n.y);
    setTimeout(() => { if (this.hintPiece === n) { this.mom.lookAt?.(sw.x, sw.y); this.dad.lookAt?.(sw.x, sw.y); } }, 1300);
    this.mom.react?.('think', 1.2);
  }
  endHint() {
    const n = this.hintPiece; this.hintT = 0; this.hintPiece = null;
    if (n) { n.art.rot = 0; n.art.sx = n.art.sy = 1; }
    this.mom.lookAt?.(null); this.dad.lookAt?.(null);
  }

  // ------------------------------------------------------------------------------------------- drawing
  drawPieceShadow(ctx, n) {
    const off = 5 + n.lift * 18, a = 0.55 + n.lift * 0.15, sc = 1 + n.lift * 0.05;
    const lx = off * Math.sin(n.rot) + n.art.x, ly = off * Math.cos(n.rot) + n.art.y * 0.3;
    const w = this.geo.SW * sc, h = this.geo.SH * sc;
    const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a;
    ctx.drawImage(n.shadowImg, lx - w / 2, ly - h / 2, w, h);
    ctx.globalAlpha = ga;
  }
  drawGloss(ctx) {
    const k = this.glossK; if (k < 0 || k > 1) return;
    const x0 = this.photoX, y0 = this.photoY, W = L3.PW, H = L3.PH;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
    const bx = x0 - 260 + (W + 520) * k;
    const g = ctx.createLinearGradient(bx - 90, 0, bx + 90, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(bx - 90, y0 - 10); ctx.lineTo(bx + 90, y0 - 10); ctx.lineTo(bx - 10, y0 + H + 10); ctx.lineTo(bx - 190, y0 + H + 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  drawFlash(ctx) {
    const v = this.v || game.view, k = this.flashK;
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, v.w, v.h);
    // starburst flare centred on the photo
    const cx = this.cx, cy = this.oy + PHOTO_CY, R = 260 + (1 - k) * 420;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(255,248,214,1)'); g.addColorStop(1, 'rgba(255,248,214,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }

  // ------------------------------------------------------------------------------------------- input
  onPick(n) {
    if (n.placed) return;
    killTweensOf(n); killTweensOf(n, 'drag'); killTweensOf(n, 'ret');
    this.dragging = n; n._px = n.x; n.vx = 0;
    if (this.hintPiece) this.endHint();
    this.lastAct = game.time;
    audio.sfx('pick');
    tween(n, { sx: 1.1, sy: 1.1, lift: 1 }, { dur: 0.2, ease: 'outBack', tag: 'drag' });
    this.mom.lookAt?.(n.x, n.y); this.dad.lookAt?.(n.x, n.y);
  }
  onMove(n) {
    this.mom.lookAt?.(n.x, n.y); this.dad.lookAt?.(n.x, n.y);
  }
  onDrop(n, p, moved) {
    this.dragging = null; this.lastAct = game.time;
    const sw = this.slotWorld(n);
    const d = Math.hypot(n.x - sw.x, n.y - sw.y);
    if (d < SNAP_R) { this.place(n); return true; }
    this.sendHome(n, moved);
    return true;
  }
  sendHome(n, moved) {
    const h = n.home;
    this.mom.lookAt?.(null); this.dad.lookAt?.(null);
    if (moved) {
      audio.sfx('wrong');
      const who = n.x < this.cx ? this.mom : this.dad;
      who.react?.('think', 1.3);
    } else audio.sfx('tap');
    const dist = Math.hypot(n.x - h.x, n.y - h.y), dur = clamp(0.35 + dist / 1800, 0.4, 0.75);
    tween(n, { lift: 0 }, { dur, tag: 'ret' });
    tween(n, { x: h.x, y: h.y, rot: h.rot, sx: 1, sy: 1 }, { dur, ease: 'outBack', tag: 'ret' }).then(() => {
      if (n.placed || n === this.dragging) return;
      tween(n, { sx: 1.07, sy: 0.93 }, { dur: 0.07, tag: 'ret' }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.45, ease: 'outElastic', tag: 'ret' }));
    });
  }
  place(n, instant = false) {
    if (n.placed) return;
    n.placed = true; n.interactive = false; n.draggable = false;
    killTweensOf(n); killTweensOf(n, 'drag'); killTweensOf(n, 'ret'); killTweensOf(n, 'intro');
    const lp = this.frameG.toLocal(n.x, n.y);
    const wr = n.rot;
    this.placedLayer.add(n);
    n.x = lp.x; n.y = lp.y; n.rot = wr - this.frameG.rot; n.alpha = 1;
    n.art.x = n.art.y = n.art.rot = 0; n.art.sx = n.art.sy = 1;
    const s = n.data.slot;
    if (this.hintPiece === n) this.endHint();
    if (instant) {
      Object.assign(n, { x: s.x, y: s.y, rot: 0, sx: 1, sy: 1, lift: 0 });
    } else {
      tween(n, { lift: 0 }, { dur: 0.2 });
      tween(n, { x: s.x, y: s.y, rot: 0, sx: 1, sy: 1 }, { dur: 0.2, ease: 'outCubic' }).then(() =>
        tween(n, { sx: 1.06, sy: 0.94 }, { dur: 0.07 }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.45, ease: 'outElastic' })));
      audio.sfx('snap');
      setTimeout(() => audio.sfx('sparkle'), 90);
      const w = this.frameG.toWorld(s.x, s.y);
      burst(this.fxLayer, w.x, w.y, 'sparkle', { count: 16 });
      this.ring(w.x, w.y);
      this.swing.v += (s.x < 0 ? -1 : 1) * 0.07;
      const left = s.x < 0;
      (left ? this.mom : this.dad).react?.('happy', 1.4);
      (left ? this.dad : this.mom).react?.('happy', 1.0);
      this.mom.lookAt?.(w.x, w.y); this.dad.lookAt?.(w.x, w.y);
      setTimeout(() => { this.mom.lookAt?.(null); this.dad.lookAt?.(null); }, 900);
    }
    if (this.pieces.every(p => p.placed)) this.celebrate(instant);
  }
  ring(x, y) {
    const r = this.fxLayer.add(new Node({ x, y, drawFn: (ctx, nd) => {
      ctx.strokeStyle = '#ffd95a'; ctx.lineWidth = 7 * (1 - nd.k) + 1; ctx.beginPath(); ctx.arc(0, 0, 40 + nd.k * 110, 0, Math.PI * 2); ctx.stroke();
    } }));
    r.k = 0;
    tween(r, { k: 1, alpha: 0 }, { dur: 0.5, ease: 'outCubic' }).then(() => r.removeSelf());
  }

  // ------------------------------------------------------------------------------------------- finish
  async celebrate(fast) {
    if (this.celebrating) return;
    this.celebrating = true; this.drag.enabled = false; this.endHint();
    const photo = { x: this.cx, y: this.oy + PHOTO_CY };
    await wait(fast ? 0.15 : 0.55);
    // seams fade into one seamless photo
    tween(this.fullPhoto, { alpha: 1 }, { dur: 0.7, ease: 'inOutSine' });
    audio.sfx('sparkle');
    this.mom.lookAt?.(photo.x, photo.y); this.dad.lookAt?.(photo.x, photo.y);
    await wait(0.85);
    // camera flash
    audio.sfx('pop');
    this.flash.alpha = 0.95; this.flashK = 0;
    tween(this, { flashK: 1 }, { dur: 0.7, ease: 'outCubic' });
    tween(this.flash, { alpha: 0 }, { dur: 0.7, ease: 'inQuad' });
    await wait(0.12);
    // the photo comes alive
    this.swing.v += 0.55;
    tween(this.frameG, { sx: 1.08, sy: 0.94 }, { dur: 0.12 }).then(() => tween(this.frameG, { sx: 1, sy: 1 }, { dur: 0.9, ease: 'outElastic' }));
    this.glossK = 0; tween(this, { glossK: 1.01 }, { dur: 0.9, delay: 0.2, ease: 'inOutSine' });
    audio.sfx('cheer');
    this.mom.react?.('cheer', 4); this.mom.setMood?.('cheer');
    setTimeout(() => { this.dad.react?.('cheer', 4); this.dad.setMood?.('cheer'); }, 120);
    for (const c of [this.mom, this.dad]) tween(c, { y: c.y - 30 }, { dur: 0.25, ease: 'outQuad' }).then(() => tween(c, { y: c.y + 30 }, { dur: 0.5, ease: 'outBounce' }));
    burst(this.fxLayer, photo.x, photo.y, 'hearts', { count: 12 });
    burst(this.fxLayer, photo.x - 330, photo.y - 200, 'confetti', { count: 26 });
    burst(this.fxLayer, photo.x + 330, photo.y - 200, 'confetti', { count: 26 });
    await wait(0.45);
    burst(this.fxLayer, this.mom.x, this.mom.y - 200, 'hearts', { count: 8 });
    burst(this.fxLayer, this.dad.x, this.dad.y - 220, 'hearts', { count: 8 });
    burst(this.fxLayer, photo.x, photo.y - 260, 'stars', { count: 14 });
    audio.sfx('star');
    await wait(1.2);
    this.complete();
  }

  debugSolve(n = Infinity) {
    this.finishIntro();
    const todo = this.pieces.filter(p => !p.placed);
    const k = Math.min(n, todo.length);
    for (let i = 0; i < k; i++) this.place(todo[i], true);
  }
}

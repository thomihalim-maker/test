// Level 3 — "Foto Keluarga" (jigsaw). A wooden picture frame hangs on a warm wall above a sideboard; the family
// portrait is cut into a 3×2 jigsaw with real tab/blank shapes. Ibu and Ayah stand behind the sideboard at both
// sides of the frame and react. Flow: the frame shows the photo → it pops apart and the pieces fly out (two per side,
// two resting on the counter) → drag each piece into the frame (magnetic snap within ~95 units) → seams fade,
// camera flash, the photo comes alive (live rigged characters inside the frame) → the frame settles between the
// win banner and the buttons while the family keeps moving.
import { Node } from '../engine/node.js';
import { tween, wait, killTweensOf, clamp, lerp } from '../engine/tween.js';
import { svgSprite } from '../engine/raster.js';
import * as CH from '../art/characters.js';
import { burst } from '../art/fx.js';
import { LevelScene, game, audio } from './base.js';
import * as A from '../art/props_level3.js';

const { createCharacter, portraitSprite } = CH;
const { L3 } = A;
const SNAP_R = 95;          // generous magnetic snap radius (design units)
const HINT_AFTER = 6;       // seconds of no interaction before a hint
const PHOTO_CY = 362;       // photo centre (design y at height 900)
const CHAR_S = 0.62;
// home spot per piece index: spots = [L-top, L-low, counter-L, counter-R, R-top, R-low]
const HOME_OF = [5, 0, 1, 3, 4, 2];   // pieces 3 & 5 have no vertical tabs: they rest flat on the counter
const HOME_ROT = [-0.14, 0.1, -0.08, 0.12, -0.1, 0.07];

export default class Level3 extends LevelScene {
  static level = 3;
  static title = 'Foto Keluarga';

  async load() {
    await super.load();
    const { PW, PH } = L3;
    this.safeRects = this.portraitSafeRects(PW, PH);
    const geo = (this.geo = A.buildJigsaw(11, this.safeRects));
    const [wall, garland, table, back, front, plant, lamp, hand, star, portrait, mom, dad, lmom, ldad, lbaby, backdrop, heart, props] = await Promise.all([
      svgSprite(A.wallSVG(PHOTO_CY), A.WALL_W, A.WALL_H, 'l3-wall'),
      svgSprite(A.garlandSVG(), A.GARLAND_W, A.GARLAND_H, 'l3-garland2'),
      svgSprite(A.tableSVG(), A.TABLE_W, A.TABLE_H, 'l3-table2'),
      svgSprite(A.frameBackSVG(), L3.FW, L3.FH, 'l3-frame-back2'),
      svgSprite(A.frameFrontSVG(), L3.FW, L3.FH, 'l3-frame-front2'),
      svgSprite(A.plantSVG(), 180, 250, 'l3-plant'),
      svgSprite(A.lampSVG(), 170, 270, 'l3-lamp2'),
      svgSprite(A.handSVG(), A.HAND.w, A.HAND.h, 'l3-hand'),
      svgSprite(A.starSVG(), 40, 40, 'l3-star'),
      portraitSprite(PW, PH),
      createCharacter('mom'), createCharacter('dad'),
      createCharacter('mom'), createCharacter('dad'), createCharacter('baby'),
      this.loadBackdrop(PW, PH),
      svgSprite(A.heartSVG(), 48, 46, 'l3-heart'),
      (typeof CH.portraitPropsSprites === 'function' ? CH.portraitPropsSprites(PW, PH).catch(() => null) : Promise.resolve(null)),
    ]);
    this.portrait = portrait; this.starSp = star; this.heartSp = heart; this.props = props;
    const [ghost, pcs] = await Promise.all([A.ghostSprite(portrait, geo), A.pieceSprites(portrait, geo)]);

    const W = this.world;
    this.wallN = W.add(new Node({ ax: 0.5, ay: 1 }).setImage(wall));
    this.garlandN = W.add(new Node({ ax: 0.5, ay: 0 }).setImage(garland));

    // --- Ibu & Ayah stand behind the sideboard, flanking the frame
    this.charLayer = W.add(new Node());
    this.mom = this.charLayer.add(mom); this.dad = this.charLayer.add(dad);
    this.charRise = 0;

    // --- frame group: origin = the nail, so wobbles swing like a hanging frame
    const C = L3.CENTER_FROM_NAIL;
    this.frameG = W.add(new Node());
    this.frameG.add(new Node({ ax: 0.5, ay: L3.NAIL_Y / L3.FH }).setImage(back));
    this.photoX = -PW / 2; this.photoY = C - PH / 2; // photo top-left in frame-local coords
    this.frameG.add(new Node({ x: 0, y: C }).setImage(ghost));
    this.glowLayer = this.frameG.add(new Node());
    this.placedLayer = this.frameG.add(new Node());
    this.fullPhoto = this.frameG.add(new Node({ x: 0, y: C, alpha: 0 }).setImage(portrait));
    this.fullPhoto.w = PW; this.fullPhoto.h = PH;
    this.livePhoto = this.frameG.add(this.buildLivePhoto(backdrop, lmom, ldad, lbaby));
    this.glossK = -1;
    this.frameG.add(new Node({ drawFn: ctx => this.drawGloss(ctx) }));
    this.frameG.add(new Node({ ax: 0.5, ay: L3.NAIL_Y / L3.FH }).setImage(front));

    this.tableN = W.add(new Node({ ax: 0.5, ay: 0 }).setImage(table));
    this.plantN = W.add(new Node({ ax: 0.5, ay: 1 }).setImage(plant));
    this.lampN = W.add(new Node({ ax: 0.5, ay: 1 }).setImage(lamp));

    // --- pieces (pieceLayer is scaled with the frame on tall screens)
    this.pieceLayer = W.add(new Node());
    this.pieces = geo.pieces.map((g, i) => {
      const sp = pcs[i];
      const n = new Node({ interactive: true, draggable: true, w: geo.cw, h: geo.ch, hitPad: 38, alpha: 0 });
      n.data = { i, c: g.c, r: g.r, slot: { x: this.photoX + g.gx, y: this.photoY + g.gy }, edge: g.edge };
      n.shadowImg = sp.shadow.img; n.shadowSoftImg = sp.shadowSoft.img; n.lift = 0; n.placed = false; n.vx = 0;
      n.drawFn = (ctx, nd) => this.drawPieceShadow(ctx, nd);
      n.art = n.add(new Node().setImage(sp.img));
      n.flat = n.add(new Node({ alpha: 0 }).setImage(sp.flat));
      n.whiteN = n.add(new Node({ alpha: 0 }).setImage(sp.white));
      n.glow = this.glowLayer.add(new Node({ x: n.data.slot.x, y: n.data.slot.y, alpha: 0 }).setImage(sp.glow));
      n.glowMag = 0;
      return this.pieceLayer.add(n);
    });

    this.fxLayer = W.add(new Node());
    this.trail = this.fxLayer.add(new Node({ drawFn: ctx => this.drawTrail(ctx) }));
    this.trailK = 0; this.trailPts = null;
    this.hand = this.fxLayer.add(new Node({ ax: A.HAND.tx / A.HAND.w, ay: A.HAND.ty / A.HAND.h, alpha: 0, rot: -0.35 }).setImage(hand));
    this.flash = W.add(new Node({ alpha: 0, drawFn: ctx => this.drawFlash(ctx) }));
    this.flashK = 0;

    this.swing = { a: 0, v: 0 };
    this.introDone = false; this.introGen = 0;
    this.lastAct = 0; this.hintT = 0; this.hintPiece = null; this.hintIdx = 0; this.hintTok = 0;
    this.dragging = null; this.celebrating = false; this.winPose = false; this.sparkT = 0;
  }

  /** Rects (photo px) the jigsaw tabs must avoid: PORTRAIT_SAFE from characters.js if exported (fractions of w/h),
   *  otherwise faces + swaddle estimated from PORTRAIT_LAYOUT, otherwise the classic three-heads composition. */
  portraitSafeRects(w, h) {
    const out = [];
    const fx = v => (Math.abs(v) <= 1.5 ? v * w : v), fy = v => (Math.abs(v) <= 1.5 ? v * h : v);
    const walk = (o, depth = 0) => {
      if (!o || depth > 4) return;
      if (Array.isArray(o)) { o.forEach(e => walk(e, depth + 1)); return; }
      if (typeof o === 'object') {
        if ([o.x, o.y, o.w, o.h].every(v => typeof v === 'number')) { out.push({ x: fx(o.x), y: fy(o.y), w: fx(o.w), h: fy(o.h), weight: o.weight || 1 }); return; }
        Object.values(o).forEach(e => walk(e, depth + 1));
      }
    };
    try { walk(typeof CH.PORTRAIT_SAFE === 'function' ? CH.PORTRAIT_SAFE(w, h) : CH.PORTRAIT_SAFE); } catch (_) {}
    if (out.length) return out;
    const L = CH.PORTRAIT_LAYOUT, s6 = h / 600;
    const spec = { mom: [560, 0.6, 0.24], dad: [600, 0.6, 0.24], baby: [230, 0.7, 0.55] };
    if (L) for (const k of ['mom', 'dad', 'baby']) {
      const e = L[k]; if (!e) continue;
      const [ht, fr, rr] = spec[k], H = ht * (e.scale ?? 1) * s6, cx = e.x * w, cy = e.y * h - fr * H, r = rr * H;
      out.push({ x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, weight: 2 });                  // face
      if (k === 'baby') out.push({ x: cx - 0.85 * H, y: e.y * h - 0.5 * H, w: 1.7 * H, h: 0.55 * H }); // swaddle
    }
    if (!out.length) for (const u of [0.18, 0.5, 0.82]) out.push({ x: (u - 0.1) * w, y: 0.12 * h, w: 0.2 * w, h: 0.32 * h, weight: 2 });
    return out;
  }
  /** Photo backdrop for the live payoff: the character builder's portrait backdrop if exported, else our own. */
  async loadBackdrop(w, h) {
    try {
      const fn = CH.portraitBackdropSprite || CH.portraitBackdrop;
      if (typeof fn === 'function') { const sp = await fn(w, h); if (sp && sp.img) return sp; }
    } catch (e) { /* fall through */ }
    return svgSprite(A.photoBackdropSVG(w, h), w, h, 'l3-photo-bd');
  }
  /** Place a live character exactly like the printed portrait (PORTRAIT_LAYOUT via applyPortraitPose if exported). */
  posePortrait(ch, kind, w, h) {
    if (typeof CH.applyPortraitPose === 'function' && CH.PORTRAIT_LAYOUT?.[kind]) { CH.applyPortraitPose(ch, kind, w, h); return; }
    const s = h / 600, d = { mom: [0.225, 1 + 46 / 600, 0.86, 0.11, [0.75, 0.75], 0.1], dad: [0.785, 1 + 46 / 600, 0.86, -0.11, [-0.75, 0.75], -0.1], baby: [0.5, 1 - 26 / 600, 1, 0, [0, 0], 0.04] }[kind];
    ch.x = d[0] * w; ch.y = d[1] * h; ch.sx = ch.sy = d[2] * s; ch.rot = d[3];
    ch.setMood?.('adore'); ch.gazeOverride = d[4]; ch.tiltOverride = d[5];
  }
  buildLivePhoto(backdrop, mom, dad, baby) {
    const { PW, PH } = L3;
    this.live = { mom, dad, baby };
    for (const k of ['mom', 'dad', 'baby']) this.posePortrait(this.live[k], k, PW, PH);
    const layer = c => (c.renderLayer ? c.renderLayer.bind(c) : (x, ly) => { if (ly !== 'front') c.render(x); });
    const img = sp => sp && sp.img;
    // Same draw order as portraitSprite: backdrop → parents' bodies → seat → basket back → baby → basket front →
    // parents' front arms → photo border, clipped to the photo. The live rigs are drawn here (not children).
    return new Node({ x: this.photoX, y: this.photoY, visible: false, drawFn: ctx => {
      const P = this.props || {};
      ctx.beginPath(); ctx.rect(0, 0, PW, PH); ctx.clip();
      ctx.drawImage(backdrop.img, 0, 0, PW, PH);
      layer(mom)(ctx, 'base'); layer(dad)(ctx, 'base');
      if (img(P.seat)) ctx.drawImage(P.seat.img, 0, 0, PW, PH);
      if (img(P.basketBack)) ctx.drawImage(P.basketBack.img, 0, 0, PW, PH);
      baby.render(ctx);
      if (img(P.basketFront)) ctx.drawImage(P.basketFront.img, 0, 0, PW, PH);
      layer(mom)(ctx, 'front'); layer(dad)(ctx, 'front');
      if (typeof CH.drawPortraitFrame === 'function') CH.drawPortraitFrame(ctx, PW, PH);
      else { ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 18 * PH / 600; ctx.strokeRect(0, 0, PW, PH); }
    } });
  }

  // ------------------------------------------------------------------------------------------- layout
  onLayout(v) {
    this.v = v;
    const cx = v.w / 2, ox = (v.w - 1600) / 2;
    const fy = Math.max(1, v.h / 900), Y = y => y * fy;      // tall screens (tablets) spread vertically
    const k = Math.min(1.15, 1 + (fy - 1) * 0.45);           // …and get a bigger frame + pieces
    this.cx = cx; this.ox = ox; this.fy = fy; this.k = k;
    this.tableY = Y(A.TABLE_Y);
    this.wallN.x = cx; this.wallN.y = this.tableY;
    this.garlandN.x = cx; this.garlandN.y = Y(2);
    this.tableN.x = cx; this.tableN.y = this.tableY;

    // frame: play pose (win pose is applied when complete() runs)
    this.playPose = { x: cx, cy: Y(PHOTO_CY), s: k };
    if (!this.winPose) this.applyFramePose(this.playPose);
    else this.applyFramePose(this.winPoseFor(v));
    this.pieceLayer.sx = this.pieceLayer.sy = k;

    // Ibu & Ayah flank the frame, behind the counter, waist up
    const cs = CHAR_S * Math.min(k, 1.08);
    this.charS = cs;
    const side = Math.min(860, v.w / 2 - 175);
    for (const c of [this.mom, this.dad]) { c.sx = c.sy = cs; }
    this.mom.x = cx - side; this.dad.x = cx + side;
    this.charBase = this.tableY + 72 * cs / CHAR_S + (fy - 1) * 220;   // tall views: parents sink a bit, freeing wall
    this.placeChars();

    // props on the counter only where they cannot touch the characters
    const px = Math.min(905, v.w / 2 - 90);
    this.plantN.x = cx - px; this.lampN.x = cx + px;
    this.plantN.y = this.lampN.y = this.tableY + 22;
    const room = (side - px) > 90 + 150 * cs / CHAR_S;
    this.plantN.visible = this.lampN.visible = room;

    // scatter homes (world), then into pieceLayer-local
    const inner = cx - (L3.OW / 2) * k - 40 - (this.geo.cw / 2 + 50) * k;
    const spots = [
      { x: inner + 6, y: Y(232) }, { x: inner - 4, y: Y(440) },
      { x: cx - 150 * k, y: this.tableY - 74 * k }, { x: cx + 150 * k, y: this.tableY - 72 * k },
      { x: 2 * cx - inner - 4, y: Y(266) }, { x: 2 * cx - inner + 4, y: Y(456) },
    ];
    // Real vertical extents of the piece that rests on each spot (tabs included), so the side stacks never touch
    // each other, the garland, or the parents' heads.
    const ext = []; this.pieces.forEach((n, i) => {
      const ys = n.data.edge.map(p => p[1] - this.geo.SH / 2);
      ext[HOME_OF[i]] = { top: Math.min(...ys) * k, bot: Math.max(...ys) * k, halfW: Math.max(...n.data.edge.map(p => Math.abs(p[0] - this.geo.SW / 2))) * k };
    });
    const garlandBottom = 150 * fy;
    this.sink = { mom: 0, dad: 0 };
    for (const [t, l, c, hgt, key] of [[0, 1, this.mom, 560, 'mom'], [4, 5, this.dad, 600, 'dad']]) {
      const T = spots[t], Lw = spots[l];
      T.y = Math.max(T.y, garlandBottom - ext[t].top + 8);
      Lw.y = Math.max(Lw.y, T.y + ext[t].bot - ext[l].top + 30);
      const charHalfW = 165 * cs / CHAR_S;
      if (Math.abs(Lw.x - c.x) < ext[l].halfW + charHalfW) {
        // the parent sinks behind the counter just enough for the low piece to clear the head (face stays visible)
        const headTop = this.charBase - hgt * cs, need = Lw.y + ext[l].bot + 20 - headTop;
        const maxSink = Math.max(0, (this.tableY - 175 * cs / CHAR_S) - headTop);
        this.sink[key] = clamp(need, 0, maxSink);
        if (need > maxSink) Lw.y -= need - maxSink;   // last resort: nudge the piece up
      }
    }
    this.placeChars();
    this.pieces.forEach((n, i) => {
      const h = spots[HOME_OF[i]];
      n.home = { x: h.x / k, y: h.y / k, rot: HOME_ROT[i], sx: 1, sy: 1 };
      if (this.introDone && !n.placed && n !== this.dragging) { killTweensOf(n); killTweensOf(n, 'ret'); Object.assign(n, { x: n.home.x, y: n.home.y, rot: HOME_ROT[i], sx: 1, sy: 1 }); }
    });
  }
  applyFramePose(p) {
    const C = L3.CENTER_FROM_NAIL;
    this.frameK = p.s;
    this.frameG.x = p.x; this.frameG.y = p.cy - C * p.s; this.frameG.sx = this.frameG.sy = p.s;
  }
  winPoseFor(v) {
    // showWin: banner + stars in a top band (stars bottom ≈ topY + 252), buttons in a bottom band (top ≈ h − 200)
    const topY = Math.min((v.h - 900) / 2, 60) * 0.5;
    const top = topY + 262, bottom = v.h - 206, avail = bottom - top, box = L3.STRING + L3.OH;
    const s = Math.min(v.h > 950 ? 1.15 : 0.9, (avail - 8) / box);
    const nailY = top + (avail - box * s) / 2 + 4;
    return { x: v.w / 2, cy: nailY + L3.CENTER_FROM_NAIL * s, s };
  }
  placeChars() {
    if (this.charBase == null) return;
    const r = this.charRise;
    const sk = this.sink || { mom: 0, dad: 0 };
    this.mom.y = this.charBase + sk.mom + (1 - r) * 300;
    this.dad.y = this.charBase + sk.dad + 8 + (1 - Math.min(1, r * 1.08)) * 310;
  }

  slotWorld(n) { return this.frameG.toWorld(n.data.slot.x, n.data.slot.y); }
  pieceWorld(n) { return n.parent.toWorld(n.x, n.y); }

  // ------------------------------------------------------------------------------------------- intro
  enter() {
    this.enterT = game.time;
    audio.music('level');
    game.onUpdate((dt, t) => this.tick(dt, t));
    this.intro();
  }
  async intro() {
    const gen = ++this.introGen, alive = () => gen === this.introGen && !this.introDone;
    this.drag.enabled = false;
    this.fullPhoto.alpha = 1;
    this.swing.v = 0.22;
    await wait(0.3); if (!alive()) return;
    tween(this, { charRise: 1 }, { dur: 0.6, ease: 'outBack', tag: 'intro' });
    audio.sfx('pop');
    await wait(0.4); if (!alive()) return;
    audio.voice('Ayo susun foto keluarga!');
    this.mom.talk?.(1.6); this.mom.react?.('happy', 1.6); this.dad.react?.('happy', 1.6);
    await wait(0.35); if (!alive()) return;
    const k = this.frameK;
    tween(this.frameG, { sx: k * 1.04, sy: k * 0.97 }, { dur: 0.12, tag: 'intro' }).then(() => tween(this.frameG, { sx: k, sy: k }, { dur: 0.4, ease: 'outElastic', tag: 'intro' }));
    this.swing.v += 0.12;
    await wait(0.16); if (!alive()) return;
    this.fullPhoto.alpha = 0;
    audio.sfx('whoosh');
    burst(this.fxLayer, this.cx, this.playPose.cy, 'dust', { count: 10 });
    const L = this.pieceLayer.sx;
    this.pieces.forEach((n, i) => {
      const s = this.slotWorld(n), h = n.home;
      const sx = s.x / L, sy = s.y / L;
      Object.assign(n, { x: sx, y: sy, rot: 0, alpha: 1, sx: 1, sy: 1, lift: 0.6 });
      // spread arcs: each piece rises to its own height and bows outward before landing
      const outward = h.x < sx ? -1 : 1;
      const ctlx = (sx + h.x) / 2 + outward * (60 + (i % 3) * 40), ctly = Math.max(Math.min(sy, h.y) - 150 - (i % 3) * 70, (230 * this.fy) / L);
      const spin = outward * Math.PI * 2;
      const o = { k: 0 };
      tween(o, { k: 1 }, {
        dur: 0.75, delay: 0.04 + i * 0.1, ease: 'inOutCubic', tag: 'intro',
        onUpdate: e => {
          const u = 1 - e;
          n.x = u * u * sx + 2 * u * e * ctlx + e * e * h.x;
          n.y = u * u * sy + 2 * u * e * ctly + e * e * h.y;
          n.rot = h.rot * e + spin * e * (1 - e) * 0.16;
          n.sx = n.sy = 1 + Math.sin(e * Math.PI) * 0.12;
          n.lift = 0.6 + Math.sin(e * Math.PI) * 0.4 - e * 0.6;
        },
      }).then(() => { if (!alive()) return; tween(n, { sx: 1.08, sy: 0.92 }, { dur: 0.06 }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.35, ease: 'outElastic' })); });
      if (i % 2 === 0) wait(0.06 + i * 0.1).then(() => alive() && audio.sfx('whoosh'));
    });
    await wait(0.04 + 5 * 0.1 + 0.8); if (!alive()) return;
    this.finishIntro();
  }
  finishIntro() {
    if (this.introDone) return;
    this.introDone = true; this.introGen++;
    killTweensOf(this, 'intro');
    this.charRise = 1; this.placeChars();
    killTweensOf(this.frameG, 'intro'); if (!this.winPose) this.applyFramePose(this.playPose);
    if (!this.celebrating) this.fullPhoto.alpha = 0;
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
    const s = this.swing;
    s.v += (-38 * s.a - 2.6 * s.v) * dt; s.a += s.v * dt;
    this.frameG.rot = s.a + Math.sin(t * 0.9) * 0.004;
    if (!this.introDone) this.placeChars();

    let magnet = null;
    for (const n of this.pieces) {
      if (n.placed) { n.art.x = n.art.y = n.art.rot = 0; continue; }
      if (n === this.dragging) {
        const vx = (n.x - (n._px ?? n.x)) / Math.max(dt, 1e-3); n._px = n.x;
        n.vx = lerp(n.vx, vx, Math.min(1, dt * 10));
        const target = clamp(n.vx / 1300, -0.4, 0.4) + Math.sin(t * 9) * 0.035;
        n.rot += (target - n.rot) * Math.min(1, dt * 14);
        n.art.y = n.art.x = 0; n.art.rot = 0;
        const sw = this.slotWorld(n), pw = this.pieceWorld(n), d = Math.hypot(pw.x - sw.x, pw.y - sw.y);
        n.glowMag = lerp(n.glowMag, d < SNAP_R * 1.6 ? 0.95 : 0, Math.min(1, dt * 10));
        if (n.glowMag > 0.3) {
          magnet = n;
          if (!n._oohed) { n._oohed = true; const who = pw.x < this.cx ? this.mom : this.dad; who.react?.('surprised', 0.8); who.lookAt?.(sw.x, sw.y); audio.sfx('pop'); }
        }
      } else {
        n.glowMag = lerp(n.glowMag, 0, Math.min(1, dt * 8));
        if (n !== this.hintPiece) { n.art.y = Math.sin(t * 1.7 + n.data.i * 1.3) * 2.5; n.art.rot = 0; }
      }
      n.flat.x = n.whiteN.x = n.art.x; n.flat.y = n.whiteN.y = n.art.y; n.whiteN.rot = n.art.rot;
    }

    // idle hint
    if (this.introDone && !this.finished && !this.celebrating && !this.dragging && this.hintT <= 0 && game.time - this.lastAct > HINT_AFTER) this.startHint();
    let hintA = 0;
    if (this.hintT > 0) {
      this.hintT -= dt;
      const env = Math.min(1, this.hintT / 0.4, (this.hintDur - this.hintT) / 0.3);
      const n = this.hintPiece;
      if (n && !n.placed && n !== this.dragging) {
        n.art.rot = env * Math.sin(t * 17) * 0.1 * (0.5 + 0.5 * Math.sin(t * 2.3));
        hintA = env * (0.8 + 0.2 * Math.sin(t * 7));
      }
      if (this.hintT <= 0) this.endHint();
    }
    for (const n of this.pieces) {
      const g = n.glow;
      if (n.placed) { g.alpha = Math.max(0, g.alpha - dt * 3); continue; }
      const base = Math.max(n.glowMag, n === this.hintPiece ? hintA : 0);
      g.alpha = base * (0.82 + 0.18 * Math.sin(t * 8));
      g.sx = g.sy = 1 + base * 0.035 * (0.5 + 0.5 * Math.sin(t * 6));
    }
    // sparkles drifting along the glowing edge
    const sparkN = magnet || (hintA > 0.3 ? this.hintPiece : null);
    if (sparkN) {
      this.sparkT -= dt;
      if (this.sparkT <= 0) {
        this.sparkT = 0.07;
        const e = sparkN.data.edge, pt = e[(Math.random() * e.length) | 0], g = this.geo;
        const w = this.frameG.toWorld(sparkN.data.slot.x + pt[0] - g.SW / 2, sparkN.data.slot.y + pt[1] - g.SH / 2);
        burst(this.fxLayer, w.x, w.y, 'sparkle', { count: 1, spread: 0.12, scale: 0.55, life: 0.8 });
      }
    }
  }

  // ------------------------------------------------------------------------------------------- hint
  startHint() {
    const cand = this.pieces.filter(p => !p.placed);
    if (!cand.length) return;
    const d = p => { const a = this.pieceWorld(p), b = this.slotWorld(p); return Math.hypot(a.x - b.x, a.y - b.y); };
    cand.sort((a, b) => d(a) - d(b));
    const n = cand[this.hintIdx++ % cand.length];
    this.hintPiece = n; this.hintDur = this.hintT = 4.6;
    this.lastAct = game.time + 4.6;
    audio.sfx('sparkle');
    audio.voice('Yuk, taruh di sini!');
    this.mom.react?.('think', 1.2);
    this.runHand(n, ++this.hintTok);
  }
  async runHand(n, tok) {
    const ok = () => tok === this.hintTok && this.hintPiece === n && !n.placed && n !== this.dragging;
    const h = this.hand;
    for (let rep = 0; rep < 2; rep++) {
      const p = this.pieceWorld(n), s = this.slotWorld(n);
      const c = { x: (p.x + s.x) / 2, y: Math.min(p.y, s.y) - 150 };
      this.trailPts = { p, c, s }; this.trailK = 0;
      Object.assign(h, { x: p.x + 40, y: p.y + 60, alpha: 0, sx: 0.8, sy: 0.8 });
      this.mom.lookAt?.(p.x, p.y); this.dad.lookAt?.(p.x, p.y);
      await tween(h, { x: p.x, y: p.y, alpha: 1, sx: 1, sy: 1 }, { dur: 0.3, ease: 'outBack', tag: 'hint' }); if (!ok()) return;
      // press the piece
      audio.sfx('tap');
      await tween(h, { sx: 0.88, sy: 0.82 }, { dur: 0.1, tag: 'hint' }); if (!ok()) return;
      n.sx = 1.08; n.sy = 0.92; tween(n, { sx: 1, sy: 1 }, { dur: 0.4, ease: 'outElastic', tag: 'hint' });
      await tween(h, { sx: 1, sy: 1 }, { dur: 0.14, tag: 'hint' }); if (!ok()) return;
      // slide along the dotted arc to the slot
      const o = { k: 0 };
      await tween(o, { k: 1 }, { dur: 1.0, ease: 'inOutSine', tag: 'hint', onUpdate: e => {
        const u = 1 - e; h.x = u * u * p.x + 2 * u * e * c.x + e * e * s.x; h.y = u * u * p.y + 2 * u * e * c.y + e * e * s.y;
        this.trailK = e; this.mom.lookAt?.(h.x, h.y); this.dad.lookAt?.(h.x, h.y);
      } }); if (!ok()) return;
      audio.sfx('sparkle');
      burst(this.fxLayer, s.x, s.y, 'sparkle', { count: 10, spread: 0.6 });
      await tween(h, { sx: 0.88, sy: 0.82 }, { dur: 0.1, tag: 'hint' }); if (!ok()) return;
      await tween(h, { sx: 1, sy: 1, alpha: 0 }, { dur: 0.3, tag: 'hint' }); if (!ok()) return;
    }
    this.trailPts = null;
  }
  endHint() {
    const n = this.hintPiece; this.hintT = 0; this.hintPiece = null; this.hintTok++;
    if (n) { n.art.rot = 0; }
    killTweensOf(this.hand, 'hint');
    if (this.hand.alpha > 0) tween(this.hand, { alpha: 0 }, { dur: 0.15 });
    this.trailPts = null;
    this.mom.lookAt?.(null); this.dad.lookAt?.(null);
  }

  // ------------------------------------------------------------------------------------------- drawing
  drawPieceShadow(ctx, n) {
    if (n.placed) return;
    const L = n.lift, off = 5 + L * 27, sc = 1 + L * 0.08;
    const lx = off * Math.sin(n.rot) + n.art.x, ly = off * Math.cos(n.rot) + n.art.y * 0.3;
    const w = this.geo.SW * sc, h = this.geo.SH * sc, ga = ctx.globalAlpha;
    if (L < 0.98) { ctx.globalAlpha = ga * 0.5 * (1 - L); ctx.drawImage(n.shadowImg, lx - w / 2, ly - h / 2, w, h); }
    if (L > 0.02) { ctx.globalAlpha = ga * 0.44 * L; ctx.drawImage(n.shadowSoftImg, lx - w / 2, ly - h / 2, w, h); }
    ctx.globalAlpha = ga;
  }
  drawTrail(ctx) {
    const T = this.trailPts; if (!T || this.hand.alpha <= 0) return;
    const { p, c, s } = T, N = 16;
    for (let i = 1; i < N; i++) {
      const e = i / N; if (e > this.trailK + 0.02) break;
      const u = 1 - e, x = u * u * p.x + 2 * u * e * c.x + e * e * s.x, y = u * u * p.y + 2 * u * e * c.y + e * e * s.y;
      ctx.globalAlpha = this.hand.alpha * 0.9;
      ctx.fillStyle = '#fff7d6'; ctx.strokeStyle = '#d9a83a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
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
    const p = this.frameG.toWorld(0, L3.CENTER_FROM_NAIL), R = 260 + (1 - k) * 420;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, 'rgba(255,248,214,1)'); g.addColorStop(1, 'rgba(255,248,214,0)');
    ctx.fillStyle = g; ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
  }

  // ------------------------------------------------------------------------------------------- input
  onPick(n) {
    if (n.placed) return;
    killTweensOf(n); killTweensOf(n, 'drag'); killTweensOf(n, 'ret'); killTweensOf(n, 'hint');
    this.dragging = n; n._px = n.x; n.vx = 0; n._oohed = false;
    if (this.hintPiece) this.endHint();
    this.lastAct = game.time;
    audio.sfx('pick');
    tween(n, { lift: 1 }, { dur: 0.22, tag: 'drag' });
    tween(n, { sx: 1.22, sy: 1.22 }, { dur: 0.09, ease: 'outQuad', tag: 'drag' }).then(() => {
      if (this.dragging === n) tween(n, { sx: 1.12, sy: 1.12 }, { dur: 0.3, ease: 'outBack', tag: 'drag' });
    });
    const p = this.pieceWorld(n);
    this.mom.lookAt?.(p.x, p.y); this.dad.lookAt?.(p.x, p.y);
  }
  onMove(n) {
    const p = this.pieceWorld(n);
    this.mom.lookAt?.(p.x, p.y); this.dad.lookAt?.(p.x, p.y);
  }
  onDrop(n, p, moved) {
    this.dragging = null; this.lastAct = game.time;
    killTweensOf(n, 'drag');
    const sw = this.slotWorld(n), pw = this.pieceWorld(n);
    if (Math.hypot(pw.x - sw.x, pw.y - sw.y) < SNAP_R) { this.place(n); return true; }
    this.sendHome(n, moved);
    return true;
  }
  sendHome(n, moved) {
    const h = n.home;
    this.mom.lookAt?.(null); this.dad.lookAt?.(null);
    if (moved) {
      audio.sfx('wrong');
      (this.pieceWorld(n).x < this.cx ? this.mom : this.dad).react?.('think', 1.3);
    } else audio.sfx('tap');
    // squash on release, then spring home
    n.sx = 1.24; n.sy = 1.0;
    const dist = Math.hypot(n.x - h.x, n.y - h.y), dur = clamp(0.35 + dist / 1800, 0.42, 0.75);
    tween(n, { lift: 0 }, { dur, tag: 'ret' });
    tween(n, { x: h.x, y: h.y, rot: h.rot, sx: 1, sy: 1 }, { dur, ease: 'outBack', tag: 'ret' }).then(() => {
      if (n.placed || n === this.dragging) return;
      tween(n, { sx: 1.08, sy: 0.92 }, { dur: 0.07, tag: 'ret' }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.45, ease: 'outElastic', tag: 'ret' }));
    });
  }
  place(n, instant = false) {
    if (n.placed) return;
    n.placed = true; n.interactive = false; n.draggable = false;
    killTweensOf(n); killTweensOf(n, 'drag'); killTweensOf(n, 'ret'); killTweensOf(n, 'intro'); killTweensOf(n, 'hint');
    const wp = this.pieceWorld(n), lp = this.frameG.toLocal(wp.x, wp.y), wr = n.rot;
    this.placedLayer.add(n);
    n.x = lp.x; n.y = lp.y; n.rot = wr - this.frameG.rot; n.alpha = 1;
    n.art.x = n.art.y = n.art.rot = 0;
    const s = n.data.slot;
    if (this.hintPiece === n) this.endHint();
    if (instant) {
      Object.assign(n, { x: s.x, y: s.y, rot: 0, sx: 1, sy: 1, lift: 0 });
      n.flat.alpha = 1; n.art.alpha = 0.25;
    } else {
      tween(n, { lift: 0 }, { dur: 0.2 });
      tween(n, { x: s.x, y: s.y, rot: 0, sx: 1, sy: 1 }, { dur: 0.2, ease: 'outCubic' }).then(() => {
        tween(n, { sx: 1.07, sy: 0.93 }, { dur: 0.07 }).then(() => tween(n, { sx: 1, sy: 1 }, { dur: 0.45, ease: 'outElastic' }));
        n.whiteN.alpha = 0.5; tween(n.whiteN, { alpha: 0 }, { dur: 0.15 });
        tween(n.flat, { alpha: 1 }, { dur: 0.45, delay: 0.15 }); tween(n.art, { alpha: 0.25 }, { dur: 0.45, delay: 0.15 });
      });
      audio.sfx('snap');
      wait(0.09).then(() => audio.sfx('sparkle'));
      const w = this.frameG.toWorld(s.x, s.y);
      burst(this.fxLayer, w.x, w.y, 'sparkle', { count: 28, spread: 1.1 });
      this.crayonStars(w.x, w.y, 5, 1);
      this.ring(w.x, w.y);
      this.swing.v += (s.x < 0 ? -1 : 1) * 0.09;
      const k = this.frameK;
      tween(this.frameG, { sx: k * 1.03, sy: k * 1.03 }, { dur: 0.07 }).then(() => tween(this.frameG, { sx: k, sy: k }, { dur: 0.45, ease: 'outElastic' }));
      const left = s.x < 0;
      (left ? this.mom : this.dad).react?.('cheer', 1.4);
      (left ? this.dad : this.mom).react?.('happy', 1.1);
      this.mom.lookAt?.(w.x, w.y); this.dad.lookAt?.(w.x, w.y);
      wait(0.9).then(() => { if (!this.dragging) { this.mom.lookAt?.(null); this.dad.lookAt?.(null); } });
    }
    if (this.pieces.every(p => p.placed)) this.celebrate(instant);
  }
  ring(x, y) {
    const r = this.fxLayer.add(new Node({ x, y, drawFn: (ctx, nd) => {
      const k = nd.k, R = 50 + k * 170, lw = 14 * (1 - k) + 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#f7c234'; ctx.lineWidth = lw; ctx.setLineDash([22, 9]);
      ctx.beginPath(); ctx.arc(0, 0, R, k * 2, k * 2 + Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = lw * 0.4; ctx.setLineDash([14, 16]);
      ctx.beginPath(); ctx.arc(1.5, -1.5, R - lw * 0.2, -k, -k + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    } }));
    r.k = 0;
    tween(r, { k: 1, alpha: 0 }, { dur: 0.55, ease: 'outCubic' }).then(() => r.removeSelf());
  }
  /** a few hand-drawn crayon stars flying out (no glow discs) */
  crayonStars(x, y, n, scale = 1, up = false) {
    for (let i = 0; i < n; i++) {
      const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const d = (110 + Math.random() * 90) * scale, sc = (0.8 + Math.random() * 0.6) * scale;
      const st = this.fxLayer.add(new Node({ x, y, sx: 0.2, sy: 0.2, rot: Math.random() * 6 }).setImage(this.starSp));
      tween(st, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, sx: sc, sy: sc, rot: st.rot + 2.5 }, { dur: 0.55, ease: 'outCubic' })
        .then(() => tween(st, { alpha: 0, y: st.y + 30, sx: sc * 0.6, sy: sc * 0.6 }, { dur: 0.45, ease: 'inQuad' })).then(() => st.removeSelf());
    }
  }

  // ------------------------------------------------------------------------------------------- finish
  async celebrate(fast) {
    if (this.celebrating) return;
    this.celebrating = true; this.drag.enabled = false; this.endHint();
    const photo = () => this.frameG.toWorld(0, L3.CENTER_FROM_NAIL);
    await wait(fast ? 0.15 : 0.55);
    // seams fade into one seamless photo
    tween(this.fullPhoto, { alpha: 1 }, { dur: 0.7, ease: 'inOutSine' });
    audio.sfx('sparkle');
    { const p = photo(); this.mom.lookAt?.(p.x, p.y); this.dad.lookAt?.(p.x, p.y); }
    await wait(0.85);
    // camera flash — under the white the printed photo turns into the live family
    audio.sfx('pop');
    this.flash.alpha = 0.97; this.flashK = 0;
    tween(this, { flashK: 1 }, { dur: 0.75, ease: 'outCubic' });
    tween(this.flash, { alpha: 0 }, { dur: 0.75, ease: 'inQuad' });
    this.livePhoto.visible = true;
    this.fullPhoto.alpha = 0;
    for (const n of this.pieces) n.visible = false;
    await wait(0.12);
    this.comeAlive();
    // frame wobble, outer family cheers
    this.swing.v += 0.5;
    const k = this.frameK;
    tween(this.frameG, { sx: k * 1.07, sy: k * 0.95 }, { dur: 0.12 }).then(() => tween(this.frameG, { sx: k, sy: k }, { dur: 0.9, ease: 'outElastic' }));
    this.glossK = 0; tween(this, { glossK: 1.01 }, { dur: 0.9, delay: 0.25, ease: 'inOutSine' });
    audio.sfx('cheer');
    this.mom.setMood?.('cheer'); this.mom.react?.('cheer', 3);
    wait(0.12).then(() => { this.dad.setMood?.('cheer'); this.dad.react?.('cheer', 3); });
    for (const c of [this.mom, this.dad]) { const y0 = c.y; tween(c, { y: y0 - 30 }, { dur: 0.25, ease: 'outQuad' }).then(() => tween(c, { y: y0 }, { dur: 0.5, ease: 'outBounce' })); }
    const v = this.v;
    burst(this.fxLayer, 30, -20, 'confetti', { angle: Math.PI * 0.3, cone: 0.9, count: 34, spread: 1.1 });
    burst(this.fxLayer, v.w - 30, -20, 'confetti', { angle: Math.PI * 0.7, cone: 0.9, count: 34, spread: 1.1 });
    await wait(0.3);
    this.heartsOverHeads();
    { const p = photo(); this.crayonStars(p.x, p.y - L3.PH * 0.5 * this.frameK, 8, 1.2, true); }
    audio.sfx('star');
    await wait(1.1);
    this.mom.setMood?.('happy'); this.dad.setMood?.('happy');
    this.complete();
  }
  /** three hand-drawn hearts per parent, staggered, rising and swaying above the heads */
  heartsOverHeads() {
    for (const [c, hgt] of [[this.mom, 560], [this.dad, 600]]) {
      const top = c.y - hgt * c.sy - 24;
      for (let i = 0; i < 3; i++) {
        wait(i * 0.15).then(() => {
          const x0 = c.x + (i - 1) * 62 + (Math.random() - 0.5) * 20, ph = Math.random() * 6, rise = 170 + Math.random() * 60;
          const h = this.fxLayer.add(new Node({ x: x0, y: top, sx: 0.2, sy: 0.2, rot: (i - 1) * 0.18 }).setImage(this.heartSp));
          audio.sfx('pop');
          tween(h, { sx: 0.95, sy: 0.95 }, { dur: 0.3, ease: 'outBack' });
          const o = { k: 0 };
          tween(o, { k: 1 }, { dur: 1.7, ease: 'outSine', onUpdate: e => {
            h.y = top - rise * e; h.x = x0 + Math.sin(e * 7 + ph) * 16; h.rot = (i - 1) * 0.18 + Math.sin(e * 6 + ph) * 0.12;
            h.alpha = e > 0.7 ? 1 - (e - 0.7) / 0.3 : 1;
          } }).then(() => h.removeSelf());
        });
      }
    }
  }
  /** The photo comes alive. Inside the photo the family only uses low-arm moods (adore / soft / surprised) so no
   *  arm ever crosses the baby: they lean and tilt toward him, chat, and the baby wakes, giggles and wiggles. */
  async comeAlive() {
    const { mom, dad, baby } = this.live;
    const L = CH.PORTRAIT_LAYOUT || {};
    const tilt0 = { mom: L.mom?.tilt ?? 0.1, dad: L.dad?.tilt ?? -0.1, baby: L.baby?.tilt ?? 0.04 };
    for (const c of [mom, dad, baby]) c.gazeOverride = null;
    mom.setMood?.('adore'); dad.setMood?.('adore'); baby.setMood?.('soft');
    const babyW = () => this.livePhoto.toWorld(baby.x, baby.y - 110 * baby.sy);
    { const p = babyW(); mom.lookAt?.(p.x, p.y); dad.lookAt?.(p.x, p.y); }
    mom.talk?.(1.0);
    // lean/tilt toward the baby, driven on the game clock
    let t = 0;
    game.onUpdate(dt => {
      t += dt;
      mom.tiltOverride = tilt0.mom + 0.06 + Math.sin(t * 1.7) * 0.05;
      dad.tiltOverride = tilt0.dad - 0.06 - Math.sin(t * 1.5 + 1) * 0.05;
      baby.tiltOverride = tilt0.baby + Math.sin(t * 2.4) * 0.08;
    });
    await wait(0.6);
    baby.react?.('surprised', 0.6); audio.sfx('giggle');
    await wait(0.7);
    baby.setMood?.('adore'); baby.talk?.(0.8); dad.talk?.(0.9);
    // forever: gentle family chatter (all low-arm poses)
    let i = 0;
    while (game.scene === this) {
      await wait(1.6 + Math.random() * 1.2);
      if (game.scene !== this) return;
      const p = babyW();
      switch (i++ % 4) {
        case 0: mom.setMood?.('soft'); mom.talk?.(0.9); dad.lookAt?.(p.x, p.y); break;
        case 1: dad.setMood?.('soft'); dad.talk?.(0.8); mom.setMood?.('adore'); break;
        case 2: baby.react?.('surprised', 0.5); audio.sfx('giggle'); mom.lookAt?.(p.x, p.y); dad.lookAt?.(p.x, p.y); break;
        default: dad.setMood?.('adore'); baby.talk?.(0.6); mom.lookAt?.(null);
      }
      if (Math.random() < 0.4) (Math.random() < 0.5 ? this.mom : this.dad).react?.('happy', 1);
    }
  }

  async complete() {
    if (this.finished) return;
    this.winPose = true;
    const p = this.winPoseFor(this.v || game.view), C = L3.CENTER_FROM_NAIL;
    this.frameK = p.s;
    tween(this.frameG, { x: p.x, y: p.cy - C * p.s, sx: p.s, sy: p.s }, { dur: 0.8, ease: 'inOutCubic' });
    // keep the photo the brightest thing: lift the frame above the win dim + rays (same coordinate space)
    this.frameG.z = 1001; this.uiLayer.add(this.frameG);
    return super.complete();
  }

  debugSolve(n = Infinity) {
    this.finishIntro();
    const todo = this.pieces.filter(p => !p.placed);
    const k = Math.min(n, todo.length);
    for (let i = 0; i < k; i++) this.place(todo[i], true);
  }
}

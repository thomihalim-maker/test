// Game singleton: canvas, resolution, ticker, input routing, scene manager.
// Design space is landscape, height 900 (width >= 1600, grows on wide phones). See CONTRACT.md.
import { Node } from './node.js';
import { updateTweens, killAllTweens, tween, Ease } from './tween.js';

export const DESIGN_W = 1600, DESIGN_H = 900;
const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.params = params;
    this.view = { w: DESIGN_W, h: DESIGN_H };
    this.time = 0; this.timeScale = Number(params.get('speed')) || 1;
    this.updaters = new Set();
    this.scenes = new Map();
    this.scene = null; this.sceneName = null;
    this.overlay = new Node();    // persistent UI above scenes (transition curtain lives here)
    this.transition = null;       // {draw(ctx, k, view)} — k: 0 open … 1 fully covered
    this.coverK = 0;
    this.busy = false;
    this.pointer = { x: 0, y: 0, down: false, id: null };
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Raster ratio is fixed at boot from the screen size (orientation independent) so rotating never re-rasterizes.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const long = Math.max(innerWidth, innerHeight), short = Math.min(innerWidth, innerHeight);
    const s = Math.min(short / DESIGN_H, long / DESIGN_W);
    this.pxRatio = Math.min(2.5, Math.max(0.5, s * dpr * 1.05));
    if (params.get('ratio')) this.pxRatio = Number(params.get('ratio'));
    this.resize();
    addEventListener('resize', () => this.resize());
    this._bindInput();
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000) * this.timeScale; last = now;
      this.update(dt); this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  resize() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    // The game is never rotated. On tall (portrait) screens the landscape stage is shown upright, as tall as
    // 4:3 at most, centred vertically; the bands above/below show a "turn your phone" hint (drawn in render()).
    this.rotated = false;
    this.portrait = H > W * 0.9;
    if (W / H >= DESIGN_W / DESIGN_H) { this.scale = H / DESIGN_H; this.view = { w: W / this.scale, h: DESIGN_H }; }
    else { this.scale = W / DESIGN_W; this.view = { w: DESIGN_W, h: Math.min(H / this.scale, DESIGN_W * 0.75) }; }
    this.offY = Math.max(0, (H - this.view.h * this.scale) / 2); // css px band above the stage
    // Notch / rounded-corner insets (CSS env safe-area-inset-*), in design units.
    const si = this._safeInsets();
    this.view.safe = { l: si.l / this.scale, r: si.r / this.scale, t: this.offY ? 0 : si.t / this.scale, b: this.offY ? 0 : si.b / this.scale };
    this.cssW = W; this.cssH = H;
    if (this.scene && this.scene.layout) this.scene.layout(this.view);
    if (this.overlayLayout) this.overlayLayout(this.view);
  }

  _safeInsets() {
    try {
      if (!this._probe) {
        const p = document.createElement('div');
        p.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;' +
          'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
        document.body.appendChild(p); this._probe = p;
      }
      const cs = getComputedStyle(this._probe);
      return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
    } catch (_) { return { t: 0, r: 0, b: 0, l: 0 }; }
  }

  // Screen (client css px) -> design space.
  toDesign(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (cx - r.left) / this.scale, y: (cy - r.top - this.offY) / this.scale };
  }

  _bindInput() {
    const c = this.canvas;
    const down = e => {
      if (this.pointer.down && e.pointerId !== this.pointer.id) return; // single-touch game
      const p = this.toDesign(e.clientX, e.clientY);
      Object.assign(this.pointer, p, { down: true, id: e.pointerId });
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
      if (this.onFirstInput) { const f = this.onFirstInput; this.onFirstInput = null; f(); }
      if (this.busy || !this.scene) return;
      this.scene.pointerDown?.(p, e);
    };
    const move = e => {
      if (this.pointer.down && e.pointerId !== this.pointer.id) return;
      const p = this.toDesign(e.clientX, e.clientY); Object.assign(this.pointer, p);
      if (this.busy || !this.scene) return;
      this.scene.pointerMove?.(p, e);
    };
    const up = e => {
      if (e.pointerId !== this.pointer.id) return;
      const p = this.toDesign(e.clientX, e.clientY);
      Object.assign(this.pointer, p, { down: false, id: null });
      if (!this.scene) return;
      this.scene.pointerUp?.(p, e);
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', e => e.preventDefault());
  }

  /** Register a scene loader: game.register('level1', () => import('../scenes/level1.js')) — module default-exports the Scene class. */
  register(name, loader) { this.scenes.set(name, loader); }

  async go(name, args = {}) {
    if (this.busy) return; this.busy = true;
    try {
      const Cls = (await this.scenes.get(name)()).default;
      if (this.scene) {
        await tween(this, { coverK: 1 }, { dur: 0.55, ease: Ease.inOutCubic });
        this.scene.exit?.();
        killAllTweens();
        this.updaters.clear();
      }
      const sc = new Cls(this, args);
      sc.root = sc.root || new Node();
      await sc.load?.();
      this.scene = sc; this.sceneName = name;
      sc.layout?.(this.view);
      sc.enter?.();
      this.busy = false;
      await tween(this, { coverK: 0 }, { dur: 0.6, ease: Ease.inOutCubic });
    } catch (err) {
      console.error(err); this.busy = false; this.coverK = 0;
    }
  }

  /** Register a per-frame callback fn(dt, t). Cleared on scene change. Returns an unsubscribe fn. */
  onUpdate(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }

  update(dt) {
    this.time += dt;
    updateTweens(dt);
    for (const fn of [...this.updaters]) fn(dt, this.time);
    this.scene?.update?.(dt, this.time);
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fbf3e6'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const d = this.dpr;
    if (this.offY > 0) this._drawPortraitBands(ctx, d);
    ctx.setTransform(d, 0, 0, d, 0, this.offY * d);
    ctx.scale(this.scale, this.scale);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.save();
    const rr = 22 / this.scale; // rounded "picture card" corners in portrait (css px → design units)
    if (this.offY > 0) { ctx.beginPath(); ctx.roundRect(0, 0, this.view.w, this.view.h, rr); ctx.clip(); }
    if (this.scene?.root) this.scene.root.render(ctx);
    this.overlay.render(ctx);
    if (this.coverK > 0) {
      if (this.transition) this.transition.draw(ctx, this.coverK, this.view);
      else { ctx.globalAlpha = this.coverK; ctx.fillStyle = '#fbf3e6'; ctx.fillRect(0, 0, this.view.w, this.view.h); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    if (this.offY > 0) { // soft cream crayon rim around the card
      ctx.save(); ctx.lineWidth = 5 / this.scale; ctx.strokeStyle = 'rgba(255,243,214,0.9)';
      ctx.beginPath(); ctx.roundRect(0, 0, this.view.w, this.view.h, rr); ctx.stroke(); ctx.restore();
    }
  }

  // Portrait: night-sky bands around the upright stage, with an animated "turn your phone" hint below it.
  _drawPortraitBands(ctx, d) {
    const W = this.cssW, H = this.cssH, top = this.offY, stageH = this.view.h * this.scale, bot = top + stageH;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b3a78'); g.addColorStop(1, '#4a3f86');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a few twinkling stars in the bands
    for (let i = 0; i < 28; i++) {
      const x = ((i * 0.61803) % 1) * W, y = ((i * 0.38197 * 3.7) % 1) * H;
      if (y > top - 6 && y < bot + 6) continue;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.time * 1.7 + i * 1.9);
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // soft drop shadow under the stage card
    ctx.save(); ctx.shadowColor = 'rgba(10,8,40,0.55)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#2b3a78'; ctx.beginPath(); ctx.roundRect(2, top, W - 4, stageH, 22); ctx.fill(); ctx.restore();
    const band = H - bot;
    if (band < 90) return;
    // phone that tips from upright to sideways, then rests
    const cx = W / 2, cy = bot + Math.min(band * 0.42, 120), t = (this.time % 3.2) / 3.2;
    const k = t < 0.15 ? 0 : t < 0.45 ? (1 - Math.cos(((t - 0.15) / 0.3) * Math.PI)) / 2 : 1;
    const ph = Math.min(64, band * 0.32), pw = ph * 0.56;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-k * Math.PI / 2);
    ctx.fillStyle = '#fbf3e6'; ctx.strokeStyle = '#f6cf3e'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2f57b8'; ctx.beginPath(); ctx.roundRect(-pw / 2 + 5, -ph / 2 + 7, pw - 10, ph - 16, 4); ctx.fill();
    ctx.fillStyle = '#f6cf3e'; ctx.beginPath(); ctx.arc(0, 0, ph * 0.12, 0, 7); ctx.fill();
    ctx.restore();
    // curved arrow
    ctx.save(); ctx.strokeStyle = 'rgba(255,243,196,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const r = ph * 0.85; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI * 0.85, -Math.PI * 0.35); ctx.stroke();
    const ax = cx + Math.cos(-Math.PI * 0.35) * r, ay = cy + Math.sin(-Math.PI * 0.35) * r;
    ctx.beginPath(); ctx.moveTo(ax - 9, ay - 6); ctx.lineTo(ax, ay); ctx.lineTo(ax - 2, ay + 10); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff3c4'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `600 ${Math.max(15, Math.min(20, W / 22))}px Fredoka, system-ui, sans-serif`;
    const ty = cy + ph * 0.75 + 10;
    if (ty + 24 < H) ctx.fillText('Putar HP-mu supaya gambarnya lebih besar', cx, ty);
  }
}

export const game = new Game();
window.__game = game; // test hook (Playwright)

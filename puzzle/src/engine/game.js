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
    // Portrait screens: render the landscape game rotated 90° so turning the phone always works,
    // even inside webviews that lock orientation.
    this.rotated = H > W;
    const LW = this.rotated ? H : W, LH = this.rotated ? W : H;
    this.scale = LW / LH >= DESIGN_W / DESIGN_H ? LH / DESIGN_H : LW / DESIGN_W;
    this.view = { w: LW / this.scale, h: LH / this.scale };
    this.cssW = W; this.cssH = H;
    if (this.scene && this.scene.layout) this.scene.layout(this.view);
    if (this.overlayLayout) this.overlayLayout(this.view);
  }

  // Screen (client css px) -> design space.
  toDesign(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    let sx = cx - r.left, sy = cy - r.top, lx, ly;
    if (this.rotated) { lx = sy; ly = this.cssW - sx; } else { lx = sx; ly = sy; }
    return { x: lx / this.scale, y: ly / this.scale };
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
    if (this.rotated) ctx.setTransform(0, d, -d, 0, this.canvas.width, 0);
    else ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.scale(this.scale, this.scale);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (this.scene?.root) this.scene.root.render(ctx);
    this.overlay.render(ctx);
    if (this.coverK > 0) {
      if (this.transition) this.transition.draw(ctx, this.coverK, this.view);
      else { ctx.globalAlpha = this.coverK; ctx.fillStyle = '#fbf3e6'; ctx.fillRect(0, 0, this.view.w, this.view.h); ctx.globalAlpha = 1; }
    }
  }
}

export const game = new Game();
window.__game = game; // test hook (Playwright)

// Minimal 2D scene graph for canvas rendering.
// A Node draws its `img` (canvas/image, sized w×h, anchored at ax/ay), then `drawFn(ctx, node)`, then children.
let NEXT_ID = 1;

export class Node {
  constructor(o = {}) {
    this.id = NEXT_ID++;
    this.x = 0; this.y = 0; this.rot = 0; this.sx = 1; this.sy = 1; this.alpha = 1;
    this.visible = true; this.z = 0;
    this.ax = 0.5; this.ay = 0.5; this.w = 0; this.h = 0;
    this.img = null; this.drawFn = null;
    this.interactive = false; // pickable by the input system
    this.hitR = 0;            // >0: circular hit area (local units) instead of the w×h rect
    this.hitPad = 0;          // extra rect padding for fat-finger friendliness
    this.children = []; this.parent = null;
    this.composite = null;    // optional globalCompositeOperation
    Object.assign(this, o);
  }
  add(...cs) { for (const c of cs) { if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); } this._dirty = true; return cs[0]; }
  remove(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parent = null; } return c; }
  removeSelf() { if (this.parent) this.parent.remove(this); }
  toTop() { const p = this.parent; if (!p) return; p.remove(this); p.add(this); }
  setImage(sprite) { this.img = sprite.img; this.w = sprite.w; this.h = sprite.h; return this; }
  sortZ() { this.children.sort((a, b) => a.z - b.z); }

  render(ctx) {
    if (!this.visible || this.alpha <= 0) return;
    if (this._dirty) { this._dirty = false; if (this.children.some(c => c.z)) this.sortZ(); }
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.rot) ctx.rotate(this.rot);
    if (this.sx !== 1 || this.sy !== 1) ctx.scale(this.sx, this.sy);
    if (this.alpha !== 1) ctx.globalAlpha *= this.alpha;
    if (this.composite) ctx.globalCompositeOperation = this.composite;
    if (this.img) ctx.drawImage(this.img, -this.ax * this.w, -this.ay * this.h, this.w, this.h);
    if (this.drawFn) this.drawFn(ctx, this);
    for (let i = 0; i < this.children.length; i++) this.children[i].render(ctx);
    ctx.restore();
  }

  // World (stage design-space) point -> this node's local space.
  toLocal(px, py) {
    const chain = []; let n = this; while (n) { chain.push(n); n = n.parent; }
    let x = px, y = py;
    for (let i = chain.length - 1; i >= 0; i--) {
      const m = chain[i];
      x -= m.x; y -= m.y;
      if (m.rot) { const c = Math.cos(-m.rot), s = Math.sin(-m.rot); const nx = x * c - y * s; y = x * s + y * c; x = nx; }
      x /= m.sx || 1e-6; y /= m.sy || 1e-6;
    }
    return { x, y };
  }
  // This node's local point -> world (stage design-space).
  toWorld(lx = 0, ly = 0) {
    let n = this, x = lx, y = ly;
    while (n) {
      x *= n.sx; y *= n.sy;
      if (n.rot) { const c = Math.cos(n.rot), s = Math.sin(n.rot); const nx = x * c - y * s; y = x * s + y * c; x = nx; }
      x += n.x; y += n.y; n = n.parent;
    }
    return { x, y };
  }
  hitTest(px, py) {
    const p = this.toLocal(px, py);
    if (this.hitR > 0) return p.x * p.x + p.y * p.y <= this.hitR * this.hitR;
    const l = -this.ax * this.w - this.hitPad, t = -this.ay * this.h - this.hitPad;
    return p.x >= l && p.x <= l + this.w + this.hitPad * 2 && p.y >= t && p.y <= t + this.h + this.hitPad * 2;
  }
  isShown() { let n = this; while (n) { if (!n.visible || n.alpha <= 0) return false; n = n.parent; } return true; }
  // Topmost interactive descendant (including self) under the point, in render order.
  pick(px, py) {
    if (!this.visible || this.alpha <= 0) return null;
    for (let i = this.children.length - 1; i >= 0; i--) { const r = this.children[i].pick(px, py); if (r) return r; }
    if (this.interactive && this.hitTest(px, py)) return this;
    return null;
  }
}

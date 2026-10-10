// Drag-and-drop helper for puzzle pieces. Scenes forward pointer events to a DragController.
import { tween, killTweensOf } from './tween.js';

export class DragController {
  /**
   * root: the Node subtree to pick draggables from (nodes need .interactive = true and .draggable = true).
   * hooks: { onPick(node,p), onMove(node,p), onDrop(node,p) -> bool (true = accepted, else returns home), onTap(node,p) }
   */
  constructor(root, hooks = {}) { this.root = root; this.hooks = hooks; this.drag = null; this.enabled = true; }

  pointerDown(p) {
    if (!this.enabled) return false;
    const n = this.root.pick(p.x, p.y);
    if (!n) return false;
    if (!n.draggable) { this.hooks.onTap?.(n, p); return true; }
    killTweensOf(n, 'drag');
    const parentPt = n.parent ? n.parent.toLocal(p.x, p.y) : p;
    this.drag = { node: n, ox: n.x - parentPt.x, oy: n.y - parentPt.y, start: { x: p.x, y: p.y }, moved: false };
    if (n.home === undefined) n.home = { x: n.x, y: n.y, rot: n.rot, sx: n.sx, sy: n.sy };
    n.toTop();
    this.hooks.onPick?.(n, p);
    return true;
  }
  pointerMove(p) {
    const d = this.drag; if (!d) return;
    const n = d.node, parentPt = n.parent ? n.parent.toLocal(p.x, p.y) : p;
    if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 8) d.moved = true;
    n.x = parentPt.x + d.ox; n.y = parentPt.y + d.oy;
    this.hooks.onMove?.(n, p);
  }
  pointerUp(p) {
    const d = this.drag; if (!d) return; this.drag = null;
    const ok = this.hooks.onDrop?.(d.node, p, d.moved);
    if (!ok) this.returnHome(d.node);
  }
  returnHome(n, dur = 0.45) {
    const h = n.home; if (!h) return Promise.resolve();
    return tween(n, { x: h.x, y: h.y, rot: h.rot, sx: h.sx, sy: h.sy }, { dur, ease: 'outBack', tag: 'drag' });
  }
}

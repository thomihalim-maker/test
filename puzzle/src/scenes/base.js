// Shared level scaffolding. Every level scene extends LevelScene (see CONTRACT.md).
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { save } from '../engine/save.js';
import { DragController } from '../engine/drag.js';
import { createHud, showWin } from './ui.js';

export class LevelScene {
  /** subclasses set static level = 1|2|3 and static title */
  constructor(game_, args) {
    this.args = args;
    this.root = new Node();
    this.world = this.root.add(new Node());   // backgrounds, characters, puzzle
    this.uiLayer = this.root.add(new Node()); // HUD + overlays
    this.drag = new DragController(this.world, {
      onPick: (n, p) => this.onPick?.(n, p), onMove: (n, p) => this.onMove?.(n, p),
      onDrop: (n, p, moved) => this.onDrop?.(n, p, moved) ?? false, onTap: (n, p) => this.onTap?.(n, p),
    });
    this.finished = false;
  }
  get level() { return this.constructor.level; }
  async load() { this.hud = await createHud(this); }
  layout(view) { this.hud?.layout(view); this.onLayout?.(view); }
  pointerDown(p) { if (this.hud?.pointerDown(p)) return; if (this.finished) { this.winUI?.pointerDown(p); return; } this.drag.pointerDown(p); }
  pointerMove(p) { if (!this.finished) this.drag.pointerMove(p); }
  pointerUp(p) { if (this.hud?.pointerUp?.(p)) return; if (this.finished) return; this.drag.pointerUp(p); }
  exit() { audio.music(null); }
  /** Call once when the puzzle is solved. Shows the celebration + next/replay/home. */
  async complete() {
    if (this.finished) return; this.finished = true; this.drag.enabled = false;
    save.setStars(this.level, 3);
    this.winUI = await showWin(this, { stars: 3, next: this.level < 3 ? 'level' + (this.level + 1) : 'finale' });
  }
  /** Debug/screenshot hook: place `n` pieces instantly (Infinity = solve). Levels implement. */
  debugSolve(n = Infinity) {}
}
export { game, audio };

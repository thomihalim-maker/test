// Finale after level 3. STUB — the UI builder owns this file (family celebration, "Hebat!", back to menu).
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { createCharacter } from '../art/characters.js';

export default class Finale {
  constructor() { this.root = new Node(); }
  async load() { this.baby = this.root.add(await createCharacter('baby')); }
  layout(v) { this.baby.x = v.w / 2; this.baby.y = v.h * 0.7; }
  pointerDown() { game.go('menu'); }
}

// Level 1. STUB — the level-1 builder owns this file. See CONTRACT.md.
import { Node } from '../engine/node.js';
import { createCharacter } from '../art/characters.js';
import { LevelScene, game, audio } from './base.js';

export default class Level1 extends LevelScene {
  static level = 1;
  async load() {
    await super.load();
    this.mom = this.world.add(await createCharacter('mom'));
  }
  onLayout(v) { this.mom.x = v.w * 0.25; this.mom.y = v.h - 30; }
  enter() { audio.music('level'); }
  debugSolve() { this.complete(); }
}

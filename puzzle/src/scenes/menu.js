// Title / level select. STUB — the UI builder owns and polishes this file.
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { audio } from '../engine/audio.js';
import { save } from '../engine/save.js';
import { tween } from '../engine/tween.js';
import { createCharacter } from '../art/characters.js';
import { makeButton } from './ui.js';
import { PAL } from '../art/style.js';

export default class MenuScene {
  constructor() { this.root = new Node(); this.buttons = []; }
  async load() {
    this.mom = this.root.add(await createCharacter('mom'));
    this.dad = this.root.add(await createCharacter('dad'));
    this.baby = this.root.add(await createCharacter('baby'));
    for (let i = 1; i <= 3; i++) {
      const b = await makeButton({ icon: 'play', size: 140, color: [PAL.orange, PAL.green, PAL.blue][i - 1] }, () => game.go('level' + i));
      b.level = i; b.alpha = save.unlocked(i) ? 1 : 0.4; this.root.add(b); this.buttons.push(b);
    }
    this.title = this.root.add(new Node({ drawFn: ctx => {
      ctx.font = '700 96px Fredoka, "Baloo 2", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = PAL.babyBlue; ctx.fillText('Bintang Kecil', 0, 0);
    } }));
  }
  layout(v) {
    this.title.x = v.w / 2; this.title.y = 150;
    this.mom.x = v.w / 2 - 330; this.mom.y = v.h - 40;
    this.dad.x = v.w / 2 + 330; this.dad.y = v.h - 40;
    this.baby.x = v.w / 2; this.baby.y = v.h - 60;
    this.buttons.forEach((b, i) => { b.x = v.w / 2 + (i - 1) * 190; b.y = 330; });
  }
  enter() { audio.music('menu'); }
  pointerDown(p) {
    const b = this.root.pick(p.x, p.y);
    if (b && b.onTap) { if (!save.unlocked(b.level)) { audio.sfx('wrong'); return; } audio.sfx('tap'); tween(b, { sx: 0.9, sy: 0.9 }, { dur: 0.08 }); setTimeout(b.onTap, 120); }
  }
}

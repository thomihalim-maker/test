// TEMP character test scene (character builder). Load via:
// node tools/shot.mjs shots/x.png "" 1500 --js "__game.register('t',()=>import('./scenes/_chartest.js'));__game.go('t')"
import { Node } from '../engine/node.js';
import { game } from '../engine/game.js';
import { createCharacter, portraitSprite } from '../art/characters.js';

export default class CharTest {
  constructor() { this.root = new Node(); }
  async load() {
    const p = game.params;
    this.bg = this.root.add(new Node({ drawFn: (c) => { c.fillStyle = '#fbf3e6'; c.fillRect(0, 0, 4000, 4000); } }));
    if (p.get('portrait') != null || window.__portrait) {
      const sp = await portraitSprite(900, 600);
      this.pic = this.root.add(new Node({ ax: 0.5, ay: 0.5 }).setImage(sp));
      if (window.__cut) this.pic.drawFn = (c, n) => { c.strokeStyle = '#000'; c.lineWidth = 3; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(-450 + i * 300, -300); c.lineTo(-450 + i * 300, 300); c.stroke(); } c.beginPath(); c.moveTo(-450, 0); c.lineTo(450, 0); c.stroke(); };
      return;
    }
    this.mom = this.root.add(await createCharacter('mom'));
    this.dad = this.root.add(await createCharacter('dad'));
    this.baby = this.root.add(await createCharacter('baby'));
    const m = window.__mood;
    if (m) for (const c of [this.mom, this.dad, this.baby]) c.setMood(m);
  }
  layout(v) {
    if (this.pic) { this.pic.x = v.w / 2; this.pic.y = v.h / 2; return; }
    this.mom.x = v.w / 2 - 420; this.mom.y = v.h - 50;
    this.dad.x = v.w / 2 + 420; this.dad.y = v.h - 50;
    this.baby.x = v.w / 2; this.baby.y = v.h - 50;
  }
}

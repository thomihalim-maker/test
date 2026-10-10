# Bintang Kecil — build contract (read fully before editing)

Preschool (ages 3–5) puzzle game for phones, Indonesian. 3 levels + finale. Plain ES modules, no build, no npm deps,
canvas 2D. Must look like a AAA studio made it: hand-drawn crayon/pencil style matching `assets/reference.png`
(soft pastel crayon fills with paper grain, wobbly soft-grey pencil outlines, white faces with pink cheeks,
tiny dot eyes, cream paper background), with lots of juice: squash & stretch, anticipation, easing, particles,
idle life, reactions, satisfying snaps, celebratory finale.

## Cast (from the reference image)
- **Ibu** (mom): orange-coral hijab tied at the side of the head with a small knot/ribbon, scalloped hair-line peeking
  under the hijab, pink long-sleeve shirt, white round face, pink cheeks, small dot eyes with tiny lashes/brows.
- **Ayah** (dad): fluffy scribbled grey curly hair, white round face with stubble dots around the mouth, round ears,
  green t-shirt.
- **Bintang** (baby): round white head, closed happy eyes (sleepy arcs), pink cheeks, swaddled in a deep-blue blanket
  with Van-Gogh-style light-blue swirls and yellow stars.
Story: Ibu and Ayah look after baby Bintang. No text needed to play; any text is short Indonesian.

## Levels (each = one file, owned by one builder)
1. `src/scenes/level1.js` **"Siap Tidur" (shape match)**: a cosy nursery. Baby's crib/basket has 4–5 dotted silhouette
   slots (milk bottle, teddy bear, pillow, rattle, blanket/socks). Kid drags each item from a tray into its matching
   silhouette. Ibu is present and reacts. Finish → baby falls asleep (sleep mood, Zzz / stars).
2. `src/scenes/level2.js` **"Warna-warni" (colour sort)**: Ayah tidies up baby's toys. 3 coloured baskets (red, yellow,
   blue); 6–9 toys (balls, blocks, ducks…) scattered, each one of the 3 colours. Drag each toy to the basket of its colour.
3. `src/scenes/level3.js` **"Foto Keluarga" (jigsaw)**: a 6-piece jigsaw (2×3, real jigsaw-tab shapes) of a family
   portrait of Ibu, Ayah and Bintang (rendered from the character art). A faint ghost image guides placement. Finish →
   the photo "comes alive" (characters animate), camera-flash, confetti.
Rules for all levels: no fail state, no timer. Wrong drop = piece gently returns home with a soft boing and a little
character reaction ("hmm"). Correct = magnetic snap (snap radius generous: ~90 design units), sparkle burst, sound,
character cheers. After ~6 s of no interaction show a hint (pointing hand/glow wiggle on a correct piece).
Big touch targets (≥ 120 design units). Pieces pick up with a lift (scale 1.1, drop shadow) and tilt while dragged.

## Design space / engine (src/engine — owned by the orchestrator; ask before changing)
- Landscape design space, height 900, width ≥ 1600 (`game.view.w` grows on wide phones, e.g. ~1950 on iPhone).
  Lay out relative to `view` in `onLayout(view)` / `layout(view)`; keep important content inside the central 1600×900.
  Portrait screens are auto-rotated — never assume portrait.
- `Node` (node.js): scene graph; x,y,rot,sx,sy,alpha,z,ax,ay,w,h,img,drawFn(ctx,node), interactive, hitR, hitPad,
  draggable, children, pick(), toLocal(), toWorld(), toTop().
- `svgSprite(svgString, w, h, cacheKey)` (raster.js) → Promise<{img,w,h}>; `node.setImage(sprite)`.
  Author art as SVG strings with `svg(w,h,inner)`, `stroke()`, `fill()`, `PAL` from `src/art/style.js`
  (filters `#crayon`, `#pencil`, `#blush`). `canvasSprite(w,h,fn)` for procedural canvas drawing.
  Rasterize at load time only (never per frame). Sprites are cached by key.
- `tween(obj, props, {dur, ease, delay, tag})` → Promise; `wait(sec)`; `Ease.*`; `rng(seed)` for deterministic jitter.
- `game.onUpdate(fn(dt,t))` per-frame (auto-cleared on scene change). `game.go(name)` switches scene.
- `DragController` (drag.js): set `node.interactive = node.draggable = true`; LevelScene wires onPick/onMove/onDrop(node,p,moved)->bool/onTap.
  `this.drag.returnHome(node)`.
- `audio.sfx(name)` names: tap, pick, drop, snap, wrong, whoosh, sparkle, star, cheer, pop, giggle, win, unlock;
  `audio.music('menu'|'level'|null)`; `audio.voice('Ayo bantu Ibu!')` (optional spoken line).
- `fx` particles: `src/art/fx.js` (UI builder) — `burst(parentNode, x, y, kind)` kinds: sparkle, stars, confetti, hearts, dust, zzz.
  Until it exists, guard with optional usage or implement locally.

## Characters (src/art/characters.js — owned by the character builder)
`const mom = await createCharacter('mom'|'dad'|'baby')` → Node subclass, origin = bottom centre.
Heights at scale 1: mom ≈ 560, dad ≈ 600, baby ≈ 230 (scale with sx/sy). Methods: `setMood(m)`, `react(m, sec)`,
`talk(sec)`, `lookAt(x,y)|lookAt(null)`. Moods: idle, happy, cheer, surprised, think, sad, sleep (baby).
Also `await portraitSprite(w, h)` → sprite of the 3-person family portrait for the level-3 jigsaw.
Rigged in parts (head, eyes w/ blink, brows, mouth shapes, arms/hands, body) so moods are real poses, not just bobbing.

## Level scenes
`export default class LevelN extends LevelScene { static level = N; async load(){ await super.load(); … } onLayout(v){} enter(){} }`
Add art/characters to `this.world`, UI to `this.uiLayer`. Call `this.complete()` when solved (shows win UI).
Implement `debugSolve(n)` (instantly place n pieces; Infinity = all + complete) for screenshots.
Each level may keep its props' SVG in its own file `src/art/props_levelN.js`.

## Ownership (do not edit files you do not own; coordinate through this contract)
- characters builder: `src/art/characters.js`
- level builders: `src/scenes/levelN.js`, `src/art/props_levelN.js`
- UI/juice builder: `src/scenes/ui.js`, `src/scenes/menu.js`, `src/scenes/finale.js`, `src/art/fx.js`, `src/art/backgrounds.js` (shared paper texture / room helpers), transition curtain (`game.transition`, set from ui.js/menu)
- audio builder: `src/engine/audio.js`
- orchestrator: everything else (engine, main.js, index.html, tools)

## Verify
`node tools/shot.mjs shots/x.png "scene=level1&unlock" 2500` (844×390 @3x phone landscape). Also check
`... 2500 932 430 3` (wide phone) and `... 2500 1024 768 2` (tablet). Read the PNG. Zero console errors required.
Use `--js "__game.scene.debugSolve(2)"` to stage mid-puzzle states. URL params: scene=, unlock, mute, speed=.

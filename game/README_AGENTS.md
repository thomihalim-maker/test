# Marbot Masjid — module contract
Game: cozy stylized 3D sim. You are the *marbot* (mosque caretaker) at a village mosque-in-progress. Care for sacrificial animals (goats, sheep, cows) for Idul Adha, and build up the masjid so visitors (jamaah) come. Theme: warm Indonesian village, golden light, lush greenery. Target: Pokopia / Animal Crossing level of polish (soft shading, rich color, juicy animation).
- Pure ES modules, no build. Three r170 via import map (`three`, `three/addons/`). No network at runtime. No external assets: everything procedural (geometry, canvas textures, WebAudio).
- Each module file exports `async init(ctx)` and returns `{update(dt,t), ...api}`. See src/ctx.js, src/main.js.
- Own ONLY your files/dirs. Talk to others via `ctx.emit/on` and `ctx.modules.<name>`.
- Verify with: `node tools/shot.mjs out.png 1280 720 3000 "?cam=..."` and Read the PNG. Keep zero console errors. Mobile perf matters (budget: <250 draw calls, instancing for repeats).
- Respect religion: no depictions of the Prophet/humans' faces are fine for stylized chars; no synthesized adhan/Quran recitation (use bedug drum, ambience, soft chimes).

## World layout (units ≈ meters, Y up)
- Mosque site: center (0,0), plaza radius 14, flat at y=0. Faces +Z (entrance/qibla-side is -Z wall; mihrab at -Z).
- Animal pen: center (26,6), ~16x12 fenced, flat. Hay/water/wash stations inside. Pen gate faces mosque (-X side).
- Dirt path from plaza (8,6) to pen gate (18,6). Village/entry road comes from +Z toward (0,40).
- Pond at (-24,14). Rice-paddy terraces/hills beyond r=45; island/world edge fades into fog/sea at r≈70.
- Spawn: player at (6,10) facing the mosque.
## Shared APIs
- ctx.groundHeight(x,z) (world), ctx.colliders (push {x,z,r}), ctx.hour, ctx.sun, ctx.scene
- ctx.cameraRig (world): {target:Vector3, yaw, pitch, dist} — characters sets rig.target to follow player. Camera is smooth 3rd-person orbit (drag to rotate, pinch/wheel to zoom).
- ctx.input (characters): {move:Vector2 (-1..1), actionPressed} virtual joystick + WASD; ctx.emit('interact',...) 
- events: 'animal:fed','animal:washed','animal:happy','build:placed','build:complete','coins:change','day:new','visitor:arrive','toast'(msg)
- ctx.modules.audio.play(name,{pos?,vol?}) names: bleat_goat,bleat_sheep,moo,step,pop,coin,build,bedug,splash,munch,ui_tap,chime
- ctx.modules.fx.burst(kind,pos) kinds: sparkle,hearts,dust,leaf,water,coin,confetti
- ctx.modules.animals.list (array of {mesh,pos,stats:{hunger,thirst,clean,happy},kind}), ctx.modules.animals.nearest(pos,r)
- ctx.modules.masjid.stage / .api.place(partId)

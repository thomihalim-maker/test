// MASJID module: modular, unlockable Nusantara mosque. API: ctx.modules.masjid = {stage, stages, place(id), group, update, playBedug, ...}
import * as THREE from 'three';
import { createAnimator } from './anim.js';
import { makeMaterials, BUILDERS, BEDUG, PL, HALL_Z } from './stages.js';

export const STAGES = [
  { id: 'fondasi', name: 'Fondasi & Plaza', cost: 60, desc: 'Lantai marmer bertingkat, tangga, dan plaza ubin bermotif.' },
  { id: 'dinding', name: 'Dinding & Ruang Salat', cost: 100, desc: 'Dinding berlengkung, jendela kaca patri, serambi bertiang jati.' },
  { id: 'atap', name: 'Atap Tajug Bersusun', cost: 150, desc: 'Tiga tingkat atap tajug berubin tanah liat dengan mustaka emas.' },
  { id: 'menara', name: 'Menara', cost: 120, desc: 'Menara segi delapan dengan balkon, jendela kaca patri, dan kubah.' },
  { id: 'wudhu', name: 'Tempat Wudhu', cost: 80, desc: 'Pancuran wudhu berpendopo dengan kolam segi delapan dan keran.' },
  { id: 'bedug', name: 'Pendopo Bedug', cost: 80, desc: 'Pendopo kayu berisi bedug besar yang bisa ditabuh.' },
  { id: 'interior', name: 'Mihrab, Mimbar & Karpet', cost: 140, desc: 'Mihrab, mimbar berukir, karpet, sajadah, dan lampu gantung.' },
  { id: 'taman', name: 'Taman & Lentera', cost: 100, desc: 'Taman bunga, palem, semak, jalan setapak, dan lentera bercahaya.' },
];

const qs = new URLSearchParams(location.search);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function init(ctx) {
  const { scene, camera } = ctx;
  ctx.state.masjid ??= { stage: 0, parts: {} };
  const st = ctx.state.masjid; st.parts ??= {};
  const forced = qs.has('stage') ? Math.max(0, Math.min(STAGES.length, parseInt(qs.get('stage')) || 0)) : null;
  if (forced !== null) { st.stage = forced; }
  const group = new THREE.Group(); group.name = 'masjid'; scene.add(group);
  const anim = createAnimator(ctx);
  const night = []; // {m, day, night}
  const M = makeMaterials(ctx, night);
  const built = []; // per-stage S objects
  let glassFlash = 0, hallLight = null, nightK = 0, testLights = null;
  const heightFns = [];

  // ---- standalone test harness: only when no world module is present ----
  const standalone = !ctx.modules.world;
  if (standalone) {
    scene.background = new THREE.Color(0xbfe3f5); scene.fog = new THREE.Fog(0xd8eefa, 90, 220);
    const gm = new THREE.Mesh(new THREE.CircleGeometry(90, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6fb55a, roughness: 1 }));
    gm.receiveShadow = true; gm.name = 'masjid-test-ground'; scene.add(gm);
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7a6a4a, 1.0); scene.add(hemi); ctx.hemi ??= hemi;
    const sun = new THREE.DirectionalLight(0xfff0d0, 3.0); sun.position.set(-30, 36, 26); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 5; sc.far = 130; sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
    scene.add(sun); ctx.sun ??= sun; testLights = { hemi, sun };
  }
  const hourParam = qs.has('hour') ? parseFloat(qs.get('hour')) : null;
  if (hourParam !== null) ctx.hour = hourParam;

  // ---- stage construction ----
  function makeS(n, instant) {
    const G = new THREE.Group(); G.name = 'stage' + n; group.add(G);
    const S = {
      ctx, M, G, instant, n,
      R: anim.runner(() => { }),
      col(x, z, r) { ctx.colliders.push({ x, z, r, masjid: true }); },
      flash(v) { if (!S.instant) glassFlash = Math.max(glassFlash, v); },
      finale(pos, delay, kind = 'sparkle') {
        const o = new THREE.Object3D(); o.position.copy(pos);
        S.R.add(o, { delay, dur: .1, onLand: (p) => { if (S.instant) return; ctx.modules.fx?.burst?.(kind, p.clone()); if (kind === 'confetti') ctx.modules.fx?.burst?.('sparkle', p.clone()); } });
      },
    };
    return S;
  }
  function buildStage(n, instant) {
    const S = makeS(n, instant); BUILDERS[n](S);
    built[n] = S;
    if (S.heightAt) heightFns.push(S.heightAt);
    if (S.heightAt && !ctx.__masjidHeightWrapped) {
      ctx.__masjidHeightWrapped = true; const base = ctx.groundHeight;
      ctx.groundHeight = (x, z) => { let h = base(x, z); for (const f of heightFns) h = Math.max(h, f(x, z)); return h; };
    }
    if (S.hallLight && !hallLight) { hallLight = new THREE.PointLight(0xffc678, 6, 15, 1.6); hallLight.position.set(0, PL + 3.2, HALL_Z); group.add(hallLight); }
    if (instant) { S.R.finish(); S.R.update?.(0); } else {
      S.R.onDone = () => { };
    }
    return S;
  }
  for (let n = 1; n <= st.stage; n++) buildStage(n, true);

  // ---- bedug interaction ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, lastHit = -9, prevAct = false;
  function playBedug() {
    const S = built[6]; if (!S || !S.bedug) return false;
    if (ctx.time - lastHit < .28) return false; lastHit = ctx.time;
    const b = S.bedug; b.t = 0;
    for (const r of b.rings) { if (r.t > r.life) { r.t = 0; break; } }
    try { ctx.modules.audio?.play('bedug', { pos: b.pos.clone(), vol: 1 }); } catch (e) { }
    try { ctx.modules.fx?.burst?.('dust', b.pos.clone().add(new THREE.Vector3(0, -.8, 1))); } catch (e) { }
    ctx.emit('bedug:hit', { pos: b.pos.clone() });
    return true;
  }
  ctx.canvas?.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  ctx.canvas?.addEventListener('pointerup', e => {
    if (!down || !built[6]?.bedug) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (moved > 8) return;
    const r = ctx.canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const hits = ray.intersectObject(built[6].bedug.hit, false); if (hits.length) playBedug();
  });
  addEventListener('keydown', e => { if (e.code === 'KeyB' && !e.repeat) { const p = playerPos(); if (!p || p.distanceTo(BEDUG3) < 5) playBedug(); } });
  const BEDUG3 = new THREE.Vector3(BEDUG.x, 0, BEDUG.z);
  function playerPos() { const c = ctx.modules.characters; const o = c?.player?.position ?? c?.player?.pos ?? c?.player?.mesh?.position ?? c?.pos ?? c?.mesh?.position ?? c?.group?.position; return o?.isVector3 ? o : null; }
  ctx.on('interact', (d) => { const p = playerPos(); if (built[6] && p && p.distanceTo(BEDUG3) < 3.6) playBedug(); });

  // ---- test camera ----
  let camParam = null;
  if (qs.has('cam')) { const v = qs.get('cam').split(',').map(Number); if (v.length >= 6 && v.every(Number.isFinite)) camParam = v; }
  if (!camParam && standalone) camParam = [20, 11, 30, 0, 4.5, -2];
  const prevBR = scene.onBeforeRender;
  scene.onBeforeRender = function (...a) { prevBR?.apply(this, a); if (camParam) { camera.position.set(camParam[0], camParam[1], camParam[2]); camera.lookAt(camParam[3], camParam[4], camParam[5]); } };

  // ---- api ----
  function stageIndex(id) { if (typeof id === 'number') return id; const i = STAGES.findIndex(s => s.id === id); return i < 0 ? (parseInt(id) || -1) : i + 1; }
  const api = {
    get stage() { return st.stage; }, set stage(v) { api.setStage(v); },
    stages: STAGES, group, ctx,
    get max() { return STAGES.length; },
    get next() { return STAGES[st.stage] ?? null; },
    get nightFactor() { return nightK; },
    canAfford(id) { const n = id == null ? st.stage + 1 : stageIndex(id); const s = STAGES[n - 1]; return !!s && ctx.state.coins >= s.cost; },
    place(id) {
      const n = id == null ? st.stage + 1 : stageIndex(id);
      if (!(n >= 1 && n <= STAGES.length)) return false;
      if (n !== st.stage + 1) { if (n > st.stage + 1) ctx.emit('toast', 'Bangun tahap sebelumnya dulu: ' + STAGES[st.stage].name); return false; }
      const s = STAGES[n - 1];
      if ((ctx.state.coins ?? 0) < s.cost) { ctx.emit('toast', `Koin kurang (${s.cost} dibutuhkan)`); return false; }
      ctx.state.coins -= s.cost; ctx.state.pahala = (ctx.state.pahala ?? 0) + n * 5;
      st.stage = n; st.parts[s.id] = true;
      buildStage(n, false);
      ctx.emit('coins:change', { coins: ctx.state.coins, pahala: ctx.state.pahala, delta: -s.cost });
      try { ctx.modules.audio?.play('build'); } catch (e) { }
      ctx.emit('build:placed', { stage: n, id: s.id, name: s.name, stages: STAGES.length });
      ctx.emit('toast', `${s.name} dibangun! +${n * 5} pahala`);
      if (n === STAGES.length) setTimeout(() => ctx.emit('build:complete', { stage: n, id: s.id, name: s.name }), 4200);
      return true;
    },
    setStage(v) { // debug / preview: instantly build up to stage v
      v = Math.max(0, Math.min(STAGES.length, v | 0));
      for (let n = st.stage + 1; n <= v; n++) { buildStage(n, true); st.parts[STAGES[n - 1].id] = true; }
      st.stage = Math.max(st.stage, v);
    },
    playBedug, bedugPos: BEDUG3,
    update(dt, t) {
      anim.update(dt);
      if (hourParam !== null) ctx.hour = hourParam;
      const h = ctx.hour ?? 12;
      nightK = Math.max(sstep(17.2, 19.2, h), 1 - sstep(4.8, 6.4, h));
      glassFlash = Math.max(0, glassFlash - dt * 1.4);
      for (const n of night) { n.m.emissiveIntensity = n.day + (n.night - n.day) * nightK + glassFlash * (n.m === M.glass ? 1.6 : 0); }
      M.flame.color.setRGB(1.6 + Math.sin(t * 9) * .1, 1.15, .5);
      if (hallLight) hallLight.intensity = 5 + nightK * 60 + glassFlash * 4;
      M.water.map.offset.set(t * .02, t * .015);
      // droplets
      const S5 = built[5];
      if (S5?.droplets?.ready) {
        const d = S5.droplets, m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
        let i = 0;
        for (let j = 0; j < 8; j++) for (let k = 0; k < 3; k++, i++) {
          const a = j / 8 * Math.PI * 2 + Math.PI / 8, ph = ((t * .9 + k / 3 + j * .13) % 1), r = .1 + ph * 1.15;
          p.set(Math.sin(a) * r, 2.7 + 2.6 * ph * (1 - ph) * 1.1 - ph * ph * 1.75, Math.cos(a) * r); m.compose(p, q, sc); d.mesh.setMatrixAt(i, m);
        }
        for (let j = 0; j < 5; j++) for (let k = 0; k < 3; k++, i++) {
          const ph = ((t * 1.4 + k / 3 + j * .31) % 1);
          p.set(-3.5 + .6 + .1 * ph, 1.12 - ph * .62, -2.2 + j * 1.1); m.compose(p, q, sc.set(1, .6 + ph * .5, 1)); d.mesh.setMatrixAt(i, m); sc.set(1, 1, 1);
        }
        d.mesh.instanceMatrix.needsUpdate = true;
      }
      // bedug pulse + rings
      const S6 = built[6];
      if (S6?.bedug) {
        const b = S6.bedug; b.t += dt;
        const k = Math.exp(-b.t * 7) * Math.sin(b.t * 36);
        if (b.t < 1.2) { b.drum.scale.set(1 - k * .05, 1 + k * .09, 1 + k * .09); b.drum.position.y = 1.95 + Math.abs(k) * .03; }
        else if (!b.rest) { b.drum.scale.set(1, 1, 1); }
        for (const r of b.rings) {
          r.t += dt; const u = r.t / r.life;
          if (u < 1) { r.m.visible = true; r.m.scale.setScalar(.8 + u * 2.6); r.m.material.opacity = (1 - u) * .8; r.m.quaternion.copy(camera.quaternion); } else r.m.visible = false;
        }
      }
      if (testLights) { testLights.sun.intensity = 3 * (1 - .93 * nightK); testLights.hemi.intensity = 1 - .45 * nightK; testLights.sun.color.set(nightK > .5 ? 0x8aa4ff : 0xfff0d0); scene.background.set(nightK > .5 ? 0x0c1230 : 0xbfe3f5); scene.fog.color.copy(scene.background); }
      if (false) { camera.position.set(camParam[0], camParam[1], camParam[2]); camera.lookAt(camParam[3], camParam[4], camParam[5]); }
    },
  };
  api.api = api;
  return api;
}

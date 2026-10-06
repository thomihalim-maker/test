// MASJID module: modular, unlockable Nusantara mosque + 'Desain Masjid' customisation + masjid-care anchors.
// API (ctx.modules.masjid): stage, stages, place(id), setStage(n), group, update, playBedug, bedugPos, playKentongan,
//   spot(name), prayerLayout(), zones(), isInside(x,z), route(from,to), applyCustom(custom,{preview}), customIds, queryCustom,
//   viewFor(cat), setCutaway(key,on), cutaway, setMarker(name,on,{color}), ...
// Draw-call budget note: baseline BEFORE the masjid-care work = 178 calls at ?nt&stage=8&hour=10&cam=22,12,30,0,4,-3
// (42 masjid meshes). Style variants are merged into the shared per-material baked meshes, so they add no calls.
import * as THREE from 'three';
import { createAnimator } from './anim.js';
import { makeMaterials, BUILDERS, BEDUG, PL, HALL_Z } from './stages.js';
import { createSite, createMarkers } from './site.js';
import { createAnchors } from './anchors.js';
import { createCustom, viewFor, bakeKey, parseCustomQuery, sanitizeCustom, CUSTOM_IDS, CUSTOM_DEFAULTS, CUSTOM_SWATCHES, CUSTOM_ORDER, STAGE_OF } from './custom.js';
import { bakeNormalize } from './geo.js';

export const STAGES = [
  { id: 'fondasi', name: 'Fondasi & Plaza', nameEn: 'Foundation & Plaza', cost: 60, desc: 'Lantai marmer bertingkat, tangga, dan plaza ubin bermotif.', descEn: 'Tiered marble platform, stairs and a patterned tile plaza.' },
  { id: 'dinding', name: 'Dinding & Ruang Salat', nameEn: 'Walls & Prayer Hall', cost: 100, desc: 'Dinding berlengkung, kaca patri, serambi dengan kentongan, dan gapura.', descEn: 'Arched walls, stained glass, a veranda with a kentongan, and a gate.' },
  { id: 'atap', name: 'Atap Tajug Bersusun', nameEn: 'Tiered Tajug Roof', cost: 150, desc: 'Atap tajug bersusun dengan mustaka di puncaknya.', descEn: 'A tiered tajug roof crowned with a finial.' },
  { id: 'menara', name: 'Menara', nameEn: 'Minaret', cost: 120, desc: 'Menara tinggi dengan pengeras suara dan lentera.', descEn: 'A tall minaret with loudspeakers and a lantern.' },
  { id: 'wudhu', name: 'Tempat Wudhu', nameEn: 'Ablution Pavilion', cost: 80, desc: 'Pancuran wudhu berpendopo dengan kolam dan keran.', descEn: 'Ablution pavilion with a basin, spouts and taps.' },
  { id: 'bedug', name: 'Pendopo Bedug', nameEn: 'Bedug Pavilion', cost: 80, desc: 'Pendopo kayu berisi bedug besar yang bisa ditabuh.', descEn: 'Teak pavilion with a big bedug drum you can play.' },
  { id: 'interior', name: 'Mihrab, Mimbar & Karpet', nameEn: 'Mihrab, Minbar & Carpets', cost: 140, desc: 'Mihrab, mimbar berukir, karpet, sajadah, dan lampu gantung.', descEn: 'Mihrab niche, carved minbar, carpets, prayer mats and chandeliers.' },
  { id: 'taman', name: 'Taman & Lentera', nameEn: 'Garden & Lanterns', cost: 100, desc: 'Taman bunga, palem, semak, jalan setapak, dan lentera bercahaya.', descEn: 'Flower beds, palms, hedges, a stone path and glowing lanterns.' },
];
const I18N = {
  needPrev: ['Bangun tahap sebelumnya dulu: {name}', 'Build the previous stage first: {name}'],
  noCoins: ['Koin kurang ({cost} dibutuhkan)', 'Not enough coins ({cost} needed)'],
  built: ['{name} dibangun! +{p} pahala', '{name} built! +{p} pahala'],
  kentongan: ['Pukul Kentongan', 'Strike Kentongan'],
};
const qs = new URLSearchParams(location.search);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function init(ctx) {
  const { scene, camera } = ctx;
  const partsFor = n => Object.fromEntries(STAGES.slice(0, n).map(s => [s.id, true]));
  const forced = qs.has('stage') ? Math.max(0, Math.min(STAGES.length, parseInt(qs.get('stage')) || 0)) : null;
  let st;
  if (forced !== null) st = { stage: forced, parts: partsFor(forced), preview: true }; // LOCAL preview: never written to ctx.state / save
  else {
    ctx.state.masjid ??= { stage: 0, parts: {} };
    st = ctx.state.masjid; st.stage = Math.max(0, Math.min(STAGES.length, st.stage | 0)); st.parts = partsFor(st.stage);
  }
  const lang = () => (ctx.state.lang ?? ctx.state.settings?.lang) === 'en' ? 1 : 0;
  const tr = (k, v = {}) => { let s = I18N[k][lang()]; for (const a in v) s = s.replace('{' + a + '}', v[a]); return s; };
  const sName = s => lang() ? s.nameEn : s.name;
  let completeSent = !!st.complete, building = 0;
  const group = new THREE.Group(); group.name = 'masjid'; scene.add(group);
  const anim = createAnimator(ctx);
  const night = []; // {m, day, night}
  const M = makeMaterials(ctx, night);
  const built = []; // per-stage S objects
  let glassFlash = 0, hallLight = null, nightK = 0, testLights = null;
  const heightFns = [];
  ctx.interactables ??= [];
  ctx.routes ??= [];

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
  if (hourParam !== null && standalone) ctx.hour = hourParam; // the world module owns the clock (and reads ?hour itself)

  function playerPos() { const c = ctx.modules.characters; const o = c?.player?.position ?? c?.player?.pos ?? c?.player?.mesh?.position ?? c?.pos ?? c?.mesh?.position ?? c?.group?.position; return o && Number.isFinite(o.x) && Number.isFinite(o.z) ? o : null; }

  // ---- anchors + customisation (both must exist before any stage is built) ----
  const stageRef = { get stage() { return st.stage; } };
  const anchors = createAnchors(ctx, stageRef);
  const queryCustom = parseCustomQuery(qs.get('custom'));
  const bakeGroup = new THREE.Group(); bakeGroup.name = 'masjid-baked'; group.add(bakeGroup);
  const custom = createCustom(ctx, {
    M, group, bakeParent: bakeGroup, initial: { ...(ctx.state.masjid?.custom || {}), ...(queryCustom || {}) },
    isBuilt: n => !!built[n], isBaked: n => !!built[n]?.baked, sajadah: () => built[7]?.sajadah, lanterns: () => built[8]?.lanterns,
    playerPos, stage: () => st.stage,
  });
  if (qs.get('cutaway') === '1') custom.setCutaway('query', true);

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
      variant: cat => custom.buildVariant(S, cat),
      layout: () => anchors.prayerLayout({ stage: Math.max(n, st.stage), staticOnly: true }),
      matTints: () => custom.matTints(),
      lanternGeos: () => custom.lanternGeos(),
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
      building++;
      S.R.onDone = () => { building = Math.max(0, building - 1); bake([S]); custom.afterBake(); if (n === STAGES.length) sendComplete(); };
    }
    return S;
  }
  function sendComplete() {
    if (completeSent) return; completeSent = true; st.complete = true;
    const s = STAGES[STAGES.length - 1]; ctx.emit('build:complete', { stage: STAGES.length, id: s.id, name: sName(s) });
  }

  // ---- static batching: once a stage has finished animating, merge its static meshes per material into the composer's
  //      shared meshes; style-variant roots (userData.variant) become toggleable layers of those same meshes.
  function bake(list) {
    group.updateMatrixWorld(true);
    const inv = group.matrixWorld.clone().invert(), add = new Map();
    for (const S of list) {
      const keep = new Set(), keepRoots = [], layerRoots = [];
      S.G.traverse(o => {
        if (keep.has(o)) return;
        if (o.userData.variant) { layerRoots.push(o); o.traverse(c => keep.add(c)); }
        else if (o.userData.keep || o.isInstancedMesh) { keepRoots.push(o); o.traverse(c => keep.add(c)); }
      });
      const dispose = [];
      S.G.traverse(o => {
        if (!o.isMesh || keep.has(o)) return;
        let vis = true; for (let p = o; p && p !== S.G; p = p.parent) if (!p.visible) vis = false;
        const mat = o.material;
        // A collapsed (scale 0) piece has a singular matrix: skip it rather than bake degenerate geometry.
        if (vis && Math.abs(o.matrixWorld.determinant()) < 1e-9) vis = false;
        if (vis && !Array.isArray(mat) && mat.visible !== false) {
          const key = bakeKey(mat, o.castShadow, o.geometry.attributes.color?.itemSize === 4);
          if (!add.has(key)) add.set(key, { mat, cast: o.castShadow, list: [] });
          add.get(key).list.push(bakeNormalize(o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
        }
        dispose.push(o.geometry);
      });
      for (const k of keepRoots) group.attach(k);
      for (const r of layerRoots) custom.adopt(r, inv);
      group.remove(S.G); S.G = null; S.baked = true;
      for (const g of new Set(dispose)) g.dispose();
    }
    for (const [key, { mat, cast, list }] of add) custom.composer.addStatic(key, mat, cast, list);
  }
  { const init = []; for (let n = 1; n <= st.stage; n++) init.push(buildStage(n, true)); if (init.length) { bake(init); custom.afterBake(); } }

  // ---- bedug interaction ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, lastHit = -9;
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
  const BEDUG3 = new THREE.Vector3(BEDUG.x, 0, BEDUG.z);
  const _dm = new THREE.Matrix4(), _dp = new THREE.Vector3(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3(1, 1, 1); // droplet scratch (no per-frame allocs)

  // ---- kentongan (stage 2): strike -> damped swing, wooden tok-tok (audio 'kentongan'), dust, 'kentongan:hit' ----
  let lastKen = -9;
  const KEN_DRUM = new THREE.Vector3(-4.5, PL + 2.1, 6.1);
  function playKentongan() {
    const k = built[2]?.kentongan; if (!k) return false;
    if (ctx.time - lastKen < .28) return false; lastKen = ctx.time;
    k.amp = Math.min(.46, (k.t < 2 ? (k.amp || 0) * Math.exp(-k.t * 2.6) : 0) + .3); k.t = 0;
    const pos = KEN_DRUM.clone();
    try { ctx.modules.audio?.play?.('kentongan', { pos: pos.clone(), vol: 1 }); } catch (e) { }
    try { ctx.modules.fx?.burst?.('dust', new THREE.Vector3(pos.x, PL + 1.75, pos.z + .25), 6); } catch (e) { }
    ctx.emit('kentongan:hit', { pos: { x: pos.x, y: pos.y, z: pos.z } });
    return true;
  }
  const kenStand = new THREE.Vector3(-4.5, PL, 7.3);
  ctx.interactables.push({
    kind: 'kentongan', get label() { return tr('kentongan'); }, icon: 'kentongan', pos: kenStand, r: 2.2, priority: .8,
    anim: 'bedug', yaw: Math.PI, enabled: () => st.stage >= 2 && !!built[2]?.kentongan,
  });

  ctx.on('interact', (d) => {
    if (d?.kind === 'kentongan') { playKentongan(); return; }
    if (!built[6]) return;
    if (d?.kind) { if (d.kind === 'bedug') playBedug(); return; }
    const p = d?.pos ?? playerPos(); if (p && Math.hypot(p.x - BEDUG.x, p.z - BEDUG.z) < 3.6) playBedug();
  });

  // ---- prayer / care markers (spot-anchored) + reactions to the prayer flow ----
  const markers = createMarkers(ctx, group, name => anchors.spot(name));
  const setMarker = (name, on, o = {}) => markers.set(name, on, o);
  const offAll = () => { for (const n of ['adzan', 'imam', 'kentongan', 'bedug']) markers.set(n, false); };
  ctx.on('prayer:soon', () => setMarker('adzan', true));
  ctx.on('prayer:open', () => { setMarker('adzan', true); if (st.stage >= 2) setMarker('kentongan', true); if (st.stage >= 6) setMarker('bedug', true); });
  ctx.on('adzan:start', () => { for (const n of ['adzan', 'kentongan', 'bedug']) setMarker(n, false); });
  ctx.on('prayer:ready', () => setMarker('imam', true));
  ctx.on('prayer:lead', d => { setMarker('imam', false); if (!d || d.imam !== 'npc') custom.setCutaway('prayer', true); });
  ctx.on('prayer:done', () => { setMarker('imam', false); custom.setCutaway('prayer', false); });
  ctx.on('prayer:close', () => { offAll(); custom.setCutaway('prayer', false); });
  ctx.on('day:new', () => { offAll(); custom.setCutaway('prayer', false); });

  // ---- routes: hall door + walk around the hall (characters.walkTo tries ctx.routes in order) ----
  // walkTo takes the FIRST non-null route, so splice in the other routes (e.g. the animal pen gate) before/after our legs.
  const routeFn = (from, to) => {
    let p; try { p = anchors.route(from, to); } catch (e) { return null; }
    if (!p || !p.length) return null;
    const via = (a, b) => { for (const r of ctx.routes) { if (r === routeFn) continue; try { const q = r(a, b); if (Array.isArray(q) && q.length) return q; } catch (e) { } } return null; };
    return [...(via(from, p[0]) || []), ...p, ...(via(p[p.length - 1], to) || [])];
  };
  ctx.routes.push(routeFn);

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
    get stages() { return STAGES.map(s => ({ id: s.id, name: sName(s), cost: s.cost, desc: lang() ? s.descEn : s.desc })); },
    group, ctx,
    get max() { return STAGES.length; },
    get next() { return api.stages[st.stage] ?? null; },
    get preview() { return !!st.preview; },
    get building() { return building > 0; },
    lang,
    get nightFactor() { return nightK; },
    get drawables() { let n = 0; group.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible && o.material?.visible !== false) { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) n++; } }); return n; },
    canAfford(id) { const n = id == null ? st.stage + 1 : stageIndex(id); const s = STAGES[n - 1]; return !!s && (ctx.state.coins ?? 0) >= s.cost; },
    place(id) {
      const n = id == null ? st.stage + 1 : stageIndex(id);
      if (!(n >= 1 && n <= STAGES.length)) return false;
      if (n !== st.stage + 1) { if (n > st.stage + 1) ctx.emit('toast', tr('needPrev', { name: sName(STAGES[st.stage]) })); return false; }
      const s = STAGES[n - 1], ui = ctx.modules.ui, reward = n * 5;
      if ((ctx.state.coins ?? 0) < s.cost) { ctx.emit('toast', tr('noCoins', { cost: s.cost })); return false; }
      if (typeof ui?.spend === 'function') { if (ui.spend(s.cost) === false) { ctx.emit('toast', tr('noCoins', { cost: s.cost })); return false; } }
      else { ctx.state.coins -= s.cost; ctx.emit('coins:change', { coins: ctx.state.coins }); }
      if (typeof ui?.addPahala === 'function') ui.addPahala(reward, 'masjid');
      else { ctx.state.pahala = (ctx.state.pahala ?? 0) + reward; ctx.emit('coins:change', { coins: ctx.state.coins }); }
      st.stage = n; st.parts = partsFor(n);
      buildStage(n, false);
      try { ctx.modules.audio?.play('build'); } catch (e) { }
      ctx.emit('build:placed', { stage: n, id: s.id, name: sName(s), stages: STAGES.length });
      ctx.emit('toast', tr('built', { name: sName(s), p: reward }));
      return true;
    },
    setStage(v) { // debug / preview: instantly build up to stage v
      v = Math.max(0, Math.min(STAGES.length, v | 0));
      const list = []; for (let n = st.stage + 1; n <= v; n++) list.push(buildStage(n, true));
      st.stage = Math.max(st.stage, v); st.parts = partsFor(st.stage);
      if (list.length) { bake(list); custom.afterBake(); }
    },
    playBedug, bedugPos: BEDUG3,
    // ---- masjid care anchors ----
    spot: name => anchors.spot(name),
    prayerLayout: (o) => anchors.prayerLayout(o),
    zones: () => anchors.zones(),
    isInside: (x, z) => anchors.isInside(x, z),
    route: (from, to) => anchors.route(from, to),
    playKentongan, kentonganPos: KEN_DRUM,
    setMarker, get markers() { return markers.active; },
    // ---- customisation ----
    applyCustom(c, o = {}) { try { return custom.apply(c, o); } catch (e) { console.error('masjid.applyCustom', e); return false; } },
    customIds: CUSTOM_IDS, customDefaults: CUSTOM_DEFAULTS, customSwatches: CUSTOM_SWATCHES, customOrder: CUSTOM_ORDER, customStage: STAGE_OF,
    get customApplied() { return custom.applied; },
    queryCustom: queryCustom ? { ...queryCustom } : null,
    viewFor: cat => viewFor(cat),
    setCutaway: (key, on) => custom.setCutaway(key, on),
    get cutaway() { return custom.cutaway; },
    get cutawayKeys() { return custom.cutKeys; },
    sanitizeCustom,
    update(dt, t) {
      anim.update(dt);
      site.update(dt, t);
      markers.update(dt, t);
      custom.update(dt);
      const h = ctx.hour ?? 12;
      nightK = Math.max(sstep(17.2, 19.2, h), 1 - sstep(4.8, 6.4, h));
      glassFlash = Math.max(0, glassFlash - dt * 1.4);
      for (const n of night) { n.m.emissiveIntensity = n.day + (n.night - n.day) * nightK + glassFlash * (n.m === M.glass ? 1.6 : 0); }
      M.flame.color.setRGB(1.6 + Math.sin(t * 9) * .1, 1.15, .5);
      if (hallLight) hallLight.intensity = 5 + nightK * 60 + glassFlash * 4;
      M.water.map.offset.set(t * .02, t * .015);
      // kentongan swing (damped pendulum about the rope knot)
      const K = built[2]?.kentongan;
      if (K && K.t < 4) { K.t += dt; const a = (K.amp || .3) * Math.exp(-K.t * 2.6); K.obj.rotation.x = a * Math.sin(K.t * 7.4); K.obj.rotation.z = a * .22 * Math.sin(K.t * 5.1 + .6); if (K.t >= 4) K.obj.rotation.set(0, 0, 0); }
      // droplets
      const S5 = built[5];
      if (S5?.droplets?.ready) {
        const d = S5.droplets, m = _dm, p = _dp, q = _dq, sc = _ds;
        let i = 0;
        d.spouts.forEach((s, j) => {
          for (let k = 0; k < d.PER; k++, i++) {
            const ph = ((t * (s.slow ? .9 : 1.6) + k / d.PER + j * .37) % 1), tt = ph * s.T;
            p.set(s.p.x + s.v.x * tt, s.p.y + s.v.y * tt - 4.9 * tt * tt, s.p.z + s.v.z * tt);
            sc.set(1, .8 + ph * .6, 1); m.compose(p, q, sc); d.mesh.setMatrixAt(i, m);
          }
        });
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
    },
  };
  api.custom = { apply: api.applyCustom, ids: CUSTOM_IDS, defaults: CUSTOM_DEFAULTS, swatches: CUSTOM_SWATCHES, get current() { return custom.applied; }, viewFor };
  api._debug = { custom, anchors, markers, built, setCam: v => { camParam = Array.isArray(v) && v.length >= 6 && v.every(Number.isFinite) ? v.slice(0, 6) : null; } };
  const site = createSite(ctx, M, group, api);
  api.site = site;
  api.api = api;
  return api;
}

// MASJID CARE: dirt (leaves, dust, mud, footprints) slowly gathers on the plaza, porch, hall and around the wudhu area;
// the marbot sweeps (sapu) and mops (pel) it away and bags the leaf piles. Data + simulation live here, drawing in
// dirt.js; sounds/particles come from audio/fx listening to the care:* events. Gentle by design: no penalties, the
// kebersihan meter only nudges how many jamaah come and how generous they feel.
import { createDirtRenderer } from './dirt.js';
import { save } from '../state.js';

export const TYPES = { leaf:{ t:0, tool:'sapu', w:.6 }, dust:{ t:1, tool:'sapu', w:.8 }, mud:{ t:2, tool:'pel', w:1.4 }, print:{ t:3, tool:'pel', w:1 } };
const TN = ['leaf','dust','mud','print'];
const KIND_TOOL = { sweep:'sapu', mop:'pel', gather:null };
const ZONE_TYPES = { plaza:['leaf'], porch:['leaf','dust','mud','print'], hall:['dust','print'], wudhu:['mud'] };
const CAPS = { plaza:36, porch:18, hall:22, wudhu:6 };
const RATES = { plaza:{ leaf:4 }, porch:{ leaf:1, dust:.8 }, hall:{ dust:1.2 }, wudhu:{} };   // spots per in-game hour (spec)
const RAIN = { porch:{ mud:2 }, wudhu:{ mud:1 } };
const STROKE = { sapu:{ leaf:1.0, dust:.55 }, pel:{ mud:.5, print:.5 } };
const MAX_SPOTS = 160, MAX_PILES = 12, DIV = 30;
// gentle ceiling: natural build-up (time, visitors, overnight) stops once the dirt weight reaches this share of DIV,
// split over the zones by cap, so an un-swept masjid settles around 30% instead of 0. Only debug addDirt ignores it.
const SOFT_MAX = .7, CLEAN_FLOOR = 20;
const PL = .7, MINARET = { x:-11.8, z:-4.5 }, BEDUG = { x:11, z:-3.5 }, WUDHU = { x:-11, z:6.5 };
const LABEL = { sweep:['Sapu','Sweep'], mop:['Pel Lantai','Mop'], gather:['Angkut Daun','Bag Leaves'] };
const ICON = { sweep:'broom', mop:'mop', gather:'leafpile' }, ANIM = { sweep:'sweep', mop:'mop', gather:'scoop' };
const r2 = v => Math.round(v * 100) / 100;
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function init(ctx){
  const S = ctx.state, Q = new URLSearchParams(location.search);
  S.care ??= { v:1, spots:[], piles:[], seeded:false };
  const low = ctx.quality === 'low', capMul = low ? .6 : 1;
  const cap = id => Math.floor((CAPS[id] ?? 10) * capMul);
  const rand = rng(((S.day|0) * 7919 + (S.year|0) * 104729 + 31) >>> 0);
  const R = (a,b) => a + rand() * (b - a);
  const gh = (x,z) => ctx.groundHeight?.(x,z) ?? 0;
  const stageNow = () => { const m = ctx.modules.masjid; return typeof m?.stage === 'number' ? m.stage : (S.masjid?.stage|0); };
  const ui = () => ctx.modules.ui;
  const playerPos = () => ctx.modules.characters?.pos || ctx.cameraRig?.target || null;

  // ---------- zones (masjid.zones() when available, otherwise a built-in approximation of the same areas) ----------
  let stage = stageNow(), zones = [], byId = {};
  const onTiles = (x,z) => stage >= 1 && Math.hypot(x,z) < 13.6 && !(Math.abs(x) < 9.6 && z > -12.2 && z < 10.3);
  const inPlinth = (x,z) => Math.abs(x) < 9.25 && z > -11.5 && z < 9.5;
  const inHall = (x,z) => Math.abs(x) < 5.25 && z > -7.75 && z < 2.25;
  // floor height our decals must clear: plaza tiles stand .14 proud, the stage-7 carpet .035 above the plinth
  function floorFloor(x,z){ let y = gh(x,z); if(onTiles(x,z)) y = Math.max(y, .14); if(stage >= 7 && inHall(x,z)) y = Math.max(y, PL + .035); return y; }
  function footprintFree(x,z){
    if(stage >= 4 && Math.hypot(x-MINARET.x, z-MINARET.z) < 3.4) return false;
    if(stage >= 6 && Math.hypot(x-BEDUG.x, z-BEDUG.z) < 3.3) return false;
    if(stage >= 5 && Math.hypot(x-WUDHU.x, z-WUDHU.z) < 3.0) return false;
    if(stage >= 1 && Math.abs(x) < 4.4 && z > 8.0 && z < 10.6) return false;      // front stairs
    if(stage >= 2 && Math.abs(z - 13.1) < 1.3 && Math.abs(x) > 1.2 && Math.abs(x) < 5.8) return false; // gate halves
    return true;
  }
  function fallbackZones(){
    const Z = [];
    const mk = (id, area, contains, sample) => ({ id, types:ZONE_TYPES[id], area, floorY:floorFloor, contains, sample });
    if(stage >= 1) Z.push(mk('plaza', 330, (x,z) => { const r = Math.hypot(x,z); return r < 13.3 && !inPlinth(x,z) && footprintFree(x,z); },
      rnd => { const a = rnd() * Math.PI * 2, r = 9.8 + Math.sqrt(rnd()) * 3.4; return { x:Math.cos(a) * r, z:Math.sin(a) * r }; }));
    else Z.push(mk('plaza', 420, (x,z) => { const r = Math.hypot(x,z); return r > 3 && r < 12; },
      rnd => { const a = rnd() * Math.PI * 2, r = 3 + Math.sqrt(rnd()) * 9; return { x:Math.cos(a) * r, z:Math.sin(a) * r }; }));
    if(stage >= 1) Z.push(mk('porch', 87, (x,z) => Math.abs(x) < 7.7 && z > 2.75 && z < 8.25,
      rnd => ({ x:(rnd() * 2 - 1) * 7.5, z:2.9 + rnd() * 5.2 })));
    if(stage >= 2) Z.push(mk('hall', 85, (x,z) => Math.abs(x) < 4.7 && z > -7.3 && z < 1.8,
      rnd => ({ x:(rnd() * 2 - 1) * 4.5, z:-7.1 + rnd() * 8.7 })));
    if(stage >= 5) Z.push(mk('wudhu', 25, (x,z) => { const d = Math.hypot(x-WUDHU.x, z-WUDHU.z); return d > 2.6 && d < 3.8; },
      rnd => { const a = rnd() * Math.PI * 2, r = 2.7 + rnd() * 1.0; return { x:WUDHU.x + Math.cos(a) * r, z:WUDHU.z + Math.sin(a) * r }; }));
    return Z;
  }
  function refreshZones(){
    stage = stageNow();
    let Z = null;
    try{ const mz = ctx.modules.masjid?.zones?.(); if(Array.isArray(mz) && mz.length) Z = mz.filter(z => z && typeof z.id === 'string' && typeof z.contains === 'function' && typeof z.sample === 'function'); }catch(e){ console.warn('care: masjid.zones failed', e); }
    if(!Z || !Z.length) Z = fallbackZones();
    zones = Z.map(z => ({ id:z.id, types:Array.isArray(z.types) && z.types.length ? z.types : (ZONE_TYPES[z.id] || ['leaf']), area:z.area || 50, src:z,
      contains:(x,z2) => { try{ return !!z.contains(x,z2); }catch(e){ return false; } },
      sample:(rnd) => { try{ return z.sample(rnd); }catch(e){ return null; } },
      floorY:(x,z2) => { let y = floorFloor(x,z2); try{ const f = z.floorY?.(x,z2); if(Number.isFinite(f)) y = Math.max(y, f); }catch(e){} return y; } }));
    byId = Object.fromEntries(zones.map(z => [z.id, z]));
  }
  const zoneAt = (x,z) => { for(const zn of zones) if(zn.contains(x,z)) return zn; return null; };

  // ---------- live data ----------
  const spots = [], piles = [], orphans = [];   // orphans: saved spots outside today's zones (e.g. ?stage previews) — kept, not shown
  let nextId = 1;
  const renderer = createDirtRenderer(ctx, { cap:MAX_SPOTS });
  renderer.bind(spots, piles);
  const nearCollider = (x,z,pad) => { for(const c of ctx.colliders){ const r = (c.r || c.radius || 0) + pad; const dx = x - c.x, dz = z - c.z; if(dx*dx + dz*dz < r*r) return true; } return false; };
  function freeAt(x,z,spacing=.45){
    if(nearCollider(x,z,.3)) return false;
    for(const s of spots){ const dx = s.x - x, dz = s.z - z; if(dx*dx + dz*dz < spacing*spacing) return false; }
    for(const p of piles){ const dx = p.x - x, dz = p.z - z; if(dx*dx + dz*dz < .8*.8) return false; }
    return true;
  }
  const zoneCount = id => { let n = 0; for(const s of spots) if(s.zone === id) n++; return n; };
  const zoneLoad = id => { let l = 0; for(const s of spots) if(s.zone === id) l += s.amt * TYPES[s.type].w; return l; };
  // natural dirt is allowed while the zone is under its share of the soft ceiling (and the total, piles included, too)
  function roomFor(id){
    let capSum = 0; for(const z of zones) capSum += cap(z.id);
    const budget = SOFT_MAX * DIV * cap(id) / Math.max(1, capSum);
    if(zoneLoad(id) >= budget) return false;
    let tot = piles.length * .3; for(const s of spots) tot += s.amt * TYPES[s.type].w;
    return tot < SOFT_MAX * DIV;
  }
  function makeSpot(type, zn, x, z, amt=1, rot=null, instant=false){
    if(spots.length >= MAX_SPOTS) return null;
    const s = { id:nextId++, type, t:TYPES[type].t, x:r2(x), y:zn.floorY(x,z), z:r2(z), zone:zn.id, amt:Math.min(1, Math.max(.05, amt)), rot:rot ?? r2(rand() * 6.28) };
    spots.push(s); renderer.add(s, instant); return s;
  }
  // one spawn event: leaves arrive in little clusters of 2-4, everything else alone
  function spawnIn(zn, type, n=1, { ignoreCap=false, instant=false, at=null, cluster=0 } = {}){
    let made = 0;
    for(let k = 0; k < n; k++){
      if(spots.length >= MAX_SPOTS || (!ignoreCap && (zoneCount(zn.id) >= cap(zn.id) || !roomFor(zn.id)))) break;
      let p = null;
      for(let tries = 0; tries < 10 && !p; tries++){ const c = at || zn.sample(rand); if(c && Number.isFinite(c.x) && Number.isFinite(c.z) && zn.contains(c.x,c.z) && freeAt(c.x,c.z)) p = c; }
      if(!p) continue;
      if(makeSpot(type, zn, p.x, p.z, 1, null, instant)) made++;
      if(type === 'leaf'){ // cluster mates within .6m
        const extra = cluster ? cluster - 1 : 1 + Math.floor(rand() * 3);
        for(let j = 0; j < extra && k + 1 < n; j++){
          for(let tries = 0; tries < 5; tries++){ const a = rand() * 6.28, r = .3 + rand() * .3, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
            if(zn.contains(x,z) && !nearCollider(x,z,.3) && freeAt(x,z,.28) && (ignoreCap || (zoneCount(zn.id) < cap(zn.id) && roomFor(zn.id)))){ if(makeSpot(type, zn, x, z, 1, null, instant)){ made++; k++; } break; } }
        }
      }
    }
    if(made){ renderer.touch(); persist(); }
    return made;
  }

  // ---------- persistence ----------
  let persistT = 0, needPersist = false;
  function persist(now=false){
    if(!now){ needPersist = true; return; }
    needPersist = false;
    const out = spots.map(s => [s.t, r2(s.x), r2(s.z), r2(s.amt), r2(s.rot)]);
    for(const o of orphans) if(out.length < MAX_SPOTS) out.push(o);
    S.care.spots = out.slice(0, MAX_SPOTS);
    S.care.piles = piles.slice(0, MAX_PILES).map(p => [r2(p.x), r2(p.z), Math.round(Math.min(40, Math.max(1, p.n)))]);
    S.care.v = 1;
  }
  function restore(){
    for(const a of S.care.spots || []){
      const [t, x, z, amt, rot] = a, type = TN[t], zn = type ? zoneAt(x,z) : null;
      if(!type) continue;
      if(zn && spots.length < MAX_SPOTS) makeSpot(type, zn, x, z, amt, rot || 0, true); else orphans.push(a);
    }
    for(const [x, z, n] of S.care.piles || []) if(piles.length < MAX_PILES) piles.push({ id:nextId++, x, y:floorFloor(x,z), z, n });
  }
  // after a build the floors change: re-home spots (new y / zone), park ones that no longer sit in any zone
  function rehome(){
    for(let i = spots.length - 1; i >= 0; i--){ const s = spots[i], zn = zoneAt(s.x, s.z);
      if(!zn){ orphans.push([s.t, s.x, s.z, r2(s.amt), r2(s.rot)]); spots.splice(i,1); continue; }
      s.zone = zn.id; s.y = zn.floorY(s.x, s.z); }
    for(let i = orphans.length - 1; i >= 0; i--){ const a = orphans[i], zn = zoneAt(a[1], a[2]); if(zn && spots.length < MAX_SPOTS){ orphans.splice(i,1); makeSpot(TN[a[0]], zn, a[1], a[2], a[3], a[4], true); } }
    for(const p of piles) p.y = floorFloor(p.x, p.z);
    renderer.touch(); persist();
  }

  // ---------- kebersihan ----------
  function load(list=spots){ let s = 0; for(const sp of list) s += sp.amt * TYPES[sp.type].w; return s; }
  // kebersihan never reads below CLEAN_FLOOR: an un-swept masjid is "ready for a sweep", never a 0 / failure
  function rawClean(){ let l = load(); for(const p of piles) l += .3; return Math.round(100 * Math.min(1, Math.max(0, 1 - l / DIV))); }
  function clean(){ return Math.max(CLEAN_FLOOR, rawClean()); }
  const LEVELS = [[90, 'sparkle', ['Berkilau!','Sparkling!']], [70, 'happy', ['Bersih','Clean']], [40, 'ok', ['Lumayan','Okay']], [0, 'sweep', ['Ayo bersihkan!','Let\'s tidy up!']]];
  function level(c=clean()){ for(const l of LEVELS) if(c >= l[0]) return { face:l[1], label:l[2] }; return { face:'sweep', label:LEVELS[3][2] }; }
  function zoneClean(id){ const l = load(spots.filter(s => s.zone === id)); const c = Math.max(1, (CAPS[id] ?? 10) * .5); return Math.round(100 * Math.min(1, Math.max(0, 1 - l / c))); }
  function attraction(){ const c = clean(); return { clean:c, capMul:.7 + .6 * c / 100, donateMul:.8 + .5 * c / 100, mood:c >= 70 ? 'happy' : c >= 40 ? 'ok' : 'meh', ...level(c) }; }
  let lastClean = null, dirtyDay = -1;
  function evaluate(){
    const c = clean();
    if(S.daily) S.daily.clean = c;
    if(lastClean !== null && c !== lastClean){
      const prev = lastClean; lastClean = c; ctx.emit('care:change', { clean:c, prev, ...level(c) });
      if(c < 50 && prev >= 50 && dirtyDay !== S.day){ dirtyDay = S.day; ctx.emit('care:dirty', { clean:c }); }
    } else lastClean = c;
    // daily milestones (checked on every tick so a steady value still counts)
    const h = ctx.hour ?? 12, D = S.daily, st = S.stats; let q = false;
    if(D && !D.cleanDusk && h >= 17 && h < 20.5 && stage >= 1 && c >= 80){ D.cleanDusk = 1; q = true; }
    if(st && c === 100 && (S.care.c100|0) !== S.day){ S.care.c100 = S.day; st.clean100 = (st.clean100|0) + 1; q = true; }
    if(q){ try{ ctx.modules.progress?.checkQuests?.(); ctx.modules.progress?.checkStickers?.(); }catch(e){} }
    return c;
  }
  function changed(){ renderer.touch(); persist(); evaluate(); }

  // ---------- player actions ----------
  function cleanAt(pos, yaw, tool, power=1, target=null){
    if(!pos || (tool !== 'sapu' && tool !== 'pel')) return { hits:0, removed:0 };
    yaw = Number.isFinite(yaw) ? yaw : 0;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), cx = pos.x + fx * .7, cz = pos.z + fz * .7;
    const tgt = target && Number.isFinite(target.x) && Math.hypot(target.x - pos.x, target.z - pos.z) < 2.8 ? target : null;
    let hits = 0, removed = 0; const leaves = [];
    const zn0 = zoneAt(cx, cz) || zoneAt(pos.x, pos.z);
    for(let i = spots.length - 1; i >= 0; i--){
      const s = spots[i]; if(TYPES[s.type].tool !== tool) continue;
      const d = Math.hypot(s.x - cx, s.z - cz), dt = tgt ? Math.hypot(s.x - tgt.x, s.z - tgt.z) : 9;
      if(d > 1.1 && dt > .9) continue;
      s.amt -= (STROKE[tool][s.type] || .5) * power; hits++;
      const gone = s.amt <= .05;
      ctx.emit('care:clean', { type:s.type, tool, zone:s.zone, pos:{ x:s.x, y:s.y, z:s.z }, amt:Math.max(0, r2(s.amt)), removed:gone });
      if(gone){ removed++; spots.splice(i,1); if(s.type === 'leaf') leaves.push(s); else renderer.remove(s, null); }
      else renderer.poke(s);
    }
    // swept leaves gather into a pile in front of the broom
    if(leaves.length){
      let px = pos.x + fx * 1.2, pz = pos.z + fz * 1.2;
      if(!zoneAt(px,pz) || nearCollider(px,pz,.2)){ px = cx; pz = cz; }
      if(nearCollider(px,pz,.2)){ px = leaves[0].x; pz = leaves[0].z; }
      let pile = null, bd = 1.5;
      for(const p of piles){ const d = Math.min(Math.hypot(p.x - px, p.z - pz), Math.hypot(p.x - cx, p.z - cz)); if(d < bd){ bd = d; pile = p; } }
      if(!pile && piles.length >= MAX_PILES){ bd = 1e9; for(const p of piles){ const d = Math.hypot(p.x - px, p.z - pz); if(d < bd){ bd = d; pile = p; } } }
      const isNew = !pile;
      if(!pile){ pile = { id:nextId++, x:r2(px), y:floorFloor(px,pz), z:r2(pz), n:0 }; piles.push(pile); }
      for(const s of leaves){ pile.n = Math.min(40, pile.n + 1 + Math.floor(rand() * 3)); renderer.remove(s, pile); }
      renderer.pilePop(pile);
      ctx.emit('care:pile', { id:pile.id, pos:{ x:pile.x, y:pile.y, z:pile.z }, n:pile.n, created:isNew });
    }
    if(tool === 'pel'){ const wy = zn0 ? zn0.floorY(cx, cz) : floorFloor(cx, cz); renderer.wet(cx, wy, cz, yaw, 1.25 + rand() * .3); }
    ctx.emit('care:stroke', { tool, pos:{ x:pos.x, y:pos.y ?? gh(pos.x,pos.z), z:pos.z }, yaw, hits, zone:zn0?.id ?? null });
    if(hits || leaves.length){ changed(); persist(true); }
    return { hits, removed };
  }
  function gather(pos, r=2.2){
    if(!pos) return 0;
    let best = -1, bd = r;
    piles.forEach((p,i) => { const d = Math.hypot(p.x - pos.x, p.z - pos.z); if(d < bd){ bd = d; best = i; } });
    if(best < 0) return 0;
    const p = piles.splice(best, 1)[0];
    try{ const u = ui(); if(u?.addCoins){ u.addCoins(1, 'care'); u.addPahala?.(1, 'care'); } else { S.coins = (S.coins || 0) + 1; S.pahala = (S.pahala || 0) + 1; ctx.emit('coins:change', { coins:S.coins }); } }catch(e){}
    ctx.emit('care:gather', { pos:{ x:p.x, y:p.y, z:p.z }, n:p.n });
    changed(); persist(true);
    return p.n;
  }
  function nearest(pos, r=2.2){
    if(!pos) return null;
    const tool = S.tool;
    let best = null, bs = 1e9, bd = 0;
    for(const s of spots){ const d = Math.hypot(s.x - pos.x, s.z - pos.z); if(d > r) continue;
      const sc = d - (TYPES[s.type].tool === tool ? 1.0 : 0); if(sc < bs){ bs = sc; best = s; bd = d; } }
    let pile = null;
    for(const p of piles){ if(p.n < 3) continue; const d = Math.hypot(p.x - pos.x, p.z - pos.z); if(d > r) continue; const sc = d - .4; if(sc < bs){ bs = sc; pile = p; bd = d; } }
    if(pile) return { kind:'gather', tool:null, pos:{ x:pile.x, y:pile.y, z:pile.z }, d:bd, label:LABEL.gather, icon:ICON.gather, anim:ANIM.gather, hold:true, count:pile.n, pile:pile.id };
    if(!best) return null;
    const tl = TYPES[best.type].tool, kind = tl === 'sapu' ? 'sweep' : 'mop';
    let count = 0; for(const s of spots) if(TYPES[s.type].tool === tl && Math.hypot(s.x - best.x, s.z - best.z) < 1.8) count++;
    return { kind, tool:tl, type:best.type, pos:{ x:best.x, y:best.y, z:best.z }, d:bd, label:LABEL[kind], icon:ICON[kind], anim:ANIM[kind], hold:true, count };
  }
  function addDirt(type, n=1, zoneId){
    if(!TYPES[type]) return 0;
    let list;
    if(zoneId){ const z = byId[zoneId]; if(!z) return 0; list = [z]; }     // explicit zone ignores the type gate
    else list = zones.filter(z => z.types.includes(type));
    if(!list.length) return 0;
    let made = 0, guard = 0;
    while(made < n && spots.length < MAX_SPOTS && guard < n * 4 + 8){
      const z = list[guard++ % list.length], want = type === 'leaf' ? Math.min(4, n - made) : 1;
      made += spawnIn(z, type, want, { ignoreCap:true, cluster:want });
    }
    persist(true); evaluate();
    return made;
  }
  function wipe(){ spots.length = 0; piles.length = 0; orphans.length = 0; renderer.clearMeta(); changed(); persist(true); return true; }

  // ---------- spawning over in-game time ----------
  let event = S.event?.id || 'cerah';
  const acc = {};
  let lastHour = ctx.hour ?? 8;
  function rateOf(zid, type){
    let r = (RATES[zid]?.[type] || 0) + (event === 'hujan' ? (RAIN[zid]?.[type] || 0) : 0);
    if(type === 'leaf' && event === 'angin') r *= 2.5;
    const h = ctx.hour ?? 12; if(h < 5.5 || h > 19.5) r *= .5;
    return r;
  }
  function tickSpawn(dh){
    if(!(dh > 0)) return;
    for(const zn of zones){
      for(const type of zn.types){
        const r = rateOf(zn.id, type); if(!r) continue;
        const k = zn.id + ':' + type; acc[k] = (acc[k] || 0) + r * dh;
        if(acc[k] >= 1){
          if(zoneCount(zn.id) >= cap(zn.id) || !roomFor(zn.id)){ acc[k] = 0; continue; }
          const n = type === 'leaf' ? 2 + Math.floor(rand() * 3) : 1;
          spawnIn(zn, type, n, { cluster:n }); acc[k] -= n;
        }
      }
    }
  }
  function overnight(){
    const pz = byId.plaza; if(pz) spawnIn(pz, 'leaf', 6);
    const hz = byId.hall; if(hz) spawnIn(hz, 'dust', 2);
  }
  const printChance = () => event === 'hujan' ? .8 : .3;
  function footprintAt(zid, pos, rot){
    const zn = byId[zid] || (pos && zoneAt(pos.x, pos.z)); if(!zn || !pos) return 0;
    if(zoneCount(zn.id) >= cap(zn.id) || !roomFor(zn.id)) return 0;
    const x = pos.x + R(-.3,.3), z = pos.z + R(-.3,.3);
    if(!zn.contains(x,z) || !freeAt(x,z,.35)) return 0;
    const s = makeSpot('print', zn, x, z, 1, rot ?? R(-.4,.4)); if(s){ renderer.touch(); persist(); return 1; } return 0;
  }

  // ---------- events ----------
  ctx.on('interact', d => {
    if(!d || !(d.kind in KIND_TOOL)) return;
    const p = d.pos || playerPos(); if(!p) return;
    const data = d.data && d.data.pos ? d.data : null;
    let yaw = d.yaw;
    if(!Number.isFinite(yaw)){ yaw = ctx.modules.characters?.yaw; if(data && !Number.isFinite(yaw)) yaw = Math.atan2(data.pos.x - p.x, data.pos.z - p.z); }
    if(d.kind === 'gather') gather(data ? data.pos : p, data ? 1.6 : 2.4);
    else cleanAt(p, yaw, KIND_TOOL[d.kind], 1, data ? data.pos : null);
  });
  ctx.on('visitor:enter', d => { if(!d || (d.zone !== 'porch' && d.zone !== 'hall')) return; if(rand() < printChance()) footprintAt(d.zone, d.pos, R(-.35,.35)); });
  ctx.on('prayer:done', () => { const hz = byId.hall; if(!hz) return; const n = 2 + Math.floor(rand() * 3); for(let i = 0; i < n; i++){ const c = hz.sample(rand); if(c) footprintAt('hall', c, rand() < .5 ? R(-.4,.4) : Math.PI + R(-.4,.4)); } });
  ctx.on('day:new', () => { overnight(); persist(true); });
  ctx.on('event:day', d => { if(d?.id) event = d.id; });
  ctx.on('build:placed', () => { setTimeout(() => { refreshZones(); rehome(); }, 0); });
  let highlight = false;
  const setHighlight = on => { highlight = !!on; renderer.setHighlight(on ? (S.tool === 'pel' ? 'pel' : 'sapu') : null); };
  ctx.on('tool:select', id => setHighlight(id === 'sapu' || id === 'pel'));

  // ---------- boot ----------
  refreshZones(); restore();
  if(!S.care.seeded){
    const pz = byId.plaza;
    if(pz){ // a first little cluster just in front of the spawn point so the first sweep is easy to find, then a scatter
      const pp = playerPos(), sx = pp?.x ?? 6, sz = pp?.z ?? 10, d = Math.hypot(sx, sz) || 1;
      const fa = Math.atan2(-sx / d, -sz / d);  // facing the masjid; try ahead-right first, then sweep around
      outer: for(const r of [3.0, 4.0, 5.0, 6.5]) for(let k = 0; k < 12; k++){
        const a = fa + .45 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5, x = sx + Math.sin(a) * r, z = sz + Math.cos(a) * r;
        if(pz.contains(x,z) && freeAt(x,z)){ spawnIn(pz, 'leaf', 3, { instant:true, at:{ x, z }, cluster:3 }); break outer; } }
      spawnIn(pz, 'leaf', 5, { instant:true });
    }
    const po = byId.porch; if(po) spawnIn(po, 'dust', 3, { instant:true });
    const hz = byId.hall; if(hz) spawnIn(hz, 'dust', 3, { instant:true });
    S.care.seeded = true; persist(true); save(S);
  }
  if(Q.has('dirt')){ // debug: seed N spots spread over the zones (may exceed the zone caps, never 160)
    const N = Math.min(MAX_SPOTS, Math.max(0, parseInt(Q.get('dirt')) || 0)); let left = N - spots.length, guard = 0;
    while(left > 0 && guard++ < 400){ for(const zn of zones){ if(left <= 0) break; const ty = zn.types[guard % zn.types.length]; left -= spawnIn(zn, ty, ty === 'leaf' ? Math.min(3,left) : 1, { ignoreCap:true, instant:true }); } }
    persist(true);
  }
  if(Q.get('clean') === '1') wipe();
  setHighlight(S.tool === 'sapu' || S.tool === 'pel');
  lastClean = clean(); if(S.daily) S.daily.clean = lastClean;
  if(lastClean < 50) dirtyDay = S.day;           // do not nag right at boot

  let tickT = 0, hlT = 0, hlI = 0;
  const near = [];
  return {
    TYPES, CAPS, spots, piles, zones:() => zones,
    clean, rawClean, level, zoneClean, nearest, cleanAt, gather, addDirt, wipe, attraction, setHighlight, renderer,
    get cap(){ return Object.fromEntries(Object.keys(CAPS).map(k => [k, cap(k)])); },
    get capTotal(){ return Object.keys(CAPS).reduce((s,k) => s + cap(k), 0); },
    update(dt, t){
      // spawn from the in-game clock (ignore jumps / midnight wrap)
      const h = ctx.hour ?? 8; let dh = h - lastHour; lastHour = h; if(dh < 0 || dh > 3) dh = 0;
      tickSpawn(dh);
      renderer.update(dt, t);
      tickT += dt; if(tickT >= 1){ tickT = 0; evaluate(); }
      persistT += dt; if(needPersist && persistT >= 2){ persistT = 0; persist(true); }
      // highlight: soft sparkle on the nearest few spots the selected tool can clean
      if(highlight){ hlT += dt; if(hlT >= 2.5 / 3){ hlT = 0; const pp = playerPos(), fx = ctx.modules.fx;
        if(pp && fx?.sparkleAt){ if(hlI === 0){ near.length = 0; const tl = S.tool;
            for(const s of spots){ if(TYPES[s.type].tool !== tl) continue; const d = Math.hypot(s.x - pp.x, s.z - pp.z); if(d < 10) near.push([d, s]); }
            near.sort((a,b) => a[0] - b[0]); near.length = Math.min(3, near.length); }
          const e = near[hlI]; if(e){ try{ fx.sparkleAt({ x:e[1].x, y:e[1].y + .15, z:e[1].z }, 2); }catch(err){} }
          hlI = (hlI + 1) % 3; } } }
    },
  };
}

// NPC jamaah: villagers (warga) live around the village at their own spots (benches, the well, the pond, the road,
// watching the animals, strolling, kids playing). They do not walk to the masjid on their own: during a prayer window
// the marbot invites them (Ajak Salat) and they walk over (wudhu first when the pavilion exists), sit on the porch, pray
// in rows behind the imam (player or Pak Haji), greet with salam, give a small pooled sedekah and go back to their spot.
// Outside the windows the marbot can chat with them. Prayer timelines (rakaat per prayer) live here.
import * as THREE from 'three';
import { Person } from './rig.js';
import { ACTS } from './anims.js';

const R = (a,b)=>a+Math.random()*(b-a);
const pick = (a)=>a[(Math.random()*a.length)|0];
const SKIN = [0xf6d1a8,0xeec193,0xe0a878,0xcf9260,0xb87a4e,0x9a6440,0xf3cfae,0xd8a070];
const KOKO = [0xf7f2e4,0xfbf6ea,0xbfe0f5,0xbfe8cf,0xeadbb8,0xf8cbb8,0xd8cbf2,0xa9d8c2,0xf6df8f,0x93c3ea,0x7fc2a6,0xf0b9c8,0xc9d6e8];
const SARONG = [0x1f7a63,0x24539c,0x8a2335,0xc8611e,0x5a3696,0x13708f,0x8d6a14,0x2f6f33,0xb8293f,0x2d4b80,0x6b2a6e];
const PECI = [0x18181c,0x18181c,0x18181c,0x3a1418,0x172036,0x1d3324,0x2c1f17];
const HAIR = [0x2a1d17,0x1b1410,0x3b2a1e,0x4a2f1c,0x5b3a22,0x241a2c];
const HIJAB = [0xf06292,0xa77bdb,0x26a69a,0xf2b233,0xfaf4ea,0xff8a65,0xb71c4a,0x7cb342,0x42a5f5,0xec407a,0x5c6bc0,0x00897b,0xffb300];
const GAMIS = [0xfbe1ec,0xd3ecf6,0xc4ebd5,0xf7e3a1,0xe6d6f6,0xf8cfc4,0xa6dcd2,0xc9d8f6,0xffffff,0xeccba6,0xf3b6c8,0xb9c6ef];
const ACC = [0xe8c060,0xd94a3a,0x2e9e6a,0x3a6fd0,0xf08a30,0x8a4ac8,0xe05c8a,0x1f8f9a];
const SAJADAH = [0xb2283c,0x1f6e52,0x274b9c,0x7b2d8e,0xc0782a];
const SHOE = [0x6b4a2e,0x3b2a20,0x8a6a3a,0x2a2a30,0x7a3b2a];

const SHAPES = [[1,1,1],[1,1,1],[.95,1.07,.97],[1.08,.95,1.0],[1.03,1.02,1.03]];   // round, egg, wide jaw, big
export function randomSpec(kind){
  kind = kind || pick(['man','man','man','woman','woman','boy','girl','elder','elderW']);
  const s = { kind, size:1, headScale:1, stoop:0, limb:1, torso:'koko', bottom:'sarong', hat:'peci', gender:'m', speed:1,
    eyes:(Math.random()*3)|0, head:Math.random()<.35?1:0, acc:[], sash:false, headShape:pick(SHAPES), bodyW:R(.92,1.12),
    brow:pick([14,14,15,16,17]), cheek:Math.random()<.18?19:18, catSmile:Math.random()<.2,
    colors:{ skin:pick(SKIN), top:pick(KOKO), bot:pick(SARONG), head:pick(PECI), shoe:pick(SHOE), acc:pick(ACC), hair:pick(HAIR) } };
  const c = s.colors;
  const hijab = ()=>{ const st = pick(['std','std','long','pashmina','sport']); s.hat = st==='sport'?'hijabSport':'hijab'; s.drape = st; };
  switch(kind){
    case 'man':
      s.size=R(.95,1.08); s.hat = pick(['peci','peci','peci','kopiah','hairShort']);
      if(s.hat==='kopiah') c.head=pick([0xf6f2e8,0xf6f2e8,0xe8dcc0]);
      if(Math.random()<.45){ s.sash=true; c.acc=pick(SAJADAH); }
      if(Math.random()<.3) s.acc.push('moustache'); else if(Math.random()<.15) s.acc.push('goatee');
      if(Math.random()<.12) s.acc.push('glasses');
      break;
    case 'boy':
      s.size=R(.74,.84); s.headScale=1.14; s.limb=.8; s.kid=true; s.bodyW=R(1.0,1.1); s.hat=pick(['peci','hairKid','hairKid']); s.speed=1.15;
      s.headShape=[1.03,1,1.02]; s.cheek=Math.random()<.35?19:21; s.brow=pick([15,17]); break;
    case 'elder':
      s.size=R(.93,1.0); s.stoop=.13; s.hat=pick(['kopiah','kopiah','peci']); c.head = s.hat==='kopiah'?0xf4f1ea:pick(PECI); c.hair=pick([0xe8e4dc,0xcfc9bf,0xb8b2a8]);
      s.acc.push('beard','moustache'); if(Math.random()<.5) s.acc.push('glasses'); s.eyes=2; s.cheek=20; s.brow=16;
      c.top=pick([0xf7f2e4,0xe9dcc0,0xcdd7c0,0xd8e2ea]); s.speed=.6; if(Math.random()<.5){ s.sash=true; c.acc=pick(SAJADAH); } break;
    case 'woman':
      s.size=R(.93,1.02); s.gender='f'; s.torso='gamis'; s.bottom='skirt'; hijab(); c.head=pick(HIJAB); c.top=pick(GAMIS); c.bot=c.top;
      c.acc=pick([0xffffff,0xfff3d6,0xffffff]); s.brow=pick([15,17]); if(Math.random()<.1) s.acc.push('glasses'); s.bodyW=R(.9,1.06); break;
    case 'girl':
      s.size=R(.74,.82); s.headScale=1.14; s.limb=.8; s.kid=true; s.gender='f'; s.torso='gamis'; s.bottom='skirt'; s.hat='hijabSport'; s.drape='sport';
      c.head=pick(HIJAB); c.top=pick(GAMIS); c.bot=c.top; c.acc=0xffffff; s.speed=1.15; s.cheek=Math.random()<.3?19:21; s.brow=15; s.headShape=[1.03,1,1.02]; break;
    case 'elderW':
      s.size=R(.9,.97); s.gender='f'; s.stoop=.14; s.torso='gamis'; s.bottom='skirt'; s.hat='hijab'; s.drape=pick(['long','std']); s.eyes=2; s.cheek=20; s.brow=17;
      c.head=pick([0xfaf4ea,0x8d6e63,0x6a5acd,0x2e7d6b,0x9e3c5a]); c.top=pick([0xd9c7a8,0xb8c9d6,0xc9b5c9,0xa9c3b0]); c.bot=c.top; c.acc=0xffffff; c.hair=0xd8d4cc;
      s.speed=.6; if(Math.random()<.5) s.acc.push('glasses'); break;
  }
  return s;
}


// ---------- prayer timelines (single source of truth for every pose; the imam uses delay 0) ----------
// [pose, seconds]. FULL (2 rakaat, legacy) stays the default for ?crowd screenshots.
export const FULL = (()=>{
  const r1=[['takbir',1.8],['qiyam',2.6],['rukuk',2.8],['itidal',1.6],['sujud',3.0],['tahiyat',1.6],['sujud',3.0]];
  const r2=[['qiyam',1.8],['rukuk',2.4],['itidal',1.4],['sujud',2.6],['tahiyat',1.4],['sujud',2.6]];
  const end=[['tahiyat',4.2],['salam',3.4]];
  return [...r1,...r2,...end];
})();
// rakaat per prayer: Subuh 2, Maghrib 3, Dzuhur/Ashar/Isya 4, Jumat 2; tahiyat awal after rakaat 2 when more follow
const RAKAAT = { subuh:2, dzuhur:4, ashar:4, maghrib:3, isya:4, jumat:2 };
function buildTimeline(n){
  const tl = [['takbir',1.8],['qiyam',2.6],['rukuk',2.8],['itidal',1.6],['sujud',3.0],['tahiyat',1.6],['sujud',3.0]];
  for(let r=2;r<=n;r++){
    if(r===3) tl.push(['tahiyat',3.2]);                                              // tahiyat awal
    tl.push(['qiyam',1.7],['rukuk',2.3],['itidal',1.3],['sujud',2.5],['tahiyat',1.3],['sujud',2.5]);
  }
  tl.push(['tahiyat',4.2],['salamR',1.7],['salamL',1.7]);
  return tl;
}
const TL = { _full:FULL };
export function timeline(prayerId){
  if(!prayerId || !RAKAAT[prayerId]) return FULL;
  return TL[prayerId] ??= buildTimeline(RAKAAT[prayerId]);
}
const _len = new Map();
export function FULL_T(prayerId){ const tl = timeline(prayerId); let v = _len.get(tl); if(v===undefined){ v = tl.reduce((a,b)=>a+b[1],0); _len.set(tl,v); } return v; }
export function poseAt(t, prayerId){
  if(t<0) return 'qiyam';
  const tl = timeline(prayerId);
  for(const [n,d] of tl){ if(t<d) return n; t-=d; }
  return tl[tl.length-1][0];
}
const ADULT_M = { man:1, elder:1 };
// a boy who comes to pray is dressed for it: peci and a full baju koko over his sarung (never the short play top)
export function dressForSalat(spec){
  if(!spec || spec.kind!=='boy') return spec;
  if(spec.hat!=='peci' && spec.hat!=='kopiah'){ spec.hat = 'peci'; spec.colors.head = pick(PECI); }
  spec.longTop = true; spec.bottom = 'sarong';
  return spec;
}
const isMale = (v)=>v.person.spec.gender!=='f';

export function createVisitors(ctx, opts={}){
  const MAXV = opts.max||60;
  const scene = ctx.scene, V = [];
  const q = new URLSearchParams(location.search);
  const LOW = ctx.quality==='low' || q.get('quality')==='low' || q.get('q')==='low';
  const PRAY = { x:0, z:3.2 };      // legacy open-air rows (only used when masjid.prayerLayout is missing)
  const safe = (f, d=null)=>{ try{ const r=f(); return r===undefined?d:r; }catch(e){ return d; } };
  const Mj = ()=>ctx.modules.masjid;
  const stageNow = ()=>{ const m = Mj(); return typeof m?.stage==='number' ? m.stage|0 : (ctx.state?.masjid?.stage|0); };
  // legacy slots
  const mk = (cols,rows,x0,dx,z0,dz)=>{ const a=[]; for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) a.push({x:PRAY.x+x0+c*dx, z:PRAY.z+z0+r*dz, row:r, used:null}); return a; };
  const AISLE = .3;
  const byFar = (a)=>{ const out=[]; for(let r=0;r<4;r++){ const row=a.filter(s=>s.row===r).sort((p,q)=>Math.abs(q.x-AISLE)-Math.abs(p.x-AISLE)); out.push(...row);} return out; };
  const slotsM = byFar(mk(6,3,-6.8,1.08,0,1.05)), slotsF = byFar(mk(4,3,1.7,1.08,0,1.05));
  let SM = slotsM, SF = slotsF;          // active slot lists (from masjid.prayerLayout() at each startPrayer)
  // sajadah mats (instanced) for rows that have no built-in sajadah (the stage-7 hall has its own)
  const MAXM = 64;
  const matGeo = new THREE.PlaneGeometry(.6,1.0).rotateX(-Math.PI/2);
  const matMesh = new THREE.InstancedMesh(matGeo, new THREE.MeshToonMaterial({color:0xffffff}), MAXM); matMesh.count=0; matMesh.visible=false; matMesh.receiveShadow=true; matMesh.frustumCulled=false; scene.add(matMesh);
  const matCols=[0x3f8f6a,0x9a3b4a,0x3e6fb0,0x8a5db0,0xc58a3a].map(h=>new THREE.Color(h));
  const _m=new THREE.Matrix4(), _q=new THREE.Quaternion(), _p=new THREE.Vector3(), _s=new THREE.Vector3(1,1,1), _e=new THREE.Euler();
  let matsBuiltIn = false;
  function refreshMats(){
    let n=0;
    if(!matsBuiltIn) for(const sl of SM.concat(SF)){ if(!sl.used || n>=MAXM) continue;
      _p.set(sl.x, ctx.groundHeight(sl.x,sl.z)+.02, sl.z-.1); _q.setFromEuler(_e.set(0,0,0)); _s.set(1,1,1); _m.compose(_p,_q,_s); matMesh.setMatrixAt(n,_m); matMesh.setColorAt(n,matCols[((sl.row*2+Math.round(sl.x))%4+4)%4]); n++; }
    matMesh.count=n; matMesh.visible=n>0; matMesh.instanceMatrix.needsUpdate=true; if(matMesh.instanceColor) matMesh.instanceColor.needsUpdate=true;
  }
  const GATHER = [ {x:-1.5,z:17}, {x:1.5,z:19}, {x:-4.5,z:16}, {x:4.5,z:17.5}, {x:0,z:21}, {x:-7,z:19}, {x:7,z:20} ];
  // after the adzan the jamaah hurry in and wait on the plaza right in front of the masjid steps
  const GATHER_WAVE = [ {x:-2.2,z:11.4}, {x:2.6,z:11.6}, {x:-4.6,z:12.0}, {x:4.8,z:12.2}, {x:0.3,z:12.4}, {x:-1.2,z:13.6}, {x:1.8,z:13.4} ];
  const SIT = [ {x:-9.5,z:14},{x:-10.5,z:15.2},{x:-8.6,z:15.4},{x:9.5,z:14},{x:10.5,z:15.2},{x:8.6,z:15.4} ];
  const prayer = { phase:'idle', t:0, hold:q.get('prayer')||null, restT:0, timer:0, speed:1, imam:null, prayerId:null, layout:null,
    imamReady:true, khutbah:false, count:0, tlId:null };
  let nextId=1, spawnT=0, lastArrive=-99, held=false, imamV=null, joinT=0, booted=false, lastGather=-99;
  const waveQ = [];
  const api = { list:V, prayer, slotsM, slotsF, PRAY, count:()=>V.length, get stageCap(){return cap();},
    get slots(){ return { men:SM, women:SF }; } };

  let attr = null, attrT = -9;
  function attraction(){            // cached for a second: care.attraction() walks every dirt spot
    if(ctx.time - attrT > 1 || ctx.time < attrT){ attrT = ctx.time; try{ attr = ctx.modules.care?.attraction?.() || null; }catch(e){ attr = null; } }
    return attr;
  }
  function cap(){
    const h = ctx.hour; if(h>21.5||h<4.5) return 0;
    const st = stageNow(); let c = st<=0 ? 2 : Math.min(40, 4+st*5);
    const at = attraction(); if(at && Number.isFinite(at.capMul)) c = Math.max(1, Math.round(c*at.capMul));
    if(LOW) c = Math.min(c, 18);
    return c;
  }
  function moodPick(kind){
    const mood = attraction()?.mood || 'ok';
    if(kind==='post') return pick(mood==='happy' ? ['heart','star','smile','heart','note'] : mood==='meh' ? ['smile','note','?','smile'] : ['smile','heart','note','smile','star']);
    return pick(mood==='happy' ? ['heart','star','smile','note','heart','star'] : mood==='meh' ? ['?','smile','note','?','dots'] : ['smile','note','!','?','heart']);
  }
  function spawn(opts={}){
    if(!opts || !Object.keys(opts).length) return spawnGuest();       // legacy no-arg call (busy days): a guest villager
    if(V.length>=MAXV) return null;
    const spec = opts.spec || randomSpec(opts.kind);
    const p = new Person(spec);
    const x = R(-2.5,2.5);
    p.pos.set(opts.x ?? x, 0, opts.z ?? 41); p.pos.y = ctx.groundHeight(p.pos.x,p.pos.z);
    p.yaw = Math.PI; p.onStep = footstep;
    p.accX=p.accZ=0;
    const mode = opts.mode || (Math.random()<.2||spec.stoop?'sit':'pray');
    if(mode==='pray' && !opts.home) dressForSalat(spec);
    const v = { id:nextId++, person:p, state:'arrive', path:[], vel:new THREE.Vector3(), timer:0, slot:null, mode, emoteT:R(2,5), delay:0, donated:false, waved:-99, faceYaw:Math.PI,
      speedMax:R(2.4,3.0)*spec.speed*(opts.wave?1.25:1), waitT:0, spot:null, entered:{}, zoneT:R(0,.25), role:opts.role||null, wave:!!opts.wave };
    if(opts.home){                                                     // a villager living at a home spot
      const h = opts.home; v.home = h; h.v = v; v.guest = !!opts.guest; v.invited = false; v.speedMax = R(1.9,2.4)*spec.speed;
      v.ph = R(0,6.28); v.wp = 0; v.wpDir = 1; v.pauseT = 0;
      if(opts.road){ v.state='goHome'; p.yaw = Math.PI; v.path = routeVia(p.pos, homePos(h)) || []; }
      else { v.state='home'; const hp = homePos(h); p.pos.set(hp.x, 0, hp.z); p.pos.y = ctx.groundHeight(hp.x,hp.z) + (h.seatY||0); p.yaw = h.yaw ?? 0; }
      V.push(v); ctx.emit('visitor:spawn',{id:v.id,kind:spec.kind,home:h.id,resident:true});
      return v;
    }
    const g = opts.wave ? pick(GATHER_WAVE) : pick(GATHER); v.path=[ {x:g.x+R(-1,1),z:g.z+R(-.8,.8)} ]; v.gx=g;
    if(v.mode==='sit'){ const sp = pick(SIT); v.spot = sp; }
    V.push(v); ctx.emit('visitor:arrive',{id:v.id,kind:spec.kind,pos:p.pos.clone(),count:V.length});
    lastArrive = ctx.time; return v;
  }
  function footstep(p,side){
    if(p.speed>3.5 && !p._indoor) ctx.modules.fx?.burst?.('dust',_p.set(p.pos.x,p.pos.y+.05,p.pos.z).clone());   // no dust on the masjid floor
  }
  function moveTo(v,tx,tz,dt,speedMul=1){
    const p=v.person, dx=tx-p.pos.x, dz=tz-p.pos.z, d=Math.hypot(dx,dz);
    const arriveR = .12;
    let want = Math.min(v.speedMax*speedMul, d*3.2+.4); if(d<arriveR) want=0;
    // separation (jamaah already standing in their rows are left alone)
    let sx=0,sz=0;
    for(const o of V){ if(o===v || o.state==='pray' || o.state==='khatib' || o.state==='climb') continue; const ox=p.pos.x-o.person.pos.x, oz=p.pos.z-o.person.pos.z, dd=ox*ox+oz*oz; if(dd<.5&&dd>1e-4){ const k=(.7-Math.sqrt(dd))*2.2/Math.sqrt(dd); sx+=ox*k; sz+=oz*k; } }
    const dirx = d>1e-3?dx/d:0, dirz = d>1e-3?dz/d:0;
    const tvx = dirx*want+sx, tvz = dirz*want+sz;
    const ax = (tvx-v.vel.x)*Math.min(1,dt*7), az=(tvz-v.vel.z)*Math.min(1,dt*7);
    v.vel.x+=ax; v.vel.z+=az;
    { const awx=ax/Math.max(dt,1e-3), awz=az/Math.max(dt,1e-3), sy=Math.sin(p.yaw), cy=Math.cos(p.yaw);
      const lx=awx*cy-awz*sy, lz=awx*sy+awz*cy; v.ax=(v.ax||0)+(lx-(v.ax||0))*Math.min(1,dt*8); v.az=(v.az||0)+(lz-(v.az||0))*Math.min(1,dt*8);
      p.accX=Math.max(-10,Math.min(10,v.ax)); p.accZ=Math.max(-10,Math.min(10,v.az)); }
    p.pos.x+=v.vel.x*dt; p.pos.z+=v.vel.z*dt;
    const sp = Math.hypot(v.vel.x,v.vel.z); p.speed = sp;
    if(sp>.15){ const ty=Math.atan2(v.vel.x,v.vel.z); p.yaw = angLerp(p.yaw,ty,Math.min(1,dt*9)); }
    p.cycle += Math.min(22,sp*4.2)*dt;
    return d;
  }
  // follow v.path (waypoints) then the final point; returns remaining distance to the final point
  function followPath(v, fx, fz, dt, mul=1){
    if(v.path.length){ const w=v.path[0]; const d=moveTo(v,w.x,w.z,dt,mul); if(d<.42) v.path.shift(); return 9; }
    return moveTo(v,fx,fz,dt,mul);
  }
  function stand(v,dt,yaw){ const p=v.person; p.speed=0; v.vel.multiplyScalar(Math.max(0,1-dt*10)); p.yaw = angLerp(p.yaw,yaw,Math.min(1,dt*8)); }
  function angLerp(a,b,k){ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*k; }
  function emote(v,type){ ctx.modules.characters?.emote?.(v.person,type); }
  function groundSnap(p,dt){ const gy=ctx.groundHeight(p.pos.x,p.pos.z); p.pos.y += (gy-p.pos.y)*Math.min(1,dt*14); }
  function collide(p){
    const cs=ctx.colliders; for(let i=0;i<cs.length;i++){ const c=cs[i]; const dx=p.pos.x-c.x, dz=p.pos.z-c.z, rr=(c.r||0)+.3; const d2=dx*dx+dz*dz; if(d2<rr*rr&&d2>1e-6){ const d=Math.sqrt(d2); p.pos.x=c.x+dx/d*rr; p.pos.z=c.z+dz/d*rr; } }
  }
  // door / walk-around routing from the masjid (and other modules) via ctx.routes; null when walking straight is fine
  function routeVia(from, to){
    for(const r of (ctx.routes||[])){ try{ const pth = r({x:from.x,z:from.z},{x:to.x,z:to.z}); if(Array.isArray(pth) && pth.length) return pth.map(w=>({x:w.x,z:w.z})); }catch(e){} }
    return null;
  }
  function pathToSlot(v, sl, layout){
    const p = v.person.pos, inside = safe(()=>Mj()?.isInside?.(p.x,p.z));
    if(inside==='hall') return [];                                    // already in the hall: short direct step
    const path = [];
    const via = layout?.indoor ? routeVia(p, {x:AISLE, z:sl.z}) : null;
    if(via) path.push(...via);
    else if(layout?.entry?.length){ for(const e of layout.entry) if(e.z < p.z - .4) path.push({x:e.x+R(-.15,.15), z:e.z}); }
    else if(!layout && p.z>11) path.push({x:AISLE+R(-.3,.3),z:Math.max(11,p.z-2)},{x:AISLE,z:9.6});
    path.push({x:(layout?.aisleX ?? AISLE), z:sl.z});
    return path;
  }
  function leavePath(v){
    const to = {x:R(-3,3), z:26}, via = routeVia(v.person.pos, to) || [];
    return [...via, to, {x:R(-2.5,2.5),z:44}];
  }

  // ---------- Pak Haji (NPC elder imam / khatib): always a recognisable elder with a white kopiah ----------
  function pakHajiSpec(){
    const s = randomSpec('elder'); const c = s.colors;
    s.hat='kopiah'; c.head=0xf4f1ea; s.acc=['beard','moustache','glasses']; c.top=0xf7f2e4; c.bot=0x2f6f4f; s.sash=true; c.acc=0x1f6e52;
    c.hair=0xe8e4dc; s.speed=.8; s.stoop=.08; s.size=.98; return s;
  }
  const MIMBAR = { foot:{x:2.55,z:-4.42}, step:{x:2.55,z:-6.3,y:1.44}, top:{x:2.55,z:-6.86,y:2.17} };
  const mimbarOK = ()=>stageNow()>=7 && !!Mj();

  function abortPrayer(){
    for(const v of V){
      if(v.role){ v.role=null; leave(v); continue; }
      if(v.state==='toSlot'||v.state==='pray'){ if(v.slot) v.slot.used=null; v.slot=null; v.state='gather'; v.path=[]; v.waitT=0;
        if(v.home){ v.dest = waitSeat(v); v.state = 'toMasjid'; v.seated = false; v.path = routeVia(v.person.pos, v.dest) || []; } }
    }
    imamV=null; prayer.phase='idle'; prayer.imam=null; refreshMats();
  }
  // a straight saf: keep >= 1.0 m clear of the mimbar, >= .62 m between neighbours, and fill every row centre-out
  // from behind the imam (the aisle / imam x), front rows first
  const MIMBAR_C = { x:2.55, z:-6.0, r:1.2 };
  function tidySlots(list, rowOff, layout){
    const cx = Number.isFinite(layout?.imam?.x) ? layout.imam.x : 0, mim = (layout?.indoor && (layout.stage ?? stageNow())>=7);
    const rows = new Map();
    for(const s of list){
      if(!s || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
      if(mim && Math.hypot(s.x-MIMBAR_C.x, s.z-MIMBAR_C.z) < MIMBAR_C.r+1.0) continue;
      const r = s.row|0; if(!rows.has(r)) rows.set(r, []); rows.get(r).push(s);
    }
    const out = [];
    for(const r of [...rows.keys()].sort((a,b)=>a-b)){
      const row = rows.get(r).slice().sort((p,q)=>(Math.abs(p.x-cx)-Math.abs(q.x-cx)) || (q.x-p.x)), kept = [];
      for(const s of row) if(kept.every(k=>Math.abs(k.x-s.x)>=.62)) kept.push(s);
      for(const s of kept) out.push({ x:s.x, z:s.z, row:r+rowOff, used:null });
    }
    return out;
  }
  function startPrayer(o={}){
    const imam = o.imam==='player'||o.imam==='npc' ? o.imam : 'auto';
    if(prayer.phase!=='idle'){
      if(imam==='auto' || prayer.imam==='player') return false;
      abortPrayer();       // an auto / NPC prayer that is still assembling or running hands over to the new imam
    }
    let layout = o.layout || safe(()=>Mj()?.prayerLayout?.(), null);
    if(layout && !(Array.isArray(layout.men) && layout.men.length)) layout = null;
    const rowOff = layout ? Math.max(1, ...layout.men.map(s=>(s.row|0)+1)) : 3;
    if(layout){ SM = tidySlots(layout.men, 0, layout); SF = tidySlots(layout.women||[], rowOff, layout); }
    else { SM = slotsM; SF = slotsF; for(const s of SM.concat(SF)) s.used=null; }
    matsBuiltIn = !!layout?.mats;
    const cand = V.filter(v=>v.mode==='pray' && !v.role && (v.state==='gather'||v.state==='arrive'||v.state==='post'||v.state==='pray'||v.state==='toSlot'));
    if(!cand.length && imam!=='player') return false;
    const khutbah = !!o.khutbah && mimbarOK() && !!layout?.indoor;
    // men: adults first, boys after them (so boys end up in the last men's row); women and girls behind in their rows
    const men = cand.filter(isMale).sort((a,b)=>(ADULT_M[b.person.spec.kind]|0)-(ADULT_M[a.person.spec.kind]|0)), women = cand.filter(v=>!isMale(v));
    let reserved = null;
    if(khutbah && imam==='player'){ // Pak Haji (the khatib) joins the men's rows at the slot nearest the mimbar steps
      let bd=9; for(const s of SM){ const d=Math.hypot(s.x-MIMBAR.foot.x, s.z-MIMBAR.foot.z); if(d<bd){ bd=d; reserved=s; } }
      if(reserved) reserved.used = 'khatib';
    }
    let n = 0;
    for(const v of [...men, ...women]){
      const arr = isMale(v) ? SM : SF; const sl = arr.find(s=>!s.used);
      if(!sl){ if(v.state==='toSlot'||v.state==='pray'){ v.state='gather'; v.slot=null; } continue; }
      sl.used=v; v.slot=sl; v.state='toSlot'; v.seated=false; v.delay = .25 + sl.row*.1 + R(0,.3); v.path = pathToSlot(v, sl, layout); v.sat=false; dressForSalat(v.person.spec); n++;
    }
    // the rest of an adzan wave that has not set off yet stays home; jamaah already on their way join the back rows
    if(imam!=='auto') waveQ.length = 0;
    joinT = 0;
    prayer.phase='assemble'; prayer.t=0; prayer.imam=imam; prayer.prayerId=o.prayerId||null; prayer.layout=layout; prayer.khutbah=khutbah; prayer.count=n;
    prayer.tlId = (o.jumat && khutbah) ? 'jumat' : (o.prayerId||null);
    prayer.imamReady = imam!=='npc' && imam!=='player'; prayer.khT = 0;
    // NPC imam / khatib
    imamV = null;
    if(imam==='npc' || khutbah){
      const im = layout?.imam || safe(()=>Mj()?.spot?.('imam')) || {x:0,z:-2};
      const at = khutbah ? MIMBAR.foot : layout?.indoor ? {x:-1.7, z:-6.55} : {x:im.x-1.6, z:im.z+.3};
      const hv = spawn({ spec:pakHajiSpec(), x:at.x, z:at.z, mode:'pray', role: imam==='npc' ? 'imam' : 'khatib' });
      if(hv){
        imamV = hv; hv.path=[]; hv.person.yaw = Math.PI; hv.imamAt = {x:im.x, z:im.z}; hv.slot = reserved;
        if(reserved) reserved.used = hv;
        hv.state = khutbah ? 'climb' : 'toImam'; hv.timer = 0;
      } else if(imam==='npc'){ prayer.imamReady = true; }
    }
    refreshMats();
    return true;
  }
  function runStart(){
    prayer.phase='run'; prayer.t=0;
    const count = V.filter(v=>v.state==='pray'||v.state==='toSlot').length;
    ctx.emit('prayer:start',{ prayerId:prayer.prayerId, imam:prayer.imam||'auto', count });
  }
  function finishPrayer(){
    const imam = prayer.imam||'auto', pid = prayer.prayerId;
    const pr = V.filter(v=>(v.state==='pray'||v.state==='toSlot') && !v.role);
    if(pool.left<=0 || !pr.some(v=>v.wave)) poolOpen(pr.length);   // every prayer gets its own pool, sized by the jamaah
    for(const v of pr){
      v.prayed = true;
      v.state='post'; v.timer=R(7,13); v.postSit=R(2.5,5); v.path=[];
      const nb = pr.find(o=>o!==v&&o.slot&&v.slot&&Math.abs(o.slot.z-v.slot.z)<.1&&Math.abs(o.slot.x-v.slot.x)<1.5);
      v.faceYaw = nb?Math.atan2(nb.person.pos.x-v.person.pos.x,nb.person.pos.z-v.person.pos.z):Math.PI*.8;
    }
    if(imamV){ const iv = imamV; iv.state='post'; iv.timer=R(8,12); iv.postSit=3; iv.faceYaw=0; if(iv.slot){ iv.slot.used=null; iv.slot=null; } }
    prayer.phase='idle'; prayer.restT=0; prayer.imam=null; prayer.khutbah=false; imamV=null;
    ctx.emit('prayer:done',{ count:pr.length, imam, prayerId:pid });
    if(imam==='player') salamAfter(pr);
  }
  // after the player leads: up to 4 nearest men/boys walk up and shake hands; women and girls nod from their rows
  function salamAfter(pr){
    const pl = ctx.modules.characters?.player; if(!pl) return;
    const men = pr.filter(isMale).sort((a,b)=>a.person.pos.distanceToSquared(pl.pos)-b.person.pos.distanceToSquared(pl.pos)).slice(0,4);
    const fy = pl.yaw + Math.PI;        // the imam turns round to face the jamaah
    men.forEach((v,i)=>{
      const a = fy + (i-(men.length-1)/2)*.62, r = .98;
      v.state='salam'; v.target={ x:pl.pos.x+Math.sin(a)*r, z:pl.pos.z+Math.cos(a)*r }; v.delay = 1.0 + i*.9; v.timer=0;
    });
    for(const v of pr) if(!isMale(v)) { v.nodT = R(1.2,3.5); }
  }
  function leave(v){
    if(v.state==='leave') return;
    if(v.home && !v.role){ goHome(v); return; }
    if(v===imamV) imamV=null;
    v.state='leave'; if(v.slot){ v.slot.used=null; v.slot=null; refreshMats(); }
    if(!v.role) donate(v);
    v.path=leavePath(v);
  }
  // Sedekah. A passing visitor gives a small coin gift. Jamaah who came for a prayer (the adzan wave, or anyone who prayed
  // in the rows) share ONE modest pooled sedekah per prayer instead of each paying a full gift: a led prayer at stage 8 gives
  // a few dozen coins, in line with quest rewards (15-40), never hundreds.
  // the pool grows gently with the number of jamaah (each of them hands over an equal share of it)
  const pool = { left:0, id:0, share:0 };
  function poolOpen(n){ const st = stageNow(), mul = attraction()?.donateMul ?? 1, k = Number.isFinite(mul)?mul:1;
    n = Math.max(1, n|0); pool.id++; pool.left = Math.round((3 + st*1.5 + n*(2 + st*.35)) * k); pool.share = Math.max(1, Math.ceil(pool.left/n)); }
  function donate(v){
    if(v.donated) return; v.donated=true;
    const st = stageNow(), mul = attraction()?.donateMul ?? 1;
    let amt = Math.max(1, Math.round((2+Math.random()*4)*(1+st*.15)*(Number.isFinite(mul)?mul:1)));
    if(v.wave || v.prayed){
      amt = Math.min(pool.left, pool.share || Math.max(1, Math.round(amt*.3)));
      pool.left -= amt;
      if(amt<=0){ emote(v, moodPick('post')); return; }          // a thankful smile instead of coins once the pool is shared out
    }
    const ui = ctx.modules.ui;
    if(ui?.addCoins) ui.addCoins(amt,'visitor');
    else { if(ctx.state) ctx.state.coins = (ctx.state.coins||0)+amt; ctx.emit('coins:change',{coins:ctx.state?.coins, total:ctx.state?.coins, delta:amt, source:'visitor'}); }
    ctx.emit('visitor:donate',{id:v.id,amount:amt,pos:v.person.pos.clone()});
    const pos = v.person.pos.clone(); pos.y+=1.4;
    ctx.modules.fx?.burst?.('coin',pos); ctx.modules.audio?.play?.('coin',{pos,vol:.5});
    emote(v,'coin');
  }
  // scheduled arrivals after the adzan: staggered spawns from the road, ignore the stage cap and the night rule
  // the adzan no longer sends a crowd down the road: every villager hears it, looks up towards the masjid and is ready
  // to say yes at once when the marbot comes to invite them (o.legacy keeps the old road wave for tests)
  function wave(n, o={}){
    if(o.legacy){
      poolOpen(n);
      n = Math.max(0, Math.min(n|0, LOW ? 8 : 14, MAXV - V.length - waveQ.length));
      let t = R(.15,.5);
      for(let i=0;i<n;i++){ waveQ.push({ t, mode:o.mode||'pray', prayerId:o.prayerId||null }); t += R(.6,1.5); }
      return n;
    }
    let k = 0;
    for(const v of V) if(v.home && !v.invited && (v.state==='home'||v.state==='goHome'||v.state==='talk')){ v.heard = true; v.listenT = R(.3,2.6); k++; }
    return k;
  }
  function setHold(b){ held = !!b; return held; }


  // =====================================================================================================
  // ---------- villagers (warga): homes around the village, idle activities, invitation to pray ----------
  // =====================================================================================================
  const S = ctx.state || {};
  const roadX = z=>2.2*Math.sin(z*.07+.5);
  const POND = { x:-24, z:14, r:6.2 }, WUDHU = { x:-11, z:6.5 };
  const LS = (a)=>((S.lang ?? S.settings?.lang)==='en' ? a[1] : a[0]);
  const homes = []; let homesKey = '';
  const homePos = h=>h.act==='stroll' ? h.path[0] : h.act==='play' ? { x:h.cx+Math.cos(h.a0||0)*h.r, z:h.cz+Math.sin(h.a0||0)*h.r } : h;
  function pushOut(x, z, pad=.5){
    for(let k=0;k<8;k++){ let moved=false;
      for(const c of ctx.colliders){ const r=(c.r||0)+pad, dx=x-c.x, dz=z-c.z, d=Math.hypot(dx,dz); if(d<r){ if(d<1e-3){ x+=r; } else { x=c.x+dx/d*r; z=c.z+dz/d*r; } moved=true; } }
      if(!moved) break; }
    return { x, z };
  }
  const dry = (x,z)=>{ const h = safe(()=>ctx.groundHeight(x,z), 0); return Number.isFinite(h) && h > -.12 && Math.hypot(x-POND.x, z-POND.z) > POND.r+.6; };
  const faceTo = (x,z,tx,tz)=>Math.atan2(tx-x, tz-z);
  // home spots in priority order: the first N are lived in (N grows with the masjid stage)
  function buildHomes(){
    const spots = ctx.modules.world?.villageSpots || [];
    const key = spots.length + ':' + ctx.colliders.length; if(key===homesKey && homes.length) return; homesKey = key;
    const keepV = new Map(homes.map(h=>[h.id, h.v]));
    homes.length = 0;
    const add = (h)=>{
      if(h.act!=='bench'){ const q = pushOut(h.x, h.z); h.x = q.x; h.z = q.z; }
      if(!Number.isFinite(h.x) || !Number.isFinite(h.z) || !dry(h.x,h.z) || Math.hypot(h.x,h.z) > 56) return;
      if(h.act==='stroll'){ h.path = h.path.map(w=>pushOut(w.x,w.z)).filter(w=>dry(w.x,w.z)); if(h.path.length<2) return; h.x = h.path[0].x; h.z = h.path[0].z; }
      h.v = keepV.get(h.id) || null; if(h.v) h.v.home = h; homes.push(h);
    };
    const loc = (sp, lx, lz)=>{ const c=Math.cos(sp.ry), s=Math.sin(sp.ry); return { x:sp.x+lx*c+lz*s, z:sp.z-lx*s+lz*c }; };
    const rests = spots.filter(s=>s.kind==='rest'||s.kind==='rest2'), well = spots.find(s=>s.kind==='well'), wood = spots.find(s=>s.kind==='wood');
    const benchOf = sp=>sp?.items?.find(i=>i.k==='bench');
    const seat = (sp, side, id, kind)=>{ const b = benchOf(sp); if(!b) return; const q = loc({ x:b.x, z:b.z, ry:sp.ry }, side*.48, .16);
      add({ id, act:'bench', kind, x:q.x, z:q.z, yaw:sp.ry, seatY:.31 }); };
    const pondAt = (deg, id, kind)=>{ const a = deg*Math.PI/180; const x = POND.x+Math.cos(a)*(POND.r+1.5), z = POND.z+Math.sin(a)*(POND.r+1.5); add({ id, act:'pond', kind, x, z, yaw:faceTo(x,z,POND.x,POND.z) }); };
    // 1 elder on the first bench
    if(rests[0]) seat(rests[0], -1, 'bench1a', 'elder');
    // 2-3 two neighbours chatting by the well
    if(well){ const a = loc(well, -.75, 2.15), b = loc(well, .85, 2.25);
      add({ id:'well1', act:'chat', kind:'woman', x:a.x, z:a.z, yaw:faceTo(a.x,a.z,b.x,b.z) });
      add({ id:'well2', act:'chat', kind:'elderW', x:b.x, z:b.z, yaw:faceTo(b.x,b.z,a.x,a.z) }); }
    // 4 a boy watching the animals over the pen fence
    add({ id:'pen1', act:'watch', kind:'boy', x:16.75, z:3.3, yaw:Math.PI/2 });
    // 5 a mother resting by the pond
    pondAt(-30, 'pond1', 'woman');
    // 6 a man by the village road (gate)
    { const z = 27, x = roadX(z)+2.7; add({ id:'road1', act:'chat', kind:'man', x, z, yaw:faceTo(x,z,roadX(z),z-3) }); }
    // 7 a man strolling along the plaza edge
    { const path = []; for(const d of [150,125,100,75,50,30]){ const a=d*Math.PI/180; path.push({ x:Math.cos(a)*18.2, z:Math.sin(a)*18.2 }); } add({ id:'walk1', act:'stroll', kind:'man', path, x:0, z:0 }); }
    // 8-9 kids playing tag on the grass
    { const cx = -9, cz = 21; add({ id:'play1', act:'play', kind:'boy', cx, cz, r:1.7, a0:0, x:cx+1.7, z:cz });
      add({ id:'play2', act:'play', kind:'girl', cx, cz, r:1.7, a0:Math.PI, x:cx-1.7, z:cz }); }
    // 10 grandmother on the second bench
    if(rests[1]) seat(rests[1], 1, 'bench2a', 'elderW');
    // 11 a farmer at the pen fence
    add({ id:'pen2', act:'watch', kind:'man', x:16.75, z:9.7, yaw:Math.PI/2 });
    // 12 the woodpile
    if(wood){ const q = loc(wood, 0, 1.9); add({ id:'wood1', act:'chat', kind:'man', x:q.x, z:q.z, yaw:faceTo(q.x,q.z,wood.x,wood.z) }); }
    // 13 a second seat on the first bench
    if(rests[0]) seat(rests[0], 1, 'bench1b', 'man');
    // 14 a girl at the pond
    pondAt(-62, 'pond2', 'girl');
    // 15 a woman walking up the road
    { const z = 31, x = roadX(z)-2.7; add({ id:'road2', act:'chat', kind:'woman', x, z, yaw:faceTo(x,z,roadX(z),z-3) }); }
    // 16 the third bench (not on low quality)
    if(rests[2]) seat(rests[2], -1, 'bench3a', 'elder');
    // guest spots (busy days): the road side and the plaza edge
    { const z = 22, x = roadX(z)+2.9; add({ id:'guest1', act:'chat', kind:'man', x, z, yaw:faceTo(x,z,0,0), guest:true }); }
    { const z = 22.6, x = roadX(z)-2.9; add({ id:'guest2', act:'chat', kind:'woman', x, z, yaw:faceTo(x,z,0,0), guest:true }); }
    { const x = 13.5, z = 20; add({ id:'guest3', act:'chat', kind:'elder', x, z, yaw:faceTo(x,z,0,0), guest:true }); }
  }
  const isNight = ()=>{ const h = ctx.hour ?? 8; return h>21.6 || h<4.5; };
  // a handful early, more as the masjid grows (within the crowd LOD budget)
  function residentCap(){ if(isNight()) return 0; const st = stageNow(); return Math.min(LOW ? 8 : 13, 4 + Math.round(st*1.1)); }
  function residents(){
    buildHomes();
    if(isNight()){ for(const v of V) if(v.home && !v.invited && v.state==='home') leaveVillage(v); booted = true; return; }
    const capN = residentCap(); let n = 0;
    for(const v of V) if(v.home && !v.guest) n++;
    for(const h of homes){ if(n>=capN) break; if(h.guest || h.v) continue;
      if(!spawn({ home:h, spec:randomSpec(h.kind), mode:'pray', road:booted, x: booted ? roadX(41)+R(-1.5,1.5) : h.x, z: booted ? 41 : h.z })) break; n++;
      if(booted) break; }                                  // after boot: one at a time, walking in from the road
    booted = true;
  }
  function spawnGuest(){
    buildHomes(); if(isNight()) return null;
    const h = homes.find(h=>h.guest && !h.v); if(!h) return null;
    return spawn({ home:h, spec:randomSpec(h.kind), mode:'pray', road:true, guest:true, x:roadX(41)+R(-1.5,1.5), z:41 });
  }
  function leaveVillage(v){ if(v.home){ v.home.v = null; v.home = null; } v.invited = false; v.state = 'leave'; v.path = [...(routeVia(v.person.pos, {x:roadX(30), z:30})||[]), {x:roadX(30)+R(-1,1), z:30}, {x:roadX(44)+R(-1,1), z:44}]; }
  function goHome(v){
    if(v.slot){ v.slot.used=null; v.slot=null; refreshMats(); }
    if(v.prayed && !v.donated) donate(v);
    v.invited = false; v.prayed = false; v.seated = false; v.heard = false; v.dest = null;
    const hp = homePos(v.home); v.state = 'goHome'; v.path = routeVia(v.person.pos, hp) || [];
  }
  const P = ()=>ctx.modules.prayer;
  // invitations are for a prayer window (from the 'soon' reminder until the jamaah line up); otherwise a friendly chat
  function canInvite(){ const ph = safe(()=>P()?.phase, 'idle'); return ph==='soon' || ph==='open' || ph==='adzan' || ph==='called' || ph==='ready'; }
  const prayerActive = ()=>{ const ph = safe(()=>P()?.phase, 'idle'); return ph!=='idle' && ph!=='done'; };
  function nearestVillager(pos, r=2.6, o={}){
    let best=null, bd=r;
    for(const v of V){ if(!v.home || v.role) continue; if(o.uninvited && v.invited) continue; if(!o.any && v.state!=='home' && v.state!=='goHome') continue;
      const d = Math.hypot(v.person.pos.x-pos.x, v.person.pos.z-pos.z); if(d<bd){ bd=d; best=v; } }
    return best;
  }
  const playerP = ()=>ctx.modules.characters?.player;
  function faceWho(v){ const pl = playerP(); if(pl) v.faceYaw = Math.atan2(pl.pos.x-v.person.pos.x, pl.pos.z-v.person.pos.z); }
  // porch seats (men on the left, women on the right, along the front edge) or the plaza before the masjid exists
  function waitSeat(v){
    const st = stageNow(), male = isMale(v), taken = V.filter(o=>o!==v && o.home && o.dest && o.dest.seat).map(o=>o.dest);
    const cand = [];
    if(st>=1){ for(let i=0;i<9;i++){ const x = male ? -1.25 - i*.82 : 1.55 + i*.82; if(Math.abs(x)>7.2) break; cand.push({ x, z:7.55 }); }
      for(let i=0;i<9;i++){ const x = male ? -1.6 - i*.82 : 1.9 + i*.82; if(Math.abs(x)>7.2) break; cand.push({ x, z:6.75 }); } }
    else for(let i=0;i<10;i++) cand.push({ x:(male?-1:1)*(1.6+(i%5)*.9), z:11.4+Math.floor(i/5)*1.0 });
    for(const c of cand){ if(taken.some(o=>Math.hypot(o.x-c.x,o.z-c.z)<.6)) continue;
      if(ctx.colliders.some(k=>Math.hypot(k.x-c.x,k.z-c.z)<(k.r||0)+.25)) continue; return { x:c.x, z:c.z, seat:true }; }
    return { x:(male?-1:1)*R(2,5), z:st>=1?7.4:12, seat:true };
  }
  function setOff(v){
    // wudhu first when the pavilion is there, then a seat on the porch
    v.dest = stageNow()>=5 && !v.wudhu ? { x:WUDHU.x+2.95, z:WUDHU.z+R(-1.3,1.3), wudhu:true } : waitSeat(v);
    v.state = 'toMasjid'; v.path = routeVia(v.person.pos, v.dest) || [];
  }
  function invite(v){
    if(!v || !v.home || v.invited || v.role) return false;
    if(!canInvite()) return chat(v);
    v.invited = true; v.wudhu = false; v.state = 'reply'; v.timer = v.heard ? .9 : 1.5; v.path = [];
    faceWho(v); v.person.play('nod', 1.4); emote(v, v.heard ? 'star' : 'heart');
    dressForSalat(v.person.spec);
    ctx.modules.audio?.play?.('chime', { pos:v.person.pos.clone(), vol:.35 });
    ctx.emit('visitor:invite', { id:v.id, home:v.home.id, kind:v.person.spec.kind, count:api.invited, pos:v.person.pos.clone() });
    return true;
  }
  function chat(v){
    if(!v || !v.home || v.role) return false;
    const W = S.villagers || (S.villagers = { day:0, chatted:[] });
    if(W.day !== S.day){ W.day = S.day; W.chatted = []; }
    const first = !W.chatted.includes(v.home.id);
    if(first){ W.chatted.push(v.home.id); const ui = ctx.modules.ui; try{ if(ui?.addPahala) ui.addPahala(1, 'chat'); else { S.pahala = (S.pahala||0)+1; ctx.emit('coins:change', { coins:S.coins, pahala:S.pahala }); } }catch(e){} }
    v.prevState = v.state==='talk' ? v.prevState : v.state; v.state = 'talk'; v.timer = 2.4; faceWho(v);
    if(v.home.act!=='bench' && v.home.act!=='pond') v.person.play('wave', 1.4);
    emote(v, first ? 'heart' : pick(['smile','note','heart']));
    ctx.emit('visitor:chat', { id:v.id, home:v.home.id, first, pos:v.person.pos.clone() });
    return true;
  }
  // per-frame behaviour of a villager; returns false to let the shared states (gather/toSlot/pray/post/salam...) run
  function villagerStep(v, dt, t, p){
    const h = v.home; v._noSnap = false; v._noColl = false;
    if(v.listenT>0){ v.listenT -= dt; if(v.listenT<=0 && (v.state==='home'||v.state==='goHome')){ emote(v,'dome'); if(h.act!=='bench' && h.act!=='pond') p.play('nod',1.4); v.faceYaw = Math.atan2(-p.pos.x, -p.pos.z); v.lookT = 3; } }
    switch(v.state){
      case 'home': {
        if(h.act==='bench' || h.act==='pond'){
          const hp = homePos(h); p.pos.x += (hp.x-p.pos.x)*Math.min(1,dt*6); p.pos.z += (hp.z-p.pos.z)*Math.min(1,dt*6);
          p.pos.y = ctx.groundHeight(p.pos.x,p.pos.z) + (h.seatY||0); v._noSnap = true; v._noColl = true;
          stand(v, dt, v.lookT>0 ? v.faceYaw : h.yaw); p.pose(h.act==='bench' ? 'chatSit' : 'sit');
        } else if(h.act==='stroll'){
          if(v.pauseT>0){ v.pauseT -= dt; stand(v, dt, v.lookT>0 ? v.faceYaw : p.yaw); p.pose('chat'); }
          else { const w = h.path[v.wp]; const d = moveTo(v, w.x, w.z, dt, .42); p.pose('loco');
            if(d<.45){ const nx = v.wp + v.wpDir; if(nx<0 || nx>=h.path.length){ v.wpDir = -v.wpDir; v.pauseT = R(3,6); } v.wp = Math.max(0, Math.min(h.path.length-1, v.wp + v.wpDir)); } }
        } else if(h.act==='play'){
          v.ph += dt*1.35; const a = (h.a0||0) + v.ph, tx = h.cx + Math.cos(a)*h.r, tz = h.cz + Math.sin(a)*h.r*.8;
          moveTo(v, tx, tz, dt, .85); p.pose('loco');
          if(v.emoteT<=0){ emote(v, pick(['note','heart','smile','star'])); v.emoteT = R(4,8); }
        } else {
          const hp = homePos(h), dd = Math.hypot(hp.x-p.pos.x, hp.z-p.pos.z);
          if(dd>.35){ moveTo(v, hp.x, hp.z, dt, .6); p.pose('loco'); }
          else { stand(v, dt, v.lookT>0 ? v.faceYaw : h.yaw); p.pose(h.act==='watch' && v.id%2 ? 'loco' : 'chat'); v._noColl = true;
            if(h.act==='watch' && Math.random()<dt*.06) p.play(v.person.spec.kid ? 'cheer' : 'nod', 1.4); }
        }
        if(v.lookT>0) v.lookT -= dt;
        if(h.act!=='play' && v.emoteT<=0){ emote(v, h.act==='watch' ? pick(['heart','smile','!']) : moodPick('idle')); v.emoteT = R(5,11); }
        return true; }
      case 'talk': {
        v.timer -= dt; stand(v, dt, v.faceYaw);
        if(h.act==='bench' || h.act==='pond'){ v._noSnap = true; v._noColl = true; p.pos.y = ctx.groundHeight(p.pos.x,p.pos.z) + (h.seatY||0); p.pose(h.act==='bench' ? 'chatSit' : 'sit'); }
        else p.pose('chat');
        if(v.timer<=0) v.state = v.prevState==='goHome' ? 'goHome' : 'home';
        return true; }
      case 'goHome': {
        const hp = homePos(h); p.pose('loco');
        const d = followPath(v, hp.x, hp.z, dt, .9), sitR = h.act==='bench' ? 1.2 : .3;
        if(h.act==='bench' && d<1.4) v._noColl = true;
        if(d<sitR){ v.state = 'home'; v.donated = false; v.wudhu = false; v.emoteT = R(1,4); }
        return true; }
      case 'reply': {
        v.timer -= dt; stand(v, dt, v.faceYaw);
        if(h.act==='bench'){ v._noSnap = true; v._noColl = true; p.pose('chatSit'); } else p.pose('chat');
        if(v.timer<=0){ if(h.act==='bench'){ const q = pushOut(p.pos.x, p.pos.z, .35); p.pos.x = q.x; p.pos.z = q.z; } setOff(v); }
        return true; }
      case 'toMasjid': {
        p.pose('loco'); const d = followPath(v, v.dest.x, v.dest.z, dt, 1.1);
        if(v.dest.seat){ if(d<.3){ p.pos.x += (v.dest.x-p.pos.x)*.5; p.pos.z += (v.dest.z-p.pos.z)*.5; arriveMasjid(v); } }
        else if(d<.35){ v.state = 'wudhu'; v.timer = 3.2; v.wudhu = true; }
        return true; }
      case 'wudhu': {
        v.timer -= dt; stand(v, dt, -Math.PI/2); p.pose('loco');
        if(Math.random()<dt*3) ctx.modules.fx?.burst?.('water', _p.set(p.pos.x-.4, p.pos.y+.7, p.pos.z).clone(), 1);
        if(v.timer>2.9 && !v._wn){ v._wn = 1; p.play('nod', 2.6); }
        if(v.timer<=0){ v._wn = 0; v.dest = waitSeat(v); v.state = 'toMasjid'; v.path = routeVia(p.pos, v.dest) || []; }
        return true; }
      case 'gather': {
        // invited jamaah wait seated on the porch, facing the qibla, until the prayer starts (or the window closes)
        v.waitT += dt;
        if(v.seated){ const s = v.dest; if(s){ p.pos.x += (s.x-p.pos.x)*Math.min(1,dt*5); p.pos.z += (s.z-p.pos.z)*Math.min(1,dt*5); }
          stand(v, dt, Math.PI); p.pose('duduk'); v._noColl = true; }
        else { stand(v, dt, Math.PI); p.pose('chat'); }
        if(!prayerActive() && v.waitT>12 && !held){ emote(v,'smile'); goHome(v); }
        return true; }
    }
    return false;
  }
  function arriveMasjid(v){
    v.state = 'gather'; v.seated = true; v.waitT = 0; v.path = []; lastGather = ctx.time;
    emote(v, 'smile');
    ctx.emit('visitor:arrive', { id:v.id, kind:v.person.spec.kind, pos:v.person.pos.clone(), count:api.gathered, invited:true });
  }
  // gold/green check bubbles over invited villagers (one Points draw call)
  const MK = 24, mkPos = new Float32Array(MK*3);
  const mkGeo = new THREE.BufferGeometry(); mkGeo.setAttribute('position', new THREE.BufferAttribute(mkPos,3).setUsage(THREE.DynamicDrawUsage));
  const mkTex = (()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    g.fillStyle='#ffd23f'; g.strokeStyle='#7a4a22'; g.lineWidth=4; g.beginPath(); g.arc(32,32,26,0,7); g.fill(); g.stroke();
    g.strokeStyle='#ffffff'; g.lineWidth=11; g.lineCap='round'; g.lineJoin='round'; g.beginPath(); g.moveTo(19,33); g.lineTo(28,42); g.lineTo(45,23); g.stroke();
    g.strokeStyle='#2f9e44'; g.lineWidth=6; g.beginPath(); g.moveTo(19,33); g.lineTo(28,42); g.lineTo(45,23); g.stroke();
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  const mkPts = new THREE.Points(mkGeo, new THREE.PointsMaterial({ map:mkTex, size:.75, sizeAttenuation:true, transparent:true, depthWrite:false, alphaTest:.05, fog:false }));
  mkPts.frustumCulled = false; mkPts.renderOrder = 21; mkPts.visible = false; mkPts.name = 'invitedMarks'; scene.add(mkPts);
  function updateMarks(){
    let n = 0;
    for(const v of V){ if(n>=MK) break; if(!v.home || !v.invited || v.state==='pray' || v.state==='toSlot') continue; const p = v.person, hd = p.head;
      const bob = Math.sin(ctx.time*3 + v.id)*.04;
      mkPos[n*3] = hd ? hd.x : p.pos.x; mkPos[n*3+1] = (hd ? hd.y : p.pos.y+1.2) + .5*(p.size||1) + bob; mkPos[n*3+2] = hd ? hd.z : p.pos.z; n++; }
    mkGeo.setDrawRange(0, n); mkPts.visible = n>0; if(n) mkGeo.attributes.position.needsUpdate = true;
  }
  const _pz = {x:0,z:0};
  function update(dt,t){
    const sp = prayer.speed>0 ? prayer.speed : 1;
    // spawn
    const c = cap();
    spawnT -= dt;
    if(spawnT<=0){ spawnT = booted ? R(2.5,5) : 0; residents(); }
    for(let i=waveQ.length-1;i>=0;i--){ const w=waveQ[i]; w.t-=dt; if(w.t<=0){ waveQ.splice(i,1); spawn({ mode:w.mode, wave:true }); } }
    // night / over-capacity: send home (never while the jamaah are held for a prayer)
    if(c===0 && !held) for(const v of V) if(!v.home && (v.state==='gather'||v.state==='sitIdle')) leave(v);
    // legacy idle scheduler (only without the game prayer module, which now decides when salat happens)
    if(prayer.phase==='idle'){
      prayer.restT += dt;
      if(!ctx.modules.prayer){
        const g = V.filter(v=>v.state==='gather'&&v.mode==='pray');
        const oldest = g.reduce((m,v)=>Math.max(m,v.waitT),0);
        if(stageNow()>=1 && g.length>=Math.min(3,Math.max(1,c)) && ctx.time-lastArrive>3.5 && (oldest>7 || g.length>=6)) startPrayer();
      }
    } else if(prayer.phase==='assemble'){
      prayer.t+=dt;                         // real time: the imam and the jamaah need to walk in (prayer.speed only speeds the prayer)
      const moving = V.filter(v=>v.state==='toSlot').length;
      const limit = prayer.imam==='player' ? 14 : 9;
      // the imam must be in place first (the player walking up, or Pak Haji); a Jumat khatib is up on the mimbar instead
      const ready = prayer.imamReady || (prayer.khutbah && prayer.imam!=='player') || prayer.t>limit+6;
      if(ready && prayer.t>2.5 && (moving===0 || prayer.t>limit)){
        if(prayer.khutbah){ prayer.phase='khutbah'; prayer.t=0; }
        else runStart();
      }
      else if(moving===0 && prayer.t>1 && prayer.count===0 && prayer.imam==='auto'){ prayer.phase='idle'; }
    } else if(prayer.phase==='khutbah'){
      // the khutbah (about 8 s) starts once the khatib stands on the mimbar; the jamaah sit and listen
      if(!imamV || imamV.state==='khatib') prayer.t += dt*sp; else prayer.khT += dt*sp;
      if(prayer.t>8 || !imamV || prayer.khT>10){ prayer.phase='rise'; prayer.t=0; if(imamV){ imamV.state='descend'; imamV.timer=0; } }
    } else if(prayer.phase==='rise'){
      prayer.t += dt*sp;
      const busyImam = imamV && (imamV.state==='descend' || (imamV.role==='imam' && imamV.state==='toImam'));
      if(prayer.t>1.6 && (!busyImam || prayer.t>8)) runStart();
    } else if(prayer.phase==='run'){
      prayer.t += prayer.hold?0:dt*sp;
      if(prayer.t>FULL_T(prayer.tlId)+1.5) finishPrayer();
    }
    // latecomers (the tail of an adzan wave, or anyone arriving while the rows assemble) fill the free back slots
    // instead of waiting on the plaza through the whole prayer; nobody joins in the last part of the prayer
    if(prayer.phase!=='idle'){
      joinT -= dt;
      if(joinT<=0){ joinT = .5;
        const late = prayer.phase==='run' && prayer.t > FULL_T(prayer.tlId)*.5;
        if(!late) for(const v of V){
          if(v.mode!=='pray' || v.role || v.state!=='gather' || v.slot) continue;
          const sl = (isMale(v) ? SM : SF).find(s=>!s.used); if(!sl) continue;
          sl.used=v; v.slot=sl; v.state='toSlot'; v.seated=false; v.delay = .25 + sl.row*.1 + R(0,.3); v.path = pathToSlot(v, sl, prayer.layout); v.sat=false;
          dressForSalat(v.person.spec); prayer.count++; refreshMats();
        }
      }
    }
    const M = Mj();
    // per visitor
    for(let i=V.length-1;i>=0;i--){
      const v=V[i], p=v.person;
      if(v.state==='pray'||v.state==='post'||v.state==='sitIdle'||v.state==='static'||v.state==='khatib'||v.state==='imam'){ p.accX=p.accZ=0; }
      v.emoteT-=dt;
      let snap = true, coll = true;
      if(v.home && villagerStep(v, dt, t, p)){ snap = !v._noSnap; coll = !v._noColl; }
      else switch(v.state){
        case 'arrive': case 'gather': {
          v.waitT += v.state==='gather'?dt:0;
          if(v.path.length){ const w=v.path[0]; const d=moveTo(v,w.x,w.z,dt); if(d<.35){ v.path.shift(); if(!v.path.length){ v.state = v.mode==='sit'?'toSit':'gather'; v.waitT=0; } } p.pose('loco'); }
          else { stand(v,dt,Math.sin(v.id*7.3)*1.4+Math.PI*.5+(v.wave?Math.PI*.5:0)); p.pose(v.id%2?'chat':'loco'); }
          if(v.state==='gather' && !held && v.waitT>(stageNow()>=1?80:14)){ leave(v); }
          break; }
        case 'static': { stand(v,dt,v.faceYaw); break; }
        case 'toSit': { const d=moveTo(v,v.spot.x,v.spot.z,dt,.9); p.pose('loco'); if(d<.2){ v.state='sitIdle'; v.timer=R(25,45); } break; }
        case 'sitIdle': { stand(v,dt,Math.atan2(-v.spot.x,4)+.6); p.pose('chatSit'); v.timer-=dt; if(v.timer<=0 && !held) leave(v); break; }
        case 'toSlot': {
          const sl=v.slot; if(!sl){ v.state='gather'; break; } p.pose('loco');
          const d = followPath(v, sl.x, sl.z, dt, 1.15);
          if(d<.15){ v.state='pray'; v.sat=false; }
          break; }
        case 'pray': {
          const sl=v.slot; if(!sl){ v.state='gather'; break; }
          const dx=sl.x-p.pos.x, dz=sl.z-p.pos.z;
          if(dx*dx+dz*dz>.03){ moveTo(v,sl.x,sl.z,dt,1); p.pose('loco'); break; }
          stand(v,dt,Math.PI); p.pos.x+=(sl.x-p.pos.x)*Math.min(1,dt*6); p.pos.z+=(sl.z-p.pos.z)*Math.min(1,dt*6);
          const ph = prayer.phase;
          p.pose(ph==='run' ? (prayer.hold||poseAt(prayer.t-v.delay, prayer.tlId)) : ph==='rise' ? 'qiyam' : (ph==='assemble'||ph==='khutbah') ? 'duduk' : 'qiyam', true);
          coll = false;
          break; }
        // ---- NPC imam / khatib (Pak Haji)
        case 'toImam': {
          const d = moveTo(v, v.imamAt.x, v.imamAt.z, dt, 1); p.pose('loco');
          if(d<.12){ v.state='imam'; prayer.imamReady = true; }
          break; }
        case 'imam': {
          stand(v,dt,Math.PI); p.pos.x+=(v.imamAt.x-p.pos.x)*Math.min(1,dt*6); p.pos.z+=(v.imamAt.z-p.pos.z)*Math.min(1,dt*6);
          const ph = prayer.phase; p.pose(ph==='run' ? (prayer.hold||poseAt(prayer.t, prayer.tlId)) : 'qiyam', true); coll=false; break; }
        case 'climb': { // walk up the mimbar steps (positions are scripted; no ground snap on the stairs)
          v.timer += dt*sp; snap=false; coll=false;
          const u = Math.min(1, v.timer/2.4), m = MIMBAR, gy = ctx.groundHeight(m.foot.x,m.foot.z);
          const a = Math.min(1,u*1.6), b = Math.max(0,(u-.62)/.38);
          p.pos.x = m.foot.x; p.pos.z = u<.62 ? m.foot.z+(m.step.z-m.foot.z)*a : m.step.z+(m.top.z-m.step.z)*b;
          p.pos.y = gy + (u<.62 ? m.step.y*a : m.step.y+(m.top.y-m.step.y)*b);
          p.yaw = angLerp(p.yaw, u<1?Math.PI:0, Math.min(1,dt*(u<1?8:5))); p.speed = u<1?1.4:0; p.cycle += dt*5*(u<1?1:0); p.pose('loco');
          if(u>=1){ v.state='khatib'; }
          break; }
        case 'khatib': { snap=false; coll=false; const m=MIMBAR; p.pos.set(m.top.x, ctx.groundHeight(m.foot.x,m.foot.z)+m.top.y, m.top.z); stand(v,dt,0); p.pose('khutbah',true); break; }
        case 'descend': {
          v.timer += dt*sp; snap=false; coll=false;
          const u = Math.min(1, v.timer/1.8), m = MIMBAR, gy = ctx.groundHeight(m.foot.x,m.foot.z);
          p.pos.x = m.foot.x; p.pos.z = m.top.z + (m.foot.z-m.top.z)*u; p.pos.y = gy + m.top.y*(1-u);
          p.yaw = angLerp(p.yaw, 0, Math.min(1,dt*8)); p.speed = 1.3; p.cycle += dt*5; p.pose('loco');
          if(u>=1){ if(v.role==='imam'){ v.state='toImam'; } else if(v.slot){ v.state='toSlot'; v.path=[]; v.delay=.35+v.slot.row*.1; v.role=null; } else { v.role=null; leave(v); } }
          break; }
        case 'salam': {
          const pl = ctx.modules.characters?.player;
          if(v.delay>0){ v.delay-=dt; stand(v,dt,v.faceYaw); p.pose('duduk'); break; }
          const d = moveTo(v, v.target.x, v.target.z, dt, .9); p.pose('loco'); v.timer += dt;
          if(d<.14 || v.timer>7){
            v.state='greet'; v.timer=1.7; p.play('greet',1.7);
            if(pl) v.faceYaw = Math.atan2(pl.pos.x-p.pos.x, pl.pos.z-p.pos.z);
            emote(v,'heart'); ctx.emit('visitor:salam',{ id:v.id, pos:{x:p.pos.x, y:p.pos.y, z:p.pos.z} });
          }
          break; }
        case 'greet': { stand(v,dt,v.faceYaw); v.timer-=dt; if(v.timer<=0){ v.state='post'; v.timer=R(4,8); v.postSit=0; v.faceYaw = v.faceYaw+Math.PI*.6; } break; }
        case 'post': {
          stand(v,dt,v.faceYaw); v.timer-=dt;
          if(v.postSit>0){ v.postSit-=dt; p.pose('duduk'); coll=false; }
          else p.pose('chat');
          if(v.nodT>0){ v.nodT-=dt; if(v.nodT<=0) p.play('nod',1.6); }
          if(v.emoteT<=0){ emote(v,moodPick('post')); v.emoteT=R(2.5,5); }
          if(v.timer<=0){ leave(v); }
          break; }
        case 'leave': {
          if(v.path.length){ const w=v.path[0]; const d=moveTo(v,w.x,w.z,dt,1.05); p.pose('loco'); if(d<.5) v.path.shift(); }
          else { p.speed=0; V.splice(i,1); continue; }
          break; }
      }
      // chat emotes while gathering / sitting
      if(!v.home && (v.state==='gather'||v.state==='sitIdle')&&v.emoteT<=0){ emote(v,moodPick('idle')); v.emoteT=R(3,7); }
      // greet player
      const pl = ctx.modules.characters?.player;
      if(pl && !v.home && (v.state==='arrive'||v.state==='leave'||v.state==='gather'||v.state==='sitIdle') && t-v.waved>25){
        const dx=pl.pos.x-p.pos.x, dz=pl.pos.z-p.pos.z; if(dx*dx+dz*dz<12){ v.waved=t; p.play('wave',1.5); emote(v,'heart'); }
      }
      // footprints: once per visitor per zone (porch / hall)
      if(p.speed>.2 && M?.isInside){ v.zoneT-=dt; if(v.zoneT<=0){ v.zoneT=.25; let zn=null; try{ zn = M.isInside(p.pos.x,p.pos.z); }catch(e){} p._indoor = zn; if(zn && !v.entered[zn]){ v.entered[zn]=1; ctx.emit('visitor:enter',{ id:v.id, zone:zn, pos:{x:p.pos.x, y:p.pos.y, z:p.pos.z} }); } } }
      if(coll && (v.state!=='pray'||p.speed>.2)){ collide(p); }
      if(snap) groundSnap(p,dt);
      p.step(dt);
    }
    updateMarks();
  }
  // instant crowd for screenshots
  function crowd(n){
    for(let i=0;i<n;i++){
      const v = spawn({x:R(-3,3),z:R(14,22),mode:'pray'}); if(!v) break;
      v.state='gather'; v.path=[]; v.waitT=10;
    }
    lastArrive=-99; spawnT=999;
    const ph = q.get('phase');
    if(startPrayer()){
      for(const v of V){ if(v.slot){ v.person.pos.set(v.slot.x,0,v.slot.z); v.person.pos.y=ctx.groundHeight(v.slot.x,v.slot.z); v.person.yaw=Math.PI; v.state='pray'; v.path=[]; } }
      prayer.phase='run'; prayer.t = ph?0:R(2,14);
      if(ph) prayer.hold=ph;
    }
    // overflow: stand and chat in clumps
    for(const v of V) if(v.state==='gather'){ const a=R(0,6.28), r=R(5,10); v.person.pos.set(Math.cos(a)*r+PRAY.x, 0, 15+Math.abs(Math.sin(a))*r*.6); v.person.pos.y=ctx.groundHeight(v.person.pos.x,v.person.pos.z); v.person.pose('chat'); }
  }
  function lineup(){
    const kinds=['man','boy','elder','woman','girl','elderW'];
    kinds.forEach((k,i)=>{ const v=spawn({kind:k,x:(i-2.5)*1.5,z:10}); v.state='static'; v.faceYaw=0; v.person.yaw=0; v.person.pos.y=ctx.groundHeight(v.person.pos.x,10); const pn=q.get('pose'); if(pn) v.person.pose(pn); else v.person.pose(i%2?'chat':'loco'); });
    spawnT=999;
  }
  Object.assign(api, { lineup, update, spawn, crowd, wave, setHold, startPrayer, abortPrayer, poseAt, FULL_T, timeline,
    canInvite, invite, chat, nearestVillager, villagers:()=>V.filter(v=>v.home), homes:()=>homes.slice(), residents, goHome });
  // live getters (Object.assign would copy their values once)
  Object.defineProperties(api, {
    held:{ get(){ return held; }, enumerable:true },
    gathered:{ get(){ let n=0; for(const v of V) if(v.mode==='pray' && !v.role && v.state==='gather') n++; return n; }, enumerable:true },
    npcImam:{ get(){ return imamV ? imamV.person : null; }, enumerable:true },
    waiting:{ get(){ return waveQ.length; }, enumerable:true },
    invited:{ get(){ let n=0; for(const v of V) if(v.home && v.invited) n++; return n; }, enumerable:true },
    walking:{ get(){ let n=0; for(const v of V) if(v.home && v.invited && (v.state==='reply'||v.state==='toMasjid'||v.state==='wudhu')) n++; return n; }, enumerable:true },
    residentCount:{ get(){ let n=0; for(const v of V) if(v.home) n++; return n; }, enumerable:true },
    lastGather:{ get(){ return lastGather; }, enumerable:true },
  });
  return api;
}

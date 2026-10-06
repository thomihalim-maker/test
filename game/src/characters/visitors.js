// NPC jamaah visitors: arrive from the road (or in a wave after the adzan), gather, pray in rows behind the imam
// (player or Pak Haji), greet with salam, chat, donate, leave. Prayer timelines (rakaat per prayer) live here.
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
  let nextId=1, spawnT=3, lastArrive=-99, held=false, imamV=null;
  const waveQ = [];
  const api = { list:V, prayer, slotsM, slotsF, PRAY, count:()=>V.length, get stageCap(){return cap();},
    get slots(){ return { men:SM, women:SF }; } };

  function attraction(){ return safe(()=>ctx.modules.care?.attraction?.(), null); }
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
    if(V.length>=MAXV) return null;
    const spec = opts.spec || randomSpec(opts.kind);
    const p = new Person(spec);
    const x = R(-2.5,2.5);
    p.pos.set(opts.x ?? x, 0, opts.z ?? 41); p.pos.y = ctx.groundHeight(p.pos.x,p.pos.z);
    p.yaw = Math.PI; p.onStep = footstep;
    p.accX=p.accZ=0;
    const mode = opts.mode || (Math.random()<.2||spec.stoop?'sit':'pray');
    const v = { id:nextId++, person:p, state:'arrive', path:[], vel:new THREE.Vector3(), timer:0, slot:null, mode, emoteT:R(2,5), delay:0, donated:false, waved:-99, faceYaw:Math.PI,
      speedMax:R(2.4,3.0)*spec.speed*(opts.wave?1.25:1), waitT:0, spot:null, entered:{}, zoneT:R(0,.25), role:opts.role||null, wave:!!opts.wave };
    const g = opts.wave ? pick(GATHER_WAVE) : pick(GATHER); v.path=[ {x:g.x+R(-1,1),z:g.z+R(-.8,.8)} ]; v.gx=g;
    if(v.mode==='sit'){ const sp = pick(SIT); v.spot = sp; }
    V.push(v); ctx.emit('visitor:arrive',{id:v.id,kind:spec.kind,pos:p.pos.clone(),count:V.length});
    lastArrive = ctx.time; return v;
  }
  function footstep(p,side){
    if(p.speed>3.5) ctx.modules.fx?.burst?.('dust',_p.set(p.pos.x,p.pos.y+.05,p.pos.z).clone());
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
      if(v.state==='toSlot'||v.state==='pray'){ if(v.slot) v.slot.used=null; v.slot=null; v.state='gather'; v.path=[]; v.waitT=0; }
    }
    imamV=null; prayer.phase='idle'; prayer.imam=null; refreshMats();
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
    if(layout){ SM = layout.men.map(s=>({x:s.x, z:s.z, row:s.row|0, used:null})); SF = (layout.women||[]).map(s=>({x:s.x, z:s.z, row:(s.row|0)+rowOff, used:null})); }
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
      sl.used=v; v.slot=sl; v.state='toSlot'; v.delay = .25 + sl.row*.1 + R(0,.3); v.path = pathToSlot(v, sl, layout); v.sat=false; n++;
    }
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
    for(const v of pr){
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
    if(v===imamV) imamV=null;
    v.state='leave'; if(v.slot){ v.slot.used=null; v.slot=null; refreshMats(); }
    if(!v.role) donate(v);
    v.path=leavePath(v);
  }
  function donate(v){
    if(v.donated) return; v.donated=true;
    const st = stageNow(), mul = attraction()?.donateMul ?? 1;
    const amt = Math.max(1, Math.round((3+Math.random()*8)*(1+st*.35)*(Number.isFinite(mul)?mul:1)));
    const ui = ctx.modules.ui;
    if(ui?.addCoins) ui.addCoins(amt,'visitor');
    else { if(ctx.state) ctx.state.coins = (ctx.state.coins||0)+amt; ctx.emit('coins:change',{coins:ctx.state?.coins, total:ctx.state?.coins, delta:amt, source:'visitor'}); }
    ctx.emit('visitor:donate',{id:v.id,amount:amt,pos:v.person.pos.clone()});
    const pos = v.person.pos.clone(); pos.y+=1.4;
    ctx.modules.fx?.burst?.('coin',pos); ctx.modules.audio?.play?.('coin',{pos,vol:.5});
    emote(v,'coin');
  }
  // scheduled arrivals after the adzan: staggered spawns from the road, ignore the stage cap and the night rule
  function wave(n, o={}){
    n = Math.max(0, Math.min(n|0, MAXV - V.length - waveQ.length));
    let t = R(.15,.5);
    for(let i=0;i<n;i++){ waveQ.push({ t, mode:o.mode||'pray', prayerId:o.prayerId||null }); t += R(.6,1.5); }
    return n;
  }
  function setHold(b){ held = !!b; return held; }

  const _pz = {x:0,z:0};
  function update(dt,t){
    const sp = prayer.speed>0 ? prayer.speed : 1;
    // spawn
    const c = cap();
    spawnT -= dt;
    if(spawnT<=0){
      const active = V.filter(v=>v.state!=='leave').length;
      if(active<c) spawn();
      const st = stageNow(); spawnT = R(4,9)/(1+st*.2);
    }
    for(let i=waveQ.length-1;i>=0;i--){ const w=waveQ[i]; w.t-=dt; if(w.t<=0){ waveQ.splice(i,1); spawn({ mode:w.mode, wave:true }); } }
    // night / over-capacity: send home (never while the jamaah are held for a prayer)
    if(c===0 && !held) for(const v of V) if(v.state==='gather'||v.state==='sitIdle') leave(v);
    // legacy idle scheduler (only without the game prayer module, which now decides when salat happens)
    if(prayer.phase==='idle'){
      prayer.restT += dt;
      if(!ctx.modules.prayer){
        const g = V.filter(v=>v.state==='gather'&&v.mode==='pray');
        const oldest = g.reduce((m,v)=>Math.max(m,v.waitT),0);
        if(stageNow()>=1 && g.length>=Math.min(3,Math.max(1,c)) && ctx.time-lastArrive>3.5 && (oldest>7 || g.length>=6)) startPrayer();
      }
    } else if(prayer.phase==='assemble'){
      prayer.t+=dt*sp;
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
    const runPose = (delay)=>prayer.hold||poseAt(prayer.t-delay, prayer.tlId);
    const M = Mj();
    // per visitor
    for(let i=V.length-1;i>=0;i--){
      const v=V[i], p=v.person;
      if(v.state==='pray'||v.state==='post'||v.state==='sitIdle'||v.state==='static'||v.state==='khatib'||v.state==='imam'){ p.accX=p.accZ=0; }
      v.emoteT-=dt;
      let snap = true, coll = true;
      switch(v.state){
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
          p.pose(ph==='run' ? runPose(v.delay) : ph==='rise' ? 'qiyam' : (ph==='assemble'||ph==='khutbah') ? 'duduk' : 'qiyam');
          coll = false;
          break; }
        // ---- NPC imam / khatib (Pak Haji)
        case 'toImam': {
          const d = moveTo(v, v.imamAt.x, v.imamAt.z, dt, 1); p.pose('loco');
          if(d<.12){ v.state='imam'; prayer.imamReady = true; }
          break; }
        case 'imam': {
          stand(v,dt,Math.PI); p.pos.x+=(v.imamAt.x-p.pos.x)*Math.min(1,dt*6); p.pos.z+=(v.imamAt.z-p.pos.z)*Math.min(1,dt*6);
          const ph = prayer.phase; p.pose(ph==='run' ? runPose(0) : 'qiyam'); coll=false; break; }
        case 'climb': { // walk up the mimbar steps (positions are scripted; no ground snap on the stairs)
          v.timer += dt*sp; snap=false; coll=false;
          const u = Math.min(1, v.timer/2.4), m = MIMBAR, gy = ctx.groundHeight(m.foot.x,m.foot.z);
          const a = Math.min(1,u*1.6), b = Math.max(0,(u-.62)/.38);
          p.pos.x = m.foot.x; p.pos.z = u<.62 ? m.foot.z+(m.step.z-m.foot.z)*a : m.step.z+(m.top.z-m.step.z)*b;
          p.pos.y = gy + (u<.62 ? m.step.y*a : m.step.y+(m.top.y-m.step.y)*b);
          p.yaw = angLerp(p.yaw, u<1?Math.PI:0, Math.min(1,dt*(u<1?8:5))); p.speed = u<1?1.4:0; p.cycle += dt*5*(u<1?1:0); p.pose('loco');
          if(u>=1){ v.state='khatib'; }
          break; }
        case 'khatib': { snap=false; coll=false; const m=MIMBAR; p.pos.set(m.top.x, ctx.groundHeight(m.foot.x,m.foot.z)+m.top.y, m.top.z); stand(v,dt,0); p.pose('khutbah'); break; }
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
      if((v.state==='gather'||v.state==='sitIdle')&&v.emoteT<=0){ emote(v,moodPick('idle')); v.emoteT=R(3,7); }
      // greet player
      const pl = ctx.modules.characters?.player;
      if(pl && (v.state==='arrive'||v.state==='leave'||v.state==='gather'||v.state==='sitIdle') && t-v.waved>25){
        const dx=pl.pos.x-p.pos.x, dz=pl.pos.z-p.pos.z; if(dx*dx+dz*dz<12){ v.waved=t; p.play('wave',1.5); emote(v,'heart'); }
      }
      // footprints: once per visitor per zone (porch / hall)
      if(p.speed>.2 && M?.isInside){ v.zoneT-=dt; if(v.zoneT<=0){ v.zoneT=.25; const zn = safe(()=>M.isInside(p.pos.x,p.pos.z)); if(zn && !v.entered[zn]){ v.entered[zn]=1; ctx.emit('visitor:enter',{ id:v.id, zone:zn, pos:{x:p.pos.x, y:p.pos.y, z:p.pos.z} }); } } }
      if(coll && (v.state!=='pray'||p.speed>.2)){ collide(p); }
      if(snap) groundSnap(p,dt);
      p.step(dt);
    }
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
    get held(){ return held; },
    get gathered(){ let n=0; for(const v of V) if(v.mode==='pray' && !v.role && v.state==='gather') n++; return n; },
    get npcImam(){ return imamV ? imamV.person : null; },
    get waiting(){ return waveQ.length; } });
  return api;
}

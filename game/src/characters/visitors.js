// NPC jamaah visitors: arrive from the road, gather, pray in rows (rukuk/sujud), chat, donate, leave.
import * as THREE from 'three';
import { Person } from './rig.js';
import { ACTS } from './anims.js';

const R = (a,b)=>a+Math.random()*(b-a);
const pick = (a)=>a[(Math.random()*a.length)|0];
const SKIN = [0xf6d1a8,0xe9b98a,0xd9a06b,0xc68642,0xa86b3f,0x8d5a34,0xf0c8a0];
const KOKO = [0xf7f2e4,0xfbf6ea,0xcfe8f5,0xc9ebd8,0xe9dcc0,0xf6d3c3,0xdcd0f0,0xbfe0d0,0xf3e3a3,0xa8cde8,0x9ac9b0];
const SARONG = [0x2e7d6b,0x2a5d9f,0x7a2e3b,0xc0692c,0x5b3a8c,0x1e6f8f,0x8a6a1f,0x3b6b3b,0xb23a48,0x35557a];
const PECI = [0x1b1b1f,0x1b1b1f,0x1b1b1f,0x2a1d17,0x1d2438];
const HAIR = [0x2a1d17,0x1b1410,0x3b2a1e];
const HIJAB = [0xf2a0b6,0xcdb4e8,0x4fb3a7,0xe8b34a,0xfaf4ea,0xf6b99b,0xa83d56,0x93b88a,0x8ec5ea,0xe58a8a];
const GAMIS = [0xf6e1ec,0xd6ecf2,0xbfe3cf,0xf3dd9d,0xe4d3f0,0xf4c7bf,0x9fd0c9,0xc7d7f2,0xffffff,0xe9c6a0];
const SHOE = [0x6b4a2e,0x3b2a20,0x8a6a3a,0x2a2a30];

export function randomSpec(kind){
  kind = kind || pick(['man','man','man','woman','woman','boy','girl','elder','elderW']);
  const sk = pick(SKIN);
  const s = { kind, size:1, headScale:1, stoop:0, torso:'koko', bottom:'sarong', hat:'peci', gender:'m', speed:1,
    colors:{ skin:sk, top:pick(KOKO), bot:pick(SARONG), head:pick(PECI), shoe:pick(SHOE) } };
  switch(kind){
    case 'man': s.size=R(.98,1.06); s.hat = pick(['peci','peci','peci','kopiah','hair']); if(s.hat==='kopiah') s.colors.head=0xf6f2e8; if(s.hat==='hair') s.colors.head=pick(HAIR); break;
    case 'boy': s.size=R(.72,.82); s.headScale=1.13; s.hat=pick(['peci','hair','hair']); if(s.hat==='hair') s.colors.head=pick(HAIR); s.speed=1.15; break;
    case 'elder': s.size=.97; s.stoop=.13; s.hat='kopiahBeard'; s.colors.head=0xf4f1ea; s.colors.top=pick([0xf7f2e4,0xe9dcc0,0xcdd7c0]); s.speed=.6; break;
    case 'woman': s.size=R(.96,1.0); s.gender='f'; s.torso='gamis'; s.bottom='skirt'; s.hat='hijab'; s.colors.head=pick(HIJAB); s.colors.top=pick(GAMIS); break;
    case 'girl': s.size=R(.72,.8); s.headScale=1.13; s.gender='f'; s.torso='gamis'; s.bottom='skirt'; s.hat='hijab'; s.colors.head=pick(HIJAB); s.colors.top=pick(GAMIS); s.speed=1.15; break;
    case 'elderW': s.size=.94; s.gender='f'; s.stoop=.14; s.torso='gamis'; s.bottom='skirt'; s.hat='hijab'; s.colors.head=pick([0xfaf4ea,0xcfd8dc,0xb9a7c9]); s.colors.top=pick([0xd9c7a8,0xb8c9d6,0xc9b5c9]); s.speed=.6; break;
  }
  return s;
}

const FULL = (()=>{ // [pose, seconds]
  const r1=[['takbir',1.8],['qiyam',2.6],['rukuk',2.8],['itidal',1.6],['sujud',3.0],['tahiyat',1.6],['sujud',3.0]];
  const r2=[['qiyam',1.8],['rukuk',2.4],['itidal',1.4],['sujud',2.6],['tahiyat',1.4],['sujud',2.6]];
  const end=[['tahiyat',4.2],['salam',3.4]];
  return [...r1,...r2,...end];
})();
const FULL_T = FULL.reduce((a,b)=>a+b[1],0);
function poseAt(t){ if(t<0) return 'qiyam'; for(const [n,d] of FULL){ if(t<d) return n; t-=d; } return 'salam'; }

export function createVisitors(ctx, people, env){
  const scene = ctx.scene, V = [];
  const q = new URLSearchParams(location.search);
  const PRAY = { x:0, z:3.9, ...(ctx.modules.masjid?.prayerArea||{}) };
  // slots
  const mk = (cols,rows,x0,dx,z0,dz)=>{ const a=[]; for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) a.push({x:PRAY.x+x0+c*dx, z:PRAY.z+z0+r*dz, row:r, used:null}); return a; };
  const AISLE = .3;
  const byFar = (a)=>{ const out=[]; for(let r=0;r<4;r++){ const row=a.filter(s=>s.row===r).sort((p,q)=>Math.abs(q.x-AISLE)-Math.abs(p.x-AISLE)); out.push(...row);} return out; };
  const slotsM = byFar(mk(6,4,-6.9,1.1,0,1.25)), slotsF = byFar(mk(4,4,1.8,1.1,0,1.25));
  // sajadah mats (instanced)
  const MAXM = slotsM.length+slotsF.length;
  const matGeo = new THREE.PlaneGeometry(.62,1.15).rotateX(-Math.PI/2);
  const matMesh = new THREE.InstancedMesh(matGeo, new THREE.MeshToonMaterial({color:0xffffff}), MAXM); matMesh.count=0; matMesh.receiveShadow=true; matMesh.frustumCulled=false; scene.add(matMesh);
  const matCols=[0x3f8f6a,0x9a3b4a,0x3e6fb0,0x8a5db0,0xc58a3a].map(h=>new THREE.Color(h));
  const _m=new THREE.Matrix4(), _q=new THREE.Quaternion(), _p=new THREE.Vector3(), _s=new THREE.Vector3(1,1,1), _e=new THREE.Euler();
  function refreshMats(){
    let n=0; for(const sl of [...slotsM,...slotsF]){ if(!sl.used) continue;
      _p.set(sl.x, ctx.groundHeight(sl.x,sl.z)+.02, sl.z-.12); _q.setFromEuler(_e.set(0,0,0)); _s.set(1,1,1); _m.compose(_p,_q,_s); matMesh.setMatrixAt(n,_m); matMesh.setColorAt(n,matCols[(sl.row*2+Math.round(sl.x))&3 % 4]); n++; }
    matMesh.count=n; matMesh.instanceMatrix.needsUpdate=true; if(matMesh.instanceColor) matMesh.instanceColor.needsUpdate=true;
  }
  const GATHER = [ {x:-1.5,z:17}, {x:1.5,z:19}, {x:-4.5,z:16}, {x:4.5,z:17.5}, {x:0,z:21}, {x:-7,z:19}, {x:7,z:20} ];
  const SIT = [ {x:-9.5,z:14},{x:-10.5,z:15.2},{x:-8.6,z:15.4},{x:9.5,z:14},{x:10.5,z:15.2},{x:8.6,z:15.4} ];
  const prayer = { phase:'idle', t:0, hold:q.get('prayer')||null, restT:0, timer:0 };
  let nextId=1, spawnT=3, lastArrive=-99;
  const api = { list:V, prayer, slotsM, slotsF, PRAY, count:()=>V.length, get stageCap(){return cap();} };

  function cap(){
    const h = ctx.hour; if(h>21.5||h<4.5) return 0;
    const st = ctx.state?.masjid?.stage|0; return st<=0 ? 2 : Math.min(40, 4+st*5);
  }
  function spawn(opts={}){
    if(V.length>=people.max-2) return null;
    const spec = randomSpec(opts.kind);
    const p = new Person(spec);
    const x = R(-2.5,2.5);
    p.pos.set(opts.x ?? x, 0, opts.z ?? 41); p.pos.y = ctx.groundHeight(p.pos.x,p.pos.z);
    p.yaw = Math.PI; p.onStep = footstep;
    p.accX=p.accZ=0;
    const v = { id:nextId++, person:p, state:'arrive', path:[], vel:new THREE.Vector3(), timer:0, slot:null, mode:Math.random()<.2||spec.stoop?'sit':'pray', emoteT:R(2,5), delay:0, donated:false, waved:-99, faceYaw:Math.PI, speedMax:R(2.4,3.0)*spec.speed, waitT:0, spot:null };
    const g = pick(GATHER); v.path=[ {x:g.x+R(-1,1),z:g.z+R(-1,1)} ]; v.gx=g;
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
    // separation
    let sx=0,sz=0;
    for(const o of V){ if(o===v) continue; const ox=p.pos.x-o.person.pos.x, oz=p.pos.z-o.person.pos.z, dd=ox*ox+oz*oz; if(dd<.5&&dd>1e-4){ const k=(.7-Math.sqrt(dd))*2.2/Math.sqrt(dd); sx+=ox*k; sz+=oz*k; } }
    const dirx = d>1e-3?dx/d:0, dirz = d>1e-3?dz/d:0;
    const tvx = dirx*want+sx, tvz = dirz*want+sz;
    const ax = (tvx-v.vel.x)*Math.min(1,dt*7), az=(tvz-v.vel.z)*Math.min(1,dt*7);
    p.accX = ax/dt*.0+0; p.accZ = 0;
    v.vel.x+=ax; v.vel.z+=az;
    p.pos.x+=v.vel.x*dt; p.pos.z+=v.vel.z*dt;
    const sp = Math.hypot(v.vel.x,v.vel.z); p.speed = sp;
    if(sp>.15){ const ty=Math.atan2(v.vel.x,v.vel.z); p.yaw = angLerp(p.yaw,ty,Math.min(1,dt*9)); }
    p.cycle += Math.min(22,sp*4.2)*dt;
    return d;
  }
  function stand(v,dt,yaw){ const p=v.person; p.speed*= .0; v.vel.multiplyScalar(Math.max(0,1-dt*10)); p.yaw = angLerp(p.yaw,yaw,Math.min(1,dt*8)); }
  function angLerp(a,b,k){ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*k; }
  function emote(v,type){ ctx.modules.characters?.emote?.(v.person,type); }
  function groundSnap(p,dt){ const gy=ctx.groundHeight(p.pos.x,p.pos.z); p.pos.y += (gy-p.pos.y)*Math.min(1,dt*14); }
  function collide(p){
    const cs=ctx.colliders; for(let i=0;i<cs.length;i++){ const c=cs[i]; const dx=p.pos.x-c.x, dz=p.pos.z-c.z, rr=(c.r||0)+.3; const d2=dx*dx+dz*dz; if(d2<rr*rr&&d2>1e-6){ const d=Math.sqrt(d2); p.pos.x=c.x+dx/d*rr; p.pos.z=c.z+dz/d*rr; } }
  }

  function startPrayer(){
    const waiting = V.filter(v=>v.state==='gather'&&v.mode==='pray');
    if(!waiting.length) return false;
    for(const s of [...slotsM,...slotsF]) s.used=null;
    let any=false;
    for(const v of waiting){
      const arr = v.person.spec.gender==='f'?slotsF:slotsM;
      const sl = arr.find(s=>!s.used); if(!sl) continue;
      sl.used=v; v.slot=sl; v.state='toSlot'; v.delay = sl.row*.1+R(0,.35); any=true; v.path=[{x:AISLE+R(-.3,.3),z:Math.max(11,v.person.pos.z-2)},{x:AISLE,z:9.6},{x:AISLE,z:sl.z},{x:sl.x,z:sl.z}];
    }
    if(!any) return false;
    prayer.phase='assemble'; prayer.t=0; refreshMats(); return true;
  }

  function leave(v){
    if(v.state==='leave') return;
    v.state='leave'; if(v.slot){ v.slot.used=null; v.slot=null; refreshMats(); }
    donate(v);
    v.path=[{x:R(-3,3),z:26},{x:R(-2.5,2.5),z:44}];
  }
  function donate(v){
    if(v.donated) return; v.donated=true;
    const st = ctx.state?.masjid?.stage|0; const amt = Math.round((3+Math.random()*8)*(1+st*.35));
    if(ctx.state){ ctx.state.coins = (ctx.state.coins||0)+amt; }
    ctx.emit('coins:change',{coins:ctx.state?.coins, total:ctx.state?.coins, delta:amt, source:'visitor', id:v.id});
    ctx.emit('visitor:donate',{id:v.id,amount:amt,pos:v.person.pos.clone()});
    const pos = v.person.pos.clone(); pos.y+=1.4;
    ctx.modules.fx?.burst?.('coin',pos); ctx.modules.audio?.play?.('coin',{pos,vol:.5});
    emote(v,'coin');
  }

  function update(dt,t){
    // spawn
    const c = cap();
    spawnT -= dt;
    if(spawnT<=0){
      const active = V.filter(v=>v.state!=='leave').length;
      if(active<c) spawn();
      const st = ctx.state?.masjid?.stage|0; spawnT = R(4,9)/(1+st*.2);
    }
    // night / over-capacity: send home
    if(c===0) for(const v of V) if(v.state==='gather'||v.state==='sitIdle') leave(v);
    // prayer scheduler
    if(prayer.phase==='idle'){
      prayer.restT += dt;
      const g = V.filter(v=>v.state==='gather'&&v.mode==='pray');
      const oldest = g.reduce((m,v)=>Math.max(m,v.waitT),0);
      if((ctx.state?.masjid?.stage|0)>=1 && g.length>=Math.min(3,Math.max(1,c)) && ctx.time-lastArrive>3.5 && (oldest>7 || g.length>=6)) startPrayer();
    } else if(prayer.phase==='assemble'){
      prayer.t+=dt;
      const all = V.filter(v=>v.state==='toSlot');
      if(prayer.t>2.5 && (all.length===0 || prayer.t>9)){ prayer.phase='run'; prayer.t=0; for(const v of all){ v.state='pray'; } }
      else if(all.length===0 && prayer.t>1){ prayer.phase='idle'; }
    } else if(prayer.phase==='run'){
      prayer.t += prayer.hold?0:dt;
      if(prayer.t>FULL_T+1){
        prayer.phase='idle'; prayer.restT=0;
        const pr = V.filter(v=>v.state==='pray');
        for(const v of pr){ v.state='post'; v.timer=R(6,12); v.person.pose('chat'); const nb = pr.find(o=>o!==v&&Math.abs(o.slot.z-v.slot.z)<.1&&Math.abs(o.slot.x-v.slot.x)<1.5); v.faceYaw = nb?Math.atan2(nb.person.pos.x-v.person.pos.x,nb.person.pos.z-v.person.pos.z):Math.PI*.8; }
        ctx.emit('prayer:done',{count:pr.length});
      }
    }
    // per visitor
    for(let i=V.length-1;i>=0;i--){
      const v=V[i], p=v.person;
      p.accX=p.accZ=0;
      v.emoteT-=dt;
      switch(v.state){
        case 'arrive': case 'gather': {
          v.waitT += v.state==='gather'?dt:0;
          if(v.path.length){ const w=v.path[0]; const d=moveTo(v,w.x,w.z,dt); if(d<.35){ v.path.shift(); if(!v.path.length){ v.state = v.mode==='sit'?'toSit':'gather'; v.waitT=0; } } p.pose('loco'); }
          else { stand(v,dt,Math.atan2(-p.pos.x*.2,-4)+Math.PI*0+ (v.gx?0:0) + Math.sin(v.id)*1.2 + Math.PI); p.pose(v.id%2?'chat':'loco'); }
          if(v.state==='gather'&&v.waitT>((ctx.state?.masjid?.stage|0)>=1?80:14)){ leave(v); }
          break; }
        case 'static': { stand(v,dt,v.faceYaw); break; }
        case 'toSit': { const d=moveTo(v,v.spot.x,v.spot.z,dt,.9); p.pose('loco'); if(d<.2){ v.state='sitIdle'; v.timer=R(25,45); } break; }
        case 'sitIdle': { stand(v,dt,Math.atan2(-v.spot.x,4)+.6); p.pose('chatSit'); v.timer-=dt; if(v.timer<=0) leave(v); break; }
        case 'toSlot': {
          const sl=v.slot; p.pose('loco');
          if(v.path.length>1){ const w=v.path[0]; if(moveTo(v,w.x,w.z,dt,1.15)<.4) v.path.shift(); }
          else { const d=moveTo(v,sl.x,sl.z,dt,1.15); if(d<.15) v.state='pray'; }
          break; }
        case 'pray': {
          const sl=v.slot; const dx=sl.x-p.pos.x, dz=sl.z-p.pos.z;
          if(dx*dx+dz*dz>.03){ moveTo(v,sl.x,sl.z,dt,1); p.pose('loco'); break; }
          stand(v,dt,Math.PI); p.pos.x+=(sl.x-p.pos.x)*Math.min(1,dt*6); p.pos.z+=(sl.z-p.pos.z)*Math.min(1,dt*6);
          p.pose(prayer.phase==='run'? (prayer.hold||poseAt(prayer.t-v.delay)) : 'qiyam');
          break; }
        case 'post': {
          stand(v,dt,v.faceYaw); p.pose('chat'); v.timer-=dt;
          if(v.emoteT<=0){ emote(v,pick(['smile','heart','note','smile','star'])); v.emoteT=R(2.5,5); }
          if(v.timer<=0){ leave(v); }
          break; }
        case 'leave': {
          if(v.path.length){ const w=v.path[0]; const d=moveTo(v,w.x,w.z,dt,1.05); p.pose('loco'); if(d<.5) v.path.shift(); }
          else { p.speed=0; V.splice(i,1); continue; }
          break; }
      }
      // chat emotes while gathering / sitting
      if((v.state==='gather'||v.state==='sitIdle')&&v.emoteT<=0){ emote(v,pick(['smile','note','!','?','heart'])); v.emoteT=R(3,7); }
      // greet player
      const pl = ctx.modules.characters?.player;
      if(pl && (v.state==='arrive'||v.state==='leave'||v.state==='gather'||v.state==='sitIdle') && t-v.waved>25){
        const dx=pl.pos.x-p.pos.x, dz=pl.pos.z-p.pos.z; if(dx*dx+dz*dz<12){ v.waved=t; p.play('wave',1.5); emote(v,'heart'); }
      }
      if(v.state!=='pray'||p.speed>.2){ collide(p); }
      groundSnap(p,dt);
      p.step(dt);
    }
  }
  // instant crowd for screenshots
  function crowd(n){
    for(let i=0;i<n;i++){
      const v = spawn({x:R(-3,3),z:R(14,22)}); if(!v) break;
      v.state='gather'; v.path=[]; v.mode='pray'; v.waitT=10;
    }
    lastArrive=-99; spawnT=999;
    const ph = q.get('phase');
    if(startPrayer()){
      for(const v of V){ if(v.slot){ v.person.pos.set(v.slot.x,0,v.slot.z); v.person.yaw=Math.PI; v.state='pray'; } }
      prayer.phase='run'; prayer.t = ph?0:R(2,14);
      if(ph) prayer.hold=ph;
    }
    // overflow: stand and chat in clumps
    for(const v of V) if(v.state==='gather'){ const a=R(0,6.28), r=R(5,10); v.person.pos.set(Math.cos(a)*r+PRAY.x, 0, 15+Math.abs(Math.sin(a))*r*.6); v.person.pose('chat'); }
  }
  function lineup(){
    const kinds=['man','boy','elder','woman','girl','elderW'];
    kinds.forEach((k,i)=>{ const v=spawn({kind:k,x:(i-2.5)*1.5,z:10}); v.state='static'; v.faceYaw=0; v.person.yaw=0; v.person.pos.y=ctx.groundHeight(v.person.pos.x,10); const pn=q.get('pose'); if(pn) v.person.pose(pn); else v.person.pose(i%2?'chat':'loco'); });
    spawnT=999;
  }
  api.lineup = lineup; api.update = update; api.spawn = spawn; api.crowd = crowd;
  return api;
}

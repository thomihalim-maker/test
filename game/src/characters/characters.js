// CHARACTERS module: player marbot, input, NPC jamaah visitors.
import * as THREE from 'three';
import { Person, People, makePalette } from './rig.js';
import { OUTLINE_U } from './toon.js';
import { ACTS } from './anims.js';
import { createInput } from './input.js';
import { makeProps, updateProps } from './props.js';
import { createBubbles } from './bubbles.js';
import { createVisitors } from './visitors.js';

const DEFAULT_LOOK = { skin:0xf0c08c, koko:0xf8f3e6, sarong:0x1f7a63, peci:0x18181c, shoe:0x6b4a2e, trim:0xd4a84a, hair:0x5a3820 };
// tools: id -> {icon, anim, animal tool name for animals.interact}
const TOOLS = {
  feed:{ icon:'🌾', anim:'feed', item:'hay' }, water:{ icon:'💧', anim:'water', item:'water' },
  wash:{ icon:'🧼', anim:'wash', item:'soap' }, treat:{ icon:'🥕', anim:'treat', item:'treat' }, pet:{ icon:'🤍', anim:'pet', item:'pet' }
};
const ITEM2TOOL = { hay:'feed', water:'water', soap:'wash', treat:'treat', pet:'pet' };
const L10N = {
  id:{ feed:'Beri Makan', water:'Beri Minum', wash:'Mandikan', treat:'Beri Camilan', pet:'Elus', fillFeed:'Isi Jerami', fillWater:'Isi Air', fillWash:'Isi Bak Cuci', bedug:'Tabuh Bedug', greet:'Sapa', act:'Aksi' },
  en:{ feed:'Feed', water:'Give Water', wash:'Wash', treat:'Give Treat', pet:'Pet', fillFeed:'Fill Hay', fillWater:'Fill Water', fillWash:'Fill Wash Tub', bedug:'Beat Bedug', greet:'Greet', act:'Action' }
};
const PEN = { x:26, z:6, r:11 };
const angLerp=(a,b,k)=>{ const d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*k; };
const hexOf = (v)=> typeof v==='string'? new THREE.Color(v).getHex() : v;

export async function init(ctx){
  const q = new URLSearchParams(location.search);
  const scene = ctx.scene, camera = ctx.camera;
  ctx.interactables ??= [];
  const tr = (k)=>{ const lang = (ctx.state?.lang ?? ctx.state?.settings?.lang)==='en'?'en':'id'; return L10N[lang][k]||L10N.id[k]||k; };

  // ---------- dev scaffolding when world module is absent ----------
  let dev = null;
  if(!ctx.modules.world) dev = makeDevEnv(ctx);

  // ---------- player ----------
  const look = ()=>({ ...DEFAULT_LOOK, ...(ctx.state.look||{}) });
  const specFromLook = (l)=>({ kind:'player', size:1, headScale:1, limb:1, eyeScale:1.04, torso:'koko', bottom:'sarong', hat:'peci', gender:'m', eyes:0, head:0, acc:[], sash:false, brow:14, cheek:18, headShape:[1,1,1], bodyW:1.04,
    colors:{ skin:hexOf(l.skin), top:hexOf(l.koko), bot:hexOf(l.sarong), head:hexOf(l.peci), shoe:hexOf(l.shoe), acc:hexOf(l.trim), hair:hexOf(l.hair) } });
  let lookKey = JSON.stringify(look());
  const player = new Person(specFromLook(look()));
  player.wantHands = true; player.size = 1.18;
  const at = (q.get('at')||'6,10').split(',').map(Number);
  player.pos.set(at[0], 0, at[1]); player.pos.y = ctx.groundHeight(at[0],at[1]);
  player.yaw = at[2]!==undefined&&!isNaN(at[2]) ? at[2]*Math.PI/180 : Math.atan2(-at[0],-at[1]);

  const LOW = ctx.quality==='low' || q.get('quality')==='low';
  const people = new People(scene, {max:2, D:1, cast:true, name:'player'});
  const crowdHi = new People(scene, {max:LOW?6:24, D:.75, cast:!LOW, name:'crowdHi'});
  const NEAR = LOW ? 8 : 15;
  const crowdLo = new People(scene, {max:64, D:.5, cast:false, name:'crowdLo'});
  const props = makeProps(scene);
  const bubbles = createBubbles(scene, 14);
  const input = createInput(ctx); ctx.input = input;
  const visitors = createVisitors(ctx, {max:60});
  const pcol = { r:.4 };

  player.onStep = (p,side)=>{
    const a = ctx.modules.audio, fx = ctx.modules.fx;
    if(p.speed>1.2) a?.play?.('step',{pos:p.pos.clone(), vol:.18+Math.min(.25,p.speed*.04)});
    if(p.speed>3.2) fx?.burst?.('dust', new THREE.Vector3(p.pos.x,p.pos.y+.06,p.pos.z));
  };

  const vel = new THREE.Vector3(), pvel = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
  let act = null;               // {name,t,dur,hit,fired,target,kind,data,yaw}
  let ctxInfo = null, ctxTimer = 0, idleT = 0, accXs = 0, accZs = 0, explicitCarry = null;

  // ---------- API ----------
  function emote(person, type, dur){ bubbles.emote(person||player, type, dur); }
  function startAct(name, o={}){
    const def = ACTS[name]||{dur:1.5,hit:.3};
    act = { name, t:0, dur:o.dur||def.dur, hit:o.hit??def.hit, fired:false, target:o.target||null, kind:o.kind||name, data:o.data||null, emit:o.emit!==false, cancel:o.cancel!==false };
    player.play(name, act.dur);
    if(name==='jump'){ player.jumpPhase=0; act.jt=0; act.air=false; player.jvy=0; }
    if(act.target){ tmp.set(act.target.x-player.pos.x,0,act.target.z-player.pos.z); if(tmp.lengthSq()>.01) act.yaw = Math.atan2(tmp.x,tmp.z); }
    return act;
  }
  function doInteract(c){
    if(!c) return false;
    const anim = c.anim || TOOLS[c.kind]?.anim || (c.kind==='bedug'?'bedug':c.kind==='build'?'hammer':'wave');
    ctx.modules.audio?.play?.('ui_tap',{vol:.5});
    ctx.emit('interact:start',{kind:c.kind});
    startAct(anim,{ target:c.pos, kind:c.kind, data:c });
    return true;
  }
  function fireInteract(a){
    const c = a.data||{}; const payload = { kind:a.kind, animal:c.animal||null, target:c.target||c.animal||null, station:c.station||null, stationType:c.stationType||null, pos:player.pos.clone(), tool:a.kind };
    if(a.kind==='greet'){ if(c.visitor){ c.visitor.person.play('wave',1.4); bubbles.emote(c.visitor.person,'heart'); ctx.emit('visitor:greet',{id:c.visitor.id}); } }
    const A = ctx.modules.animals; let handled = false;
    try{
      if(c.animal && A?.interact) handled = !!A.interact(c.animal, TOOLS[a.kind]?.item||'pet');
      else if(c.stationType && A?.fillStation) handled = !!A.fillStation(c.stationType);
    }catch(e){ console.warn('characters: interact failed',e); }
    payload.handled = handled;
    ctx.emit('interact', payload);
  }
  // hotbar tool (UI owns selection in ctx.state.tool; Q cycles it)
  const curTool = ()=>ITEM2TOOL[ctx.state?.tool] || null;
  ctx.on('tool:select',(id)=>{ if(ctx.state) ctx.state.tool = id; ctxTimer = 0; });
  input.cycleTool = ()=>{
    const items=['hay','water','soap','treat']; const i=items.indexOf(ctx.state?.tool);
    const id = items[(i+1)%items.length]; if(ctx.state) ctx.state.tool = id;
    ctx.emit('tool:select', id); ctx.emit('inventory:change', ctx.state?.inventory);
    ctx.modules.audio?.play?.('ui_tap',{vol:.4}); ctxTimer = 0;
  };

  const statOf = (a,k)=>{ const s=a.stats||{}; return k==='feed'?s.hunger:k==='water'?s.thirst:k==='wash'?s.clean:1; };
  const needOf = (a)=>{ // lowest stat (0..1, higher = better)
    const c=['feed','water','wash'].map(k=>[k,statOf(a,k)]).filter(x=>typeof x[1]==='number');
    if(!c.length) return 'pet'; c.sort((x,y)=>x[1]-y[1]); return c[0][1]<.6?c[0][0]:'pet';
  };

  function resolveContext(){
    const pos = player.pos; let best=null, bd=1e9;
    const consider=(c,d)=>{ if(d<bd){ bd=d; best=c; } };
    for(const it of ctx.interactables){ const p=it.pos||it; const d=Math.hypot(p.x-pos.x,p.z-pos.z); if(d<(it.r||2.5) && (!it.enabled||it.enabled())) consider({kind:it.kind||'interact',label:it.label||tr('act'),icon:it.icon||'✋',pos:p,anim:it.anim,data:it}, d-(it.priority||0)); }
    const M = ctx.modules.masjid;
    if(M?.bedugPos && (M.stage|0)>=6){ const d=Math.hypot(M.bedugPos.x-pos.x,M.bedugPos.z-pos.z); if(d<3.4) consider({kind:'bedug',label:tr('bedug'),icon:'🥁',pos:M.bedugPos},d-1); }
    const A = ctx.modules.animals;
    try{
      const ns = A?.nearestStation?.(pos, 2.4);
      if(ns){ const ty=ns.type, k = ty==='water'?'fillWater':ty==='wash'?'fillWash':'fillFeed';
        consider({kind:ty==='water'?'water':ty==='wash'?'wash':'feed', label:tr(k), icon:ty==='water'?'💧':ty==='wash'?'🧼':'🌾', pos:ns.st.pos, station:ns.st, stationType:ty, anim:ty==='water'?'water':ty==='wash'?'wash':'feed'}, ns.d-.4); }
    }catch(e){}
    let animal=null;
    try{ animal = A?.nearest?.(pos, 3.4) || null; }catch(e){}
    if(animal){
      const ap = animal.pos || animal.mesh?.position || animal.group?.position;
      if(ap){
        let k = curTool() || needOf(animal);
        if(k!=='treat' && k!=='pet' && (statOf(animal,k)??0)>.92) k='pet';
        const d=Math.hypot(ap.x-pos.x,ap.z-pos.z); consider({kind:k,label:tr(k),icon:TOOLS[k].icon,pos:ap,animal,target:animal},d-1.5); }
    }
    if(!best || best.kind==='greet'){
      for(const v of visitors.list){ if(v.state==='pray') continue; const d=Math.hypot(v.person.pos.x-pos.x,v.person.pos.z-pos.z); if(d<2.4) consider({kind:'greet',label:tr('greet'),icon:'👋',pos:v.person.pos,visitor:v,anim:'wave'},d+.8); }
    }
    return best;
  }
  function refreshContext(){
    const c = resolveContext();
    ctxInfo = c; input.setContext(c?{icon:c.icon,label:c.label}:null, tr('act'));
  }

  // ---------- events ----------
  ctx.on('build:placed',()=>{ if(player.pos.lengthSq()<22*22){ if(!act) startAct('hammer',{dur:2.6,emit:false}); } });
  ctx.on('build:complete',()=>{ startAct('jump',{dur:1.3,emit:false}); emote(player,'star',2.6); });
  ctx.on('animal:happy',(d)=>{ const p=d?.pos||d?.animal?.pos; if(p && Math.hypot(p.x-player.pos.x,p.z-player.pos.z)<7){ emote(player,'heart',1.8); if(!act&&Math.random()<.4) startAct('jump',{dur:1.2,emit:false}); } });
  ctx.on('animal:fed',()=>{ emote(player,'smile',1.4); });
  ctx.on('player:anim',(d)=>{ if(d?.name) startAct(d.name,{dur:d.dur,emit:false}); });
  ctx.on('player:look',(d)=>{ Object.assign(ctx.state.look ??= {}, d); });
  ctx.on('player:carry',(c)=>{ explicitCarry = c||null; });
  ctx.on('visitor:donate',(d)=>{ if(d?.pos && Math.hypot(d.pos.x-player.pos.x,d.pos.z-player.pos.z)<8) emote(player,'coin',1.2); });

  // ---------- test params ----------
  const forceAnim = q.get('anim'); let forceCarry = q.get('carry');
  if(forceCarry) explicitCarry = forceCarry;
  if(forceAnim){ player.anim = forceAnim; player.actEnd=false; if(forceAnim==='jump') startAct('jump'); }
  const camParam = q.has('cam') ? q.get('cam').split(',').map(Number) : null;
  const crowdN = q.has('crowd') ? parseInt(q.get('crowd'))||0 : 0;
  if(crowdN>0) visitors.crowd(crowdN);
  if(q.has('lineup')) visitors.lineup();

  const LOOPACT = q.get('act');
  const AUTO = q.has('autowalk') ? q.get('autowalk').split(',').map(Number) : null;
  const rig = ()=>ctx.cameraRig;
  const renderer = ctx.renderer, hiList = [], loList = [], playerList = [player];
  const uiBlocked = ()=>{ try{ return !!ctx.modules.ui?.overlayOpen?.(); }catch(e){ return false; } };
  input.isBlocked = uiBlocked;
  const _grd = new THREE.Vector3();

  // ---------- update ----------
  function update(dt,t){
    // look hot-reload
    if((t*2|0)!==((t-dt)*2|0)){ const k=JSON.stringify(look()); if(k!==lookKey){ lookKey=k; const sp=specFromLook(look()); player.spec.colors=sp.colors; player.pal=makePalette(sp.colors); } }
    input.update();
    const blocked = uiBlocked();
    if(blocked){ input.move.set(0,0); input.consume(); }
    // carried prop follows the selected hotbar tool while working in/near the pen
    { const tl = ctx.state?.tool, inv = ctx.state?.inventory||{}; const nearPen = Math.hypot(player.pos.x-PEN.x, player.pos.z-PEN.z) < PEN.r;
      player.carry = explicitCarry || (nearPen && (inv[tl]??1)>0 ? (tl==='hay'?'hay':tl==='water'?'bucket':null) : null); }
    if(LOOPACT && !act) startAct(LOOPACT,{emit:false,cancel:false});
    if(AUTO){ input.move.set(AUTO[0],AUTO[1]); if(AUTO[2]) input.run=true; }
    const mv = input.move;
    camera.getWorldDirection(fwd); fwd.y=0; if(fwd.lengthSq()<1e-4) fwd.set(0,0,-1); fwd.normalize();
    rgt.set(-fwd.z,0,fwd.x).negate().negate(); // right = (-fz, fx)
    const mag = mv.length();
    tmp.set(0,0,0).addScaledVector(rgt,mv.x).addScaledVector(fwd,-mv.y);
    const maxSp = (input.run?6.2:4.2);
    let canMove = !act || (act.cancel && act.t>.35 && mag>.55 && act.name!=='jump');
    if(act && canMove && act.name!=='jump'){ act=null; player.anim='loco'; player.actEnd=false; }
    const lockMove = !!act || (forceAnim && !mag);
    const target = lockMove ? tmp2.set(0,0,0) : tmp2.copy(tmp).multiplyScalar(maxSp*Math.min(1,mag*1.05));
    const rate = target.lengthSq()>vel.lengthSq() ? 9 : 13;
    pvel.copy(vel);
    vel.lerp(target, 1-Math.exp(-rate*dt));
    if(vel.lengthSq()<1e-4 && target.lengthSq()===0) vel.set(0,0,0);
    // move + collide (2 substeps)
    for(let s=0;s<2;s++){
      player.pos.x += vel.x*dt/2; player.pos.z += vel.z*dt/2;
      const cs=ctx.colliders;
      for(let i=0;i<cs.length;i++){ const c=cs[i]; const dx=player.pos.x-c.x, dz=player.pos.z-c.z, rr=(c.r||c.radius||0)+pcol.r; const d2=dx*dx+dz*dz; if(d2<rr*rr&&d2>1e-8){ const d=Math.sqrt(d2); const nx=dx/d, nz=dz/d; player.pos.x=c.x+nx*rr; player.pos.z=c.z+nz*rr; const vn=vel.x*nx+vel.z*nz; if(vn<0){ vel.x-=vn*nx; vel.z-=vn*nz; } } }
    }
    const lim = ctx.worldRadius||66; const rr=Math.hypot(player.pos.x,player.pos.z); if(rr>lim){ player.pos.x*=lim/rr; player.pos.z*=lim/rr; }
    // ground follow
    const gy = ctx.groundHeight(player.pos.x,player.pos.z);
    player.pos.y += (gy-player.pos.y)*Math.min(1,dt*18);
    const sp = Math.hypot(vel.x,vel.z); player.speed = sp;
    // facing
    if(act?.yaw!==undefined && act.name!=='jump'){ player.yaw = angLerp(player.yaw,act.yaw,Math.min(1,dt*12)); }
    else if(sp>.25){ const ty=Math.atan2(vel.x,vel.z); player.yaw = angLerp(player.yaw,ty,Math.min(1,dt*(11+sp))); }
    player.cycle += Math.min(24, sp*4.1)*dt;
    // local acceleration for secondary motion
    const ax=(vel.x-pvel.x)/Math.max(dt,1e-3), az=(vel.z-pvel.z)/Math.max(dt,1e-3);
    const sy=Math.sin(player.yaw), cy=Math.cos(player.yaw);
    const lx=ax*cy-az*sy, lz=ax*sy+az*cy;
    accXs += (lx-accXs)*Math.min(1,dt*8); accZs += (lz-accZs)*Math.min(1,dt*8);
    player.accX = Math.max(-12,Math.min(12,accXs)); player.accZ = Math.max(-12,Math.min(12,accZs));

    // actions
    const pressed = input.consume();
    if(pressed && !act){
      if(!ctxInfo) refreshContext();
      if(ctxInfo) doInteract(ctxInfo); else startAct('wave',{emit:false,cancel:true}), emote(player,'smile',1.2);
    }
    if(act){
      act.t += dt; player.t = act.t;
      if(act.name==='jump'){
        const J=player;
        if(!act.air && act.t>.16 && act.jt===0){ J.jvy=4.6; act.air=true; act.jt=1; J.jumpPhase=1; ctx.modules.audio?.play?.('pop',{vol:.5}); }
        if(act.air){ J.jvy-=15*dt; J.jy+=J.jvy*dt; J.jumpPhase = J.jvy>0?1:2;
          if(J.jy<=0){ J.jy=0; J.jvy=0; act.air=false; act.jt=2; act.landT=0; J.jumpPhase=3; ctx.modules.fx?.burst?.('dust',new THREE.Vector3(J.pos.x,J.pos.y+.05,J.pos.z)); ctx.modules.audio?.play?.('step',{vol:.4}); } }
        if(act.jt===2){ act.landT+=dt; if(act.landT>.28){ act=null; J.anim='loco'; J.actEnd=false; J.jumpPhase=-1; } }
      } else if(!act.fired && act.t>=act.hit){
        act.fired=true; if(act.emit) fireInteract(act);
      }
      if(act && act.t>=act.dur && act.name!=='jump'){ act=null; }
    }
    if(player.hit){ player.hit=0; ctx.modules.audio?.play?.('build',{pos:player.pos.clone(),vol:.5}); ctx.modules.fx?.burst?.('dust',new THREE.Vector3(player.pos.x+Math.sin(player.yaw)*.6,player.pos.y+.1,player.pos.z+Math.cos(player.yaw)*.6)); }
    if(!act && forceAnim==null && player.anim!=='loco' && !player.actEnd) player.anim='loco';
    if(act==null && player.jy>0){ player.jy=Math.max(0,player.jy-dt*6); }

    // idle fidget
    if(!act && sp<.1 && !forceAnim){ idleT+=dt; if(idleT>14){ idleT=0; player.play(Math.random()<.5?'wave':'cheer',1.4); } } else idleT=0;

    player.step(dt);

    // context hint
    ctxTimer-=dt; if(ctxTimer<=0){ ctxTimer=.15; if(!act) refreshContext(); }

    // camera follow target
    const R = rig();
    if(R){
      if(!R.target) R.target = new THREE.Vector3().copy(player.pos);
      _grd.set(player.pos.x, player.pos.y+1.0+player.jy*.5, player.pos.z);
      R.target.lerp(_grd, 1-Math.exp(-dt*9));
    }
    visitors.update(dt,t);

    // render people (visitors split into near hi-detail / far low-detail LOD)
    hiList.length = 0; loList.length = 0;
    const cx = camera.position.x, cz = camera.position.z;
    for(const v of visitors.list){ const p=v.person; const d=Math.hypot(p.pos.x-cx,p.pos.z-cz);
      const near = (p._hi ? d<NEAR+2 : d<NEAR) && hiList.length<crowdHi.max; p._hi = near; (near?hiList:loList).push(p); }
    people.render(playerList); crowdHi.render(hiList); crowdLo.render(loList);
    renderer.getDrawingBufferSize(OUTLINE_U.uRes.value); OUTLINE_U.uDpr.value = renderer.getPixelRatio();
    updateProps(props, player, t, dt);
    bubbles.update(dt);
    dev?.update(dt);
    if(camParam && camParam.length>=6){ camera.position.set(camParam[0],camParam[1],camParam[2]); camera.lookAt(camParam[3],camParam[4],camParam[5]); }
  }

  const api = { update, player, people, crowdHi, crowdLo, visitors, input, emote, startAct, doInteract, props,
    setCarry(c){ explicitCarry = c||null; }, setLook(l){ Object.assign(ctx.state.look ??= {}, l); }, play(name,o){ return startAct(name,o); },
    get pos(){ return player.pos; }, get position(){ return player.pos; }, get yaw(){ return player.yaw; }, get nearestContext(){ return ctxInfo; } };
  return api;
}

// ---------- standalone test environment (only if world module is missing) ----------
function makeDevEnv(ctx){
  const { scene, camera } = ctx; const q = new URLSearchParams(location.search);
  scene.background = new THREE.Color(0xbfe3f5); scene.fog = new THREE.Fog(0xd8eefa, 70, 200);
  const g = new THREE.Mesh(new THREE.CircleGeometry(90,48).rotateX(-Math.PI/2), new THREE.MeshToonMaterial({color:0x78b85d})); g.receiveShadow=true; scene.add(g);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(5,60).rotateX(-Math.PI/2), new THREE.MeshToonMaterial({color:0xcdb48a})); road.position.set(0,.02,34); road.receiveShadow=true; scene.add(road);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(14,40).rotateX(-Math.PI/2), new THREE.MeshToonMaterial({color:0xe0d3b8})); plaza.position.y=.015; plaza.receiveShadow=true; scene.add(plaza);
  const mos = new THREE.Mesh(new THREE.BoxGeometry(11,7,9), new THREE.MeshToonMaterial({color:0xf1e8d4})); mos.position.set(0,3.5,-3); mos.castShadow=mos.receiveShadow=true; scene.add(mos);
  const hemi = new THREE.HemisphereLight(0xcfe8ff,0x8a7a50,1.5); scene.add(hemi); ctx.hemi ??= hemi;
  const sun = new THREE.DirectionalLight(0xfff0cc,2.6); sun.position.set(18,30,22); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:90}); sun.shadow.bias=-.0004; sun.shadow.normalBias=.03; scene.add(sun); ctx.sun ??= sun;
  ctx.cameraRig ??= { target:new THREE.Vector3(6,1,10), yaw:Math.PI*.15, pitch:.5, dist:9 };
  let drag=null; ctx.canvas.addEventListener('pointerdown',e=>drag={x:e.clientX,y:e.clientY});
  addEventListener('pointerup',()=>drag=null);
  addEventListener('pointermove',e=>{ if(!drag) return; const R=ctx.cameraRig; R.yaw-= (e.clientX-drag.x)*.006; R.pitch=Math.max(.15,Math.min(1.3,R.pitch+(e.clientY-drag.y)*.004)); drag={x:e.clientX,y:e.clientY}; });
  ctx.canvas.addEventListener('wheel',e=>{ const R=ctx.cameraRig; R.dist=Math.max(4,Math.min(24,R.dist+e.deltaY*.01)); },{passive:true});
  const cp=new THREE.Vector3();
  return { update(){ const R=ctx.cameraRig; cp.set(Math.sin(R.yaw)*Math.cos(R.pitch),Math.sin(R.pitch),Math.cos(R.yaw)*Math.cos(R.pitch)).multiplyScalar(R.dist).add(R.target); camera.position.lerp(cp,.2); camera.lookAt(R.target); } };
}

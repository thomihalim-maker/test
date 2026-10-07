// CHARACTERS module: player marbot, input, NPC jamaah visitors.
// Also owns: auto-walk (walkTo), camera focus/assist (focusCamera/releaseCamera, interior assist), leading the prayer
// as imam (leadPrayer), the masjid-care tools (sapu/pel + pengki) and their contextual actions.
import * as THREE from 'three';
import { Person, People, makePalette } from './rig.js';
import { OUTLINE_U } from './toon.js';
import { ACTS } from './anims.js';
import { createInput } from './input.js';
import { makeProps, updateProps } from './props.js';
import { createBubbles } from './bubbles.js';
import { createVisitors, poseAt } from './visitors.js';

const DEFAULT_LOOK = { skin:0xf0c08c, koko:0xf8f3e6, sarong:0x1f7a63, peci:0x18181c, shoe:0x6b4a2e, trim:0xd4a84a, hair:0x5a3820 };
// tools: id -> {icon, anim, animal tool name for animals.interact}
const TOOLS = {
  feed:{ icon:'🌾', anim:'feed', item:'hay' }, water:{ icon:'💧', anim:'water', item:'water' },
  wash:{ icon:'🧼', anim:'wash', item:'soap' }, treat:{ icon:'🥕', anim:'treat', item:'treat' }, pet:{ icon:'🤍', anim:'pet', item:'pet' }
};
// hotbar item -> animal action. The cleaning tools (sapu/pel) are NOT animal tools: curTool() returns null for them so
// the animal's most urgent need is offered instead (otherwise kids would get stuck petting only).
const ITEM2TOOL = { hay:'feed', water:'water', soap:'wash', treat:'treat', pet:'pet' };
const CLEAN_TOOL = { sapu:'sweep', pel:'mop' };
const KIND_ITEM = { feed:'hay', water:'water', wash:'soap', treat:'treat' };
const TOOL_CYCLE = ['sapu','pel','hay','water','soap','treat'];
const L10N = {
  id:{ feed:'Beri Makan', water:'Beri Minum', wash:'Mandikan', treat:'Beri Camilan', pet:'Elus', fillFeed:'Isi Jerami', fillWater:'Isi Air', fillWash:'Isi Bak Cuci', bedug:'Tabuh Bedug', greet:'Sapa', act:'Aksi', sweep:'Sapu', mop:'Pel', gather:'Angkut Daun' },
  en:{ feed:'Feed', water:'Give Water', wash:'Wash', treat:'Give Treat', pet:'Pet', fillFeed:'Fill Hay', fillWater:'Fill Water', fillWash:'Fill Wash Tub', bedug:'Beat Bedug', greet:'Greet', act:'Action', sweep:'Sweep', mop:'Mop', gather:'Bag Leaves' }
};
const PEN = { x:26, z:6, r:11 };
const MASJID_C = { x:0, z:-1 }, CARRY_R = 17;
const angLerp=(a,b,k)=>{ const d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*k; };
const hexOf = (v)=> typeof v==='string'? new THREE.Color(v).getHex() : v;
const fin = (v)=>typeof v==='number' && Number.isFinite(v);

export async function init(ctx){
  const q = new URLSearchParams(location.search);
  const scene = ctx.scene, camera = ctx.camera;
  ctx.interactables ??= [];
  ctx.routes ??= [];
  const lang = ()=>((ctx.state?.lang ?? ctx.state?.settings?.lang)==='en'?'en':'id');
  const tr = (k)=>L10N[lang()][k]||L10N.id[k]||k;
  const L = (v)=>Array.isArray(v) ? (lang()==='en' ? v[1] : v[0]) : v;
  const safe = (f, d=null)=>{ try{ const r=f(); return r===undefined?d:r; }catch(e){ return d; } };
  const Mj = ()=>ctx.modules.masjid;
  const stageNow = ()=>{ const m = Mj(); return typeof m?.stage==='number' ? m.stage|0 : (ctx.state?.masjid?.stage|0); };

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

  let indoors = null;             // 'hall' | 'porch' | null (masjid.isInside), refreshed every frame
  player.onStep = (p,side)=>{
    const a = ctx.modules.audio, fx = ctx.modules.fx;
    if(p.speed>1.2) a?.play?.('step',{pos:p.pos.clone(), vol:.18+Math.min(.25,p.speed*.04)});
    if(p.speed>3.2 && !indoors) fx?.burst?.('dust', new THREE.Vector3(p.pos.x,p.pos.y+.06,p.pos.z));   // clean floors: no dust puffs inside
  };

  const vel = new THREE.Vector3(), pvel = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
  let act = null;               // {name,t,dur,hit,fired,target,kind,data,yaw,cancelAfter,hold}
  let ctxInfo = null, ctxTimer = 0, idleT = 0, accXs = 0, accZs = 0, explicitCarry = null;
  let auto = null, walkId = 0;  // auto-walk
  let leading = null;           // leading the prayer as imam
  const uiBlocked = ()=>{ try{ return !!ctx.modules.ui?.overlayOpen?.(); }catch(e){ return false; } };

  // ---------- acts ----------
  function emote(person, type, dur){ bubbles.emote(person||player, type, dur); }
  function endAct(cancelled){
    if(!act) return;
    const a = act; act = null;
    if(a.name!=='jump'){ player.anim='loco'; player.actEnd=false; }
    ctx.emit('act:end',{ name:a.name, kind:a.kind, cancelled:!!cancelled, t:a.t });
    return a;
  }
  function startAct(name, o={}){
    const def = ACTS[name]||{dur:1.5,hit:.3};
    if(act) endAct(true);
    act = { name, t:0, dur:o.dur||def.dur, hit:o.hit??def.hit, fired:false, target:o.target||null, kind:o.kind||name, data:o.data||null, emit:o.emit!==false, cancel:o.cancel!==false,
      cancelAfter: fin(o.cancelAfter) ? o.cancelAfter : .35, hold:!!o.hold };
    player.play(name, act.dur);
    if(name==='jump'){ player.jumpPhase=0; act.jt=0; act.air=false; player.jvy=0; }
    if(fin(o.yaw)) act.yaw = o.yaw;
    else if(act.target){ tmp.set(act.target.x-player.pos.x,0,act.target.z-player.pos.z); if(tmp.lengthSq()>.01) act.yaw = Math.atan2(tmp.x,tmp.z); }
    return act;
  }
  function selectTool(id){
    if(!id || !ctx.state || ctx.state.tool===id) return;
    ctx.state.tool = id; ctxTimer = 0;
    ctx.emit('tool:select', id);
  }
  function doInteract(c, o={}){
    if(!c || leading) return false;
    const it = c.data || {};
    const anim = c.anim || TOOLS[c.kind]?.anim || (c.kind==='bedug'?'bedug':c.kind==='build'?'hammer':'wave');
    // the hotbar follows what the marbot actually does: cleaning picks the right tool, animal care puts the item back
    const tl = ctx.state?.tool;
    if((c.kind==='sweep'||c.kind==='mop') && it.tool && it.tool!==tl) selectTool(it.tool);
    else if((tl==='sapu'||tl==='pel') && (c.animal || c.stationType) && KIND_ITEM[c.kind]) selectTool(KIND_ITEM[c.kind]);
    if(!o.repeat) ctx.modules.audio?.play?.('ui_tap',{vol:.5});
    ctx.emit('interact:start',{kind:c.kind});
    const yaw = c.kind==='sweep'||c.kind==='mop'||c.kind==='gather' ? undefined : (fin(c.yaw) ? c.yaw : fin(it.yaw) ? it.yaw : undefined);
    startAct(anim,{ target:c.pos, kind:c.kind, data:c, yaw, dur:fin(it.dur)?it.dur:undefined, cancelAfter:fin(it.cancelAfter)?it.cancelAfter:undefined, hold:!!c.hold });
    return true;
  }
  function fireInteract(a){
    const c = a.data||{}; const payload = { kind:a.kind, animal:c.animal||null, target:c.target||c.animal||null, station:c.station||null, stationType:c.stationType||null, pos:player.pos.clone(), tool:a.kind,
      yaw:player.yaw, data:c.data??null, item:ctx.state?.tool ?? null };
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
  ctx.on('tool:select',(id)=>{ if(ctx.state && typeof id==='string') ctx.state.tool = id; ctxTimer = 0; });
  input.cycleTool = ()=>{
    const i=TOOL_CYCLE.indexOf(ctx.state?.tool);
    const id = TOOL_CYCLE[(i+1)%TOOL_CYCLE.length]; if(ctx.state) ctx.state.tool = id;
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
    for(const it of ctx.interactables){ const p=it.pos||it; if(!p || !fin(p.x)) continue; const d=Math.hypot(p.x-pos.x,p.z-pos.z);
      if(d<(it.r||2.5) && (!it.enabled||safe(()=>it.enabled(),false))) consider({kind:it.kind||'interact',label:L(it.label)||tr('act'),icon:it.icon||'✋',pos:p,anim:it.anim,data:it,hold:!!it.hold}, d-(it.priority||0)); }
    // masjid care: dirt spots and leaf piles (care decides what is nearest; a matching hotbar tool wins ties)
    const care = ctx.modules.care;
    if(care?.nearest){
      const n = safe(()=>care.nearest(pos, 2.2));
      if(n && n.pos && fin(n.d)){
        const match = n.tool && n.tool===ctx.state?.tool;
        consider({kind:n.kind, label:L(n.label)||tr(n.kind), icon:n.icon||(n.kind==='mop'?'mop':n.kind==='gather'?'leafpile':'broom'), pos:n.pos, anim:n.anim||(n.kind==='gather'?'scoop':n.kind), data:n, hold:true}, n.d-(match?1.0:.2));
      }
    }
    const M = Mj();
    if(M?.bedugPos && stageNow()>=6){ const d=Math.hypot(M.bedugPos.x-pos.x,M.bedugPos.z-pos.z); if(d<3.4) consider({kind:'bedug',label:tr('bedug'),icon:'🥁',pos:M.bedugPos},d-1); }
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
      for(const v of visitors.list){ if(v.state==='pray'||v.role) continue; const d=Math.hypot(v.person.pos.x-pos.x,v.person.pos.z-pos.z); if(d<2.4) consider({kind:'greet',label:tr('greet'),icon:'👋',pos:v.person.pos,visitor:v,anim:'wave'},d+.8); }
    }
    return best;
  }
  function refreshContext(){
    const c = (leading || auto) ? null : resolveContext();
    ctxInfo = c; input.setContext(c?{icon:c.icon,label:c.label}:null, tr('act'));
  }

  // ---------- auto-walk ----------
  function endWalk(state){
    const a = auto; if(!a) return; auto = null;
    ctx.emit('player:walk',{ state, target:{ x:a.tgt.x, z:a.tgt.z } });
    try{ (state==='arrive' ? a.onArrive : a.onCancel)?.(state); }catch(e){ console.warn('characters: walk callback',e); }
  }
  function routeFor(from, to){
    for(const r of (ctx.routes||[])){ try{ const p = r({x:from.x,z:from.z},{x:to.x,z:to.z}); if(Array.isArray(p) && p.length) return p.filter(w=>w&&fin(w.x)&&fin(w.z)).map(w=>({x:w.x,z:w.z})); }catch(e){} }
    return null;
  }
  function walkTo(target, o={}){
    if(!target || !fin(target.x) || !fin(target.z)) return null;
    if(auto) endWalk('cancel');
    const tgt = o.follow ? target : { x:target.x, z:target.z };
    const path = Array.isArray(o.path) ? o.path.filter(w=>w&&fin(w.x)&&fin(w.z)).map(w=>({x:w.x,z:w.z})) : (routeFor(player.pos, tgt) || []);
    const id = ++walkId;
    auto = { id, tgt, path, r: fin(o.r) ? Math.max(.08,o.r) : .6, run:!!o.run, follow:!!o.follow, onArrive:o.onArrive, onCancel:o.onCancel, lock:!!o.lock,
      blockedAtStart: uiBlocked(), best:1e9, noProg:0, sideT:0, side:1, t:0, wpKey:-1 };
    if(act && act.cancel && !o.lock) endAct(true);
    ctxTimer = 0; refreshContext();
    ctx.emit('player:walk',{ state:'start', target:{ x:tgt.x, z:tgt.z } });
    return { id, cancel(){ if(auto && auto.id===id){ endWalk('cancel'); return true; } return false; }, get active(){ return !!auto && auto.id===id; } };
  }
  const _wd = new THREE.Vector3();
  // returns a world-space unit direction (in _wd) and a magnitude 0..1 for the movement code, or 0 when idle
  function steerAuto(dt, userMag, blocked){
    const a = auto; if(!a) return 0;
    a.t += dt;
    if(!a.lock){
      if(userMag > .3){ endWalk('cancel'); return 0; }
      if(blocked && !a.blockedAtStart){ endWalk('cancel'); return 0; }
    }
    if(!blocked) a.blockedAtStart = false;
    if(blocked && !a.lock) return 0;              // wait until the panel that was open at start closes
    if(act) return 0;
    const px = player.pos.x, pz = player.pos.z;
    // waypoints: pass them generously, skip ones we have already gone past
    while(a.path.length){ const w=a.path[0]; const d=Math.hypot(w.x-px,w.z-pz); if(d<.5 || (a.path.length>1 && Math.hypot(a.path[1].x-px,a.path[1].z-pz)<Math.hypot(a.path[1].x-w.x,a.path[1].z-w.z)*.6 && d<1.6)){ a.path.shift(); a.best=1e9; a.noProg=0; } else break; }
    const w = a.path.length ? a.path[0] : a.tgt;
    const dx = w.x-px, dz = w.z-pz, d = Math.hypot(dx,dz);
    const dFinal = Math.hypot(a.tgt.x-px, a.tgt.z-pz);
    if(!a.path.length && dFinal < a.r){ endWalk('arrive'); return 0; }
    // stuck detection: no progress for 1.5 s -> side-step; after 5 s -> give up (a locked walk snaps instead)
    if(d < a.best-.05){ a.best = d; a.noProg = 0; } else a.noProg += dt;
    if(a.noProg > 1.5 && a.sideT<=0 && a.noProg < 5){ a.sideT = .75; a.side = -a.side; a.best = d; }
    if(a.noProg > 5){
      if(a.lock){ player.pos.x = a.tgt.x; player.pos.z = a.tgt.z; vel.set(0,0,0); endWalk('arrive'); }
      else endWalk('cancel');
      return 0;
    }
    let ux = d>1e-4 ? dx/d : 0, uz = d>1e-4 ? dz/d : 0;
    if(a.sideT>0){ a.sideT -= dt; const sx=-uz*a.side, sz=ux*a.side; ux = ux*.35+sx*.94; uz = uz*.35+sz*.94; const n=Math.hypot(ux,uz)||1; ux/=n; uz/=n; }
    _wd.set(ux,0,uz);
    let remain = dFinal; if(a.path.length){ remain = d; for(let i=0;i<a.path.length;i++){ const p0=a.path[i], p1=a.path[i+1]||a.tgt; remain += Math.hypot(p1.x-p0.x,p1.z-p0.z); } }
    a.runNow = (a.run || remain > 14) && !indoors;          // no running inside the masjid
    return a.path.length ? 1 : Math.min(1, .3 + dFinal*.7);
  }

  // ---------- camera: focus stack + interior assist ----------
  const rig = ()=>ctx.cameraRig;
  const focus = []; let focusSaved = null, focusId = 0;
  function applyFocus(e){ const R = rig(); if(!R) return; if(fin(e.dist)) R.dist = e.dist; if(fin(e.pitch)) R.pitch = e.pitch; if(fin(e.yaw)) R.yaw = e.yaw; }
  function focusCamera(target, o={}){
    const R = rig(); if(!R || !target || !fin(target.x) || !fin(target.z)) return null;
    const e = { id:++focusId, tgt: o.follow ? target : { x:target.x, y:target.y, z:target.z }, follow:!!o.follow, dist:o.dist, pitch:o.pitch, yaw:o.yaw,
      until: fin(o.dur) && o.dur>0 ? ctx.time+o.dur : 0, hold:!!o.hold };
    if(!focus.length) focusSaved = { dist:R.dist, pitch:R.pitch, yaw:R.yaw };
    focus.push(e); applyFocus(e);
    return e.id;
  }
  function releaseCamera(id){
    if(!focus.length) return false;
    const i = id==null ? focus.length-1 : focus.findIndex(f=>f.id===id); if(i<0) return false;
    const top = i===focus.length-1; focus.splice(i,1);
    const R = rig();
    if(!focus.length){ if(R && focusSaved){ R.dist = focusSaved.dist; R.pitch = focusSaved.pitch; R.yaw = focusSaved.yaw; } focusSaved = null; }
    else if(top) applyFocus(focus[focus.length-1]);
    return true;
  }
  const assist = { on:false, uP:0, uD:0, lastP:0, lastD:0 };
  const HALL_X = 5.0, HALL_Z0 = -7.5, HALL_Z1 = 2.0, HYST = .4;
  function updateAssist(dt){
    const R = rig(); if(!R || R.locked) return;
    if(focus.length){ if(assist.on){ assist.lastP = R.pitch; assist.lastD = R.dist; } return; }
    const px = player.pos.x, pz = player.pos.z, st = stageNow();
    let inHall = false;
    if(st>=2){
      if(assist.on) inHall = Math.abs(px)<HALL_X+HYST && pz>HALL_Z0-HYST && pz<HALL_Z1+HYST;
      else inHall = safe(()=>Mj()?.isInside?.(px,pz))==='hall' || (!Mj()?.isInside && Math.abs(px)<HALL_X && pz>HALL_Z0 && pz<HALL_Z1);
    }
    if(inHall && !assist.on){ assist.on = true; assist.uP = R.pitch; assist.uD = R.dist; assist.lastP = R.pitch; assist.lastD = R.dist; }
    if(!assist.on) return;
    // whatever changed since our last write was the player dragging/zooming: keep it as their own preference
    assist.uP += R.pitch - assist.lastP; assist.uD += R.dist - assist.lastD;
    if(!inHall){ R.pitch = assist.uP; R.dist = assist.uD; assist.on = false; return; }
    const k = 1-Math.exp(-dt*3.5), wantP = Math.max(assist.uP, .9), wantD = Math.min(14, Math.max(9, assist.uD));
    R.pitch += (wantP-R.pitch)*k; R.dist += (wantD-R.dist)*k;
    assist.lastP = R.pitch; assist.lastD = R.dist;
  }

  // ---------- leading the prayer (imam) ----------
  function imamSpot(layout){
    const s = layout?.imam || safe(()=>Mj()?.spot?.('imam')) || { x:0, z:-2, yaw:Math.PI };
    return { x:s.x, z:s.z, yaw: fin(s.yaw) ? s.yaw : Math.PI };
  }
  function leadPrayer(o={}){
    if(leading) return false;
    const layout = safe(()=>Mj()?.prayerLayout?.(), null);
    const spot = imamSpot(layout);
    const ok = safe(()=>visitors.startPrayer({ imam:'player', prayerId:o.prayerId||null, layout, khutbah:!!o.khutbah, jumat:!!o.jumat }), false);
    if(!ok) return false;
    if(act) endAct(false);
    visitors.prayer.imamReady = false;
    leading = { phase:'walk', spot, prayerId:o.prayerId||null, t:0 };
    const arrive = ()=>{ if(!leading) return; leading.phase='stand'; visitors.prayer.imamReady = true; };
    walkTo(spot, { r:.14, lock:true, onArrive:arrive, onCancel:()=>{ if(!leading) return; player.pos.x=spot.x; player.pos.z=spot.z; arrive(); } });
    ctxTimer = 0; refreshContext();
    return true;
  }
  function finishLead(){
    if(!leading) return;
    leading = null;
    if(auto?.lock) endWalk('cancel');
    player.anim='loco'; player.actEnd=false;
    startAct('wave',{ dur:1.8, emit:false, yaw:player.yaw+Math.PI });   // turn round to the jamaah and greet them
    emote(player,'heart',2);
  }
  function updateLeading(dt){
    if(!leading) return;
    leading.t += dt;
    const pr = visitors.prayer, s = leading.spot;
    if(leading.phase==='walk'){ if(leading.t>25){ player.pos.x=s.x; player.pos.z=s.z; if(auto) endWalk('arrive'); } return; }
    // in place: hold the spot, face the qibla and follow the prayer timeline with no delay
    player.pos.x += (s.x-player.pos.x)*Math.min(1,dt*8); player.pos.z += (s.z-player.pos.z)*Math.min(1,dt*8);
    vel.set(0,0,0); player.speed = 0;
    player.yaw = angLerp(player.yaw, s.yaw, Math.min(1,dt*10));
    const ph = pr.phase;
    const pose = ph==='run' ? (pr.hold||poseAt(pr.t, pr.tlId)) : ph==='khutbah' ? 'duduk' : ph==='rise' ? 'qiyam' : 'itidal';
    player.pose(pose, true);
    if(ph==='idle' && leading.t>2) finishLead();            // aborted without a prayer:done
  }

  // ---------- events ----------
  ctx.on('build:placed',()=>{ if(!leading && player.pos.lengthSq()<22*22){ if(!act) startAct('hammer',{dur:2.6,emit:false}); } });
  ctx.on('build:complete',()=>{ if(leading) return; startAct('jump',{dur:1.3,emit:false}); emote(player,'star',2.6); });
  ctx.on('animal:happy',(d)=>{ const p=d?.pos||d?.animal?.pos; if(p && Math.hypot(p.x-player.pos.x,p.z-player.pos.z)<7){ emote(player,'heart',1.8); if(!act&&!leading&&!auto&&Math.random()<.4) startAct('jump',{dur:1.2,emit:false}); } });
  ctx.on('animal:fed',()=>{ emote(player,'smile',1.4); });
  ctx.on('player:anim',(d)=>{ if(d?.name && !leading) startAct(d.name,{dur:d.dur,emit:false}); });
  ctx.on('player:look',(d)=>{ Object.assign(ctx.state.look ??= {}, d); });
  ctx.on('player:carry',(c)=>{ explicitCarry = c||null; });
  ctx.on('visitor:donate',(d)=>{ if(d?.pos && Math.hypot(d.pos.x-player.pos.x,d.pos.z-player.pos.z)<8) emote(player,'coin',1.2); });
  ctx.on('prayer:done',(d)=>{ if(leading && (!d || d.imam==='player')) finishLead(); });
  ctx.on('visitor:salam',(d)=>{ if(!leading && !act && !auto) startAct('greet',{ dur:1.6, emit:false, target:d?.pos||null }); });

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
  const renderer = ctx.renderer, hiList = [], loList = [], playerList = [player];
  input.isBlocked = uiBlocked;
  const _grd = new THREE.Vector3();

  // ---------- update ----------
  function update(dt,t){
    // look hot-reload
    if((t*2|0)!==((t-dt)*2|0)){ const k=JSON.stringify(look()); if(k!==lookKey){ lookKey=k; const sp=specFromLook(look()); player.spec.colors=sp.colors; player.pal=makePalette(sp.colors); } }
    input.update();
    const blocked = uiBlocked();
    if(blocked){ input.move.set(0,0); input.consume(); }
    indoors = null; if(stageNow()>=1){ try{ indoors = Mj()?.isInside?.(player.pos.x, player.pos.z) || null; }catch(e){} }
    if(LOOPACT && !act && !leading) startAct(LOOPACT,{emit:false,cancel:false});
    if(AUTO){ input.move.set(AUTO[0],AUTO[1]); if(AUTO[2]) input.run=true; }
    const mv = input.move;
    camera.getWorldDirection(fwd); fwd.y=0; if(fwd.lengthSq()<1e-4) fwd.set(0,0,-1); fwd.normalize();
    rgt.set(-fwd.z,0,fwd.x).negate().negate(); // right = (-fz, fx)
    const userMag = leading ? 0 : mv.length();
    // auto-walk steers like a joystick (same movement, collision, facing, steps and dust)
    const autoMag = steerAuto(dt, userMag, blocked);
    let mag = userMag, runNow = input.run;
    if(auto && autoMag>0){ tmp.copy(_wd); mag = autoMag; runNow = !!auto.runNow; }
    else if(leading){ tmp.set(0,0,0); mag = 0; }
    else tmp.set(0,0,0).addScaledVector(rgt,mv.x).addScaledVector(fwd,-mv.y);
    if(auto && autoMag===0 && !leading) tmp.set(0,0,0);
    const maxSp = (runNow?6.2:4.2);
    const canMove = !act || (!leading && act.cancel && act.t>act.cancelAfter && userMag>.55 && act.name!=='jump');
    if(act && canMove && act.name!=='jump') endAct(true);
    const lockMove = !!act || (forceAnim && !mag) || (leading && leading.phase!=='walk');
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
    updateLeading(dt);
    // ground follow
    const gy = ctx.groundHeight(player.pos.x,player.pos.z);
    player.pos.y += (gy-player.pos.y)*Math.min(1,dt*18);
    const sp = Math.hypot(vel.x,vel.z); player.speed = sp;
    // facing
    if(act?.yaw!==undefined && act.name!=='jump'){ player.yaw = angLerp(player.yaw,act.yaw,Math.min(1,dt*12)); }
    else if(sp>.25 && !(leading && leading.phase!=='walk')){ const ty=Math.atan2(vel.x,vel.z); player.yaw = angLerp(player.yaw,ty,Math.min(1,dt*(11+sp))); }
    player.cycle += Math.min(24, sp*4.1)*dt;
    // local acceleration for secondary motion
    const ax=(vel.x-pvel.x)/Math.max(dt,1e-3), az=(vel.z-pvel.z)/Math.max(dt,1e-3);
    const sy=Math.sin(player.yaw), cy=Math.cos(player.yaw);
    const lx=ax*cy-az*sy, lz=ax*sy+az*cy;
    accXs += (lx-accXs)*Math.min(1,dt*8); accZs += (lz-accZs)*Math.min(1,dt*8);
    player.accX = Math.max(-12,Math.min(12,accXs)); player.accZ = Math.max(-12,Math.min(12,accZs));

    // carried prop: cleaning tool near the masjid (sapu/pel), hay/bucket in the pen
    { const tl = ctx.state?.tool, inv = ctx.state?.inventory||{};
      let carry = explicitCarry;
      if(!carry && !act && !leading && player.anim==='loco'){
        if((tl==='sapu'||tl==='pel') && Math.hypot(player.pos.x-MASJID_C.x, player.pos.z-MASJID_C.z) < CARRY_R) carry = tl==='sapu'?'broom':'mop';
        else if(Math.hypot(player.pos.x-PEN.x, player.pos.z-PEN.z) < PEN.r && (inv[tl]??1)>0) carry = tl==='hay'?'hay':tl==='water'?'bucket':null;
      }
      player.carry = carry; }

    // actions (taps are ignored while leading the prayer: it is calm and not interactive)
    const pressed = input.consume();
    if(pressed && !act && !leading){
      if(auto && !auto.lock) endWalk('cancel');
      refreshContext();
      if(ctxInfo) doInteract(ctxInfo); else startAct('wave',{emit:false,cancel:true}), emote(player,'smile',1.2);
    }
    if(act){
      act.t += dt; player.t = act.t;
      if(act.name==='jump'){
        const J=player;
        if(!act.air && act.t>.16 && act.jt===0){ J.jvy=4.6; act.air=true; act.jt=1; J.jumpPhase=1; ctx.modules.audio?.play?.('pop',{vol:.5}); }
        if(act.air){ J.jvy-=15*dt; J.jy+=J.jvy*dt; J.jumpPhase = J.jvy>0?1:2;
          if(J.jy<=0){ J.jy=0; J.jvy=0; act.air=false; act.jt=2; act.landT=0; J.jumpPhase=3; ctx.modules.fx?.burst?.('dust',new THREE.Vector3(J.pos.x,J.pos.y+.05,J.pos.z)); ctx.modules.audio?.play?.('step',{vol:.4}); } }
        if(act.jt===2){ act.landT+=dt; if(act.landT>.28){ endAct(false); J.anim='loco'; J.actEnd=false; J.jumpPhase=-1; } }
      } else if(!act.fired && act.t>=act.hit){
        act.fired=true; const a = act; if(a.emit) fireInteract(a);
      }
      if(act && act.t>=act.dur && act.name!=='jump'){
        const done = endAct(false);
        // hold-to-repeat: keep sweeping / mopping / scooping while the action button stays down
        if(done?.hold && input.actionPressed && !blocked && !leading){
          refreshContext();
          if(ctxInfo && ctxInfo.hold && ctxInfo.kind===done.kind) doInteract(ctxInfo,{repeat:true});
        }
      }
    }
    if(player.hit){ player.hit=0; ctx.modules.audio?.play?.('build',{pos:player.pos.clone(),vol:.5}); ctx.modules.fx?.burst?.('dust',new THREE.Vector3(player.pos.x+Math.sin(player.yaw)*.6,player.pos.y+.1,player.pos.z+Math.cos(player.yaw)*.6)); }
    if(forceAnim && ACTS[forceAnim] && forceAnim!=='jump' && !act){ const D=ACTS[forceAnim].dur; player.actDur=D; if(player.t>D*.88) player.t=D*.12; }
    if(!act && !leading && forceAnim==null && player.anim!=='loco' && !player.actEnd) player.anim='loco';
    if(act==null && player.jy>0){ player.jy=Math.max(0,player.jy-dt*6); }

    // idle fidget (not while holding a cleaning tool, auto-walking or leading)
    if(!act && !leading && !auto && sp<.1 && !forceAnim && player.carry!=='broom' && player.carry!=='mop'){ idleT+=dt; if(idleT>14){ idleT=0; player.play(Math.random()<.5?'wave':'cheer',1.4); } } else idleT=0;

    player.step(dt);

    // context hint
    ctxTimer-=dt; if(ctxTimer<=0){ ctxTimer=.15; if(!act) refreshContext(); }

    // camera follow target (or a focus target), then the interior assist
    const R = rig();
    if(R){
      if(!R.target) R.target = new THREE.Vector3().copy(player.pos);
      let top = focus.length ? focus[focus.length-1] : null;
      if(top && ((top.until && ctx.time>top.until) || (!top.hold && userMag>.3))){ releaseCamera(top.id); top = focus.length ? focus[focus.length-1] : null; }
      if(top){
        const tg = top.tgt, ty = fin(tg.y) ? tg.y + (top.follow ? .6 : 0) : ctx.groundHeight(tg.x,tg.z)+1;
        _grd.set(tg.x, ty, tg.z); R.target.lerp(_grd, 1-Math.exp(-dt*5));
      } else {
        _grd.set(player.pos.x, player.pos.y+1.0+player.jy*.5, player.pos.z);
        R.target.lerp(_grd, 1-Math.exp(-dt*9));
      }
      updateAssist(dt);
    }
    visitors.update(dt,t);

    // render people (visitors split into near hi-detail / far low-detail LOD)
    hiList.length = 0; loList.length = 0;
    const cx = camera.position.x, cz = camera.position.z;
    for(const v of visitors.list){ const p=v.person; const d=Math.hypot(p.pos.x-cx,p.pos.z-cz);
      const near = (p._hi ? d<NEAR+2 : d<NEAR) && hiList.length<crowdHi.max; p._hi = near; (near?hiList:loList).push(p); }
    people.render(playerList); crowdHi.render(hiList); crowdLo.render(loList);
    renderer.getDrawingBufferSize(OUTLINE_U.uRes.value); OUTLINE_U.uDpr.value = renderer.getPixelRatio();
    updateProps(props, player, t, dt, player.pos.y);
    bubbles.update(dt);
    dev?.update(dt);
    if(camParam && camParam.length>=6){ camera.position.set(camParam[0],camParam[1],camParam[2]); camera.lookAt(camParam[3],camParam[4],camParam[5]); }
  }

  const api = { update, player, people, crowdHi, crowdLo, visitors, input, emote, startAct, doInteract, props,
    setCarry(c){ explicitCarry = c||null; }, setLook(l){ Object.assign(ctx.state.look ??= {}, l); }, play(name,o){ return startAct(name,o); },
    walkTo, focusCamera, releaseCamera, leadPrayer, refreshContext,
    cancelWalk(){ if(auto && !auto.lock){ endWalk('cancel'); return true; } return false; },
    get busy(){ return !!auto || !!leading || (!!act && act.dur>2.5 && act.name!=='jump'); },
    get leading(){ return !!leading; },
    get walking(){ return !!auto; },
    get act(){ return act ? { name:act.name, kind:act.kind, t:act.t, dur:act.dur } : null; },
    get cameraFocus(){ return focus.length ? focus[focus.length-1].id : null; },
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

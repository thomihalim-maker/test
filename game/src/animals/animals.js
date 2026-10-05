// Sacrificial animals: goats (kambing), sheep (domba), cows (sapi). Needs AI, procedural animation, pen, interaction API.
import * as THREE from 'three';
import { buildAnimal, pickName } from './model.js';
import { buildPen, PEN } from './pen.js';
import { mulberry32, particleAtlas } from './textures.js';

const V3=THREE.Vector3;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const angDiff=(a,b)=>{ let d=(b-a)%(Math.PI*2); if(d>Math.PI)d-=Math.PI*2; if(d<-Math.PI)d+=Math.PI*2; return d; };

const KIND = {
  goat :{ speed:1.05, rad:.36, reach:.6,  gain:.0085, w0:[16,24], wMax:42,  price:60,  bleat:'bleat_goat' },
  sheep:{ speed:.9,   rad:.40, reach:.6,  gain:.0105, w0:[20,30], wMax:55,  price:75,  bleat:'bleat_sheep' },
  cow  :{ speed:.75,  rad:.66, reach:1.0, gain:.1,    w0:[190,260], wMax:520, price:220, bleat:'moo' },
};
const MAX_ANIMALS=16;
const TXT={ id:{hay:'Hay habis!',water:'Air habis!',soap:'Sabun habis!',treat:'Camilan habis!',happy:'senang!',full:'sudah kenyang',fullw:'sudah puas minum',clean:'sudah bersih',full2:'Hewan sudah penuh',troughHay:'Palung diisi jerami',troughWater:'Bak air diisi'},
            en:{hay:'Out of hay!',water:'Out of water!',soap:'Out of soap!',treat:'Out of treats!',happy:'is happy!',full:'is full',fullw:'is not thirsty',clean:'is already clean',full2:'Pen is full',troughHay:'Trough filled with hay',troughWater:'Water trough filled'} };

export async function init(ctx){
  const scene=ctx.scene, S=ctx.state; S.inventory??={hay:10,water:10,soap:3,treat:5};
  const q=new URLSearchParams(location.search);
  const camParam=q.get('cam')?.split(',').map(Number);
  const noWorld=!ctx.modules.world;
  if(noWorld && !scene.userData.__animalTestEnv){ // standalone fallback so the pen is viewable without a world module
    scene.userData.__animalTestEnv=true;
    const g=new THREE.Mesh(new THREE.PlaneGeometry(300,300).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#86b865',roughness:1})); g.receiveShadow=true; g.position.y=-.01; scene.add(g);
    const hemi=new THREE.HemisphereLight('#cfe9ff','#9a8a58',1.2); scene.add(hemi);
    const sun=new THREE.DirectionalLight('#fff0cf',3.0); sun.position.set(PEN.cx+14,24,PEN.cz+10); sun.target.position.set(PEN.cx,0,PEN.cz); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048); const sc=sun.shadow.camera; sc.left=-22;sc.right=22;sc.top=22;sc.bottom=-22;sc.near=1;sc.far=80; sun.shadow.bias=-.0005; scene.add(sun,sun.target);
    scene.background=new THREE.Color('#aed9f5');
  }
  const gh=(x,z)=>{ try{ const h=ctx.groundHeight(x,z); return Number.isFinite(h)?h:0; }catch(e){ return 0; } };
  const pen=buildPen(ctx); const B=pen.bounds; const st=pen.stations;
  const T=(k)=>TXT[S.lang==='en'?'en':'id'][k];
  const toast=(m)=>ctx.emit('toast',m);
  const audio=(n,o)=>ctx.modules.audio?.play?.(n,o);

  // ---------------- particles (hearts, bubbles, zzz, sparkles) ----------------
  const NP=160; const pPos=new Float32Array(NP*3), pSize=new Float32Array(NP), pType=new Float32Array(NP), pAlpha=new Float32Array(NP);
  const pVel=new Float32Array(NP*3), pLife=new Float32Array(NP), pMax=new Float32Array(NP), pS0=new Float32Array(NP); let pHead=0;
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pPos,3).setUsage(THREE.DynamicDrawUsage));
  pg.setAttribute('aSize',new THREE.BufferAttribute(pSize,1)); pg.setAttribute('aType',new THREE.BufferAttribute(pType,1)); pg.setAttribute('aAlpha',new THREE.BufferAttribute(pAlpha,1));
  const pm=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, uniforms:{ uTex:{value:particleAtlas()}, uScale:{value:600} },
    vertexShader:`attribute float aSize; attribute float aType; attribute float aAlpha; varying float vT; varying float vA; uniform float uScale;
      void main(){ vT=aType; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=min(aSize*uScale/max(-mv.z,0.1),120.0); }`,
    fragmentShader:`uniform sampler2D uTex; varying float vT; varying float vA; void main(){ vec2 uv=vec2((vT+gl_PointCoord.x)/4.0,1.0-gl_PointCoord.y); vec4 c=texture2D(uTex,uv); c.a*=vA; if(c.a<0.02) discard; gl_FragColor=c; }` });
  const pts=new THREE.Points(pg,pm); pts.frustumCulled=false; pts.renderOrder=20; scene.add(pts);
  function spawnP(type,x,y,z,vx,vy,vz,life,size){ const i=pHead; pHead=(pHead+1)%NP; pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z; pVel[i*3]=vx;pVel[i*3+1]=vy;pVel[i*3+2]=vz; pLife[i]=pMax[i]=life; pS0[i]=size; pType[i]=type; pSize[i]=size; pAlpha[i]=1; }
  function updateParticles(dt,t){
    for(let i=0;i<NP;i++){ if(pLife[i]<=0){ pAlpha[i]=0; continue; } pLife[i]-=dt; const u=1-pLife[i]/pMax[i];
      pPos[i*3]+=pVel[i*3]*dt+Math.sin(t*4+i)*.003; pPos[i*3+1]+=pVel[i*3+1]*dt; pPos[i*3+2]+=pVel[i*3+2]*dt;
      pAlpha[i]=pLife[i]<=0?0:Math.min(1,u*8)*Math.min(1,(1-u)*3.5); const sc=pType[i]===1?1+u*.4:(pType[i]===3?.6+u*.9:.5+Math.min(1,u*5)*.5); pSize[i]=pS0[i]*sc; }
    pg.attributes.position.needsUpdate=pg.attributes.aSize.needsUpdate=pg.attributes.aAlpha.needsUpdate=pg.attributes.aType.needsUpdate=true;
    const h=ctx.renderer.domElement.height||720; pm.uniforms.uScale.value=h/(2*Math.tan(ctx.camera.fov*Math.PI/360));
  }
  const hearts=(p,n=4)=>{ for(let i=0;i<n;i++) spawnP(0,p.x+(Math.random()-.5)*.5,p.y,p.z+(Math.random()-.5)*.5,(Math.random()-.5)*.3,.7+Math.random()*.4,(Math.random()-.5)*.3,1.5+Math.random()*.5,.42+Math.random()*.12); };
  const bubbles=(p,n=10)=>{ for(let i=0;i<n;i++) spawnP(1,p.x+(Math.random()-.5)*.9,p.y-.2+Math.random()*.5,p.z+(Math.random()-.5)*.9,(Math.random()-.5)*.3,.5+Math.random()*.7,(Math.random()-.5)*.3,1.4+Math.random(),.2+Math.random()*.25); };
  const sparkles=(p,n=6)=>{ for(let i=0;i<n;i++) spawnP(2,p.x+(Math.random()-.5)*.6,p.y+Math.random()*.4,p.z+(Math.random()-.5)*.6,(Math.random()-.5)*.8,.4+Math.random()*.6,(Math.random()-.5)*.8,.8+Math.random()*.4,.28); };

  // ---------------- mood bubble sprites ----------------
  function makeBubble(){
    const c=document.createElement('canvas'); c.width=256; c.height=200; const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=2;
    const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:true}); const sp=new THREE.Sprite(mat); sp.center.set(.5,0); sp.scale.set(1.0,.78,1); sp.renderOrder=30;
    return {c,g:c.getContext('2d'),tex,mat,sp,key:''};
  }
  function icon(g,type,cx,cy,t){
    g.save(); g.translate(cx,cy); g.lineCap='round'; g.lineJoin='round';
    if(type==='hunger'){ // hay bundle
      g.strokeStyle='#d99a2b'; g.lineWidth=5; for(let i=-3;i<=3;i++){ g.beginPath(); g.moveTo(i*5,22); g.lineTo(i*8,-20+Math.abs(i)*3); g.stroke(); }
      g.strokeStyle='#8a5a2c'; g.lineWidth=6; g.beginPath(); g.moveTo(-18,8); g.lineTo(18,8); g.stroke(); g.strokeStyle='#f3c75b'; g.lineWidth=3; for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(i*6,18); g.lineTo(i*9,-16+Math.abs(i)*3); g.stroke(); }
    } else if(type==='thirst'){
      g.fillStyle='#4bb6ee'; g.strokeStyle='#2b7fbf'; g.lineWidth=5; g.beginPath(); g.moveTo(0,-26); g.bezierCurveTo(22,2,24,24,0,26); g.bezierCurveTo(-24,24,-22,2,0,-26); g.fill(); g.stroke();
      g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-8,6,4,8,.4,0,7); g.fill();
    } else if(type==='dirty'){
      g.fillStyle='#bfe9ff'; g.strokeStyle='#5aa9d6'; g.lineWidth=4; for(const [x,y,r] of [[-9,6,13],[10,-6,10],[8,15,7]]){ g.beginPath(); g.arc(x,y,r,0,7); g.fill(); g.stroke(); g.fillStyle='#fff'; g.beginPath(); g.arc(x-r*.35,y-r*.35,r*.2,0,7); g.fill(); g.fillStyle='#bfe9ff'; }
    } else if(type==='heart'||type==='love'){
      g.fillStyle='#ff5d8f'; g.strokeStyle='#d62d6a'; g.lineWidth=5; g.beginPath(); g.moveTo(0,24); g.bezierCurveTo(-42,-4,-20,-34,0,-12); g.bezierCurveTo(20,-34,42,-4,0,24); g.fill(); g.stroke();
      g.fillStyle='rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(-12,-10,6,3.5,-.7,0,7); g.fill();
    } else if(type==='zzz'){
      g.fillStyle='#5b6bb8'; g.font='bold 34px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('Z',-10,6); g.font='bold 26px sans-serif'; g.fillText('z',10,-8); g.font='bold 18px sans-serif'; g.fillText('z',24,-20);
    }
    g.restore();
  }
  function drawBubble(a,b,kind,showName){
    const g=b.g; g.clearRect(0,0,256,200);
    if(kind){
      const urgent=kind==='hunger'||kind==='thirst'||kind==='dirty'; const col=kind==='zzz'?'#9fb0ff':(urgent?(a.stats.hunger<.15||a.stats.thirst<.15||a.stats.clean<.12?'#ff6b6b':'#ffc24a'):'#ff8fb1');
      g.fillStyle='#fffaf0'; g.strokeStyle=col; g.lineWidth=7; g.beginPath(); g.roundRect(78,2,100,92,28); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(116,92); g.lineTo(128,108); g.lineTo(140,92); g.fillStyle='#fffaf0'; g.fill(); g.strokeStyle=col; g.beginPath(); g.moveTo(113,92); g.lineTo(128,108); g.lineTo(143,92); g.stroke(); g.fillStyle='#fffaf0'; g.fillRect(118,88,20,8);
      icon(g,kind,128,48);
    }
    if(showName){
      g.font='bold 30px "Trebuchet MS",sans-serif'; const w=Math.max(96,g.measureText(a.name).width+40);
      g.fillStyle='rgba(255,248,230,.96)'; g.strokeStyle='#c9894a'; g.lineWidth=5; g.beginPath(); g.roundRect(128-w/2,128,w,48,24); g.fill(); g.stroke();
      g.fillStyle='#5a3a1e'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(a.name,128,148);
      g.font='bold 20px sans-serif'; g.fillStyle='#a06a30'; g.fillText(a.weight.toFixed(a.kind==='cow'?0:1)+' kg',128,188);
    }
    b.tex.needsUpdate=true;
  }

  // ---------------- animal creation ----------------
  const list=[]; const used=new Set(); let nextId=1;
  function create(kind,opts={}){
    const seed=opts.seed??((Math.random()*1e9)|0); const rng=mulberry32(seed^0x9e37);
    const m=buildAnimal(kind,seed); const K=KIND[kind];
    const name=opts.name??pickName(kind,rng,used); used.add(name);
    const a={ id:nextId++, kind, breed:m.breed, seed, name, male:m.male, model:m, mesh:m.group, pos:new V3(), heading:opts.heading??rng()*6.28,
      stats:{ hunger:.8, thirst:.8, clean:.9, happy:.7, ...(opts.stats||{}) },
      weight:opts.weight??(K.w0[0]+rng()*(K.w0[1]-K.w0[0])), rad:K.rad, K,
      state:'idle', stT:1+rng()*2, target:null, slot:null, after:null, speed:0, walkAmt:0, ph:rng()*6, sleepAmt:0, headDown:0, headLook:0, look:0,
      blinkT:1+rng()*3, blink:0, bleatT:0, hopT:-1, hopH:.35, shakeT:0, petT:0, eatT:0, wake:0, rewardCd:0, happyEdge:false, reactT:0, sx:1, sy:1, tailPh:rng()*6, zT:0,
      bubble:makeBubble(), lastNeed:'', think:rng()*2, stuck:0, hornsy:0, bleatCd:6+rng()*20, fat:1, prevHappy:0, brk:'' };
    a.stats.happy=clamp(a.stats.happy);
    a.pos.set(...(opts.at||[0,0,0])); a.pos.y=gh(a.pos.x,a.pos.z);
    m.group.position.copy(a.pos); m.group.rotation.y=a.heading; scene.add(m.group);
    a.bubble.sp.position.set(0,0,0); scene.add(a.bubble.sp);
    a.mesh.userData.animal=a; list.push(a); return a;
  }
  function spawnPoint(rng){ for(let i=0;i<40;i++){ const x=B.x0+1.5+rng()*(B.x1-B.x0-3), z=B.z0+1.5+rng()*(B.z1-B.z0-3); if(pen.obstacles.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+.9) && list.every(l=>Math.hypot(l.pos.x-x,l.pos.z-z)>1.6)) return [x,0,z]; } return [B.x0+2,0,B.z0+6]; }
  const rs=mulberry32(1234);
  if(Array.isArray(S.animals)&&S.animals.length&&S.animals[0]?.seed!==undefined){
    for(const d of S.animals){ if(!KIND[d.kind]) continue; create(d.kind,{seed:d.seed,name:d.name,stats:d.stats,weight:d.weight,at:spawnPoint(rs)}); }
  }
  if(!list.length) ['goat','goat','sheep','sheep','cow','goat'].forEach((k,i)=>create(k,{seed:[101,205,309,412,517,623][i],at:spawnPoint(rs)}));
  const persist=()=>{ S.animals=list.map(a=>({kind:a.kind,seed:a.seed,name:a.name,stats:{...a.stats},weight:a.weight})); };
  persist();

  // ---------------- helpers: station use / AI ----------------
  const isNight=()=>{ const h=ctx.hour??8; return h>=21.5||h<5; };
  const fwd=(h)=>[Math.sin(h),Math.cos(h)];
  function standFor(a,station,i){ // stand position so the head reaches the station
    const pt=station.slots[i]; if(station.direct) return pt.clone();
    const f=fwd(station.face??Math.PI); return new V3(pt.x-f[0]*a.K.reach,0,pt.z-f[1]*a.K.reach);
  }
  function freeSlot(station){ if(!station.occ) station.occ=station.slots.map(()=>null); for(let i=0;i<station.slots.length;i++){ const o=station.occ[i]; if(!o||o.dead) return i; } return -1; }
  function release(a){ if(a.slot){ if(a.slot.st.occ[a.slot.i]===a) a.slot.st.occ[a.slot.i]=null; a.slot=null; } }
  function claim(a,station,i){ station.occ[i]=a; a.slot={st:station,i}; }
  function go(a,x,z,after,opt={}){ a.target=new V3(x,0,z); a.after=after||null; a.state='walk'; a.stT=22; a.runUp=!!opt.run; a.arriveR=opt.r??.3; }
  function wanderPoint(a,rng=Math.random){
    for(let i=0;i<14;i++){ const x=B.x0+1.1+rng()*(B.x1-B.x0-2.2), z=B.z0+1.1+rng()*(B.z1-B.z0-2.2);
      if(pen.obstacles.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+a.rad+.15) && list.every(o=>o===a||Math.hypot(o.pos.x-x,o.pos.z-z)>(o.rad+a.rad)*.9)) return [x,z]; }
    return [a.pos.x,a.pos.z];
  }
  function bleat(a){ a.bleatT=.9; audio(a.K.bleat,{pos:a.pos,vol:.7}); }
  function startState(a,s,dur){ a.state=s; a.stT=dur; }
  function chooseNext(a){
    const S2=a.stats, r=Math.random();
    release(a);
    if(isNight() && a.state!=='sleep'){ // go to bed in the shelter
      const sh=st.shade; let i=-1; for(let k=0;k<sh.sleep.length;k++){ const o=sh.occ[k]; if(!o||o.dead){ i=k; break; } }
      if(i>=0){ sh.occ[i]=a; a.slot={st:sh,i}; const p=sh.sleep[i]; go(a,p.x,p.z,()=>{ startState(a,'sleep',1e9); a.heading=Math.PI*(.2+i*.3); },{r:.2}); return; }
      const p=sh.pos; go(a,p.x+(Math.random()-.5)*3,p.z+(Math.random()-.5)*2,()=>startState(a,'sleep',1e9)); return;
    }
    if(S2.thirst<.5 && st.water.fill>.04){ const i=freeSlot(st.water); if(i>=0){ claim(a,st.water,i); const p=standFor(a,st.water,i); go(a,p.x,p.z,()=>{ a.heading=st.water.face; startState(a,'drink',14); },{r:.15}); return; } }
    if(S2.hunger<.55){ const cand=st.feed.filter(f=>f.fill>.04).sort((p,q)=>p.pos.distanceTo(a.pos)-q.pos.distanceTo(a.pos));
      for(const f of cand){ const i=freeSlot(f); if(i>=0){ claim(a,f,i); const p=standFor(a,f,i); go(a,p.x,p.z,()=>{ a.heading=f.face; startState(a,'eat',16); },{r:.15}); return; } } }
    if(S2.clean<.3 && r<.4){ const w=st.wash; const i=freeSlot(w); if(i>=0){ claim(a,w,i); const p=w.slots[i]; go(a,p.x,p.z,()=>{ a.heading=Math.atan2(w.pos.x-a.pos.x,w.pos.z-a.pos.z); startState(a,'wait',10+Math.random()*8); },{r:.2}); return; } }
    if(r<.46){ const [x,z]=wanderPoint(a); go(a,x,z,()=>startState(a,'idle',1+Math.random()*3)); }
    else if(r<.68){ startState(a,'graze',4+Math.random()*5); }
    else if(r<.78 && S2.happy>.55){ a.hopT=0; startState(a,'hop',.9); }
    else if(r<.85){ bleat(a); startState(a,'idle',2); }
    else { a.look=(Math.random()-.5)*1.2; startState(a,'idle',2+Math.random()*3); }
  }

  // ---------------- interaction API ----------------
  function reward(a,kind){
    if(a.stats.happy<.7||a.rewardCd>0) return 0; a.rewardCd=kind==='pet'?20:6;
    const n=a.kind==='cow'?3:2; const ui=ctx.modules.ui;
    if(ui?.addCoins) ui.addCoins(n); else { S.coins=(S.coins||0)+n; ctx.emit('coins:change',S.coins); }
    ctx.emit('animal:happy',{animal:a,pos:a.pos.clone().setY(a.pos.y+.7*a.K.reach)});
    toast({msg:`${a.name} ${T('happy')} +${n}`,icon:'heart',kind:'good'});
    return n;
  }
  function evPos(a){ return a.pos.clone().setY(a.pos.y+.6); }
  const useItem=(it)=>{ if((S.inventory[it]||0)<=0){ toast(T(it)); return false; } S.inventory[it]--; ctx.emit('inventory:change',S.inventory); return true; };
  function wakeUp(a){ if(a.state==='sleep'){ release(a); a.state='idle'; a.stT=2; a.wake=3; } }
  const api={
    list, pen, stations:st, KIND,
    nearest(pos,r=3){ let best=null,bd=r*r; for(const a of list){ const dx=a.pos.x-pos.x,dz=a.pos.z-pos.z,d=dx*dx+dz*dz; if(d<bd){bd=d;best=a;} } return best; },
    nearestStation(pos,r=2.6){ const c=[]; for(const f of st.feed) c.push({type:'feed',st:f,d:Math.hypot(f.pos.x-pos.x,f.pos.z-pos.z)}); c.push({type:'water',st:st.water,d:Math.hypot(st.water.pos.x-pos.x,st.water.pos.z-pos.z)}); c.push({type:'wash',st:st.wash,d:Math.hypot(st.wash.pos.x-pos.x,st.wash.pos.z-pos.z)});
      c.sort((p,q)=>p.d-q.d); return c[0]&&c[0].d<=r?c[0]:null; },
    feed(a,item='hay'){ if(!a) return false; const treat=item==='treat';
      if(a.stats.hunger>.97&&!treat){ toast(`${a.name} ${T('full')}`); a.reactT=.6; return false; }
      if(!useItem(treat?'treat':'hay')) return false;
      a.stats.hunger=clamp(a.stats.hunger+(treat?.18:.5)); a.stats.happy=clamp(a.stats.happy+(treat?.28:.1)); a.eatT=treat?1.4:2.2; a.wake=2; wakeUp(a); if(treat){ a.hopT=0; sparkles(evPos(a),6); }
      audio('munch',{pos:a.pos}); ctx.emit('animal:fed',{animal:a,pos:evPos(a),item}); reward(a,'feed'); return true; },
    water(a){ if(!a) return false; if(a.stats.thirst>.97){ toast(`${a.name} ${T('fullw')}`); return false; } if(!useItem('water')) return false;
      a.stats.thirst=clamp(a.stats.thirst+.55); a.stats.happy=clamp(a.stats.happy+.06); a.drinkT=2; a.eatT=2; wakeUp(a); audio('splash',{pos:a.pos,vol:.5}); ctx.emit('animal:watered',{animal:a,pos:evPos(a)}); reward(a,'water'); return true; },
    wash(a){ if(!a) return false; if(a.stats.clean>.96){ toast(`${a.name} ${T('clean')}`); a.reactT=.6; return false; } if(!useItem('soap')) return false;
      a.stats.clean=1; a.stats.happy=clamp(a.stats.happy+.18); a.shakeT=2.2; wakeUp(a); bubbles(evPos(a).setY(a.pos.y+.5),16); audio('splash',{pos:a.pos}); ctx.emit('animal:washed',{animal:a,pos:evPos(a)}); reward(a,'wash'); return true; },
    pet(a){ if(!a) return false; a.stats.happy=clamp(a.stats.happy+.07); a.petT=1.6; a.wake=4; wakeUp(a); if(a.state==='walk'||a.state==='graze'||a.state==='wait'){ release(a); a.state='idle'; a.stT=2; }
      hearts(a.pos.clone().setY(a.pos.y+a.model.dims.bubbleY*.7),3); audio('pop',{pos:a.pos,vol:.4}); if(Math.random()<.35) bleat(a); reward(a,'pet'); return true; },
    interact(a,tool){ switch(tool){ case 'hay': return api.feed(a,'hay'); case 'treat': return api.feed(a,'treat'); case 'water': return api.water(a); case 'soap': return api.wash(a); default: return api.pet(a); } },
    fillStation(type='feed'){ if(type==='water'){ if(st.water.fill>.9){ return false; } if(!useItem('water')) return false; st.water.fill=Math.min(1,st.water.fill+.55); toast(T('troughWater')); audio('splash',{pos:st.water.pos,vol:.5}); return true; }
      const f=st.feed.slice().sort((p,q)=>p.fill-q.fill)[0]; if(f.fill>.9) return false; if(!useItem('hay')) return false; f.fill=Math.min(1,f.fill+.55); toast(T('troughHay')); audio('munch',{pos:f.pos,vol:.5}); return true; },
    add(kind){ if(!KIND[kind]||list.length>=MAX_ANIMALS){ if(list.length>=MAX_ANIMALS) toast(T('full2')); return null; }
      const a=create(kind,{at:[B.x0+1.6,0,PEN.cz+(Math.random()-.5)*1.5],heading:Math.PI/2,stats:{hunger:.7,thirst:.7,clean:1,happy:.8}}); persist(); sparkles(a.pos.clone().setY(.6),10); audio('pop',{pos:a.pos}); ctx.emit('animal:added',{animal:a}); return a; },
    remove(a){ const i=list.indexOf(a); if(i<0) return; release(a); a.dead=true; scene.remove(a.mesh); scene.remove(a.bubble.sp); a.bubble.tex.dispose(); a.mesh.traverse(o=>o.geometry?.dispose?.()); list.splice(i,1); persist(); },
    price:(k)=>KIND[k]?.price??0,
    totalWeight:()=>list.reduce((s,a)=>s+a.weight,0),
    update:null,
  };

  // ---------------- per-frame ----------------
  const bpos={}; // rest positions cache per model are inside model.restLocal
  let saveT=0, camReady=false;
  const playerPos=()=>ctx.cameraRig?.target||ctx.camera.position;
  function stepAI(a,dt){
    const S2=a.stats; const night=isNight();
    // needs
    const sl=a.state==='sleep'?.45:1;
    S2.hunger=clamp(S2.hunger-.0026*dt*sl); S2.thirst=clamp(S2.thirst-.0032*dt*sl); S2.clean=clamp(S2.clean-.001*dt*(a.state==='walk'?1.4:1));
    if(a.state==='graze') S2.hunger=clamp(S2.hunger+.0030*dt);
    const tgt=(S2.hunger*.4+S2.thirst*.3+S2.clean*.3);
    S2.happy=clamp(S2.happy+(tgt*.95-S2.happy)*dt*.035 - (Math.min(S2.hunger,S2.thirst)<.2?.01*dt:0));
    // weight (gameplay)
    const K=a.K; if(S2.hunger>.4&&S2.thirst>.3) a.weight=Math.min(K.wMax*1.1,a.weight+K.gain*dt*(.5+S2.happy*.7)*(S2.clean>.25?1:.6)); else if(S2.hunger<.1) a.weight=Math.max(K.w0[0]*.7,a.weight-K.gain*.4*dt);
    a.rewardCd=Math.max(0,a.rewardCd-dt); a.wake=Math.max(0,a.wake-dt); a.shakeT=Math.max(0,a.shakeT-dt); a.petT=Math.max(0,a.petT-dt); a.eatT=Math.max(0,a.eatT-dt); a.reactT=Math.max(0,a.reactT-dt);
    if(S2.happy>.82&&!a.happyEdge){ a.happyEdge=true; } else if(S2.happy<.7) a.happyEdge=false;
    a.bleatCd-=dt; if(a.bleatCd<=0){ a.bleatCd=14+Math.random()*30; if(a.state!=='sleep'&&(Math.min(S2.hunger,S2.thirst)<.35||Math.random()<.3)) bleat(a); }
    // state machine
    const reacting=a.petT>0||a.shakeT>0||a.eatT>0&&a.state!=='eat'&&a.state!=='drink'||a.reactT>0;
    switch(a.state){
      case 'walk': { a.stT-=dt; if(!a.target){ a.state='idle'; a.stT=1; break; } const dx=a.target.x-a.pos.x,dz=a.target.z-a.pos.z; if(Math.hypot(dx,dz)<(a.arriveR||.3)||a.stT<=0){ const f=a.after; a.after=null; a.target=null; a.state='idle'; a.stT=.5; if(a.stT<=0&&a.slot) release(a); f?.(); } break; }
      case 'idle': case 'wait': case 'graze': a.stT-=dt; if(a.stT<=0&&!reacting){ if(a.state==='wait') release(a); chooseNext(a); } break;
      case 'hop': a.stT-=dt; if(a.stT<=0){ a.state='idle'; a.stT=.6; } break;
      case 'eat': { const f=a.slot?.st; a.stT-=dt; if(!f||f.fill<=.005||S2.hunger>=.92||a.stT<=0){ release(a); startState(a,'idle',1+Math.random()*2); if(S2.hunger>.8) a.stats.happy=clamp(S2.happy+.05); break; }
        const r=.05*dt; f.fill=Math.max(0,f.fill-r); S2.hunger=clamp(S2.hunger+r*1.0); S2.happy=clamp(S2.happy+.004*dt); break; }
      case 'drink': { const f=a.slot?.st; a.stT-=dt; if(!f||f.fill<=.005||S2.thirst>=.92||a.stT<=0){ release(a); startState(a,'idle',1+Math.random()*2); break; }
        const r=.08*dt; f.fill=Math.max(0,f.fill-r*.8); S2.thirst=clamp(S2.thirst+r); break; }
      case 'sleep': if(!night||a.wake>0&&false){ release(a); startState(a,'idle',1+Math.random()*3); a.wake=0; } else if(a.wake>0){ /* petted: stays asleep, smiling */ } break;
    }
    if(night&&a.state!=='sleep'&&a.state!=='walk'&&!reacting&&a.stT>1.0){ a.stT=Math.min(a.stT,.5+Math.random()*3); }
  }

  const tmpA=new V3();
  function move(a,dt){
    const walking=a.state==='walk'&&a.target; let want=0;
    const immobile=a.state==='sleep'||a.state==='eat'||a.state==='drink'||a.petT>0||a.shakeT>0||a.state==='hop'&&false;
    if(walking&&!immobile){
      let dx=a.target.x-a.pos.x, dz=a.target.z-a.pos.z; const dist=Math.hypot(dx,dz)||1; dx/=dist; dz/=dist; let ax=0,az=0;
      for(const o of list){ if(o===a) continue; const ox=a.pos.x-o.pos.x, oz=a.pos.z-o.pos.z, d=Math.hypot(ox,oz)||.01, r=a.rad+o.rad+.5; if(d<r){ const p=(r-d)/r; ax+=ox/d*p*1.6; az+=oz/d*p*1.6; } }
      for(const o of pen.obstacles){ const ox=a.pos.x-o.x, oz=a.pos.z-o.z, d=Math.hypot(ox,oz)||.01, r=o.r+a.rad+.4; if(d<r){ const p=(r-d)/r; ax+=ox/d*p*2.2; az+=oz/d*p*2.2; } }
      const m=.9; if(a.pos.x<B.x0+m) ax+=1; if(a.pos.x>B.x1-m) ax-=1; if(a.pos.z<B.z0+m) az+=1; if(a.pos.z>B.z1-m) az-=1;
      let vx=dx+ax*1.2, vz=dz+az*1.2; const want_h=Math.atan2(vx,vz); const dh=angDiff(a.heading,want_h);
      a.heading+=clamp(dh,-4.2*dt,4.2*dt);
      want=a.K.speed*clamp(dist/1.0,.35,1)*clamp(1-Math.abs(dh)*.55,.2,1)*(a.runUp?1.5:1)*(a.hunger<.15?1:1);
    }
    a.speed=damp(a.speed,want,want>a.speed?5:7,dt);
    if(a.speed>.02){ a.pos.x+=Math.sin(a.heading)*a.speed*dt; a.pos.z+=Math.cos(a.heading)*a.speed*dt; }
    // hard separation (always)
    for(const o of list){ if(o===a) continue; const ox=a.pos.x-o.pos.x, oz=a.pos.z-o.pos.z, d=Math.hypot(ox,oz)||.01, r=(a.rad+o.rad)*.92; if(d<r){ const push=(r-d); const share=(o.state==='sleep'||o.state==='eat'||o.state==='drink')?1:.5; a.pos.x+=ox/d*push*share*Math.min(1,dt*8); a.pos.z+=oz/d*push*share*Math.min(1,dt*8); } }
    for(const o of pen.obstacles){ const ox=a.pos.x-o.x, oz=a.pos.z-o.z, d=Math.hypot(ox,oz)||.01, r=o.r+a.rad*.55; if(d<r){ a.pos.x+=ox/d*(r-d); a.pos.z+=oz/d*(r-d); } }
    const mg=a.rad*.7; a.pos.x=clamp(a.pos.x,B.x0+mg,B.x1-mg); a.pos.z=clamp(a.pos.z,B.z0+mg,B.z1-mg);
    // face a target direction while standing at a station slightly toward the trough
    if(!walking&&a.slot&&(a.state==='eat'||a.state==='drink')){ const f=a.slot.st.face; a.heading+=clamp(angDiff(a.heading,f),-3*dt,3*dt); }
    if(!walking&&a.state==='idle'&&a.look){ a.heading+=a.look*dt*.6; a.look*=.97; }
    a.pos.y=gh(a.pos.x,a.pos.z);
  }

  function pose(a,dt,t){
    const m=a.model, bn=m.bones, rl=m.restLocal, D=m.dims, S2=a.stats;
    const asleep=a.state==='sleep';
    a.walkAmt=damp(a.walkAmt,clamp(a.speed/(a.K.speed*.9)),9,dt);
    a.sleepAmt=damp(a.sleepAmt,asleep?1:0,asleep?2.2:5,dt);
    const grazing=a.state==='graze'&&!a.eatT, eating=a.state==='eat'||a.state==='drink';
    const hdTarget = grazing?1:(eating?.42:(a.eatT>0?.5:0));
    a.headDown=damp(a.headDown,hdTarget,7,dt);
    a.ph+=dt*(5.5+a.speed*5.5)*a.walkAmt; const ph=a.ph, w=a.walkAmt, sl=a.sleepAmt, awake=1-sl;
    // blink
    a.blinkT-=dt; if(a.blinkT<=0){ a.blink=.16; a.blinkT=1.8+Math.random()*3.5; if(Math.random()<.2) a.blinkT=.25; }
    a.blink=Math.max(0,a.blink-dt); let eyeY=a.blink>0?.08:1;
    const pettedClose=a.petT>0?Math.min(1,a.petT*3):0; eyeY=Math.min(eyeY,1-pettedClose*.7); eyeY=Math.min(eyeY,1-sl*.92);
    // hop
    let hopY=0, sx=1, sy=1;
    if(a.hopT>=0){ a.hopT+=dt; const T=a.hopT, dur=.75; if(T<.13){ const u=T/.13; sy=1-.18*u; sx=1+.1*u; } else if(T<.5){ const u=(T-.13)/.37; hopY=a.hopH*Math.sin(u*Math.PI); sy=1+.14*Math.sin(u*Math.PI); sx=1-.07*Math.sin(u*Math.PI); if(u<.02&&!a.hopSnd){ a.hopSnd=1; } }
      else if(T<dur){ const u=(T-.5)/(dur-.5); sy=1-.2*Math.sin(u*Math.PI)*(1-u); sx=1+.1*Math.sin(u*Math.PI)*(1-u); } else { a.hopT=-1; a.hopSnd=0; if(a.state==='hop'&&false) a.state='idle'; } }
    if(a.hopT>=0&&a.hopT<.02) a.hopH=.28+Math.random()*.12;
    // random hops while overjoyed after rewards
    if(a.eatT>1.2&&a.hopT<0&&a.stats.happy>.8&&Math.random()<dt*.8&&a.state!=='sleep') a.hopT=0;
    // bleat
    let jaw=0, bleatUp=0; if(a.bleatT>0){ const u=1-a.bleatT/.9; a.bleatT-=dt; jaw=Math.pow(Math.sin(Math.PI*clamp(u*1.05)),.6)*(.42+.12*Math.sin(u*40)); bleatUp=Math.sin(Math.PI*clamp(u))*.25; }
    // chewing
    const chewing=(eating||a.eatT>0||grazing)&&!asleep; if(chewing) jaw=Math.max(jaw,(.1+.1*Math.sin(t*14+a.ph))*(.6+.4*a.headDown));
    // ---- root ----
    const g=a.mesh; g.position.set(a.pos.x,a.pos.y+hopY,a.pos.z); 
    const shake=a.shakeT>0?Math.min(1,a.shakeT)*Math.sin(t*42):0;
    g.rotation.set(0,a.heading+shake*.18,shake*.06); 
    const breath=Math.sin(t*(asleep?1.3:2.1)+a.seed)*(asleep?.02:.012);
    const fat=lerp(.93,1.12,clamp((a.weight-a.K.w0[0])/(a.K.wMax-a.K.w0[0]))); a.fat=damp(a.fat,fat,2,dt);
    bn.root.scale.set(sx,sy,sx);
    // body
    const drop=sl*(D.bodyY-D.hipY*.2-.19)*.96;
    const bounce=Math.abs(Math.sin(ph))*.04*w;
    bn.body.position.set(rl.body.x,rl.body.y+bounce-drop+Math.sin(t*3.1)*.002,rl.body.z);
    bn.body.rotation.set(.07*a.headDown*awake+Math.sin(ph*2)*.012*w-bleatUp*.15,0,Math.sin(ph)*.05*w+shake*.05);
    bn.body.scale.set(a.fat*(1+breath*.6),1+breath,a.fat*(1+breath*.4));
    const inv=1/a.fat; // keep head/tail unscaled
    // legs
    const legs=['legFL','legFR','legBL','legBR']; const offs=[0,Math.PI,Math.PI,0];
    for(let i=0;i<4;i++){ const b=bn[legs[i]], r=rl[legs[i]]; const s=Math.sin(ph+offs[i]); const lift=Math.max(0,Math.cos(ph+offs[i]));
      b.rotation.x=s*.62*w*awake - (i<2?1:0)*sl*.9*0; b.rotation.z=0;
      b.position.set(r.x*1.0,r.y-drop+lift*.015*w,r.z);
      b.scale.set(1,lerp(1,.28,sl)*(1-.06*lift*w),1);
      if(a.hopT>=0&&a.hopT>.13&&a.hopT<.5){ b.rotation.x+= (i<2?-.5:.5); } }
    // head / neck
    const hd=a.headDown; const look=Math.sin(t*.6+a.seed*.1)*.12*awake*(1-hd);
    const hb=bn.head, hr=rl.head; const nod=Math.sin(ph*2)*.045*w;
    const petTilt=a.petT>0?Math.sin(t*4)*.12*Math.min(1,a.petT*2):0;
    hb.position.set(hr.x,hr.y-.4*hd*awake-.1*sl+Math.abs(Math.sin(ph))*.01*w,hr.z+.05*hd);
    const chewBob=chewing?Math.sin(t*14+a.ph)*.03:0;
    hb.rotation.set(.95*hd*awake+.4*sl-bleatUp*1.1+nod+chewBob+(a.reactT>0?Math.sin(t*14)*.15:0),look+(a.petT>0?.25*Math.min(1,a.petT*2):0)*Math.sin(t*1.5),petTilt+a.look*.1);
    hb.scale.set(inv,inv,inv);
    bn.jaw.rotation.x=jaw*awake; 
    // eyes
    bn.eyeL.scale.set(1,Math.max(.06,eyeY),1); bn.eyeR.scale.set(1,Math.max(.06,eyeY),1);
    // ears
    const flap=Math.sin(ph*2+1)*.28*w; const idle=Math.sin(t*1.7+a.seed)*.05; const twitch=Math.max(0,Math.sin(t*.9+a.seed*3)-.95)*5;
    const droop=.18*sl+(S2.happy<.35?.18:0)+(a.petT>0?.3:0)-(bleatUp*.8);
    bn.earL.rotation.set(0,0,flap+idle+droop-twitch*.15+shake*.3); bn.earR.rotation.set(0,0,-(flap-idle*.6+droop-twitch*.0)-shake*.3);
    // tail
    const happyAmt=a.petT>0?1.4:S2.happy; a.tailPh+=dt*(6+happyAmt*10);
    const tw=Math.sin(a.tailPh)*(.12+.45*happyAmt)*awake*(a.kind==='sheep'?.4:1);
    bn.tail.position.set(rl.tail.x,rl.tail.y-drop,rl.tail.z);
    bn.tail.rotation.set(a.kind==='cow'?Math.sin(a.tailPh*.5)*.1:0.0, a.kind==='cow'?0:tw, a.kind==='cow'?tw*.7+shake*.4:0); bn.tail.scale.set(inv,inv,inv);
    // bubbles
    if(a.petT>0&&Math.random()<dt*3) hearts(a.pos.clone().setY(a.pos.y+D.bubbleY*.7),1);
    if(asleep){ a.zT-=dt; if(a.zT<=0){ a.zT=1.6; spawnP(3,a.pos.x,a.pos.y+D.bubbleY*.55,a.pos.z,.1,.35,.05,2.3,.3); } }
    if(a.shakeT>0&&Math.random()<dt*14) bubbles(a.pos.clone().setY(a.pos.y+.6),1);
    // dust steps
    if(w>.7&&Math.sin(ph)*Math.sin(ph-.25)<-.0&&Math.random()<dt*2) ctx.modules.fx?.burst?.('dust',a.pos.clone(),1);
  }

  const bp=new V3();
  function updateBubble(a,dt,t){
    const b=a.bubble, S2=a.stats; const p=playerPos(); const dist=Math.hypot(a.pos.x-p.x,a.pos.z-p.z);
    let kind='';
    if(a.state==='sleep') kind='zzz';
    else if(a.petT>0||a.eatT>1.0&&S2.happy>.7) kind='love';
    else { const m=Math.min(S2.hunger,S2.thirst,S2.clean); if(m<.3){ kind=S2.hunger===m?'hunger':S2.thirst===m?'thirst':'dirty'; } else if(S2.happy>.9&&(t*.2+a.seed)%1<.45) kind='heart'; }
    const showName=dist<9.5; const wk=a.weight.toFixed(a.kind==='cow'?0:1);
    const key=kind+'|'+showName+'|'+wk+'|'+(kind==='hunger'||kind==='thirst'||kind==='dirty'?(Math.min(S2.hunger,S2.thirst,S2.clean)<.15?'r':'y'):'');
    if(key!==b.key){ b.key=key; drawBubble(a,b,kind,showName); }
    const vis=(kind&&dist<26)||showName; b.sp.visible=vis&&a.mesh.visible;
    const bob=Math.sin(t*2.5+a.seed)*.04;
    b.sp.position.set(a.pos.x,a.pos.y+a.model.dims.bubbleY*(1-a.sleepAmt*.25)+bob+(kind?.0:-.28),a.pos.z);
    const s=clamp(.72+dist*.02,.72,1.35); b.sp.scale.set(1.28*s,1.0*s,1);
    b.mat.opacity=clamp((28-dist)/6,0,1);
  }

  api.update=(dt,t)=>{
    pen.update(dt,t);
    for(const a of list){ stepAI(a,dt); move(a,dt); pose(a,dt,t); updateBubble(a,dt,t); }
    updateParticles(dt,t);
    saveT+=dt; if(saveT>3){ saveT=0; for(let i=0;i<list.length;i++){ const a=list[i],d=S.animals?.[i]; if(d&&d.seed===a.seed){ d.stats={...a.stats}; d.weight=a.weight; } else persist(); } }
    if(camParam&&camParam.length>=6&&!camParam.some(Number.isNaN)){ ctx.camera.position.set(camParam[0],camParam[1],camParam[2]); ctx.camera.lookAt(camParam[3],camParam[4],camParam[5]); if(ctx.cameraRig){ try{ ctx.cameraRig.target.set(camParam[3],camParam[4],camParam[5]); }catch(e){} } }
  };
  // debug / test hooks
  api.debug={ hearts,bubbles,sparkles,spawnP };
  // test env: ?fill=1 fills troughs, ?night forces hour
  if(q.has('night')) ctx.hour=23;
  if(q.has('fill')){ st.feed.forEach(f=>f.fill=.8); st.water.fill=.8; }
  if(q.has('hungry')) list.forEach(a=>{ a.stats.hunger=.2; a.stats.thirst=.2; a.stats.clean=.15; });
  if(q.has('show')){ // test showcase: freeze animals in a row
    const pose=q.get('show'); list.forEach((a,i)=>{ a.pos.set(20.5+i*2.2,0,8); a.heading=.5; a.state=pose==='sleep'?'sleep':pose==='graze'?'graze':'idle'; a.stT=1e9; a.model.group.position.copy(a.pos);
      if(pose==='bleat'){ a.bleatCd=.3; } if(pose==='hop'){ a.state='hop'; a.stT=1e9; a.hopT=0; } if(pose==='pet') a.petT=1e9; if(pose==='shake') a.shakeT=1e9; if(pose==='eat') a.eatT=1e9; });
    const orig=api.update; api.update=(dt,t)=>{ orig(dt,t); list.forEach(a=>{ if(q.get('show')==='hop'&&a.hopT<0) a.hopT=0; if(q.get('show')==='bleat'&&a.bleatT<=0) a.bleatT=.9; a.stT=1e9; a.petT=q.get('show')==='pet'?1e9:a.petT; }); };
  }
  if(q.get('warp')){ const n=+q.get('warp')*30; for(let i=0;i<n;i++){ ctx.time+=1/30; api.update(1/30,ctx.time); } }
  return api;
}

// Sacrificial animals: goats (kambing), sheep (domba), cows (sapi). Needs AI, procedural animation, pen, interaction API.
import * as THREE from 'three';
import { buildAnimal, pickName, KIND_NAMES, BREEDS } from './model.js';
import { FACE, drawPortrait } from './face.js';
export { KIND_NAMES, BREEDS };
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
  cow  :{ speed:.75,  rad:.58, reach:.85, gain:.1,    w0:[190,260], wMax:520, price:220, bleat:'moo' },
};
const MAX_BASE=4, MAX_PER_LEVEL=1; // a small, lovable herd: 4 animals (5 / 6 after the pen upgrades)
const penLvlOf=(v)=>{ v=+v||0; return v>=8?2:v>=4?1:Math.max(0,Math.min(2,v|0)); }; // accepts pen level (0..2) or berkah level (4/8)
const GROW_HOURS=72;
const DECAY={ hunger:.001, thirst:.0012, clean:.0004 };   // per second (was .0026/.0032/.001)
const SICK_AT=270;                                       // seconds of continuous neglect (was 90) // babies grow up over ~3 in-game days
const TXT={ id:{hay:'Hay habis!',water:'Air habis!',soap:'Sabun habis!',treat:'Camilan habis!',happy:'senang!',full:'sudah kenyang',fullw:'sudah puas minum',clean:'sudah bersih',full2:'Hewan sudah penuh',troughHay:'Palung diisi jerami',troughWater:'Bak air diisi',tubFill:'Bak mandi diisi',grown:'sudah dewasa!',penUp:'Kandang diperluas!',cared:'terawat baik!',weightB:'Bonus bobot hewan',sick:'lesu, butuh perawatan',recovered:'sehat kembali!',petDone:'senang dielus',retired:'pulang ke peternak sahabat. Terima kasih sudah merawatnya!'},
            en:{hay:'Out of hay!',water:'Out of water!',soap:'Out of soap!',treat:'Out of treats!',happy:'is happy!',full:'is full',fullw:'is not thirsty',clean:'is already clean',full2:'Pen is full',troughHay:'Trough filled with hay',troughWater:'Water trough filled',tubFill:'Wash tub filled',grown:'is all grown up!',penUp:'The pen got bigger!',cared:'is well cared for!',weightB:'Animal weight bonus',sick:'feels unwell, needs care',recovered:'feels better!',petDone:'loves the pets',retired:'went back to the friendly farmer. Thank you for caring for them!'} };

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
  let pen=buildPen(ctx,penLvlOf(S.penLevel)); let B=pen.bounds; let st=pen.stations;
  const maxAnimals=()=>MAX_BASE+MAX_PER_LEVEL*pen.level;
  let weather=S.event?.id||'';
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
    } else if(type==='sad'){
      g.fillStyle='#c9ced6'; g.strokeStyle='#5b6270'; g.lineWidth=4; g.beginPath(); g.arc(0,0,24,0,7); g.fill(); g.stroke();
      g.fillStyle='#4a5160'; g.beginPath(); g.arc(-8,-5,3.4,0,7); g.arc(8,-5,3.4,0,7); g.fill(); g.lineWidth=3.5; g.beginPath(); g.arc(0,13,8,Math.PI*1.15,Math.PI*1.85); g.stroke();
      g.fillStyle='#6fc3ff'; g.beginPath(); g.ellipse(13,4,3,5,0,0,7); g.fill();
    } else if(type==='zzz'){
      g.fillStyle='#5b6bb8'; g.font='bold 34px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('Z',-10,6); g.font='bold 26px sans-serif'; g.fillText('z',10,-8); g.font='bold 18px sans-serif'; g.fillText('z',24,-20);
    }
    g.restore();
  }
  const PLATE={hunger:'#ff9d1a',thirst:'#2f9bff',dirty:'#17c3b2',heart:'#ff4f87',love:'#ff4f87',zzz:'#6f7dff',sad:'#8a93a3'};
  function drawBubble(a,b,kind,showName){
    const g=b.g; g.clearRect(0,0,256,200);
    if(kind){
      const col=PLATE[kind]; g.lineJoin='round';
      g.beginPath(); g.moveTo(108,92); g.lineTo(128,114); g.lineTo(148,92); g.closePath(); g.fillStyle=col; g.strokeStyle='#3a2418'; g.lineWidth=8; g.stroke(); g.fill();
      g.beginPath(); g.roundRect(70,2,116,96,34); g.fillStyle=col; g.fill(); g.stroke();
      g.fillStyle=col; g.fillRect(112,88,32,8);
      g.fillStyle='#fffaf0'; g.beginPath(); g.arc(128,50,38,0,7); g.fill(); g.strokeStyle='rgba(58,36,24,.5)'; g.lineWidth=3; g.stroke();
      icon(g,kind,128,50);
    }
    if(showName){
      g.font='bold 30px "Trebuchet MS",sans-serif'; const w=Math.max(96,g.measureText(a.name).width+44);
      g.fillStyle='rgba(52,32,20,.92)'; g.strokeStyle='#ffd27a'; g.lineWidth=4; g.beginPath(); g.roundRect(128-w/2,128,w,66,22); g.fill(); g.stroke();
      g.fillStyle='#fff6e0'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(a.name,128,150);
      g.font='bold 20px sans-serif'; g.fillStyle='#ffd27a'; g.fillText(a.weight.toFixed(a.kind==='cow'?0:1)+' kg',128,178);
    }
    b.tex.needsUpdate=true;
  }

  // ---------------- animal creation ----------------
  const list=[]; const used=new Set(); let nextId=1;
  function create(kind,opts={}){
    const seed=opts.seed??((Math.random()*1e9)|0); const rng=mulberry32(seed^0x9e37);
    const m=buildAnimal(kind,seed,!!opts.baby,opts.breed||null); const K0=KIND[kind]; const K=opts.baby?{...K0,rad:K0.rad*.62,reach:K0.reach*.62,speed:K0.speed*1.15,w0:K0.w0.map(v=>v*.3),wMax:K0.wMax*.5,gain:K0.gain*.5}:K0;
    const name=opts.name??pickName(kind,rng,used); used.add(name);
    const a={ id:nextId++, kind, baby:!!opts.baby, growth:opts.baby?(opts.growth||0):1, growE:0, K0, babyS:m.S, adultS:opts.baby?m.S/.6:m.S, breed:m.breed, seed, name, male:m.male, model:m, mesh:m.group, pos:new V3(), heading:opts.heading??rng()*6.28,
      stats:{ hunger:.8, thirst:.8, clean:.9, happy:.7, ...(opts.stats||{}) },
      weight:opts.weight??(K.w0[0]+rng()*(K.w0[1]-K.w0[0])), rad:K.rad, K,
      state:'idle', stT:1+rng()*2, target:null, slot:null, after:null, speed:0, walkAmt:0, ph:rng()*6, sleepAmt:0, headDown:0, headLook:0, look:0,
      blinkT:1+rng()*3, blink:0, bleatT:0, hopT:-1, hopH:.35, shakeT:0, petT:0, eatT:0, wake:0, rewardCd:0, happyEdge:false, reactT:0, sx:1, sy:1, tailPh:rng()*6, zT:0,
      bubble:makeBubble(), lastNeed:'', think:rng()*2, stuck:0, hornsy:0, bleatCd:6+rng()*20, fat:1, prevHappy:0, brk:'' };
    a.stats.happy=clamp(a.stats.happy); a.dayW=a.weight; a.petDay=-1; a.neglect=0; a.sick=false; a.needy=false;
    a.pos.set(...(opts.at||[0,0,0])); a.pos.y=gh(a.pos.x,a.pos.z);
    m.group.position.copy(a.pos); m.group.rotation.y=a.heading; scene.add(m.group);
    a.bubble.sp.position.set(0,0,0); scene.add(a.bubble.sp);
    a.mesh.userData.animal=a; list.push(a); return a;
  }
  function spawnPoint(rng){ for(let i=0;i<40;i++){ const x=B.x0+1.5+rng()*(B.x1-B.x0-3), z=B.z0+1.5+rng()*(B.z1-B.z0-3); if(pen.obstacles.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+.9) && list.every(l=>Math.hypot(l.pos.x-x,l.pos.z-z)>1.6)) return [x,0,z]; } return [B.x0+2,0,B.z0+6]; }
  const rs=mulberry32(1234);
  if(Array.isArray(S.animals)&&S.animals.length&&S.animals[0]?.seed!==undefined){
    // a herd bigger than the pen allows (older saves had up to 16+): keep the best-cared-for ones (ties: the earliest),
    // the rest go home to the friendly farmer (one soft toast, no sad words)
    const capN=MAX_BASE+MAX_PER_LEVEL*penLvlOf(S.penLevel), rows=S.animals.filter(d=>d&&KIND[d.kind]);
    if(rows.length>capN){ const sc=d=>{ const s=d.stats||{}; return (s.happy??.7)*2+(s.hunger??.7)+(s.thirst??.7)+(s.clean??.7)-(d.sick?1:0)+(d.baby?0:.15); };
      const keep=new Set(rows.map((d,i)=>[d,i]).sort((a,b)=>(sc(b[0])-sc(a[0]))||(a[1]-b[1])).slice(0,capN).map(x=>x[0]));
      const gone=rows.filter(d=>!keep.has(d)).map(d=>d.name).filter(Boolean); S.animals=rows.filter(d=>keep.has(d));
      S.retiredAnimals=[...(S.retiredAnimals||[]),...gone].slice(-40);
      // announced once the HUD is up (the ui module boots after us)
      if(gone.length){ const nm=gone.length>3?gone.slice(0,3).join(', ')+' …':gone.join(', '); let tries=0;
        const say=()=>{ if(ctx.modules.ui||++tries>120) setTimeout(()=>toast({msg:`${nm} ${T('retired')}`,icon:'heart',kind:'good'}),3000); else setTimeout(say,500); }; setTimeout(say,500); } }
    for(const d of S.animals){ if(!KIND[d.kind]) continue; Object.assign(create(d.kind,{seed:d.seed,name:d.name,breed:d.breed,stats:d.stats,weight:d.weight,baby:d.baby,growth:d.growth,at:spawnPoint(rs)}),{dayW:d.dayW??d.weight,petDay:d.petDay??-1,neglect:d.neglect||0,sick:!!d.sick,needy:!!d.needy}); }
  }
  // hand-picked starting herd (4): a golden goat, a caramel sheep, a holstein cow and a cream baby lamb
  if(!list.length) [['goat','golden'],['sheep','caramel'],['cow','holstein'],['sheep','cream',1]]
    .forEach(([k,b,baby],i)=>create(k,{seed:[101,309,517,842][i],breed:b,baby:!!baby,at:spawnPoint(rs)}));
  const persist=()=>{ S.animals=list.map(a=>({kind:a.kind,seed:a.seed,name:a.name,breed:a.breed,stats:{...a.stats},weight:a.weight,baby:a.baby,growth:a.growth,dayW:a.dayW,petDay:a.petDay,neglect:a.neglect,sick:a.sick,needy:a.needy})); };
  persist();

  // ---------------- helpers: station use / AI ----------------
  const isNight=()=>{ const h=ctx.hour??8; return h>=19.5||h<5.5; };
  const fwd=(h)=>[Math.sin(h),Math.cos(h)];
  function standFor(a,station,i){ // stand position so the head reaches the station
    const pt=station.slots[i]; if(station.direct) return pt.clone();
    const f=fwd(station.face??Math.PI); return new V3(pt.x-f[0]*a.K.reach,0,pt.z-f[1]*a.K.reach);
  }
  function freeSlot(station){ if(!station.occ) station.occ=station.slots.map(()=>null); for(let i=0;i<station.slots.length;i++){ const o=station.occ[i]; if(!o||o.dead) return i; } return -1; }
  function release(a){ if(st.wash.bather===a&&a.state!=='bath'&&a.state!=='bathOut') st.wash.bather=null; if(a.slot){ if(a.slot.st.occ[a.slot.i]===a) a.slot.st.occ[a.slot.i]=null; a.slot=null; } }
  function claim(a,station,i){ station.occ[i]=a; a.slot={st:station,i}; }
  function go(a,x,z,after,opt={}){ a.target=new V3(x,0,z); a.after=after||null; a.state='walk'; a.stT=22; a.runUp=!!opt.run; a.arriveR=opt.r??.3; }
  function wanderPoint(a,rng=Math.random){
    for(let i=0;i<14;i++){ const x=B.x0+1.1+rng()*(B.x1-B.x0-2.2), z=B.z0+1.1+rng()*(B.z1-B.z0-2.2);
      if(pen.obstacles.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+a.rad+.15) && list.every(o=>o===a||Math.hypot(o.pos.x-x,o.pos.z-z)>(o.rad+a.rad)*.9)) return [x,z]; }
    return [a.pos.x,a.pos.z];
  }
  function bleat(a){ a.bleatT=.9; audio(a.K.bleat,{pos:a.pos,vol:.7}); }
  function startState(a,s,dur){ a.state=s; a.stT=dur; }
  function freeShade(roofOnly){ const sh=st.shade; let any=-1; for(let k=0;k<sh.sleep.length;k++){ const o=sh.occ[k]; if(o&&!o.dead) continue; if(sh.roof[k]) return k; if(any<0&&!roofOnly) any=k; } return any; }
  function chooseNext(a){
    const S2=a.stats, r=Math.random();
    release(a);
    if(isNight() && a.state!=='sleep'){ a.bed=true; // go to bed in the shelter
      const sh=st.shade; const i=freeShade(false);
      if(i>=0){ sh.occ[i]=a; a.slot={st:sh,i}; const p=sh.sleep[i]; go(a,p.x,p.z,()=>{ startState(a,'sleep',1e9); a.heading=Math.PI*(.2+i*.3); },{r:.25,run:true}); return; }
      const p=sh.pos; go(a,p.x+(Math.random()-.5)*3,p.z+2.2+Math.random(),()=>startState(a,'sleep',1e9),{run:true}); return;
    }
    const hr=ctx.hour??12, hot=weather==='panas', rain=weather==='hujan';
    if(S2.thirst<(hot?.72:.5) && st.water.fill>.04){ const i=freeSlot(st.water); if(i>=0){ claim(a,st.water,i); const p=standFor(a,st.water,i); go(a,p.x,p.z,()=>{ a.heading=st.water.face; startState(a,'drink',14); },{r:.15}); return; } }
    if(S2.hunger<.55){ const cand=st.feed.filter(f=>f.fill>.04).sort((p,q)=>p.pos.distanceTo(a.pos)-q.pos.distanceTo(a.pos));
      for(const f of cand){ const i=freeSlot(f); if(i>=0){ claim(a,f,i); const p=standFor(a,f,i); go(a,p.x,p.z,()=>{ a.heading=f.face; startState(a,'eat',16); },{r:.15}); return; } } }
    if((rain&&r<.8)||(hot&&hr>=9.5&&hr<16.5&&r<.55)){ const i=freeShade(true); if(i>=0){ const sh=st.shade; sh.occ[i]=a; a.slot={st:sh,i}; const p=sh.sleep[i]; go(a,p.x,p.z,()=>{ startState(a,'rest',10+Math.random()*12); a.heading=Math.PI*(.15+i*.37); },{r:.25,run:rain}); return; } }
    if(S2.clean<.35 && !rain && (st.wash.fill>.05?r<.85:r<.25)){ const w=st.wash; const i=freeSlot(w); if(i>=0){ claim(a,w,i); const p=w.slots[i]; go(a,p.x,p.z,()=>{ a.heading=Math.atan2(w.pos.x-a.pos.x,w.pos.z-a.pos.z); if(a.rad<.45&&!w.bather&&w.fill>.05){ w.bather=a; a.bathP0=a.pos.clone(); a.tubB=0; a.hopT=0; startState(a,'bath',30); splash(); } else startState(a,'wait',10+Math.random()*8); },{r:.2}); return; } }
    if(a.baby){ if(!a.mom||a.mom.dead||a.mom.baby||!list.includes(a.mom)){ let best=null,bd=1e9; for(const o of list){ if(o.kind!==a.kind||o.baby) continue; const d=o.pos.distanceToSquared(a.pos); if(d<bd){bd=d;best=o;} } a.mom=best; }
      const mo=a.mom; if(mo&&(r<.6||mo.pos.distanceTo(a.pos)>4)){ const sd=(a.id%2?1:-1), h=mo.heading; const x=mo.pos.x-Math.sin(h)*.9+Math.cos(h)*.6*sd, z=mo.pos.z-Math.cos(h)*.9-Math.sin(h)*.6*sd;
        go(a,clamp(x,B.x0+.8,B.x1-.8),clamp(z,B.z0+.8,B.z1-.8),()=>{ a.heading=mo.heading; startState(a,'idle',1.5+Math.random()*2.5); },{run:mo.pos.distanceTo(a.pos)>4,r:.4}); return; } }
    if(r<.46){ const [x,z]=wanderPoint(a); go(a,x,z,()=>startState(a,'idle',1+Math.random()*3)); }
    else if(r<.68){ startState(a,'graze',4+Math.random()*5); }
    else if(r<.78 && S2.happy>.55 && !a.sick){ a.hopT=0; startState(a,'hop',.9); }
    else if(r<.85){ bleat(a); startState(a,'idle',2); }
    else { a.look=(Math.random()-.5)*1.2; startState(a,'idle',2+Math.random()*3); }
  }

  // ---------------- interaction API ----------------
  // Economy: coins come from outcomes, never per action. ui.addCoins/addPahala are the ledger.
  const dayNo=()=>S.day??0;
  function giveCoins(n,src){ const ui=ctx.modules.ui; if(n<=0) return; if(ui?.addCoins) ui.addCoins(n,src); else ctx.emit('animal:reward',{coins:n,src}); }
  function happyEvent(a,reason){ ctx.emit('animal:happy',{animal:a,reason,pos:a.pos.clone().setY(a.pos.y+.7*a.K.reach)}); }
  function checkOutcome(a){ // needy -> all needs satisfied = care bonus
    const S2=a.stats, m=Math.min(S2.hunger,S2.thirst,S2.clean);
    if(m<.35) a.needy=true;
    else if(a.needy&&m>=.7){ a.needy=false; const n=a.kind==='cow'?4:3; giveCoins(n,'animal:care'); happyEvent(a,'cared'); hearts(a.pos.clone().setY(a.pos.y+a.model.dims.bubbleY*.7),5);
      toast({msg:`${a.name} ${T('cared')} +${n}`,icon:'heart',kind:'good'}); audio('coin',{pos:a.pos,vol:.6}); }
  }
  ctx.on('day:new',()=>{ let tot=0; for(const a of list){ const g=a.weight-(a.dayW??a.weight); const pct=g/Math.max(1,a.dayW??a.weight)*100; if(pct>0.5&&!a.sick) tot+=Math.min(3,Math.round(pct)); a.dayW=a.weight; }
    if(tot>0){ giveCoins(tot,'animal:weight'); toast({msg:`${T('weightB')} +${tot}`,icon:'coin',kind:'good'}); } persist(); });
  function evPos(a){ return a.pos.clone().setY(a.pos.y+.6); }
  const useItem=(it)=>{ if((S.inventory[it]||0)<=0){ toast(T(it)); return false; } S.inventory[it]--; ctx.emit('inventory:change',S.inventory); return true; };
  function careHeal(a){ if(a.sick) a.neglect=Math.min(a.neglect,20); else a.neglect=Math.max(0,a.neglect-60); } // any care helps a lot
  function wakeUp(a){ if(a.state==='sleep'){ a.bed=false; release(a); a.state='idle'; a.stT=2; a.wake=3; } }
  const api={
    list, KIND, get pen(){ return pen; }, get stations(){ return st; }, get penLevel(){ return pen.level; },
    nearest(pos,r=3){ let best=null,bd=r*r; for(const a of list){ const dx=a.pos.x-pos.x,dz=a.pos.z-pos.z,d=dx*dx+dz*dz; if(d<bd){bd=d;best=a;} } return best; },
    nearestStation(pos,r=2.6){ const c=[]; for(const f of st.feed) c.push({type:'feed',st:f,d:Math.hypot(f.pos.x-pos.x,f.pos.z-pos.z)}); c.push({type:'water',st:st.water,d:Math.hypot(st.water.pos.x-pos.x,st.water.pos.z-pos.z)}); c.push({type:'wash',st:st.wash,d:Math.hypot(st.wash.pos.x-pos.x,st.wash.pos.z-pos.z)});
      c.sort((p,q)=>p.d-q.d); return c[0]&&c[0].d<=r?c[0]:null; },
    feed(a,item='hay'){ if(!a) return false; const treat=item==='treat';
      if(a.stats.hunger>.97&&!treat){ toast(`${a.name} ${T('full')}`); a.reactT=.6; return false; }
      if(!useItem(treat?'treat':'hay')) return false;
      a.stats.hunger=clamp(a.stats.hunger+(treat?.2:.65)); a.stats.happy=clamp(a.stats.happy+(treat?.4:.08)); a.eatT=treat?1.6:2.2; a.wake=2; wakeUp(a);
      careHeal(a); if(treat){ a.hopT=0; sparkles(evPos(a),6); hearts(a.pos.clone().setY(a.pos.y+a.model.dims.bubbleY*.7),6); a.petT=Math.max(a.petT,1.2); }
      audio('munch',{pos:a.pos}); ctx.emit('animal:fed',{animal:a,pos:evPos(a),item}); checkOutcome(a); return true; },
    treat(a){ return api.feed(a,'treat'); },
    water(a){ if(!a) return false; if(a.stats.thirst>.97){ toast(`${a.name} ${T('fullw')}`); return false; } if(!useItem('water')) return false;
      a.stats.thirst=clamp(a.stats.thirst+.7); a.stats.happy=clamp(a.stats.happy+.06); careHeal(a); a.drinkT=2; a.eatT=2; wakeUp(a); audio('splash',{pos:a.pos,vol:.5}); ctx.emit('animal:watered',{animal:a,pos:evPos(a)}); checkOutcome(a); return true; },
    wash(a){ if(!a) return false; if(a.stats.clean>.96){ toast(`${a.name} ${T('clean')}`); a.reactT=.6; return false; } if(!useItem('soap')) return false;
      a.stats.clean=1; a.stats.happy=clamp(a.stats.happy+.18); careHeal(a); a.shakeT=2.2; wakeUp(a); bubbles(evPos(a).setY(a.pos.y+.5),16); audio('splash',{pos:a.pos}); ctx.emit('animal:washed',{animal:a,pos:evPos(a)}); checkOutcome(a); return true; },
    pet(a){ if(!a) return false; const first=a.petDay!==dayNo(); a.stats.happy=clamp(a.stats.happy+(first?.12:.03)); if(a.sick) a.neglect=Math.min(a.neglect,30); a.petT=1.6; a.wake=4; wakeUp(a); if(a.state==='walk'||a.state==='graze'||a.state==='wait'){ release(a); a.state='idle'; a.stT=2; }
      hearts(a.pos.clone().setY(a.pos.y+a.model.dims.bubbleY*.7),first?4:2); audio('pop',{pos:a.pos,vol:.4}); if(Math.random()<.35) bleat(a);
      if(first){ a.petDay=dayNo(); giveCoins(1,'animal:pet'); happyEvent(a,'pet'); } ctx.emit('animal:petted',{animal:a,pos:evPos(a),first}); return true; },
    interact(a,tool){ switch(tool){ case 'hay': return api.feed(a,'hay'); case 'treat': return api.feed(a,'treat'); case 'water': return api.water(a); case 'soap': return api.wash(a); default: return api.pet(a); } },
    fillStation(type='feed'){ if(type==='wash'||type==='tub'){ const w=st.wash; if(w.fill>.9) return false; if(!useItem('water')) return false; w.fill=Math.min(1,w.fill+.8); toast(T('tubFill')); bubbles(w.pos.clone().setY(.7),10); audio('splash',{pos:w.pos,vol:.6}); return true; }
      if(type==='water'){ if(st.water.fill>.9){ return false; } if(!useItem('water')) return false; st.water.fill=Math.min(1,st.water.fill+.8); toast(T('troughWater')); audio('splash',{pos:st.water.pos,vol:.5}); return true; }
      const f=st.feed.slice().sort((p,q)=>p.fill-q.fill)[0]; if(f.fill>.9) return false; if(!useItem('hay')) return false; f.fill=Math.min(1,f.fill+.8); toast(T('troughHay')); audio('munch',{pos:f.pos,vol:.5}); return true; },
    canAdd:()=>list.length<maxAnimals(), get count(){ return list.length; }, get maxAnimals(){ return maxAnimals(); },
    add(kind,o={}){ if(!KIND[kind]||list.length>=maxAnimals()){ if(list.length>=maxAnimals()) toast(T('full2')); return null; }
      const a=create(kind,{at:[B.x0+1.6,0,PEN.cz+(Math.random()-.5)*1.5],heading:Math.PI/2,baby:!!o.baby,stats:{hunger:.7,thirst:.7,clean:1,happy:.8}}); persist(); sparkles(a.pos.clone().setY(.6),10); audio('pop',{pos:a.pos}); ctx.emit('animal:added',{animal:a}); return a; },
    remove(a){ const i=list.indexOf(a); if(i<0) return; release(a); a.dead=true; scene.remove(a.mesh); scene.remove(a.bubble.sp); a.bubble.tex.dispose(); a.mesh.traverse(o=>o.geometry?.dispose?.()); list.splice(i,1); persist(); },
    price:(k)=>KIND[k]?.price??0, DECAY, SICK_AT,
    totalWeight:()=>list.reduce((s,a)=>s+a.weight,0),
    update:null,
  };

  // ---------------- splash ring for the wash tub ----------------
  const ringMat=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.32,.4,32).rotateX(-Math.PI/2),ringMat); ring.renderOrder=3; ring.visible=false; scene.add(ring); let ringT=-1;
  function splash(){ ringT=0; ring.visible=true; audio('splash',{pos:st.wash.pos,vol:.35}); const w=st.wash; for(let i=0;i<6;i++){ const a=Math.random()*6.28; spawnP(1,w.pos.x+Math.cos(a)*.4,.75,w.pos.z+Math.sin(a)*.4,Math.cos(a)*.6,.9,Math.sin(a)*.6,.8,.16); } }
  function updateSplash(dt){ if(ringT<0) return; ringT+=dt; const u=ringT/.9; const w=st.wash; ring.position.set(w.pos.x,(w.water?.position.y??.58)+.012,w.pos.z); ring.scale.setScalar(1+u*1.6); ringMat.opacity=.85*(1-u); if(u>=1){ ringT=-1; ring.visible=false; } }

  // ---------------- per-frame ----------------
  const bpos={}; // rest positions cache per model are inside model.restLocal
  let saveT=0, camReady=false, focusA=null;
  const playerPos=()=>ctx.cameraRig?.target||ctx.camera.position;
  function stepAI(a,dt){
    const S2=a.stats; const night=isNight();
    // needs
    const sl=a.state==='sleep'?.45:1;
    // gentle needs (about 2.5x slower than before): a full animal stays content for most of an in-game day
    S2.hunger=clamp(S2.hunger-DECAY.hunger*dt*sl); S2.thirst=clamp(S2.thirst-DECAY.thirst*dt*sl); S2.clean=clamp(S2.clean-DECAY.clean*dt*(a.state==='walk'?1.4:1));
    if(a.state==='graze') S2.hunger=clamp(S2.hunger+.0016*dt);
    const tgt=(S2.hunger*.4+S2.thirst*.3+S2.clean*.3);
    S2.happy=clamp(S2.happy+(tgt*.95-S2.happy)*dt*.035 - (Math.min(S2.hunger,S2.thirst)<.2?.01*dt:0));
    // weight (gameplay)
    const K=a.K; if(S2.hunger>.4&&S2.thirst>.3) a.weight=Math.min(K.wMax*1.1,a.weight+K.gain*dt*(.5+S2.happy*.7)*(S2.clean>.25?1:.6)*(a.sick?.3:1)); else if(S2.hunger<.1) a.weight=Math.max(K.w0[0]*.7,a.weight-K.gain*.4*dt);
    a.rewardCd=Math.max(0,a.rewardCd-dt); a.wake=Math.max(0,a.wake-dt); a.shakeT=Math.max(0,a.shakeT-dt); a.petT=Math.max(0,a.petT-dt); a.eatT=Math.max(0,a.eatT-dt); a.reactT=Math.max(0,a.reactT-dt);
    if(S2.happy>.82&&!a.happyEdge){ a.happyEdge=true; } else if(S2.happy<.7) a.happyEdge=false;
    // neglect -> soft 'sick/sad' state (recoverable)
    // only a long, continuous stretch with a need at (almost) zero makes an animal unwell; never on the first two days
    const worst=Math.min(S2.hunger,S2.thirst,S2.clean*1.6);
    if(worst<.06) a.neglect=Math.min(SICK_AT+60,a.neglect+dt); else if(Math.min(S2.hunger,S2.thirst,S2.clean)>.5) a.neglect=Math.max(0,a.neglect-dt*8); else a.neglect=Math.max(0,a.neglect-dt*2);
    if((S.day|0)<=2) a.neglect=Math.min(a.neglect,SICK_AT*.5);
    if(!a.sick&&a.neglect>SICK_AT){ a.sick=true; ctx.emit('animal:sick',{animal:a,pos:evPos(a)}); toast({msg:`${a.name} ${T('sick')}`,icon:'chat',kind:'warn'}); }
    else if(a.sick&&a.neglect<35){ a.sick=false; ctx.emit('animal:recovered',{animal:a,pos:evPos(a)}); toast({msg:`${a.name} ${T('recovered')}`,icon:'heart',kind:'good'}); sparkles(evPos(a),8); }
    if(a.sick) S2.happy=Math.min(S2.happy,.45);
    if(Math.min(S2.hunger,S2.thirst,S2.clean)<.35) a.needy=true; else checkOutcome(a);
    // bathing at the wash tub (slow, uses up the tub)
    if((a.state==='wait'||a.state==='bath')&&a.slot?.st===st.wash){ const w=st.wash; const inTub=a.state==='bath';
      if(w.fill>.01&&S2.clean<1){ const r=(inTub?.06:.035)*dt; S2.clean=clamp(S2.clean+r); w.fill=Math.max(0,w.fill-r*.28); if(Math.random()<dt*(inTub?4:2.5)) bubbles(evPos(a),1); if(inTub&&Math.random()<dt*.6) splash();
        if(S2.clean>.97){ ctx.emit('animal:bathed',{animal:a,pos:evPos(a)}); if(inTub){ startState(a,'bathOut',3); a.hopT=0; splash(); } else { a.shakeT=1.4; release(a); startState(a,'idle',1.5); } } else a.stT=Math.max(a.stT,1); }
      else if(inTub&&a.stT<=0){ startState(a,'bathOut',3); a.hopT=0; } }
    if(a.state==='bath') a.stT-=dt;
    if(a.state==='bathOut'&&a.tubB<.04){ if(st.wash.bather===a) st.wash.bather=null; a.shakeT=1.6; release(a); startState(a,'idle',1.5); }
    a.bleatCd-=dt; if(a.bleatCd<=0){ a.bleatCd=14+Math.random()*30; if(a.state!=='sleep'&&(Math.min(S2.hunger,S2.thirst)<.35||Math.random()<.3)) bleat(a); }
    // state machine
    const reacting=a.petT>0||a.shakeT>0||a.eatT>0&&a.state!=='eat'&&a.state!=='drink'||a.reactT>0;
    switch(a.state){
      case 'walk': { a.stT-=dt; if(!a.target){ a.state='idle'; a.stT=1; break; } const dx=a.target.x-a.pos.x,dz=a.target.z-a.pos.z; if(Math.hypot(dx,dz)<(a.arriveR||.3)||a.stT<=0){ const f=a.after; a.after=null; a.target=null; a.state='idle'; a.stT=.5; if(a.stT<=0&&a.slot) release(a); f?.(); } break; }
      case 'idle': case 'wait': case 'graze': case 'rest': a.stT-=dt; if(a.stT<=0&&!reacting){ if(a.state==='wait') release(a); chooseNext(a); } break;
      case 'hop': a.stT-=dt; if(a.stT<=0){ a.state='idle'; a.stT=.6; } break;
      case 'eat': { const f=a.slot?.st; a.stT-=dt; if(!f||f.fill<=.005||S2.hunger>=.92||a.stT<=0){ release(a); startState(a,'idle',1+Math.random()*2); if(S2.hunger>.8) a.stats.happy=clamp(S2.happy+.05); break; }
        f.fill=Math.max(0,f.fill-.011*dt); S2.hunger=clamp(S2.hunger+.045*dt); S2.happy=clamp(S2.happy+.004*dt); break; }
      case 'drink': { const f=a.slot?.st; a.stT-=dt; if(!f||f.fill<=.005||S2.thirst>=.92||a.stT<=0){ release(a); startState(a,'idle',1+Math.random()*2); break; }
        f.fill=Math.max(0,f.fill-.016*dt); S2.thirst=clamp(S2.thirst+.07*dt); break; }
      case 'sleep': if(!night){ a.bed=false; release(a); startState(a,'idle',1+Math.random()*3); a.wake=0; } else if(a.wake>0){ /* petted: stays asleep, smiling */ } break;
    }
    if(night&&!a.bed&&a.state!=='sleep'&&!reacting){ chooseNext(a); }
    if(!night&&a.bed&&a.state!=='sleep'){ a.bed=false; }
  }

  const tmpA=new V3();
  function move(a,dt){
    if(a.state==='bath'||a.state==='bathOut'){ const w=st.wash; a.tubB=damp(a.tubB??0,a.state==='bath'?1:0,3.2,dt); const p0=a.bathP0||a.pos;
      a.pos.x=lerp(p0.x,w.pos.x,a.tubB); a.pos.z=lerp(p0.z,w.pos.z,a.tubB); a.pos.y=gh(a.pos.x,a.pos.z)+.13*a.tubB+Math.sin(a.tubB*Math.PI)*.25; a.speed=0; return; }
    const walking=a.state==='walk'&&a.target; let want=0;
    const immobile=a.state==='bath'||a.state==='bathOut'||a.state==='sleep'||a.state==='rest'||a.state==='eat'||a.state==='drink'||a.petT>0||a.shakeT>0||a.state==='hop'&&false;
    if(walking&&!immobile){
      let dx=a.target.x-a.pos.x, dz=a.target.z-a.pos.z; const dist=Math.hypot(dx,dz)||1; dx/=dist; dz/=dist; let ax=0,az=0;
      for(const o of list){ if(o===a) continue; const ox=a.pos.x-o.pos.x, oz=a.pos.z-o.pos.z, d=Math.hypot(ox,oz)||.01, r=a.rad+o.rad+.5; if(d<r){ const p=(r-d)/r; ax+=ox/d*p*1.6; az+=oz/d*p*1.6; } }
      for(const o of pen.obstacles){ const ox=a.pos.x-o.x, oz=a.pos.z-o.z, d=Math.hypot(ox,oz)||.01, r=o.r+a.rad+.4; if(d<r){ const p=(r-d)/r; ax+=ox/d*p*2.2; az+=oz/d*p*2.2; } }
      const m=.9; if(a.pos.x<B.x0+m) ax+=1; if(a.pos.x>B.x1-m) ax-=1; if(a.pos.z<B.z0+m) az+=1; if(a.pos.z>B.z1-m) az-=1;
      let vx=dx+ax*1.2, vz=dz+az*1.2; const want_h=Math.atan2(vx,vz); const dh=angDiff(a.heading,want_h);
      a.heading+=clamp(dh,-4.2*dt,4.2*dt);
      want=a.K.speed*clamp(dist/1.0,.35,1)*clamp(1-Math.abs(dh)*.55,.2,1)*(a.runUp?1.5:1)*(a.sick?.6:1);
    }
    a.speed=damp(a.speed,want,want>a.speed?5:7,dt);
    if(a.speed>.02){ a.pos.x+=Math.sin(a.heading)*a.speed*dt; a.pos.z+=Math.cos(a.heading)*a.speed*dt; }
    // hard separation (always)
    for(const o of list){ if(o===a) continue; const ox=a.pos.x-o.pos.x, oz=a.pos.z-o.pos.z, d=Math.hypot(ox,oz)||.01, r=(a.rad+o.rad)*.92; if(d<r){ const push=(r-d); const share=(o.state==='sleep'||o.state==='rest'||o.state==='eat'||o.state==='drink')?1:.5; a.pos.x+=ox/d*push*share*Math.min(1,dt*8); a.pos.z+=oz/d*push*share*Math.min(1,dt*8); } }
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
    a.sleepAmt=damp(a.sleepAmt,asleep?1:(a.state==='rest'?.72:0),(asleep||a.state==='rest')?2.2:5,dt);
    const grazing=a.state==='graze'&&!a.eatT, eating=a.state==='eat'||a.state==='drink';
    const hdTarget = grazing?1:(eating?.42:(a.eatT>0?.5:0));
    a.headDown=damp(a.headDown,hdTarget,7,dt);
    a.ph+=dt*(5.5+a.speed*5.5)*a.walkAmt; const ph=a.ph, w=a.walkAmt, sl=a.sleepAmt, awake=1-sl;
    // blink
    a.blinkT-=dt; if(a.blinkT<=0){ a.blink=.16; a.blinkT=1.8+Math.random()*3.5; if(Math.random()<.2) a.blinkT=.25; }
    a.blink=Math.max(0,a.blink-dt); let eyeY=a.blink>0?.08:(a.sick?.6:1);
    const pettedClose=a.petT>0?Math.min(1,a.petT*3):0; eyeY=Math.min(eyeY,1-pettedClose*.7); eyeY=Math.min(eyeY,1-sl*(asleep?.92:.3));
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
      b.rotation.x=s*.62*w*awake + (i<2?1.35:-1.25)*sl + (i>=2?.08*awake:0); b.rotation.z=(i%2?1:-1)*.12*sl;
      b.position.set(r.x*1.0,r.y-drop+lift*.015*w,r.z);
      b.scale.set(1,lerp(1,.66,sl)*(1-.06*lift*w),1);
      if(a.hopT>=0&&a.hopT>.13&&a.hopT<.5){ b.rotation.x+= (i<2?-.5:.5); } }
    // head / neck
    const hd=a.headDown; const look=Math.sin(t*.6+a.seed*.1)*.12*awake*(1-hd);
    const hb=bn.head, hr=rl.head; const nod=Math.sin(ph*2)*.045*w;
    const petTilt=a.petT>0?Math.sin(t*4)*.12*Math.min(1,a.petT*2):0;
    hb.position.set(hr.x,hr.y-.4*hd*awake-.1*sl+Math.abs(Math.sin(ph))*.01*w,hr.z+.05*hd);
    const chewBob=chewing?Math.sin(t*14+a.ph)*.03:0;
    hb.rotation.set(.95*hd*awake+.4*sl-bleatUp*1.1+nod+chewBob+(a.reactT>0?Math.sin(t*14)*.15:0),look+(a.petT>0?.25*Math.min(1,a.petT*2):0)*Math.sin(t*1.5),petTilt+a.look*.1);
    const hs=inv*(a.baby?1+(1/1.4-1)*a.growE:1); hb.scale.set(hs,hs,hs);
    bn.jaw.rotation.x=jaw*awake; 
    // eyes
    { const F=m.face; if(F){ let eye=a.baby?FACE.eyeBaby:(m.lash?FACE.eyeLash:FACE.eyeOpen), open=1;
        if(asleep&&sl>.45) eye=FACE.eyeSleep; else if(a.petT>0||(a.eatT>0&&S2.happy>.7)||(a.hopT>=0&&S2.happy>.75)||a.state==='bath') eye=FACE.eyeHappy; else if(a.sick||a.state==='rest') eye=FACE.eyeLid; else if(a.blink>0) open=.1;
        F.uEye.value=eye; F.uOpen.value=open; const op=jaw*awake>.12; F.uMouth.value=m.mouthK==='cow'?(op?FACE.mCowOpen:FACE.mCow):(op?FACE.mGoatOpen:FACE.mGoat); } }
    // ears
    const flap=Math.sin(ph*2+1)*.28*w; const idle=Math.sin(t*1.7+a.seed)*.05; const twitch=Math.max(0,Math.sin(t*.9+a.seed*3)-.95)*5;
    const droop=.18*sl+(S2.happy<.35?.18:0)+(a.sick?.4:0)+(a.petT>0?.3:0)-(bleatUp*.8);
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
    if(a.state==='sleep'){ b.sp.visible=false; return; }
    else if(a.petT>0||a.eatT>1.0&&S2.happy>.7) kind='love';
    else if(a.sick&&(t*.25+a.seed)%1<.5) kind='sad';
    else { const m=Math.min(S2.hunger,S2.thirst,S2.clean); if(m<.3){ kind=S2.hunger===m?'hunger':S2.thirst===m?'thirst':'dirty'; } else if(S2.happy>.9&&(t*.2+a.seed)%1<.45) kind='heart'; }
    const showName=a===focusA; const wk=a.weight.toFixed(a.kind==='cow'?0:1);
    const key=kind+'|'+showName+'|'+wk+'|'+(kind==='hunger'||kind==='thirst'||kind==='dirty'?(Math.min(S2.hunger,S2.thirst,S2.clean)<.15?'r':'y'):'');
    if(key!==b.key){ if(key.split('|')[0]!==b.key.split('|')[0]) b.pop=0; b.key=key; drawBubble(a,b,kind,showName); }
    b.pop=Math.min(1,(b.pop??1)+dt/.38); const pp=b.pop, popS=pp>=1?1:(1+Math.sin(pp*Math.PI*1.5)*.0)*(1-Math.pow(1-pp,3)*Math.cos(pp*9)*1);
    const vis=(kind&&dist<26)||showName; b.sp.visible=vis&&a.mesh.visible;
    const bob=Math.sin(t*2.5+a.seed)*.04;
    b.sp.position.set(a.pos.x,a.pos.y+a.model.dims.bubbleY*(a.mesh.scale.x/a.model.S)*(1-a.sleepAmt*.25)+bob+(kind?.0:-.28),a.pos.z);
    const s=clamp(dist*.1,.42,1.15)*Math.max(.01,popS); b.sp.scale.set(1.28*s,1.0*s,1);
    b.mat.opacity=clamp((28-dist)/6,0,1);
  }
  // keep bubbles from overlapping on screen: nearer ones keep their place, farther ones are nudged up
  const _pv=new V3(), _placed=[];
  function deoverlap(){
    const cam=ctx.camera, th=Math.tan(cam.fov*Math.PI/360), vis=list.filter(a=>a.bubble.sp.visible);
    vis.sort((p,q)=>p.bubble.sp.position.distanceToSquared(cam.position)-q.bubble.sp.position.distanceToSquared(cam.position));
    _placed.length=0;
    for(const a of vis){ const sp=a.bubble.sp;
      for(let it=0;it<5;it++){
        const d=Math.max(.5,sp.position.distanceTo(cam.position)); const hN=sp.scale.y*.62/(d*th), wN=sp.scale.x*.5/(d*th*cam.aspect);
        _pv.copy(sp.position); _pv.y+=sp.scale.y*.7; _pv.project(cam);
        const hit=_placed.find(o=>Math.abs(o.x-_pv.x)<(o.w+wN)*.5&&Math.abs(o.y-_pv.y)<(o.h+hN)*.5);
        if(!hit){ _placed.push({x:_pv.x,y:_pv.y,w:wN,h:hN}); break; }
        sp.position.y+=sp.scale.y*.42;
      } }
  }

  api.update=(dt,t)=>{
    pen.update(dt,t);
    { const h=ctx.hour??8; let dh=(h-prevHour+24)%24; prevHour=h; if(dh>3) dh=0; if(growDebug) dh+=dt*growDebug; if(dh>0) for(const a of list.slice()) if(a.baby) grow(a,dh/GROW_HOURS); }
    if(penPop>=0){ penPop+=dt; const u=penPop/.7; pen.root.scale.set(1,u>=1?1:1+Math.sin(u*Math.PI*2.5)*.18*(1-u),1); if(u>=1){ penPop=-1; pen.root.scale.set(1,1,1); } }
    { const p=playerPos(); let bd=4.5; focusA=null; for(const a of list){ const d=Math.hypot(a.pos.x-p.x,a.pos.z-p.z); if(d<bd&&a.state!=='sleep'){ bd=d; focusA=a; } } if(ctx.player?.target?.animal) focusA=ctx.player.target.animal; }
    for(const a of list){ stepAI(a,dt); move(a,dt); pose(a,dt,t); updateBubble(a,dt,t); }
    deoverlap(); updateSplash(dt); updateExtras(dt,t);
    updateParticles(dt,t);
    saveT+=dt; if(saveT>3){ saveT=0; S.pen={feed:st.feed.map(f=>+f.fill.toFixed(3)),water:+st.water.fill.toFixed(3),wash:+st.wash.fill.toFixed(3)}; for(let i=0;i<list.length;i++){ const a=list[i],d=S.animals?.[i]; if(d&&d.seed===a.seed){ d.stats={...a.stats}; d.weight=a.weight; d.neglect=a.neglect; d.sick=a.sick; d.needy=a.needy; d.petDay=a.petDay; d.dayW=a.dayW; d.baby=a.baby; d.growth=a.growth; } else persist(); } }
    if(camParam&&camParam.length>=6&&!camParam.some(Number.isNaN)){ ctx.camera.position.set(camParam[0],camParam[1],camParam[2]); ctx.camera.lookAt(camParam[3],camParam[4],camParam[5]); if(ctx.cameraRig){ try{ ctx.cameraRig.target.set(camParam[3],camParam[4],camParam[5]); }catch(e){} } }
  };
  // ---------------- babies growing up ----------------
  function applyGrowth(a){ const g=a.growth, e=g*g*(3-2*g); a.growE=e; a.mesh.scale.setScalar(lerp(a.babyS,a.adultS,e));
    const K0=a.K0; a.K={...K0, rad:K0.rad*lerp(.62,1,e), reach:K0.reach*lerp(.62,1,e), speed:K0.speed*lerp(1.15,1,e), w0:K0.w0.map(v=>v*lerp(.3,1,e)), wMax:K0.wMax*lerp(.5,1,e), gain:K0.gain*lerp(.5,1,e)}; a.rad=a.K.rad;
    a.weight=Math.max(a.weight,a.K.w0[0]*.9); }
  function grow(a,dg){ a.growth=Math.min(1,a.growth+dg); applyGrowth(a); if(a.growth>=1) growUp(a); }
  function growUp(a){ // swap the baby mesh for the adult one (same seed => same breed colours, same name)
    const old=a.model; const m=buildAnimal(a.kind,a.seed,false,a.breed||null); scene.remove(old.group); old.group.traverse(o=>o.geometry?.dispose?.());
    a.model=m; a.mesh=m.group; m.group.position.copy(a.pos); m.group.rotation.y=a.heading; m.group.userData.animal=a; scene.add(m.group);
    a.baby=false; a.growth=1; a.growE=0; a.K=a.K0; a.rad=a.K.rad; a.babyS=a.adultS=m.S; a.weight=Math.max(a.weight,a.K.w0[0]);
    sparkles(a.pos.clone().setY(.7),12); a.hopT=0; audio('chime',{pos:a.pos,vol:.6}); toast({msg:`${a.name} ${T('grown')}`,icon:'heart',kind:'good'}); ctx.emit('animal:grown',{animal:a,pos:evPos(a)}); persist(); }
  for(const a of list) if(a.baby) applyGrowth(a);
  let prevHour=ctx.hour??8, growDebug=+q.get('grow')||0;

  // ---------------- pen upgrades (progress: 'pen:upgrade' {level}) ----------------
  let penPop=-1;
  function rebuildPen(level){ const lv=penLvlOf(level); if(lv<=pen.level) return false;
    const fills={feed:st.feed.map(f=>f.fill),water:st.water.fill,wash:st.wash.fill};
    for(const a of list){ a.slot=null; a.target=null; a.after=null; a.bed=false; if(a.state!=='sleep'||true){ a.state='idle'; a.stT=.5+Math.random(); } }
    pen.dispose(); pen=buildPen(ctx,lv); B=pen.bounds; st=pen.stations;
    st.feed.forEach((f,i)=>f.fill=fills.feed[i]??.45); st.water.fill=fills.water; st.wash.fill=fills.wash;
    S.animalPenLevel=lv; penPop=0;
    const c=new V3((B.x0+B.x1)/2,1,(B.z0+B.z1)/2); const fx=ctx.modules.fx; fx?.burst?.('confetti',c,60); fx?.burst?.('sparkle',new V3(B.x1-2,1.2,B.z1-2),30);
    for(let i=0;i<16;i++) sparkles(new V3(B.x0+Math.random()*(B.x1-B.x0),.8,B.z0+Math.random()*(B.z1-B.z0)),1);
    audio('build',{pos:c}); setTimeout(()=>audio('chime',{pos:c}),350); toast({msg:T('penUp'),icon:'goat',kind:'good'}); for(const a of list) if(Math.random()<.6){ a.hopT=0; }
    ctx.emit('pen:rebuilt',{level:lv,bounds:{...B}}); return true; }
  ctx.on('pen:upgrade',d=>rebuildPen(d?.level??S.penLevel));
  ctx.on('event:day',d=>{ weather=d?.id||''; if(weather==='hujan'||weather==='panas') for(const a of list) if(a.state==='idle'||a.state==='graze') a.stT=Math.min(a.stT,.5+Math.random()*2); });
  api.rebuildPen=rebuildPen; api.weather=()=>weather;

  // =============== Hewanku roster / portraits / need alerts / highlight / pen routing ===============
  const NEEDS=['hunger','thirst','clean','happy'];
  const r1=(v)=>Math.round(v*10)/10, r3=(v)=>Math.round(clamp(v)*1000)/1000;
  function needOf(a){ if(a.sick) return 'sick'; let best=null, bv=.3; for(const n of NEEDS){ const v=a.stats[n]; if(v<bv){ bv=v; best=n; } } return best; }
  function ageOf(a){ return !a.baby?'adult':(a.growth<.5?'baby':'young'); }
  function entry(a){ const br=a.breed; return { id:a.id, seed:a.seed, name:a.name, kind:a.kind, kindName:KIND_NAMES[a.kind], breed:br, breedName:BREEDS[a.kind]?.[br]||[br,br],
    male:!!a.male, baby:!!a.baby, growth:r3(a.baby?a.growth:1), age:ageOf(a), weight:r1(a.weight), wMax:r1(a.K0.wMax),
    stats:{hunger:r3(a.stats.hunger),thirst:r3(a.stats.thirst),clean:r3(a.stats.clean),happy:r3(a.stats.happy)},
    sick:!!a.sick, sleeping:a.state==='sleep', resting:a.state==='rest', needy:!!a.needy, need:needOf(a), collar:a.model?.collar||'#ff5d8f',
    pos:{x:+a.pos.x.toFixed(2),z:+a.pos.z.toFixed(2)}, state:a.state }; }
  api.KIND_NAMES=KIND_NAMES; api.BREEDS=BREEDS;
  api.roster=()=>list.slice().sort((p,q)=>p.id-q.id).map(entry);
  api.get=(id)=>{ if(id&&typeof id==='object') return list.includes(id)?id:null; id=+id; return list.find(a=>a.id===id)||null; };
  api.needOf=(idOrA)=>{ const a=api.get(idOrA); return a?needOf(a):null; };

  // ---- portraits (2D painted badges, cached dataURLs) ----
  const pCache=new Map();
  function moodOf(a,mood){ if(mood&&mood!=='auto') return mood; if(a.state==='sleep') return 'sleep'; if(a.sick) return 'sick'; if(a.stats.happy>.8) return 'happy'; return 'normal'; }
  api.portrait=(idOrA,{size=128,mood='auto'}={})=>{
    const a=api.get(idOrA); if(!a) return '';
    const md=moodOf(a,mood); const sz=Math.max(24,Math.min(512,size|0||128));
    const key=a.seed+'|'+a.kind+'|'+(a.breed||'')+'|'+(a.baby?1:0)+'|'+md+'|'+sz;
    let u=pCache.get(key); if(u) return u;
    const m=a.model||{};
    try{ u=drawPortrait({kind:a.kind,pal:m.pal,horns:!!m.horns,baby:a.baby,male:a.male,lash:m.lash,eyes:m.eyes,collar:m.collar,seed:a.seed},sz,md); }
    catch(e){ console.warn('portrait failed',e); u=''; }
    if(pCache.size>240) pCache.delete(pCache.keys().next().value);
    if(u) pCache.set(key,u); return u; };
  ctx.on('animal:grown',d=>{ const a=d?.animal; if(!a) return; for(const k of [...pCache.keys()]) if(k.startsWith(a.seed+'|')) pCache.delete(k); });

  // ---- 'animal:need' edge-triggered alerts (threshold .3, re-armed above .5, max 1 per animal / 20s) ----
  let needClock=0;
  function checkNeeds(a){
    const arm=a.needArm||(a.needArm={hunger:true,thirst:true,clean:true,happy:true}); if(a.needLast==null) a.needLast=-1e9;
    if(a.sick&&!a.wasSick){ if(needClock-a.needLast>=20){ a.wasSick=true; a.needLast=needClock; ctx.emit('animal:need',{animal:a,id:a.id,name:a.name,need:'sick',level:r3(Math.min(a.stats.hunger,a.stats.thirst,a.stats.clean))}); } return; }
    if(!a.sick) a.wasSick=false;
    let pick=null, pv=.3;
    for(const n of NEEDS){ const v=a.stats[n]; if(v>.5) arm[n]=true; if(arm[n]&&v<pv){ pv=v; pick=n; } }
    if(pick&&needClock-a.needLast>=20){ arm[pick]=false; a.needLast=needClock; ctx.emit('animal:need',{animal:a,id:a.id,name:a.name,need:pick,level:r3(pv)}); }
  }

  // ---- highlight ring (shared InstancedMesh, 1 draw call only while something is highlighted) ----
  const HL_MAX=8; const hl=[];
  const ringTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    const grd=g.createRadialGradient(64,64,0,64,64,64);
    grd.addColorStop(0,'rgba(255,220,120,0)'); grd.addColorStop(.46,"rgba(255,220,120,.14)"); grd.addColorStop(.62,'rgba(255,236,170,.95)');
    grd.addColorStop(.74,'rgba(255,255,235,1)'); grd.addColorStop(.82,'rgba(255,214,110,.8)'); grd.addColorStop(1,'rgba(255,200,90,0)');
    g.fillStyle=grd; g.fillRect(0,0,128,128);
    g.fillStyle='rgba(255,255,240,.9)'; for(let i=0;i<8;i++){ const an=i/8*Math.PI*2; const x=64+Math.cos(an)*47, y=64+Math.sin(an)*47; g.beginPath(); g.moveTo(x,y-5); g.lineTo(x+1.6,y-1.6); g.lineTo(x+5,y); g.lineTo(x+1.6,y+1.6); g.lineTo(x,y+5); g.lineTo(x-1.6,y+1.6); g.lineTo(x-5,y); g.lineTo(x-1.6,y-1.6); g.fill(); }
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  const hlMat=new THREE.MeshBasicMaterial({map:ringTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,fog:false});
  const hlMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),hlMat,HL_MAX);
  hlMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); hlMesh.count=0; hlMesh.visible=false; hlMesh.frustumCulled=false; hlMesh.renderOrder=4; hlMesh.castShadow=hlMesh.receiveShadow=false; hlMesh.name='animalHighlight';
  hlMesh.setColorAt(0,new THREE.Color(1,1,1)); scene.add(hlMesh);
  const _m4=new THREE.Matrix4(), _q=new THREE.Quaternion(), _s=new V3(), _p=new V3(), _c=new THREE.Color(), _up=new V3(0,1,0);
  api.highlight=(id,seconds=4)=>{ const a=api.get(id); if(!a) return false; const dur=Math.max(.5,+seconds||4);
    let h=hl.find(x=>x.a===a); if(h){ h.dur=h.t+dur; } else { if(hl.length>=HL_MAX) hl.shift(); hl.push({a,t:0,dur}); sparkles(evPos(a).setY(a.pos.y+.3),8); }
    a.reactT=Math.max(a.reactT,.5); if(a.state!=='sleep'&&Math.random()<.6) bleat(a); return true; };
  api.clearHighlight=()=>{ hl.length=0; };
  function updateHighlight(dt,t){
    for(let i=hl.length-1;i>=0;i--){ const h=hl[i]; h.t+=dt; if(h.t>=h.dur||h.a.dead||!list.includes(h.a)) hl.splice(i,1); }
    for(let i=0;i<hl.length;i++){ const h=hl[i], a=h.a;
      const fin=Math.min(1,h.t/.3), fout=Math.min(1,(h.dur-h.t)/.6), al=Math.max(0,Math.min(fin,fout));
      const pop=fin<1?(1-Math.pow(1-fin,3))*(1+.25*Math.sin(fin*Math.PI)):1;
      const base=(a.model?.dims?.len||1)*(a.mesh.scale.x/(a.model?.S||1))*1.25+.55;
      const sz=base*pop*(1+.07*Math.sin(t*5.5+i));
      _p.set(a.pos.x,a.pos.y+.035,a.pos.z); _q.setFromAxisAngle(_up,t*.6+i); _s.set(sz,1,sz);
      hlMesh.setMatrixAt(i,_m4.compose(_p,_q,_s)); hlMesh.setColorAt(i,_c.setRGB(1.7*al,1.35*al,.75*al));
      if(Math.random()<dt*2.2) sparkles(_p.clone().setY(a.pos.y+.15+Math.random()*.4),1); }
    hlMesh.count=hl.length; hlMesh.visible=hl.length>0;
    if(hl.length){ hlMesh.instanceMatrix.needsUpdate=true; if(hlMesh.instanceColor) hlMesh.instanceColor.needsUpdate=true; }
  }
  function updateExtras(dt,t){
    needClock+=dt; for(const a of list) checkNeeds(a);
    updateHighlight(dt,t);
  }

  // ---- route through the pen gate (pushed into ctx.routes; re-reads the bounds every call) ----
  const inPen=(p)=>p.x>B.x0+.15&&p.x<B.x1-.15&&p.z>B.z0+.15&&p.z<B.z1-.15;
  function route(from,to){
    if(!from||!to||!Number.isFinite(from.x)||!Number.isFinite(to.x)) return null;
    const fi=inPen(from), ti=inPen(to); if(fi===ti) return null;
    const gz=(pen.gate?.z)??PEN.cz, gOut={x:B.x0-1.5,z:gz}, gIn={x:B.x0+1.4,z:gz};
    const o=fi?to:from; const around=[];
    if(o.x>B.x0-.6){ // outside point is north/south/east of the pen: walk around the corner first
      const zc=o.z<(B.z0+B.z1)/2?B.z0-1.6:B.z1+1.6;
      if(o.x>B.x1) around.push({x:B.x1+1.6,z:zc});
      around.push({x:B.x0-1.6,z:zc}); }
    const outPath=[...around,gOut,gIn];
    return fi?outPath.reverse():outPath; }
  ctx.routes??=[]; ctx.routes.push(route); api.route=route; api.inPen=inPen;

  // debug / test hooks
  api.debug={ hearts,bubbles,sparkles,spawnP };
  // test env: ?fill=1 fills troughs, ?night forces hour
  if(q.has('night')) ctx.hour=23;
  if(q.get('pen')) rebuildPen(+q.get('pen'));
  if(q.get('weather')) weather=q.get('weather');
  { const P=S.pen||{}; st.feed.forEach((f,i)=>f.fill=P.feed?.[i]??.45); st.water.fill=P.water??.5; st.wash.fill=P.wash??.6; }
  if(q.has('fill')){ st.feed.forEach(f=>f.fill=.8); st.water.fill=.8; st.wash.fill=.9; }
  if(q.has('hungry')) list.forEach(a=>{ a.stats.hunger=.2; a.stats.thirst=.2; a.stats.clean=.15; });
  if(q.has('show')){ // test showcase: freeze animals in a row
    const pose=q.get('show'); list.forEach((a,i)=>{ a.pos.set(20.5+i*2.2,0,8); a.heading=.5; a.state=pose==='sleep'?'sleep':pose==='graze'?'graze':'idle'; a.stT=1e9; a.model.group.position.copy(a.pos);
      if(pose==='bleat'){ a.bleatCd=.3; } if(pose==='hop'){ a.state='hop'; a.stT=1e9; a.hopT=0; } if(pose==='pet') a.petT=1e9; if(pose==='shake') a.shakeT=1e9; if(pose==='eat') a.eatT=1e9; });
    const orig=api.update; api.update=(dt,t)=>{ orig(dt,t); list.forEach(a=>{ if(q.get('show')==='hop'&&a.hopT<0) a.hopT=0; if(q.get('show')==='bleat'&&a.bleatT<=0) a.bleatT=.9; a.stT=1e9; a.petT=q.get('show')==='pet'?1e9:a.petT; }); };
  }
  if(q.get('warp')){ const n=+q.get('warp')*30; for(let i=0;i<n;i++){ ctx.time+=1/30; api.update(1/30,ctx.time); } }
  return api;
}

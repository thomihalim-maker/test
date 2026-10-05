// Placeable decorations: procedural meshes merged per kind (one InstancedMesh per kind), glowing slot markers,
// screen-space tap picking. ~8 draw calls total regardless of how many items are placed.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// lv = Berkah level that unlocks it; price in coins
export const DECOR_KINDS = [
  { id:'pot',      lv:1, price:25, icon:'pot',      r:.38, name:['Pot Bunga','Flower Pot'],          desc:['Bunga warna-warni','Colourful flowers'] },
  { id:'lantern',  lv:2, price:40, icon:'lantern',  r:.25, name:['Lentera','Lantern'],                desc:['Menyala saat malam','Glows at night'] },
  { id:'banner',   lv:3, price:35, icon:'banner',   r:.15, name:['Umbul-umbul','Festive Banner'],     desc:['Berkibar ditiup angin','Flutters in the wind'] },
  { id:'bench',    lv:4, price:60, icon:'bench',    r:.75, name:['Bangku Kayu','Wooden Bench'],       desc:['Tempat jamaah beristirahat','A seat for visitors'] },
  { id:'umbrella', lv:5, price:70, icon:'umbrella', r:.6,  name:['Payung Teduh','Shade Umbrella'],    desc:['Teduh di siang terik','Shade on hot days'] },
  { id:'ketupat',  lv:6, price:55, icon:'ketupat',  r:.5,  name:['Hiasan Ketupat','Ketupat Garland'], desc:['Hiasan hari raya','Festive Eid ornament'] },
];

// Predefined slots around plaza, path, pen and pond (x,z, facing yaw). Kept off the masjid footprint, paths and pen fence.
export const SLOTS = [
  ['p1',-4.6,12.4,Math.PI],['p2',4.6,12.4,Math.PI],['p3',-8.4,10.6,Math.PI*.8],['p4',8.4,10.6,-Math.PI*.8],
  ['p5',-13.6,1.6,Math.PI/2],['p6',13.6,.6,-Math.PI/2],['p7',-13.2,-9.2,Math.PI*.3],['p8',13.2,-9.2,-Math.PI*.3],
  ['p9',-6.8,-13.2,0],['p10',6.8,-13.2,0],['p11',0,-14.4,0],
  ['w1',12.6,8.6,Math.PI],['w2',13.8,3.4,0],['w3',16.6,2.6,0],
  ['k1',21,-1.8,0],['k2',26,-1.8,0],['k3',31,-1.8,0],['k4',21,13.8,Math.PI],['k5',26,13.8,Math.PI],['k6',31,13.8,Math.PI],
  ['k7',35.9,3,-Math.PI/2],['k8',35.9,9,-Math.PI/2],
  ['d1',-19.2,10.6,Math.PI*.6],['d2',-18.8,17,Math.PI*.4],['d3',-28.5,8.5,-Math.PI*.2],['d4',-24,20.5,Math.PI],
];

const C = h => new THREE.Color(h);
function part(g, col, x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1){
  g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), new THREE.Vector3(sx,sy,sz)));
  const n = g.attributes.position.count, a = new Float32Array(n*3);
  const cols = Array.isArray(col) ? col.map(C) : null, c = cols ? null : C(col);
  for(let i=0;i<n;i++){ const cc = cols ? cols[Math.floor(i/3) % cols.length] : c; // per-triangle colours when an array is given
    const k = .9 + .1 * (g.attributes.normal ? Math.max(0, g.attributes.normal.getY(i)) : 1); // a touch of fake top light
    a[i*3]=cc.r*k; a[i*3+1]=cc.g*k; a[i*3+2]=cc.b*k; }
  g.setAttribute('color', new THREE.BufferAttribute(a,3)); return g;
}
const box = (w,h,d) => new THREE.BoxGeometry(w,h,d);
const cyl = (rt,rb,h,s=8,open=false) => new THREE.CylinderGeometry(rt,rb,h,s,1,open);

function build(kind){
  const P = [], glow = [];
  if(kind==='pot'){
    P.push(part(cyl(.34,.24,.42,10),'#c8693a',0,.21), part(new THREE.TorusGeometry(.33,.05,6,14),'#dc8250',0,.42,0,Math.PI/2),
      part(cyl(.3,.3,.04,10),'#6b4426',0,.41), part(new THREE.IcosahedronGeometry(.36,1),'#5fae4a',0,.72,0,0,0,0,1,.85,1),
      part(new THREE.IcosahedronGeometry(.24,1),'#74c55a',.14,.92,.06));
    const fc=['#ff7aa2','#ffd34a','#ffffff','#ff9a3d','#c08bff','#ff7aa2'];
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+.3, r=.3; P.push(part(new THREE.IcosahedronGeometry(.075,0),fc[i],Math.cos(a)*r,.8+(i%2)*.14,Math.sin(a)*r)); }
  } else if(kind==='lantern'){
    P.push(part(cyl(.22,.28,.16,8),'#b9ad98',0,.08), part(box(.11,1.75,.11),'#6b4a2e',0,.96), part(box(.36,.06,.36),'#3d2a1c',0,1.84));
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) P.push(part(box(.035,.42,.035),'#3d2a1c',sx*.16,2.05,sz*.16));
    P.push(part(new THREE.ConeGeometry(.32,.24,4),'#2f8f7e',0,2.38,0,0,Math.PI/4), part(new THREE.IcosahedronGeometry(.05,0),'#ffc83d',0,2.53));
    glow.push(part(box(.26,.36,.26),'#ffffff',0,2.05));
  } else if(kind==='banner'){
    P.push(part(cyl(.045,.06,3.7,6),'#d8b46a',0,1.85));
    for(const y of [.8,1.7,2.6]) P.push(part(cyl(.062,.062,.06,6),'#a8843a',0,y));
    P.push(part(box(.6,.04,.04),'#a8843a',.26,3.55));
    const bc=['#e8483f','#ffffff','#ffc83d','#35b5a5','#e8483f','#ffffff'];
    for(let i=0;i<6;i++) P.push(part(box(.4,.36,.02),bc[i],.3,3.36-i*.36));
    P.push(part(new THREE.ConeGeometry(.2,.4,3),'#ffc83d',.3,1.0,0,Math.PI,0,0,1,1,.1));
  } else if(kind==='bench'){
    P.push(part(box(1.4,.08,.44),'#b07a45',0,.46), part(box(1.4,.3,.06),'#a06a38',0,.78,-.2), part(box(1.4,.05,.07),'#c58a50',0,.95,-.2));
    for(const sx of [-.6,.6]) for(const sz of [-.16,.16]) P.push(part(box(.08,.46,.08),'#6b4a2e',sx,.23,sz));
    for(const sx of [-.66,.66]) P.push(part(box(.07,.06,.4),'#8a5a32',sx,.64,0), part(box(.06,.2,.06),'#6b4a2e',sx,.55,.16));
  } else if(kind==='umbrella'){
    P.push(part(cyl(.04,.04,2.35,6),'#f3ead6',0,1.18), part(new THREE.ConeGeometry(1.2,.55,8,1,true),['#e8483f','#e8483f','#fff6e0','#fff6e0'],0,2.5),
      part(new THREE.IcosahedronGeometry(.07,0),'#ffc83d',0,2.8), part(cyl(.46,.46,.06,14),'#c58a50',0,.72), part(cyl(.06,.1,.7,6),'#8a5a32',0,.36));
    for(const sx of [-.85,.85]) P.push(part(cyl(.19,.17,.42,10),'#35b5a5',sx,.21));
  } else if(kind==='ketupat'){
    for(const sx of [-.75,.75]) P.push(part(box(.1,2.1,.1),'#8a5a32',sx,1.05), part(cyl(.12,.14,.1,6),'#b9ad98',sx,.05));
    P.push(part(box(1.7,.09,.09),'#a06a38',0,2.05));
    const kc=['#8bc34a','#ffd34a','#8bc34a'];
    for(let i=0;i<3;i++){ const x=(i-1)*.5, L=.3+(i%2)*.18;
      P.push(part(box(.015,L,.015),'#e8d2a0',x,2.0-L/2), part(new THREE.OctahedronGeometry(.17,0),kc[i],x,2.0-L-.17,0,0,Math.PI/4,0,1,1.25,1),
        part(new THREE.ConeGeometry(.04,.16,4),'#ffd34a',x,2.0-L-.42,0,Math.PI)); }
  }
  return { geo: mergeGeometries(P), glow: glow.length ? mergeGeometries(glow) : null };
}

export function createDecor(ctx){
  const scene = ctx.scene, gh = (x,z)=>ctx.groundHeight?.(x,z) ?? 0;
  const root = new THREE.Group(); root.name='decor'; scene.add(root);
  const N = SLOTS.length, slotPos = new Map(SLOTS.map(([id,x,z,ry])=>[id,{x,z,ry,y:gh(x,z)}]));
  const mats = {}, meshes = {}, glows = {};
  const glowMat = new THREE.MeshBasicMaterial({ color:'#ffd27a', toneMapped:false });
  for(const k of DECOR_KINDS){
    const { geo, glow } = build(k.id);
    const m = new THREE.MeshLambertMaterial({ vertexColors:true, side: k.id==='umbrella' ? THREE.DoubleSide : THREE.FrontSide });
    const im = new THREE.InstancedMesh(geo, m, N); im.count=0; im.castShadow=true; im.receiveShadow=true; im.frustumCulled=false; root.add(im);
    mats[k.id]=m; meshes[k.id]=im;
    if(glow){ const g = new THREE.InstancedMesh(glow, glowMat, N); g.count=0; g.frustumCulled=false; root.add(g); glows[k.id]=g; }
  }
  // slot markers: flat ring + soft additive beam (2 draw calls, only while placing)
  const ringGeo = new THREE.RingGeometry(.5,.78,32).rotateX(-Math.PI/2);
  const beamGeo = new THREE.CylinderGeometry(.62,.62,1.8,20,1,true).translate(0,.9,0);
  { const n=beamGeo.attributes.position.count, c=new Float32Array(n*4); for(let i=0;i<n;i++){ const y=beamGeo.attributes.position.getY(i); c[i*4]=1; c[i*4+1]=.88; c[i*4+2]=.45; c[i*4+3]=y<.1?.55:0; } beamGeo.setAttribute('color',new THREE.BufferAttribute(c,4)); }
  const ringMat = new THREE.MeshBasicMaterial({ color:'#ffe066', transparent:true, opacity:.9, depthWrite:false, toneMapped:false });
  const beamMat = new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, toneMapped:false });
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, N), beams = new THREE.InstancedMesh(beamGeo, beamMat, N);
  for(const im of [rings,beams]){ im.count=0; im.frustumCulled=false; im.renderOrder=5; root.add(im); }
  let shown = []; // slot ids with markers

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1,1,1), V = new THREE.Vector3(), Y = new THREE.Vector3(0,1,0), SC = new THREE.Vector3();
  let placedList = [], colliders = [], bannerIdx = [];
  function sync(placed){
    placedList = placed.filter(p=>slotPos.has(p.slot) && meshes[p.kind]);
    for(const c of colliders){ const i=ctx.colliders.indexOf(c); if(i>=0) ctx.colliders.splice(i,1); } colliders=[];
    const cnt = {}; bannerIdx = [];
    for(const p of placedList){ const s=slotPos.get(p.slot), im=meshes[p.kind], i=cnt[p.kind]=(cnt[p.kind]||0); cnt[p.kind]++;
      Q.setFromAxisAngle(Y,s.ry); M.compose(V.set(s.x,s.y,s.z),Q,S1); im.setMatrixAt(i,M); if(glows[p.kind]) glows[p.kind].setMatrixAt(i,M);
      if(p.kind==='banner') bannerIdx.push({i,s});
      const r=DECOR_KINDS.find(k=>k.id===p.kind)?.r??.3; const col={x:s.x,z:s.z,r,decor:true}; ctx.colliders.push(col); colliders.push(col); }
    for(const k in meshes){ meshes[k].count=cnt[k]||0; meshes[k].instanceMatrix.needsUpdate=true; if(glows[k]){ glows[k].count=cnt[k]||0; glows[k].instanceMatrix.needsUpdate=true; } }
  }
  function showSlots(ids){
    shown = ids ? ids.filter(id=>slotPos.has(id)) : [];
    shown.forEach((id,i)=>{ const s=slotPos.get(id); M.compose(V.set(s.x,s.y+.04,s.z),Q.identity(),S1); rings.setMatrixAt(i,M); beams.setMatrixAt(i,M); });
    rings.count=beams.count=shown.length; rings.instanceMatrix.needsUpdate=beams.instanceMatrix.needsUpdate=true;
  }
  // nearest shown slot to a screen point (px), within maxPx
  function pick(cx, cy, maxPx=70){
    const r=ctx.canvas.getBoundingClientRect(); let best=null, bd=maxPx;
    for(const id of shown){ const s=slotPos.get(id); V.set(s.x,s.y+.3,s.z).project(ctx.camera); if(V.z>1) continue;
      const sx=r.left+(V.x*.5+.5)*r.width, sy=r.top+(-V.y*.5+.5)*r.height, d=Math.hypot(sx-cx,sy-cy); if(d<bd){ bd=d; best=id; } }
    return best;
  }
  function nearest(ids, p){ let best=null, bd=1e9; for(const id of ids){ const s=slotPos.get(id); if(!s) continue; const d=Math.hypot(s.x-p.x,s.z-p.z); if(d<bd){ bd=d; best=id; } } return best; }
  return {
    root, sync, showSlots, pick, nearest, slotPos, get shown(){ return shown; },
    update(dt,t){
      if(shown.length){ const k=1+Math.sin(t*4)*.08; ringMat.opacity=.65+.3*Math.sin(t*4);
        for(let i=0;i<shown.length;i++){ const s=slotPos.get(shown[i]); M.compose(V.set(s.x,s.y+.04,s.z),Q.identity(),SC.set(k,1,k)); rings.setMatrixAt(i,M); } rings.instanceMatrix.needsUpdate=true; }
      // lantern glow follows night; banners flutter
      const h=ctx.hour??12, night=h<6||h>18 ? 1 : h<7 ? 7-h : h>17 ? h-17 : 0;
      glowMat.color.setRGB(1,.82,.48).multiplyScalar(.55+night*1.6);
      if(bannerIdx.length){ const im=meshes.banner; for(const {i,s} of bannerIdx){ Q.setFromAxisAngle(Y,s.ry+Math.sin(t*1.7+s.x)*.18); M.compose(V.set(s.x,s.y,s.z),Q,S1); im.setMatrixAt(i,M); } im.instanceMatrix.needsUpdate=true; }
    },
  };
}

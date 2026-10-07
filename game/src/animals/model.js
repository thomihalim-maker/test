// Procedural chibi livestock (goat / sheep / cow). One SkinnedMesh per animal (1 draw call) using
// a tiny procedural bone rig + merged vertex-coloured geometry. Everything generated in code.
import * as THREE from 'three';
import { mulberry32, vnoise, furTexture } from './textures.js';
import { FACE, EYE_V, faceAtlas } from './face.js';

export const BONES = ['root','body','head','jaw','earL','earR','eyeL','eyeR','tail','legFL','legFR','legBL','legBR'];
const B = Object.fromEntries(BONES.map((n,i)=>[n,i]));
const V3 = THREE.Vector3, C = (h)=>new THREE.Color(h);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const sstep=(a,b,x)=>{ const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); };

// One material per animal (same shader program; per-animal face uniforms). Face = painted atlas decal (see face.js).
let _fur=null;
export function animalMaterial(){
  _fur??=furTexture();
  const u={ uFace:{value:faceAtlas()}, uEye:{value:FACE.eyeOpen}, uMouth:{value:FACE.mGoat}, uOpen:{value:1} };
  const m=new THREE.MeshStandardMaterial({vertexColors:true,map:_fur,roughness:0.8,metalness:0});
  m.userData.face=u;
  m.onBeforeCompile=(s)=>{
    Object.assign(s.uniforms,u);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float aGlow; attribute vec2 aFUV; attribute float aFM;\nvarying float vGlow; varying vec2 vFUV; varying float vFM;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=aGlow; vFUV=aFUV; vFM=aFM;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      varying float vGlow; varying vec2 vFUV; varying float vFM; uniform sampler2D uFace; uniform float uEye; uniform float uMouth; uniform float uOpen;
      vec4 cellS(float idx, vec2 uv){
        if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) return vec4(0.0);
        float col=mod(idx,${FACE.COLS}.0), row=floor(idx/${FACE.COLS}.0);
        return texture2D(uFace, vec2((col+uv.x)/${FACE.COLS}.0, 1.0-(row+1.0-uv.y)/${FACE.ROWS}.0));
      }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      if(vFM>0.001){
        vec4 c=cellS(${FACE.cheeks}.0,vFUV); diffuseColor.rgb=mix(diffuseColor.rgb,c.rgb,c.a*vFM);
        c=cellS(uMouth,vFUV); diffuseColor.rgb=mix(diffuseColor.rgb,c.rgb,c.a*vFM);
        vec2 e=vFUV; e.y=${EYE_V.toFixed(4)}+(e.y-${EYE_V.toFixed(4)})/max(uOpen,0.07);
        c=cellS(uEye,e); diffuseColor.rgb=mix(diffuseColor.rgb,c.rgb,c.a*vFM);
      }`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float rimF = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.4);
      totalEmissiveRadiance += vec3(1.0,0.80,0.62)*rimF*0.20*(0.4+diffuseColor.rgb) + diffuseColor.rgb*(vGlow*1.7+0.13);`);
  };
  m.customProgramCacheKey=()=>'animalmat2';
  return m;
}

// ---------- mesher: collects transformed geometry into one skinned buffer ----------
class Mesher{
  constructor(){ this.P=[];this.N=[];this.Cc=[];this.G=[];this.U=[];this.F=[];this.FM=[];this.SI=[];this.SW=[];this.I=[];this.n=0; }
  add(geo,o={}){
    const pa=geo.attributes.position, na=geo.attributes.normal, ix=geo.index; const p=new V3(), nn=new V3(), loc=new V3();
    const inv=o.frame?o.frame.clone().invert():null;
    for(let i=0;i<pa.count;i++){
      p.fromBufferAttribute(pa,i); nn.fromBufferAttribute(na,i);
      this.P.push(p.x,p.y,p.z); this.N.push(nn.x,nn.y,nn.z);
      let col;
      if(typeof o.color==='function'){ if(inv) loc.copy(p).applyMatrix4(inv); col=o.color(inv?loc:p,nn); } else col=o.color||C('#ffffff');
      let ao=o.noAo?1:(0.74+0.26*sstep(0.02,0.5,p.y));
      this.Cc.push(col.r*ao,col.g*ao,col.b*ao);
      this.G.push(o.glow||0);
      this.U.push(p.x*2+p.z*0.9, p.y*2.2-p.z*0.4);
      if(o.face){ const f=o.face; const u=((p.x-f.H[0])/(f.hR[0]*FACE.X)+1)/2, v=(p.y-f.H[1]+FACE.Y0*f.hR[1])/((FACE.Y0+FACE.Y1)*f.hR[1]);
        const m=sstep(-.02,.3,(p.z-f.H[2])/f.hR[2])*sstep(.02,.32,nn.z); this.F.push(u,v); this.FM.push(m); }
      else { this.F.push(0,0); this.FM.push(0); }
      if(o.w){ const w=o.w(p); this.SI.push(w[0],w[2]??0,0,0); this.SW.push(w[1],w[3]??0,0,0); }
      else { this.SI.push(o.bone??0,0,0,0); this.SW.push(1,0,0,0); }
    }
    if(ix) for(let i=0;i<ix.count;i++) this.I.push(ix.getX(i)+this.n);
    this.n+=pa.count;
  }
  blob(c,r,o={}){
    const g=new THREE.SphereGeometry(1,o.sw||14,o.sh||10);
    const m=new THREE.Matrix4(); const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot||[0,0,0])));
    m.compose(new V3(...c),q,new V3(...r));
    if(o.frame) m.premultiply(o.frame);
    g.applyMatrix4(m); this.add(g,o); g.dispose();
  }
  tube(pts,radii,o={}){
    const curve=new THREE.CatmullRomCurve3(pts.map(p=>new V3(...p)));
    const seg=o.seg||12, rad=o.rad||8; const frames=curve.computeFrenetFrames(seg,false);
    const pos=[],nor=[],idx=[]; const pr=(t)=>{ const f=t*(radii.length-1); const i=Math.min(radii.length-2,Math.floor(f)); return radii[i]+(radii[i+1]-radii[i])*(f-i); };
    const rings=seg+3; // extra rings to round the tip
    for(let j=0;j<rings;j++){
      let t=Math.min(1,j/seg), r=pr(t), ofs=0;
      if(j>seg){ const k=(j-seg)/2; const a=k*Math.PI/2; r=pr(1)*Math.cos(a); ofs=pr(1)*Math.sin(a); }
      const P=curve.getPointAt(t), T=curve.getTangentAt(t); const Nn=frames.normals[Math.min(j,seg)], Bn=frames.binormals[Math.min(j,seg)];
      for(let i=0;i<=rad;i++){
        const a=i/rad*Math.PI*2, cs=Math.cos(a), sn=Math.sin(a);
        const nx=Nn.x*cs+Bn.x*sn, ny=Nn.y*cs+Bn.y*sn, nz=Nn.z*cs+Bn.z*sn;
        pos.push(P.x+nx*r+T.x*ofs,P.y+ny*r+T.y*ofs,P.z+nz*r+T.z*ofs);
        const cap=j>seg?Math.sin((j-seg)/2*Math.PI/2):0;
        const l=Math.hypot(nx+T.x*cap,ny+T.y*cap,nz+T.z*cap)||1; nor.push((nx+T.x*cap)/l,(ny+T.y*cap)/l,(nz+T.z*cap)/l);
      }
    }
    for(let j=0;j<rings-1;j++) for(let i=0;i<rad;i++){ const a=j*(rad+1)+i,b=a+rad+1; idx.push(a,b,a+1,b,b+1,a+1); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3)); g.setIndex(idx);
    if(o.frame) g.applyMatrix4(o.frame);
    this.add(g,o); g.dispose();
  }
  torus(c,R,r,rotEuler,o={}){
    const g=new THREE.TorusGeometry(R,r,8,22); const m=new THREE.Matrix4().compose(new V3(...c),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotEuler)),new V3(1,1,1));
    g.applyMatrix4(m); this.add(g,o); g.dispose();
  }
  geometry(){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(this.N,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.Cc,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(this.U,2));
    g.setAttribute('aGlow',new THREE.Float32BufferAttribute(this.G,1)); g.setAttribute('aFUV',new THREE.Float32BufferAttribute(this.F,2)); g.setAttribute('aFM',new THREE.Float32BufferAttribute(this.FM,1));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(this.SI,4)); g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(this.SW,4));
    g.setIndex(this.I); return g;
  }
}

function orient(pos,dir,up=new V3(0,1,0)){
  const z=new V3(...dir).normalize(); let x=new V3().crossVectors(up,z); if(x.lengthSq()<1e-4) x.set(1,0,0); x.normalize(); const y=new V3().crossVectors(z,x);
  return new THREE.Matrix4().makeBasis(x,y,z).setPosition(new V3(...pos));
}

// ---------- breed definitions ----------
// i18n names [id,en] (shared contract: ui Hewanku panel)
export const KIND_NAMES={ goat:['Kambing','Goat'], sheep:['Domba','Sheep'], cow:['Sapi','Cow'] };
export const BREEDS={
  goat:{ boer:['Boer','Boer'], kacang:['Kacang','Kacang'], etawa:['Etawa','Etawa'], pied:['Belang','Pied'], golden:['Emas','Golden'] },
  sheep:{ white:['Putih','White'], caramel:['Karamel','Caramel'], lavender:['Lavender','Lavender'], cream:['Krem','Cream'], darkface:['Muka Gelap','Dark-faced'], garut:['Garut','Garut'], grey:['Abu-abu','Grey'] },
  cow:{ holstein:['Holstein','Holstein'], limousin:['Limousin','Limousin'], bali:['Bali','Bali'], brahman:['Brahman','Brahman'], jersey:['Jersey','Jersey'] },
};
const COLLARS=['#ff2e63','#00b8a9','#ffc400','#2f6bff','#9b4dff','#ff7a00','#22c55e','#ff3fa4'];
const NAMES={
  goat:['Bleki','Mbek','Kiki','Cemong','Gembul','Sari','Tuti','Bagas','Upil','Joko','Mocha','Pelangi','Bimo','Lintang','Cokelat'],
  sheep:['Domba','Awan','Kapas','Wolly','Ndut','Melati','Bulu','Salju','Pudding','Cimol','Mochi','Bintang','Gula','Kuncung','Marsmallow'],
  cow:['Si Gendut','Bruno','Mimi','Sapi Mas','Belang','Moo','Dinda','Lembu','Cokro','Bunga','Kirana','Panda','Tompel','Bonbon','Rendang'],
};
export function pickName(kind,rng,used){ const l=NAMES[kind]; for(let i=0;i<30;i++){ const n=l[Math.floor(rng()*l.length)]; if(!used.has(n)){used.add(n);return n;} } const n=l[0]+' '+(used.size+1); used.add(n); return n; }
const pick=(rng,a)=>a[Math.floor(rng()*a.length)];

function goatBreed(rng,force){
  let k=pick(rng,['boer','kacang','etawa','pied','golden','golden']); if(force) k=force;
  switch(k){
    case 'boer': return {k, base:'#f6eee0', belly:'#fffaf0', head:'#b4573a', muzzle:'#e8b9a0', ear:'#a24b32', leg:'#f1e6d3', patches:[], nose:'#6b4a45', beard:'#f6eee0', horn:'#e9ddc2'};
    case 'kacang': return {k, blaze:'#f6e6cc', base:'#8e5f3e', belly:'#efd9b8', head:'#7d5035', muzzle:'#d1a47c', ear:'#6e4630', leg:'#4a3022', patches:[{c:[0,.62,-.05],r:.2,col:'#3e2a1e',sx:3.6,sy:.35,sz:1.7}], nose:'#3a2a26', beard:'#4a3022', horn:'#cdbf9f'};
    case 'etawa': return {k, base:'#e2bf92', belly:'#f6e3c6', head:'#d1a06c', muzzle:'#f2d6b3', ear:'#b98055', leg:'#f6e3c6', patches:[{c:[.2,.5,.1],r:.17,col:'#fff4e2'},{c:[-.15,.55,-.2],r:.15,col:'#8a5a3a'}], nose:'#5a403a', beard:'#e2bf92', horn:'#d8c7a5'};
    case 'pied': return {k, base:'#fbf6ee', belly:'#ffffff', head:'#2f2a2c', muzzle:'#d9c9c3', ear:'#2f2a2c', leg:'#fbf6ee', patches:[{c:[.18,.55,.0],r:.2,col:'#2f2a2c'},{c:[-.2,.45,-.25],r:.17,col:'#3b3236'}], nose:'#e9a4a8', beard:'#2f2a2c', horn:'#e9ddc2'};
    default: return {k:'golden', base:'#eab35a', belly:'#fbe0a0', head:'#e29b3c', muzzle:'#fbe3b0', ear:'#cf8630', leg:'#f3cf86', patches:[{c:[0,.62,-.05],r:.18,col:'#c97a28',sx:3,sy:.4,sz:1.6}], nose:'#8a5a44', beard:'#fbe0a0', horn:'#e7dcc4', tip:'#a85f1c'};
  }
}
function sheepBreed(rng,force){
  let k=pick(rng,['white','caramel','lavender','darkface','garut','cream']); if(force) k=force;
  switch(k){
    case 'white': return {k, wool:'#fff6e6', face:'#f1dccb', ear:'#e6c6b4', leg:'#c9a894', muzzle:'#f8e8dc', nose:'#b07a74', horns:false};
    case 'caramel': return {k, wool:'#e2a766', face:'#f0d2a8', ear:'#d9a870', leg:'#b9824a', muzzle:'#f8e2c0', nose:'#9a6650', horns:false};
    case 'lavender': return {k, wool:'#cdbbf0', face:'#f4e2dc', ear:'#e0b8c4', leg:'#a893cf', muzzle:'#fff0ea', nose:'#c07a8a', horns:false};
    case 'cream': return {k, wool:'#f8ebcf', face:'#e7c9a2', ear:'#dcb68b', leg:'#e0bf95', muzzle:'#f2d9b8', nose:'#b87f78', horns:false};
    case 'darkface': return {k, wool:'#fdf6ea', face:'#b08a6a', ear:'#9a7452', leg:'#8a6648', muzzle:'#c9a584', nose:'#3c2a26', horns:false};
    case 'garut': return {k, wool:'#d9c8ae', face:'#a98462', ear:'#94704f', leg:'#8f6c4f', muzzle:'#c3a07e', nose:'#4b3630', horns:true};
    default: return {k:'grey', wool:'#cfd2d4', face:'#5f5c60', ear:'#55525a', leg:'#55525a', muzzle:'#7b777c', nose:'#2c2a2e', horns:false};
  }
}
function cowBreed(rng,force){
  let k=pick(rng,['holstein','holstein','limousin','bali','brahman','jersey']); if(force) k=force;
  switch(k){
    case 'holstein': { const pt=[]; for(let i=0;i<9;i++) pt.push({c:[(rng()-.5)*.7,.3+rng()*.4,(rng()-.5)*.8],r:.16+rng()*.14,col:rng()<.15?'#6b4a3a':'#2c2a2e'});
      return {k, base:'#fffdf8', belly:'#ffffff', head:'#fffdf8', muzzle:'#f9d3c8', ear:'#2c2a2e', leg:'#fffdf8', patches:pt, nose:'#f2a0a8', horn:'#efe6cf', hump:false, tail:'#2c2a2e'}; }
    case 'limousin': return {k, base:'#c4803f', belly:'#e6b982', head:'#bd7a3a', muzzle:'#f3d5b2', ear:'#a8672f', leg:'#b4712f', patches:[], nose:'#e9a8a0', horn:'#efe6cf', hump:false, tail:'#8e5424'};
    case 'bali': return {k, base:'#b25a35', belly:'#e8c9a6', head:'#a64f2e', muzzle:'#f6e2cc', ear:'#8f4328', leg:'#fff4e2', patches:[{c:[0,.5,-.45],r:.3,col:'#fff6e6'}], nose:'#3e2a26', horn:'#d8cdb4', hump:false, tail:'#3a2218'};
    case 'brahman': return {k, base:'#d9d4ca', belly:'#efece4', head:'#c9c3b8', muzzle:'#e6d6d0', ear:'#b4aea2', leg:'#c9c3b8', patches:[], nose:'#6a5a5a', horn:'#efe6cf', hump:true, tail:'#a29c90'};
    default: return {k:'jersey', base:'#d9a56c', belly:'#f0cfa0', head:'#c88e56', muzzle:'#f2dccb', ear:'#c0834c', leg:'#a8703d', patches:[], nose:'#7a5a50', horn:'#efe6cf', hump:false, tail:'#6b4426'};
  }
}

// ---------- main builder ----------
export function buildAnimal(kind,seed,baby=false,breedK=null){
  const rng=mulberry32(seed|0); const M=new Mesher();
  const br = kind==='goat'?goatBreed(rng,breedK):kind==='sheep'?sheepBreed(rng,breedK):cowBreed(rng,breedK);
  const male=rng()<0.5;
  const collar=C(pick(rng,COLLARS));
  // layout parameters
  const L = kind==='goat'? {S:.95,bR:[.29,.27,.35],hipY:.31,hR:[.225,.2,.205],hdz:.40,hdy:.26,lt:.056,lx:.14,lz:[.2,-.21]}
          : kind==='sheep'?{S:.95,bR:[.27,.25,.33],hipY:.27,hR:[.185,.175,.18],hdz:.40,hdy:.2,lt:.046,lx:.13,lz:[.2,-.2]}
          :                {S:1.3,bR:[.3,.28,.36],hipY:.22,hR:[.27,.24,.25],hdz:.4,hdy:.2,lt:.09,lx:.17,lz:[.2,-.22]};
  if(baby){ L.S*=.6; L.hR=L.hR.map(v=>v*1.4); L.hdy*=1.15; L.hipY*=.8; L.hdz*=1.05; }
  const bodyC=[0,L.hipY+L.bR[1]*.7,0];
  const H=[0,bodyC[1]+L.hdy,L.hdz];                     // head centre
  const neckP=[0,bodyC[1]+L.hdy*.35,L.hdz*.7];          // head pivot
  const rest={ root:[0,0,0], body:[0,bodyC[1],0], head:neckP, jaw:[H[0],H[1]-L.hR[1]*.55,H[2]+L.hR[2]*.35], earL:[-L.hR[0]*.85,H[1]+L.hR[1]*.35,H[2]-.03], earR:[L.hR[0]*.85,H[1]+L.hR[1]*.35,H[2]-.03],
    eyeL:null,eyeR:null, tail:[0,bodyC[1]+L.bR[1]*(kind==='cow'?.7:.55),-L.bR[2]*.93], legFL:[-L.lx,L.hipY+.04,L.lz[0]], legFR:[L.lx,L.hipY+.04,L.lz[0]], legBL:[-L.lx,L.hipY+.04,L.lz[1]], legBR:[L.lx,L.hipY+.04,L.lz[1]] };
  // eye placement on head ellipsoid
  const eyeDir=(s)=>new V3(s*.5,.16,.85).normalize();
  const eyePos=(s)=>{ const d=eyeDir(s); return [H[0]+d.x*L.hR[0]*.93,H[1]+d.y*L.hR[1]*.93,H[2]+d.z*L.hR[2]*.93]; };
  rest.eyeL=eyePos(-1); rest.eyeR=eyePos(1);

  const bodyCol = (()=>{ const base=C(kind==='sheep'?br.wool:br.base), belly=C(kind==='sheep'?br.wool:br.belly), pc=(br.patches||[]).map(p=>({...p,col:C(p.col)}));
    const t=new THREE.Color();
    return (p,n)=>{ t.copy(base); t.lerp(belly,clamp(-n.y*1.3)); for(const q of pc){ const dx=(p.x-q.c[0])/(q.sx||1),dy=(p.y-q.c[1])/(q.sy||1),dz=(p.z-q.c[2])/(q.sz||1);
        const d=Math.sqrt(dx*dx+dy*dy+dz*dz)/q.r+(vnoise(p.x*7+q.r*9,p.y*7,p.z*7)-.5)*.6; t.lerp(q.col,sstep(1.08,.92,d)); } return t.clone(); }; })();
  const flat=(hex)=>C(hex);
  const headC=C(kind==='sheep'?br.face:br.head), muzC=C(br.muzzle), earC=C(br.ear), legC=C(br.leg), noseC=C(br.nose);
  const hoofC=C(kind==='cow'?'#4a3a34':'#3b2c2a');
  const blazeC=br.blaze?C(br.blaze):null;
  const headCol=(p,n)=>{ const c=headC.clone(); if(kind==='cow'&&br.k==='holstein'&&p.x>0.02&&p.y>H[1]-.02) c.lerp(C('#2c2a2e'),sstep(.03,.1,p.x)*.92);
    if(blazeC&&p.z>H[2]){ const w=.035+.04*clamp((H[1]+L.hR[1]-p.y)/L.hR[1]); c.lerp(blazeC,sstep(w+.015,w-.01,Math.abs(p.x-H[0]))); } return c; };
  const S2=(a,b)=>[a[0]*b,a[1]*b,a[2]*b];

  // ---- body ----
  const bR=L.bR;
  if(kind!=='sheep'){
    M.blob(bodyC,bR,{bone:B.body,color:bodyCol,sw:22,sh:16});
    M.blob([0,bodyC[1]+.0,bR[2]*.35],[bR[0]*.94,bR[1]*.93,bR[2]*.62],{bone:B.body,color:bodyCol}); // chest
    M.blob([0,bodyC[1]+.0,-bR[2]*.4],[bR[0]*.94,bR[1]*.95,bR[2]*.62],{bone:B.body,color:bodyCol}); // rump
    if(kind==='cow'&&br.hump) M.blob([0,bodyC[1]+bR[1]*.9,bR[2]*.35],[.15,.14,.2],{bone:B.body,color:bodyCol});
    if(kind==='cow'){ // udder
      M.blob([0,bodyC[1]-bR[1]*.85,-bR[2]*.5],[.1,.07,.09],{bone:B.body,color:C('#f4b6b8')}); }
  } else {
    // sheep: skin core + fluffy wool puffs
    M.blob(bodyC,[bR[0]*.92,bR[1]*.9,bR[2]*.92],{bone:B.body,color:C(br.wool),glow:.05,sw:16,sh:12});
    const N=80, rg=mulberry32(seed*7+1);
    for(let i=0;i<N;i++){
      const y=1-(i+.5)/N*2, r=Math.sqrt(1-y*y), a=i*2.399963;
      let nx=Math.cos(a)*r, ny=y, nz=Math.sin(a)*r;
      const px=bodyC[0]+nx*bR[0]*1.02, py=bodyC[1]+ny*bR[1]*1.05, pz=bodyC[2]+nz*bR[2]*1.1;
      if(ny<-.55) continue; // keep belly clean for legs
      const pr=.08+rg()*.09; const sh=.97+rg()*.06; const wc=C(br.wool).lerp(C('#fff1d6'),.12).multiplyScalar(sh);
      M.blob([px,py,pz],[pr,pr*.95,pr],{bone:B.body,color:wc,glow:.05,sw:9,sh:7});
    }
    // neck ruff (weights blend into head)
    for(let i=0;i<9;i++){ const a=i/9*Math.PI*2; M.blob([Math.cos(a)*.15,H[1]-.05+Math.sin(a)*.1-.02,H[2]-.12],[.1,.1,.1],{bone:B.body,color:C(br.wool),sw:8,sh:6}); }
    // tail puff
    M.blob([0,bodyC[1]+.07,-bR[2]*1.05],[.07,.07,.07],{bone:B.body,color:C(br.wool),sw:8,sh:6});
  }

  // ---- legs ----
  const legCfg=[['legFL',-1,0],['legFR',1,0],['legBL',-1,1],['legBR',1,1]];
  for(const [nm,sx,bk] of legCfg){
    const x=sx*L.lx, z=L.lz[bk], t=L.lt;
    M.tube([[x,L.hipY+.08,z],[x,L.hipY*.55,z+(bk?-.012:.008)],[x,.05,z+(bk?-.0:.01)]],[t*1.5,t*1.05,t*.85],{bone:B[nm],color:legC,seg:8,rad:8});
    M.blob([x,.034,z+.012],[t*1.15,.04,t*1.3],{bone:B[nm],color:hoofC,noAo:false,sw:9,sh:6});
    if(kind==='sheep') M.blob([x,L.hipY+.0,z],[t*3.0,.11,t*3.0],{bone:B.body,color:C(br.wool),sw:9,sh:6});
  }

  // ---- neck ----
  const neckA=new V3(0,bodyC[1]+.02,bR[2]*.5), neckB=new V3(...H); const nd=neckB.clone().sub(neckA); const nl=nd.length(); nd.normalize();
  const neckW=(p)=>{ const t=sstep(.15,.85,clamp(p.clone().sub(neckA).dot(nd)/nl)); return [B.head,t,B.body,1-t]; };
  const neckCol=kind==='sheep'?C(br.wool):(kind==='goat'&&br.k==='boer'?C(br.head):null);
  M.blob([0,(neckA.y+neckB.y)/2,(neckA.z+neckB.z)/2-.02],[L.hR[0]*.78,L.hR[1]*.95,.2],{w:neckW,color:neckCol?neckCol:bodyCol,rot:[-.5,0,0],sw:14,sh:10});

  // ---- head ----
  const hb={bone:B.head};
  const faceO={H,hR:L.hR};
  M.blob(H,L.hR,{...hb,color:headCol,face:faceO,sw:26,sh:20});
  if(kind==='sheep'){
    M.blob([H[0],H[1]-.01,H[2]-.01],[L.hR[0]*1.0,L.hR[1]*1.02,L.hR[2]*1.0],{...hb,color:headCol,face:faceO,sw:22,sh:16});
    // wool fringe cap
    for(let i=0;i<6;i++){ const a=(i/5-.5)*2.2; M.blob([H[0]+Math.sin(a)*.12,H[1]+L.hR[1]*.85,H[2]-.04-Math.abs(a)*.02],[.085,.07,.09],{...hb,color:C(br.wool),sw:8,sh:6}); }
    M.blob([H[0],H[1]+L.hR[1]*.95,H[2]+.06],[.1,.08,.09],{...hb,color:C(br.wool),sw:8,sh:6});
  }
  // muzzle (nose, mouth, cheeks and eyes are painted by the face atlas)
  const mz=kind==='cow'?{r:[.12,.085,.1],dy:-.085,dz:.1}:kind==='sheep'?{r:[.09,.07,.095],dy:-.06,dz:.11}:{r:[.085,.072,.13],dy:-.08,dz:.17};
  if(baby){ mz.r=[mz.r[0]*1.05,mz.r[1]*1.05,mz.r[2]*.75]; mz.dz*=.5; }
  const mzC=[H[0],H[1]+mz.dy,H[2]+L.hR[2]*.55+mz.dz*.55];
  M.blob(mzC,mz.r,{...hb,color:muzC,face:faceO,sw:18,sh:14});
  // ---- ears ----
  for(const s of[-1,1]){
    const eb={bone:s<0?B.earL:B.earR};  const ep=s<0?rest.earL:rest.earR; const o=(x,y,z)=>[ep[0]+x*s,ep[1]+y,ep[2]+z];
    if(kind==='goat'){ // long droopy (boer/etawa) or medium
      const len=br.k==='etawa'?.2:.16;
      M.tube([o(0,0,0),o(.045,-.04,.01),o(.07,-.04-len*.55,.03),o(.075,-.06-len,.035)],[.026,.042,.044,.024],{...eb,color:earC,seg:10,rad:8});
      M.blob(o(.07,-.04-len*.5,.05),[.016,len*.42,.032],{...eb,color:C('#f0b0ae'),rot:[0,0,-s*.08],noAo:true});
    } else if(kind==='sheep'){
      M.blob(o(.08,-.015,0),[.1,.032,.055],{...eb,color:earC,rot:[0,0,-s*.35],sw:12,sh:8});
      M.blob(o(.085,-.025,.012),[.065,.012,.034],{...eb,color:C('#ec9fa0'),rot:[0,0,-s*.35],noAo:true});
    } else {
      M.blob(o(.13,0,0),[.15,.045,.095],{...eb,color:earC,rot:[0,s*.1,-s*.25],sw:12,sh:8});
      M.blob(o(.135,-.008,.012),[.1,.016,.06],{...eb,color:C('#f4a6a8'),rot:[0,s*.1,-s*.25],noAo:true});
    }
  }
  // ---- horns / hair ----
  const hornC=C(br.horn||'#e9ddc2');
  const hornsOn = !baby && (kind==='cow' ? true : kind==='goat' ? (male||rng()<.5) : (br.horns&&male));
  if(hornsOn) for(const s of[-1,1]){
    const o=(x,y,z)=>[H[0]+x*s,H[1]+y,H[2]+z];
    if(kind==='goat') M.tube([o(.075,L.hR[1]*.78,.0),o(.095,L.hR[1]+.1,-.02),o(.115,L.hR[1]+.2,-.07),o(.125,L.hR[1]+.26,-.15)],[.04,.032,.02,.007],{...hb,color:hornC,seg:12,rad:8});
    else if(kind==='cow') M.tube([o(.14,L.hR[1]*.78,-.02),o(.19,L.hR[1]+.0,-.03),o(.22,L.hR[1]+.05,-.02)],[.04,.034,.014],{...hb,color:hornC,seg:8,rad:7});
    else { const pts=[]; for(let i=0;i<=8;i++){ const a=i/8*4.0; pts.push(o(.1+Math.sin(a)*.08+a*.012,L.hR[1]*.55+Math.cos(a)*.09*(1-a*.08)-.02,-.03-Math.sin(a*.5)*.05+Math.cos(a)*.0)); }
      M.tube(pts,[.04,.036,.03,.024,.016,.006],{...hb,color:hornC,seg:16,rad:7}); }
  }
  if(kind==='goat'&&!baby){ // beard + forelock tuft
    const bc=C(br.beard);
    M.tube([[0,mzC[1]-.05,mzC[2]],[0,mzC[1]-.13,mzC[2]-.01],[0,mzC[1]-.2,mzC[2]-.03]],[.03,.024,.006],{bone:B.head,color:bc,seg:8,rad:6});
    M.blob([0,H[1]+L.hR[1]*.9,H[2]+.07],[.06,.045,.07],{...hb,color:C(br.head).lerp(C('#ffffff'),.12),sw:8,sh:6});
  }
  if(kind==='cow'){ M.blob([0,H[1]+L.hR[1]*.92,H[2]+.0],[.09,.05,.08],{...hb,color:C(br.k==='holstein'?'#2c2a2e':br.head).lerp(C('#ffffff'),.1),sw:8,sh:6}); }

  // ---- tail ----
  const tp=rest.tail; const tb={bone:B.tail}; const tt=(x,y,z)=>[tp[0]+x,tp[1]+y,tp[2]+z];
  if(kind==='goat'){ M.tube([tt(0,0,0),tt(0,.08,-.06),tt(0,.19,-.05)],[.065,.055,.022],{...tb,color:C(br.tip||br.head),seg:8,rad:7}); }
  else if(kind==='sheep') M.blob(tt(0,0,-.03),[.07,.07,.07],{...tb,color:C(br.wool),sw:8,sh:6});
  else { M.tube([tt(0,0,0),tt(0,-.17,-.04),tt(0,-.32,-.03)],[.03,.025,.018],{...tb,color:C(br.tail),seg:8,rad:6}); M.blob(tt(0,-.38,-.03),[.07,.1,.07],{...tb,color:C(br.tail).multiplyScalar(.72),sw:8,sh:6}); }

  // ---- collar + bell/tag ----
  const nc=new V3().addVectors(neckA,neckB).multiplyScalar(.5); nc.z+=.0; nc.y-=.0;
  const cAxis=new V3().subVectors(neckB,neckA).normalize(); const cq=new THREE.Quaternion().setFromUnitVectors(new V3(0,0,1),cAxis); const ce=new THREE.Euler().setFromQuaternion(cq);
  const cr=L.hR[0]*.74;
  M.torus([nc.x,nc.y,nc.z],cr,.021,[ce.x,ce.y,ce.z],{w:neckW,color:collar,glow:.05,noAo:true});
  const front=new V3(0,-1,0).applyQuaternion(cq); // hangs at bottom of collar ring
  const tagP=[nc.x,nc.y-cr*.98,nc.z+cr*.18];
  M.blob(tagP,[.044,.044,.012],{bone:B.body,color:C('#ffd24a'),glow:.18,noAo:true,rot:[-.35,0,0],sw:12,sh:8});
  M.blob([tagP[0],tagP[1]-.01,tagP[2]+.012],[.022,.022,.006],{bone:B.body,color:C('#fff2b0'),glow:.5,noAo:true,rot:[-.35,0,0],sw:8,sh:6});
  M.blob([tagP[0],tagP[1]-.075,tagP[2]+.015],[.026,.026,.026],{bone:B.body,color:C('#ffcf40'),glow:.2,noAo:true,sw:8,sh:6});

  // ---- assemble skinned mesh ----
  const geo=M.geometry();
  const bones=BONES.map(n=>{ const b=new THREE.Bone(); b.name=n; return b; });
  const parent={ body:'root', head:'body', jaw:'head', earL:'head', earR:'head', eyeL:'head', eyeR:'head', tail:'body', legFL:'root', legFR:'root', legBL:'root', legBR:'root' };
  const restLocal={};
  BONES.forEach((n,i)=>{ const w=new V3(...rest[n]); let loc=w.clone(); if(parent[n]) loc.sub(new V3(...rest[parent[n]])); bones[i].position.copy(loc); restLocal[n]=loc.clone(); if(parent[n]) bones[B[parent[n]]].add(bones[i]); });
  const mesh=new THREE.SkinnedMesh(geo,animalMaterial());
  mesh.add(bones[0]); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow=true; mesh.receiveShadow=true; mesh.frustumCulled=false;
  const group=new THREE.Group(); group.add(mesh); group.scale.setScalar(L.S);
  const bm={}; BONES.forEach((n,i)=>bm[n]=bones[i]);
  const lash=(kind!=='goat'||!male);
  return { group, mesh, face:mesh.material.userData.face, lash, pal:br, horns:hornsOn, kind, baby,
    eyes:{ open:baby?FACE.eyeBaby:(lash?FACE.eyeLash:FACE.eyeOpen), happy:FACE.eyeHappy, sleep:FACE.eyeSleep, lid:FACE.eyeLid }, mouthK:kind==='cow'?'cow':'goat', bones:bm, restLocal, breed:br.k, male, collar:'#'+collar.getHexString(), S:L.S,
    dims:{ hipY:L.hipY, bodyY:bodyC[1], headTop:H[1]+L.hR[1], tris:(geo.index.count/3)|0, bubbleY:(H[1]+L.hR[1]+.3)*L.S, lx:L.lx, len:bR[2]*2*L.S, rad:bR[0]*L.S } };
}

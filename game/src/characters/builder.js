// Procedural chibi geometry. Each part merges into one BufferGeometry with attributes:
//  color (tone multiplier / fixed color), aSF = (slot, flex weight)
// Slots: 0 fixed, 1 skin, 2 top, 3 bottom, 4 headgear, 5 shoe, 6 accent, 7 hair.
// D = detail factor (1 hi, ~.55 lo LOD). Head parts are authored in head-centre space (head radius .34).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export const SLOT = { FIX:0, SKIN:1, TOP:2, BOT:3, HEAD:4, SHOE:5, ACC:6, HAIR:7 };
const { SKIN, TOP, BOT, HEAD, SHOE, ACC, HAIR } = SLOT;

class GB{
  constructor(){ this.list = []; }
  add(geo, o={}){
    const g = geo.index ? geo : geo; // geometries are freshly created per call
    const [px=0,py=0,pz=0] = o.pos||[]; const [rx=0,ry=0,rz=0] = o.rot||[];
    let sc = o.scale ?? 1; if(typeof sc==='number') sc=[sc,sc,sc];
    _e.set(rx,ry,rz,o.order||'YXZ'); _q.setFromEuler(_e); _p.set(px,py,pz); _s.set(...sc);
    _m.compose(_p,_q,_s); g.applyMatrix4(_m);
    if(o.post) o.post(g);
    const n = g.attributes.position.count;
    const col = new THREE.Color(o.color ?? 0xffffff);
    if(typeof o.tone==='number') col.setRGB(o.tone,o.tone,o.tone,THREE.LinearSRGBColorSpace);
    const ca = new Float32Array(n*3), sf = new Float32Array(n*2), pos = g.attributes.position;
    for(let i=0;i<n;i++){
      ca[i*3]=col.r; ca[i*3+1]=col.g; ca[i*3+2]=col.b; sf[i*2]=o.slot||0;
      sf[i*2+1] = o.flex ? o.flex(pos.getX(i),pos.getY(i),pos.getZ(i)) : 0;
    }
    g.setAttribute('color', new THREE.BufferAttribute(ca,3));
    g.setAttribute('aSF', new THREE.BufferAttribute(sf,2));
    for(const k of Object.keys(g.attributes)) if(!['position','normal','uv','color','aSF'].includes(k)) g.deleteAttribute(k);
    if(!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n*2),2));
    if(!g.index){ const idx=[]; for(let i=0;i<n;i++) idx.push(i); g.setIndex(idx); }
    this.list.push(g); return this;
  }
  build(){ const g = mergeGeometries(this.list,false); g.computeBoundingSphere(); return g; }
}

export function makeKit(D=1){
  const S = (n)=>Math.max(3,Math.round(n*D));
  const sph = (r=1,w=10,h=8)=>new THREE.SphereGeometry(r,S(w),S(h));
  const caps = (r,l,c=3,rad=8)=>new THREE.CapsuleGeometry(r,l,Math.max(1,Math.round(c*D)),S(rad));
  const tor = (r,t,rs=6,ts=16,arc=Math.PI*2)=>new THREE.TorusGeometry(r,t,S(rs),S(ts),arc);
  // lathe through smooth spline; points bottom->top for outward normals
  const lathe = (pts, seg=16, ps=0, pl=Math.PI*2, smooth=true)=>{
    if(pts[0][1]>pts[pts.length-1][1]) pts=pts.slice().reverse();
    let v;
    if(smooth){ const curve = new THREE.SplineCurve(pts.map(p=>new THREE.Vector2(p[0],p[1]))); v = curve.getPoints(Math.max(5,Math.round(pts.length*1.6*D))); }
    else v = pts.map(p=>new THREE.Vector2(p[0],p[1]));
    return new THREE.LatheGeometry(v, S(seg), ps, pl);
  };
  return { S, sph, caps, tor, lathe };
}

const BLUSH = 0xff8f86, IRIS = 0x3a2116, IRIS2 = 0x7b4a2c, WHITE = 0xfffaf3, DARK = 0x2a1a14, GOLD = 0xe8c260;

// ---------------- head (head-centre space) ----------------
export function buildHead(variant=0, D=1){
  const { sph } = makeKit(D); const b = new GB(); const R=.34;
  b.add(sph(R,26,20), {scale:[1.07,.98,1.0], slot:SKIN});
  for(const s of[-1,1]) b.add(sph(.072,8,6), {pos:[s*.357,-.04,-.015], scale:[.5,1.05,.85], slot:SKIN, tone:.93});
  if(variant===0) b.add(sph(.024,8,6), {pos:[0,-.07,.333], scale:[1.1,.8,.7], slot:SKIN, tone:.93});
  else b.add(sph(.036,10,8), {pos:[0,-.066,.326], scale:[1.15,.85,.7], slot:SKIN, tone:.92});
  return b.build();
}
export function buildAcc(kind, D=1){
  const { sph, tor, caps } = makeKit(D); const b = new GB();
  if(kind==='moustache'){ for(const s of[-1,1]) b.add(sph(.05,8,5), {pos:[s*.045,-.09,.318], scale:[1.3,.48,.55], rot:[0,0,s*.3], slot:HAIR}); }
  else if(kind==='beard'){
    b.add(sph(.2,12,8), {pos:[0,-.29,.15], scale:[1.0,.62,.8], slot:HAIR});
    for(const s of[-1,1]) b.add(sph(.1,8,6), {pos:[s*.2,-.2,.17], scale:[.7,1.1,.8], slot:HAIR});
  }
  else if(kind==='goatee') b.add(sph(.05,8,6), {pos:[0,-.215,.29], scale:[1,1.3,.7], slot:HAIR});
  else if(kind==='glasses'){
    for(const s of[-1,1]) b.add(tor(.075,.0105,4,16), {pos:[s*.122,-.02,.335], scale:[1,.92,1], color:0x5a3b22});
    b.add(caps(.008,.05,1,4), {pos:[0,-.01,.34], rot:[0,0,Math.PI/2], color:0x5a3b22});
    for(const s of[-1,1]) b.add(caps(.007,.2,1,4), {pos:[s*.2,-.0,.24], rot:[Math.PI/2,0,s*.35], color:0x5a3b22});
  }
  return b.build();
}

// ---------------- torso (pelvis space, neck at y=.41) ----------------
export function buildTorso(kind, D=1){
  const { sph, caps, lathe, tor } = makeKit(D); const b = new GB(); const zs=.86;
  // short neck stub in shade (chin shadow)
  b.add(lathe([[.078,.37],[.08,.43],[.074,.47],[.002,.475]],12),{slot:SKIN, tone:.8});
  if(kind==='kid'){
    b.add(lathe([[.002,-.04],[.236,-.04],[.236,-.0],[.232,.08],[.225,.16],[.215,.25],[.19,.33],[.12,.39],[.08,.41],[.002,.415]],20),{scale:[1,1,.9], slot:TOP});
    b.add(sph(.2,12,9),{pos:[0,.12,.06], scale:[.95,.8,.75], slot:TOP}); // round belly
    b.add(lathe([[.24,-.045],[.244,-.03],[.24,-.015]],20,0,Math.PI*2,false),{scale:[1,1,.9], slot:ACC});
    b.add(lathe([[.094,.37],[.099,.40],[.09,.43],[.072,.435]],16),{scale:[1,1,.92], slot:TOP, tone:.95});
    b.add(tor(.086,.008,4,18),{pos:[0,.432,0], rot:[Math.PI/2,0,0], scale:[1,.92,1], slot:ACC});
    for(let i=0;i<2;i++) b.add(sph(.016,6,5),{pos:[0,.34-i*.075,.19], color:GOLD});
  } else if(kind==='koko'){
    b.add(lathe([[.002,-.04],[.238,-.04],[.236,-.01],[.205,.06],[.19,.12],[.208,.22],[.214,.29],[.195,.36],[.12,.405],[.08,.42],[.002,.425]],20),{scale:[1,1,zs], slot:TOP});
    // hem band (piping)
    b.add(lathe([[.24,-.045],[.244,-.03],[.24,-.015]],20,0,Math.PI*2,false),{scale:[1,1,zs], slot:ACC});
    // mandarin collar + piping
    b.add(lathe([[.094,.39],[.099,.42],[.09,.455],[.072,.46]],16),{scale:[1,1,.92], slot:TOP, tone:.95});
    b.add(tor(.086,.008,4,18),{pos:[0,.456,0], rot:[Math.PI/2,0,0], scale:[1,.92,1], slot:ACC});
    // placket + piping + gold buttons
    b.add(caps(.022,.25,1,5),{pos:[0,.25,.172], scale:[1,1,.35], slot:TOP, tone:.93});
    for(let i=0;i<3;i++) b.add(sph(.016,6,5),{pos:[0,.36-i*.075,.182], color:GOLD});
    // chest pocket
    if(D>.7) b.add(caps(.04,.02,1,6),{pos:[-.1,.23,.168], rot:[0,0,Math.PI/2], scale:[1,.9,.22], slot:TOP, tone:.9});
    if(D>.7) b.add(caps(.004,.065,1,4),{pos:[-.1,.258,.174], rot:[0,0,Math.PI/2], slot:ACC});
  } else { // gamis top (long tunic to hips, belt)
    b.add(lathe([[.002,-.04],[.23,-.04],[.215,.02],[.18,.12],[.2,.22],[.212,.29],[.195,.36],[.12,.405],[.08,.42],[.002,.425]],20),{scale:[1,1,zs], slot:TOP});
    b.add(lathe([[.18,.1],[.19,.115],[.19,.14],[.18,.155]],20,0,Math.PI*2,false),{scale:[1.04,1,zs*1.04], slot:ACC});
    b.add(sph(.022,6,5),{pos:[0,.128,.17], color:GOLD});
  }
  return b.build();
}
// sajadah folded over the left shoulder (readable colour accent in crowds)
export function buildSash(D=1){
  const { caps } = makeKit(D); const b = new GB();
  const box = (w,h,d)=>new THREE.BoxGeometry(w,h,d,1,Math.max(1,Math.round(3*D)),1);
  b.add(box(.12,.26,.022),{pos:[.105,.25,.19], rot:[-.12,0,0], slot:ACC});
  b.add(box(.12,.3,.022),{pos:[.105,.23,-.19], rot:[.12,0,0], slot:ACC});
  b.add(caps(.06,.0,2,8),{pos:[.105,.395,0], rot:[Math.PI/2,0,0], scale:[1,3.1,.4], slot:ACC});
  for(const z of[.2,-.2]) b.add(box(.124,.02,.026),{pos:[.105,.15,z*1.0], rot:[z>0?-.12:.12,0,0], slot:ACC, tone:.65});
  return b.build();
}
// ---------------- limbs ----------------
export function buildArm(D=1){
  const { sph, lathe, tor } = makeKit(D); const b = new GB();
  b.add(lathe([[.002,.035],[.055,.03],[.064,0],[.06,-.1],[.054,-.2],[.052,-.215]],10),{slot:TOP});
  b.add(tor(.052,.008,3,12),{pos:[0,-.212,0], rot:[Math.PI/2,0,0], slot:ACC});
  b.add(sph(1,10,8),{pos:[0,-.278,.004], scale:[.056,.064,.05], slot:SKIN});
  return b.build();
}
export function buildThigh(D=1){
  const { caps } = makeKit(D); const b = new GB();
  b.add(caps(.06,.13,2,8),{pos:[0,-.095,0], slot:BOT});
  return b.build();
}
export function buildShin(D=1){
  const { caps, sph, tor } = makeKit(D); const b = new GB();
  b.add(caps(.043,.12,2,8),{pos:[0,-.08,0], slot:SKIN});
  b.add(sph(1,10,6),{pos:[0,-.178,.032], scale:[.055,.04,.085], slot:SKIN});
  b.add(sph(1,12,6),{pos:[0,-.2,.034], scale:[.066,.022,.105], slot:SHOE});
  b.add(tor(.05,.013,4,10,Math.PI),{pos:[0,-.188,.05], rot:[0,Math.PI/2,0], scale:[1,.75,1.1], slot:SHOE, tone:.75});
  return b.build();
}
export function buildSarong(D=1){
  const { lathe, tor, sph } = makeKit(D); const b = new GB();
  const flex = (x,y)=>Math.pow(Math.max(0,(.06-y)/.33),1.5);
  b.add(lathe([[.185,.065],[.2,.0],[.226,-.1],[.25,-.2],[.266,-.27],[.262,-.278]],22),{slot:BOT, flex, scale:[1,1,.9]});
  // overlap fold flap (front-left)
  b.add(lathe([[.2,.0],[.206,-.03],[.234,-.1],[.258,-.2],[.274,-.272]],3,.12,.3),{slot:BOT, tone:.88, flex, scale:[1,1,.9]});
  const darkUV = (g)=>{ const u=g.attributes.uv; for(let i=0;i<u.count;i++) u.setXY(i,.04+(i%7)*.004,.05); };
  b.add(lathe([[.185,.06],[.17,.14],[.16,.24],[.13,.3],[.002,.31]],18),{scale:[.95,1,.8], slot:BOT, post:darkUV});
  return b.build();
}
export function buildSkirt(D=1){
  const { lathe } = makeKit(D); const b = new GB();
  const flex = (x,y)=>Math.pow(Math.max(0,(.06-y)/.42),1.4);
  b.add(lathe([[.2,.06],[.21,-.02],[.245,-.12],[.29,-.23],[.33,-.35],[.334,-.36]],22),{slot:BOT, flex, scale:[1,1,.95]});
  b.add(lathe([[.33,-.33],[.338,-.345],[.335,-.362]],22,0,Math.PI*2,false),{slot:ACC, flex, scale:[1,1,.95]});
  // hip bridge: hidden under the tunic when upright, closes the back when bowing
  b.add(lathe([[.2,.04],[.18,.14],[.165,.24],[.13,.3],[.002,.31]],18),{scale:[.95,1,.8], slot:BOT});
  return b.build();
}

// ---------------- headgear / hair (head-centre space) ----------------
// push vertices matching fn() under the skin (radius r) -> clean openings without hard cut edges
function tuck(g, fn, r=.315){
  const p = g.attributes.position;
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i); if(fn(x,y,z)){ const k=r/Math.max(1e-4,Math.hypot(x,y,z)); p.setXYZ(i,x*k,y*k,z*k); } }
  return g;
}
const earTuck = (x,y,z)=> Math.abs(x)>.2 && (((z+.005)/.125)**2 + ((y+.035)/.115)**2 < 1 || (y<-.08 && z>-.06));
function hairBack(b, D, R, slot){
  const { S } = makeKit(D);
  // back + sides down over the nape; ear region tucked so ears sit on skin
  const g = new THREE.SphereGeometry(R*1.045,S(30),S(22),Math.PI/2+1.25,Math.PI*2-2.5,0,Math.PI*.8);
  b.add(tuck(g,(x,y,z)=>earTuck(x,y,z) || (y<-.26 && z>-.05)),{scale:[1.08,1.0,1.03], pos:[0,0,-.012], slot});
  b.add(new THREE.SphereGeometry(R*1.045,S(22),S(6),0,Math.PI*2,0,Math.PI*.3),{scale:[1.08,1.0,1.03], pos:[0,0,-.012], slot});
}
// hijab shell: soft crown point, tapers to the jaw, wide oval face opening, wraps under the chin (~y -.36)
function hijabShell(b, D, R, sport){
  const { S, sph } = makeKit(D);
  const g = new THREE.SphereGeometry(R*1.08,S(32),S(24));
  const p = g.attributes.position, RR=R*1.08;
  const yc=-.075, ea=.272, eb=.272;
  for(let i=0;i<p.count;i++){ let x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const e = (x/ea)**2 + ((y-yc)/eb)**2;
    if(z>0 && e<1.0){ const k=.315/Math.hypot(x,y,z); x*=k; y*=k; z*=k; }
    else {
      const up = Math.max(0,y/RR), dn = Math.max(0,-y/RR);
      y += .055*up*up*up*(1-Math.abs(x)/RR*.6);            // soft crown point
      const t = 1-.2*dn*dn;                                 // taper toward the jaw
      x*=t; z = z>0 ? z*(1-.08*dn) : z*t;
    }
    p.setXYZ(i,x,y,z); }
  g.computeVertexNormals();
  b.add(g,{scale:[1.06,1.03,1.04], slot:HEAD});
  // ciput: forehead-only band following the opening rim (~.9pi arc), slightly darker
  const pts=[]; const N=Math.max(8,Math.round(18*D));
  for(let i=0;i<=N;i++){ const a=Math.PI*(.05+.9*i/N); const x=Math.cos(a)*ea*1.02, y=yc+Math.sin(a)*eb*1.02;
    const z=Math.sqrt(Math.max(0,RR*RR-x*x-y*y)); pts.push(new THREE.Vector3(x*1.06,y*1.03,z*1.04+.004)); }
  b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),S(28),.024,S(6),false),{slot:HEAD, tone:.82});
  // chin wrap below the mouth, blending into the drape
  b.add(sph(.2,14,8),{pos:[0,-.33,.13], scale:[1.25,.62,.95], slot:HEAD, tone:.97});
  if(sport) b.add(sph(.2,14,6),{pos:[0,.17,.29], scale:[1.0,.2,.6], rot:[.35,0,0], slot:HEAD, tone:.9}); // bergo visor
}
export function buildHat(kind, D=1){
  const { S, sph, lathe, tor } = makeKit(D); const b = new GB(); const R=.34;
  if(kind==='peci'){
    hairBack(b,D,R,HAIR);
    for(const s of[-1,1]) b.add(sph(.06,6,5),{pos:[s*.33,.07,.07], scale:[.45,1.0,.8], slot:HAIR}); // sideburns
    // straight-sided, slightly tapered flat-top songkok, slight back tilt (lifted clear of hair: no z-fight)
    const pts=[[.302,.085],[.307,.12],[.289,.336],[.282,.347],[.269,.353],[.002,.355]].map(p=>new THREE.Vector2(p[0],p[1]));
    b.add(new THREE.LatheGeometry(pts,S(26)),{rot:[-.09,0,0], pos:[0,.004,-.012], scale:[1.07,1,1.02], slot:HEAD});
  } else if(kind==='kopiah'){
    hairBack(b,D,R,HAIR);
    b.add(new THREE.SphereGeometry(R*1.06,S(20),S(9),0,Math.PI*2,0,Math.PI*.46),{scale:[1.07,.9,1.04],pos:[0,.06,-.012], rot:[-.08,0,0], slot:HEAD});
    for(const [y,r] of [[.135,.335],[.2,.295],[.255,.24]]) b.add(tor(r,.011,3,S(22)),{pos:[0,y+.012,-.012-(y-.13)*.08], rot:[Math.PI/2-.08,0,0], scale:[1.07,1.03,1], slot:HEAD, tone:.84});
  } else if(kind==='hijab' || kind==='hijabSport'){
    hijabShell(b,D,R,kind==='hijabSport');
  } else if(kind==='hairKid'){
    hairBack(b,D,R,HAIR);
    b.add(new THREE.SphereGeometry(R*1.05,S(18),S(8),0,Math.PI*2,0,Math.PI*.33),{scale:[1.08,1,1.03],pos:[0,0,-.012], slot:HAIR});
    b.add(sph(.18,10,6),{pos:[.05,.2,.21], scale:[1.15,.42,.5], rot:[.55,0,-.2], slot:HAIR});
    b.add(sph(.07,7,5),{pos:[.02,.36,.02], scale:[.7,1.2,.7], rot:[0,0,-.4], slot:HAIR});
  } else { // hairShort
    hairBack(b,D,R,HAIR);
    b.add(new THREE.SphereGeometry(R*1.05,S(18),S(8),0,Math.PI*2,0,Math.PI*.35),{scale:[1.08,1,1.03],pos:[0,0,-.012], slot:HAIR});
    b.add(sph(.2,10,6),{pos:[-.06,.19,.21], scale:[1.2,.4,.5], rot:[.5,0,.25], slot:HAIR});
  }
  return b.build();
}
// hijab drapes live in the CHEST frame (so head turns don't swing the cloth). neck ~ y .385..
export function buildDrape(kind, D=1){
  const { lathe, sph } = makeKit(D); const b = new GB();
  const flex = (x,y)=>Math.pow(Math.max(0,(.38-y)/.5),1.6)*.6;
  if(kind==='long'){        // khimar: cape to the hips, covers the arms
    b.add(lathe([[.15,.52],[.24,.46],[.31,.36],[.34,.2],[.36,.02],[.37,-.06],[.33,-.075],[.002,-.08]],22),{scale:[1,1,.9], slot:HEAD, tone:.96, flex});
  } else if(kind==='sport'){ // instant bergo: short rounded bib
    b.add(lathe([[.15,.52],[.23,.47],[.27,.38],[.24,.3],[.14,.26],[.002,.255]],20),{scale:[1,1,.92], slot:HEAD, tone:.96});
  } else {                   // standard / pashmina: over shoulders to mid chest
    b.add(lathe([[.15,.52],[.24,.46],[.3,.37],[.3,.26],[.25,.16],[.12,.12],[.002,.115]],22),{scale:[1,1,.9], slot:HEAD, tone:.96});
    if(kind==='pashmina'){
      const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d,1,Math.max(1,Math.round(4*D)),1);
      b.add(box(.12,.42,.035),{pos:[-.15,.24,.22], rot:[-.25,0,.28], slot:HEAD, tone:.9});
      b.add(sph(.07,8,6),{pos:[-.2,.03,.25], scale:[1,.5,.4], slot:HEAD, tone:.88});
    }
  }
  return b.build();
}
export function buildBlob(){ return new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2); }

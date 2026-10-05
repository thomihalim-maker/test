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
  b.add(sph(R,26,18), {scale:[1.07,.98,1.0], slot:SKIN});
  for(const s of[-1,1]) b.add(sph(.065,8,6), {pos:[s*.358,-.03,-.01], scale:[.55,1,.85], slot:SKIN, tone:.95});
  if(variant===0) b.add(sph(.026,8,6), {pos:[0,-.075,.336], scale:[1.1,.8,.8], slot:SKIN, tone:.9});
  else b.add(sph(.042,10,8), {pos:[0,-.07,.33], scale:[1.15,.85,.8], slot:SKIN, tone:.9});
  for(const s of[-1,1]) b.add(sph(.064,8,5), {pos:[s*.205,-.115,.262], scale:[1.25,.72,.32], rot:[0,-s*.55,0], color:BLUSH});
  return b.build();
}
// open eyes; shape 0 round, 1 tall-oval, 2 gentle (upper lid)
export function buildEyes(shape=0, D=1){
  const { sph, caps, tor } = makeKit(D); const b = new GB(); const y0=-.02;
  for(const s of[-1,1]){
    const x=s*.122;
    if(shape===0){
      b.add(sph(1,14,10), {pos:[x,y0,.296], scale:[.074,.088,.03], color:WHITE});
      b.add(sph(1,12,10), {pos:[x+s*-.004,y0-.008,.305], scale:[.06,.074,.026], color:IRIS});
      b.add(sph(1,10,8), {pos:[x+s*-.004,y0-.03,.318], scale:[.042,.036,.014], color:IRIS2});
      b.add(caps(.0095,.07,1,4), {pos:[x,y0+.125,.305], rot:[0,0,Math.PI/2-s*.18], slot:HAIR});
    } else if(shape===1){
      b.add(sph(1,14,10), {pos:[x,y0,.296], scale:[.06,.094,.03], color:WHITE});
      b.add(sph(1,12,10), {pos:[x,y0-.006,.306], scale:[.046,.082,.026], color:IRIS});
      b.add(sph(1,10,8), {pos:[x,y0-.035,.318], scale:[.03,.032,.013], color:IRIS2});
      b.add(tor(.05,.0095,4,10,Math.PI*.8), {pos:[x,y0+.09,.3], rot:[0,0,Math.PI*.1], slot:HAIR});
    } else {
      b.add(sph(1,14,10), {pos:[x,y0-.01,.296], scale:[.072,.078,.03], color:WHITE});
      b.add(sph(1,12,10), {pos:[x,y0-.016,.305], scale:[.058,.066,.026], color:IRIS});
      b.add(sph(1,12,8,), {pos:[x,y0+.04,.3], scale:[.085,.05,.036], slot:SKIN, tone:.97}); // lid
      b.add(caps(.012,.07,1,4), {pos:[x,y0+.115,.305], rot:[0,0,Math.PI/2+s*.06], slot:HAIR});
    }
    b.add(sph(.024,6,5), {pos:[x+s*.02,y0+.028,.325], scale:[1,1,.45], color:0xffffff});
    b.add(sph(.011,5,4), {pos:[x-s*.022,y0-.04,.326], scale:[1,1,.45], color:0xffffff});
  }
  return b.build();
}
export function buildClosedEyes(kind='happy', D=1){
  const { tor, caps } = makeKit(D); const b = new GB(); const y0=-.02;
  for(const s of[-1,1]){
    const x=s*.122;
    if(kind==='happy') b.add(tor(.045,.0115,4,10,Math.PI), {pos:[x,y0-.02,.315], color:DARK});
    else b.add(tor(.048,.011,4,10,Math.PI), {pos:[x,y0+.01,.315], rot:[0,0,Math.PI], color:DARK});
    b.add(caps(.0095,.07,1,4), {pos:[x,y0+.12,.305], rot:[0,0,Math.PI/2-s*.18], slot:HAIR});
  }
  return b.build();
}
export function buildMouth(kind='smile', D=1){
  const { sph, tor, caps } = makeKit(D); const b = new GB(); const y=-.12;
  if(kind==='smile') b.add(tor(.048,.0105,4,10,Math.PI), {pos:[0,y,.326], rot:[0,0,Math.PI], color:0x7a3028});
  else if(kind==='open'){
    b.add(sph(.05,10,6), {pos:[0,y-.018,.303], scale:[1,.95,.36], color:0x5a1e1e});
    b.add(sph(.028,6,4), {pos:[0,y-.036,.318], scale:[1.15,.6,.3], color:0xe8707a});
  } else if(kind==='o') b.add(sph(.028,8,6), {pos:[0,y-.01,.318], scale:[1,1.15,.4], color:0x5a1e1e});
  else b.add(caps(.009,.04,1,4), {pos:[0,y,.326], rot:[0,0,Math.PI/2], color:0x7a3028});
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
  else if(kind==='freckles'){
    for(const s of[-1,1]) for(const [dx,dy] of [[-.03,.01],[.01,.025],[.03,-.012],[-.005,-.02]])
      b.add(sph(.0085,4,3), {pos:[s*(.2+dx),-.085+dy,.282-Math.abs(dx)*.6], scale:[1,1,.4], color:0xa8643e});
  }
  return b.build();
}

// ---------------- torso (pelvis space, neck at y=.41) ----------------
export function buildTorso(kind, D=1){
  const { sph, caps, lathe, tor } = makeKit(D); const b = new GB(); const zs=.86;
  if(kind==='koko'){
    b.add(lathe([[.002,-.04],[.238,-.04],[.236,-.01],[.205,.06],[.19,.12],[.208,.22],[.214,.29],[.195,.36],[.12,.405],[.08,.42],[.002,.425]],20),{scale:[1,1,zs], slot:TOP});
    // hem band (piping)
    b.add(lathe([[.24,-.045],[.244,-.03],[.24,-.015]],20,0,Math.PI*2,false),{scale:[1,1,zs], slot:ACC});
    // side slits (dark notches)
    for(const s of[-1,1]) b.add(caps(.007,.05,1,4),{pos:[s*.238,-.005,0], slot:TOP, tone:.45});
    // mandarin collar + piping
    b.add(lathe([[.094,.39],[.099,.42],[.09,.455],[.072,.46]],16),{scale:[1,1,.92], slot:TOP, tone:.95});
    b.add(tor(.086,.008,4,18),{pos:[0,.456,0], rot:[Math.PI/2,0,0], scale:[1,.92,1], slot:ACC});
    // placket + piping + gold buttons
    b.add(caps(.022,.25,1,5),{pos:[0,.25,.172], scale:[1,1,.35], slot:TOP, tone:.93});
    for(const s of[-1,1]) b.add(caps(.0055,.25,1,4),{pos:[s*.021,.25,.176], slot:ACC});
    for(let i=0;i<3;i++) b.add(sph(.016,6,5),{pos:[0,.36-i*.075,.182], color:GOLD});
    // chest pocket
    b.add(caps(.04,.02,1,6),{pos:[-.1,.23,.168], rot:[0,0,Math.PI/2], scale:[1,.9,.22], slot:TOP, tone:.9});
    b.add(caps(.004,.065,1,4),{pos:[-.1,.258,.174], rot:[0,0,Math.PI/2], slot:ACC});
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
  b.add(tor(.053,.012,4,12),{pos:[0,-.212,0], rot:[Math.PI/2,0,0], slot:ACC});
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
  b.add(lathe([[.207,.065],[.212,.0],[.228,-.1],[.25,-.2],[.266,-.27],[.262,-.278]],22),{slot:BOT, flex, scale:[1,1,.93]});
  // overlap fold flap (front-left)
  b.add(lathe([[.215,.04],[.219,0],[.236,-.1],[.258,-.2],[.274,-.272]],3,.12,.3),{slot:BOT, tone:.88, flex, scale:[1,1,.93]});
  b.add(new THREE.CircleGeometry(.21,Math.max(6,Math.round(16*D))).rotateX(-Math.PI/2),{pos:[0,.06,0], scale:[1,1,.93], slot:BOT, tone:.8});
  // rolled waistband
  b.add(tor(.214,.03,5,22),{pos:[0,.05,0], rot:[Math.PI/2,0,0], scale:[1,.93,1], slot:BOT, tone:.78});
  return b.build();
}
export function buildSkirt(D=1){
  const { lathe } = makeKit(D); const b = new GB();
  const flex = (x,y)=>Math.pow(Math.max(0,(.06-y)/.42),1.4);
  b.add(lathe([[.2,.06],[.21,-.02],[.245,-.12],[.29,-.23],[.33,-.35],[.334,-.36]],22),{slot:BOT, flex, scale:[1,1,.95]});
  b.add(lathe([[.33,-.33],[.338,-.345],[.335,-.362]],22,0,Math.PI*2,false),{slot:ACC, flex, scale:[1,1,.95]});
  b.add(new THREE.CircleGeometry(.21,Math.max(6,Math.round(14*D))).rotateX(-Math.PI/2),{pos:[0,.06,0], scale:[1,1,.95], slot:BOT});
  return b.build();
}

// ---------------- headgear / hair (head-centre space) ----------------
function hairBack(b, D, R, slot){
  const { S } = makeKit(D);
  // back + sides down to nape, front left open for the face
  b.add(new THREE.SphereGeometry(R*1.045,S(18),S(12),Math.PI/2+1.0,Math.PI*2-2.0,0,Math.PI*.66),{scale:[1.08,1.0,1.03], pos:[0,0,-.012], slot});
}
export function buildHat(kind, D=1){
  const { S, sph, lathe, tor } = makeKit(D); const b = new GB(); const R=.34;
  if(kind==='peci'){
    hairBack(b,D,R,HAIR);
    for(const s of[-1,1]) b.add(sph(.06,6,5),{pos:[s*.33,.03,.06], scale:[.5,1.2,.9], slot:HAIR}); // sideburns
    // straight-sided, slightly tapered flat-top songkok, back tilt
    const pts=[[.302,.135],[.3,.15],[.276,.335],[.268,.348],[.24,.352],[.002,.352]].map(p=>new THREE.Vector2(p[0],p[1]));
    b.add(new THREE.LatheGeometry(pts,S(24)),{rot:[-.1,0,0], pos:[0,-.005,-.01], scale:[1.06,1,1.0], slot:HEAD});
    b.add(new THREE.LatheGeometry([[.002,.1],[.29,.1],[.302,.135]].map(p=>new THREE.Vector2(p[0],p[1])),S(24)),{rot:[-.1,0,0], pos:[0,-.005,-.01], scale:[1.06,1,1.0], slot:HEAD, tone:.7});
    b.add(tor(.3,.006,3,S(24)),{rot:[Math.PI/2-.1,0,0], pos:[0,.163,-.025], scale:[1.06,1,1], slot:HEAD, tone:1.6});
  } else if(kind==='kopiah'){
    hairBack(b,D,R,HAIR);
    b.add(new THREE.SphereGeometry(R*1.05,S(20),S(9),0,Math.PI*2,0,Math.PI*.46),{scale:[1.07,.9,1.04],pos:[0,.06,-.012], rot:[-.08,0,0], slot:HEAD});
    for(const [y,r] of [[.135,.33],[.2,.29],[.255,.235]]) b.add(tor(r,.011,3,S(22)),{pos:[0,y+.01,-.012-(y-.13)*.08], rot:[Math.PI/2-.08,0,0], scale:[1.07,1.03,1], slot:HEAD, tone:.84});
  } else if(kind==='hijab'){
    // shell with an oval face opening (verts inside the oval are tucked inside the head)
    const g = new THREE.SphereGeometry(R*1.075,S(30),S(22));
    const p = g.attributes.position;
    for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
      const e = (x/.245)**2 + ((y+.045)/.255)**2;
      if(z>0 && e<1.0){ const k=.55; p.setXYZ(i,x*k,y*k,z*k); } }
    b.add(g,{scale:[1.08,1.03,1.05], slot:HEAD});
    // undercap face frame (ciput) softens the cut
    b.add(tor(.25,.03,6,S(30)),{pos:[0,-.045,.255], scale:[1.0,1.04,1], rot:[-.06,0,0], slot:ACC});
    // drape over shoulders/chest
    b.add(lathe([[.24,-.22],[.31,-.3],[.335,-.42],[.31,-.54],[.22,-.6],[.002,-.61]],20),{scale:[.7,1,.66], slot:HEAD, tone:.97});
    b.add(sph(.09,8,6),{pos:[0,-.3,.24], scale:[1.6,.7,.5], slot:HEAD, tone:.95}); // chin wrap
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
export function buildBlob(){ return new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2); }

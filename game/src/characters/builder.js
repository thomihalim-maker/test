// Procedural chibi geometry. Every part is merged into one BufferGeometry with:
//  color (tone multiplier), aSlot (0 fixed, 1 skin, 2 top, 3 bottom, 4 headgear/hair, 5 shoes), aFlex (sway weight)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export const SLOT = { FIX:0, SKIN:1, TOP:2, BOT:3, HEAD:4, SHOE:5 };

export class GB{
  constructor(){ this.list = []; }
  add(geo, o={}){
    const g = geo.index ? geo.clone() : geo.clone();
    const [px=0,py=0,pz=0] = o.pos||[]; const [rx=0,ry=0,rz=0] = o.rot||[];
    let sc = o.scale ?? 1; if(typeof sc==='number') sc=[sc,sc,sc];
    _e.set(rx,ry,rz,'YXZ'); _q.setFromEuler(_e); _p.set(px,py,pz); _s.set(...sc);
    _m.compose(_p,_q,_s); g.applyMatrix4(_m);
    const n = g.attributes.position.count;
    const col = new THREE.Color(o.color ?? 0xffffff);
    // tone given as number<=1 means grey multiplier for palette slots
    if(typeof o.tone==='number') col.setRGB(o.tone,o.tone,o.tone,THREE.LinearSRGBColorSpace);
    const ca = new Float32Array(n*3), sa = new Float32Array(n), fa = new Float32Array(n);
    const pos = g.attributes.position;
    for(let i=0;i<n;i++){
      ca[i*3]=col.r; ca[i*3+1]=col.g; ca[i*3+2]=col.b; sa[i]=o.slot||0;
      fa[i]= o.flex ? o.flex(pos.getX(i),pos.getY(i),pos.getZ(i)) : 0;
    }
    g.setAttribute('color', new THREE.BufferAttribute(ca,3));
    g.setAttribute('aSlot', new THREE.BufferAttribute(sa,1));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fa,1));
    for(const k of Object.keys(g.attributes)) if(!['position','normal','uv','color','aSlot','aFlex'].includes(k)) g.deleteAttribute(k);
    if(!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n*2),2));
    this.list.push(g); return this;
  }
  build(){ const g = mergeGeometries(this.list,false); g.computeBoundingSphere(); return g; }
}

const sph = (r=1,w=10,h=8)=>new THREE.SphereGeometry(r,w,h);
const caps = (r,l,s=6,rad=14)=>new THREE.CapsuleGeometry(r,l,s,rad);
function lathe(pts, seg=20, ps=0, pl=Math.PI*2){
  if(pts[0][1]>pts[pts.length-1][1]) pts=pts.slice().reverse();
  const curve = new THREE.SplineCurve(pts.map(p=>new THREE.Vector2(p[0],p[1])));
  const v = curve.getPoints(Math.max(6,Math.round(pts.length*1.5)));
  seg = Math.min(seg,16);
  return new THREE.LatheGeometry(v, seg, ps, pl);
}
// lathe with sphere-like phi convention so "front" is +Z: LatheGeometry x=r*sin(phi), z=r*cos(phi) => phi=0 is +Z. good.

const GOLD = 0xe6c35c, DARK = 0x2a1a16, BLUSH = 0xff8c86;

export function buildHead(){
  const b = new GB(); const R=.34, cy=.27;
  b.add(sph(R,20,14), {pos:[0,cy,0], scale:[1.07,.98,1.0], slot:1});
  // ears
  for(const s of[-1,1]) b.add(sph(.065,6,5), {pos:[s*.355,cy-.02,-.01], scale:[.6,1,.9], slot:1, tone:.96});
  // nose bump
  b.add(sph(.026,6,4), {pos:[0,cy-.075,.335], scale:[1,.8,.9], slot:1, tone:.93});
  // cheeks
  for(const s of[-1,1]) b.add(sph(.06,8,6), {pos:[s*.205,cy-.11,.262], scale:[1.2,.75,.35], rot:[0,-s*.5,0], color:BLUSH, slot:0});
  return b.build();
}
export function buildEyes(){
  const b = new GB(); const cy=.27;
  for(const s of[-1,1]){
    const x=s*.125;
    b.add(sph(.085,12,8), {pos:[x,cy-.015,.292], scale:[.9,1.12,.42], color:DARK, slot:0});
    b.add(sph(.06,8,6), {pos:[x,cy-.045,.31], scale:[.85,.85,.3], color:0x7a4a30, slot:0});
    b.add(sph(.026,6,4), {pos:[x+s*.012,cy+.032,.325], scale:[1,1,.5], color:0xffffff, slot:0});
    b.add(sph(.012,5,4), {pos:[x-s*.02,cy-.045,.328], scale:[1,1,.5], color:0xffffff, slot:0});
    b.add(caps(.009,.065,1,4), {pos:[x,cy+.125,.30], rot:[.0,0,Math.PI/2+s*-.12], color:DARK, slot:0});
  }
  return b.build();
}
export function buildMouth(open){
  const b = new GB(); const cy=.27;
  if(!open){
    b.add(new THREE.TorusGeometry(.05,.0105,4,10,Math.PI), {pos:[0,cy-.115,.327], rot:[0,0,Math.PI], color:0x7a3028, slot:0});
  } else {
    b.add(sph(.052,10,6), {pos:[0,cy-.135,.3], scale:[1,.95,.38], color:0x5a1e1e, slot:0});
    b.add(sph(.03,6,4), {pos:[0,cy-.155,.315], scale:[1.1,.6,.3], color:0xe8707a, slot:0});
  }
  return b.build();
}

// Torso frame: pelvis at y=0, neck at y=.40
export function buildTorso(kind){
  const b = new GB();
  if(kind==='koko'){
    const body = lathe([[.002,0],[.19,.0],[.205,.06],[.19,.15],[.205,.26],[.185,.35],[.115,.40],[.08,.425],[.002,.43]],28);
    b.add(body,{scale:[1,1,.86], slot:2});
    // mandarin collar
    b.add(lathe([[.092,.385],[.097,.415],[.088,.45],[.07,.455]],20),{scale:[1,1,.9], slot:2, tone:.92});
    // placket
    b.add(caps(.011,.3,2,6),{pos:[0,.22,.176], tone:.82, slot:2});
    for(let i=0;i<3;i++) b.add(sph(.019,6,5),{pos:[0,.33-i*.085,.18], color:GOLD, slot:0});
    // pocket
    b.add(sph(.05,8,6),{pos:[.1,.17,.17], scale:[1.1,.9,.2], tone:.9, slot:2});
    // belt hint
    b.add(lathe([[.2,.0],[.212,.015],[.212,.04],[.2,.05]],20),{scale:[1,1,.86], tone:.8, slot:2});
  } else { // gamis top
    const body = lathe([[.002,0],[.2,.0],[.2,.08],[.185,.16],[.2,.26],[.18,.35],[.115,.40],[.08,.425],[.002,.43]],28);
    b.add(body,{scale:[1,1,.86], slot:2});
    b.add(sph(.03,6,4),{pos:[0,.3,.17], color:GOLD, slot:0});
    b.add(lathe([[.19,.06],[.2,.075],[.2,.09],[.19,.1]],20),{scale:[1,1,.86], tone:.85, slot:2});
  }
  return b.build();
}
export function buildArm(){
  const b = new GB();
  b.add(caps(.058,.15,3,8),{pos:[0,-.115,0], slot:2});                         // sleeve
  b.add(lathe([[.062,-.2],[.068,-.215],[.062,-.225]],8),{slot:2, tone:.9});    // cuff
  b.add(sph(.058,9,7),{pos:[0,-.27,.005], scale:[1,1.02,.95], slot:1});       // hand
  b.add(sph(.025,8,6),{pos:[.035,-.265,.03], slot:1, tone:.97});                // thumb
  b.add(sph(.05,6,5),{pos:[0,.0,0], slot:2});                                // shoulder ball
  return b.build();
}
export function buildLeg(){
  const b = new GB();
  b.add(caps(.052,.12,3,8),{pos:[0,-.13,0], slot:1});
  b.add(sph(.078,10,8),{pos:[0,-.295,.035], scale:[1,.62,1.45], slot:5});
  b.add(sph(.06,8,6),{pos:[0,-.27,.03], scale:[1,.7,1.3], slot:1, tone:.98});
  return b.build();
}
export function buildSarong(){
  const flex = (x,y)=>Math.pow(Math.max(0,(.12-y)/.42),1.5);
  const b = new GB();
  b.add(lathe([[.22,.13],[.226,.06],[.24,-.05],[.262,-.18],[.282,-.31],[.29,-.32]],22),{slot:3, flex, scale:[1,1,.94]});
  b.add(new THREE.TorusGeometry(.215,.034,8,22),{pos:[0,.115,0], rot:[Math.PI/2,0,0], scale:[1,.92,1], slot:3, tone:.85});
  // knot fold at front-left
  b.add(sph(.06,8,6),{pos:[.08,.11,.205], scale:[1.3,.8,.6], slot:3, tone:.8});
  return b.build();
}
export function buildSkirt(){
  const flex = (x,y)=>Math.pow(Math.max(0,(.1-y)/.42),1.4);
  const b = new GB();
  b.add(lathe([[.2,.1],[.21,.0],[.245,-.1],[.29,-.21],[.335,-.3],[.34,-.31]],22),{slot:2, flex, scale:[1,1,.95]});
  b.add(new THREE.CircleGeometry(.21,14).rotateX(-Math.PI/2),{pos:[0,.1,0], scale:[1,1,.95], slot:2});
  b.add(lathe([[.335,-.29],[.345,-.3],[.34,-.315]],22),{slot:2, tone:.82, flex, scale:[1,1,.95]});
  return b.build();
}

// Headgear in head-center frame (origin = head center)
export function buildHat(kind){
  const b = new GB(); const R=.34;
  const hairShell = (col,fring)=>{
    const o = col?{slot:col}:{slot:0,color:0x2a1d17};
    b.add(new THREE.SphereGeometry(R*1.05,16,8,0,Math.PI*2,0,Math.PI*.36),{scale:[1.07,.99,1.02],pos:[0,0,-.015], ...o});
    b.add(new THREE.SphereGeometry(R*1.05,16,9,Math.PI/2+1.05,Math.PI*2-2.1,0,Math.PI*.64),{scale:[1.07,.99,1.02],pos:[0,0,-.015], ...o});
    if(fring) b.add(sph(.2,10,6),{pos:[0,.2,.2], scale:[1.0,.4,.45], rot:[.55,0,0], ...o});
  };
  if(kind==='peci'){
    hairShell(0,false); // fixed dark hair underneath
    b.add(lathe([[.002,.355],[.14,.35],[.24,.33],[.285,.29],[.298,.22],[.306,.16],[.308,.14]],22),{pos:[0,.0,-.01], rot:[.14,0,0], slot:4});
    b.add(lathe([[.298,.15],[.318,.155],[.318,.18],[.298,.18]],22),{pos:[0,0,-.01], rot:[.14,0,0], slot:4, tone:.8});
    b.add(sph(.022,6,4),{pos:[0,.275,.285], color:GOLD, slot:0});
  } else if(kind==='kopiah'||kind==='kopiahBeard'){
    b.add(new THREE.SphereGeometry(R*1.04,18,9,0,Math.PI*2,0,Math.PI*.5),{scale:[1.06,.92,1.04],pos:[0,.05,-.01], rot:[.12,0,0], slot:4});
    b.add(new THREE.TorusGeometry(.325,.022,5,20),{pos:[0,.055,-.012], rot:[Math.PI/2+.12,0,0], scale:[1.06,1.0,1.0], slot:4, tone:.88});
    if(kind==='kopiahBeard'){
      b.add(sph(.2,12,8),{pos:[0,-.2,.12], scale:[1.0,.8,.7], slot:4});
      b.add(sph(.075,6,4),{pos:[-.07,-.07,.31], scale:[1.6,.55,.6], rot:[0,0,.25], slot:4});
      b.add(sph(.075,6,4),{pos:[.07,-.07,.31], scale:[1.6,.55,.6], rot:[0,0,-.25], slot:4});
    }
  } else if(kind==='hijab'){
    const sc=[1.1,1.02,1.06];
    // back/sides (leave front wedge open)
    const wedge=.92;
    b.add(new THREE.SphereGeometry(R*1.07,18,12,Math.PI/2+wedge,Math.PI*2-wedge*2,0,Math.PI*.8),{scale:sc, pos:[0,-.02,-.01], slot:4});
    // forehead band
    b.add(new THREE.SphereGeometry(R*1.075,14,7,Math.PI/2-wedge,wedge*2,0,.9),{scale:sc, pos:[0,-.02,-.01], slot:4, tone:.96});
    // drape over shoulders
    b.add(lathe([[.30,-.16],[.34,-.26],[.34,-.38],[.30,-.5],[.2,-.56],[.002,-.57]],20),{pos:[0,0,.0], scale:[.66,1,.62], slot:4, tone:.97});
  } else { // hair
    hairShell(4,true);
    b.add(sph(.1,7,5),{pos:[0,.34,-.0], scale:[1,.8,1], slot:4}); // tuft
  }
  return b.build();
}

export function buildBlob(){ return new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2); }

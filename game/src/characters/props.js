// Hand-held props (bucket, hay armful, hammer, scrub brush, sapu lidi broom, mop, pengki dustpan) as small toon meshes
// with hull outlines. The masjid-care tools are each ONE merged vertex-coloured mesh + one outline (2 draw calls, +1 shadow).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMat, propOutlineMaterial, gradientMap } from './toon.js';

function part(geo, color, {pos=[0,0,0], rot=[0,0,0], scale=[1,1,1], outline=.012}={}){
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, toonMat(color)); m.castShadow = true;
  g.add(m);
  if(outline){ const o = new THREE.Mesh(geo, propOutlineMaterial(outline)); g.add(o); }
  g.position.set(...pos); g.rotation.set(...rot); g.scale.set(...scale); return g;
}
const lathe = (pts,seg=20)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg);

export function makeProps(scene){
  const props = {};
  // bucket: origin at handle top (grip)
  const bucket = new THREE.Group(); bucket.visible=false;
  const body = lathe([[.001,-.30],[.085,-.30],[.105,-.22],[.125,-.10],[.13,-.08]],22);
  bucket.add(part(body,0xb9824a,{outline:.011}));
  bucket.add(part(new THREE.TorusGeometry(.128,.012,6,22).rotateX(Math.PI/2),0x6b4a2a,{pos:[0,-.085,0],outline:0}));
  bucket.add(part(new THREE.TorusGeometry(.1,.011,6,20).rotateX(Math.PI/2),0x6b4a2a,{pos:[0,-.22,0],outline:0}));
  const water = new THREE.Mesh(new THREE.CircleGeometry(.12,20).rotateX(-Math.PI/2), new THREE.MeshToonMaterial({color:0x5cc8f2,gradientMap:null})); water.position.y=-.1; bucket.add(water);
  const handle = part(new THREE.TorusGeometry(.115,.011,6,18,Math.PI),0x4d4d55,{pos:[0,-.085,0],rot:[0,0,0],outline:.008}); bucket.add(handle);
  bucket.userData.water = water;
  // hay armful: origin = between hands; long axis across the chest
  const hay = new THREE.Group(); hay.visible=false;
  hay.add(part(new THREE.CapsuleGeometry(.15,.2,4,10).rotateZ(Math.PI/2),0xe9c75e,{scale:[1,.82,.9],pos:[0,.06,.12]}));
  const strawM = [0xf3d97a,0xd6a944,0xf7e396,0xc99a3a];
  for(let i=0;i<18;i++){ const a=i/18*Math.PI*2, side=i%2?1:-1;
    hay.add(part(new THREE.CapsuleGeometry(.012,.16,2,4),strawM[i%4],{pos:[side*(.2+Math.sin(i*3.1)*.04),.06+Math.cos(a)*.08,.12+Math.sin(a)*.08],rot:[Math.sin(i*1.7)*.5,0,Math.PI/2+side*(.25+Math.cos(i*2.3)*.35)],outline:0})); }
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; hay.add(part(new THREE.CapsuleGeometry(.01,.24,2,4),strawM[(i+1)%4],{pos:[0,.06+Math.cos(a)*.125,.12+Math.sin(a)*.11],rot:[0,0,Math.PI/2+Math.sin(i)*.12],outline:0})); }
  for(const x of[-.09,.09]) hay.add(part(new THREE.TorusGeometry(.13,.014,5,16).rotateY(Math.PI/2),0x9a5528,{pos:[x,.06,.12],scale:[1,1,.95],outline:0}));
  // hammer: origin at grip
  const hammer = new THREE.Group(); hammer.visible=false;
  hammer.add(part(new THREE.CapsuleGeometry(.032,.34,4,8),0x8a5a33,{pos:[0,.12,0],outline:.01}));
  hammer.add(part(new THREE.BoxGeometry(.26,.13,.13,2,2,2),0x7b7f8c,{pos:[0,.36,0],outline:.01}));
  hammer.add(part(new THREE.CylinderGeometry(.045,.045,.22,10).rotateZ(Math.PI/2),0x8a8f9c,{pos:[0,.3,0],outline:.008}));
  // brush: origin at grip
  const brush = new THREE.Group(); brush.visible=false;
  brush.add(part(new THREE.BoxGeometry(.22,.06,.1,2,2,2),0xd9a35c,{pos:[0,-.05,.04],outline:.01}));
  brush.add(part(new THREE.BoxGeometry(.2,.05,.085),0xf1e6c4,{pos:[0,-.1,.04],outline:0}));
  const suds = new THREE.Mesh(new THREE.SphereGeometry(.05,8,6), new THREE.MeshToonMaterial({color:0xffffff,gradientMap:null})); suds.position.set(0,-.12,.04); brush.add(suds);
  // ---- masjid care tools (authored with the floor contact point at the origin, handle along +Y; units = person space)
  const broom = mergedTool(broomParts(), .006); broom.userData.len = 1.05;
  const mop = mergedTool(mopParts(), .007); mop.userData.len = 1.08;
  const pengki = mergedTool(pengkiParts(), .008);
  { // a little mound of swept leaves that shows in the pengki once it is lifted (no outline, no shadow)
    const lp = []; const LC = [0xd98a2b,0xc9a23a,0x9fb84a,0xe0b24a,0xb8652a];
    for(let i=0;i<9;i++){ const a=i*2.4, r=.03+.05*((i*37)%10)/10;
      lp.push(vc(new THREE.SphereGeometry(.045,6,4), LC[i%5], {pos:[Math.cos(a)*r*1.6, -.205+.012*(i%3), .14+Math.sin(a)*r], scale:[1,.32,.75], rot:[0,a,0]})); }
    const m = new THREE.Mesh(mergeGeometries(lp,false), vcMat()); m.visible = false; pengki.add(m); pengki.userData.leaves = m;
  }
  for(const g of [bucket,hay,hammer,brush,broom,mop,pengki]) scene.add(g);
  Object.assign(props,{bucket,hay,hammer,brush,broom,mop,pengki});
  return props;
}

// ---------- merged vertex-coloured tool builder ----------
let _vcMat = null;
const vcMat = ()=> _vcMat ??= new THREE.MeshToonMaterial({ color:0xffffff, vertexColors:true, gradientMap:gradientMap() });
const _c = new THREE.Color(), _mm = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _ee = new THREE.Euler(), _vv = new THREE.Vector3(), _ss = new THREE.Vector3();
function vc(geo, color, {pos=[0,0,0], rot=[0,0,0], scale=[1,1,1]}={}){
  let g = geo.index ? geo.toNonIndexed() : geo;
  _ee.set(rot[0],rot[1],rot[2]); _qq.setFromEuler(_ee); _mm.compose(_vv.set(...pos), _qq, _ss.set(...scale)); g.applyMatrix4(_mm);
  for(const k of Object.keys(g.attributes)) if(k!=='position' && k!=='normal') g.deleteAttribute(k);
  _c.set(color); const n = g.attributes.position.count, ca = new Float32Array(n*3);
  for(let i=0;i<n;i++){ ca[i*3]=_c.r; ca[i*3+1]=_c.g; ca[i*3+2]=_c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(ca,3));
  return g;
}
// a thin rod from a to b (y-up cylinder re-oriented), optional taper
function rod(a, b, r0, r1, color, seg=5){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1); g.translate(0, L/2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  g.applyQuaternion(q); g.translate(A.x, A.y, A.z);
  return vc(g, color);
}
function mergedTool(parts, outline){
  const geo = mergeGeometries(parts, false); geo.computeBoundingSphere();
  const g = new THREE.Group(); g.visible = false;
  const m = new THREE.Mesh(geo, vcMat()); m.castShadow = true; g.add(m);
  if(outline) g.add(new THREE.Mesh(geo, propOutlineMaterial(outline)));
  return g;
}
// sapu lidi with a long bamboo handle: ~25 palm-rib sticks fanned out under a double rattan band
function broomParts(){
  const P = [], LIDI = [0xe2cc80,0xcdb265,0xeedc9c,0xc4a457,0xd9c070];
  const N = 27;
  for(let i=0;i<N;i++){
    const k = i/(N-1)*2-1, w = Math.sin(i*12.9898)*.5, row = (i%3)-1;           // across the fan, three staggered layers
    const top = [k*.034, .4, row*.012 + w*.006], bot = [k*.17 + w*.02, .004 + Math.abs(Math.sin(i*3.7))*.035, row*.026 + Math.cos(i*7.1)*.018];
    P.push(rod(bot, top, .0085, .0062, LIDI[i%5], 4));
  }
  P.push(vc(new THREE.CylinderGeometry(.045,.05,.06,12), 0x8a5a2b, {pos:[0,.4,0], scale:[1,1,.6]}));      // rattan band
  P.push(vc(new THREE.CylinderGeometry(.04,.044,.026,12), 0x6e4420, {pos:[0,.35,0], scale:[1,1,.6]}));
  P.push(vc(new THREE.CylinderGeometry(.036,.03,.07,10), 0xdcc77e, {pos:[0,.46,0], scale:[1,1,.65]}));    // tied lidi ends
  P.push(rod([0,.43,0],[0,1.05,0], .024, .021, 0xc9a35a, 8));                                             // bamboo handle
  for(const y of [.62,.84]) P.push(vc(new THREE.TorusGeometry(.023,.006,4,12), 0x9c7a3a, {pos:[0,y,0], rot:[Math.PI/2,0,0]})); // nodes
  P.push(vc(new THREE.SphereGeometry(.027,8,6), 0x9c7a3a, {pos:[0,1.055,0]}));
  return P;
}
// mop: wooden handle, blue clamp, a skirt of chunky cotton strips splayed on the floor
function mopParts(){
  const P = [], COT = [0xfbf8ef,0xf1ece0,0xfffdf7,0xe8e2d2];
  for(let i=0;i<16;i++){
    const a = i/16*Math.PI*2 + (i%2)*.2, r0 = .035, r1 = .13 + (i%3)*.02;
    P.push(rod([Math.cos(a)*r1, .014, Math.sin(a)*r1*.8], [Math.cos(a)*r0, .15, Math.sin(a)*r0*.7], .021, .017, COT[i%4], 5));
  }
  P.push(vc(new THREE.SphereGeometry(.065,10,6), 0xf6f2e6, {pos:[0,.13,0], scale:[1.1,.6,.85]}));
  P.push(vc(new THREE.CylinderGeometry(.036,.048,.07,12), 0x3b8fd9, {pos:[0,.18,0]}));                     // clamp
  P.push(rod([0,.2,0],[0,1.06,0], .022, .02, 0xc08a50, 8));
  P.push(vc(new THREE.CylinderGeometry(.029,.029,.09,10), 0x3b8fd9, {pos:[0,1.03,0]}));                    // grip cap
  return P;
}
// pengki: little green plastic dustpan, origin at the grip end of its short handle; tray in front (+Z), lip on the floor
function pengkiParts(){
  const P = [], G = 0x3fae6a, GD = 0x2f8a52;
  P.push(rod([0,0,0],[0,-.2,.05], .016, .016, GD, 6));                                                   // short handle
  P.push(vc(new THREE.SphereGeometry(.022,8,6), GD, {pos:[0,.004,0]}));
  const base = new THREE.BoxGeometry(.3,.014,.26); base.translate(0,-.225,.18); P.push(vc(base, G));        // tray floor
  const back = new THREE.BoxGeometry(.3,.11,.014); back.translate(0,-.17,.05); P.push(vc(back, G));        // back wall
  for(const sx of[-1,1]){ const sh = new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(.26,0),new THREE.Vector2(0,.11)]);
    const sg = new THREE.ExtrudeGeometry(sh,{depth:.012,bevelEnabled:false}); sg.rotateY(-Math.PI/2); sg.translate(sx*.15+(sx<0?.012:0),-.225,.05); P.push(vc(sg, G)); }
  const lip = new THREE.BoxGeometry(.3,.006,.04); lip.translate(0,-.229,.33); P.push(vc(lip, 0x8fd6a8));      // thin front lip
  return P;
}

const _q=new THREE.Quaternion(), _p=new THREE.Vector3(), _s=new THREE.Vector3(), _m=new THREE.Matrix4(), _e=new THREE.Euler();
const _a=new THREE.Vector3(), _b=new THREE.Vector3(), _ax=new THREE.Vector3(), _bx=new THREE.Vector3(), _bz=new THREE.Vector3(), _rt=new THREE.Vector3(), _tip=new THREE.Vector3(), _bm=new THREE.Matrix4();
export function updateProps(props, person, t, dt, groundY){
  for(const k in props) props[k].visible = false;
  const k = person.prop; if(!k) return;
  const o = props[k]; if(!o) return; o.visible = true;
  if(k==='bucket'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p); o.quaternion.copy(_q);
    // pendulum swing + pour tilt
    const sw = Math.sin(person.cycle*1+0.6)*.18*Math.min(1,person.speed/2) + (person.accZ*-.02);
    _e.set(person.propTilt*-1+sw*.5, 0, sw*.4); _q.setFromEuler(_e); o.quaternion.multiply(_q);
    o.position.y += .02;
    o.userData.water.visible = person.propTilt<.7;
  } else if(k==='hay'){
    const a = _a.setFromMatrixPosition(person.handR), b = _b.setFromMatrixPosition(person.handL);
    o.position.copy(a.add(b).multiplyScalar(.5)); o.position.y -= .05;
    o.rotation.set(0, person.yaw, 0);
  } else if(k==='hammer'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p); o.quaternion.copy(_q);
    _e.set(-Math.PI/2+.3,0,0); _q.setFromEuler(_e); o.quaternion.multiply(_q);
  } else if(k==='brush'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p); o.quaternion.copy(_q);
  } else if(k==='broom' || k==='mop'){
    const sc = person.size, sy = Math.sin(person.yaw), cy = Math.cos(person.yaw);
    const fl = (groundY ?? person.pos.y) + .004;
    _rt.set(-cy, 0, sy);                                              // character right
    if(person.propMode==='grip'){
      // two-hand grip: the tool runs from its floor contact point (pose aim, character space) up through both hands
      _a.setFromMatrixPosition(person.handR); _b.setFromMatrixPosition(person.handL); _a.add(_b).multiplyScalar(.5);
      const ax = person.aimX||0, az = person.aimZ||.6;
      _tip.set(person.pos.x + (ax*cy + az*sy)*sc, fl, person.pos.z + (-ax*sy + az*cy)*sc);
      _ax.subVectors(_a, _tip); if(_ax.lengthSq()<1e-6) _ax.set(0,1,0); _ax.normalize();
    } else {
      // carried upright at the side in the right hand, tip just above the floor
      _a.setFromMatrixPosition(person.handR);
      _ax.set(sy*.14 - _rt.x*.06, 1, cy*.14 - _rt.z*.06).normalize();
      const d = Math.min(.95*sc, Math.max(.25*sc, (_a.y - fl - .05)/_ax.y));
      _tip.copy(_a).addScaledVector(_ax, -d);
    }
    // basis: Y along the handle, X = fan width (perpendicular to the sideways sweeping motion), Z completes
    _bx.crossVectors(_ax, _rt); if(_bx.lengthSq()<1e-6) _bx.set(sy,0,cy); _bx.normalize();
    _bz.crossVectors(_bx, _ax).normalize();
    _bm.makeBasis(_bx, _ax, _bz); o.quaternion.setFromRotationMatrix(_bm);
    o.position.copy(_tip); o.scale.setScalar(sc);
    return;
  } else if(k==='pengki'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p);
    o.rotation.set(person.propTilt||0, person.yaw, 0, 'YXZ');
    o.scale.setScalar(person.size);
    // keep the tray lip from sinking under the floor while crouched
    const fl = (groundY ?? person.pos.y) + .004, low = o.position.y - .232*person.size;
    if(low < fl) o.position.y += fl-low;
    o.userData.leaves.visible = (person.propPhase||0) > .3;
    return;
  }
  if(k==='bucket'||k==='hammer'||k==='brush'){ const sc = person.size; o.scale.setScalar(sc); }
  else o.scale.setScalar(person.size);
}

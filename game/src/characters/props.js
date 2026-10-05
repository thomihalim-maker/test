// Hand-held props (bucket, hay armful, hammer, scrub brush) as small toon meshes with hull outlines
import * as THREE from 'three';
import { toonMat, propOutlineMaterial } from './toon.js';

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
  for(const g of [bucket,hay,hammer,brush]) scene.add(g);
  Object.assign(props,{bucket,hay,hammer,brush});
  return props;
}

const _q=new THREE.Quaternion(), _p=new THREE.Vector3(), _s=new THREE.Vector3(), _m=new THREE.Matrix4(), _e=new THREE.Euler();
export function updateProps(props, person, t, dt){
  for(const k in props) props[k].visible = false;
  const k = person.prop; if(!k) return;
  const o = props[k]; o.visible = true;
  if(k==='bucket'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p); o.quaternion.copy(_q);
    // pendulum swing + pour tilt
    const sw = Math.sin(person.cycle*1+0.6)*.18*Math.min(1,person.speed/2) + (person.accZ*-.02);
    _e.set(person.propTilt*-1+sw*.5, 0, sw*.4); _q.setFromEuler(_e); o.quaternion.multiply(_q);
    o.position.y += .02;
    o.userData.water.visible = person.propTilt<.7;
  } else if(k==='hay'){
    const a = new THREE.Vector3().setFromMatrixPosition(person.handR), b = new THREE.Vector3().setFromMatrixPosition(person.handL);
    o.position.copy(a.add(b).multiplyScalar(.5)); o.position.y -= .05;
    o.rotation.set(0, person.yaw, 0);
  } else if(k==='hammer'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p); o.quaternion.copy(_q);
    _e.set(-Math.PI/2+.3,0,0); _q.setFromEuler(_e); o.quaternion.multiply(_q);
  } else if(k==='brush'){
    person.handR.decompose(_p,_q,_s); o.position.copy(_p); o.quaternion.copy(_q);
    _e.set(0,0,0); o.position.y -= .0;
  }
  if(k==='bucket'||k==='hammer'||k==='brush'){ const sc = person.size; o.scale.setScalar(sc); }
  else o.scale.setScalar(person.size);
}

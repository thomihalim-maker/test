// Smooth third-person orbit camera rig: drag rotate, pinch/wheel zoom, ground-collision-free
import * as THREE from 'three';
import { clamp } from './noise.js';

export function createCameraRig(ctx){
  const { camera, canvas } = ctx;
  const rig = { target:new THREE.Vector3(6,1.2,10), yaw:0.62, pitch:0.5, dist:15, locked:null, shake:0, kick(a=0.3){ this.shake=Math.max(this.shake,a); } };
  ctx.cameraRig = rig;
  const q=new URLSearchParams(location.search);
  if(q.has('cam')){
    const v=q.get('cam').split(',').map(Number);
    if(v.length>=6&&v.every(Number.isFinite)){ rig.locked={pos:new THREE.Vector3(v[0],v[1],v[2]),target:new THREE.Vector3(v[3],v[4],v[5])}; }
  }
  if(q.has('yaw')) rig.yaw=+q.get('yaw'); if(q.has('pitch')) rig.pitch=+q.get('pitch'); if(q.has('dist')) rig.dist=+q.get('dist');
  // smoothed state
  const sm={ target:rig.target.clone(), yaw:rig.yaw, pitch:rig.pitch, dist:rig.dist };
  // --- input ---
  canvas.style.touchAction='none';
  const pts=new Map(); let pinch0=0, dist0=0;
  const onUI=(e)=>{ const t=e.target; return t===canvas||t===document.body||t===document.documentElement||t.id==='ui'; };
  addEventListener('pointerdown',(e)=>{ if(!onUI(e)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pts.size===2){ const [a,b]=[...pts.values()]; pinch0=Math.hypot(a.x-b.x,a.y-b.y); dist0=rig.dist; } });
  addEventListener('pointermove',(e)=>{
    const p=pts.get(e.pointerId); if(!p) return;
    const dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    if(rig.locked) return;
    if(pts.size===1){ rig.yaw-=dx*0.0065; rig.pitch=clamp(rig.pitch+dy*0.0045,0.12,1.38); }
    else if(pts.size>=2){ const [a,b]=[...pts.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); if(pinch0>1) rig.dist=clamp(dist0*pinch0/d,5,42); }
  });
  const up=(e)=>{ pts.delete(e.pointerId); if(pts.size===1) { /* resume drag */ } };
  addEventListener('pointerup',up); addEventListener('pointercancel',up);
  addEventListener('wheel',(e)=>{ if(!onUI(e)) return; if(rig.locked) return; rig.dist=clamp(rig.dist*Math.exp(e.deltaY*0.0011),5,42); e.preventDefault(); },{passive:false});
  addEventListener('contextmenu',(e)=>{ if(onUI(e)) e.preventDefault(); });

  const off=new THREE.Vector3(), look=new THREE.Vector3();
  function update(dt,t){
    if(rig.locked){
      camera.position.copy(rig.locked.pos); look.copy(rig.locked.target); camera.lookAt(look); sm.target.copy(look); camera.updateMatrixWorld(); return sm.target;
    }
    const k=1-Math.exp(-9*dt), kt=1-Math.exp(-7*dt), kz=1-Math.exp(-8*dt);
    sm.target.lerp(rig.target,kt);
    sm.yaw+=(rig.yaw-sm.yaw)*k; sm.pitch+=(rig.pitch-sm.pitch)*k; sm.dist+=(rig.dist-sm.dist)*kz;
    let pitch=sm.pitch, dist=sm.dist;
    // collision-free: never dip below terrain along the arm; raise pitch instead
    for(let it=0;it<4;it++){
      const cp=Math.cos(pitch), sp=Math.sin(pitch);
      off.set(Math.sin(sm.yaw)*cp,sp,Math.cos(sm.yaw)*cp).multiplyScalar(dist);
      let worst=0;
      for(const f of [0.4,0.7,1.0]){ const x=sm.target.x+off.x*f, z=sm.target.z+off.z*f, y=sm.target.y+off.y*f; worst=Math.max(worst,ctx.groundHeight(x,z)+1.1-y); }
      if(worst<=0) break; pitch=Math.min(1.45,pitch+Math.max(0.05,worst/dist*0.9));
    }
    const cp=Math.cos(pitch), sp=Math.sin(pitch);
    off.set(Math.sin(sm.yaw)*cp,sp,Math.cos(sm.yaw)*cp).multiplyScalar(dist);
    camera.position.copy(sm.target).add(off);
    const g=ctx.groundHeight(camera.position.x,camera.position.z)+1.0; if(camera.position.y<g) camera.position.y=g;
    look.copy(sm.target); look.y+=0.6+Math.min(1.5,dist*0.04);
    if(rig.shake>0.001){ camera.position.x+=(Math.random()-0.5)*rig.shake; camera.position.y+=(Math.random()-0.5)*rig.shake; rig.shake*=Math.exp(-6*dt); }
    camera.lookAt(look); camera.updateMatrixWorld();
    return sm.target;
  }
  return { rig, update, smooth:sm };
}

// Plaza set dressing grouped into a few composed vignettes (rest spot, woodpile, well) + ground pebbles.
// Everything is instanced: boxes, cylinders and stones share one Lambert material (3 draw calls).
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { heightAt, clearance, roadX } from './terrain.js';

export function createDecor(ctx, blobs){
  const group=new THREE.Group(); group.name='decor';
  const r=mulberry32(909);
  const LOW=ctx.quality==='low';
  const boxes=[], cyls=[], rocks=[];
  const m=new THREE.Matrix4(), q=new THREE.Quaternion(), q2=new THREE.Quaternion(), e=new THREE.Euler(), p=new THREE.Vector3(), sc=new THREE.Vector3();
  const C=(h)=>new THREE.Color(h);
  const wood=['#8a5a34','#9a6a3c','#7a4e2c'], stone=['#c9b9a0','#b8aa92','#d8cab0','#ab9e88'];
  const pick=(a)=>C(a[(r()*a.length)|0]);
  // part in item-local space: yaw ry around the item origin, plus optional local euler (ex,ey,ez)
  function part(list,ix,iz,iy,ry,lx,ly,lz,sx,sy,sz,color,ey=0,ex=0,ez=0){
    const c=Math.cos(ry), s=Math.sin(ry);
    p.set(ix+lx*c+lz*s, iy+ly, iz-lx*s+lz*c);
    q.setFromEuler(e.set(0,ry,0)); q2.setFromEuler(e.set(ex,ey,ez)); q.multiply(q2);
    sc.set(sx,sy,sz); m.compose(p,q,sc); list.push({m:m.clone(),c:color});
  }
  const lampSpots=[];
  const spots=[];   // resolved vignette anchors (villagers sit on the benches, chat at the well...): {kind,x,z,ry,items}
  // ---- building blocks (local coords; +z faces the plaza) ----
  const B={
    bench(x,z,h,ry){ const w=pick(wood), leg=C('#5a3a22'); const P=(...a)=>part(boxes,x,z,h,ry,...a);
      P(0,0.45,0,1.8,0.1,0.55,w); P(0,0.85,-0.25,1.8,0.45,0.08,w); P(-0.75,0.22,0,0.12,0.45,0.5,leg); P(0.75,0.22,0,0.12,0.45,0.5,leg);
      ctx.colliders.push({x,z,r:0.9}); blobs.add(x,z,1.3); },
    bed(x,z,h,ry){ const n=10; for(let i=0;i<n;i++){ const a=i/n*6.283; part(rocks,x,z,h,ry,Math.cos(a)*1.0,0.14,Math.sin(a)*1.0,0.42,0.3,0.4,pick(stone),a); }
      part(cyls,x,z,h,ry,0,0.12,0,1.9,0.22,1.9,C('#5a3b24'));
      const fc=['#ff7fb0','#ffd23f','#ffffff','#b69cff','#ff9248'].map(C); const c1=fc[(r()*5)|0], c2=fc[(r()*5)|0];
      for(let i=0;i<10;i++){ const a=r()*6.283,d=Math.sqrt(r())*0.75; part(rocks,x,z,h,ry,Math.cos(a)*d,0.48+r()*0.12,Math.sin(a)*d,0.2,0.16,0.2,r()<0.6?c1:c2); part(cyls,x,z,h,ry,Math.cos(a)*d,0.3,Math.sin(a)*d,0.04,0.34,0.04,C('#4a9a2e')); }
      ctx.colliders.push({x,z,r:1.15}); blobs.add(x,z,1.5); },
    woodpile(x,z,h,ry){ const lc=()=>C(['#8a5e3a','#9a6c44','#7c5434'][(r()*3)|0]);
      [[-0.36,0.2],[0,0.2],[0.36,0.2],[-0.18,0.52],[0.18,0.52],[0,0.84]].forEach(([lz,ly])=>part(cyls,x,z,h,ry,(r()-0.5)*0.15,ly,lz,0.38,1.7,0.38,lc(),0,0,Math.PI/2));
      // log end caps (lighter rings) on one side
      [[-0.36,0.2],[0,0.2],[0.36,0.2],[-0.18,0.52],[0.18,0.52],[0,0.84]].forEach(([lz,ly])=>part(cyls,x,z,h,ry,0.86,ly,lz,0.3,0.02,0.3,C('#d8b07a'),0,0,Math.PI/2));
      part(boxes,x,z,h,ry,-0.95,0.5,0,0.08,1.0,0.08,C('#5a3a22')); part(boxes,x,z,h,ry,0.95,0.5,0,0.08,1.0,0.08,C('#5a3a22'));
      ctx.colliders.push({x,z,r:1.0}); blobs.add(x,z,1.5); },
    crates(x,z,h,ry){ P2(boxes,x,z,h,ry,0,0.35,0,0.7,0.7,0.7,pick(wood),0.2); P2(boxes,x,z,h,ry,0.72,0.3,0.25,0.6,0.6,0.6,pick(wood),-0.3); P2(boxes,x,z,h,ry,0.15,1.0,0.05,0.55,0.55,0.55,pick(wood),0.5);
      part(cyls,x,z,h,ry,-0.75,0.4,0.35,0.6,0.8,0.6,C('#7a4a2a')); part(cyls,x,z,h,ry,-0.75,0.81,0.35,0.5,0.03,0.5,C('#a8784a'));
      ctx.colliders.push({x,z,r:1.0}); blobs.add(x,z,1.4); },
    well(x,z,h,ry){ for(let i=0;i<12;i++){ const a=i/12*6.283; part(rocks,x,z,h,ry,Math.cos(a)*0.85,0.35,Math.sin(a)*0.85,0.48,0.72,0.48,pick(stone),a); }
      part(cyls,x,z,h,ry,0,0.58,0,1.45,0.06,1.45,C('#2f6f9a')); part(boxes,x,z,h,ry,-0.85,1.4,0,0.1,1.7,0.1,C('#6a4428')); part(boxes,x,z,h,ry,0.85,1.4,0,0.1,1.7,0.1,C('#6a4428'));
      part(cyls,x,z,h,ry,0,1.75,0,0.12,1.7,0.12,C('#7a5030'),0,0,Math.PI/2); // windlass
      part(boxes,x,z,h,ry,0,2.3,-0.25,2.1,0.08,0.75,C('#b05a34'),0,0.45,0); part(boxes,x,z,h,ry,0,2.3,0.25,2.1,0.08,0.75,C('#b05a34'),0,-0.45,0);
      ctx.colliders.push({x,z,r:1.4}); blobs.add(x,z,2.0); },
    bucket(x,z,h,ry){ part(cyls,x,z,h,ry,0,0.18,0,0.38,0.36,0.38,C('#8a6a44')); part(cyls,x,z,h,ry,0,0.35,0,0.32,0.02,0.32,C('#3f8fb8')); blobs.add(x,z,0.4); },
    lamp(x,z){ lampSpots.push([x,z]); },
  };
  function P2(list,x,z,h,ry,lx,ly,lz,sx,sy,sz,c,yaw){ part(list,x,z,h,ry,lx,ly,lz,sx,sy,sz,c,yaw); }
  // ---- vignettes: [anchor x, z, layout] ----
  const V={
    rest:[['bench',0,0],['bed',-2.2,0.15]],
    rest2:[['bench',0,0],['bed',2.2,0.15]],
    wood:[['woodpile',0,0],['crates',2.2,0.5],['bucket',-1.4,0.7]],
    well:[['well',0,0],['bucket',1.35,0.7],['bed',-2.4,0.2]],
  };
  const anchors=[[-14,-14,'well'],[14.5,-14,'wood'],[10.5,16.5,'rest'],[-12.5,16.5,'rest2'],[-19.5,2,'rest']];
  if(LOW) anchors.splice(4,1);
  const okAt=(x,z,rad)=>clearance(x,z)>=rad&&Math.hypot(x,z)>=15.6&&Math.abs(heightAt(x,z))<0.6;
  for(const [ax,az,kind] of anchors){
    // nudge the anchor outward until the whole layout fits
    let x=ax, z=az, ok=false;
    for(let t=0;t<12&&!ok;t++){ const ry=Math.atan2(-x,-z), c=Math.cos(ry), s=Math.sin(ry);
      ok=V[kind].every(([k,lx,lz])=>okAt(x+lx*c+lz*s,z-lx*s+lz*c,k==='lamp'?0.3:1.0));
      if(!ok){ const d=Math.hypot(x,z); x*=(d+0.8)/d; z*=(d+0.8)/d; } }
    if(!ok) continue;
    const ry=Math.atan2(-x,-z), c=Math.cos(ry), s=Math.sin(ry);
    spots.push({ kind, x, z, ry, items:V[kind].map(([k,lx,lz])=>({ k, x:x+lx*c+lz*s, z:z-lx*s+lz*c })) });
    for(const [k,lx,lz] of V[kind]){ const px=x+lx*c+lz*s, pz=z-lx*s+lz*c; B[k](px,pz,heightAt(px,pz),ry+(k==='crates'||k==='bucket'?(r()-0.5)*0.8:0)); }
  }
  // ---- flagstones along path + road ----
  for(let t=0;t<10;t+=0.9){ const x=8+t+(r()-0.5)*0.4, z=6+(r()-0.5)*1.0; part(rocks,x,z,heightAt(x,z),0,0,0.04,0,0.7,0.14,0.6,pick(stone),r()*3); }
  for(let z=14;z<56;z+=1.4){ const x=roadX(z)+(r()-0.5)*1.4; part(rocks,x,z,heightAt(x,z),0,0,0.04,0,0.6,0.12,0.5,pick(stone),r()*3); }
  // ---- pebbles: few, larger, rounded, with contact shadows ----
  const peb=['#e6d6b4','#dccaa6','#efe2c6','#d4c09c'];
  const pebble=(x,z,s0)=>{ const s=s0*(0.8+r()*0.5); part(rocks,x,z,heightAt(x,z)-0.02,r()*6,0,s*0.18,0,s*1.4,s*0.52,s*1.15,pick(peb)); if(s>0.2) blobs.add(x,z,s*1.05); };
  for(let i=0;i<(LOW?45:90);i++){ const a=r()*6.283, d=3+Math.sqrt(r())*11.5, x=Math.cos(a)*d, z=Math.sin(a)*d; pebble(x,z,0.12+r()*0.14); }
  for(let i=0;i<(LOW?30:60);i++){ const z=14+r()*42, x=roadX(z)+(r()-0.5)*3.2; pebble(x,z,0.1+r()*0.12); }
  for(let i=0;i<(LOW?14:28);i++){ const x=8+r()*10, z=6+(r()-0.5)*2.8; pebble(x,z,0.1+r()*0.1); }
  function mk(geo,list,mat){ if(!list.length) return; const im=new THREE.InstancedMesh(geo,mat,list.length); list.forEach((it,i)=>{ im.setMatrixAt(i,it.m); im.setColorAt(i,it.c); }); im.castShadow=false; im.receiveShadow=true; im.computeBoundingSphere(); group.add(im); return im; }
  const mat=new THREE.MeshLambertMaterial();
  mk(new THREE.BoxGeometry(1,1,1),boxes,mat);
  mk(new THREE.CylinderGeometry(0.5,0.5,1,10),cyls,mat);
  mk(new THREE.IcosahedronGeometry(0.5,1),rocks,mat);
  return { group, lampSpots, spots };
}

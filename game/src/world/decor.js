// Plaza/village set dressing (instanced boxes/cylinders/stones) + ground pebbles
import * as THREE from 'three';
import { mulberry32, fbm } from './noise.js';
import { heightAt, clearance, dRoad, dPath, dPlaza, roadX, POND } from './terrain.js';

export function createDecor(ctx, blobs){
  const group=new THREE.Group(); group.name='decor';
  const r=mulberry32(909);
  const boxes=[], cyls=[], rocks=[], petalsC=[];
  const m=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), p=new THREE.Vector3(), sc=new THREE.Vector3(), col=new THREE.Color();
  const C=(h)=>new THREE.Color(h);
  const wood=['#8a5a34','#9a6a3c','#7a4e2c'], stone=['#b9b2a2','#a8a293','#cfc8b6','#9b9686'];
  const pick=(a)=>C(a[(r()*a.length)|0]);
  // item-local part
  function part(list,ix,iz,iy,ry,lx,ly,lz,sx,sy,sz,color,lry=0){
    const c=Math.cos(ry), s=Math.sin(ry);
    p.set(ix+lx*c+lz*s, iy+ly, iz-lx*s+lz*c); e.set(0,ry+lry,0); q.setFromEuler(e); sc.set(sx,sy,sz); m.compose(p,q,sc);
    list.push({m:m.clone(),c:color});
  }
  const spots=[]; const free=(x,z,rad)=>{ if(clearance(x,z)<rad) return false; if(Math.hypot(x,z)<15.6) return false; for(const s of spots) if(Math.hypot(s[0]-x,s[1]-z)<s[2]+rad) return false; return true; };
  const put=(x,z,rad)=>spots.push([x,z,rad]);
  function item(kind,rad,tries=60,rmin=16,rmax=24){
    for(let i=0;i<tries;i++){ const a=r()*6.283, d=rmin+r()*(rmax-rmin), x=Math.cos(a)*d, z=Math.sin(a)*d; if(!free(x,z,rad)) continue;
      const h=heightAt(x,z); if(Math.abs(h)>0.4) continue; put(x,z,rad); const ry=Math.atan2(-x,-z)+ (kind==='bench'?0:r()*0.6-0.3);
      build(kind,x,z,h,ry); return true; } return false; }
  function build(kind,x,z,h,ry){
    const P=(l,...a)=>part(l,x,z,h,ry,...a);
    if(kind==='bench'){ const w=pick(wood); P(boxes,0,0.45,0,1.8,0.1,0.55,w); P(boxes,0,0.85,-0.25,1.8,0.45,0.08,w); P(boxes,-0.75,0.22,0,0.12,0.45,0.5,C('#5a3a22')); P(boxes,0.75,0.22,0,0.12,0.45,0.5,C('#5a3a22')); ctx.colliders.push({x,z,r:0.8}); blobs.add(x,z,1.3); }
    else if(kind==='bed'){ const n=10; for(let i=0;i<n;i++){ const a=i/n*6.283; P(rocks,Math.cos(a)*1.0,0.14,Math.sin(a)*1.0,0.42,0.28,0.4,pick(stone),a);} P(cyls,0,0.12,0,1.9,0.22,1.9,C('#5a3b24'));
      const fc=['#ff7fb0','#ffd23f','#ffffff','#b69cff','#ff9248'].map(C); const c1=fc[(r()*5)|0], c2=fc[(r()*5)|0];
      for(let i=0;i<9;i++){ const a=r()*6.283,d=Math.sqrt(r())*0.8; P(petalsC,Math.cos(a)*d,0.45+r()*0.15,Math.sin(a)*d,0.2,0.2,0.2,r()<0.6?c1:c2); P(cyls,Math.cos(a)*d,0.28,Math.sin(a)*d,0.04,0.34,0.04,C('#4a9a2e')); } ctx.colliders.push({x,z,r:1.1}); blobs.add(x,z,1.5); }
    else if(kind==='crates'){ const w=pick(wood); P(boxes,0,0.35,0,0.7,0.7,0.7,w,0.2); P(boxes,0.75,0.3,0.2,0.6,0.6,0.6,pick(wood),-0.3); P(boxes,0.2,1.0,0,0.55,0.55,0.55,pick(wood),0.5); P(cyls,-0.8,0.4,0.4,0.6,0.8,0.6,C('#7a4a2a')); ctx.colliders.push({x,z,r:1.0}); blobs.add(x,z,1.5); }
    else if(kind==='well'){ for(let i=0;i<10;i++){ const a=i/10*6.283; P(rocks,Math.cos(a)*0.85,0.35,Math.sin(a)*0.85,0.5,0.7,0.5,pick(stone),a);} P(cyls,0,0.5,0,1.5,0.1,1.5,C('#2f6f9a')); P(boxes,-0.85,1.4,0,0.1,1.7,0.1,C('#6a4428')); P(boxes,0.85,1.4,0,0.1,1.7,0.1,C('#6a4428')); P(boxes,0,2.3,0,2.0,0.1,0.9,C('#9a5a34')); P(boxes,0,2.55,0,1.5,0.1,0.6,C('#b46a3c')); ctx.colliders.push({x,z,r:1.4}); blobs.add(x,z,2.0); }
    else if(kind==='sign'){ P(boxes,0,0.8,0,0.1,1.6,0.1,C('#6a4428')); P(boxes,0,1.35,0.05,0.9,0.4,0.06,pick(wood)); P(boxes,0,1.35,0.0,0.96,0.46,0.04,C('#f3e2b8')); ctx.colliders.push({x,z,r:0.3}); blobs.add(x,z,0.6); }
    else if(kind==='log'){ P(cyls,0,0.28,0,0.5,1.8,0.5,C('#8a5e3a'),0); const k=cyls[cyls.length-1]; /* lay on side */ const mm=new THREE.Matrix4().compose(new THREE.Vector3(x,h+0.26,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,Math.PI/2)),new THREE.Vector3(0.5,1.8,0.5)); k.m=mm; ctx.colliders.push({x,z,r:0.7}); blobs.add(x,z,1.2); }
  }
  for(const [k,n,rad,rmin,rmax] of [['well',1,2.2,17,21],['bench',8,1.4,16,23],['bed',7,1.9,16,25],['crates',5,1.6,17,26],['sign',4,0.8,16,28],['log',5,1.2,18,30]]) for(let i=0;i<n;i++) item(k,rad,80,rmin,rmax);
  // flagstones along path + road, scattered pebbles
  for(let t=0;t<10;t+=0.9){ const x=8+t+(r()-0.5)*0.4, z=6+(r()-0.5)*1.0; part(rocks,x,z,heightAt(x,z),0,0,0.04,0,0.7,0.12,0.6,pick(stone),r()*3); }
  for(let z=14;z<56;z+=1.4){ const x=roadX(z)+(r()-0.5)*1.4; part(rocks,x,z,heightAt(x,z),0,0,0.04,0,0.6,0.1,0.5,pick(stone),r()*3); }
  const peb=['#d9c7a3','#cdb895','#e3d5b8','#c4ae8a'];
  const pebble=(x,z,s0)=>{ const s=s0*(0.8+r()*0.5); part(rocks,x,z,heightAt(x,z)-0.02,r()*6,0,s*0.12,0,s*1.5,s*0.45,s*1.2,pick(peb),0); };
  const LOW=ctx.quality==='low';
  for(let i=0;i<(LOW?70:140);i++){ const a=r()*6.283, d=3+Math.sqrt(r())*11.5, x=Math.cos(a)*d, z=Math.sin(a)*d; pebble(x,z,0.12+r()*0.14); }
  for(let i=0;i<(LOW?40:80);i++){ const z=14+r()*42, x=roadX(z)+(r()-0.5)*3.2; pebble(x,z,0.1+r()*0.12); }
  for(let i=0;i<(LOW?20:40);i++){ const x=8+r()*10, z=6+(r()-0.5)*2.8; pebble(x,z,0.1+r()*0.1); }
  function mk(geo,list,mat){ if(!list.length) return; const im=new THREE.InstancedMesh(geo,mat,list.length); list.forEach((it,i)=>{ im.setMatrixAt(i,it.m); im.setColorAt(i,it.c); }); im.castShadow=false; im.receiveShadow=true; im.computeBoundingSphere(); group.add(im); return im; }
  const mat=new THREE.MeshLambertMaterial();
  mk(new THREE.BoxGeometry(1,1,1),boxes,mat);
  mk(new THREE.CylinderGeometry(0.5,0.5,1,10),cyls,mat);
  mk(new THREE.IcosahedronGeometry(0.5,1),rocks.concat(petalsC),mat);
  return { group };
}

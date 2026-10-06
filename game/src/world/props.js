// Contact blob shadows (instanced multiply decals) + lamp posts with night glow + sparse fences-of-nature
import * as THREE from 'three';
import { makeRadialTex } from './textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt, roadX, POND, clearance } from './terrain.js';

export function createBlobs(ctx, cap=900){
  const tex=makeRadialTex([[0,'#8a8a96'],[0.35,'#9a9aa6'],[0.7,'#d4d4dc'],[1,'#ffffff']],128);
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.MultiplyBlending,premultipliedAlpha:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,fog:false});
  const geo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const mesh=new THREE.InstancedMesh(geo,mat,cap); mesh.count=0; mesh.renderOrder=1; mesh.frustumCulled=false; mesh.name='blobShadows';
  const d=new THREE.Object3D();
  const api={ mesh, n:0,
    add(x,z,r){ if(api.n>=cap) return -1; const i=api.n++; api.set(i,x,z,r); mesh.count=api.n; return i; },
    set(i,x,z,r){ d.position.set(x,heightAt(x,z)+0.04,z); d.scale.set(r*2,1,r*2); d.rotation.set(0,0,0); d.updateMatrix(); mesh.setMatrixAt(i,d.matrix); mesh.instanceMatrix.needsUpdate=true; },
    // call after mutating positions every frame if needed (dynamic use): set(i,...) is enough
  };
  return api;
}

export function createLamps(ctx, blobs, extra=[]){
  const group=new THREE.Group(); group.name='lamps';
  const spots=[];
  // street lamps stay outside r~16 of the plaza (the masjid has its own lanterns)
  [[21,-1],[31,1],[41,-1],[51,1]].forEach(([z,sd])=>spots.push([roadX(z)+sd*2.7,z]));
  spots.push([17,8.9]);
  const post=new THREE.CylinderGeometry(0.1,0.14,2.4,8); post.translate(0,1.2,0);
  const cap=new THREE.ConeGeometry(0.34,0.26,6); cap.translate(0,2.86,0);
  const lamp=new THREE.BoxGeometry(0.32,0.42,0.32); lamp.translate(0,2.55,0);
  const base=new THREE.CylinderGeometry(0.26,0.32,0.3,8); base.translate(0,0.15,0);
  const paint=(g,hex)=>{ const c=new THREE.Color(hex), n=g.attributes.position.count, arr=new Float32Array(n*3); for(let i=0;i<n;i++){ arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b; } g.setAttribute('color',new THREE.BufferAttribute(arr,3)); return g.index?g.toNonIndexed():g; };
  const lampGeo=mergeGeometries([paint(base,'#aaa497'),paint(post,'#8a6240'),paint(cap,'#2f5f58')].map(g=>{ g.deleteAttribute('uv'); return g; }));
  const bulbM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,0.78,0.4)});
  const mk=(g,m)=>{ const im=new THREE.InstancedMesh(g,m,spots.length); const d=new THREE.Object3D();
    spots.forEach(([x,z],i)=>{ d.position.set(x,heightAt(x,z),z); d.updateMatrix(); im.setMatrixAt(i,d.matrix); }); im.castShadow=false; im.receiveShadow=true; im.computeBoundingSphere(); group.add(im); return im; };
  mk(lampGeo,new THREE.MeshLambertMaterial({vertexColors:true})); mk(lamp,bulbM);
  spots.forEach(([x,z])=>{ ctx.colliders.push({x,z,r:0.2}); blobs.add(x,z,0.5); });
  // glow halos: one Points draw call
  const gt=makeRadialTex([[0,'rgba(255,220,150,1)'],[0.25,'rgba(255,190,100,0.45)'],[1,'rgba(255,170,80,0)']],128);
  const gp=new Float32Array(spots.length*3); spots.forEach(([x,z],i)=>{ gp[i*3]=x; gp[i*3+1]=heightAt(x,z)+2.55; gp[i*3+2]=z; });
  const gg=new THREE.BufferGeometry(); gg.setAttribute('position',new THREE.BufferAttribute(gp,3));
  const sm=new THREE.PointsMaterial({map:gt,size:2.4,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,opacity:0});
  const halos=new THREE.Points(gg,sm); halos.frustumCulled=false; group.add(halos);
  // ground light pools
  const pt=makeRadialTex([[0,'rgba(255,200,110,0.55)'],[0.5,'rgba(255,180,90,0.18)'],[1,'rgba(255,170,80,0)']],128);
  const pm=new THREE.MeshBasicMaterial({map:pt,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const pg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const pools=new THREE.InstancedMesh(pg,pm,spots.length); const d=new THREE.Object3D();
  spots.forEach(([x,z],i)=>{ d.position.set(x,heightAt(x,z)+0.07,z); d.scale.set(7,1,7); d.updateMatrix(); pools.setMatrixAt(i,d.matrix); }); pools.frustumCulled=false; group.add(pools);
  const pls=(ctx.quality==='low'?[]:[0,1]).map(()=>{const l=new THREE.PointLight(0xffb060,0,13,2); group.add(l); return l;});
  function update(t,night,focus){
    if(focus){ const s=spots.map(([x,z])=>[Math.hypot(x-focus.x,z-focus.z),x,z]).sort((a,b)=>a[0]-b[0]); pls.forEach((l,i)=>{ l.position.set(s[i][1],heightAt(s[i][1],s[i][2])+2.4,s[i][2]); l.intensity=Math.max(0,night)*12; }); }
    const on=Math.max(0,night); const flick=1+0.04*Math.sin(t*7)+0.02*Math.sin(t*13.3);
    sm.opacity=on*0.75*flick; pm.opacity=on*0.65; bulbM.color.setRGB(0.5+0.5*(1-on)*0.8+on*1.4,0.4+0.5*(1-on)*0.5+on*1.0,0.25+on*0.45);
  }
  return { group, update, spots };
}

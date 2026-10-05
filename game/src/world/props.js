// Contact blob shadows (instanced multiply decals) + lamp posts with night glow + sparse fences-of-nature
import * as THREE from 'three';
import { makeRadialTex } from './textures.js';
import { heightAt, roadX, POND, clearance } from './terrain.js';

export function createBlobs(ctx, cap=420){
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

export function createLamps(ctx, blobs){
  const group=new THREE.Group(); group.name='lamps';
  const spots=[];
  for(const z of [16,26,36,46]) for(const sd of [-1,1]) spots.push([roadX(z)+sd*3.0,z]);
  spots.push([11,3.6],[16,8.6],[POND.x+7,POND.z-5],[POND.x-6,POND.z+7],[-12,-16],[14,-17]);
  const post=new THREE.CylinderGeometry(0.06,0.09,2.4,6); post.translate(0,1.2,0);
  const cap=new THREE.ConeGeometry(0.22,0.2,6); cap.translate(0,2.72,0);
  const lamp=new THREE.BoxGeometry(0.2,0.28,0.2); lamp.translate(0,2.48,0);
  const woodM=new THREE.MeshStandardMaterial({color:'#8a6240',roughness:0.8});
  const capM=new THREE.MeshStandardMaterial({color:'#2f5f58',roughness:0.7});
  const bulbM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,0.78,0.4)});
  const mk=(g,m,cast)=>{ const im=new THREE.InstancedMesh(g,m,spots.length); const d=new THREE.Object3D();
    spots.forEach(([x,z],i)=>{ d.position.set(x,heightAt(x,z),z); d.updateMatrix(); im.setMatrixAt(i,d.matrix); }); im.castShadow=cast; im.computeBoundingSphere(); group.add(im); return im; };
  mk(post,woodM,true); mk(cap,capM,true); mk(lamp,bulbM,false);
  spots.forEach(([x,z])=>{ ctx.colliders.push({x,z,r:0.2}); blobs.add(x,z,0.5); });
  // glow sprites
  const gt=makeRadialTex([[0,'rgba(255,220,150,1)'],[0.25,'rgba(255,190,100,0.45)'],[1,'rgba(255,170,80,0)']],128);
  const sm=new THREE.SpriteMaterial({map:gt,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,opacity:0});
  const sprites=spots.map(([x,z])=>{ const s=new THREE.Sprite(sm); s.position.set(x,heightAt(x,z)+2.48,z); s.scale.setScalar(2.2); group.add(s); return s; });
  // ground light pools
  const pt=makeRadialTex([[0,'rgba(255,200,110,0.55)'],[0.5,'rgba(255,180,90,0.18)'],[1,'rgba(255,170,80,0)']],128);
  const pm=new THREE.MeshBasicMaterial({map:pt,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const pg=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const pools=new THREE.InstancedMesh(pg,pm,spots.length); const d=new THREE.Object3D();
  spots.forEach(([x,z],i)=>{ d.position.set(x,heightAt(x,z)+0.07,z); d.scale.set(7,1,7); d.updateMatrix(); pools.setMatrixAt(i,d.matrix); }); pools.frustumCulled=false; group.add(pools);
  function update(t,night){
    const on=Math.max(0,night); const flick=1+0.04*Math.sin(t*7)+0.02*Math.sin(t*13.3);
    sm.opacity=on*0.75*flick; pm.opacity=on*0.9; bulbM.color.setRGB(0.5+0.5*(1-on)*0.8+on*1.4,0.4+0.5*(1-on)*0.5+on*1.0,0.25+on*0.45);
  }
  return { group, update, spots };
}

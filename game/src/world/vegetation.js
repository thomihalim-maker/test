// Instanced vegetation: grass, flowers, bushes, rocks, palms, bananas, mangoes, lily pads
import * as THREE from 'three';
import { mulberry32, fbm, S, clamp, vnoise } from './noise.js';
import { clearance, heightAt, roadX, dPlaza, POND, WATER_Y } from './terrain.js';
import { patchWind } from './wind.js';
import * as G from './trees.js';

export function createVegetation(ctx, terrain, blobs){
  const group=new THREE.Group(); group.name='vegetation';
  const rnd=mulberry32(20240607);
  const dummy=new THREE.Object3D(), tmpC=new THREE.Color(), tc=new THREE.Color();
  const slopeAt=(x,z)=>{ const e=0.6; const dx=heightAt(x+e,z)-heightAt(x-e,z), dz=heightAt(x,z+e)-heightAt(x,z-e); return Math.hypot(dx,dz)/(2*e); };

  const lamb=(o={})=>new THREE.MeshLambertMaterial({vertexColors:true,...o});
  const std=(o={})=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.85,metalness:0,...o});
  function inst(geo,mat,items,{cast=false,receive=true,color=null}={}){
    const m=new THREE.InstancedMesh(geo,mat,items.length);
    items.forEach((it,i)=>{ dummy.position.set(it.x,it.y,it.z); dummy.rotation.set(it.rx||0,it.ry||0,it.rz||0); dummy.scale.set(it.sx??it.s,it.sy??it.s,it.sz??it.s); dummy.updateMatrix(); m.setMatrixAt(i,dummy.matrix); if(it.c) m.setColorAt(i,it.c); });
    m.instanceMatrix.needsUpdate=true; if(m.instanceColor) m.instanceColor.needsUpdate=true;
    m.castShadow=cast; m.receiveShadow=receive; m.computeBoundingSphere(); group.add(m); return m;
  }

  // ---------- grass ----------
  const grassItems=[], farItems=[];
  let tries=0;
  while((grassItems.length<13500||farItems.length<4500)&&tries++<200000){
    const a=rnd()*Math.PI*2, rr=Math.sqrt(rnd())*62, x=Math.cos(a)*rr, z=Math.sin(a)*rr;
    const far=rr>36;
    if(far? farItems.length>=4500 : grassItems.length>=13500) continue;
    if(clearance(x,z)<0.25) continue;
    const h=heightAt(x,z); if(h<0.7&&rr>40) continue; if(h<-0.2) continue;
    if(slopeAt(x,z)>0.7) continue;
    // patchiness: tufts cluster
    const pm=0.45+0.55*(fbm(x*0.12,z*0.12,2)*0.5+0.5);
    if(rnd()>pm) continue;
    terrain.colorAt(x,z,tmpC);
    const l=0.9+rnd()*0.35; tmpC.multiplyScalar(l*1.25);
    if(rnd()<0.12) tmpC.lerp(tc.set('#e6e060'),0.35);
    const s=(far?1.3:0.85)*(0.8+rnd()*0.7);
    (far?farItems:grassItems).push({x,y:h-0.03,z,ry:rnd()*6.28,s,c:tmpC.clone()});
  }
  const gGeo=G.grassTuft({n:5,height:0.62,width:0.1,spread:0.18,seed:4});
  const gMat=patchWind(lamb(),{amp:0.22,height:0.6,speed:1.2});
  const grass=inst(gGeo,gMat,grassItems,{receive:true}); grass.name='grass';
  const grassFar=inst(gGeo,gMat,farItems,{receive:true}); grassFar.name='grassFar';

  // ---------- flowers ----------
  const FP=['#ff7fb0','#ffffff','#ffd23f','#b69cff','#ff9248','#ff6b6b','#7fd4ff'].map(c=>new THREE.Color(c));
  const fl=[]; let patches=0, ft=0;
  while(patches<70&&ft++<4000){
    const a=rnd()*6.283, rr=14+Math.sqrt(rnd())*46, cx=Math.cos(a)*rr, cz=Math.sin(a)*rr;
    if(clearance(cx,cz)<2) continue; const hh=heightAt(cx,cz); if(hh<0.5||slopeAt(cx,cz)>0.4) continue;
    patches++;
    const c1=FP[(rnd()*FP.length)|0], c2=FP[(rnd()*FP.length)|0], R=1.6+rnd()*2.6, n=14+((rnd()*20)|0);
    for(let i=0;i<n;i++){ const b=rnd()*6.283, d=Math.sqrt(rnd())*R, x=cx+Math.cos(b)*d, z=cz+Math.sin(b)*d;
      if(clearance(x,z)<0.4) continue; const h=heightAt(x,z); if(h<0.4||slopeAt(x,z)>0.5) continue;
      fl.push({x,y:h-0.02,z,ry:rnd()*6.28,s:0.9+rnd()*0.9,c:(rnd()<0.7?c1:c2).clone().multiplyScalar(0.9+rnd()*0.2)}); }
  }
  const fg=G.flowerGeo();
  const fMat=patchWind(lamb(),{amp:0.12,height:0.35,speed:1.1});
  const fStemMat=patchWind(lamb(),{amp:0.12,height:0.35,speed:1.1});
  const petalMesh=inst(fg.petals,fMat,fl,{}); petalMesh.name='flowerPetals';
  const stemItems=fl.map(f=>({...f,c:null}));
  inst(fg.stem,fStemMat,stemItems,{}).name='flowerStems';

  // ---------- spatial hash for spacing ----------
  const placed=[];
  const okSpacing=(x,z,r)=>{ for(const p of placed){ const d=Math.hypot(p.x-x,p.z-z); if(d<p.r+r) return false; } return true; };
  const place=(x,z,r)=>placed.push({x,z,r});

  // ---------- trees ----------
  const palms=[], mangos=[], bananas=[];
  function tryTree(list,x,z,r,sMin,sMax,{minH=0.3,maxSlope=0.35,tilt=0}={}){
    if(clearance(x,z)<r*0.8+0.6) return false; if(Math.hypot(x,z)<18.5) return false;
    const h=heightAt(x,z); if(h<minH||slopeAt(x,z)>maxSlope) return false; if(!okSpacing(x,z,r)) return false;
    const s=sMin+rnd()*(sMax-sMin); place(x,z,r*s);
    list.push({x,y:h-0.05,z,ry:rnd()*6.28,s,rx:(rnd()-0.5)*tilt,rz:(rnd()-0.5)*tilt});
    ctx.colliders.push({x,z,r:0.45*s}); blobs.add(x,z,2.2*s*(list===palms?0.9:list===mangos?1.1:0.9)); return true;
  }
  // road avenue: palms either side
  for(let z=22;z<56;z+=6.5){ for(const sd of [-1,1]){ const x=roadX(z)+sd*(4.6+rnd()*1.2); tryTree(palms,x+rnd()-0.5,z+rnd()*2,1.4,0.9,1.15,{tilt:0.12}); } }
  // plaza ring (outside radius 18)
  for(let i=0;i<14;i++){ const a=i/14*6.283+rnd()*0.3, r=20+rnd()*7; tryTree(i%3?palms:mangos,Math.cos(a)*r,Math.sin(a)*r,i%3?1.4:2.2,0.9,1.2,{tilt:0.1}); }
  // beach palms
  for(let i=0;i<200&&palms.length<44;i++){ const a=rnd()*6.283, r=52+rnd()*8; tryTree(palms,Math.cos(a)*r,Math.sin(a)*r,1.8,0.9,1.25,{minH:0.15,maxSlope:0.5,tilt:0.25}); }
  // meadow mangoes & palms
  for(let i=0;i<600&&mangos.length<14;i++){ const a=rnd()*6.283, r=24+rnd()*22; tryTree(mangos,Math.cos(a)*r,Math.sin(a)*r,2.6,0.85,1.2,{}); }
  for(let i=0;i<400&&palms.length<54;i++){ const a=rnd()*6.283, r=24+rnd()*26; tryTree(palms,Math.cos(a)*r,Math.sin(a)*r,1.6,0.85,1.2,{tilt:0.15}); }
  // pond surroundings: bananas + palm
  for(let i=0;i<300&&bananas.length<8;i++){ const a=rnd()*6.283, r=9+rnd()*8; tryTree(bananas,POND.x+Math.cos(a)*r,POND.z+Math.sin(a)*r,1.6,0.9,1.15,{}); }
  for(let i=0;i<500&&bananas.length<20;i++){ const a=rnd()*6.283, r=20+rnd()*34; tryTree(bananas,Math.cos(a)*r,Math.sin(a)*r,1.6,0.9,1.15,{}); }
  const palmMats=[1,2,3].map(()=>null);
  const mkPalm=(seed,items)=>inst(G.palmGeo(seed),patchWind(std(),{amp:0.55,height:9,speed:0.9,flutter:0.05}),items,{cast:true});
  const pv=[[],[],[]]; palms.forEach((p,i)=>pv[i%3].push(p));
  pv.forEach((it,i)=>{ if(it.length) mkPalm(i+1,it).name='palm'+i; });
  inst(G.mangoGeo(1),patchWind(std(),{amp:0.22,height:8,speed:0.8,flutter:0.02}),mangos,{cast:true}).name='mango';
  const bv=[[],[]]; bananas.forEach((b,i)=>bv[i%2].push(b));
  bv.forEach((it,i)=>{ if(it.length) inst(G.bananaGeo(i+2),patchWind(std(),{amp:0.4,height:4.5,speed:1.1,flutter:0.06}),it,{cast:true}).name='banana'+i; });

  // ---------- bushes ----------
  const bushA=[], bushB=[]; let bt=0;
  while(bushA.length+bushB.length<170&&bt++<8000){
    const a=rnd()*6.283, r=14.5+Math.sqrt(rnd())*46, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(clearance(x,z)<0.9) continue; const h=heightAt(x,z); if(h<0.45||slopeAt(x,z)>0.5) continue;
    if(!okSpacing(x,z,0.6)) continue; place(x,z,0.5);
    const s=0.8+rnd()*0.9, flower=rnd()<0.4; terrain.colorAt(x,z,tmpC);
    const c=new THREE.Color(1,1,1).lerp(tmpC,0.0).multiplyScalar(0.9+rnd()*0.25);
    (flower?bushB:bushA).push({x,y:h-0.05,z,ry:rnd()*6.28,s,sy:s*(0.8+rnd()*0.4),c});
    blobs.add(x,z,1.0*s);
  }
  // near-plaza edge bushes (ring)
  for(let i=0;i<22;i++){ const a=i/22*6.283+rnd()*0.2, r=15.4+rnd()*1.2, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(clearance(x,z)<0.8) continue; const h=heightAt(x,z); const s=0.7+rnd()*0.5; place(x,z,0.5); blobs.add(x,z,0.9*s);
    (i%2?bushB:bushA).push({x,y:h-0.05,z,ry:rnd()*6.28,s,sy:s,c:new THREE.Color(1,1,1)}); }
  const bushMat=()=>patchWind(std({roughness:0.9}),{amp:0.1,height:1.2,speed:1.0});
  inst(G.bushGeo({seed:3}),bushMat(),bushA,{cast:true}).name='bushes';
  inst(G.bushGeo({flowers:true,seed:4}),bushMat(),bushB,{cast:true}).name='bushesFlower';

  // ---------- rocks ----------
  const rocks=[]; let rt=0;
  const pushRock=(x,z,s)=>{ const h=heightAt(x,z); rocks.push({x,y:h-0.1,z,ry:rnd()*6.28,s,sy:s*(0.7+rnd()*0.5),c:new THREE.Color(1,1,1).multiplyScalar(0.85+rnd()*0.25)}); if(s>0.9) ctx.colliders.push({x,z,r:0.5*s}); };
  for(let i=0;i<14;i++){ const a=rnd()*6.283, r=POND.r+0.5+rnd()*1.8, x=POND.x+Math.cos(a)*r, z=POND.z+Math.sin(a)*r; pushRock(x,z,0.5+rnd()*0.8); }
  while(rocks.length<70&&rt++<5000){ const a=rnd()*6.283, r=20+rnd()*42, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(clearance(x,z)<1.2) continue; const h=heightAt(x,z); if(h<-0.3) continue; pushRock(x,z,0.5+rnd()*1.3); }
  inst(G.rockGeo(2),std({roughness:0.95}),rocks,{cast:true}).name='rocks';

  // ---------- reeds + lilies at pond ----------
  const reeds=[];
  for(let i=0;i<150;i++){ const a=rnd()*6.283, r=POND.r-1.8+rnd()*3.4, x=POND.x+Math.cos(a)*r, z=POND.z+Math.sin(a)*r;
    const h=heightAt(x,z); if(h>0.4||h<-0.85||clearance(x,z)<-9) continue; const c=new THREE.Color().setRGB(0.28,0.5,0.2).multiplyScalar(0.8+rnd()*0.5);
    reeds.push({x,y:Math.max(h,-0.9)-0.05,z,ry:rnd()*6.28,s:1.2+rnd()*1.1,c}); }
  inst(G.grassTuft({n:6,height:1.5,width:0.07,spread:0.12,seed:8,base:[0.35,0.5,0.3],mid:[0.8,1,0.6],tip:[1.2,1.3,0.6]}),patchWind(lamb(),{amp:0.3,height:1.5,speed:1}),reeds,{}).name='reeds';
  const lilies=[], lotus=[];
  for(let i=0;i<200&&lilies.length<30;i++){ const a=rnd()*6.283, r=rnd()*(POND.r-1.4), x=POND.x+Math.cos(a)*r, z=POND.z+Math.sin(a)*r;
    if(heightAt(x,z)>WATER_Y-0.35) continue; lilies.push({x,y:WATER_Y+0.025,z,ry:rnd()*6.28,s:0.7+rnd()*0.8});
    if(rnd()<0.28) lotus.push({x:x+0.1,y:WATER_Y+0.03,z,ry:rnd()*6.28,s:0.9+rnd()*0.4}); }
  const lm=lamb({side:THREE.DoubleSide}); inst(G.lilyGeo(),lm,lilies,{receive:false}).name='lilies';
  inst(G.lotusGeo(),lamb({side:THREE.DoubleSide}),lotus,{receive:false}).name='lotus';

  return { group, palms, mangos, bananas, update(){} };
}

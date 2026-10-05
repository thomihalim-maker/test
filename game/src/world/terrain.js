// Terrain: height function, zones, vertex-colored + splat-textured mesh, height texture for water depth
import * as THREE from 'three';
import { fbm, vnoise, S, clamp, lerp, mulberry32 } from './noise.js';
import { makeGrassTex, makeDirtTex, makeSandTex } from './textures.js';

export const WATER_Y = -0.5;
export const POND = { x: -24, z: 14, r: 6.2 };
export const PEN = { x: 26, z: 6, hx: 8, hz: 6 };
export const SIZE = 240;
export const roadX = (z) => 2.2 * Math.sin(z * 0.07 + 0.5);

const segDist = (px,pz,ax,az,bx,bz)=>{ const dx=bx-ax,dz=bz-az; const t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz),0,1); return Math.hypot(px-ax-dx*t,pz-az-dz*t); };
export const dPlaza = (x,z)=>Math.hypot(x,z)-14;
export const dPen = (x,z,m=1.0)=>{ const qx=Math.abs(x-PEN.x)-(PEN.hx+m), qz=Math.abs(z-PEN.z)-(PEN.hz+m); return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0); };
export const dPath = (x,z)=>segDist(x,z,8,6,18,6)-1.6;
export const dRoad = (x,z)=>{ const x8=roadX(8); if(z<8) return Math.hypot(x-x8,z-8)-1.8; return Math.abs(x-roadX(z))-1.8; };
export const dPond = (x,z)=>Math.hypot(x-POND.x,z-POND.z)-POND.r;
// clearance (m) to nearest reserved area (>0 = free for planting)
export const clearance = (x,z)=>Math.min(dPlaza(x,z)-1, dPen(x,z,1.5), dPath(x,z), dRoad(x,z), dPond(x,z)-0.5);

export function heightAt(x,z){
  const r=Math.hypot(x,z);
  const rn=r+5*fbm(x*0.035+3,z*0.035-7,2);
  const big=fbm(x*0.022+11,z*0.022+5,4);
  const mid=fbm(x*0.07,z*0.07,3);
  let H=(0.5+0.5*big)*(8+8*S(0.1,0.6,fbm(x*0.012-4,z*0.012+9,2)))*S(26,54,r)+mid*0.8*S(10,28,r)+big*0.9*S(12,30,r);
  H+=3.2*S(36,50,r)*(0.55+0.45*fbm(Math.atan2(z,x)*1.3+2,r*0.02,2));
  const t=S(40,50,r);
  if(t>0){ const st=2.0,q=H/st,f=q-Math.floor(q); const tq=(Math.floor(q)+S(0.6,0.92,f))*st; H+=(tq-H)*t; }
  // flat zones mask
  const F=S(0,12,dPlaza(x,z))*S(0,10,dPen(x,z,0))*S(0,6,dPath(x,z))*S(0,7,dRoad(x,z));
  if(H<0) H*=0.2;
  let h=H*F*(1-S(50,64,rn));
  h+=-5.5*S(58,82,rn);
  const dp=Math.hypot(x-POND.x,z-POND.z)+2.2*fbm(x*0.12,z*0.12,2);
  h+=-1.9*(1-S(1,9.6,dp));
  return h;
}

// ---------- colors ----------
const C=(hex)=>new THREE.Color(hex);
const gA=C('#79cf3a'), gB=C('#4fb43a'), gC=C('#b0de48'), gD=C('#35a04c'), gE=C('#6bc23c');
const dirtPath=C('#c79b60'), dirtPlaza=C('#cfb27c'), dirtPen=C('#c2995a'), straw=C('#d9bd6a');
const sandC=C('#f3dfa4'), sandWet=C('#cdb581'), mud=C('#7d6a45'), bed=C('#4aa5a0'), bedDeep=C('#2b6f8f');
const earth=C('#8d6a3f'), rice1=C('#b9d34c'), rice2=C('#86cf4a'), rock=C('#9a9486');

export function buildTerrain(ctx){
  const N=SIZE; // 1m cells
  const geo=new THREE.PlaneGeometry(SIZE,SIZE,N,N); geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, n=pos.count;
  const col=new Float32Array(n*3), splat=new Float32Array(n*3), hs=new Float32Array(n);
  for(let i=0;i<n;i++){ const y=heightAt(pos.getX(i),pos.getZ(i)); pos.setY(i,y); hs[i]=y; }
  geo.computeVertexNormals();
  const nor=geo.attributes.normal, tmp=new THREE.Color();
  for(let i=0;i<n;i++){
    const x=pos.getX(i), z=pos.getZ(i), h=hs[i], ny=nor.getY(i), r=Math.hypot(x,z);
    const n1=fbm(x*0.045,z*0.045,3), n2=fbm(x*0.15+9,z*0.15,3), n3=vnoise(x*0.7,z*0.7)-0.5, n4=fbm(x*0.4-5,z*0.4+2,2);
    // grass painterly
    tmp.copy(gB).lerp(gA,S(-0.35,0.35,n1));
    tmp.lerp(gC,S(0.05,0.7,n2)*0.55); tmp.lerp(gD,S(0.25,0.8,-n2)*0.55);
    tmp.lerp(gE,S(0.3,0.9,n4)*0.3);
    tmp.lerp(gC,S(1.5,7,h)*0.45);
    tmp.multiplyScalar(0.94+n3*0.16);
    // rice paddies on terraces
    const paddy=S(42,50,r)*S(0.1,0.35,fbm(x*0.03+50,z*0.03+20,2))*(1-S(52,60,r));
    if(paddy>0){ const stripe=0.5+0.5*Math.sin((x+z)*1.3); tmp.lerp(rice1.clone().lerp(rice2,stripe),paddy*0.8); }
    // steep -> earth/rock
    const steep=1-ny; tmp.lerp(earth,S(0.10,0.3,steep)*0.85); tmp.lerp(rock,S(0.28,0.5,steep)*0.7);
    // dirt zones
    let dirt=0, dc=dirtPath;
    const dpa=dPath(x,z)+n3*0.9, dro=dRoad(x,z)+n3*1.0, dpl=Math.hypot(x,z)-12.5+n2*2.2, dpe=dPen(x,z,-0.6)+n3*0.8;
    const wPath=1-S(-0.2,0.9,dpa), wRoad=(1-S(-0.3,0.8,dro))*(1-S(55,62,z)), wPlaza=(1-S(-0.6,1.3,dpl))*0.95, wPen=1-S(-0.5,0.8,dpe);
    dirt=Math.max(wPath,wRoad,wPlaza,wPen);
    if(dirt>0){
      dc=tmp.clone().copy(dirtPath);
      if(wPlaza>=dirt-1e-3 && wPlaza>wPath) dc.copy(dirtPlaza).lerp(dirtPath,S(0.3,0.9,n1+0.3)*0.5);
      if(wPen>wPlaza&&wPen>=wPath) { dc.copy(dirtPen).lerp(straw,S(-0.1,0.5,n2)*0.7); }
      dc.multiplyScalar(0.92+n3*0.2);
      // grass-tuft fringe on dirt edges
      tmp.lerp(dc,dirt);
    }
    // sand/shore/seabed
    const dp=Math.hypot(x-POND.x,z-POND.z);
    const coastal=S(36,48,r)||0;
    let sand=coastal*(1-S(0.05,0.85+n3*0.5,h)), underwater=S(WATER_Y+0.15,WATER_Y-0.35,h);
    if(sand>0){ tmp.lerp(sandWet,0); const wet=S(0.25,-0.5,h); const sc=sandC.clone().lerp(sandWet,wet*0.85); tmp.lerp(sc,sand); }
    // pond banks: mud ring + shallow tint
    const pond=(1-S(5.2,9.5,dp+n3*1.5))*(1-S(-0.1,0.4,h-0.0));
    if(pond>0){ const mw=S(0.55,-0.45,h); tmp.lerp(mud,pond*mw*0.8); }
    if(underwater>0){ const deep=S(WATER_Y,-3.8,h); const bc=(dp<14? mud.clone().lerp(C('#4f8a7a'),0.5): bed.clone()); bc.lerp(bedDeep,deep); tmp.lerp(bc,underwater); }
    col[i*3]=tmp.r; col[i*3+1]=tmp.g; col[i*3+2]=tmp.b;
    // splat weights: grass, dirt, sand
    const sw=Math.max(sand,underwater*0.6), dw=dirt*(1-sw);
    splat[i*3]=Math.max(0,1-dw-sw); splat[i*3+1]=dw; splat[i*3+2]=sw;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setAttribute('aSplat',new THREE.BufferAttribute(splat,3));
  const tg=makeGrassTex(), td=makeDirtTex(), ts=makeSandTex();
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.97,metalness:0});
  mat.onBeforeCompile=(sh)=>{
    sh.uniforms.tG={value:tg}; sh.uniforms.tD={value:td}; sh.uniforms.tS={value:ts};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aSplat; varying vec3 vSplat; varying vec2 vWP;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvSplat=aSplat; vWP=position.xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tG,tD,tS; varying vec3 vSplat; varying vec2 vWP;')
      .replace('#include <map_fragment>',`
      vec2 rw=mat2(0.8,0.6,-0.6,0.8)*vWP;
      float dg=texture2D(tG,vWP/5.5).r*(0.55+0.55*texture2D(tG,rw/19.0).r);
      float dd=texture2D(tD,vWP/3.2).r;
      float ds=texture2D(tS,vWP/4.5).r;
      float det=(dg*vSplat.x+dd*vSplat.y+ds*vSplat.z)*1.55;
      diffuseColor.rgb*=det;`);
  };
  const mesh=new THREE.Mesh(geo,mat); mesh.receiveShadow=true; mesh.name='terrain';
  // height texture for water shader (r8, -6..10 m over SIZE)
  const HR=256, data=new Uint8Array(HR*HR);
  for(let j=0;j<HR;j++)for(let i=0;i<HR;i++){ const x=(i/(HR-1)-0.5)*SIZE, z=(j/(HR-1)-0.5)*SIZE; data[j*HR+i]=Math.round(clamp((heightAt(x,z)+6)/16,0,1)*255); }
  const ht=new THREE.DataTexture(data,HR,HR,THREE.RedFormat,THREE.UnsignedByteType); ht.minFilter=ht.magFilter=THREE.LinearFilter; ht.needsUpdate=true;
  ht.wrapS=ht.wrapT=THREE.ClampToEdgeWrapping;
  // color sampler for vegetation tinting
  const colorAt=(x,z,out)=>{ const fx=(x/SIZE+0.5)*N, fz=(z/SIZE+0.5)*N; const ix=clamp(Math.round(fx),0,N), iz=clamp(Math.round(fz),0,N); const k=(iz*(N+1)+ix)*3; return out.setRGB(col[k],col[k+1],col[k+2]); };
  return { mesh, heightTex:ht, colorAt };
}

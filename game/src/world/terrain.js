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
const gA=C('#7cc444'), gB=C('#55a840'), gC=C('#aed15a'), gD=C('#3a9552'), gE=C('#6db848'), gBlue=C('#3d9a66'), gYel=C('#a8c456');
const dWorn=C('#9a7450'), dDamp=C('#6f5638'), dA=C('#a97a4c'), dB=C('#e0c48c'), dC=C('#8f7a50'), _dc=new THREE.Color();
const dirtPath=C('#c4905a'), dirtPlaza=C('#c9a875'), dirtPen=C('#bf9254'), straw=C('#d9bd6a');
const sandC=C('#f3dfa4'), sandWet=C('#cdb581'), mud=C('#7d6a45'), bed=C('#4aa5a0'), bedDeep=C('#2b6f8f');
const earth=C('#8d6a3f'), rice1=C('#b9d34c'), rice2=C('#86cf4a'), rock=C('#9a9486');

// terrain surface shading at a point -> writes color into out, returns [grass,dirt,sand] weights
const segD=(px,pz,ax,az,bx,bz)=>{ const dx=bx-ax,dz=bz-az; const t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz),0,1); return Math.hypot(px-ax-dx*t,pz-az-dz*t); };
export function shadeAt(x,z,h,ny,out){
  const r=Math.hypot(x,z), tmp=out;
    const n1=fbm(x*0.045,z*0.045,3), n2=fbm(x*0.15+9,z*0.15,3), n3=vnoise(x*0.7,z*0.7)-0.5, n4=fbm(x*0.4-5,z*0.4+2,2);
    // grass painterly
    tmp.copy(gB).lerp(gA,S(-0.35,0.35,n1));
    tmp.lerp(gC,S(0.05,0.7,n2)*0.55); tmp.lerp(gD,S(0.25,0.8,-n2)*0.55);
    tmp.lerp(gE,S(0.3,0.9,n4)*0.3);
    const n5=fbm(x*0.022+30,z*0.022-12,2); tmp.lerp(gBlue,S(0.05,0.55,n5)*0.5); tmp.lerp(gYel,S(0.05,0.55,-n5)*0.42);
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
    const wPath=1-S(-0.6,1.4,dpa), wRoad=(1-S(-0.6,1.4,dro))*(1-S(55,62,z)), wPlaza=(1-S(-1.2,1.6,dpl+n4*1.2))*0.95, wPen=1-S(-0.5,0.8,dpe);
    dirt=Math.max(wPath,wRoad,wPlaza,wPen);
    if(dirt>0){
      dc=_dc.copy(dirtPath);
      if(wPlaza>=dirt-1e-3 && wPlaza>wPath) dc.copy(dirtPlaza).lerp(dirtPath,S(0.3,0.9,n1+0.3)*0.5);
      if(wPen>wPlaza&&wPen>=wPath) { dc.copy(dirtPen).lerp(straw,S(-0.1,0.5,n2)*0.7); }
      dc.lerp(dA,S(0.0,0.6,n1)*0.5).lerp(dB,S(0.1,0.7,n4)*0.4).lerp(dC,S(0.3,0.8,-n2)*0.3); dc.multiplyScalar(0.88+n3*0.3);
      // worn walking lines (road entry -> masjid front, path -> plaza)
      const wd=Math.min(segD(x,z,roadX(14),14,0,8.5),segD(x,z,8.5,6,3.5,4.5),segD(x,z,0,8.5,-6,11))+n3*0.7;
      const worn=(1-S(0.25,1.3,wd))*Math.max(wPlaza,wPath,wRoad);
      dc.lerp(dWorn,worn*0.45);
      tmp.lerp(dc,dirt);
      // damp darker band where dirt meets grass
      const damp=S(0.18,0.5,dirt)*(1-S(0.62,0.95,dirt))*(wPen>0.5?0.3:1);
      tmp.lerp(dDamp,damp*0.28);
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
    const sw=Math.max(sand,underwater*0.6), dw=dirt*(1-sw);
  return [Math.max(0,1-dw-sw),dw,sw];
}
const _sc=new THREE.Color();
export function colorAtWorld(x,z,out){ const h=heightAt(x,z), e=0.5; const dx=heightAt(x+e,z)-h, dz=heightAt(x,z+e)-h; const ny=1/Math.hypot(dx/e,dz/e,1); shadeAt(x,z,h,ny,out); return out; }

// warped grid: fine (~0.85m) cells in the play area, ~2.5m at the island rim/sea
const WA=0.6, HALF=SIZE/2;
const warp=(u)=>HALF*(WA*u+(1-WA)*u*u*u);
const unwarp=(x)=>{ let u=x/HALF; for(let k=0;k<6;k++){ const f=WA*u+(1-WA)*u*u*u-x/HALF, d=WA+3*(1-WA)*u*u; u-=f/d; } return clamp(u,-1,1); };

export function buildTerrain(ctx, { quality='high' }={}){
  const N=quality==='low'?130:170;
  const geo=new THREE.PlaneGeometry(2,2,N,N); geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, n=pos.count;
  const col=new Float32Array(n*3), splat=new Float32Array(n*3), hs=new Float32Array(n);
  for(let i=0;i<n;i++){ const x=warp(pos.getX(i)), z=warp(pos.getZ(i)); const y=heightAt(x,z); pos.setXYZ(i,x,y,z); hs[i]=y; }
  geo.computeVertexNormals();
  const nor=geo.attributes.normal, tmp=new THREE.Color();
  for(let i=0;i<n;i++){
    const w=shadeAt(pos.getX(i),pos.getZ(i),hs[i],nor.getY(i),tmp);
    col[i*3]=tmp.r; col[i*3+1]=tmp.g; col[i*3+2]=tmp.b; splat[i*3]=w[0]; splat[i*3+1]=w[1]; splat[i*3+2]=w[2];
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setAttribute('aSplat',new THREE.BufferAttribute(splat,3));
  const tg=makeGrassTex(), td=makeDirtTex(), ts=makeSandTex();
  const mat=new THREE.MeshLambertMaterial({vertexColors:true});
  mat.onBeforeCompile=(sh)=>{
    sh.uniforms.tG={value:tg}; sh.uniforms.tD={value:td}; sh.uniforms.tS={value:ts};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aSplat; varying vec3 vSplat; varying vec2 vWP;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvSplat=aSplat; vWP=position.xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tG,tD,tS; varying vec3 vSplat; varying vec2 vWP;')
      .replace('#include <map_fragment>',`
      vec2 rw=mat2(0.8,0.6,-0.6,0.8)*vWP;
      float dg=texture2D(tG,vWP/5.5).r*(0.55+0.55*texture2D(tG,rw/19.0).r);
      float dd=texture2D(tD,vWP/3.2).r*(0.62+0.5*texture2D(tD,(mat2(0.6,-0.8,0.8,0.6)*vWP)/1.15).r);
      float ds=texture2D(tS,vWP/4.5).r;
      float det=(dg*vSplat.x+dd*vSplat.y+ds*vSplat.z)*1.55; det=mix(1.0,det,1.0)*(0.8+0.5*texture2D(tD,vWP/37.0).r);
      diffuseColor.rgb*=det;`);
  };
  const mesh=new THREE.Mesh(geo,mat); mesh.receiveShadow=true; mesh.name='terrain';
  // height texture for water shader (r8, -6..10 m over SIZE)
  const HR=quality==='low'?128:192, data=new Uint8Array(HR*HR);
  for(let j=0;j<HR;j++)for(let i=0;i<HR;i++){ const x=(i/(HR-1)-0.5)*SIZE, z=(j/(HR-1)-0.5)*SIZE; data[j*HR+i]=Math.round(clamp((heightAt(x,z)+6)/16,0,1)*255); }
  const ht=new THREE.DataTexture(data,HR,HR,THREE.RedFormat,THREE.UnsignedByteType); ht.minFilter=ht.magFilter=THREE.LinearFilter; ht.needsUpdate=true;
  ht.wrapS=ht.wrapT=THREE.ClampToEdgeWrapping;
  // grass field textures on a uniform 2m grid: RGBA = terrain color (sqrt-encoded) + grass weight; half-float height
  const MS=2, NV=SIZE/MS+1, gm=new Uint8Array(NV*NV*4), hh=new Uint16Array(NV*NV), mcol=new Float32Array(NV*NV*3);
  for(let j=0;j<NV;j++)for(let i=0;i<NV;i++){
    const k=j*NV+i, x=-HALF+i*MS, z=-HALF+j*MS, h=heightAt(x,z), r=Math.hypot(x,z);
    const e=0.6, dx=heightAt(x+e,z)-h, dz=heightAt(x,z+e)-h, ny=1/Math.hypot(dx/e,dz/e,1);
    const sp=shadeAt(x,z,h,ny,tmp);
    let w=Math.pow(sp[0],0.6)*(0.75+0.5*vnoise(x*0.9,z*0.9))*S(0.82,0.92,ny)*S(-0.2,0.25,h);
    if(r>40) w*=S(0.3,0.8,h);
    w*=S(0.0,0.6,clearance(x,z)+1.2);
    mcol[k*3]=tmp.r; mcol[k*3+1]=tmp.g; mcol[k*3+2]=tmp.b;
    gm[k*4]=Math.min(255,Math.sqrt(tmp.r)*255); gm[k*4+1]=Math.min(255,Math.sqrt(tmp.g)*255); gm[k*4+2]=Math.min(255,Math.sqrt(tmp.b)*255); gm[k*4+3]=clamp(w,0,1)*255;
    hh[k]=THREE.DataUtils.toHalfFloat(h);
  }
  const grassMask=new THREE.DataTexture(gm,NV,NV,THREE.RGBAFormat,THREE.UnsignedByteType); grassMask.minFilter=grassMask.magFilter=THREE.LinearFilter; grassMask.needsUpdate=true;
  const heightHF=new THREE.DataTexture(hh,NV,NV,THREE.RedFormat,THREE.HalfFloatType); heightHF.minFilter=heightHF.magFilter=THREE.LinearFilter; heightHF.needsUpdate=true;
  // color sampler for vegetation tinting (bilinear on the 2m grid)
  const colorAt=(x,z,out)=>{ const fx=clamp((x+HALF)/MS,0,NV-1.001), fz=clamp((z+HALF)/MS,0,NV-1.001); const ix=fx|0, iz=fz|0, tx=fx-ix, tz=fz-iz;
    const g=(c)=>{ const a=mcol[(iz*NV+ix)*3+c], b=mcol[(iz*NV+ix+1)*3+c], d=mcol[((iz+1)*NV+ix)*3+c], e2=mcol[((iz+1)*NV+ix+1)*3+c]; return (a*(1-tx)+b*tx)*(1-tz)+(d*(1-tx)+e2*tx)*tz; };
    return out.setRGB(g(0),g(1),g(2)); };
  // soft contact AO baked into terrain vertex colors around placed objects [{x,z,r,k}]
  const NP=N+1;
  function applyAO(list){
    const ca=geo.attributes.color;
    let maskDirty=false;
    for(const o of list){
      if(o.c){ // colour tint (e.g. fallen blossom carpet) + thin the grass field there
        const R=o.r;
        const i0=Math.max(0,Math.floor((unwarp(o.x-R)+1)/2*N)), i1=Math.min(N,Math.ceil((unwarp(o.x+R)+1)/2*N));
        const j0=Math.max(0,Math.floor((unwarp(o.z-R)+1)/2*N)), j1=Math.min(N,Math.ceil((unwarp(o.z+R)+1)/2*N));
        for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){ const k=j*NP+i, px=pos.getX(k), pz=pos.getZ(k), d=Math.hypot(px-o.x,pz-o.z); if(d>R) continue;
          const f=o.k*(1-S(R*0.35,R,d))*(0.55+0.45*vnoise(px*1.3,pz*1.3));
          col[k*3]+=(o.c.r-col[k*3])*f; col[k*3+1]+=(o.c.g-col[k*3+1])*f; col[k*3+2]+=(o.c.b-col[k*3+2])*f; }
        for(let j=Math.max(0,Math.floor((o.z-R+HALF)/MS));j<=Math.min(NV-1,Math.ceil((o.z+R+HALF)/MS));j++)
          for(let i=Math.max(0,Math.floor((o.x-R+HALF)/MS));i<=Math.min(NV-1,Math.ceil((o.x+R+HALF)/MS));i++){
            const d=Math.hypot(-HALF+i*MS-o.x,-HALF+j*MS-o.z); if(d>R) continue; const k=j*NV+i; gm[k*4+3]=Math.round(gm[k*4+3]*(0.45+0.55*S(R*0.5,R,d))); maskDirty=true; }
        continue;
      }
      const R=o.r*1.6;
      const i0=Math.max(0,Math.floor((unwarp(o.x-R)+1)/2*N)), i1=Math.min(N,Math.ceil((unwarp(o.x+R)+1)/2*N));
      const j0=Math.max(0,Math.floor((unwarp(o.z-R)+1)/2*N)), j1=Math.min(N,Math.ceil((unwarp(o.z+R)+1)/2*N));
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
        const k=j*NP+i, d=Math.hypot(pos.getX(k)-o.x,pos.getZ(k)-o.z); if(d>R) continue;
        const f=1-(o.k??0.35)*(1-S(o.r*0.3,R,d));
        col[k*3]*=f*0.97; col[k*3+1]*=f; col[k*3+2]*=Math.min(1,f*1.05);
      }
    }
    ca.needsUpdate=true; if(maskDirty) grassMask.needsUpdate=true;
  }
  return { mesh, heightTex:ht, colorAt, grassMask, heightHF, applyAO, NV, MS };
}

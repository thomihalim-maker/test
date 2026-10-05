// Drifting petals, fireflies, birds, butterflies
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { heightAt, POND } from './terrain.js';
import { makeRadialTex } from './textures.js';
import { windU, patchWind } from './wind.js';

export function createParticles(ctx, sources=[]){
  const group=new THREE.Group(); group.name='particles';
  const r=mulberry32(77);
  // ---- falling blossom petals: only under flowering (flamboyan) trees near the camera ----
  const LOW=ctx.quality==='low';
  const NP=LOW?8:14;
  const pg=new THREE.BufferGeometry(); // cupped teardrop ~0.1 x 0.07 (scaled ~0.5 -> 4-6 cm)
  pg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-0.05, -0.035,0.012,0.0, 0,0.004,0.0,  0,0,-0.05, 0,0.004,0.0, 0.035,0.012,0.0,  -0.035,0.012,0.0, 0,0.008,0.05, 0,0.004,0.0,  0,0.004,0.0, 0,0.008,0.05, 0.035,0.012,0.0],3));
  pg.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(12).fill(0).flatMap(()=>[0,1,0]),3));
  pg.setAttribute('color',new THREE.Float32BufferAttribute([0.85,0.85,0.85, 1,1,1, 0.92,0.92,0.92, 0.85,0.85,0.85, 0.92,0.92,0.92, 1,1,1, 1,1,1, 1.05,1.05,1.05, 0.92,0.92,0.92, 0.92,0.92,0.92, 1.05,1.05,1.05, 1,1,1],3));
  const pm=patchWind(new THREE.MeshLambertMaterial({vertexColors:true}),{amp:0});
  const petals=new THREE.InstancedMesh(pg,pm,NP); petals.frustumCulled=false; petals.name='petals';
  const pcol=['#ff7f8a','#ff9aa8','#ff6a5a','#ffb0bd'].map(c=>new THREE.Color(c));
  const P=[]; for(let i=0;i<NP;i++){ P.push({x:0,y:-99,z:0,ph:r()*6.28,sp:0.6+r()*0.6,rs:1.5+r()*2.5,s:0.45+r()*0.2,src:null}); petals.setColorAt(i,pcol[i%4]); }
  group.add(petals);
  const spawn=(p,focus)=>{ let best=null,bd=30; for(const s of sources){ const d=Math.hypot(s.x-focus.x,s.z-focus.z); if(d<bd&&r()<0.85){ bd=d; best=s; } }
    p.src=best; if(!best){ p.y=-99; return; } const a=r()*6.283, d=Math.sqrt(r())*2.8*best.s; p.x=best.x+Math.cos(a)*d; p.z=best.z+Math.sin(a)*d; p.y=heightAt(p.x,p.z)+3.0*best.s+r()*0.8; p.ground=heightAt(p.x,p.z); };
  // ---- fireflies ----
  const NF=140, fpos=new Float32Array(NF*3), fph=new Float32Array(NF);
  const hubs=[[POND.x,POND.z,9],[-8,-30,14],[30,-20,16],[-40,-10,12],[10,34,16],[0,-14,12],[38,28,12]];
  for(let i=0;i<NF;i++){ const h=hubs[i%hubs.length], a=r()*6.28, d=Math.sqrt(r())*h[2]; const x=h[0]+Math.cos(a)*d, z=h[1]+Math.sin(a)*d; fpos[i*3]=x; fpos[i*3+1]=heightAt(x,z)+0.6+r()*2.2; fpos[i*3+2]=z; fph[i]=r()*100; }
  const fg=new THREE.BufferGeometry(); fg.setAttribute('position',new THREE.BufferAttribute(fpos,3)); fg.setAttribute('aPh',new THREE.BufferAttribute(fph,1));
  const fm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uI:{value:0},uPx:{value:1}},
    vertexShader:`attribute float aPh; uniform float uTime,uI,uPx; varying float vA;
      void main(){ vec3 p=position; float t=uTime*0.5+aPh; p.x+=sin(t*1.3)*1.2+sin(t*0.7+2.)*0.8; p.y+=sin(t*1.1+aPh)*0.5; p.z+=cos(t*1.0)*1.2+sin(t*0.6)*0.8;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; float bl=pow(max(0.,sin(uTime*1.6+aPh*3.7)),1.5);
        vA=uI*(0.25+0.75*bl); gl_PointSize=uPx*(26.0/-mv.z)*(0.6+bl*0.7); }`,
    fragmentShader:`varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vec3(1.0,0.95,0.45)*1.8,a*a*vA); }`});
  const fireflies=new THREE.Points(fg,fm); fireflies.frustumCulled=false; group.add(fireflies);
  // ---- birds: high (y 46-62), swept two-part wings, soft fogged slate colour ----
  const NB=6; const bg=new THREE.BufferGeometry();
  const bv=[ 0,0,0.32, -0.07,0,0.02, 0.07,0,0.02,   0,0,-0.34, 0.07,0,0.02, -0.07,0,0.02,   0,0,-0.34, 0.12,0,-0.42, -0.12,0,-0.42 ];
  for(const sx of [-1,1]){ // inner + outer wing
    bv.push(sx*0.07,0,0.1, sx*0.55,0,0.05, sx*0.07,0,-0.12,  sx*0.07,0,-0.12, sx*0.55,0,0.05, sx*0.52,0,-0.16,
            sx*0.55,0,0.05, sx*1.05,0,-0.14, sx*0.52,0,-0.16); }
  bg.setAttribute('position',new THREE.Float32BufferAttribute(bv,3));
  const bm=new THREE.MeshBasicMaterial({color:0x6c7890,side:THREE.DoubleSide,fog:true});
  bm.onBeforeCompile=(sh)=>{ sh.uniforms.uTime=windU.uTime; sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=position; float ph=instanceMatrix[3].x*0.2+instanceMatrix[3].z*0.13; float ax=abs(position.x); float fl=sin(uTime*6.5+ph*7.0); transformed.y+=fl*(ax*0.55+max(ax-0.5,0.0)*0.6); transformed.x*=1.0-0.12*abs(fl)*step(0.5,ax);`); };
  bm.customProgramCacheKey=()=>'bird';
  const birds=new THREE.InstancedMesh(bg,bm,NB); birds.frustumCulled=false; birds.name='birds'; group.add(birds);
  const B=[]; for(let i=0;i<NB;i++) B.push({cx:(r()-0.5)*50,cz:(r()-0.5)*50,R:28+r()*34,a:r()*6.28,sp:(0.04+r()*0.03)*(r()<.5?1:-1),y:46+r()*16,s:1.3+r()*0.6});
  // ---- butterflies ----
  const NBF=14, bfg=new THREE.BufferGeometry();
  bfg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, -0.14,0.0,0.1, -0.12,0,-0.08, 0,0,0, 0.14,0,0.1, 0.12,0,-0.08],3));
  bfg.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3));
  const bfm=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,color:0xffffff});
  bfm.onBeforeCompile=(sh)=>{ sh.uniforms.uTime=windU.uTime; sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=position; transformed.y+=abs(position.x)*sin(uTime*18.0+instanceMatrix[3].x*3.0)*3.0;`); };
  const bfl=new THREE.InstancedMesh(bfg,bfm,NBF); bfl.frustumCulled=false; group.add(bfl);
  const bcol=['#ffd23f','#ff9bd0','#ffffff','#9bd0ff'].map(c=>new THREE.Color(c));
  const BF=[]; for(let i=0;i<NBF;i++){ BF.push({x:r()*50-25,z:r()*50-25,a:r()*6.28,ph:r()*10,y:0.8+r()*1.2}); bfl.setColorAt(i,bcol[i%4]); }

  const d=new THREE.Object3D(), tgt=new THREE.Vector3();
  function update(dt,t,atm,focus){
    const day=1-atm.state.night;
    // petals: fall from flowering canopies near the camera, fade with distance
    const vis=day*(atm.state.night>0.6?0:1);
    petals.visible=vis>0.05&&sources.length>0;
    if(petals.visible){ const cam=ctx.camera.position, wd=atm.state.windDir;
      for(let i=0;i<NP;i++){ const p=P[i];
        if(!p.src||p.y<-50){ p.rest=0; spawn(p,focus); }
        else if(p.rest>0){ p.rest+=dt; if(p.rest>3){ p.rest=0; spawn(p,focus); } }
        else { p.x+=(wd.x*0.35+Math.sin(t*1.3+p.ph)*0.4)*dt; p.z+=(wd.y*0.35+Math.cos(t*1.1+p.ph)*0.4)*dt; p.y-=dt*(0.32+0.18*Math.sin(t*2.1+p.ph))*p.sp; p.ground=heightAt(p.x,p.z); if(p.y<=p.ground+0.03){ p.y=p.ground+0.03; p.rest=dt; } }
        const dc=Math.hypot(p.x-cam.x,p.y-cam.y,p.z-cam.z), fade=1-Math.min(1,Math.max(0,(dc-14)/10));
        const onGround=p.rest>0;
        d.position.set(p.x,p.y,p.z); if(onGround) d.rotation.set(0,p.ph,0); else d.rotation.set(Math.sin(t*p.rs+p.ph)*1.2,t*p.rs*0.6+p.ph,Math.cos(t*p.rs*0.8)*0.9);
        d.scale.setScalar((p.src&&p.ground>-0.3?p.s*fade*vis:0)+1e-4); d.updateMatrix(); petals.setMatrixAt(i,d.matrix); }
      petals.instanceMatrix.needsUpdate=true;
    }
    // fireflies
    fm.uniforms.uTime.value=t; fm.uniforms.uI.value=Math.max(0,(atm.state.night-0.25)/0.75); fm.uniforms.uPx.value=ctx.renderer.getPixelRatio()*ctx.renderer.domElement.height/720;
    fireflies.visible=fm.uniforms.uI.value>0.01;
    // birds
    birds.visible=day>0.3;
    if(birds.visible) for(let i=0;i<NB;i++){ const b=B[i]; b.a+=b.sp*dt; const x=b.cx+Math.cos(b.a)*b.R, z=b.cz+Math.sin(b.a)*b.R;
      const y=b.y+Math.sin(t*0.4+i)*1.5, cp=ctx.camera.position, dc=Math.hypot(x-cp.x,y-cp.y,z-cp.z);
      d.position.set(x,y,z); d.rotation.set(0,-b.a+(b.sp>0?0:Math.PI)+Math.PI,Math.sin(t*0.5+i)*0.25); d.scale.setScalar(dc<15?1e-4:b.s*Math.min(1,(dc-15)/8)*(0.5+0.5*day)); d.updateMatrix(); birds.setMatrixAt(i,d.matrix); }
    birds.instanceMatrix.needsUpdate=true;
    // butterflies
    bfl.visible=day>0.5&&atm.state.elev>0.15;
    if(bfl.visible) for(let i=0;i<NBF;i++){ const b=BF[i]; b.a+=dt*(0.8+0.6*Math.sin(t*0.5+b.ph)); b.x+=Math.cos(b.a)*dt*0.9; b.z+=Math.sin(b.a)*dt*0.9;
      let dx=b.x-focus.x, dz=b.z-focus.z; if(dx>26)b.x-=52; if(dx<-26)b.x+=52; if(dz>26)b.z-=52; if(dz<-26)b.z+=52;
      const h=heightAt(b.x,b.z); if(h<0.1) b.a+=Math.PI*dt*2; d.position.set(b.x,Math.max(h,0)+b.y+Math.sin(t*2+b.ph)*0.25,b.z); d.rotation.set(0,-b.a,0); d.scale.setScalar(h<-0.3?1e-4:1); d.updateMatrix(); bfl.setMatrixAt(i,d.matrix); }
    bfl.instanceMatrix.needsUpdate=true;
  }
  return { group, update };
}

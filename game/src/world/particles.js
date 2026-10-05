// Drifting petals, fireflies, birds, butterflies
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { heightAt, POND } from './terrain.js';
import { makeRadialTex } from './textures.js';
import { windU } from './wind.js';

export function createParticles(ctx){
  const group=new THREE.Group(); group.name='particles';
  const r=mulberry32(77);
  // ---- petals ----
  const NP=110; const pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.Float32BufferAttribute([-0.07,0,-0.05, 0.07,0,-0.05, 0.0,0.02,0.08],3));
  pg.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));
  const pm=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,color:0xffffff});
  const petals=new THREE.InstancedMesh(pg,pm,NP); petals.frustumCulled=false;
  const pcol=['#ffb3cf','#ffffff','#ffd1e0','#ffe38a','#ffc0a0'].map(c=>new THREE.Color(c));
  const P=[]; for(let i=0;i<NP;i++){ P.push({x:r()*40-20,y:r()*10,z:r()*40-20,ph:r()*6.28,sp:0.5+r()*0.8,rs:1+r()*2,s:0.8+r()*1.1}); petals.setColorAt(i,pcol[i%5]); }
  group.add(petals);
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
  // ---- birds ----
  const NB=7; const bg=new THREE.BufferGeometry();
  bg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0.18, -0.55,0,-0.06, 0,0,-0.12,  0,0,0.18, 0,0,-0.12, 0.55,0,-0.06],3));
  bg.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3));
  const bm=new THREE.MeshBasicMaterial({color:0x2b3345,side:THREE.DoubleSide,fog:true});
  bm.onBeforeCompile=(sh)=>{ sh.uniforms.uTime=windU.uTime; sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=position; float ph=instanceMatrix[3].x*0.2; transformed.y+=abs(position.x)*sin(uTime*8.0+ph*7.0)*0.9; transformed.y+=0.0;`); };
  const birds=new THREE.InstancedMesh(bg,bm,NB); birds.frustumCulled=false; group.add(birds);
  const B=[]; for(let i=0;i<NB;i++) B.push({cx:(r()-0.5)*40,cz:(r()-0.5)*40,R:25+r()*30,a:r()*6.28,sp:(0.05+r()*0.04)*(r()<.5?1:-1),y:22+r()*14,s:1.4+r()*0.8});
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
    // petals around focus
    const wd=atm.state.windDir; const vis=day*0.95;
    pm.color.setScalar(0.25+0.75*day); petals.visible=vis>0.05;
    if(petals.visible){
      for(let i=0;i<NP;i++){ const p=P[i];
        p.x+=(wd.x*0.9+Math.sin(t*0.7+p.ph)*0.6)*p.sp*dt*2; p.z+=(wd.y*0.9+Math.cos(t*0.6+p.ph)*0.6)*p.sp*dt*2; p.y-=dt*(0.35+0.2*Math.sin(t+p.ph))*p.sp;
        if(p.y<0.0||Math.abs(p.x-(focus.x%40))>20) {}
        // wrap relative to focus
        let dx=p.x-focus.x, dz=p.z-focus.z; if(dx>22)p.x-=44; if(dx<-22)p.x+=44; if(dz>22)p.z-=44; if(dz<-22)p.z+=44;
        const gh=heightAt(p.x,p.z); if(p.y<gh+0.15){ p.y=gh+6+r()*5; }
        d.position.set(p.x,p.y,p.z); d.rotation.set(t*p.rs+p.ph,t*p.rs*0.7,t*p.rs*0.5); d.scale.setScalar(p.s*1.5*vis+0.0001); d.updateMatrix(); petals.setMatrixAt(i,d.matrix); }
      petals.instanceMatrix.needsUpdate=true;
    }
    // fireflies
    fm.uniforms.uTime.value=t; fm.uniforms.uI.value=Math.max(0,(atm.state.night-0.25)/0.75); fm.uniforms.uPx.value=ctx.renderer.getPixelRatio()*ctx.renderer.domElement.height/720;
    fireflies.visible=fm.uniforms.uI.value>0.01;
    // birds
    birds.visible=day>0.3;
    if(birds.visible) for(let i=0;i<NB;i++){ const b=B[i]; b.a+=b.sp*dt; const x=b.cx+Math.cos(b.a)*b.R, z=b.cz+Math.sin(b.a)*b.R;
      d.position.set(x,b.y+Math.sin(t*0.4+i)*1.5,z); d.rotation.set(0,-b.a+(b.sp>0?0:Math.PI)+Math.PI,Math.sin(t*0.5+i)*0.2); d.scale.setScalar(b.s*(0.5+0.5*day)); d.updateMatrix(); birds.setMatrixAt(i,d.matrix); }
    birds.instanceMatrix.needsUpdate=true;
    // butterflies
    bfl.visible=day>0.5&&atm.state.elev>0.15;
    if(bfl.visible) for(let i=0;i<NBF;i++){ const b=BF[i]; b.a+=dt*(0.8+0.6*Math.sin(t*0.5+b.ph)); b.x+=Math.cos(b.a)*dt*0.9; b.z+=Math.sin(b.a)*dt*0.9;
      let dx=b.x-focus.x, dz=b.z-focus.z; if(dx>26)b.x-=52; if(dx<-26)b.x+=52; if(dz>26)b.z-=52; if(dz<-26)b.z+=52;
      const h=heightAt(b.x,b.z); d.position.set(b.x,Math.max(h,0)+b.y+Math.sin(t*2+b.ph)*0.25,b.z); d.rotation.set(0,-b.a,0); d.scale.setScalar(1); d.updateMatrix(); bfl.setMatrixAt(i,d.matrix); }
    bfl.instanceMatrix.needsUpdate=true;
  }
  return { group, update };
}

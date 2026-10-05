// Pond + sea water: depth-aware shader with foam, glints, sky-reflection tint
import * as THREE from 'three';
import { WATER_Y, SIZE } from './terrain.js';

const VS=`
varying vec3 vWP; varying vec3 vView;
#include <fog_pars_vertex>
void main(){
  vec4 wp=modelMatrix*vec4(position,1.0); vWP=wp.xyz; vView=cameraPosition-wp.xyz;
  vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;
  #include <fog_vertex>
}`;
const FS=`
uniform float uTime,uNight,uSize; uniform sampler2D uH;
uniform vec3 uSunDir,uSunCol,uSkyH,uSkyT,uShallow,uMid,uDeep,uAmb;
varying vec3 vWP; varying vec3 vView;
#include <fog_pars_fragment>
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vn(p); p=p*2.1+vec2(5.2,1.3); a*=.5; } return s; }
void main(){
  vec2 huv=vWP.xz/uSize+0.5;
  float inside=step(0.0,huv.x)*step(huv.x,1.0)*step(0.0,huv.y)*step(huv.y,1.0);
  float terrH=mix(-6.0,texture2D(uH,huv).r*16.0-6.0,inside);
  float depth=max(${WATER_Y.toFixed(2)}-terrH,0.0);
  vec2 p=vWP.xz;
  // animated normal from 2 scrolling noise layers
  float e=0.12;
  vec2 q1=p*0.55+vec2(uTime*0.05,uTime*0.03), q2=p*1.7-vec2(uTime*0.09,-uTime*0.06);
  float n0=fbm(q1)*0.7+fbm(q2)*0.3;
  float nx=fbm(q1+vec2(e,0.))*0.7+fbm(q2+vec2(e,0.))*0.3-n0;
  float nz=fbm(q1+vec2(0.,e))*0.7+fbm(q2+vec2(0.,e))*0.3-n0;
  vec3 N=normalize(vec3(-nx*2.2,1.0,-nz*2.2));
  vec3 V=normalize(vView);
  float fres=pow(1.0-max(dot(N,V),0.0),3.0);
  // body color by depth
  vec3 body=mix(uShallow,uMid,smoothstep(0.0,1.2,depth)); body=mix(body,uDeep,smoothstep(0.9,4.5,depth));
  body*=uAmb;
  // sky reflection tint
  vec3 sky=mix(uSkyH,uSkyT,clamp(1.0-V.y*0.0+N.y*0.0,0.0,1.0)*0.55);
  vec3 col=mix(body,sky,0.18+0.6*fres);
  // sun glint
  vec3 Rf=reflect(-V,N);
  float spec=pow(max(dot(Rf,uSunDir),0.0),260.0)*smoothstep(0.0,0.1,uSunDir.y);
  float spark=smoothstep(0.78,0.95,vn(p*5.0+uTime*vec2(0.7,0.4)))*pow(max(dot(Rf,uSunDir),0.0),12.0);
  col+=uSunCol*(spec*3.0+spark*0.9);
  // soft foam at shorelines
  float wob=fbm(p*0.8+uTime*0.03);
  float edge=1.0-smoothstep(0.0,0.22+wob*0.18,depth);
  float ring=sin(depth*9.0-uTime*0.9+wob*5.0);
  float band=smoothstep(0.55,0.95,ring)*(1.0-smoothstep(0.12,0.85,depth))*smoothstep(0.0,0.05,depth);
  float foamN=smoothstep(0.35,0.7,fbm(p*3.0+uTime*0.05));
  float foam=clamp(edge*0.95+band*0.55*foamN,0.0,1.0);
  col=mix(col,vec3(1.0)*(0.55+0.5*uAmb.r),foam*0.9);
  float alpha=mix(0.18,0.93,smoothstep(0.0,0.9,depth));
  alpha=max(alpha,foam*0.95);
  alpha=max(alpha,fres*0.5);
  gl_FragColor=vec4(col,alpha);
  #include <fog_fragment>
}`;

export function createWater(ctx, heightTex){
  const mat=new THREE.ShaderMaterial({
    vertexShader:VS, fragmentShader:FS, transparent:true, depthWrite:false, fog:true,
    uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{
      uTime:{value:0},uNight:{value:0},uSize:{value:SIZE},uH:{value:heightTex},
      uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color(1,1,1)},
      uSkyH:{value:new THREE.Color()},uSkyT:{value:new THREE.Color()},
      uShallow:{value:new THREE.Color('#8fe6d4')},uMid:{value:new THREE.Color('#35b8cc')},uDeep:{value:new THREE.Color('#1c63a8')},uAmb:{value:new THREE.Color(1,1,1)}}])
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(900,900,1,1).rotateX(-Math.PI/2),mat);
  mesh.position.y=WATER_Y; mesh.renderOrder=2; mesh.name='water'; mesh.frustumCulled=false;
  function update(t,atm){
    const u=mat.uniforms, k=atm.state.info;
    u.uTime.value=t; u.uNight.value=atm.state.night;
    u.uSunDir.value.copy(atm.state.elev>-0.03?atm.state.sunDir:atm.state.moonDir);
    u.uSunCol.value.copy(atm.state.elev>-0.03?k.sun:new THREE.Color('#9db4ff')).multiplyScalar(atm.state.elev>-0.03?1:0.5);
    u.uSkyH.value.copy(k.hor); u.uSkyT.value.copy(k.mid);
    const amb=0.18+0.95*(1-atm.state.night); u.uAmb.value.setRGB(amb*(0.95+0.1*k.glow.r),amb,amb*1.02);
    u.uAmb.value.lerp(k.hs,0.15);
  }
  return { mesh, update };
}

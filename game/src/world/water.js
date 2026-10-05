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
  float rr=length(p); float sea=smoothstep(40.0,56.0,rr);
  // slow ocean swell: directional sines (analytic slope), toward shore
  vec2 sw=vec2(0.0);
  vec2 d1=normalize(vec2(0.8,0.6)), d2=normalize(vec2(-0.3,1.0)), d3=-p/max(rr,1.0);
  sw+=d1*cos(dot(p,d1)*0.35-uTime*0.9)*0.18;
  sw+=d2*cos(dot(p,d2)*0.52-uTime*1.15+1.7)*0.12;
  sw+=d3*cos(rr*0.6+uTime*1.2)*0.10*smoothstep(90.0,60.0,rr);
  vec3 N=normalize(vec3(-nx*2.2-sw.x*sea,1.0,-nz*2.2-sw.y*sea));
  float crest=sea*smoothstep(0.75,1.0,sin(dot(p,d1)*0.35-uTime*0.9)*0.5+0.5)*smoothstep(0.4,0.75,fbm(p*0.6+uTime*0.04));
  vec3 V=normalize(vView);
  float fres=pow(1.0-max(dot(N,V),0.0),3.0);
  // body color by depth
  vec3 body=mix(uShallow,uMid,smoothstep(0.0,1.2,depth)); body=mix(body,uDeep,smoothstep(0.9,4.5,depth));
  body=mix(body,uDeep*vec3(0.75,0.85,1.0),smoothstep(85.0,170.0,rr)*sea);
  // pond: teal-olive shallows -> deep green-teal centre
  vec3 pondC=mix(vec3(0.30,0.50,0.36),vec3(0.13,0.36,0.38),smoothstep(0.05,0.9,depth)); pondC=mix(pondC,vec3(0.05,0.2,0.26),smoothstep(0.8,1.6,depth));
  body=mix(pondC,body,sea);
  body*=uAmb;
  // sky reflection tint
  vec3 sky=mix(uSkyH,uSkyT,clamp(1.0-V.y*0.0+N.y*0.0,0.0,1.0)*0.55);
  vec3 Rf0=reflect(-V,N);
  // faint treeline reflection on the pond (low reflected rays hit the surrounding greenery)
  sky=mix(sky,vec3(0.12,0.26,0.12)*uAmb,(1.0-sea)*smoothstep(0.55,0.12,Rf0.y)*0.85);
  vec3 col=mix(body,sky,(0.06+0.5*fres)*mix(0.75,1.0,sea));
  // sun glint
  vec3 Rf=reflect(-V,N);
  float spec=pow(max(dot(Rf,uSunDir),0.0),260.0)*smoothstep(0.0,0.1,uSunDir.y);
  float spark=smoothstep(0.78,0.95,vn(p*5.0+uTime*vec2(0.7,0.4)))*pow(max(dot(Rf,uSunDir),0.0),12.0);
  col+=uSunCol*(spec*3.0+spark*0.9);
  // soft foam at shorelines
  float wob=fbm(p*0.8+uTime*0.03);
  float edge=1.0-smoothstep(0.0,mix(0.1,0.22,sea)+wob*0.1,depth);
  float ring=sin(depth*mix(9.0,5.0,sea)-uTime*mix(0.9,1.3,sea)+wob*5.0);
  float band=smoothstep(0.55,0.95,ring)*(1.0-smoothstep(0.12,mix(0.85,1.6,sea),depth))*smoothstep(0.0,0.05,depth);
  float sw0=0.18+0.22*(0.5+0.5*sin(uTime*0.8+wob*6.0)); float swash=sea*smoothstep(sw0-0.12,sw0-0.03,depth)*(1.0-smoothstep(sw0,sw0+0.05,depth))*0.9;
  float foamN=smoothstep(0.35,0.7,fbm(p*3.0+uTime*0.05));
  float foam=clamp(edge*mix(0.12,0.95,sea)+band*0.75*sea*foamN+swash*0.8+crest*0.25,0.0,1.0);
  col=mix(col,mix(vec3(0.85,0.8,0.65),vec3(1.0),max(sea,smoothstep(0.0,0.12,depth)))*(0.5+0.5*uAmb.r),foam*mix(0.55,0.9,sea));
  float alpha=mix(mix(0.55,0.45,sea),0.94,smoothstep(0.0,1.0,depth));
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
      uShallow:{value:new THREE.Color('#58d8c4')},uMid:{value:new THREE.Color('#22a6cc')},uDeep:{value:new THREE.Color('#164fa6')},uAmb:{value:new THREE.Color(1,1,1)}}])
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(900,900,1,1).rotateX(-Math.PI/2),mat);
  mesh.position.y=WATER_Y; mesh.renderOrder=2; mesh.name='water'; mesh.frustumCulled=false;
  function update(t,atm){
    const u=mat.uniforms, k=atm.state.info;
    u.uTime.value=t; u.uNight.value=atm.state.night;
    u.uSunDir.value.copy(atm.state.elev>-0.03?atm.state.sunDir:atm.state.moonDir);
    u.uSunCol.value.copy(atm.state.elev>-0.03?k.sun:new THREE.Color('#9db4ff')).multiplyScalar(atm.state.elev>-0.03?1:0.5);
    u.uSkyH.value.copy(atm.state.fogC||k.hor); u.uSkyT.value.copy(k.mid);
    const amb=0.2+0.8*(1-atm.state.night); u.uAmb.value.setRGB(amb*(0.95+0.1*k.glow.r),amb,amb*1.02);
    u.uAmb.value.lerp(k.hs,0.15);
  }
  return { mesh, update };
}

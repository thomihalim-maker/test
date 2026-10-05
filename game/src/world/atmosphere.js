// Sky dome (gradient + sun/moon + stars + stylized clouds), lights, day/night keyframes
import * as THREE from 'three';
import { S, clamp } from './noise.js';

const C=(h)=>new THREE.Color(h);
// hour, top, mid, horizon(fog), sun color, sun intensity, hemi sky, hemi ground, hemi intensity, exposure, sun glow
const K=[
 [0,  '#070c22','#0e1a42','#1b2a58','#8fa8ff',0,'#4a5fa8','#1d2340',0.85,1.15,'#000000'],
 [4.8,'#0a1230','#18286a','#2c3a78','#8fa8ff',0,'#4a5fa8','#1d2340',0.8,1.15,'#000000'],
 [5.7,'#2a3a80','#6a5a9c','#f09a88','#ffa070',0.5,'#8a8cc8','#5a4a50',0.7,1.1,'#ff8a60'],
 [6.5,'#4676d0','#c5a0c0','#ffc296','#ffbe80',1.6,'#a8b4e0','#7a6a55',0.8,1.05,'#ff9a5a'],
 [8,  '#3a88e4','#86c4f4','#b4dcf4','#ffe6c0',2.7,'#bfdcff','#8dbf68',0.95,1.0,'#ffd9a0'],
 [12, '#2c80ec','#62b6f6','#a8d8f8','#fff6e2',3.1,'#c4e2ff','#92c56c',1.0,0.95,'#fff0c0'],
 [16, '#3484e8','#78bcf2','#b8e0f6','#ffe9b8',2.8,'#c0dcff','#8fbe68',0.95,1.0,'#ffe0a0'],
 [17.4,'#5a74cc','#f0a896','#ffbca0','#ffa060',2.9,'#e0c8e0','#7a6a6a',1.0,1.08,'#ff9a70'],
 [18.4,'#3f4ca0','#d87aa0','#ff9070','#ff7a44',1.1,'#e8a8b0','#6a5a58',0.8,1.1,'#ff7040'],
 [19.3,'#1f2c6a','#6a52a0','#b4608e','#ff6a52',0.25,'#8a7ab8','#40405a',0.78,1.15,'#ff5a50'],
 [20.5,'#0b1236','#1c2a64','#303c78','#8fa8ff',0,'#4a5fa8','#1d2340',0.82,1.15,'#000000'],
 [24, '#070c22','#0e1a42','#1b2a58','#8fa8ff',0,'#4a5fa8','#1d2340',0.85,1.15,'#000000'],
].map(k=>({h:k[0],top:C(k[1]),mid:C(k[2]),hor:C(k[3]),sun:C(k[4]),sunI:k[5],hs:C(k[6]),hg:C(k[7]),hI:k[8],exp:k[9],glow:C(k[10])}));

const _a=new THREE.Color();
function sample(hour){
  let i=0; while(i<K.length-2 && hour>=K[i+1].h) i++;
  const a=K[i], b=K[i+1]; let t=clamp((hour-a.h)/(b.h-a.h),0,1); t=t*t*(3-2*t);
  const o={};
  for(const k of ['top','mid','hor','sun','hs','hg','glow']) o[k]=a[k].clone().lerp(b[k],t);
  for(const k of ['sunI','hI','exp']) o[k]=a[k]+(b[k]-a[k])*t;
  return o;
}

const SKY_VS=`varying vec3 vDir; void main(){ vDir=position; vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.9999; }`;
const SKY_FS=`
precision highp float;
varying vec3 vDir;
uniform vec3 uTop,uMid,uHor,uSunDir,uSunCol,uGlow,uMoonDir,uCloudLit,uCloudShade;
uniform float uNight,uTime,uCover,uSunI;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float h31(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(7.1,3.3); a*=.5; } return s; }
void main(){
  vec3 d=normalize(vDir); float y=d.y;
  vec3 col=mix(uHor,uMid,smoothstep(0.0,0.3,y)); col=mix(col,uTop,smoothstep(0.25,0.95,y));
  col=mix(col,uHor,smoothstep(0.0,-0.08,y));
  float sd=max(dot(d,uSunDir),0.);
  col+=uGlow*(pow(sd,5.)*0.28+pow(sd,40.)*0.45)*smoothstep(-0.2,0.1,uSunDir.y);
  // horizon band glow toward sun
  col+=uGlow*0.35*pow(sd,2.)*exp(-abs(y)*6.)*smoothstep(-0.1,0.15,uSunDir.y);
  float disc=smoothstep(0.99935,0.99965,sd);
  col=mix(col,uSunCol*5.0+uGlow,disc*step(-0.02,uSunDir.y)*smoothstep(-0.02,0.04,uSunDir.y));
  // moon
  float md=dot(d,uMoonDir);
  float moon=smoothstep(0.9985,0.9988,md);
  vec3 mcol=vec3(1.0,0.97,0.88)*2.2;
  // crescent-ish shading
  float cres=smoothstep(0.0,0.6,dot(normalize(d-uMoonDir*md),normalize(vec3(0.6,0.5,0.2))))*0.35+0.65;
  col=mix(col,mcol*cres,moon*uNight);
  col+=vec3(0.45,0.55,0.9)*pow(max(md,0.),90.)*0.35*uNight;
  // stars
  if(uNight>0.01 && y>0.0){
    vec3 sp=d*160.; vec3 id=floor(sp); float hh=h31(id); vec3 f=fract(sp)-.5;
    float st=step(0.982,hh)*smoothstep(0.38,0.0,length(f));
    float tw=0.6+0.4*sin(uTime*2.0+hh*80.);
    vec3 sp2=d*60.; vec3 id2=floor(sp2); float h2=h31(id2+3.1); float st2=step(0.97,h2)*smoothstep(0.35,0.0,length(fract(sp2)-.5));
    col+=(vec3(.9,.95,1.)*(st*tw+st2*0.5))*uNight*smoothstep(0.0,0.2,y)*1.6;
  }
  // stylized clouds
  if(y>0.0){
    vec2 uv=d.xz/(y+0.18)*0.62+vec2(uTime*0.006,uTime*0.0025);
    float n=fbm(uv*1.15); float n2=fbm(uv*1.15+uSunDir.xz*0.09/(0.3+abs(uSunDir.y)));
    float c=smoothstep(uCover,uCover+0.10,n);
    float lit=clamp((n-n2)*7.0+0.62,0.,1.);
    vec3 cc=mix(uCloudShade,uCloudLit,lit);
    // silver lining near sun
    cc+=uGlow*pow(sd,6.)*0.5*(1.-c*0.0);
    float fade=smoothstep(0.0,0.16,y);
    col=mix(col,cc,c*fade*0.96);
  }
  gl_FragColor=vec4(col,1.0);
}`;

export function createAtmosphere(ctx){
  const { scene } = ctx;
  const sky=new THREE.Mesh(new THREE.SphereGeometry(300,40,24),new THREE.ShaderMaterial({
    vertexShader:SKY_VS,fragmentShader:SKY_FS,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,
    uniforms:{uTop:{value:new THREE.Color()},uMid:{value:new THREE.Color()},uHor:{value:new THREE.Color()},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color()},
      uGlow:{value:new THREE.Color()},uMoonDir:{value:new THREE.Vector3(0,-1,0)},uCloudLit:{value:new THREE.Color()},uCloudShade:{value:new THREE.Color()},
      uNight:{value:0},uTime:{value:0},uCover:{value:0.5},uSunI:{value:1}}}));
  sky.frustumCulled=false; sky.renderOrder=-1000; sky.name='sky'; scene.add(sky);

  scene.fog=new THREE.FogExp2(0xbfe4fa,0.0068);
  const hemi=new THREE.HemisphereLight(0xbfe0ff,0x8bbf6a,1.0); scene.add(hemi); ctx.hemi=hemi;
  const sun=new THREE.DirectionalLight(0xfff0d0,3); sun.castShadow=true;
  const SM=ctx.quality==='low'?1024:2048; sun.shadow.mapSize.set(SM,SM);
  const sc=sun.shadow.camera; const EXT=22; sc.left=-EXT; sc.right=EXT; sc.top=EXT; sc.bottom=-EXT; sc.near=20; sc.far=160;
  sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.05; sun.shadow.radius=5;
  scene.add(sun); scene.add(sun.target); ctx.sun=sun;
  const fill=new THREE.DirectionalLight(0xbcd8ff,0.35); scene.add(fill); scene.add(fill.target);

  const sunDir=new THREE.Vector3(), moonDir=new THREE.Vector3(), L=new THREE.Vector3(), R=new THREE.Vector3(), U=new THREE.Vector3(), T=new THREE.Vector3();
  const lightTarget=new THREE.Vector3(), fogC=new THREE.Color(), _g=new THREE.Color();
  const state={ night:0, elev:1, sunDir, moonDir, golden:0, info:null, fogC, windDir:new THREE.Vector2(1,0.4).normalize() };
  const step=(2*EXT)/SM;

  function update(dt,t,hour,camPos,focus){
    const k=sample(hour);
    state.info=k;
    const a=(hour-6)/12*Math.PI; // sun arc 6..18
    const elev=Math.sin(a);
    sunDir.set(Math.cos(a)*0.95,elev,-0.32).normalize();
    // true elevation after normalisation
    state.elev=sunDir.y; moonDir.copy(sunDir).multiplyScalar(-1);
    const e=sunDir.y;
    state.night=1-S(-0.06,0.2,e);
    state.golden=S(0.5,0.25,e)*S(-0.05,0.12,e)*1.0;
    // sky uniforms
    const u=sky.material.uniforms;
    // desaturated horizon for fog + sky horizon (keeps sea blue at golden hour instead of milky pink)
    const hl=k.hor.r*0.2126+k.hor.g*0.7152+k.hor.b*0.0722;
    fogC.copy(k.hor).lerp(_g.setRGB(hl,hl,hl),0.12+0.3*state.golden).lerp(k.mid,0.12*state.golden);
    u.uTop.value.copy(k.top); u.uMid.value.copy(k.mid); u.uHor.value.copy(fogC);
    u.uSunDir.value.copy(sunDir); u.uSunCol.value.copy(k.sun); u.uGlow.value.copy(k.glow); u.uMoonDir.value.copy(moonDir);
    u.uNight.value=state.night; u.uTime.value=t; u.uSunI.value=k.sunI;
    const dayAmt=1-state.night;
    u.uCloudLit.value.setRGB(1,1,1).lerp(k.glow.clone().lerp(new THREE.Color(1,1,1),0.5),0.35).multiplyScalar(0.35+0.85*dayAmt).add(new THREE.Color(0.02,0.03,0.06));
    u.uCloudShade.value.copy(k.mid).lerp(new THREE.Color(0.75,0.8,0.95),0.5).multiplyScalar(0.55+0.4*dayAmt);
    u.uCover.value=0.47;
    sky.position.copy(camPos);
    // fog
    scene.fog.color.copy(fogC); scene.background=null;
    scene.fog.density=0.0056-0.0016*state.golden+0.0010*state.night;
    // lights
    const g=state.golden;
    const sunLevel=(k.sunI+(4.0-k.sunI)*g)*S(-0.04,0.18,e);
    const moonLevel=0.9*S(-0.03,-0.3,e);
    const useSun=e>-0.03;
    sun.color.copy(useSun?k.sun:new THREE.Color('#7f9cff'));
    sun.intensity=useSun?sunLevel:moonLevel;
    L.copy(useSun?sunDir:moonDir); if(L.y<0.22){ const h=Math.hypot(L.x,L.z)||1; L.x*=0.975/h; L.z*=0.975/h; L.y=0.22; } L.normalize();
    // snap focus to shadow texel grid in light space
    R.crossVectors(new THREE.Vector3(0,1,0),L).normalize(); U.crossVectors(L,R).normalize();
    const tr=Math.round(focus.dot(R)/step)*step, tu=Math.round(focus.dot(U)/step)*step, tl=focus.dot(L);
    lightTarget.set(0,0,0).addScaledVector(R,tr).addScaledVector(U,tu).addScaledVector(L,tl);
    sun.target.position.copy(lightTarget); sun.position.copy(lightTarget).addScaledVector(L,90);
    sun.target.updateMatrixWorld();
    hemi.color.copy(k.hs); hemi.groundColor.copy(k.hg); hemi.intensity=k.hI*(0.95+0.25*state.night); hemi.intensity+= (0.55-hemi.intensity)*g;
    // opposite soft fill tinted by sky
    T.copy(L); T.x*=-1; T.z*=-1; T.y=0.35; T.normalize();
    fill.position.copy(focus).addScaledVector(T,50); fill.target.position.copy(focus);
    fill.color.copy(k.mid).lerp(new THREE.Color(0.62,0.55,1.0),0.35+0.3*state.golden); fill.intensity=0.4+(0.3-0.4)*g+0.1*state.night;
    hemi.groundColor.lerp(_g.set('#6a58a0'),0.25+0.35*g); hemi.color.lerp(_g.set('#9a88e0'),0.5*g);
    if(useSun) sun.color.lerp(_g.set('#ffb070'),0.3*g);
    ctx.renderer.toneMappingExposure=k.exp;
    return state;
  }
  return { sky, sun, hemi, fill, update, state };
}

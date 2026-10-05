// Shared wind uniform + onBeforeCompile patch (world-space coherent sway for instanced foliage)
import * as THREE from 'three';
export const windU = { uTime: { value: 0 } };
export const NFIX = THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0');
export function patchWind(mat, { amp = 0.2, height = 1, speed = 1, flutter = 0, wind = true } = {}) {
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windU.uTime; sh.uniforms.uAmp = { value: amp }; sh.uniforms.uH = { value: height };
    sh.uniforms.uSpd = { value: speed }; sh.uniforms.uFl = { value: flutter };
    if (wind) sh.vertexShader = 'uniform float uTime,uAmp,uH,uSpd,uFl;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed=vec3(position);
      #ifdef USE_INSTANCING
        mat3 wim=mat3(instanceMatrix); vec3 wip=instanceMatrix[3].xyz; float wis2=dot(wim[0],wim[0]);
      #else
        mat3 wim=mat3(1.0); vec3 wip=vec3(0.0); float wis2=1.0;
      #endif
      float ww=clamp(position.y/uH,0.0,1.0); ww*=ww;
      float ph=wip.x*0.31+wip.z*0.23;
      float gu=sin(uTime*uSpd*1.2+ph)*0.55+sin(uTime*uSpd*2.3+ph*1.7+1.3)*0.25+0.7*(sin(uTime*0.35+wip.x*0.06+wip.z*0.04)*0.5+0.5);
      vec3 wo=vec3(0.92,0.0,0.38)*gu*uAmp*ww+vec3(-0.38,0.0,0.92)*sin(uTime*uSpd*1.7+ph*2.1)*0.25*uAmp*ww;
      wo.y-=abs(gu)*uAmp*ww*0.25;
      wo.y+=sin(uTime*3.1*uSpd+ph*3.0+position.x*1.7+position.z*1.3)*uFl*length(position.xz)*ww;
      transformed+=transpose(wim)*wo/wis2;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', NFIX);
  };
  mat.customProgramCacheKey = () => 'wind' + amp + height + speed + flutter + wind;
  return mat;
}

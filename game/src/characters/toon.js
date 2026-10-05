// Toon materials + instanced-person shader patches.
// Per-instance palette is packed into 6 vec4 attributes (7 rgb slots + flex xz) to stay well under 16 vertex attribs.
// Slots: 1 skin, 2 top, 3 bottom, 4 headgear, 5 shoe, 6 accent, 7 hair   (0 = fixed vertex color)
import * as THREE from 'three';

let _grad;
export function gradientMap(){
  if(_grad) return _grad;
  const d = new Uint8Array([128,178,214,235]);
  _grad = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.needsUpdate = true;
  return _grad;
}

// shared uniforms for screen-space outlines
export const OUTLINE_U = { uRes:{ value:new THREE.Vector2(1280,720) }, uDpr:{ value:1 } };

// high-contrast kotak (plaid) sarong pattern, grayscale (tinted by palette)
export function sarongTexture(){
  const S=256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#e6e6e6'; g.fillRect(0,0,S,S);
  // broad dark bands (overlap = darkest)
  g.globalAlpha = .62; g.fillStyle = '#2a2a2a';
  g.fillRect(0,0,S*.36,S); g.fillRect(0,0,S,S*.36);
  g.globalAlpha = .35; g.fillStyle = '#3a3a3a';
  g.fillRect(S*.6,0,S*.1,S); g.fillRect(0,S*.6,S,S*.1);
  g.globalAlpha = 1;
  // white pinstripes
  g.fillStyle = '#ffffff';
  for(const p of [.42,.52,.86]){ g.fillRect(S*p,0,4,S); g.fillRect(0,S*p,S,4); }
  // fine dark pinstripes inside band
  g.fillStyle = '#151515';
  for(const p of [.12,.24]){ g.fillRect(S*p,0,3,S); g.fillRect(0,S*p,S,3); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3,1.4); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const HEADER = `attribute vec2 aSF;
attribute vec4 iP0; attribute vec4 iP1; attribute vec4 iP2; attribute vec4 iP3; attribute vec4 iP4; attribute vec4 iP5;
vec3 palOf(float s){
  if(s<0.5) return vec3(1.0);
  if(s<1.5) return iP0.xyz; if(s<2.5) return vec3(iP0.w,iP1.xy); if(s<3.5) return vec3(iP1.zw,iP2.x);
  if(s<4.5) return iP2.yzw; if(s<5.5) return iP3.xyz; if(s<6.5) return vec3(iP3.w,iP4.xy); return vec3(iP4.zw,iP5.x);
}`;
const FLEX = `transformed += vec3(iP5.y, 0.0, iP5.z) * aSF.y;`;

export function personMaterial({map=null, rim=0.16}={}){
  const m = new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradientMap(), vertexColors:true, map });
  m.onBeforeCompile = (sh)=>{
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n'+HEADER)
      .replace('#include <color_vertex>', 'vColor = color.rgb * palOf(aSF.x);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n'+FLEX);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float f = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
        totalEmissiveRadiance += pow(f,3.0) * ${rim.toFixed(2)} * vec3(1.0,0.84,0.66) * diffuseColor.rgb; }`)
      .replace('#include <opaque_fragment>', `
      { // lilac-tinted shade so white cloth keeps its form
        float lb = dot(diffuseColor.rgb, vec3(.333)) + 1e-3;
        float sh = 1.0 - clamp(dot(outgoingLight, vec3(.333)) / lb, 0.0, 1.0);
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.86,0.80,1.10), clamp(sh*1.4,0.0,1.0));
      }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = ()=>'person2'+(map?'m':'')+rim;
  return m;
}

// Screen-space constant inverted hull: thickness = world thickness projected, clamped to [min,max] px. Hull is tinted per slot.
export function outlineMaterial(thick=0.012, maxPx=2.0, minPx=0.7){
  const m = new THREE.MeshBasicMaterial({ color:0xffffff, side:THREE.BackSide, vertexColors:true });
  m.onBeforeCompile = (sh)=>{
    sh.uniforms.uRes = OUTLINE_U.uRes; sh.uniforms.uDpr = OUTLINE_U.uDpr;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uRes; uniform float uDpr;\n'+HEADER)
      .replace('#include <color_vertex>', `{ vec3 pc = color.rgb * palOf(aSF.x);
          vColor = mix(vec3(0.17,0.10,0.07), pc*vec3(0.30,0.24,0.26), 0.55); }`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n'+FLEX)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 p1 = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed + normalize(normal)*0.02, 1.0);
          vec2 a = gl_Position.xy/gl_Position.w, b = p1.xy/p1.w;
          vec2 d = (b-a) * uRes * 0.5; float L = length(d);
          vec2 dir = L>1e-5 ? d/L : vec2(0.0);
          float px = clamp(L*(${thick.toFixed(4)}/0.02), ${minPx.toFixed(2)}*uDpr, ${maxPx.toFixed(2)}*uDpr);
          gl_Position.xy += dir * px * 2.0 / uRes * gl_Position.w; }`);
  };
  m.customProgramCacheKey = ()=>'outline2'+thick+maxPx+minPx;
  return m;
}

export function propOutlineMaterial(thick=0.012, color=0x3a2218){
  const m = new THREE.MeshBasicMaterial({ color, side:THREE.BackSide });
  m.onBeforeCompile = (sh)=>{
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed += normalize(normal) * ${thick.toFixed(4)};`);
  };
  m.customProgramCacheKey = ()=>'poutline'+thick;
  return m;
}
export function toonMat(color){ return new THREE.MeshToonMaterial({color, gradientMap:gradientMap()}); }

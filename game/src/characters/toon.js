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
// push the shadow lookup out along the normal: round chibi shapes stop self-shadowing into streaks, but still receive
// real shadows from the world (porch roofs, trees)
const SHADOW_BIAS = `#include <shadowmap_vertex>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  for(int i=0;i<NUM_DIR_LIGHT_SHADOWS;i++){
    vec4 swp = worldPosition + vec4(shadowWorldNormal * (directionalLightShadows[i].shadowNormalBias + 0.07), 0.0);
    vDirectionalShadowCoord[i] = directionalShadowMatrix[i] * swp;
  }
#endif`;

export function personMaterial({map=null, rim=0.16}={}){
  const m = new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradientMap(), vertexColors:true, map });
  m.onBeforeCompile = (sh)=>{
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n'+HEADER)
      .replace('#include <color_vertex>', 'vColor = color.rgb * palOf(aSF.x);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n'+FLEX)
      .replace('#include <color_vertex>', '#include <color_vertex>\n vCloth = (aSF.x>1.5 && aSF.x<6.5 && aSF.x!=5.0) ? 1.0 : 0.0;')
      .replace('#include <common>', '#include <common>\nvarying float vCloth;')
      .replace('#include <shadowmap_vertex>', SHADOW_BIAS);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCloth;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float f = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
        totalEmissiveRadiance += pow(f,3.0) * ${rim.toFixed(2)} * vec3(1.0,0.84,0.66) * diffuseColor.rgb; }`)
      .replace('#include <opaque_fragment>', `
      { // lilac-tinted shade on cloth only (keeps white cloth's form); clamped on light pastels to avoid mud
        float lb = dot(diffuseColor.rgb, vec3(.333)) + 1e-3;
        float sh = 1.0 - clamp(dot(outgoingLight, vec3(.333)) / lb, 0.0, 1.0);
        float sat = max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)) - min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b));
        float amt = vCloth * clamp(sh*1.2,0.0,1.0) * mix(0.45, 1.0, smoothstep(0.05,0.3,sat) * (1.0-smoothstep(.6,.9,lb)) + step(.85,lb)*(1.0-smoothstep(0.0,0.08,sat)));
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.9,0.86,1.06), amt);
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

// ---- painted-face head material: high gradient floor, no lilac tint, face atlas decal ----
let _gradFace;
function gradientFace(){
  if(_gradFace) return _gradFace;
  const d = new Uint8Array([200,200,238,255]);
  _gradFace = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  _gradFace.minFilter = _gradFace.magFilter = THREE.LinearFilter; _gradFace.needsUpdate = true;
  return _gradFace;
}
export function faceMaterial(atlas, {cols=6, rows=4, eyeV=.568}={}){
  const m = new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradientFace(), vertexColors:true });
  m.onBeforeCompile = (sh)=>{
    sh.uniforms.faceMap = { value: atlas };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n'+HEADER+`
        flat varying vec4 vCells; flat varying float vOpen; flat varying vec3 vHair; varying vec2 vFUV; varying float vFMask;`)
      .replace('#include <color_vertex>', 'vColor = color.rgb * palOf(aSF.x);')
      .replace('#include <shadowmap_vertex>', SHADOW_BIAS)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFUV = vec2((position.x+0.31)/0.62, (position.y+0.27)/0.44);
        vFMask = smoothstep(0.1, 0.2, position.z) * step(aSF.x, 1.5) * step(0.5, aSF.x);
        { int code = int(iP5.w + 0.5);
          vCells = vec4(float(code & 31), float((code>>5)&31), float((code>>10)&31), float((code>>15)&31));
          vOpen = float((code>>20)&7)/7.0; }
        vHair = vec3(iP4.zw, iP5.x);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D faceMap; flat varying vec4 vCells; flat varying float vOpen; flat varying vec3 vHair; varying vec2 vFUV; varying float vFMask;
        vec4 cellS(float idx, vec2 uv){
          if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) return vec4(0.0);
          float col = mod(idx, ${cols.toFixed(1)}), row = floor(idx/${cols.toFixed(1)});
          return texture2D(faceMap, vec2((col+uv.x)/${cols.toFixed(1)}, (row+1.0-uv.y)/${rows.toFixed(1)}));
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if(vFMask>0.001){
          vec4 c = cellS(vCells.w, vFUV); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb, c.a*vFMask);
          c = cellS(vCells.z, vFUV); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb*vHair*0.8, c.a*vFMask);
          vec2 e = vFUV; e.y = ${eyeV.toFixed(4)} + (e.y-${eyeV.toFixed(4)})/max(vOpen,0.07);
          c = cellS(vCells.x, e); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb, c.a*vFMask);
          c = cellS(vCells.y, vFUV); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb, c.a*vFMask);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float f = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
          totalEmissiveRadiance += pow(f,3.0) * 0.12 * vec3(1.0,0.84,0.66) * diffuseColor.rgb; }`);
  };
  m.customProgramCacheKey = ()=>'face1';
  return m;
}

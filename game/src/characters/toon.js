// Toon materials + instanced-person shader patches (palette slots, flex sway, inverted-hull outline)
import * as THREE from 'three';

let _grad;
export function gradientMap(){
  if(_grad) return _grad;
  const d = new Uint8Array([120,176,226,255]);
  _grad = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.needsUpdate = true;
  return _grad;
}

export function tartanTexture(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d8d8'; g.fillRect(0,0,128,128);
  g.globalAlpha = .55; g.fillStyle = '#8a8a8a';
  for(const p of [8,72]){ g.fillRect(p,0,26,128); g.fillRect(0,p,128,26); }
  g.globalAlpha = 1; g.fillStyle = '#ffffff';
  for(const p of [0,64]){ g.fillRect(p+2,0,3,128); g.fillRect(0,p+2,128,3); }
  g.fillStyle = '#6f6f6f';
  for(const p of [40,104]){ g.fillRect(p,0,2,128); g.fillRect(0,p,128,2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const HEADER = `attribute float aSlot; attribute float aFlex;
attribute vec3 iC0; attribute vec3 iC1; attribute vec3 iC2; attribute vec3 iC3; attribute vec3 iC4; attribute vec3 iFlex;`;

export function personMaterial({map=null, rim=0.2}={}){
  const m = new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradientMap(), vertexColors:true, map });
  m.onBeforeCompile = (sh)=>{
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n'+HEADER)
      .replace('#include <color_vertex>', `
        vec3 pal = vec3(1.0);
        if(aSlot>0.5){
          if(aSlot<1.5) pal=iC0; else if(aSlot<2.5) pal=iC1; else if(aSlot<3.5) pal=iC2; else if(aSlot<4.5) pal=iC3; else pal=iC4;
        }
        vColor = color.rgb * pal;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += iFlex * aFlex;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float f = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
        totalEmissiveRadiance += pow(f,3.0) * ${rim.toFixed(2)} * vec3(1.0,0.82,0.65); }`);
  };
  m.customProgramCacheKey = ()=>'person'+(map?'m':'')+rim;
  return m;
}

export function outlineMaterial(thick=0.02, color=0x3a2218){
  const m = new THREE.MeshBasicMaterial({ color, side:THREE.BackSide });
  m.onBeforeCompile = (sh)=>{
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFlex; attribute vec3 iFlex;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed += iFlex * aFlex;
        vec3 wp = (modelMatrix * instanceMatrix * vec4(0.0,0.3,0.0,1.0)).xyz;
        float dd = distance(cameraPosition, wp);
        transformed += normalize(normal) * ${thick.toFixed(4)} * clamp(0.55 + dd*0.045, 0.8, 3.2);`);
  };
  m.customProgramCacheKey = ()=>'outline'+thick;
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

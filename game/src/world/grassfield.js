// Camera-following dense grass field: fixed world lattice wrapped around the focus (no swimming),
// height + tint + density from terrain textures, distance fade into the sparse static grass.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { SIZE } from './terrain.js';
import { windU, NFIX } from './wind.js';
import { grassTri } from './trees.js';

export function createGrassField(ctx, terrain, { count = 9000, radius = 17 } = {}){
  const geo = grassTri({ n: 5, height: 0.6, width: 0.13, spread: 0.22, seed: 21 });
  const r = mulberry32(4242);
  const off = new Float32Array(count * 2), rnd = new Float32Array(count * 2);
  // jittered stratified lattice over [-R,R]^2
  const g = Math.ceil(Math.sqrt(count)), cell = (2 * radius) / g;
  for (let i = 0; i < count; i++) {
    const gx = i % g, gz = (i / g) | 0;
    off[i * 2] = -radius + (gx + r()) * cell; off[i * 2 + 1] = -radius + (gz + r()) * cell;
    rnd[i * 2] = r(); rnd[i * 2 + 1] = r();
  }
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2));
  geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 2));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const U = { uFocus: { value: new THREE.Vector2() }, uR: { value: radius }, uMask: { value: terrain.grassMask }, uHF: { value: terrain.heightHF }, uNV: { value: terrain.NV }, uMS: { value: terrain.MS } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); sh.uniforms.uTime = windU.uTime;
    sh.vertexShader = `uniform float uTime,uR,uNV,uMS; uniform vec2 uFocus; uniform sampler2D uMask,uHF; attribute vec2 aOff,aRnd;\n` +
      sh.vertexShader.replace('#include <begin_vertex>', `
      vec2 per=vec2(2.0*uR);
      vec2 wp=aOff+floor((uFocus-aOff)/per+0.5)*per;
      vec2 tuv=((wp+${(SIZE / 2).toFixed(1)})/uMS+0.5)/uNV;
      vec4 mk=texture2D(uMask,tuv); float gh=texture2D(uHF,tuv).r;
      float dist=length(wp-uFocus);
      float fade=1.0-smoothstep(uR*0.55,uR*0.97,dist);
      float s=smoothstep(0.15,0.6,mk.a)*fade*(0.75+0.6*aRnd.x);
      float ca=cos(aRnd.y*6.283), sa=sin(aRnd.y*6.283);
      vec3 transformed=vec3(ca*position.x-sa*position.z,position.y,sa*position.x+ca*position.z)*s;
      float ww=clamp(position.y/0.6,0.0,1.0); ww*=ww;
      float ph=wp.x*0.31+wp.y*0.23;
      float gu=sin(uTime*1.44+ph)*0.55+sin(uTime*2.76+ph*1.7+1.3)*0.25+0.7*(sin(uTime*0.35+wp.x*0.06+wp.y*0.04)*0.5+0.5);
      transformed+=vec3(0.92,-0.25*abs(gu),0.38)*gu*0.2*ww*s;
      transformed+=vec3(wp.x,gh-0.04,wp.y);
      vColor.rgb*=mk.rgb*mk.rgb*(1.08+0.28*aRnd.x);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', NFIX);
  };
  mat.customProgramCacheKey = () => 'grassfield';
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const id = new THREE.Matrix4(); for (let i = 0; i < count; i++) mesh.setMatrixAt(i, id);
  mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.name = 'grassField';
  return { mesh, update(focus){ U.uFocus.value.set(focus.x, focus.z); } };
}

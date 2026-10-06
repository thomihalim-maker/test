// World module: terrain, water, sky/day-night, vegetation, particles, camera rig.
import * as THREE from 'three';
import { heightAt, buildTerrain, WATER_Y, POND, PEN } from './terrain.js';
import { createAtmosphere } from './atmosphere.js';
import { createWater } from './water.js';
import { createVegetation } from './vegetation.js';
import { createBlobs, createLamps } from './props.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createDecor } from './decor.js';
import { createGrassField } from './grassfield.js';
import { createParticles } from './particles.js';
import { createCameraRig } from './camera.js';
import { windU, patchWind } from './wind.js';
import { palmGeo } from './trees.js';
import { mulberry32, fbm } from './noise.js';

export async function init(ctx){
  const { scene } = ctx;
  const q = new URLSearchParams(location.search);
  ctx.groundHeight = heightAt;
  ctx.waterY = WATER_Y;
  ctx.hour = q.has('hour') ? ((+q.get('hour')%24)+24)%24 : (ctx.hour ?? 8);
  const freeze = q.has('freeze') || q.get('hourspeed')==='0';
  const HOUR_PER_SEC = (q.has('hourspeed') ? +q.get('hourspeed') : 1/20);
  ctx.night = 0;
  // quality tier: ?quality=low|high, else heuristic (touch / small screen / few cores -> low)
  if (!ctx.quality) {
    const qp = q.get('quality');
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
    ctx.quality = qp === 'low' || qp === 'high' ? qp : (mobile ? 'low' : 'high');
  }
  const LOW = ctx.quality === 'low';

  const cam = createCameraRig(ctx);
  const atm = createAtmosphere(ctx);
  const terrain = buildTerrain(ctx, { quality: ctx.quality });
  scene.add(terrain.mesh);
  const blobs = createBlobs(ctx); scene.add(blobs.mesh);
  const water = createWater(ctx, terrain.heightTex); scene.add(water.mesh);
  const veg = createVegetation(ctx, terrain, blobs); scene.add(veg.group);
  const grassField = createGrassField(ctx, terrain, LOW ? { count: 3600, radius: 11 } : { count: 7000, radius: 15 }); scene.add(grassField.mesh);
  const decor = createDecor(ctx, blobs); scene.add(decor.group);
  const lamps = createLamps(ctx, blobs, decor.lampSpots); scene.add(lamps.group);
  const parts = createParticles(ctx, veg.broad[2].map(t=>({x:t.x,z:t.z,s:t.s})), [...veg.flowerPatches, ...veg.broad[2].map(t=>({x:t.x,z:t.z,r:3*t.s}))]); scene.add(parts.group);

  // distant islands: smooth radial-grid hills (single apex vertex), warm beach band with upright palms,
  // vertical green->blue-grey gradient, and extra aerial fade so they sit back in the haze
  {
    const r = mulberry32(5), g = [], palmsI = [];
    const FOGX = `#ifdef USE_FOG
      float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth * 1.5 );
      fogFactor = clamp( fogFactor + 0.08, 0.0, 0.78 );
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif`;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', FOGX); };
    mat.customProgramCacheKey = () => 'farIsland';
    const RINGS = LOW ? 16 : 24, SEG = LOW ? 36 : 48;
    const beach = new THREE.Color('#e3cc9c'), wet = new THREE.Color('#b9b494'), lo = new THREE.Color('#4f8a6c'), mid = new THREE.Color('#77a487'), hi = new THREE.Color('#a8bec0');
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.4 + r() * 0.5, d = 145 + r() * 50, R = 22 + r() * 26, peak = 9 + r() * 14, sq = 0.55 + r() * 0.35, rot = r() * 6.28;
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d, bumps = [0, 1, 2].map(() => [r() * 0.6 - 0.3, r() * 0.6 - 0.3, 0.3 + r() * 0.3, 0.3 + r() * 0.5]);
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const hAt = (lx, lz, rho) => { let h = Math.pow(Math.max(0, 1 - rho * rho), 1.8) * 0.7; for (const [bx, bz, br, bh] of bumps) h += bh * 0.5 * Math.exp(-((lx - bx) ** 2 + (lz - bz) ** 2) / (br * br));
        return h * peak * Math.min(1, Math.max(0, (1 - rho) / 0.22)) + 0.35 - (rho > 0.96 ? 2.5 * (rho - 0.96) / 0.04 : 0); };
      const pos = [], col = [], idx = []; let perIsl = 0;
      const push = (lx, lz, h) => { const x = lx * R, z = lz * R; pos.push(cx + x * cr - z * sr, h - 0.6, cz + x * sr + z * cr);
        const tH = Math.min(1, Math.max(0, (h - 1.2) / peak)); const c = h < 1.0 ? beach.clone().lerp(wet, Math.min(1, Math.max(0, 0.7 - h))) : (tH < 0.5 ? lo.clone().lerp(mid, tH * 2) : mid.clone().lerp(hi, tH * 2 - 1)); col.push(c.r, c.g, c.b); };
      push(0, 0, hAt(0, 0, 0));
      for (let k = 1; k <= RINGS; k++) {
        const rho = k / RINGS;
        for (let j = 0; j < SEG; j++) {
          const th = j / SEG * Math.PI * 2, edge = 1 + 0.12 * Math.sin(th * 3 + i) + 0.06 * Math.sin(th * 7 + i * 2);
          const lx = Math.cos(th) * rho * edge, lz = Math.sin(th) * sq * rho * edge, h = hAt(lx, lz, rho);
          push(lx, lz, h);
          if (h > 0.45 && h < 1.3 && rho > 0.8 && j % 5 === 0 && r() < 0.35 && perIsl++ < (LOW ? 1 : 2)) palmsI.push([pos[pos.length - 3], h - 0.75, pos[pos.length - 1]]);
        }
      }
      for (let j = 0; j < SEG; j++) idx.push(0, 1 + (j + 1) % SEG, 1 + j);
      for (let k = 1; k < RINGS; k++) for (let j = 0; j < SEG; j++) { const j2 = (j + 1) % SEG, A = 1 + (k - 1) * SEG + j, B2 = 1 + (k - 1) * SEG + j2, C2 = 1 + k * SEG + j, D = 1 + k * SEG + j2; idx.push(A, C2, B2, B2, C2, D); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      g.push(geo);
    }
    const isl = new THREE.Mesh(mergeGeometries(g), mat); isl.name = 'distantIslands'; scene.add(isl);
    if (palmsI.length) {
      const pg = palmGeo(7), pm = patchWind(new THREE.MeshLambertMaterial({ vertexColors: true }), { amp: 0.3, height: 9, speed: 0.7, fade: 0 });
      const prev = pm.onBeforeCompile; pm.onBeforeCompile = (sh, rd) => { prev(sh, rd); sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', FOGX); }; pm.customProgramCacheKey = () => 'windFar';
      const pl = new THREE.InstancedMesh(pg, pm, palmsI.length), dm = new THREE.Object3D();
      palmsI.forEach(([x, y, z], k) => { dm.position.set(x, y, z); dm.rotation.set((r() - 0.5) * 0.12, r() * 6.28, (r() - 0.5) * 0.12); dm.scale.setScalar(0.62 + r() * 0.22); dm.updateMatrix(); pl.setMatrixAt(k, dm.matrix); pl.setColorAt(k, new THREE.Color(0.55, 0.68, 0.74)); });
      pl.computeBoundingSphere(); pl.name = 'islandPalms'; scene.add(pl);
    }
  }

  let grade = null;
  if (ctx.composer) {
    grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uWarm: { value: 0 }, uNight: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uWarm,uNight; varying vec2 vUv;
        void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 d=vUv-0.5; float v=smoothstep(0.85,0.25,length(d*vec2(1.0,1.15)));
          float l=dot(c.rgb,vec3(0.2126,0.7152,0.0722)); c.rgb=mix(vec3(l),c.rgb,1.06+0.02*uWarm);
          c.rgb*=mix(vec3(1.0),vec3(1.06,0.97,0.93),uWarm); c.rgb=mix(c.rgb,c.rgb*vec3(0.85,0.95,1.2),uNight*0.5);
          c.rgb*=mix(0.62,1.0,v); gl_FragColor=c; }`,
    });
    ctx.composer.insertPass(grade, Math.max(1, ctx.composer.passes.length - 1));
  }
  let lastHourInt = Math.floor(ctx.hour);
  const focus = new THREE.Vector3(), _gf = new THREE.Vector3();
  const updateAll = (dt, t) => {
    const sm = cam.update(dt, t);
    focus.copy(sm); focus.y = Math.max(0, focus.y);
    atm.update(dt, t, ctx.hour, ctx.camera.position, focus);
    ctx.night = atm.state.night;
    windU.uTime.value = t;
    windU.uRim.value.copy(atm.sun.color).multiplyScalar(Math.min(1.2, atm.sun.intensity / 3) * (0.5 + 0.6 * atm.state.golden) * (1 - atm.state.night));
    water.update(t, atm);
    _gf.copy(ctx.camera.position).sub(focus).multiplyScalar(0.45).add(focus); grassField.update(_gf);
    lamps.update(t, atm.state.night, focus);
    parts.update(dt, t, atm, focus);
    if (grade) { grade.uniforms.uWarm.value = atm.state.golden; grade.uniforms.uNight.value = atm.state.night; }
    // bloom/glow a bit stronger at night
    if (ctx.bloom) ctx.bloom.strength = 0.26 + 0.22 * atm.state.night;
  };
  updateAll(0.016, 0);

  return {
    terrain, water, atmosphere: atm, vegetation: veg, blobs, lamps, camera: cam,
    heightAt, waterY: WATER_Y, pond: POND, pen: PEN,
    get night() { return atm.state.night; },
    get sunDir() { return atm.state.sunDir; },
    addBlobShadow: blobs.add, setBlobShadow: blobs.set,
    update(dt, t) {
      if (!freeze) { ctx.hour = (ctx.hour + dt * HOUR_PER_SEC) % 24; }
      const hi = Math.floor(ctx.hour);
      if (hi !== lastHourInt) { lastHourInt = hi; ctx.emit('world:hour', hi); if (hi === 0) ctx.emit('world:midnight', hi); }
      updateAll(dt, t);
    },
  };
}

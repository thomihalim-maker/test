// World module: terrain, water, sky/day-night, vegetation, particles, camera rig.
import * as THREE from 'three';
import { heightAt, buildTerrain, WATER_Y, POND, PEN } from './terrain.js';
import { createAtmosphere } from './atmosphere.js';
import { createWater } from './water.js';
import { createVegetation } from './vegetation.js';
import { createBlobs, createLamps } from './props.js';
import { createParticles } from './particles.js';
import { createCameraRig } from './camera.js';
import { windU } from './wind.js';
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

  const cam = createCameraRig(ctx);
  const atm = createAtmosphere(ctx);
  const terrain = buildTerrain(ctx);
  scene.add(terrain.mesh);
  const blobs = createBlobs(ctx); scene.add(blobs.mesh);
  const water = createWater(ctx, terrain.heightTex); scene.add(water.mesh);
  const veg = createVegetation(ctx, terrain, blobs); scene.add(veg.group);
  const lamps = createLamps(ctx, blobs); scene.add(lamps.group);
  const parts = createParticles(ctx); scene.add(parts.group);

  // distant islands / headlands for depth (fog-faded)
  {
    const r = mulberry32(5), g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + r() * 0.6, d = 135 + r() * 55, s = 14 + r() * 22;
      const geo = new THREE.SphereGeometry(1, 14, 9); const p = geo.attributes.position; const cols = [];
      for (let k = 0; k < p.count; k++) {
        let y = p.getY(k); const x = p.getX(k), z = p.getZ(k);
        const n = fbm(x * 2 + i * 7, z * 2, 3);
        p.setXYZ(k, x * (1 + n * 0.25), y < 0 ? y * 0.1 : y * (0.45 + n * 0.12), z * (1 + n * 0.25));
        const t = Math.max(0, y); const c = new THREE.Color('#3f8f4a').lerp(new THREE.Color('#8fcf55'), t); cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat); m.position.set(Math.cos(a) * d, -1.2, Math.sin(a) * d); m.scale.set(s * 1.6, s * 0.55, s * 1.3); g.add(m);
    }
    g.name = 'distantIslands'; scene.add(g);
  }

  let lastHourInt = Math.floor(ctx.hour);
  const focus = new THREE.Vector3();
  const updateAll = (dt, t) => {
    const sm = cam.update(dt, t);
    focus.copy(sm); focus.y = Math.max(0, focus.y);
    atm.update(dt, t, ctx.hour, ctx.camera.position, focus);
    ctx.night = atm.state.night;
    windU.uTime.value = t;
    water.update(t, atm);
    lamps.update(t, atm.state.night);
    parts.update(dt, t, atm, focus);
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

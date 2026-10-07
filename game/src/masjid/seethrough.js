// See-through occlusion for the masjid: any masjid surface that sits between the camera and the
// player (camera rig target) is dithered away inside a soft tube, so the marbot stays visible when
// walking behind walls, columns, roofs or the gate. Works on merged/instanced meshes because the cut
// is done per fragment in world space; materials are patched once via onBeforeCompile.
import * as THREE from 'three';

const VERT_DECL = 'varying vec3 vSeeW;\n';
const VERT_BODY = `
  vec4 seeW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    seeW = instanceMatrix * seeW;
  #endif
  vSeeW = (modelMatrix * seeW).xyz;
`;
const FRAG_DECL = `varying vec3 vSeeW;
uniform vec3 uSeeT;
uniform float uSeeOn;
uniform float uSeeR;
`;
// 4x4 ordered dither gives a soft, stable edge without transparency sorting.
const FRAG_BODY = `
  if (uSeeOn > 0.001 && vSeeW.y > uSeeT.y - 0.75) {
    vec3 ab = uSeeT - cameraPosition;
    float L = length(ab);
    vec3 dir = ab / max(L, 1e-4);
    float t = dot(vSeeW - cameraPosition, dir);
    if (t > 0.0 && t < L - 0.55) {
      float dist = length(vSeeW - (cameraPosition + dir * t));
      float cut = (1.0 - smoothstep(uSeeR * 0.55, uSeeR, dist)) * uSeeOn;
      vec2 p = mod(floor(gl_FragCoord.xy), 4.0);
      float b = mod(p.x * 4.0 + p.y * 9.0 + p.x * p.y * 3.0, 16.0) / 16.0 + 0.03;
      if (cut > b) discard;
    }
  }
`;

export function createSeeThrough(ctx, group) {
  const uniforms = { uSeeT: { value: new THREE.Vector3() }, uSeeOn: { value: 0 }, uSeeR: { value: 1.7 } };
  const ray = new THREE.Raycaster(), dir = new THREE.Vector3(), tgt = new THREE.Vector3();
  let scanT = 0, checkT = 0, want = 0;

  function patch(m) {
    if (!m || m.userData.seePatched || m.isShaderMaterial || m.isSpriteMaterial || m.isPointsMaterial) return;
    m.userData.seePatched = true;
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey?.bind(m);
    m.onBeforeCompile = (sh, r) => {
      prev?.call(m, sh, r);
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = VERT_DECL + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + VERT_BODY);
      sh.fragmentShader = FRAG_DECL + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + FRAG_BODY);
    };
    m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|see1';
    m.needsUpdate = true;
  }
  function scan() {
    group.traverse(o => {
      if (!o.isMesh || o.isSprite) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) patch(m);
    });
  }

  return {
    uniforms,
    update(dt) {
      const R = ctx.cameraRig, cam = ctx.camera;
      if (!R?.target || !cam) return;
      // Materials appear as stages build or the design changes; rescan now and then (cheap: flag check).
      if ((scanT -= dt) <= 0) { scanT = 1.0; scan(); }
      tgt.copy(R.target); uniforms.uSeeT.value.copy(tgt);
      // Only fade in when the masjid actually blocks the view, so the building looks whole otherwise.
      if ((checkT -= dt) <= 0) {
        checkT = 0.2;
        dir.subVectors(tgt, cam.position); const L = dir.length(); dir.divideScalar(L || 1);
        ray.set(cam.position, dir); ray.far = Math.max(0, L - 0.4);
        const hits = ray.intersectObject(group, true);
        want = hits.some(h => h.object.visible && h.object.isMesh && !h.object.isSprite) ? 1 : 0;
      }
      const on = uniforms.uSeeOn.value;
      uniforms.uSeeOn.value = on + (want - on) * Math.min(1, dt * 7);
    },
  };
}

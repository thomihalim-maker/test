// Marbot hero, sculpted version: assets/models/marbot.glb (one textured SkinnedMesh on a 65-bone Mixamo-style skeleton,
// ~14k triangles, painted face, no blendshapes, no clips). It is posed by the same pose system as the code-built hero:
//
//   person.p (anims.js channels) --poseHero--> joints-only driver rig (marbot_hero.js buildHeroDriver)
//                                --retarget--> Mixamo bones
//
// Retarget: every driver joint is unrotated at bind (T-pose, character space: +Y up, +Z forward, character left = +X),
// so its posed world rotation is the bind->pose delta. The delta is applied to the matching bone's bind orientation in
// the same space (limb bones are first squared up to the driver's bind direction, so a slightly drooped bind arm still
// hangs straight down at rest), then converted back to the bone's local frame. The arms are solved by 2-bone IK onto
// the driver's wrist with the driver's elbow as the pole, so the hands land where the pose system and the props expect
// them (prop frames person.handL/handR come from the driver, exactly as with the code-built hero).
// The model is scaled to the hero's height (peci top 1.41 at size 1) with its feet on y=0 and hips over the origin.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildHeroDriver, poseHero, SHADOW_BIAS, REF_SARONGS } from './marbot_hero.js';
import { IDX } from './anims.js';

export const MARBOT_GLB_URL = new URL('../../assets/models/marbot.glb', import.meta.url);
const TOP = 1.41;                             // peci top, rig units at size 1 (same as the code-built hero)
const boneKey = (n)=>n.replace(/^mixamorig[:_]?/, '');   // GLTFLoader sanitises 'mixamorig:Hips' -> 'mixamorigHips'
const ARMS = [['Left', 'L', 1], ['Right', 'R', -1]];
// bone <- driver joint (string) or a blend of two driver joints [a, b, weight of b]
const MAP = {
  Hips:'hips', Spine:['hips','spine',.4], Spine1:['hips','spine',.75], Spine2:'spine', Neck:['spine','head',.45], Head:'head',
  LeftShoulder:['spine','shoulderL',.12], RightShoulder:['spine','shoulderR',.12],
  LeftUpLeg:'hipL', LeftLeg:'kneeL', LeftFoot:'footL', RightUpLeg:'hipR', RightLeg:'kneeR', RightFoot:'footR',
};
// limb bones squared up to the driver's bind direction (bone -> child bone, driver bind direction)
const LIMB = { LeftUpLeg:['LeftLeg',[0,-1,0]], LeftLeg:['LeftFoot',[0,-1,0]], RightUpLeg:['RightLeg',[0,-1,0]], RightLeg:['RightFoot',[0,-1,0]],
  LeftArm:['LeftForeArm',[1,0,0]], LeftForeArm:['LeftHand',[1,0,0]], RightArm:['RightForeArm',[-1,0,0]], RightForeArm:['RightHand',[-1,0,0]] };
const FINGERS = ['Index','Middle','Ring','Pinky'];
const WRIST_MAT = .05;                         // sujud wrist height above the mat (rig units)
const BOW = [.08, .1];                         // extra sujud bow (rad): spine, head -> the forehead rests on the mat
// bind hands point sideways with the palms down; sujud turns them to point forward (character space)
const flat = { L: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -Math.PI/2), R: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2) };
// acts with flat open hands (adzan beside the ears, takbir, palms on the mat / knees, offered hands)
const OPEN_HANDS = new Set(['adzan','takbir','sujud','rukuk','wave','greet','cheer']);

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _inv = new THREE.Quaternion();
const _H = new THREE.Vector3(), _A = new THREE.Vector3(), _t = new THREE.Vector3();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Vector3(), _dir = new THREE.Vector3(), _pp = new THREE.Vector3();
const clamp = (x,a,b)=>Math.min(b, Math.max(a, x));

/** Loads the GLB and builds the hero. Rejects (no console noise) when the file is missing or cannot be decoded. */
export async function loadMarbotGLB({ url = MARBOT_GLB_URL, castShadow = true, timeoutMs = 20000 } = {}){
  const loader = new GLTFLoader();
  let timer;
  const gltf = await Promise.race([
    loader.loadAsync(String(url)),
    new Promise((_, rej)=>{ timer = setTimeout(()=>rej(new Error('marbot.glb: load timed out')), timeoutMs); }),
  ]).finally(()=>clearTimeout(timer));
  return buildFromGLTF(gltf, { castShadow });
}

export function buildFromGLTF(gltf, { castShadow = true } = {}){
  const model = gltf.scene;
  let mesh = null; const B = {};
  model.traverse((o)=>{ if(o.isSkinnedMesh && !mesh) mesh = o; if(o.isBone) B[boneKey(o.name)] = o; });
  for(const n of ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'])
    if(!B[n]) throw new Error('marbot.glb: missing bone ' + n);
  const group = new THREE.Group(); group.name = 'marbotGLB';
  const root = new THREE.Group(); root.name = 'marbotGLB:root';
  const fit = new THREE.Group(); fit.name = 'marbotGLB:fit';
  group.add(root); root.add(fit); fit.add(model);
  // fit: height -> TOP, feet on y=0, hips over the origin
  mesh.geometry.computeBoundingBox(); const bb = mesh.geometry.boundingBox;
  model.updateMatrixWorld(true);
  const k = TOP / Math.max(1e-6, bb.max.y);
  B.Hips.getWorldPosition(_v);
  fit.scale.setScalar(k); fit.position.set(-_v.x*k, -bb.min.y*k, -_v.z*k);
  group.updateMatrixWorld(true);

  mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = 'marbotGLB:body';
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const U = { uTint:{ value:new THREE.Vector3() }, uKoko:{ value:new THREE.Color(1,1,1) }, uSarA:{ value:new THREE.Color() }, uSarB:{ value:new THREE.Color() }, uPeci:{ value:new THREE.Color() } };
  for(const m of mats) figureMaterial(m, U);

  // bind data in character space (group/root identity, fit applied)
  const order = [];                                           // Hips subtree, parents before children
  B.Hips.traverse((o)=>{ if(o.isBone) order.push(o); });
  const bind = new Map();
  for(const b of order){
    const wq = b.getWorldQuaternion(new THREE.Quaternion()), wp = b.getWorldPosition(new THREE.Vector3()), ws = b.parent.getWorldScale(new THREE.Vector3());
    bind.set(b, { lq: b.quaternion.clone(), lp: b.position.clone(), mq: wq, mp: wp, off: b.position.clone().multiply(ws), key: boneKey(b.name) });
  }
  const hipsParentQ = B.Hips.parent.getWorldQuaternion(new THREE.Quaternion());
  const hipsParentInv = B.Hips.parent.matrixWorld.clone().invert();
  // limb square-up corrections and IK lengths
  const corr = {};
  for(const [n, [c, d]] of Object.entries(LIMB)){
    const a = bind.get(B[n]).mp, b = bind.get(B[c]).mp;
    corr[n] = new THREE.Quaternion().setFromUnitVectors(_v.subVectors(b, a).normalize(), _v2.set(...d));
  }
  const arm = {};
  for(const [side, s] of ARMS){
    const A = B[side+'Arm'], F = B[side+'ForeArm'], H = B[side+'Hand'];
    arm[side] = { A, F, H, a: bind.get(A).mp.distanceTo(bind.get(F).mp), b: bind.get(F).mp.distanceTo(bind.get(H).mp) };
  }
  // finger curl: rotation about the hand's front axis (palms face down at bind), expressed in each bone's local frame
  const fingers = [];
  for(const [side, , s] of ARMS) for(const f of FINGERS) for(let i=1;i<=3;i++){
    const b = B[side+'Hand'+f+i]; if(!b) continue;
    const ax = new THREE.Vector3(0, 0, -s).applyQuaternion(_inv.copy(bind.get(b).mq).invert()).normalize();
    fingers.push({ b, ax, lq: bind.get(b).lq, w: i===1 ? .8 : 1 });
  }
  for(const side of ['Left','Right']) for(let i=1;i<=3;i++){
    const b = B[side+'HandThumb'+i]; if(!b) continue;
    const s = side==='Left' ? 1 : -1;
    const ax = new THREE.Vector3(-s*.3, 0, 0).add(_v.set(0, 1, 0)).normalize().applyQuaternion(_inv.copy(bind.get(b).mq).invert());
    fingers.push({ b, ax, lq: bind.get(b).lq, w: .35, side });
  }

  // contact blob (same as the code-built hero)
  const bc = document.createElement('canvas'); bc.width = bc.height = 64; { const g = bc.getContext('2d'); const gr = g.createRadialGradient(32,32,2,32,32,31);
    gr.addColorStop(0,'rgba(255,255,255,.75)'); gr.addColorStop(.55,'rgba(255,255,255,.4)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,0,64,64); }
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(bc), color:0x2c2a1c, transparent:true, depthWrite:false, opacity:.55, polygonOffset:true, polygonOffsetFactor:-2 }));
  blob.name = 'marbotGLB:blob'; blob.renderOrder = 1; blob.position.y = .03; group.add(blob);

  const driver = buildHeroDriver();
  const DJ = driver.joints;
  const dq = {}, dp = {};                                      // driver joint world quats / positions (character space)
  for(const n in DJ){ dq[n] = new THREE.Quaternion(); dp[n] = new THREE.Vector3(); }
  const drvHipsBind = DJ.hips.position.clone();
  const mq = new Map(), mp = new Map();                        // posed model-space quats / positions per bone
  for(const b of order){ mq.set(b, new THREE.Quaternion()); mp.set(b, new THREE.Vector3()); }
  const sockets = {};
  for(const [side, , s] of ARMS){ const o = new THREE.Object3D(); o.name = 'socket_hand'+(s>0?'L':'R'); B[side+'Hand'].add(o); sockets['hand'+(s>0?'L':'R')] = o; }
  let curl = .25;

  function target(name, out){
    const m = MAP[name];
    if(typeof m === 'string') return out.copy(dq[m]);
    return out.copy(dq[m[0]]).slerp(dq[m[1]], m[2]);
  }
  // FK offset of a child in its parent's posed model frame: parentModelQ * localOffset (local offsets are in the
  // parent's frame, already scaled to character units)
  function fkPos(b){ const bd = bind.get(b); mp.get(b).copy(bd.off).applyQuaternion(mq.get(b.parent)).add(mp.get(b.parent)); }

  let suj = 0, handle = false, cur = null;
  const handleDir = new THREE.Vector3();
  function pose(q){
    // 1. drive the joints-only rig with the regular pose (this also writes q.handL/handR prop frames and q.head)
    poseHero(driver, q);
    const p = q.p;
    suj = clamp((p[IDX.pp]-.35)/.15, 0, 1) * clamp((p[IDX.lean]-.5)/.3, 0, 1);   // sujud weight (same rule as poseHero)
    // 2. read the driver in character space
    driver.group.position.set(0,0,0); driver.group.rotation.set(0,0,0); DJ.root.position.set(0,0,0); DJ.root.scale.set(1,1,1);
    // sujud: this model's torso is longer than its arms reach, so bow deeper to bring the forehead and palms to the mat
    if(suj > 0){ DJ.spine.rotation.x += BOW[0]*suj; DJ.head.rotation.x += BOW[1]*suj; }
    driver.group.updateMatrixWorld(true);
    for(const n in DJ){ DJ[n].getWorldQuaternion(dq[n]); DJ[n].getWorldPosition(dp[n]); }
    // long tool in the hands: handle direction in character space (props.js: from the floor tip up through the hands)
    cur = q; handle = (q.prop === 'broom' || q.prop === 'mop');
    if(handle){
      if(q.propMode === 'grip') handleDir.addVectors(dp.handL, dp.handR).multiplyScalar(.5).sub(_v.set(q.aimX || 0, 0, q.aimZ || .6)).normalize();
      else handleDir.set(0, 1, .14).normalize();
    }
    // 3. retarget bone by bone (parents first)
    for(const b of order){
      const bd = bind.get(b), key = bd.key;
      if(b === B.Hips){
        target('Hips', _q).multiply(bd.mq); mq.get(b).copy(_q);
        b.quaternion.copy(_inv.copy(hipsParentQ).invert()).multiply(_q);
        mp.get(b).copy(bd.mp).add(_v.subVectors(dp.hips, drvHipsBind));
        b.position.copy(_v.copy(mp.get(b)).applyMatrix4(hipsParentInv));
        continue;
      }
      const pq = mq.get(b.parent);
      if(MAP[key]){
        target(key, _q); if(corr[key]) _q.multiply(corr[key]); _q.multiply(bd.mq);
        mq.get(b).copy(_q); b.quaternion.copy(_inv.copy(pq).invert()).multiply(_q);
      } else if(key.endsWith('Arm') && arm[key.slice(0, -3)]) { solveArm(key.slice(0, -3)); }
      else if(b.parent && (b.parent === arm.Left.A || b.parent === arm.Right.A || b.parent === arm.Left.F || b.parent === arm.Right.F)) { /* set by solveArm */ }
      else { mq.get(b).copy(pq).multiply(b.quaternion); }      // unmapped (toes, head top, fingers): keep the local rotation
      fkPos(b);
    }
    // 4. fingers: relaxed curl, closed round a held prop, flat for open-hand acts
    const want = q.prop ? .95 : OPEN_HANDS.has(q.anim) ? 0 : .3;
    curl += (want - curl) * .25;
    for(const f of fingers){ f.b.quaternion.copy(f.lq).multiply(_q.setFromAxisAngle(f.ax, curl * f.w * 1.15)); }
    // 5. place the model like the driver: position + yaw, jump height, squash/stretch and game scale
    const sz = q.size, jy = q.jy;
    group.visible = q.visible !== false;
    group.position.copy(q.pos); group.rotation.set(0, q.yaw, 0);
    root.position.set(0, jy, 0);
    const sx = p[IDX.sx], sy = p[IDX.sy];
    root.scale.set(sz*sx, sz*sy, sz*sx);
    { const bh = Math.max(0, 1-jy*.9); blob.scale.set((.8*bh+.25)*sz, 1, (.95*bh+.25)*sz); }
  }
  // 2-bone IK of one arm onto the driver wrist, elbow towards the driver elbow; twist from the driver's rotations
  function solveArm(side){
    const R = arm[side], s = side==='Left' ? 'L' : 'R';
    const A = R.A, F = R.F, H = R.H, a = R.a, b = R.b;
    fkPos(A); _S.copy(mp.get(A));
    _T.copy(dp['hand'+s]);
    if(suj > 0) _T.y += (WRIST_MAT - _T.y) * suj;               // sujud: wrists down at the mat so the palms lie flat
    _dir.subVectors(_T, _S); let d = _dir.length(); _dir.multiplyScalar(1/Math.max(d, 1e-6));
    d = clamp(d, Math.abs(a-b) + 1e-3, a + b - 1e-4);
    _pp.subVectors(dp['elbow'+s], _S); _pp.addScaledVector(_dir, -_pp.dot(_dir));
    if(_pp.lengthSq() < 1e-8){ _pp.set(0, -.3, -1); _pp.addScaledVector(_dir, -_pp.dot(_dir)); }
    _pp.normalize();
    const cosA = clamp((a*a + d*d - b*b) / (2*a*d), -1, 1), sinA = Math.sqrt(1 - cosA*cosA);
    _E.copy(_S).addScaledVector(_dir, a*cosA).addScaledVector(_pp, a*sinA);
    // upper arm
    const bA = bind.get(A);
    _q.copy(dq['shoulder'+s]).multiply(corr[side+'Arm']).multiply(bA.mq);
    _v.set(s==='L' ? 1 : -1, 0, 0).applyQuaternion(dq['shoulder'+s]);            // current bone direction
    _v2.subVectors(_E, _S).normalize();
    _q.premultiply(_q2.setFromUnitVectors(_v, _v2));
    mq.get(A).copy(_q); A.quaternion.copy(_inv.copy(mq.get(A.parent)).invert()).multiply(_q);
    // forearm
    fkPos(F);
    const bF = bind.get(F);
    _q.copy(dq['elbow'+s]).multiply(corr[side+'ForeArm']).multiply(bF.mq);
    _v.set(s==='L' ? 1 : -1, 0, 0).applyQuaternion(dq['elbow'+s]);
    _v2.copy(_S).addScaledVector(_dir, d).sub(mp.get(F)).normalize();
    _q2.setFromUnitVectors(_v, _v2); _q.premultiply(_q2);
    mq.get(F).copy(_q); F.quaternion.copy(_inv.copy(mq.get(A)).invert()).multiply(_q);
    // hand: the driver's hand rotation with the same swing as the forearm
    fkPos(H);
    const bH = bind.get(H);
    _q.copy(dq['hand'+s]).multiply(corr[side+'ForeArm']).multiply(bH.mq).premultiply(_q2);
    if(suj > 0) _q.slerp(_q3.copy(flat[s]).multiply(bH.mq), suj);    // palms flat on the mat, fingers forward
    if(handle && (s === 'R' || cur.propMode === 'grip')) gripTwist(_q, bH.mq, s === 'L' ? 1 : -1);
    mq.get(H).copy(_q); H.quaternion.copy(_inv.copy(mq.get(F)).invert()).multiply(_q);
  }
  // long tools: twist the hand about its pointing direction so the curled fingers wrap round the handle
  function gripTwist(q, bq, sg){
    _inv.copy(bq).invert(); _q3.copy(q).multiply(_inv);                      // bind -> posed delta of the hand
    _H.set(sg, 0, 0).applyQuaternion(_q3);                                   // finger direction
    _A.set(0, 0, -sg).applyQuaternion(_q3);                                  // curl axis
    _t.copy(handleDir).addScaledVector(_H, -handleDir.dot(_H));
    if(_t.lengthSq() < 1e-4) return;
    _t.normalize(); if(_t.dot(_A) < 0) _t.negate();
    _A.addScaledVector(_H, -_A.dot(_H)).normalize();
    let ang = Math.acos(clamp(_A.dot(_t), -1, 1)); if(_v.crossVectors(_A, _t).dot(_H) < 0) ang = -ang;
    q.premultiply(_q3.setFromAxisAngle(_H, ang * .85));
  }

  const hero = { group, mesh, blob, bones: B, sockets, driver, kind: 'glb',
    stats: { triangles: (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3, vertices: mesh.geometry.attributes.position.count, bones: order.length, drawCalls: 2 },
    pose, setLook(l){ setLook(U, l); }, setFace(){},          // painted face: no blink/talk (no blendshapes)
    dispose(){ mesh.geometry.dispose(); for(const m of mats){ for(const t of ['map','normalMap']) m[t]?.dispose(); m.dispose(); } blob.geometry.dispose(); blob.material.map.dispose(); blob.material.dispose(); } };
  return hero;
}

// ------------------------------------------------------------------ material
// Matte "soft vinyl" finish like the code-built hero: the texture already carries soft baked shading, so the glossy
// default is toned down, the sky-blue hemisphere fill is neutralised, the shadow side is lifted a little and the hero's
// shadow bias stops self-shadow acne on the skinned surface. Outfit colours (look customisation) are re-tinted in the
// shader using bind-pose regions of this model (units: model height 0.977):
//   koko   y .24-.565, |x|<.295, unsaturated light cloth   -> multiplied by koko / klasik koko
//   sarong y .045-.245, |x|<.22                             -> two-tone tartan in the sarong hue, light lines kept
//   peci   y > .80, very dark                               -> peci colour (dark colours only, see setLook)
function figureMaterial(m, U){
  if('roughness' in m) m.roughness = .85;
  if('metalness' in m) m.metalness = 0;
  if(m.normalMap){ m.normalMap.dispose(); m.normalMap = null; }      // not shipped (baked into the colour); older files may carry one
  m.onBeforeCompile = (sh)=>{
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBindP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindP = position;')
      .replace('#include <shadowmap_vertex>', SHADOW_BIAS);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBindP; uniform vec3 uTint; uniform vec3 uKoko, uSarA, uSarB, uPeci;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        if(uTint.x + uTint.y + uTint.z > 0.0){
          vec3 c = diffuseColor.rgb; float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), sat = (mx - mn) / max(mx, 1e-3);
          float y = vBindP.y, ax = abs(vBindP.x);
          float skin = step(c.b * 1.25, c.g) * step(c.g * 1.12, c.r) * step(0.05, L);
          float koko = uTint.x * step(0.24, y) * step(y, 0.565) * step(ax, 0.295) * (1.0 - smoothstep(0.18, 0.3, sat)) * smoothstep(0.08, 0.16, L) * (1.0 - skin);
          c = mix(c, c * uKoko, koko);
          float sar = uTint.y * step(0.045, y) * step(y, 0.245) * step(ax, 0.22) * (1.0 - skin);
          if(sar > 0.0){
            float w = smoothstep(-0.015, 0.03, c.g - c.b);                     // green stripes vs blue stripes
            vec3 base = mix(uSarB, uSarA, w);
            vec3 t = base * clamp(L / mix(0.025, 0.095, w), 0.0, 2.2);
            vec3 lineC = c * (0.55 + 0.45 * base / max(max(base.r, max(base.g, base.b)), 1e-3));
            t = mix(t, lineC, smoothstep(0.2, 0.42, L));                      // light check lines keep their brightness
            c = mix(c, t, sar);
          }
          float pe = uTint.z * smoothstep(0.80, 0.82, y) * (1.0 - smoothstep(0.03, 0.06, L));
          c = mix(c, uPeci * mix(0.6, 1.25, smoothstep(0.0, 0.02, L)), pe);
          diffuseColor.rgb = c;
        }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { vec3 ind = reflectedLight.indirectDiffuse; float l = dot(ind, vec3(0.299, 0.587, 0.114));
          reflectedLight.indirectDiffuse = mix(ind, l * vec3(1.06, 1.0, 0.92), 0.65) * 1.15; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float fr = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
          totalEmissiveRadiance += diffuseColor.rgb * (0.11 + pow(fr, 3.0) * 0.12); }`);
  };
  m.customProgramCacheKey = ()=>'marbotGLB1';
  m.needsUpdate = true;
}
const _lin = (hex)=>new THREE.Color(hex);                       // THREE.Color.set(hex) converts sRGB -> linear
const KLASIK_KOKO = 0xf8f3e6;
const near = (a, b, tol=.035)=>{ const A = _lin(a), B = _lin(b); return Math.abs(A.r-B.r) < tol && Math.abs(A.g-B.g) < tol && Math.abs(A.b-B.b) < tol; };
function setLook(U, look = {}){
  const hex = (v)=>typeof v === 'string' ? new THREE.Color(v).getHex() : v;
  const koko = hex(look.koko ?? KLASIK_KOKO), sar = hex(look.sarong ?? 0x2f7d6c), peci = hex(look.peci ?? 0x1c1c20);
  const kOn = !(near(koko, KLASIK_KOKO) || near(koko, 0xf0ebe3));
  const sOn = !REF_SARONGS.has(sar);
  // the peci is not separable from the hair just under its rim (same near-black, same height), so only dark peci colours
  // are applied (a navy / brown fringe reads as shadow); a light peci (Putih Berseri) keeps the sculpted black one
  const pc = _lin(peci), pl = pc.r*.2126 + pc.g*.7152 + pc.b*.0722, pOn = Math.max(pc.r, pc.g, pc.b) > .02 && pl < .2;
  U.uTint.value.set(kOn ? 1 : 0, sOn ? 1 : 0, pOn ? 1 : 0);
  const kr = _lin(koko), kb = _lin(KLASIK_KOKO); U.uKoko.value.setRGB(kr.r/kb.r, kr.g/kb.g, kr.b/kb.b);
  U.uSarA.value.copy(_lin(sar)); U.uSarB.value.copy(_lin(sar)).multiplyScalar(.42).lerp(new THREE.Color(.012, .016, .05), .3);
  U.uPeci.value.copy(pc);
}

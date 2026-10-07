// Dirt renderer for care.js: instanced, canvas-textured, 4 draw calls at most (each layer hidden when empty).
//  - leaves: little 3D clumps of 3-5 curled leaves (instance colour = autumn tint)
//  - decals: dust / mud / sandal print / bare-foot wet print in ONE instanced mesh on a 2x2 atlas (per-instance tile + fade)
//  - wet:    glossy mop sheen that fades and shrinks
//  - piles:  leaf mounds, scale ~ sqrt(n), squash-pop when they grow
// Spots pop in (0.6s), wobble when stroked, and on removal shrink out (0.35s) — swept leaves hop toward their pile.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const easeBack = u => { const c = 1.9; u -= 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// ---------- textures ----------
function leafTexture() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.translate(64, 64);
  // pointed oval leaf, light so the instance colour tints it
  g.beginPath(); g.moveTo(0, -60); g.bezierCurveTo(38, -40, 40, 22, 0, 58); g.bezierCurveTo(-40, 22, -38, -40, 0, -60); g.closePath();
  const gr = g.createLinearGradient(-40, 0, 40, 0); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#cfcfcf');
  g.fillStyle = gr; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(90,70,40,.55)'; g.stroke();
  g.strokeStyle = 'rgba(120,95,60,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -54); g.lineTo(0, 62); g.stroke();
  g.lineWidth = 2; for (let i = -3; i <= 3; i++) { const y = i * 14; g.beginPath(); g.moveTo(0, y); g.lineTo(22 - Math.abs(i) * 3, y - 12); g.moveTo(0, y); g.lineTo(-22 + Math.abs(i) * 3, y - 12); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}
// 4x2 atlas, soft "cute dirt" tiles (warm, saturated, alpha <= .75, no dark greys):
//  (0,0) dust puffs + sparkle   (1,0) mud puddle w/ light rim   (2,0) soft-grey bare footprints (hall)
//  (3,0) carpet crumbs          (0,1) warm taupe footprints (porch/plaza)
function decalAtlas() {
  const S = 256, c = canvas(S * 4, S * 2), g = c.getContext('2d');
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const R = (a, b) => a + rnd() * (b - a);
  const tile = (tx, ty, fn) => { g.save(); g.translate(tx * S + S / 2, ty * S + S / 2); g.beginPath(); g.rect(-S / 2 + 3, -S / 2 + 3, S - 6, S - 6); g.clip(); fn(); g.restore(); };
  const sparkle = (x, y, r, a = .75) => { g.fillStyle = `rgba(255,252,236,${a})`; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); };
  const puff = (x, y, r, rgb, a) => { const gr = g.createRadialGradient(x - r * .25, y - r * .25, r * .1, x, y, r);
    gr.addColorStop(0, `rgba(${rgb[0] + 30},${rgb[1] + 28},${rgb[2] + 24},${a})`); gr.addColorStop(.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * .92})`); gr.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  // dust: 4 soft beige puffs in a little cloud + a sparkle
  tile(0, 0, () => {
    const P = [[-34, 14, 44], [10, -16, 50], [40, 22, 38], [-6, 34, 34], [-40, -26, 28]];
    for (const [x, y, r] of P) puff(x, y, r, [214, 172, 112], .7);
    g.fillStyle = 'rgba(176,128,72,.55)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(R(-50, 50), R(-30, 40), R(2.5, 4.5), 0, TAU); g.fill(); }
    sparkle(46, -40, 16); sparkle(-52, 46, 9, .6);
  });
  // mud: rounded warm-brown puddle, lighter rim, 2 highlight dots
  tile(1, 0, () => {
    const blob = (sc, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = (80 + 9 * Math.sin(a * 3 + 1) + 5 * Math.sin(a * 2 + 2)) * sc; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r * .8) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r * .8); } g.closePath(); g.fill(); };
    blob(1.08, 'rgba(226,174,112,.72)'); blob(.94, 'rgba(184,122,62,.75)'); blob(.7, 'rgba(198,136,72,.75)');
    g.fillStyle = 'rgba(255,240,214,.72)'; g.beginPath(); g.ellipse(-26, -20, 18, 9, -.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(4, -30, 6, 0, TAU); g.fill(); g.beginPath(); g.arc(30, 18, 4, 0, TAU); g.fill();
    g.fillStyle = 'rgba(226,174,112,.7)'; for (const [x, y, r] of [[98, -8, 9], [-96, 22, 7], [70, 62, 6]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  });
  // bare foot (toes to the top = -z when rot 0): rounded sole + heel + 5 toes, clean silhouette
  const foot = (x, y, flip, rgb, a) => { g.save(); g.translate(x, y); g.scale(flip, 1); g.rotate(.1 * flip);
    g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    g.beginPath(); g.ellipse(2, -10, 22, 30, .12, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-2, 38, 17, 20, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-6, 14, 13, 22, .05, 0, TAU); g.fill();
    for (const [tx, ty, r] of [[-12, -52, 9], [2, -57, 7.5], [14, -55, 6.5], [23, -49, 5.5], [29, -40, 5]]) { g.beginPath(); g.arc(tx, ty, r, 0, TAU); g.fill(); }
    g.fillStyle = `rgba(255,255,255,${a * .35})`; g.beginPath(); g.ellipse(-4, -16, 7, 11, .2, 0, TAU); g.fill();
    g.restore(); };
  tile(2, 0, () => { foot(-34, 22, -1, [168, 166, 182], .66); foot(34, -18, 1, [168, 166, 182], .66); });
  tile(0, 1, () => { foot(-34, 22, -1, [176, 132, 96], .7); foot(34, -18, 1, [176, 132, 96], .7); });
  // carpet crumbs: a few pale rounded crumbs + a soft halo + sparkle (reads light on the dark carpet)
  tile(3, 0, () => {
    puff(0, 0, 70, [246, 226, 184], .3);
    for (let i = 0; i < 14; i++) { const a = R(0, TAU), r = Math.sqrt(rnd()) * 62, x = Math.cos(a) * r, y = Math.sin(a) * r, rr = R(5, 10);
      g.fillStyle = 'rgba(214,170,110,.6)'; g.beginPath(); g.arc(x + 1.5, y + 1.5, rr, 0, TAU); g.fill();
      g.fillStyle = 'rgba(252,236,198,.75)'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    sparkle(40, -44, 14);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function wetTexture() {
  const c = canvas(256, 256), g = c.getContext('2d'); g.translate(128, 128);
  const gr = g.createRadialGradient(0, 0, 10, 0, 0, 120); gr.addColorStop(0, 'rgba(160,205,235,.55)'); gr.addColorStop(.7, 'rgba(160,205,235,.35)'); gr.addColorStop(1, 'rgba(160,205,235,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 124, 96, 0, 0, TAU); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 5; i++) { g.strokeStyle = `rgba(235,250,255,${.25 + i * .06})`; g.lineWidth = 6 - i * .6; g.beginPath(); g.arc(0, 60 + i * 6, 70 + i * 9, Math.PI * 1.18, Math.PI * 1.82); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, r] of [[-40, -30, 5], [36, -18, 3.5], [8, 30, 3], [-12, 8, 2.5]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- geometry ----------
function leafQuad(w, h, x, z, ry, tilt, curl, shade, rgb = null) {
  const g = new THREE.PlaneGeometry(w, h, 2, 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2); p.setZ(i, (u * u) * curl + (v * v) * curl * .5); }
  g.rotateX(-Math.PI / 2 + tilt); g.rotateY(ry); g.translate(x, .012 + Math.abs(tilt) * .06, z); g.computeVertexNormals();
  const n = p.count, col = new Float32Array(n * 3), c = rgb || [1, 1, 1]; for (let i = 0; i < n; i++) { col[i * 3] = shade * c[0]; col[i * 3 + 1] = shade * c[1]; col[i * 3 + 2] = shade * c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function leafClump() {
  const L = [], spec = [[0, 0, .3, .05], [.09, .06, 1.9, -.1], [-.08, .05, 3.6, .08], [.02, -.1, 5.1, .12], [-.12, -.07, .9, -.06]];
  spec.forEach(([x, z, ry, tilt], i) => L.push(leafQuad(.2 + (i % 2) * .04, .3 + (i % 3) * .03, x, z, ry, tilt, .025 + i * .004, .82 + (i % 3) * .1)));
  return mergeGeometries(L);
}
function pileGeo() {
  const L = [];
  const base = new THREE.SphereGeometry(.42, 12, 6, 0, TAU, 0, Math.PI / 2); base.scale(1, .5, 1); base.deleteAttribute('uv');
  { const n = base.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const y = base.attributes.position.getY(i); const k = .62 + y * 1.6; col[i * 3] = k * .95; col[i * 3 + 1] = k * .66; col[i * 3 + 2] = k * .3; } base.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  base.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(base.attributes.position.count * 2).fill(.5), 2));
  L.push(base);
  let k = 0;
  for (let ring = 0; ring < 3; ring++) {
    const n = [11, 7, 3][ring], rr = [.38, .24, .08][ring], yy = [.06, .15, .21][ring];
    for (let i = 0; i < n; i++, k++) {
      const lc = PILE_COLS[k % PILE_COLS.length], a = i / n * TAU + ring * .7, g = leafQuad(.24, .32, 0, 0, a + 1.2 + hash(k) * .8, .35 + hash(k + 9) * .3, .03, .95 + hash(k + 3) * .3, lc);
      g.translate(Math.cos(a) * rr, yy, Math.sin(a) * rr); L.push(g);
    }
  }
  return mergeGeometries(L.map(g => { if (!g.index) return g; return g.toNonIndexed(); }));
}
// per-instance atlas tile + fade, injected into a built-in lit material
function patchDecal(mat, tiled) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aFade; varying float vFade;${tiled ? '\nattribute vec2 aTile;' : ''}`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n vFade = aFade;${tiled ? '\n#ifdef USE_MAP\n vMapUv = vMapUv * vec2(0.25, 0.5) + aTile;\n#endif' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n diffuseColor.a *= vFade;');
  };
  mat.customProgramCacheKey = () => 'marbot-decal' + (tiled ? 't' : '');
}

const PILE_COLS = [[1, .78, .28], [.98, .5, .2], [.72, .86, .32], [1, .64, .22], [.9, .36, .18], [1, .88, .4], [.62, .8, .3]];
const LEAF_COLS = ['#bfe05a', '#f2cf48', '#ffb03c', '#f08a34', '#b4d850', '#e8643a', '#ffd95a', '#a6cc4a'].map(h => new THREE.Color(h));
const TILE = { 1: [0, .5], 2: [.25, .5], 3: [0, 0], 4: [.5, .5], 5: [.75, .5] }; // dust, mud, porch print, hall print, carpet crumbs (uv offsets)
const BASE = { 0: 1.35, 1: 1.15, 2: 1.05, 3: 1.0 };
// hall prints are soft grey bare feet (shoes stay outside); porch/plaza prints warm taupe; dust on the carpet (y above the plinth) = crumbs
const tileOf = s => s.t === 1 ? (s.zone === 'hall' && s.y > .725 ? 5 : 1) : s.t === 2 ? 2 : s.zone === 'hall' ? 4 : 3;

export function createDirtRenderer(ctx, { cap = 160 } = {}) {
  const root = new THREE.Group(); root.name = 'dirt'; ctx.scene.add(root);
  const CAP = cap + 32; // live spots + removal ghosts
  const leafTex = leafTexture(), atlas = decalAtlas(), wetTex = wetTexture();
  const leafMat = new THREE.MeshLambertMaterial({ map: leafTex, alphaTest: .45, side: THREE.DoubleSide, vertexColors: true, emissive: 0x2a1c08 });
  const leaves = new THREE.InstancedMesh(leafClump(), leafMat, CAP);
  leaves.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3).fill(1), 3);
  const decGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const aTile = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 2), 2), aFadeD = new THREE.InstancedBufferAttribute(new Float32Array(CAP).fill(1), 1);
  decGeo.setAttribute('aTile', aTile); decGeo.setAttribute('aFade', aFadeD);
  const decMat = new THREE.MeshLambertMaterial({ map: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  patchDecal(decMat, true);
  const decals = new THREE.InstancedMesh(decGeo, decMat, CAP);
  const wetGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); const WCAP = 24;
  const aFadeW = new THREE.InstancedBufferAttribute(new Float32Array(WCAP).fill(1), 1); wetGeo.setAttribute('aFade', aFadeW);
  const wetMat = new THREE.MeshPhongMaterial({ map: wetTex, color: 0xffffff, specular: 0xffffff, shininess: 120, emissive: 0x16303c, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  patchDecal(wetMat, false);
  const wet = new THREE.InstancedMesh(wetGeo, wetMat, WCAP);
  const piles = new THREE.InstancedMesh(pileGeo(), leafMat, 16);
  piles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(16 * 3).fill(1), 3);
  leaves.name = 'dirt:leaves'; decals.name = 'dirt:decals'; wet.name = 'dirt:wet'; piles.name = 'dirt:piles';
  for (const m of [leaves, decals, wet, piles]) { m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; root.add(m); }
  decals.renderOrder = 1; wet.renderOrder = 2;

  let spots = [], pileList = [], hlTool = null, dirty = true;
  const ghosts = [];  // {t, x,y,z, rot, s, t0, tx, tz, col}
  const wets = [];    // {x,y,z, rot, s, t0, life}
  const meta = new Map(); // spot id -> {born, poke}
  const pmeta = new Map(); // pile id -> {pop}
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), SC = new THREE.Vector3(), Yax = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  const now = () => ctx.time || 0;
  const toolOf = t => (t === 0 || t === 1) ? 'sapu' : 'pel';

  function put(mesh, i, x, y, z, rot, sx, sy, sz) { Q.setFromAxisAngle(Yax, rot); M4.compose(P.set(x, y, z), Q, SC.set(sx, sy, sz)); mesh.setMatrixAt(i, M4); }
  function rebuild(t) {
    const tn = now(); let nl = 0, nd = 0, anim = false;
    const hl = hlTool ? .03 : 0, pp = hlTool ? ctx.modules.characters?.pos : null, px = pp ? pp.x : 1e9, pz = pp ? pp.z : 1e9;
    for (const s of spots) {
      const m = meta.get(s.id); let k = 1, wob = 0;
      if (m) { const u = (tn - m.born) / .6; if (u < 1) { k = easeBack(Math.max(0, u)); anim = true; }
        if (m.poke != null) { const v = (tn - m.poke) / .45; if (v < 1) { wob = Math.sin(v * 20) * (1 - v) * .18; anim = true; } else m.poke = null; } }
      let pulse = 1; // cleanable with the held tool: gentle pulse; within reach (~2.4m): a clear bob so kids see what to clean
      if (hl && toolOf(s.t) === hlTool) { const dx = s.x - px, dz = s.z - pz, near = dx * dx + dz * dz < 5.8; pulse = 1 + (near ? .12 : hl) * Math.sin(t * (near ? 6 : 4) + s.id); }
      const sc = (.6 + .4 * s.amt) * BASE[s.t] * k * pulse * (1 + wob);
      if (s.t === 0) { if (nl >= CAP) continue; put(leaves, nl, s.x, s.y + .004, s.z, s.rot + wob, sc, sc * (1 + wob), sc); col.copy(LEAF_COLS[s.id % LEAF_COLS.length]); leaves.setColorAt(nl, col); nl++; }
      else { if (nd >= CAP) continue; const tt = TILE[tileOf(s)];
        put(decals, nd, s.x, s.y + .012, s.z, s.rot, sc, 1, sc); aTile.setXY(nd, tt[0], tt[1]); aFadeD.setX(nd, Math.min(1, k) * (.4 + .6 * s.amt)); nd++; }
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i], u = (tn - g.t0) / .35;
      if (u >= 1) { ghosts.splice(i, 1); continue; }
      anim = true; const e = 1 - u, x = g.x + (g.tx - g.x) * u, z = g.z + (g.tz - g.z) * u, hop = g.t === 0 ? Math.sin(u * Math.PI) * .28 : 0, sc = g.s * (g.t === 0 ? Math.max(.05, e) : 1);
      if (g.t === 0) { if (nl >= CAP) continue; put(leaves, nl, x, g.y + .004 + hop, z, g.rot + u * 4, sc, sc, sc); leaves.setColorAt(nl, LEAF_COLS[g.c % LEAF_COLS.length]); nl++; }
      else { if (nd >= CAP) continue; const tt = TILE[g.tile]; put(decals, nd, x, g.y + .012, z, g.rot, g.s * (1 + u * .15), 1, g.s * (1 + u * .15)); aTile.setXY(nd, tt[0], tt[1]); aFadeD.setX(nd, e * e * .8); nd++; }
    }
    leaves.count = nl; decals.count = nd; leaves.visible = nl > 0; decals.visible = nd > 0;
    leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    decals.instanceMatrix.needsUpdate = true; aTile.needsUpdate = true; aFadeD.needsUpdate = true;
    // wet sheen
    let nw = 0;
    for (let i = wets.length - 1; i >= 0; i--) { const w = wets[i], u = (tn - w.t0) / w.life; if (u >= 1) { wets.splice(i, 1); continue; } }
    for (const w of wets) { const u = (tn - w.t0) / w.life, k = Math.min(1, (tn - w.t0) / .25), sc = w.s * (1 - .35 * u) * (.8 + .2 * k); put(wet, nw, w.x, w.y + .016, w.z, w.rot, sc, 1, sc * .8); aFadeW.setX(nw, k * (1 - u) * (1 - u * .4)); nw++; anim = true; }
    wet.count = nw; wet.visible = nw > 0; wet.instanceMatrix.needsUpdate = true; aFadeW.needsUpdate = true;
    // piles
    let np = 0;
    for (const p of pileList) { if (np >= 16) break; const m = pmeta.get(p.id); let k = 1;
      if (m) { const u = (tn - m.pop) / .5; if (u < 1) { k = 1 + Math.sin(u * Math.PI * 2.5) * (1 - u) * .22; anim = true; } }
      const s = .5 + .2 * Math.sqrt(p.n); put(piles, np, p.x, p.y + .005, p.z, p.id * 1.7, s * k, s * (2 - k), s * k); piles.setColorAt(np, col.setRGB(1, .94 + hash(p.id) * .06, .92)); np++; }
    piles.count = np; piles.visible = np > 0; piles.instanceMatrix.needsUpdate = true; if (piles.instanceColor) piles.instanceColor.needsUpdate = true;
    return anim;
  }
  let animating = true;
  return {
    root, meshes: { leaves, decals, wet, piles },
    /** full list of live spots / piles (care.js arrays, read only here) */
    bind(spotArr, pileArr) { spots = spotArr; pileList = pileArr; dirty = true; },
    add(s, instant) { meta.set(s.id, { born: instant ? -99 : now(), poke: null }); dirty = true; },
    poke(s) { const m = meta.get(s.id); if (m) m.poke = now(); else meta.set(s.id, { born: -99, poke: now() }); dirty = true; },
    remove(s, to) { meta.delete(s.id); if (ghosts.length < 32) ghosts.push({ t: s.t, x: s.x, y: s.y, z: s.z, rot: s.rot, s: (.6 + .4 * Math.max(.3, s.amt)) * BASE[s.t], t0: now(), tx: to ? to.x : s.x, tz: to ? to.z : s.z, c: s.id, tile: tileOf(s) }); dirty = true; },
    clearMeta() { meta.clear(); ghosts.length = 0; dirty = true; },
    pilePop(p) { pmeta.set(p.id, { pop: now() }); dirty = true; },
    wet(x, y, z, rot = 0, s = 1.3) { if (wets.length >= 24) wets.shift(); wets.push({ x, y, z, rot, s, t0: now(), life: 25 }); dirty = true; },
    setHighlight(tool) { hlTool = tool || null; dirty = true; },
    touch() { dirty = true; },
    get calls() { return [leaves, decals, wet, piles].filter(m => m.visible).length; },
    update(dt, t) { if (dirty || animating || hlTool) { dirty = false; animating = rebuild(t); } },
  };
}

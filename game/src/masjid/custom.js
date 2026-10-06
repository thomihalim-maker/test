// Masjid customisation renderer ('Desain Masjid'): colour/material swaps on the shared materials + style variants.
//
// Style variants (roofStyle, finial, menara, gate, menara lantern) are geometry LAYERS merged into the very same
// per-material baked meshes as the static masjid, so they add zero draw calls. A layer is shown or hidden by restoring or
// collapsing its own vertex range in place (collapsed = every vertex on the pivot point, i.e. degenerate triangles that
// rasterise nothing). Pop-in / squash-out / roof cutaway tweens rewrite only that range for a few frames. Alternative styles
// are built lazily the first time they are needed and then cached, so toggling never grows the scene.
// Respect: textures stay geometric (arabesque stars, tiles, shingles); no text or calligraphy anywhere.
import * as THREE from 'three';
import { tex } from './tex.js';
import * as GE from './geo.js';
import {
  PL, WH, HALL_Z, MINARET, MAT_TINTS, ROOF_Y0, mesh, place, roofGroup, roofTiers, knob, rectFrame, contactBand, toaGeo,
  finial as mustakaMesh, finialMustaka, roofTumpang3, menaraKudus, gateBentar, bar,
} from './stages.js';
const { rbox, cyl, shade, merge, flat, uvScale, archPlane, archFrame } = GE;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ------------------------------------------------------------------ catalog (ids + swatches are a contract with game/custom.js)
export const CUSTOM = {
  roof: { sirap: '#c98a4f', sirapTua: '#7a4a2c', genteng: '#c8643a', hijau: '#2f8f5a', toska: '#1f8f8a' },
  wall: { putih: '#fffaf0', krem: '#f6e3bf', hijau: '#d9efd2', biru: '#d6e9f7', pasir: '#ead2a8' },
  trim: { toska: '#2f8f86', hijau: '#3f8f3a', emas: '#d9a028', merah: '#9a2f3a', biru: '#2a4f9a' },
  roofStyle: { tumpang3: null, tumpang2: null, kubah: null },
  finial: { mustaka: null, kuncup: null, bulan: null, mahkota: null },
  menara: { kudus: null, ramping: null },
  gate: { bentar: null, sederhana: null, paduraksa: null },
  floor: { hijau: '#2f7a4a', merah: '#8a1f2d', biru: '#24539c', emas: '#c9962a', ungu: '#6a3f9a' },
  lantern: { teplok: null, bambu: null, gantung: null, lampion: null },
};
export const CUSTOM_ORDER = ['roof', 'wall', 'trim', 'roofStyle', 'finial', 'menara', 'gate', 'floor', 'lantern'];
export const CUSTOM_DEFAULTS = { roof: 'sirap', wall: 'putih', trim: 'toska', roofStyle: 'tumpang3', finial: 'mustaka', menara: 'kudus', gate: 'bentar', floor: 'hijau', lantern: 'teplok' };
export const CUSTOM_IDS = Object.fromEntries(CUSTOM_ORDER.map(c => [c, Object.keys(CUSTOM[c])]));
export const CUSTOM_SWATCHES = Object.fromEntries(CUSTOM_ORDER.map(c => [c, Object.fromEntries(Object.entries(CUSTOM[c]).filter(([, v]) => v))]));
/** stage at which each category becomes visible (the UI shows "Belum dibangun" before it) */
export const STAGE_OF = { trim: 1, wall: 2, gate: 2, roof: 3, roofStyle: 3, finial: 3, menara: 4, floor: 7, lantern: 8 };
const STYLE_STAGE = { gate: 2, roofStyle: 3, finial: 3, menara: 4, mlant: 4 };

/** full custom object: unknown / missing ids fall back to the defaults */
export function sanitizeCustom(c) {
  const out = { ...CUSTOM_DEFAULTS };
  if (c && typeof c === 'object') for (const k of CUSTOM_ORDER) { const v = c[k]; if (typeof v === 'string' && own(CUSTOM[k], v)) out[k] = v; }
  return out;
}
/** '?custom=roof:genteng,wall:biru' -> {roof:'genteng', wall:'biru'} (valid pairs only) or null */
export function parseCustomQuery(str) {
  if (!str) return null; const o = {};
  for (const part of String(str).split(',')) { const [k, v] = part.split(':').map(x => (x || '').trim()); if (own(CUSTOM, k) && own(CUSTOM[k], v)) o[k] = v; }
  return Object.keys(o).length ? o : null;
}

// ------------------------------------------------------------------ composer: per-material baked meshes with toggleable layers
const elastic = p => p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-6.2 * p) * Math.cos(p * 9.5) * (1 - p * .15);
export const bakeKey = (mat, cast, alpha) => mat.uuid + (cast ? ':c' : ':n') + (alpha ? ':a' : '');

export function createComposer(parent) {
  const recs = new Map(), layers = new Map();
  function rec(key, mat, cast) {
    let r = recs.get(key);
    if (!r) { r = { key, mat, cast, mesh: null, live: 0, segs: [] }; recs.set(key, r); }
    return r;
  }
  function bounds(r) {
    const g = r.mesh.geometry; g.computeBoundingBox();
    for (const s of r.segs) g.boundingBox.union(s.box); // hidden layers keep their real extent (no wrong frustum culling)
    g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
  }
  function append(r, geo) {
    const prev = r.mesh?.geometry;
    const merged = prev ? GE.mergeGeometries([prev, geo], false) : geo;
    if (!merged) { console.warn('masjid bake failed for', r.mat.name || r.key); return null; }
    const start = prev ? prev.attributes.position.count : 0, count = merged.attributes.position.count - start;
    if (prev) { prev.dispose(); geo.dispose(); }
    if (!r.mesh) { r.mesh = new THREE.Mesh(merged, r.mat); r.mesh.castShadow = r.cast; r.mesh.receiveShadow = true; r.mesh.name = 'baked:' + r.key; parent.add(r.mesh); }
    else r.mesh.geometry = merged;
    return { start, count };
  }
  const one = (list) => { if (list.length === 1) return list[0]; const g = GE.mergeGeometries(list, false); list.forEach(x => x.dispose()); return g; };
  function addStatic(key, mat, cast, list) {
    const r = rec(key, mat, cast), g = one(list); if (!g) return;
    const res = append(r, g); if (!res) return;
    r.live += res.count; r.mesh.visible = r.live > 0; bounds(r);
  }
  function setShown(L, v) {
    if (L.shown === v) return; L.shown = v;
    for (const s of L.segs) { s.r.live += v ? s.count : -s.count; s.r.mesh.visible = s.r.live > 0; }
  }
  function write(L, sxz, sy, dy, gone) {
    const px = L.pivot.x, py = L.pivot.y + dy, pz = L.pivot.z, oy = L.pivot.y;
    for (const s of L.segs) {
      const attr = s.r.mesh.geometry.attributes.position, a = attr.array, o = s.orig, b = s.start * 3, n = s.count * 3;
      if (gone) for (let i = 0; i < n; i += 3) { a[b + i] = px; a[b + i + 1] = py; a[b + i + 2] = pz; }
      else if (sxz === 1 && sy === 1 && dy === 0) a.set(o, b);
      else for (let i = 0; i < n; i += 3) { a[b + i] = px + (o[i] - px) * sxz; a[b + i + 1] = py + (o[i + 1] - oy) * sy; a[b + i + 2] = pz + (o[i + 2] - pz) * sxz; }
      attr.addUpdateRange(b, n); attr.needsUpdate = true;
    }
    setShown(L, !gone);
  }
  function addLayer(id, entries, o) {
    const L = { id, segs: [], pivot: o.pivot.clone(), cut: !!o.cut, on: !!o.on, anim: null, offY: 0, apex: o.apex ?? 0, shown: true, ls: 1, ly: 1, ld: 0, lg: false };
    for (const [key, e] of entries) {
      const r = rec(key, e.mat, e.cast), g = one(e.list); if (!g) continue;
      const res = append(r, g); if (!res) continue;
      const orig = r.mesh.geometry.attributes.position.array.slice(res.start * 3, (res.start + res.count) * 3);
      const s = { r, start: res.start, count: res.count, orig, box: new THREE.Box3().setFromArray(orig) };
      r.segs.push(s); L.segs.push(s); r.live += res.count; r.mesh.visible = true; bounds(r);
    }
    layers.set(id, L);
    if (!L.on) { write(L, 0, 0, 0, true); L.lg = true; }
    return L;
  }
  /** show / hide a layer; anim: pop-in (elastic) or squash-out */
  function show(id, on, { anim = true, delay = 0, dur } = {}) {
    const L = layers.get(id); if (!L) return;
    L.on = on;
    if (!anim) { L.anim = null; L.lg = null; return; }
    if (on) L.anim = { mode: 'in', t: 0, delay, dur: dur ?? .65 };
    else L.anim = L.shown ? { mode: 'out', t: 0, delay, dur: dur ?? .22 } : null;
    L.lg = null;
  }
  function setOffY(id, dy) { const L = layers.get(id); if (L && L.offY !== dy) { L.offY = dy; L.lg = null; } }
  function update(dt, cut) {
    for (const L of layers.values()) {
      let sxz = 1, sy = 1, gone = !L.on;
      const A = L.anim;
      if (A) {
        A.t += dt; const p = (A.t - A.delay) / A.dur;
        if (A.mode === 'in') {
          if (p <= 0) gone = true;
          else if (p >= 1) L.anim = null;
          else { const k = elastic(p), ov = Math.max(0, k - 1); sxz = k * (1 - .25 * ov); sy = k * (1 + .3 * ov); gone = false; }
        } else {
          const q = Math.min(1, Math.max(0, p)); sy = 1 - q * q; sxz = 1 + .18 * Math.sin(Math.PI * q); gone = false;
          if (p >= 1) { L.anim = null; gone = true; }
        }
      }
      if (L.cut && !gone && cut > 0) { sy *= 1 - cut; sxz *= 1 + .06 * Math.sin(Math.PI * cut); if (cut >= .985) gone = true; }
      if (!gone && (sy < .004 || sxz < .004)) gone = true;
      if (gone === L.lg && (gone || (sxz === L.ls && sy === L.ly)) && L.offY === L.ld) continue;
      write(L, sxz, sy, L.offY, gone); L.lg = gone; L.ls = sxz; L.ly = sy; L.ld = L.offY;
    }
  }
  return {
    addStatic, addLayer, show, setOffY, update, has: id => layers.has(id), layer: id => layers.get(id), layers, recs,
    get meshes() { return [...recs.values()].map(r => r.mesh).filter(Boolean); },
  };
}

// ------------------------------------------------------------------ alternative style builders (default ones live in stages.js)
const NOANIM = { add: o => o, addInst: m => m };
const AND = 0x9a8c7a;
const tintG = (g, c) => { g = g.index ? g.toNonIndexed() : g; const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
const GOLD = [1.7, 1.25, .45], WHITE = [1, 1, 1];

export const APEX = { tumpang3: ROOF_Y0 + 8.22, tumpang2: ROOF_Y0 + 6.27, kubah: ROOF_Y0 + 7.73 };

function roofTumpang2(S) {
  const y0 = ROOF_Y0;
  return roofTiers(S, [
    { p: { a0: 7.6, a1: 4.0, h: 2.1 }, y: y0 - .05, d: 1.1 },
    { p: { a0: 5.0, a1: .08, h: 3.7 }, y: y0 + 2.65, d: 2.1 },
  ], [{ w: 7.2, h: .95, y: y0 + 1.8, d: 2.55 }]);
}
function roofKubah(S) {
  const { M, R } = S, y0 = ROOF_Y0;
  const root = roofTiers(S, [
    { p: { a0: 7.6, a1: 4.0, h: 2.1 }, y: y0 - .05, d: 1.1 },
    { p: { a0: 5.0, a1: 2.45, h: 2.1 }, y: y0 + 2.65, d: 2.1 },
  ], [{ w: 7.2, h: .95, y: y0 + 1.8, d: 2.55 }, { w: 4.4, h: .75, y: y0 + 4.35, d: 3.0 }]);
  const dome = new THREE.Group(); place(dome, 0, y0 + 5.1, HALL_Z);
  const collar = shade(cyl(2.28, 2.34, .2, 32), { lo: .8 }); dome.add(mesh(S, collar, M.cream));
  const prof = [[2.02, 0], [2.14, .25], [2.12, .6], [1.95, 1.0], [1.62, 1.42], [1.16, 1.82], [.64, 2.16], [.3, 2.38], [.09, 2.5], [.001, 2.53]].map(([r, h]) => V2(r, h));
  const dg = new THREE.LatheGeometry(prof, 32); dg.translate(0, .2, 0); uvScale(dg, 5.5, 1.5);
  dome.add(mesh(S, shade(dg.toNonIndexed(), { lo: .72, hi: 1.05, y0: .2, y1: 2.73 }), M.sirap));
  const gold = [flat(new THREE.TorusGeometry(2.08, .07, 6, 40).rotateX(Math.PI / 2).translate(0, .26, 0), 1)];
  for (let k = 0; k < 8; k++) { // gilded ribs following the dome curve
    const pts = prof.slice(0, 9).map(v => { const a = k * Math.PI / 4; return V3(Math.cos(a) * (v.x + .03), v.y + .2, Math.sin(a) * (v.x + .03)); });
    gold.push(flat(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .035, 4, false), 1));
  }
  dome.add(mesh(S, merge(gold), M.gold, false));
  root.add(dome); R.add(dome, { delay: 3.7, dur: 1.0, kind: 'pop', amp: .35, fx: 'sparkle', snd: 'pop', fxOff: V3(0, 1.6, 0) });
  return root;
}
function finialKuncup(S, o) { // lotus bud
  const { M, R } = S, g = [];
  g.push(flat(new THREE.CylinderGeometry(.44, .52, .14, 16).translate(0, .07, 0), 1), flat(new THREE.CylinderGeometry(.2, .32, .3, 12).translate(0, .29, 0), 1));
  for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 8; k++) {
    const p = new THREE.SphereGeometry(.2, 10, 8); p.scale(.6, 1.35, .32); p.rotateX(-(ring ? .32 : .62)); p.translate(0, .62 + ring * .1, ring ? .14 : .24); p.rotateY(k * Math.PI / 4 + ring * Math.PI / 8);
    g.push(tintG(p, ring ? [1.05, 1.0, .95] : [.92, .86, .8]));
  }
  { const b = new THREE.SphereGeometry(.26, 14, 10); b.scale(1, 1.45, 1); b.translate(0, .82, 0); g.push(flat(b, 1)); }
  g.push(flat(new THREE.ConeGeometry(.08, .5, 10).translate(0, 1.36, 0), 1), flat(new THREE.SphereGeometry(.06, 8, 6).translate(0, 1.64, 0), 1));
  const fin = mesh(S, merge(g.map(x => x.index ? x.toNonIndexed() : x)), M.gold); place(fin, 0, o.y, HALL_Z);
  R.add(fin, { delay: o.delay ?? 4.0, dur: .9, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, 1.4, 0) });
  return fin;
}
function finialBulan(S, o) { // slim spire topped with an upward-opening crescent (no text)
  const { M, R } = S, g = [];
  const prof = [[.02, 0], [.52, 0], [.55, .08], [.4, .17], [.45, .32], [.32, .47], [.15, .55], [.11, .63], [.2, .74], [.09, .86], [.05, 1.25], [.01, 1.3]].map(([r, h]) => V2(r, h));
  g.push(flat(new THREE.LatheGeometry(prof, 14).toNonIndexed(), 1));
  g.push(flat(new THREE.CylinderGeometry(.035, .035, .4, 6).translate(0, 1.45, 0), 1));
  const R0 = .5, r0 = .42, d = .22, ix = (R0 * R0 - r0 * r0 + d * d) / (2 * d), iy = Math.sqrt(R0 * R0 - ix * ix);
  const a1 = Math.atan2(iy, ix), b1 = Math.atan2(iy, ix - d);
  const sh = new THREE.Shape(); sh.absarc(0, 0, R0, a1, Math.PI * 2 - a1, false); sh.absarc(d, 0, r0, Math.PI * 2 - b1, b1, true);
  const cr = new THREE.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1, curveSegments: 20 });
  cr.translate(0, 0, -.04); cr.rotateZ(Math.PI / 2); cr.translate(0, 2.02, 0); g.push(flat(cr.index ? cr.toNonIndexed() : cr, 1));
  const fin = mesh(S, merge(g), M.gold); place(fin, 0, o.y, HALL_Z);
  R.add(fin, { delay: o.delay ?? 4.0, dur: .9, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, 2, 0) });
  return fin;
}
function finialMahkota(S, o) { // crown: bulb, jewelled band, eight points, tall spike
  const { M, R } = S, g = [];
  const prof = [[.02, 0], [.56, 0], [.6, .1], [.46, .2], [.52, .38], [.43, .55], [.26, .63], [.22, .7]].map(([r, h]) => V2(r, h));
  g.push(flat(new THREE.LatheGeometry(prof, 16).toNonIndexed(), 1));
  g.push(flat(new THREE.CylinderGeometry(.44, .36, .32, 16, 1, true).translate(0, .86, 0).toNonIndexed(), 1));
  g.push(flat(new THREE.TorusGeometry(.44, .03, 5, 20).rotateX(Math.PI / 2).translate(0, 1.02, 0), 1), flat(new THREE.TorusGeometry(.37, .03, 5, 20).rotateX(Math.PI / 2).translate(0, .71, 0), 1));
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, x = Math.cos(a), z = Math.sin(a);
    const sp = new THREE.ConeGeometry(.075, .38, 6); sp.rotateZ(-.12); sp.rotateY(-a); sp.translate(x * .43, 1.2, z * .43); g.push(flat(sp, 1));
    g.push(flat(new THREE.SphereGeometry(.045, 6, 5).translate(x * .45, 1.41, z * .45), 1));
    g.push(tintG(new THREE.SphereGeometry(.055, 8, 6).translate(x * .41, .86, z * .41), k % 2 ? [.4, 1.5, 1.4] : [1.7, .4, .38]));
  }
  { const b = new THREE.SphereGeometry(.3, 14, 10); b.scale(1, .8, 1); b.translate(0, 1.06, 0); g.push(flat(b, 1)); }
  g.push(flat(new THREE.ConeGeometry(.065, .55, 8).translate(0, 1.55, 0), 1), flat(new THREE.SphereGeometry(.07, 8, 6).translate(0, 1.86, 0), 1));
  const fin = mesh(S, merge(g.map(x => x.index ? x.toNonIndexed() : x)), M.gold); place(fin, 0, o.y, HALL_Z);
  R.add(fin, { delay: o.delay ?? 4.0, dur: .9, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, 1.6, 0) });
  return fin;
}
function menaraRamping(S) { // slim white octagonal plastered tower with a balcony ring, lantern room, toa horns and a small tajug cap
  const { M, R } = S, { x, z } = MINARET;
  const root = new THREE.Group(); place(root, x, 0, z);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .9, kind: o.kind ?? 'grow', amp: o.amp ?? .12, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  const oct = (rt, rb, h, y, seg = 8, open = false) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); g.rotateY(Math.PI / 8); g.translate(0, y + h / 2, 0); const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
  const ap = (r) => r * Math.cos(Math.PI / 8); // octagon apothem
  part(merge([shade(uvScale(oct(2.75, 2.85, .3, 0), 3, .3), { lo: .6, tint: AND }), shade(uvScale(oct(2.32, 2.42, .3, .3), 3, .3), { lo: .7, tint: AND }), shade(uvScale(oct(1.9, 2.0, .3, .6), 2.5, .3), { lo: .8 })]), M.dado, 0, { fx: 'dust', snd: 'pop' });
  const H0 = .9, H1 = 9.5, rb = .98, rt = .82, rAt = (y) => rb + (rt - rb) * (y - H0) / (H1 - H0);
  part(shade(uvScale(oct(rt, rb, H1 - H0, H0), 2.5, 4), { lo: .82, hi: 1.02, y0: H0, y1: H1 }), M.wash, .3, { fx: 'dust', amp: .08 });
  const bands = []; for (const y of [3.3, 6.3, 9.0]) bands.push(flat(uvScale(oct(rAt(y) + .05, rAt(y) + .05, .24, y), 6, 1), 1));
  part(merge(bands), M.arabTeal, 1.0, { kind: 'pop', dur: .5, cast: false });
  // arched window recesses (glow at night) with gold frames on alternate faces, doorway on +x
  const win = [], fr = [];
  for (const y of [4.3, 7.3]) for (let f = 0; f < 8; f += 2) {
    const a = f * Math.PI / 4 + Math.PI / 8 + Math.PI / 8, r = ap(rAt(y + .4)) + .012;
    const w = archPlane(.34, .8); const m = new THREE.Matrix4().makeRotationY(Math.PI / 2 - a).setPosition(Math.cos(a) * r, y, Math.sin(a) * r); w.applyMatrix4(m); win.push(w);
    const af = archFrame(.34, .8, .06, .06); af.applyMatrix4(m); fr.push(flat(af, 1));
  }
  part(GE.mergeGeometries(win.map(g => g.index ? g.toNonIndexed() : g), false), M.winBack, 1.1, { kind: 'pop', dur: .4, cast: false });
  { const dm = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(ap(rb) - .02, H0, 0);
    const df = rectFrame(.6, 1.55, .11, .14, false); df.applyMatrix4(dm); fr.push(df);
    const dp = new THREE.BoxGeometry(.6, 1.55, .04); dp.translate(0, .78, -.02); dp.applyMatrix4(dm); fr.push(flat(dp, .42)); }
  part(merge(fr), M.wood, 1.15, { kind: 'pop', dur: .45 });
  // balcony: corbels, marble slab, cream balustrade
  const bal = [], cor = [];
  bal.push(shade(uvScale(oct(1.52, 1.4, .22, H1), 3, .3), { lo: .85 }));
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, c = rbox(.5, .34, .16, .03, 1); c.translate(0, -.34, 0); c.applyMatrix4(new THREE.Matrix4().makeRotationY(-a).setPosition(Math.cos(a) * 1.05, H1, Math.sin(a) * 1.05)); cor.push(shade(c, { lo: .75 })); }
  part(merge(bal), M.marble, 1.8, { kind: 'drop', drop: 2.5, fx: 'dust' });
  const rail = []; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; rail.push(flat(new THREE.CylinderGeometry(.035, .045, .62, 6).translate(Math.cos(a) * 1.38, H1 + .22 + .31, Math.sin(a) * 1.38), 1)); }
  rail.push(flat(new THREE.TorusGeometry(1.39, .055, 5, 24).rotateX(Math.PI / 2).translate(0, H1 + .86, 0), 1));
  part(merge([...rail, ...cor]), M.cream, 2.0, { kind: 'pop', dur: .5 });
  // lantern room (arched openings glow at night) + toa horns + cap
  const RY = H1 + .22, RH = 1.55;
  part(shade(uvScale(oct(.64, .68, RH, RY), 2, 1), { lo: .88 }), M.wash, 2.1, { amp: .1 });
  const op = []; for (let f = 0; f < 8; f++) { const a = f * Math.PI / 4 + Math.PI / 4, r = ap(.66) + .01; const w = archPlane(.3, .95); w.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2 - a).setPosition(Math.cos(a) * r, RY + .3, Math.sin(a) * r)); op.push(w.index ? w.toNonIndexed() : w); }
  part(GE.mergeGeometries(op, false), M.winBack, 2.3, { kind: 'pop', dur: .4, cast: false });
  { const t = []; for (let f = 0; f < 4; f++) { const g = toaGeo(.7); g.rotateX(.25); g.translate(0, 0, .58); g.rotateY(f * Math.PI / 2); g.translate(0, RY + RH - .32, 0); t.push(g); } part(merge(t), M.paint, 2.4, { kind: 'pop', dur: .45, amp: .5 }); }
  const cap = roofGroup(S, { a0: 1.08, a1: .05, h: 1.5 }); cap.position.set(0, RY + RH + .14, 0); root.add(cap);
  R.add(cap, { delay: 2.6, dur: .9, kind: 'drop', drop: 3, amp: .13, fx: 'dust', snd: 'pop' });
  { const ring = shade(oct(.82, .82, .16, RY + RH), { lo: .9 }); part(ring, M.wood, 2.5, { kind: 'pop', dur: .4 }); }
  const kn = knob(S, .8); kn.position.set(0, RY + RH + 1.6, 0); root.add(kn);
  R.add(kn, { delay: 3.4, dur: .7, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, .5, 0) });
  return root;
}
export const MENARA_LANTERN = { kudus: { pts: [[0, 11.37, 0]], s: .85, top: 11.72 }, ramping: { pts: [[.8, 11.08, .8], [-.8, 11.08, .8], [.8, 11.08, -.8], [-.8, 11.08, -.8]], s: .62, top: 11.36 } };

const GZ = 13.1;
export const GATE_COLS = {
  bentar: [[-2.6, 0, 1.0], [2.6, 0, 1.0], [-2.8, 0, 1.0], [2.8, 0, 1.0], [-4.4, 0, .5], [4.4, 0, .5], [-5.1, 0, .45], [5.1, 0, .45]],
  sederhana: [[-1.65, 0, .5], [1.65, 0, .5], [-2.45, 0, .3], [2.45, 0, .3], [-3.2, 0, .3], [3.2, 0, .3], [-3.8, 0, .36], [3.8, 0, .36]],
  paduraksa: [[-1.85, 0, .72], [1.85, 0, .72], [-2.05, 0, .72], [2.05, 0, .72], [-3.25, 0, .4], [3.25, 0, .4], [-4.3, 0, .45], [4.3, 0, .45], [-1.42, -1.22, .25], [1.42, -1.22, .25]],
};
function gateSederhana(S) { // two whitewash pillars + a gentle arch beam with a small knob, low wing walls
  const { M, R } = S; const root = new THREE.Group(); place(root, 0, 0, GZ);
  const wash = [], stone = [], cream = [], teal = [];
  const B = (arr, w, h, d, x, y, z = 0, o = {}) => { const g = rbox(w, h, d, o.r ?? .04, 1); g.translate(x, y, z); if (o.uv) uvScale(g, o.uv[0], o.uv[1]); arr.push(shade(g, { lo: o.lo ?? .8, tint: o.tint ?? null, y0: 0, y1: 3.3 })); };
  for (const sx of [-1, 1]) {
    const x = sx * 1.65;
    B(stone, .95, .3, .95, x, 0, 0, { lo: .6, tint: AND }); B(wash, .64, 2.45, .64, x, .3, 0, { lo: .82 });
    B(cream, .84, .16, .84, x, 2.75, 0, { lo: .95 }); B(cream, .7, .1, .7, x, 2.91, 0, { lo: 1 });
    for (const fz of [-1, 1]) { const p = new THREE.BoxGeometry(.38, 1.15, .02); p.translate(x, 1.55, fz * .33); uvScale(p, 1, 3); teal.push(flat(p, 1)); }
    B(stone, 1.75, .2, .44, sx * 2.82, 0, 0, { lo: .6, tint: AND }); B(wash, 1.62, .8, .32, sx * 2.82, .2, 0, { lo: .8 }); B(cream, 1.74, .1, .44, sx * 2.82, 1.0, 0, { lo: 1 });
    B(wash, .44, 1.3, .44, sx * 3.82, 0, 0, { lo: .78 }); B(cream, .54, .1, .54, sx * 3.82, 1.3, 0);
  }
  const arc = []; for (let i = 0; i <= 16; i++) { const t = i / 16; arc.push(V3(-1.65 + 3.3 * t, 2.98 + .48 * Math.sin(Math.PI * t), 0)); }
  wash.push(shade(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 24, .14, 6, false), { lo: .85 }));
  teal.push(flat(uvScale(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc.map(p => V3(p.x, p.y - .15, p.z))), 24, .06, 5, false), 8, 1), 1));
  root.add(mesh(S, merge(wash), M.wash), mesh(S, merge(stone), M.dado), mesh(S, merge(cream), M.cream), mesh(S, merge(teal), M.arabTeal, false));
  const k = knob(S, .55); k.position.set(0, 3.58, 0); root.add(k);
  for (const sx of [-1, 1]) { const kk = knob(S, .38); kk.position.set(sx * 3.82, 1.4, 0); root.add(kk); }
  root.add(contactBand(S, 4.0, .45, 0, 0, .7, .32));
  R.add(root, { delay: 2.0, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', snd: 'pop', fxOff: V3(0, 0, 1) });
  return root;
}
function gatePaduraksa(S) { // brick piers joined by a lintel, small 2-tier sirap tajug roof over the passage, open teak doors
  const { M, R } = S; const root = new THREE.Group(); place(root, 0, 0, GZ);
  const br = [], st = [], pl = [], teal = [];
  const gb = (w, h, d, x, y, z = 0, lo = .76, tint = null) => { const g = rbox(w, h, d, .03, 1); g.translate(x, y, z); uvScale(g, Math.max(w, d) / 2, h / 2); br.push(shade(g, { lo, hi: 1, y0: 0, y1: 5, tint })); };
  const plate = (x, y, z, r = .15, face = 1) => { const d = new THREE.CylinderGeometry(r, r, .03, 10); d.rotateX(face * Math.PI / 2); d.translate(x, y, z); pl.push(flat(d, 1)); };
  for (const sx of [-1, 1]) {
    const x = sx * 1.85;
    { const f = rbox(1.45, .3, 1.75, .05, 1); f.translate(x, 0, 0); uvScale(f, 2, 1); st.push(shade(f, { lo: .6, tint: AND })); }
    gb(1.1, 2.55, 1.35, x, .3, 0, .78); gb(1.28, .18, 1.5, x, 2.85, 0, .92);
    for (const fz of [-1, 1]) { plate(x, 1.65, fz * .69, .2, fz); plate(x, .95, fz * .69, .13, fz); }
    { const f = rbox(2.4, .3, .9, .05, 1); f.translate(sx * 3.7, 0, 0); st.push(shade(f, { lo: .6, tint: AND })); }
    gb(1.5, 1.25, .55, sx * 3.25, .3, 0, .75); gb(1.62, .14, .66, sx * 3.25, 1.55, 0, .9);
    gb(.6, 1.9, .7, sx * 4.3, .3, 0, .75); gb(.74, .14, .84, sx * 4.3, 2.2, 0, .9); gb(.52, .14, .6, sx * 4.3, 2.34, 0, .95);
    for (const fz of [-1, 1]) plate(sx * 3.25, .95, fz * .29, .14, fz);
  }
  gb(4.85, .5, 1.45, 0, 3.03, 0, .85);
  for (const fz of [-1, 1]) { const b = new THREE.BoxGeometry(2.5, .3, .03); b.translate(0, 3.28, fz * .74); uvScale(b, 6, 1); teal.push(flat(b, 1)); }
  root.add(mesh(S, merge(br), M.brick), mesh(S, merge(st), M.dado), mesh(S, merge(pl), M.plate, false), mesh(S, merge(teal), M.arabTeal, false));
  const r1 = roofGroup(S, { a0: 2.75, b0: 1.2, a1: 1.55, b1: .5, h: .55 }); r1.position.set(0, 3.55, 0); root.add(r1);
  const r2 = roofGroup(S, { a0: 1.6, b0: .72, a1: .05, b1: .05, h: 1.15 }); r2.position.set(0, 4.06, 0); root.add(r2);
  const k = knob(S, .6); k.position.set(0, 5.18, 0); root.add(k);
  // open teak doors swung inward (toward the plaza) against the passage sides
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(sx * 1.3, .32, -.62); leaf.rotation.y = -sx * 1.75;
    const lw = [], lc = [], lg = [];
    const lb = (arr, bw, bh, bd, xx, y, zz) => { const g = new THREE.BoxGeometry(bw, bh, bd); g.translate(xx, y + bh / 2, zz); arr.push(arr === lw ? shade(g, { lo: .8 }) : flat(g, 1)); return g; };
    lb(lw, 1.22, 2.5, .08, -sx * .61, 0, 0);
    for (const y of [.22, 1.38]) for (const fz of [-1, 1]) uvScale(lb(lc, .9, 1.0, .02, -sx * .61, y, fz * .045), 1, 1.2);
    for (const fz of [-1, 1]) lg.push(flat(new THREE.TorusGeometry(.07, .018, 5, 10).translate(-sx * 1.06, 1.3, fz * .07), 1));
    leaf.add(mesh(S, merge(lw), M.wood), mesh(S, merge(lc), M.arabCream, false), mesh(S, merge(lg), M.gold, false));
    root.add(leaf);
  }
  root.add(contactBand(S, 4.6, .9, 0, 0, .8, .35));
  R.add(root, { delay: 2.0, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', snd: 'pop', fxOff: V3(0, 0, 1) });
  return root;
}

// ------------------------------------------------------------------ lanterns (garden path InstancedMeshes + menara layer)
const LANTERN_LOOK = { teplok: { c: 0xffd08a, e: 0xffa640 }, bambu: { c: 0xf8e2a8, e: 0xffb850 }, gantung: { c: 0xfff2cc, e: 0xffc45a }, lampion: { c: 0xff4a3a, e: 0xff3020 } };
function lanternParts(id) { // centred at the glowing head; frame is vertex-coloured for M.wood
  const fr = [], DK = [.7, .62, .55], BAM = [1.3, 1.25, .62];
  let glow;
  if (id === 'bambu') {
    glow = new THREE.CylinderGeometry(.09, .09, .44, 10);
    fr.push(tintG(new THREE.CylinderGeometry(.115, .115, .06, 10).translate(0, .25, 0), BAM), tintG(new THREE.CylinderGeometry(.115, .095, .06, 10).translate(0, -.25, 0), BAM));
    for (const y of [.08, -.1]) fr.push(tintG(new THREE.TorusGeometry(.094, .014, 4, 12).rotateX(Math.PI / 2).translate(0, y, 0), [1.15, 1.05, .5]));
    fr.push(tintG(new THREE.ConeGeometry(.2, .14, 10).translate(0, .34, 0), [1.15, 1.1, .55]));
  } else if (id === 'gantung') {
    glow = new THREE.SphereGeometry(.13, 12, 10); glow.scale(1, 1.35, 1);
    fr.push(tintG(new THREE.ConeGeometry(.21, .16, 10).translate(0, .25, 0), GOLD), tintG(new THREE.CylinderGeometry(.16, .07, .1, 10).translate(0, -.21, 0), GOLD), tintG(new THREE.SphereGeometry(.04, 8, 6).translate(0, .36, 0), GOLD));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; fr.push(tintG(new THREE.CylinderGeometry(.012, .012, .38, 4).translate(Math.cos(a) * .14, 0, Math.sin(a) * .14), GOLD)); }
  } else if (id === 'lampion') {
    glow = new THREE.SphereGeometry(.23, 16, 12); glow.scale(1, .82, 1);
    fr.push(tintG(new THREE.CylinderGeometry(.1, .13, .06, 12).translate(0, .2, 0), GOLD), tintG(new THREE.CylinderGeometry(.13, .1, .06, 12).translate(0, -.2, 0), GOLD));
    fr.push(tintG(new THREE.TorusGeometry(.233, .012, 4, 20).rotateX(Math.PI / 2), GOLD), tintG(new THREE.ConeGeometry(.055, .22, 8).translate(0, -.34, 0), [1.6, .32, .25]));
  } else { // teplok paper lantern
    glow = new THREE.CylinderGeometry(.19, .15, .36, 8);
    fr.push(tintG(new THREE.ConeGeometry(.17, .18, 8).translate(0, .27, 0), DK), tintG(new THREE.CylinderGeometry(.13, .1, .04, 8).translate(0, -.2, 0), DK));
    fr.push(tintG(new THREE.CylinderGeometry(.195, .195, .025, 8).translate(0, .18, 0), [.6, .5, .45]), tintG(new THREE.CylinderGeometry(.155, .155, .025, 8).translate(0, -.18, 0), [.6, .5, .45]));
  }
  glow = glow.index ? glow.toNonIndexed() : glow;
  return { glow, frame: merge(fr.map(g => g.index ? g.toNonIndexed() : g)), top: id === 'bambu' ? .37 : id === 'gantung' ? .38 : id === 'lampion' ? .23 : .36 };
}
const lanternCache = {};
export function lanternGeos(id) {
  if (!own(LANTERN_LOOK, id)) id = 'teplok';
  return lanternCache[id] ??= (() => {
    const P = lanternParts(id), HX = .5, HY = 2.25;
    const pole = flat(new THREE.CylinderGeometry(.07, .1, 2.6, 6).translate(0, 1.3, 0), 1), arm = flat(new THREE.CylinderGeometry(.035, .035, .5, 6).rotateZ(Math.PI / 2).translate(.25, 2.55, 0), 1);
    const base = flat(new THREE.SphereGeometry(.12, 8, 6), 1), hook = flat(new THREE.CylinderGeometry(.012, .012, Math.max(.02, 2.55 - (HY + P.top)), 4).translate(HX, (2.55 + HY + P.top) / 2, 0), .6);
    const fr = P.frame.clone(); fr.translate(HX, HY, 0);
    const head = P.glow.clone(); head.translate(HX, HY, 0); flat(head, 1);
    return { pole: merge([pole, arm, base, hook, fr].map(g => g.index ? g.toNonIndexed() : g)), head };
  })();
}
function buildMlant(S, id) {
  const [mid, lid] = id.split(':'), spec = MENARA_LANTERN[mid] ?? MENARA_LANTERN.kudus, P = lanternParts(lid);
  const root = new THREE.Group(); place(root, MINARET.x, 0, MINARET.z);
  const glow = [], frame = [];
  for (const [x, y, z] of spec.pts) {
    const g = P.glow.clone(); g.scale(spec.s, spec.s, spec.s); g.translate(x, y, z); glow.push(flat(g, 1));
    const f = P.frame.clone(); f.scale(spec.s, spec.s, spec.s); f.translate(x, y, z); frame.push(f);
    frame.push(flat(new THREE.CylinderGeometry(.012, .012, Math.max(.02, spec.top - (y + P.top * spec.s)), 4).translate(x, (spec.top + y + P.top * spec.s) / 2, z).toNonIndexed(), .6));
  }
  root.add(mesh(S, merge(glow), S.M.lanternPath, false), mesh(S, merge(frame), S.M.wood, false));
  S.R.add(root, { delay: mid === 'ramping' ? 3.0 : 2.4, dur: .45, kind: 'pop', amp: .5 });
  return root;
}

// ------------------------------------------------------------------ the customisation system
const ROOF_LOOK = {
  sirap: { map: () => tex.sirap(), rough: .8, env: 0, em: 0x3a2410 },
  sirapTua: { map: () => tex.sirap(CUSTOM.roof.sirapTua), rough: .85, env: 0, em: 0x24140a },
  genteng: { map: () => tex.genteng(CUSTOM.roof.genteng), rough: .72, env: 0, em: 0x3a1408 },
  hijau: { map: () => tex.genteng(CUSTOM.roof.hijau, true), rough: .35, env: .5, em: 0x0c2a18 },
  toska: { map: () => tex.genteng(CUSTOM.roof.toska, true), rough: .35, env: .5, em: 0x0a2a2a },
};
const BUILD = {
  roofStyle: { tumpang3: roofTumpang3, tumpang2: roofTumpang2, kubah: roofKubah },
  finial: { mustaka: finialMustaka, kuncup: finialKuncup, bulan: finialBulan, mahkota: finialMahkota },
  menara: { kudus: menaraKudus, ramping: menaraRamping },
  gate: { bentar: gateBentar, sederhana: gateSederhana, paduraksa: gatePaduraksa },
};
const ease = t => t * t * (3 - 2 * t);

/**
 * o: { M, group, bakeParent, initial, isBuilt(n), isBaked(n), sajadah(), lanterns(), playerPos(), stage() }
 */
export function createCustom(ctx, o) {
  const { M, group } = o;
  const composer = createComposer(o.bakeParent);
  let applied = sanitizeCustom(o.initial);
  const active = {};                 // cat -> id whose layer is currently on
  let gateCols = [], pending = false, lanternShown = null, instPop = null;
  const cutKeys = new Set(); let cut = 0, inHall = false;

  // ---------------- materials (instant at every stage; textures cached by id inside tex.js)
  const C = new THREE.Color(), C2 = new THREE.Color();
  function matTints(id = applied.floor) {
    if (id === 'hijau' || !CUSTOM.floor[id]) return MAT_TINTS;
    const b = new THREE.Color(CUSTOM.floor[id]), hsl = {}; b.getHSL(hsl, THREE.SRGBColorSpace);
    const mk = (dh, ds, dl) => new THREE.Color().setHSL((hsl.h + dh + 1) % 1, Math.min(1, Math.max(0, hsl.s + ds)), Math.min(.8, Math.max(.12, hsl.l + dl)), THREE.SRGBColorSpace).getHexString(THREE.SRGBColorSpace);
    return ['#' + mk(0, 0, 0), '#' + mk(.03, -.05, .1), '#' + mk(-.03, .05, -.07), id === 'emas' ? '#8a1f2d' : '#c9962a', '#' + mk(.06, -.1, .16), '#' + mk(-.05, 0, -.02)];
  }
  function tintSajadah() {
    const sj = o.sajadah?.(); if (!sj) return;
    const t = matTints(); let i = 0;
    for (const [, , r, k] of sj.spots) { C.set(t[(r + Math.abs(k) * 2) % t.length]); sj.inst.setColorAt(i++, C); }
    if (sj.inst.instanceColor) sj.inst.instanceColor.needsUpdate = true;
  }
  function applyMaterials(c) {
    const r = ROOF_LOOK[c.roof] ?? ROOF_LOOK.sirap;
    M.sirap.map = r.map(); M.sirap.roughness = r.rough; M.sirap.envMapIntensity = M._env ? r.env : 0; M.sirap.emissive.setHex(r.em);
    M.wash.color.set(CUSTOM.wall[c.wall]);
    M.wash.emissive.setHex(0x806040); if (c.wall !== 'putih') M.wash.emissive.lerp(C2.set(CUSTOM.wall[c.wall]).multiplyScalar(.55), .85);
    M.arabTeal.map = c.trim === 'toska' ? tex.arabesque('teal') : tex.arabesque(CUSTOM.trim[c.trim]);
    M.arabTeal.emissive.setHex(0x0b3d40); if (c.trim !== 'toska') M.arabTeal.emissive.lerp(C2.set(CUSTOM.trim[c.trim]).multiplyScalar(.15), .85);
    M.carpet.map = c.floor === 'hijau' ? tex.carpet() : tex.carpet(CUSTOM.floor[c.floor]);
    tintSajadah();
    const L = LANTERN_LOOK[c.lantern] ?? LANTERN_LOOK.teplok; M.lanternPath.color.setHex(L.c); M.lanternPath.emissive.setHex(L.e);
  }

  // ---------------- style layers
  const wantId = cat => cat === 'mlant' ? applied.menara + ':' + applied.lantern : applied[cat];
  function setGateCols(id) {
    for (const c of gateCols) { const i = ctx.colliders.indexOf(c); if (i >= 0) ctx.colliders.splice(i, 1); }
    gateCols = (GATE_COLS[id] ?? GATE_COLS.bentar).map(([x, dz, r]) => ({ x, z: GZ + dz, r, masjid: true, gate: true }));
    ctx.colliders.push(...gateCols);
  }
  function makeRoot(S, cat, id) {
    let root;
    if (cat === 'mlant') { root = buildMlant(S, id); root.userData.pivot = V3(MINARET.x, (MENARA_LANTERN[id.split(':')[0]] ?? MENARA_LANTERN.kudus).top, MINARET.z); }
    else if (cat === 'finial') { const y = APEX[active.roofStyle ?? applied.roofStyle] ?? APEX.tumpang3; root = (BUILD.finial[id] ?? finialMustaka)(S, { y }); root.userData.pivot = V3(0, y, HALL_Z); root.userData.cut = true; root.userData.apex = y; }
    else if (cat === 'roofStyle') { root = (BUILD.roofStyle[id] ?? roofTumpang3)(S); root.userData.pivot = V3(0, PL + 4.0, HALL_Z); root.userData.cut = true; }
    else if (cat === 'menara') { root = (BUILD.menara[id] ?? menaraKudus)(S); root.userData.pivot = V3(MINARET.x, 0, MINARET.z); }
    else if (cat === 'gate') { root = (BUILD.gate[id] ?? gateBentar)(S); root.userData.pivot = V3(0, 0, GZ); }
    root.userData.variant = cat + ':' + id; root.userData.keep = true; root.name = 'variant:' + cat + ':' + id;
    return root;
  }
  /** stage builders call this (via S.variant): build the currently chosen style with the stage's build animation */
  function buildVariant(S, cat) {
    const id = wantId(cat);
    const root = makeRoot(S, cat, id);
    S.G.add(root); active[cat] = id;
    if (cat === 'gate') setGateCols(id);
    return root;
  }
  /** turn a finished variant root into a composer layer (merged per material into the shared baked meshes) */
  function adopt(root, inv) {
    const vid = root.userData.variant, i = vid.indexOf(':'), cat = vid.slice(0, i), id = vid.slice(i + 1);
    root.updateMatrixWorld(true);
    const entries = new Map(), disp = [];
    root.traverse(ob => {
      if (!ob.isMesh) return; disp.push(ob.geometry);
      let vis = true; for (let p = ob; p && p !== root.parent; p = p.parent) if (!p.visible) vis = false;
      if (!vis || Array.isArray(ob.material) || ob.material.visible === false || Math.abs(ob.matrixWorld.determinant()) < 1e-9) return;
      const key = bakeKey(ob.material, ob.castShadow, ob.geometry.attributes.color?.itemSize === 4);
      if (!entries.has(key)) entries.set(key, { mat: ob.material, cast: ob.castShadow, list: [] });
      entries.get(key).list.push(GE.bakeNormalize(ob.geometry, new THREE.Matrix4().multiplyMatrices(inv, ob.matrixWorld)));
    });
    root.parent?.remove(root); for (const g of new Set(disp)) g.dispose();
    const on = cat === 'cut' ? true : active[cat] === id;
    const L = composer.addLayer(vid, entries, { pivot: root.userData.pivot ?? V3(0, 0, 0), cut: !!root.userData.cut, on, apex: root.userData.apex });
    if (cat === 'finial') L.offY = (APEX[active.roofStyle] ?? L.apex) - L.apex;
    return L;
  }
  function lazyBuild(cat, id) {
    const tmp = new THREE.Group(); group.add(tmp);
    const S = { ctx, M, G: tmp, R: NOANIM, instant: true, n: 0, col() { }, flash() { }, finale() { } };
    const root = makeRoot(S, cat, id); tmp.add(root);
    group.updateMatrixWorld(true);
    adopt(root, group.matrixWorld.clone().invert());
    group.remove(tmp);
  }
  function juice(cat) {
    const L = composer.layer(cat + ':' + active[cat]); if (!L) return;
    const p = L.pivot, fx = ctx.modules.fx, top = cat === 'menara' ? 12 : cat === 'gate' ? 3.5 : cat === 'mlant' ? 0 : 2;
    try { fx?.burst?.('dust', V3(p.x, (cat === 'roofStyle' || cat === 'finial' || cat === 'mlant') ? p.y : .2, p.z)); fx?.burst?.('sparkle', V3(p.x, p.y + top, p.z)); } catch (e) { }
    try { ctx.modules.audio?.play?.('pop', { pos: V3(p.x, p.y + 1, p.z), vol: .55 }); } catch (e) { }
  }
  function setActive(cat, id, animate) {
    const cur = active[cat]; if (cur === id && composer.layer(cat + ':' + id)?.on) return false;
    const lid = cat + ':' + id;
    if (!composer.has(lid)) lazyBuild(cat, id);
    if (cur && cur !== id) composer.show(cat + ':' + cur, false, { anim: animate });
    composer.show(lid, true, { anim: animate, delay: cur && animate ? (cat === 'finial' ? .45 : .12) : 0 });
    active[cat] = id;
    if (cat === 'gate') setGateCols(id);
    if (animate) juice(cat);
    return true;
  }
  function syncFinial(animate) {
    const roof = active.roofStyle; if (!roof) return;
    for (const L of composer.layers.values()) if (L.id.startsWith('finial:')) composer.setOffY(L.id, (APEX[roof] ?? L.apex) - L.apex);
    const f = active.finial && composer.layer('finial:' + active.finial);
    if (f && animate && f.on) composer.show(f.id, true, { anim: true, delay: .42 });
  }
  function swapLanterns(id, animate) {
    const L = o.lanterns?.(); if (!L || lanternShown === id) return;
    const g = lanternGeos(id); L.pi.geometry = g.pole; L.li.geometry = g.head; lanternShown = id;
    if (animate) {
      const n = L.li.count, base = []; const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { L.li.getMatrixAt(i, m); const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(p, q, s); base.push([p, q, s]); }
      instPop = { L, base, t: 0 };
      try { for (const [p] of base) ctx.modules.fx?.burst?.('sparkle', p.clone().add(V3(0, 2.3, 0)), 4); } catch (e) { }
    }
  }
  function stepInstPop(dt) {
    if (!instPop) return; instPop.t += dt;
    const { L, base } = instPop, p = Math.min(1, instPop.t / .6), k = elastic(p), ov = Math.max(0, k - 1), m = new THREE.Matrix4(), s = new THREE.Vector3();
    base.forEach(([pos, q, sc], i) => { s.set(sc.x * k * (1 - .2 * ov), sc.y * k * (1 + .25 * ov), sc.z * k * (1 - .2 * ov)); m.compose(pos, q, p >= 1 ? sc : s); L.pi.setMatrixAt(i, m); L.li.setMatrixAt(i, m); });
    L.pi.instanceMatrix.needsUpdate = L.li.instanceMatrix.needsUpdate = true;
    if (p >= 1) instPop = null;
  }
  /** (re)apply style choices to every built stage; defers while that stage is still animating */
  function applyStyles(animate = true) {
    pending = false;
    for (const cat of ['gate', 'roofStyle', 'finial', 'menara', 'mlant']) {
      const n = STYLE_STAGE[cat]; if (!o.isBuilt(n)) continue;
      if (!o.isBaked(n)) { pending = true; continue; }
      const changed = setActive(cat, wantId(cat), animate);
      if (cat === 'roofStyle' && changed) syncFinial(animate);
    }
    if (o.isBuilt(8)) { if (!o.isBaked(8)) pending = true; else swapLanterns(applied.lantern, animate); }
  }
  function apply(c, { preview = false } = {}) {
    applied = sanitizeCustom(c);
    applyMaterials(applied);
    applyStyles(true);
    return true;
  }

  // ---------------- cutaway (roof styles, finial, ceiling and mihrab cap squash away so the hall floor can be seen)
  function setCutaway(key, on) { if (on) cutKeys.add(String(key)); else cutKeys.delete(String(key)); }
  function update(dt) {
    const st = o.stage();
    const p = st >= 2 ? o.playerPos() : null;
    if (p) {
      const m = inHall ? .4 : 0; // hysteresis: leave only when clearly outside
      const ins = p.x > -5.0 - m && p.x < 5.0 + m && p.z > -7.5 - m && p.z < 2.0 + m;
      if (ins !== inHall) { inHall = ins; setCutaway('player', ins); }
    } else if (inHall) { inHall = false; setCutaway('player', false); }
    const target = cutKeys.size && st >= 2 ? 1 : 0;
    cut = target > cut ? Math.min(target, cut + dt / .25) : Math.max(target, cut - dt / .25);
    composer.update(dt, ease(cut));
    stepInstPop(dt);
  }

  applyMaterials(applied);
  return {
    composer, buildVariant, adopt, apply, applyStyles, update, setCutaway, matTints, tintSajadah,
    lanternGeos: () => { lanternShown = applied.lantern; return lanternGeos(applied.lantern); },
    afterBake() { if (pending) applyStyles(true); else tintSajadah(); },
    get applied() { return { ...applied }; }, get active() { return { ...active }; },
    get cutaway() { return ease(cut); }, get cutKeys() { return [...cutKeys]; },
    get gateColliders() { return gateCols.slice(); },
  };
}

// ------------------------------------------------------------------ camera framing per design category
export function viewFor(cat) {
  switch (cat) {
    case 'roof': case 'roofStyle': case 'finial': return { target: { x: 0, y: 7.2, z: -2.75 }, dist: 31, pitch: .3, yaw: .32 };
    case 'wall': case 'trim': return { target: { x: 0, y: 2.8, z: 0 }, dist: 22, pitch: .26, yaw: .62 };
    case 'menara': return { target: { x: MINARET.x, y: 6.5, z: MINARET.z }, dist: 23, pitch: .24, yaw: -.55 };
    case 'gate': return { target: { x: 0, y: 2.2, z: GZ }, dist: 14, pitch: .24, yaw: .42 };
    case 'floor': return { target: { x: 0, y: PL + .4, z: -2.7 }, dist: 14, pitch: 1.22, yaw: 0, cutaway: true }; // steep: the S wall and veranda roof must not hide the back rows
    case 'lantern': return { target: { x: 1, y: 2, z: 19.5 }, dist: 14, pitch: .36, yaw: .72 };
    default: return { target: { x: 0, y: 4, z: -1 }, dist: 30, pitch: .34, yaw: .45 };
  }
}

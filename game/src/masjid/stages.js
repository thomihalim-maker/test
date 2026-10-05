// Stage builders for the masjid. Each builder(S) fills S.G and registers animated pieces on S.R.
import * as THREE from 'three';
import { tex, rnd } from './tex.js';
import * as GE from './geo.js';
const { rbox, cyl, shade, merge, flat, xf, uvScale, archPlane, archFrame, wallGeom, pyramidRoof } = GE;

// ---- layout constants (metres) ----
export const PL = 0.7;            // plinth top
export const WH = 4.4;            // wall height above plinth
export const HALL_Z = -2.75;      // hall centre z
export const MINARET = { x: -11.8, z: -4.5 };
export const BEDUG = { x: 11, z: -3.5 };
export const WUDHU = { x: -11, z: 6.5 };

const rep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);

export function makeMaterials(ctx, night) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  let env = null;
  try {
    // tiny PMREM environment so gold/glass catch reflections even when the world has none
    const pm = new THREE.PMREMGenerator(ctx.renderer);
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0xffe9c0);
    const mk = (c, i, x, y, z, s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) })); m.position.set(x, y, z); sc.add(m); };
    mk(0xfff4d8, 6, 12, 14, 8, 8); mk(0x8fc4ff, 1.5, -14, 6, -6, 10); mk(0xffd28a, 3, 0, 4, 16, 8); mk(0x4a6a3a, .6, 0, -12, 0, 22);
    env = pm.fromScene(sc, .04).texture; pm.dispose();
  } catch (e) { env = null; }
  const M = {};
  // whitewash: warm daytime emissive keeps the green sky/ground bounce from turning it olive
  M.wash = std({ map: rep(tex.whitewash(), .45, .45), color: 0xfff4e0, vertexColors: true, roughness: .95, emissive: 0x5a4428, emissiveIntensity: .5 });
  night.push({ m: M.wash, day: .5, night: .75 });
  M.marble = std({ map: tex.marble(), vertexColors: true, roughness: .38, metalness: .02, envMap: env, envMapIntensity: .35 });
  M.dado = std({ map: tex.marble(), color: 0xaaa69e, vertexColors: true, roughness: .8 });
  M.stone = std({ map: tex.marble(), color: 0xd9c7aa, vertexColors: true, roughness: .8 });
  M.wood = std({ map: tex.wood(), vertexColors: true, roughness: .6, emissive: 0x2a160a, emissiveIntensity: .25 });
  M.cream = std({ color: 0xf3e2bf, vertexColors: true, roughness: .7 });
  M.gold = std({ map: tex.gold(), vertexColors: true, roughness: .3, metalness: .75, envMap: env, envMapIntensity: 1.1, emissive: 0x6a4108, emissiveIntensity: .35 });
  M.brass = std({ color: 0xa0804c, vertexColors: true, roughness: .45, metalness: .55, envMap: env, envMapIntensity: .6 });
  M.iron = std({ color: 0x3c3632, vertexColors: true, roughness: .5, metalness: .4 });
  M.sirap = std({ map: tex.sirap(), vertexColors: true, roughness: .85, emissive: 0x3a3438, emissiveIntensity: .12 });
  night.push({ m: M.sirap, day: .12, night: .75 });
  M.louver = std({ map: tex.louver(), vertexColors: true, roughness: .7, emissive: 0xffa040, emissiveIntensity: 0 });
  night.push({ m: M.louver, day: 0, night: .35 });
  M.arabTeal = std({ map: tex.arabesque('teal'), vertexColors: true, roughness: .45, emissive: 0x0b3d40, emissiveIntensity: .25 });
  M.arabCream = std({ map: tex.arabesque('cream'), vertexColors: true, roughness: .6 });
  M.kraw = std({ map: tex.krawangan(), alphaTest: .5, side: THREE.DoubleSide, roughness: .65 });
  M.winBack = std({ color: 0x2a1c12, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 1 });
  night.push({ m: M.winBack, day: 0, night: 1.9 });
  M.glass = std({ map: tex.transom(), emissiveMap: tex.transom(), emissive: 0xffffff, emissiveIntensity: .3, roughness: .2, side: THREE.DoubleSide, envMap: env, envMapIntensity: .6 });
  night.push({ m: M.glass, day: .3, night: 1.6 });
  M.sajadah = std({ map: tex.sajadah(), roughness: .95 });
  M.carpet = std({ map: tex.carpet(), roughness: .98 });
  M.tile = std({ map: tex.plazaTile(), roughness: .8 });
  M.ceiling = std({ map: tex.ceiling(), vertexColors: true, roughness: .7 });
  M.water = std({ map: rep(tex.water(), 1, 1), color: 0x9be8f0, transparent: true, opacity: .86, roughness: .08, metalness: .1, emissive: 0x1a6f86, emissiveIntensity: .35, envMap: env, envMapIntensity: .8 });
  M.drop = new THREE.MeshStandardMaterial({ color: 0xcff6ff, emissive: 0x7fe0ff, emissiveIntensity: .6, transparent: true, opacity: .8, roughness: .1 });
  M.lantern = std({ color: 0xffd08a, emissive: 0xffa640, emissiveIntensity: .55, roughness: .6 });
  night.push({ m: M.lantern, day: .5, night: 3.2 });
  M.flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, .5), toneMapped: false });
  M.hide = std({ color: 0xf0dcb4, roughness: .85, vertexColors: true });
  M.leaf = std({ color: 0xffffff, vertexColors: true, roughness: .8, side: THREE.DoubleSide });
  M.bush = std({ color: 0xffffff, vertexColors: true, roughness: .9, flatShading: true });
  M.soil = std({ color: 0x5b3b24, roughness: 1, vertexColors: true });
  M.petal = std({ color: 0xffffff, roughness: .6 });
  M.brick = std({ map: tex.brick(), vertexColors: true, roughness: .85, emissive: 0x3a1408, emissiveIntensity: .15 });
  night.push({ m: M.brick, day: .15, night: .6 });
  M.plate = std({ map: tex.plate(), vertexColors: true, roughness: .25, envMap: env, envMapIntensity: .7 });
  M.paint = std({ color: 0xffffff, vertexColors: true, roughness: .7 });
  M.sign = std({ map: tex.sign(), roughness: .8 });
  M.contact = new THREE.MeshBasicMaterial({ color: 0x000000, vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // legacy aliases (site.js and older code paths)
  M.plasterW = M.wash; M.plaster = M.wash; M.woodDark = M.wood; M.marbleTint = M.marble; M.roof = M.sirap;
  return M;
}

function mesh(S, geo, mat, cast = true, recv = true) {
  if (mat.vertexColors && !geo.attributes.color) flat(geo, 1);
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m;
}
const place = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
/** Soft contact-shadow frame around a rectangular footprint (vertex alpha fades outward). */
export function contactBand(S, hw, hd, x, z, spread = 1.2, alpha = .42, y = .105) {
  const o = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], O = [[-hw - spread, -hd - spread], [hw + spread, -hd - spread], [hw + spread, hd + spread], [-hw - spread, hd + spread]];
  const pos = [], col = [], idx = [];
  for (const [px, pz] of o) { pos.push(px, 0, pz); col.push(0, 0, 0, alpha); }
  for (const [px, pz] of O) { pos.push(px, 0, pz); col.push(0, 0, 0, 0); }
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; idx.push(i, j + 4, i + 4, i, j, j + 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx); g.computeVertexNormals(); if (g.attributes.normal.getY(0) < 0) { const r = []; for (let q = 0; q < idx.length; q += 3) r.push(idx[q], idx[q + 2], idx[q + 1]); g.setIndex(r); g.computeVertexNormals(); }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(16), 2));
  const m = new THREE.Mesh(g, S.M.contact); m.position.set(x, y, z); m.renderOrder = 1; m.castShadow = false; m.receiveShadow = false; return m;
}
/** Cylinder bar between two points (for rails) */
function bar(a, b, r, seg = 6) { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return flat(g, 1); }
function colLine(S, x0, z0, x1, z1, r, step = 1.1) { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); for (let i = 0; i <= n; i++) S.col(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, r); }

/* ------------------------------------------------------------------ 1: foundation + plaza */
function s1(S) {
  const { M, G, R } = S;
  const base = mesh(S, shade(uvScale(rbox(17.6, .38, 20, .12, 1), 4, 4), { lo: .6, hi: 1 }), M.marble); place(base, 0, 0, -1);
  const top = mesh(S, shade(uvScale(rbox(16.4, .34, 18.8, .1, 1), 3, 3), { lo: .82, hi: 1 }), M.marble); place(top, 0, .36, -1);
  G.add(base, top);
  R.add(base, { delay: 0, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', fxOff: V3(8, 0, 9), snd: 'pop' });
  R.add(top, { delay: .35, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', fxOff: V3(-8, 0, 8), snd: 'pop' });
  // teal arabesque border inlay on the plinth top
  const sg = [];
  const strip = (w, d, x, z) => { const g = new THREE.BoxGeometry(w, .03, d); g.translate(x, PL, z); uvScale(g, w > d ? w / .5 : 1, w > d ? 1 : d / .5); sg.push(flat(g, 1)); };
  strip(15.4, .5, 0, -9.7); strip(15.4, .5, 0, 7.7); strip(.5, 17.4, -7.7, -1); strip(.5, 17.4, 7.7, -1);
  const strips = mesh(S, merge(sg), M.arabTeal, false); G.add(strips); R.add(strips, { delay: .9, dur: .6, kind: 'pop', amp: .3 });
  // front stairs
  const steps = [{ w: 6.2, z: 8.7, h: PL }, { w: 6.8, z: 9.3, h: .47 }, { w: 7.4, z: 9.9, h: .24 }];
  steps.forEach((s, i) => {
    const m = mesh(S, shade(uvScale(rbox(s.w, s.h, .62, .04, 1), 2, 1), { lo: .78, hi: 1 }), M.marble); place(m, 0, 0, s.z); G.add(m);
    R.add(m, { delay: 1.0 + (2 - i) * .13, dur: .55, kind: 'grow', amp: .2, fx: i === 2 ? 'dust' : null });
  });
  // plaza tiles (instanced plain boxes, ripple in from the plinth outward)
  const P = 1.62, list = [];
  for (let i = -9; i <= 9; i++) for (let j = -10; j <= 9; j++) {
    const x = i * P, z = j * P + 1.0, r = Math.hypot(x, z);
    if (r > 15.4 || (Math.abs(x) < 9.6 && z > -12.2 && z < 10.9)) continue;
    list.push([x, z, r]);
  }
  const tg = new THREE.BoxGeometry(1.5, .1, 1.5); tg.translate(0, .05, 0);
  const inst = new THREE.InstancedMesh(tg, M.tile, list.length); inst.receiveShadow = true;
  const mm = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach(([x, z, r], i) => {
    mm.compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (rnd() - .5) * .025), V3(1, 1, 1)); inst.setMatrixAt(i, mm);
    const k = ((Math.round(x / P) + Math.round(z / P)) & 1);
    col.set(r > 12.4 ? '#efcdb0' : k ? '#fff6e6' : '#f1dcb8').multiplyScalar(.92 + rnd() * .1); inst.setColorAt(i, col);
  });
  G.add(inst); R.addInst(inst, { delayFn: (i, p) => .55 + Math.hypot(p.x, p.z - 1) * .055 + rnd() * .12, dur: .6, kind: 'pop', amp: .5 });
  // small arabesque medallion on the plinth in front of the veranda
  const med = new THREE.Group(); med.position.set(0, PL, 7.15);
  med.add(mesh(S, shade(cyl(.95, .98, .05, 24), { lo: .9 }), M.arabTeal, false), mesh(S, cyl(1.12, 1.14, .035, 24), M.cream, false));
  G.add(med); R.add(med, { delay: 1.1, dur: .8, kind: 'pop', fx: 'sparkle', amp: .3 });
  // grounding: rough stone curb at the plinth foot + soft contact shadow
  const kb = [];
  const curb = (w, d, x, z) => { const g = rbox(w, .18, d, .06, 1); g.translate(x, 0, z); uvScale(g, Math.max(w, d) / 1.5, 1); kb.push(shade(g, { lo: .5, hi: .95 })); };
  curb(18.6, .5, 0, -11.25); curb(.5, 20.5, -9.05, -1); curb(.5, 20.5, 9.05, -1);
  curb(5.4, .5, -6.55, 9.25); curb(5.4, .5, 6.55, 9.25); curb(.5, 1.5, -3.95, 9.9); curb(.5, 1.5, 3.95, 9.9);
  const curbM = mesh(S, merge(kb), M.dado); G.add(curbM); R.add(curbM, { delay: .5, dur: .6, kind: 'pop', amp: .2 });
  const cb = contactBand(S, 9.3, 10.5, 0, -1, 1.4, .38); G.add(cb); R.add(cb, { delay: .6, dur: .5, kind: 'fade' });
  S.finale(V3(0, 1.5, 4), 1.9);
  // walkable plinth: smooth step-up height profile
  S.heightAt = (x, z) => {
    const ax = Math.abs(x);
    const inX = THREE.MathUtils.smoothstep(8.8 - ax, 0, .6);
    const inZ = THREE.MathUtils.smoothstep(Math.min(z + 11, 9.0 - z), 0, .6);
    let h = PL * Math.min(inX, inZ);
    if (ax < 3.1 && z > 8.4 && z < 10.2) h = Math.max(h, PL * THREE.MathUtils.clamp((10.2 - z) / 1.8, 0, 1));
    return h;
  };
}

/** rectangular teak frame around a w×h opening (origin bottom-centre), depth d centred on z */
function rectFrame(w, h, t, d, sill = true) {
  const g = []; const b = (bw, bh, bd, x, y, z = 0) => { const q = new THREE.BoxGeometry(bw, bh, bd); q.translate(x, y, z); g.push(flat(q, 1)); };
  b(w + 2 * t + .1, t * 1.1, d + .06, 0, h + t * .55); // head with a slight cornice
  if (sill) b(w + 2 * t + .14, t * .7, d + .12, 0, -t * .35);
  b(t, h, d, -w / 2 - t / 2, h / 2); b(t, h, d, w / 2 + t / 2, h / 2);
  return merge(g);
}
/** plain wooden knob finial (pavilions, minaret) */
function knob(S, s = 1) {
  const g = [];
  const add = (geo, y) => { geo.translate(0, y * s, 0); g.push(flat(geo, 1)); };
  add(new THREE.CylinderGeometry(.16 * s, .24 * s, .16 * s, 8), .08); add(new THREE.SphereGeometry(.2 * s, 10, 8), .32);
  add(new THREE.ConeGeometry(.07 * s, .3 * s, 8), .62);
  return mesh(S, merge(g), S.M.wood, true);
}

/* ------------------------------------------------------------------ 2: walls & prayer hall (+ paduraksa gate) */
function s2(S) {
  const { M, G, R } = S;
  const T = .5, Lside = 10.5, Lfb = 10;
  const win = (u) => ({ u, v: .9, w: 1.25, h: 2.5 });
  const walls = [
    { name: 'W', L: Lside, holes: [win(-3.3), win(0), win(3.3)], x: -5.25, z: HALL_Z, ry: -Math.PI / 2 },
    { name: 'E', L: Lside, holes: [win(-3.3), win(0), win(3.3)], x: 5.25, z: HALL_Z, ry: Math.PI / 2 },
    { name: 'N', L: Lfb, holes: [win(-4.0), { u: 0, v: 0, w: 2.4, h: 3.7, arch: true, frame: 'mihrab' }, win(4.0)], x: 0, z: -7.75, ry: Math.PI },
    { name: 'S', L: Lfb, holes: [win(-3.4), { u: 0, v: 0, w: 2.4, h: 3.1, frame: 'door' }, win(3.4)], x: 0, z: 2.25, ry: 0 },
  ];
  walls.forEach((w, wi) => {
    const grp = new THREE.Group(); place(grp, w.x, PL, w.z, w.ry);
    grp.add(mesh(S, shade(wallGeom(w.L, WH, T, w.holes), { lo: .88, hi: 1, y0: 0, y1: 2.6, top: 1 }), M.wash));
    const fr = [], gf = [], lat = [], gl = [], bk = [];
    for (const h of w.holes) {
      if (h.frame === 'mihrab') { const f = archFrame(h.w, h.h, .22, T + .1); f.translate(h.u, h.v, 0); gf.push(flat(f, 1)); continue; }
      const f = rectFrame(h.w, h.h, .16, T + .1, h.frame !== 'door'); f.translate(h.u, h.v, 0); fr.push(f);
      if (h.frame === 'door') {
        // carved teak lintel board over the doorway
        const lb = new THREE.BoxGeometry(3.3, .6, .12); lb.translate(0, h.h + .55, T / 2 + .06); fr.push(flat(lb, 1));
        continue;
      }
      // krawangan lattice + transom glass + mullion + warm backing (glows at night through the lattice)
      const lh = h.h - .55;
      const lp = new THREE.PlaneGeometry(h.w, lh); lp.translate(h.u, h.v + lh / 2, .04); lat.push(lp);
      const tp = new THREE.PlaneGeometry(h.w, .47); tp.translate(h.u, h.v + lh + .04 + .235, .02); gl.push(tp);
      const mu = new THREE.BoxGeometry(h.w, .08, T * .6); mu.translate(h.u, h.v + lh, 0); fr.push(flat(mu, 1));
      const bp = new THREE.PlaneGeometry(h.w, lh); bp.translate(h.u, h.v + lh / 2, -.16); bk.push(bp);
    }
    grp.add(mesh(S, merge(fr), M.wood, false));
    if (gf.length) grp.add(mesh(S, merge(gf), M.gold, false));
    if (lat.length) {
      grp.add(new THREE.Mesh(GE.mergeGeometries(lat, false), M.kraw), new THREE.Mesh(GE.mergeGeometries(gl, false), M.glass), new THREE.Mesh(GE.mergeGeometries(bk, false), M.winBack));
    }
    if (w.name === 'S') { // carved arabesque inset on the lintel + double teak doors (open inward), gold ring pulls
      const ci = new THREE.BoxGeometry(2.9, .4, .02); ci.translate(0, 3.1 + .55, T / 2 + .13); uvScale(ci, 7, 1);
      grp.add(mesh(S, flat(ci, 1), M.arabCream, false));
      for (const sx of [-1, 1]) {
        const leaf = new THREE.Group(); leaf.position.set(sx * 1.2, .02, 0); leaf.rotation.y = -sx * 1.3;
        const lw = [], lc = [], lg = [];
        const lb = (arr, bw, bh, bd, x, y, z) => { const g = new THREE.BoxGeometry(bw, bh, bd); g.translate(x, y + bh / 2, z); arr.push(arr === lw ? shade(g, { lo: .8 }) : flat(g, 1)); return g; };
        lb(lw, 1.18, 3.05, .08, -sx * .59, 0, 0);
        for (const y of [.25, 1.6]) for (const fz of [-1, 1]) uvScale(lb(lc, .86, 1.15, .02, -sx * .59, y, fz * .045), 1, 1.3);
        for (const fz of [-1, 1]) lg.push(flat(new THREE.TorusGeometry(.08, .02, 5, 10).translate(-sx * 1.02, 1.5, fz * .07), 1));
        leaf.add(mesh(S, merge(lw), M.wood), mesh(S, merge(lc), M.arabCream, false), mesh(S, merge(lg), M.gold, false));
        grp.add(leaf);
      }
    }
    G.add(grp);
    R.add(grp, { delay: .1 + wi * .28, dur: .95, kind: 'grow', amp: .1, fx: 'dust', fxOff: V3(0, 0, 0), snd: 'pop', onLand: () => S.flash(.8) });
    const cs = Math.cos(w.ry), sn = Math.sin(w.ry);
    for (let u = -w.L / 2; u <= w.L / 2 + .01; u += 1.2) {
      if (w.name === 'S' && Math.abs(u) < 1.8) continue;
      S.col(w.x + u * cs, w.z - u * sn, .85);
    }
  });
  // mihrab bulge behind the back wall with a small sirap cap
  const bz = -8.0;
  const bulge = new THREE.Group(); place(bulge, 0, PL, bz);
  const bw = (w, h, d, x, y, z, m = M.wash) => { const g = shade(rbox(w, h, d, .06, 1), { lo: .85 }); g.translate(x, y, z); return mesh(S, g, m); };
  bulge.add(bw(.4, 4.1, 1.5, -1.6, 0, -.75), bw(.4, 4.1, 1.5, 1.6, 0, -.75), bw(3.6, 4.1, .4, 0, 0, -1.5), bw(3.6, .3, 1.8, 0, 4.0, -.8, M.wood));
  const bcap = roofGroup(S, { a0: 2.2, b0: 1.5, a1: .9, b1: .05, h: .85 }); bcap.position.set(0, 4.3, -.8); bulge.add(bcap);
  G.add(bulge); R.add(bulge, { delay: 1.15, dur: .8, kind: 'grow', fx: 'dust', fxOff: V3(0, 0, -.8) });
  colLine(S, -1.7, -9.3, 1.7, -9.3, .8, 1.3);
  { const ceil = mesh(S, shade(uvScale(new THREE.BoxGeometry(10.2, .3, 9.7), 3, 3), { lo: .85 }), M.ceiling, false); place(ceil, 0, PL + WH - .23, HALL_Z); G.add(ceil); R.add(ceil, { delay: 1.3, dur: .6, kind: 'pop', amp: .1 }); }
  // whitewashed pilasters, teak cornice with cream drip, teal frieze, grey stone dado
  const pg = [], cg = [], tg = [], fg = [], kg = [];
  for (const sx of [-1, 1]) for (const z of [-7.75, 2.25]) {
    const x = sx * 5.25, add = (w, h, y) => { const g = rbox(w, h, w, .06, 1); g.translate(x, y, z); pg.push(shade(g, { lo: .85, y0: PL, y1: PL + WH })); };
    add(.98, 1.0, PL); add(.8, WH - 1.3, PL + 1.0); add(1.0, .3, PL + WH - .3);
  }
  const yc = PL + WH - .02;
  const beam = (arr, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); arr.push(shade(g, { lo: .85 })); };
  beam(cg, 11.5, .26, 1.0, 0, yc - .26, -7.75); beam(cg, 11.5, .26, 1.0, 0, yc - .26, 2.25);
  beam(cg, 1.0, .26, 10.5, -5.25, yc - .26, HALL_Z); beam(cg, 1.0, .26, 10.5, 5.25, yc - .26, HALL_Z);
  beam(tg, 11.56, .07, 1.06, 0, yc - .3, -7.75); beam(tg, 11.56, .07, 1.06, 0, yc - .3, 2.25);
  beam(tg, 1.06, .07, 10.6, -5.25, yc - .3, HALL_Z); beam(tg, 1.06, .07, 10.6, 5.25, yc - .3, HALL_Z);
  const fy = PL + 3.72, fh = .36, fz = T / 2 + .015;
  const fb = (L, x, z, ry) => { const g = new THREE.BoxGeometry(L, fh, .04); g.translate(0, fh / 2, 0); uvScale(g, L / fh, 1); xf(g, x, fy, z, ry); fg.push(flat(g, 1)); };
  fb(10, 0, 2.25 + fz, 0); fb(10, 0, -7.75 - fz, 0); fb(10.5, 5.25 + fz, HALL_Z, Math.PI / 2); fb(10.5, -5.25 - fz, HALL_Z, Math.PI / 2);
  const sk = (L, x, z, ry) => { const g = rbox(L, .8, .62, .05, 1); xf(g, x, PL, z, ry); kg.push(shade(g, { lo: .75, hi: 1 })); };
  sk(10.9, -0, -7.75, 0); sk(11, 5.25, HALL_Z, Math.PI / 2); sk(11, -5.25, HALL_Z, Math.PI / 2); sk(3.75, -3.6, 2.25, 0); sk(3.75, 3.6, 2.25, 0);
  const pil = mesh(S, merge(pg), M.wash), cornice = mesh(S, merge(cg), M.wood), drip = mesh(S, merge(tg), M.cream, false), frieze = mesh(S, merge(fg), M.arabTeal, false), skirt = mesh(S, merge(kg), M.dado);
  G.add(pil, cornice, drip, frieze, skirt);
  R.add(skirt, { delay: .7, dur: .7, kind: 'grow' }); R.add(pil, { delay: 1.0, dur: .8, kind: 'grow', amp: .1 });
  for (const [o, d] of [[cornice, 1.3], [drip, 1.38], [frieze, 1.45]]) R.add(o, { delay: d + .1, dur: .6, kind: 'pop', amp: .15 });
  // serambi (open veranda): teak columns on stone umpak, teak beam with teal carved band
  const ar = new THREE.Group(); place(ar, 0, PL, 6.1); G.add(ar);
  const cgeo = [], ugeo = [], bgeo = [];
  for (const x of [-6, -3, 3, 6]) {
    const c = cyl(.2, .23, 2.75, 10); c.translate(x, .3, 0); cgeo.push(shade(c, { lo: .75 }));
    const cap = rbox(.5, .22, .5, .04, 1); cap.translate(x, 3.05, 0); cgeo.push(shade(cap, { lo: .9 }));
    const u = new THREE.CylinderGeometry(.24, .34, .3, 8); u.translate(x, .15, 0); ugeo.push(shade(u, { lo: .6 }));
    S.col(x, 6.1, .4);
  }
  const bm = new THREE.BoxGeometry(12.6, .32, .3); bm.translate(0, 3.27 + .16, 0); cgeo.push(shade(bm, { lo: .85 }));
  for (const sx of [-1, 1]) { const sb = new THREE.BoxGeometry(.24, .26, 3.6); sb.translate(sx * 6, 3.3 + .13, -1.8); cgeo.push(shade(sb, { lo: .85 })); }
  const band = new THREE.BoxGeometry(12.0, .2, .04); band.translate(0, 3.33, .17); uvScale(band, 60, 1); bgeo.push(flat(band, 1));
  ar.add(mesh(S, merge(cgeo), M.wood), mesh(S, merge(ugeo), M.dado), mesh(S, merge(bgeo), M.arabTeal, false));
  R.add(ar, { delay: 1.5, dur: .9, kind: 'grow', amp: .1, fx: 'dust', snd: 'pop' });
  // ---- paduraksa gate at the plaza edge: red brick piers, short wall wings, stepped brick crown, ceramic plates
  const gate = new THREE.Group(); place(gate, 0, 0, 12.6); G.add(gate);
  const br = [], st = [], pl = [];
  const gb = (w, h, d, x, y, z = 0, lo = .72) => { const g = rbox(w, h, d, .03, 1); g.translate(x, y, z); uvScale(g, Math.max(w, d) / 2, h / 2); br.push(shade(g, { lo, hi: 1, y0: 0, y1: 5 })); };
  const plate = (x, y, z, r = .15, face = 1) => { const d = new THREE.CylinderGeometry(r, r, .03, 10); d.rotateX(face * Math.PI / 2); d.translate(x, y, z); pl.push(flat(d, 1)); };
  { const f = rbox(10.6, .25, 1.5, .05, 1); uvScale(f, 6, 1); st.push(shade(f, { lo: .6 })); }
  for (const sx of [-1, 1]) {
    const px = sx * 1.75;
    gb(1.3, .4, 1.3, px, .25, 0, .65); gb(1.1, 3.25, 1.1, px, .65);
    for (const y of [1.5, 2.6]) for (const fz of [-1, 1]) plate(px, y, fz * .56, .17, fz);
    // wing wall with stepped cap + end post
    gb(2.6, 1.45, .5, sx * 3.6, .25); gb(2.7, .16, .62, sx * 3.6, 1.7, 0, .9); gb(2.4, .14, .46, sx * 3.6, 1.86, 0, .95);
    for (const fz of [-1, 1]) plate(sx * 3.6, 1.0, fz * .26, .14, fz);
    gb(.6, 1.95, .7, sx * 5.05, .25); gb(.72, .14, .82, sx * 5.05, 2.2, 0, .9); gb(.5, .14, .6, sx * 5.05, 2.34, 0, .95);
    S.col(px, 12.6, .8); for (const xx of [2.7, 3.6, 4.5, 5.05]) S.col(sx * xx, 12.6, .45);
  }
  // stepped brick crown over the opening (no tile roof)
  const steps2 = [[4.7, .3], [4.2, .28], [3.5, .28], [2.8, .3], [2.0, .3], [1.25, .32], [.6, .34]];
  let yy = 3.9; for (const [w, h] of steps2) { gb(w, h, 1.3 - (4.7 - w) * .12, 0, yy, 0, .85); yy += h; }
  plate(0, 4.35, .68, .2, 1); plate(0, 4.35, -.68, .2, -1);
  gate.add(mesh(S, merge(br), M.brick), mesh(S, merge(st), M.dado), mesh(S, merge(pl), M.plate, false));
  const gk = knob(S, .9); gk.position.set(0, yy, 0); gate.add(gk);
  gate.add(contactBand(S, 5.3, .75, 0, 0, .8, .35).translateY(0));
  R.add(gate, { delay: 2.0, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', snd: 'pop', fxOff: V3(0, 0, .8) });
  S.finale(V3(0, 3, 0), 2.3);
}

/* ------------------------------------------------------------------ roof helpers */
function roofGroup(S, p) {
  const { M } = S;
  const r = pyramidRoof(p);
  const g = new THREE.Group();
  g.add(mesh(S, r.tiles, M.sirap), mesh(S, merge([r.wood, r.soffit]), M.wood), mesh(S, r.trim, M.cream, false));
  return g;
}
/** the single gold mustaka with crescent (main hall only) */
function finial(S) {
  const { M } = S, g = [];
  const add = (geo, y) => { geo.translate(0, y, 0); g.push(flat(geo, 1)); };
  add(new THREE.CylinderGeometry(.42, .55, .22, 12), .11); add(new THREE.SphereGeometry(.34, 12, 9), .5);
  add(new THREE.CylinderGeometry(.14, .22, .45, 10), .95); add(new THREE.SphereGeometry(.21, 10, 8), 1.28);
  add(new THREE.ConeGeometry(.11, .9, 8), 1.85);
  const cr = new THREE.TorusGeometry(.48, .085, 6, 18, Math.PI * 1.55); cr.rotateZ(.72 * Math.PI); cr.translate(0, 2.55, 0); g.push(flat(cr, 1));
  return mesh(S, merge(g), M.gold, true);
}

/* ------------------------------------------------------------------ 3: soko guru + Demak tajug tumpang tiga (straight sirap tiers, louvered vent bands) + mustaka */
function s3(S) {
  const { M, G, R } = S;
  const y0 = PL + WH;
  // soko guru: four teak columns on stone umpak
  const cgeo = [], ugeo = [];
  for (const sx of [-1, 1]) for (const z of [-4.1, -.9]) {
    const x = sx * 3.1;
    const c = cyl(.24, .29, 3.75, 10); c.translate(x, PL + .3, z); cgeo.push(shade(c, { lo: .85 }));
    for (const yy of [PL + 1.2, y0 - .8]) { const r = cyl(.32, .32, .12, 10); r.translate(x, yy, z); cgeo.push(shade(r, { lo: .7 })); }
    const b = new THREE.CylinderGeometry(.42, .55, .3, 8); b.translate(x, PL + .15, z); ugeo.push(shade(b, { lo: .55 }));
    S.col(x, z, .4);
  }
  const cols = mesh(S, merge(cgeo), M.wood), umpak = mesh(S, merge(ugeo), M.dado);
  G.add(cols, umpak);
  R.add(umpak, { delay: .2, dur: .5, kind: 'pop' }); R.add(cols, { delay: .3, dur: .8, kind: 'grow', amp: .12, fx: 'dust', fxOff: V3(0, .2, -2.5) });
  // three straight tiers, each smaller and steeper (~25°, ~35°, ~45°)
  const tiers = [
    { p: { a0: 7.6, a1: 4.0, h: 1.7 }, y: y0 - .05, d: 1.1 },
    { p: { a0: 5.0, a1: 2.45, h: 1.8 }, y: y0 + 2.35, d: 2.1, drum: { w: 7.2, h: .95, y: y0 + 1.45 } },
    { p: { a0: 3.0, a1: .08, h: 2.9 }, y: y0 + 4.65, d: 3.1, drum: { w: 4.4, h: .75, y: y0 + 3.95 } },
  ];
  tiers.forEach((t) => {
    if (!t.drum) return;
    const d = t.drum, grp = new THREE.Group(); place(grp, 0, d.y, HALL_Z);
    grp.add(mesh(S, shade(new THREE.BoxGeometry(d.w, d.h, d.w).translate(0, d.h / 2, 0), { lo: .85 }), M.wash));
    const lv = [], posts = [];
    for (let f = 0; f < 4; f++) {
      const q = new THREE.Matrix4().makeRotationY(f * Math.PI / 2);
      const p = new THREE.BoxGeometry(d.w - .5, d.h - .2, .05); p.translate(0, d.h / 2, d.w / 2 + .02); uvScale(p, (d.w - .5) / .8, 1); p.applyMatrix4(q); lv.push(flat(p, 1));
      const c = new THREE.BoxGeometry(.2, d.h, .2); c.translate(d.w / 2 - .02, d.h / 2, d.w / 2 - .02); c.applyMatrix4(q); posts.push(flat(c, .9));
    }
    const cap = new THREE.BoxGeometry(d.w + .2, .1, d.w + .2); cap.translate(0, d.h - .05, 0); posts.push(flat(cap, .95));
    grp.add(mesh(S, merge(lv), M.louver, false), mesh(S, merge(posts), M.wood, false));
    G.add(grp); R.add(grp, { delay: t.d + .45, dur: .7, kind: 'grow', amp: .12 });
  });
  tiers.forEach((t, i) => {
    const g = roofGroup(S, t.p); place(g, 0, t.y, HALL_Z); G.add(g);
    R.add(g, { delay: t.d, dur: 1.15, kind: 'drop', drop: 7 - i, amp: .12 + i * .03, fx: 'dust', fxOff: V3(0, 0, 0), snd: 'pop' });
  });
  const fin = finial(S); place(fin, 0, y0 + 4.65 + 2.9 - .05, HALL_Z); G.add(fin);
  R.add(fin, { delay: 4.0, dur: .9, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, 2.6, 0) });
  // veranda lean-to roof (straight sirap), kept below the first tier's eave
  const vr = roofGroup(S, { a0: 6.9, b0: 2.7, a1: 5.1, b1: .25, h: .72 });
  place(vr, 0, PL + 3.25, 4.3); G.add(vr); R.add(vr, { delay: .6, dur: 1.0, kind: 'drop', drop: 5, fx: 'dust', snd: 'pop' });
  S.finale(V3(0, 11, HALL_Z), 4.3, 'confetti');
}

/* ------------------------------------------------------------------ 4: Menara Kudus: red-brick candi-like tower, ceramic plates, open teak pavilion with 2-tier sirap roof */
function s4(S) {
  const { M, G, R } = S, { x, z } = MINARET;
  const root = new THREE.Group(); place(root, x, 0, z); G.add(root);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .9, kind: o.kind ?? 'grow', amp: o.amp ?? .12, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  const bk = (w, h, y, d = w, lo = .75) => { const g = rbox(w, h, d, .03, 1); g.translate(0, y, 0); uvScale(g, w / 2, h / 2); return shade(g, { lo, hi: 1, y0: y, y1: y + h }); };
  // kaki: stepped temple-like base
  part(merge([bk(5.8, .45, 0, 5.8, .6), bk(5.2, .45, .45, 5.2, .7), bk(4.6, .45, .9, 4.6, .8)]), M.brick, 0, { fx: 'dust', snd: 'pop' });
  // badan: body with corner pilasters, recessed panels framed by stepped cornices
  const BH = 10.0, body = [bk(3.4, BH, 1.35, 3.4, .8)], pil = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = rbox(.55, BH, .55, .03, 1); p.translate(sx * 1.6, 1.35, sz * 1.6); uvScale(p, .3, 5); pil.push(shade(p, { lo: .8, y0: 1.35, y1: 1.35 + BH })); }
  for (const [y, w] of [[1.35, 3.95], [5.9, 3.75], [6.12, 3.9], [10.95, 3.85], [11.15, 4.15], [11.37, 4.45], [11.61, 4.7]]) body.push(bk(w, .22, y, w, .9));
  part(merge(body.concat(pil)), M.brick, .3, { fx: 'dust' });
  // Kudus ceramic plates set into the panels
  const pl = [];
  for (let f = 0; f < 4; f++) {
    const q = new THREE.Matrix4().makeRotationY(f * Math.PI / 2);
    for (const [u, y, r] of [[-.75, 2.8, .17], [.75, 2.8, .17], [0, 3.9, .25], [-.75, 5.0, .15], [.75, 5.0, .15], [-.75, 7.3, .17], [.75, 7.3, .17], [0, 8.4, .25], [-.75, 9.5, .15], [.75, 9.5, .15]]) {
      const d = new THREE.CylinderGeometry(r, r, .04, 10); d.rotateX(Math.PI / 2); d.translate(u, y, 1.72); d.applyMatrix4(q); pl.push(flat(d, 1));
    }
  }
  part(merge(pl), M.plate, 1.0, { kind: 'pop', dur: .5, cast: false });
  // doorway on the side facing the hall
  { const dg = new THREE.BoxGeometry(.06, 2.0, 1.05); dg.translate(1.72, 1.35 + 1.0, 0); const fr = rectFrame(1.05, 2.0, .14, .14, false); fr.rotateY(Math.PI / 2); fr.translate(1.72, 1.35, 0); part(merge([flat(dg, .45), fr]), M.wood, .9, { kind: 'pop', dur: .5 }); }
  // kepala: open teak pavilion
  const py = 11.91, posts = [];
  { const fl = new THREE.BoxGeometry(3.7, .14, 3.7); fl.translate(0, py + .07, 0); posts.push(shade(fl, { lo: .85 })); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = cyl(.13, .15, 2.2, 8); c.translate(sx * 1.5, py, sz * 1.5); posts.push(shade(c, { lo: .8 })); }
  for (const yy of [py + .7, py + 2.05]) for (const s2 of [-1, 1]) { const a1 = new THREE.BoxGeometry(3.2, .12, .12); a1.translate(0, yy, s2 * 1.5); posts.push(flat(a1, .95)); const a2 = new THREE.BoxGeometry(.12, .12, 3.2); a2.translate(s2 * 1.5, yy, 0); posts.push(flat(a2, .95)); }
  part(merge(posts), M.wood, 2.0, { amp: .08, fx: 'dust' });
  // a small bedug hanging inside, as at Kudus
  { const dr = new THREE.CylinderGeometry(.34, .34, .8, 12); dr.rotateZ(Math.PI / 2); dr.translate(0, py + 1.3, 0); part(shade(dr, { lo: .7, y0: py + .96, y1: py + 1.64 }), M.wood, 2.3, { kind: 'pop', dur: .5 }); }
  const r1 = roofGroup(S, { a0: 2.45, a1: 1.3, h: .62 }); r1.position.set(0, py + 2.2, 0); root.add(r1); R.add(r1, { delay: 2.6, dur: .9, kind: 'drop', drop: 3, fx: 'dust', snd: 'pop' });
  const r2 = roofGroup(S, { a0: 1.55, a1: .06, h: 1.45 }); r2.position.set(0, py + 2.75, 0); root.add(r2); R.add(r2, { delay: 3.0, dur: .9, kind: 'drop', drop: 3, amp: .13, fx: 'dust', snd: 'pop' });
  const kn = knob(S, 1); kn.position.set(0, py + 4.15, 0); root.add(kn);
  R.add(kn, { delay: 3.6, dur: .7, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, .5, 0) });
  S.col(x, z, 2.8);
  { const cb = contactBand(S, 2.9, 2.9, x, z, 1.0, .4); G.add(cb); R.add(cb, { delay: .2, dur: .4, kind: 'fade' }); }
  S.finale(V3(x, 13, z), 3.8, 'confetti');
}

/* ------------------------------------------------------------------ 5: wudhu fountain under a limasan pavilion */
function s5(S) {
  const { M, G, R } = S, { x, z } = WUDHU;
  const root = new THREE.Group(); place(root, x, 0, z); G.add(root);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .8, kind: o.kind ?? 'grow', amp: o.amp ?? .15, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  const oct = (rt, rb, h, y0 = 0, seg = 8) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1); g.translate(0, y0 + h / 2, 0); return g; };
  part(shade(uvScale(rbox(5.8, .22, 5.8, .06, 1), 2, 2), { lo: .7 }), M.marble, 0, { fx: 'dust', snd: 'pop' });
  part(shade(uvScale(oct(2.15, 2.2, .45, .22), 6, .5), { lo: .85 }), M.arabTeal, .25, { kind: 'pop', cast: false });
  part(shade(uvScale(oct(1.85, 1.95, .95, .22), 3, 1), { lo: .6 }), M.marble, .3, { fx: 'dust' });
  part(flat(oct(1.95, 1.95, .1, 1.12), 1), M.dado, .55, { kind: 'pop', dur: .4, cast: false });
  const water = mesh(S, new THREE.CylinderGeometry(1.6, 1.6, .05, 8).translate(0, .98, 0), M.water, false, false); root.add(water);
  R.add(water, { delay: .8, dur: .6, kind: 'pop', amp: .1 }); S.waterMat = M.water;
  const fp = [[.01, 0], [.55, 0], [.4, .25], [.2, .5], [.2, .8], [.55, 1.05], [.5, 1.15], [.1, 1.12], [.1, 1.4], [.32, 1.62], [.28, 1.7], [.02, 1.66]].map(([r, h]) => new THREE.Vector2(r, h));
  const pg = new THREE.LatheGeometry(fp, 10); pg.translate(0, .95, 0);
  part(shade(pg, { lo: .7 }), M.marble, .9, { kind: 'pop', amp: .35, fx: 'water', fxOff: V3(0, 2.5, 0), snd: 'splash' });
  // teak posts on umpak + limasan sirap roof
  const posts = [], ump = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = cyl(.15, .17, 2.8, 8); c.translate(sx * 2.45, .42, sz * 2.45); posts.push(shade(c, { lo: .75 }));
    const b = new THREE.CylinderGeometry(.22, .3, .2, 8); b.translate(sx * 2.45, .32, sz * 2.45); ump.push(shade(b, { lo: .6 }));
    S.col(x + sx * 2.45, z + sz * 2.45, .35);
  }
  for (const s of [-1, 1]) { const b1 = new THREE.BoxGeometry(5.2, .2, .2); b1.translate(0, 3.15, s * 2.45); posts.push(flat(b1, .95)); const b2 = new THREE.BoxGeometry(.2, .2, 5.2); b2.translate(s * 2.45, 3.15, 0); posts.push(flat(b2, .95)); }
  part(merge(posts), M.wood, 1.2, { amp: .1, fx: 'dust' }); part(merge(ump), M.dado, 1.1, { kind: 'pop', dur: .4 });
  const roof = roofGroup(S, { a0: 3.4, b0: 3.25, a1: 1.5, b1: .06, h: 1.75 });
  roof.position.set(0, 3.3, 0); root.add(roof);
  R.add(roof, { delay: 1.6, dur: 1.0, kind: 'drop', drop: 5, amp: .13, fx: 'dust', snd: 'pop' });
  for (const sx of [-1, 1]) { const k = knob(S, .7); k.position.set(sx * 1.5, 5.08, 0); root.add(k); R.add(k, { delay: 2.5, dur: .6, kind: 'pop', amp: .5, fx: 'sparkle' }); }
  // tap wall (west) with steel taps + small basins
  const wall = new THREE.Group(); place(wall, -3.5, 0, 0); root.add(wall);
  wall.add(mesh(S, shade(uvScale(rbox(.7, .95, 6.0, .06, 1), 1, 3), { lo: .6 }), M.stone)); R.add(wall, { delay: 1.3, dur: .8, kind: 'grow', fx: 'dust' });
  const tgeo = [], bgeo = [];
  for (let k = 0; k < 5; k++) {
    const zz = -2.2 + k * 1.1;
    tgeo.push(flat(new THREE.CylinderGeometry(.045, .05, .3, 6).rotateZ(Math.PI / 2).translate(.45, 1.15, zz), 1), flat(new THREE.CylinderGeometry(.03, .03, .16, 6).translate(.6, 1.08, zz), 1), flat(new THREE.SphereGeometry(.06, 6, 5).translate(.35, 1.22, zz), 1));
    bgeo.push(shade(new THREE.CylinderGeometry(.34, .26, .1, 8).translate(.7, .52, zz), { lo: .8 }));
    const stool = new THREE.BoxGeometry(.34, .32, .34); stool.translate(1.35, .16, zz); bgeo.push(shade(stool, { lo: .6 }));
  }
  wall.add(mesh(S, merge(tgeo), M.brass, false), mesh(S, merge(bgeo), M.marble));
  { const cb = contactBand(S, 2.9, 2.9, x, z, .9, .38); G.add(cb); R.add(cb, { delay: .2, dur: .4, kind: 'fade' }); }
  S.col(x - 3.5, z, 2.2); S.col(x - 3.5, z + 2.5, .9); S.col(x - 3.5, z - 2.5, .9); S.col(x, z, 1.9);
  const dg = new THREE.SphereGeometry(.05, 5, 4); dg.scale(1, 1.5, 1);
  const NJ = 8 * 3, NT = 5 * 3;
  const di = new THREE.InstancedMesh(dg, M.drop, NJ + NT); di.frustumCulled = false; di.visible = false;
  root.add(di);
  S.droplets = { mesh: di, NJ, NT, root, ready: false };
  R.add(new THREE.Object3D(), { delay: 1.4, dur: .1, onLand: () => { di.visible = true; S.droplets.ready = true; } });
  S.finale(V3(x, 3, z), 3.0, 'confetti');
}

/* ------------------------------------------------------------------ 6: bedug under a small joglo pavilion */
function s6(S) {
  const { M, G, R } = S, { x, z } = BEDUG;
  const root = new THREE.Group(); place(root, x, 0, z); G.add(root);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .8, kind: o.kind ?? 'grow', amp: o.amp ?? .15, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  part(shade(uvScale(rbox(5.0, .5, 5.0, .06, 1), 3, 3), { lo: .65 }), M.dado, 0, { fx: 'dust', snd: 'pop' });
  part(shade(uvScale(new THREE.BoxGeometry(4.6, .14, 4.6).translate(0, .57, 0), 2, 2), { lo: .9 }), M.wood, .25, { kind: 'pop', fx: 'dust' });
  const posts = [], ump = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = sx * 1.9, pz = sz * 1.9;
    const c = cyl(.15, .17, 2.75, 8); c.translate(px, .7, pz); posts.push(shade(c, { lo: .75 }));
    const b = new THREE.CylinderGeometry(.22, .3, .2, 8); b.translate(px, .74, pz); ump.push(shade(b, { lo: .6 }));
    S.col(x + px, z + pz, .45);
  }
  for (const s of [-1, 1]) { const b1 = new THREE.BoxGeometry(4.2, .24, .24); b1.translate(0, 3.42, s * 1.9); posts.push(shade(b1, { lo: .85 })); const b2 = new THREE.BoxGeometry(.24, .24, 4.2); b2.translate(s * 1.9, 3.42, 0); posts.push(shade(b2, { lo: .85 })); }
  part(merge(posts), M.wood, .5, { fx: 'dust' }); part(merge(ump), M.dado, .45, { kind: 'pop', dur: .4 });
  // joglo: shallow lower skirt + steep upper brunjung with a short ridge
  const ro1 = roofGroup(S, { a0: 3.2, a1: 2.0, h: .55 }); ro1.position.set(0, 3.6, 0); root.add(ro1);
  const ro2 = roofGroup(S, { a0: 2.15, b0: 2.15, a1: .7, b1: .05, h: 1.65 }); ro2.position.set(0, 4.0, 0); root.add(ro2);
  R.add(ro1, { delay: 1.3, dur: 1.0, kind: 'drop', drop: 5, amp: .13, fx: 'dust', snd: 'pop' }); R.add(ro2, { delay: 1.55, dur: 1.0, kind: 'drop', drop: 5, amp: .13, fx: 'dust' });
  for (const sx of [-1, 1]) { const k = knob(S, .65); k.position.set(sx * .7, 5.68, 0); root.add(k); R.add(k, { delay: 2.3, dur: .6, kind: 'pop', amp: .5, fx: 'sparkle' }); }
  { const cb = contactBand(S, 2.5, 2.5, x, z, .9, .38); G.add(cb); R.add(cb, { delay: .2, dur: .4, kind: 'fade' }); }
  // the bedug (hanging drum, axis along X)
  const drum = new THREE.Group(); drum.userData.keep = true; drum.position.set(0, 1.95, 0); root.add(drum);
  const prof = [[.01, -.95], [.42, -.95], [.5, -.8], [.6, -.4], [.64, 0], [.6, .4], [.5, .8], [.42, .95], [.01, .95]].map(([r, h]) => new THREE.Vector2(r, h));
  const lb = new THREE.LatheGeometry(prof, 16); lb.rotateZ(Math.PI / 2);
  drum.add(mesh(S, shade(lb, { lo: .55, hi: 1, y0: -.64, y1: .64 }), M.wood));
  const heads = [], studs = [], hoops = [];
  for (const s of [-1, 1]) {
    heads.push(flat(new THREE.CylinderGeometry(.42, .42, .04, 18).rotateZ(Math.PI / 2).translate(s * .95, 0, 0), 1));
    hoops.push(flat(new THREE.TorusGeometry(.44, .04, 5, 18).rotateY(Math.PI / 2).translate(s * .95, 0, 0), 1));
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; studs.push(flat(new THREE.SphereGeometry(.04, 4, 3).translate(s * .96, Math.sin(a) * .51, Math.cos(a) * .51), 1)); }
  }
  for (const xx of [-.45, .45]) hoops.push(flat(new THREE.TorusGeometry(.63, .032, 5, 18).rotateY(Math.PI / 2).translate(xx, 0, 0), 1));
  const rg = [];
  for (const s of [-1, 1]) for (const zz of [-.35, .35]) rg.push(flat(new THREE.CylinderGeometry(.025, .025, 1.35, 4).translate(s * .55, 1.29, zz), .7));
  drum.add(mesh(S, merge(heads), M.hide), mesh(S, merge(studs.concat(hoops)), M.iron, false), mesh(S, merge(rg), M.wood, false));
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.bedug = true; drum.add(hit);
  S.bedug = { drum, hit, pos: V3(x, 1.95, z), t: 99, rings: [] };
  R.add(drum, { delay: 1.8, dur: 1.1, kind: 'drop', drop: 1.6, amp: .3, fx: 'sparkle', snd: 'bedug', fxOff: V3(0, 0, 0) });
  const mal = new THREE.Group(); const hd = mesh(S, new THREE.SphereGeometry(.14, 8, 6), M.hide); const stk = mesh(S, new THREE.CylinderGeometry(.03, .035, .9, 6), M.wood); stk.position.y = -.45;
  mal.add(hd, stk); mal.position.set(1.2, 1.15, 1.7); mal.rotation.set(.35, 0, -.3); root.add(mal); R.add(mal, { delay: 2.4, dur: .5, kind: 'pop' });
  const rm = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.9, 1.0, 32), rm.clone()); r.visible = false; r.userData.keep = true; r.position.set(0, 1.95, 0); root.add(r); S.bedug.rings.push({ m: r, t: 9, life: .8 }); }
  S.finale(V3(x, 3, z), 2.9, 'confetti');
}

/* ------------------------------------------------------------------ 7: interior: mihrab, mimbar, carpet, sajadah, chandeliers */
function s7(S) {
  const { M, G, R } = S;
  const y = PL + .01;
  // green carpet + gold border
  const cp = mesh(S, new THREE.PlaneGeometry(9.7, 9.3).rotateX(-Math.PI / 2), M.carpet, false, true); cp.position.set(0, y, -2.8); cp.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 1.0; });
  G.add(cp); R.add(cp, { delay: 0, dur: .7, kind: 'pop', amp: .1 });
  // sajadah rows: instanced
  const mg = new THREE.PlaneGeometry(.78, 1.3).rotateX(-Math.PI / 2);
  const rows = 5, cols = 6, spots = [];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const x = (k - 2.5) * 1.55, zz = -6.35 + r * 1.62; if (!(Math.abs(x - 2.55) < 1.0 && zz < -4.3)) spots.push([x, zz, r, k]); }
  const inst = new THREE.InstancedMesh(mg, M.sajadah, spots.length); inst.receiveShadow = true;
  const tints = ['#8a1f2d', '#1f6b4a', '#16707a', '#a3362a', '#24806a', '#6e1f3a'], mm = new THREE.Matrix4(), c = new THREE.Color();
  let i = 0;
  for (const [x, zz, r, k] of spots) {
    mm.compose(V3(x, y + .012, zz), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (rnd() - .5) * .04), V3(1, 1, 1)); inst.setMatrixAt(i, mm);
    c.set(tints[(r + k * 2) % tints.length]); inst.setColorAt(i, c); i++;
  }
  G.add(inst); R.addInst(inst, { delayFn: (i2, p) => .4 + (p.z + 7) * .1 + Math.abs(p.x) * .03, dur: .5, kind: 'drop', drop: .8, amp: .4 });
  // mihrab niche (inside the back-wall hole / bulge)
  const mh = new THREE.Group(); place(mh, 0, PL, -7.5); G.add(mh);
  const back = mesh(S, new THREE.PlaneGeometry(2.4, 3.7).translate(0, 1.85, -1.38), M.arabTeal, false); uvScale(back.geometry, 2, 3);
  mh.add(back);
  const side = []; for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(1.4, 3.7).rotateY(-s * Math.PI / 2).translate(s * 1.19, 1.85, -.7); uvScale(g, 1.5, 3); side.push(g); }
  mh.add(mesh(S, merge(side), M.arabTeal, false));
  const fr = archFrame(2.4, 3.7, .26, .3); fr.translate(0, 0, .1); mh.add(mesh(S, flat(fr, 1), M.gold, false));
  const fr2 = archFrame(3.2, 4.3, .18, .2); fr2.translate(0, -.05, .06); mh.add(mesh(S, flat(fr2, 1), M.marbleTint, false));
  // half-dome shell + hanging lamp
  const lamp = new THREE.Group(); lamp.position.set(0, 3.0, -.5);
  lamp.add(mesh(S, flat(new THREE.CylinderGeometry(.012, .012, .5, 4).translate(0, .3, 0), 1), M.gold, false), mesh(S, new THREE.SphereGeometry(.14, 8, 6), M.lantern, false), mesh(S, flat(new THREE.ConeGeometry(.12, .12, 10).translate(0, .22, 0), 1), M.gold, false));
  mh.add(lamp);
  // mini columns
  const mc = []; for (const s of [-1, 1]) { const c1 = cyl(.1, .12, 3.2, 12); c1.translate(s * 1.28, 0, .02); mc.push(shade(c1, { lo: .8 })); const cap = new THREE.SphereGeometry(.15, 10, 8); cap.translate(s * 1.28, 3.22, .02); mc.push(flat(cap, 1)); }
  mh.add(mesh(S, merge(mc), M.gold, false));
  R.add(mh, { delay: .8, dur: .9, kind: 'pop', amp: .15, onLand: () => S.flash(1) });
  // mimbar (pulpit): sloped carved side panels, gilded stair rails + balusters, arched gate, canopy
  const mb = new THREE.Group(); place(mb, 2.55, PL, -6.0); mb.scale.setScalar(1.15); G.add(mb);
  const pg = [], gg = [], cg2 = [];
  const bx = (arr, w, h, d, px, py, pz, r = .04) => { const g = rbox(w, h, d, r, 1); g.translate(px, py, pz); arr.push(arr === pg ? shade(g, { lo: .7 }) : flat(g, 1)); return g; };
  const sideS = new THREE.Shape([V2(1.2, 0), V2(1.2, .55), V2(-.45, 1.95), V2(-1.25, 1.95), V2(-1.25, 0)].map(v => V2(v.x, v.y)));
  for (const sx of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(sideS, { depth: .14, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1 });
    g.rotateY(-Math.PI / 2); g.translate(sx * .55 + .07, 0, 0); uvScale(g, .6, .6); pg.push(shade(g, { lo: .7 }));
    const pn = new THREE.ExtrudeGeometry(new THREE.Shape([V2(.95, .15), V2(.95, .5), V2(-.3, 1.55), V2(-.95, 1.55), V2(-.95, .15)]), { depth: .02, bevelEnabled: false });
    pn.rotateY(-Math.PI / 2); pn.translate(sx * .63 + (sx > 0 ? .02 : 0), 0, 0); uvScale(pn, 1.2, 1.2); cg2.push(flat(pn, 1));
    // gilded rail + balusters + newel balls
    const A = V3(sx * .55, 1.12, 1.2), B = V3(sx * .55, 2.52, -.45), C = V3(sx * .55, 2.52, -1.25);
    gg.push(bar(A, B, .035), bar(B, C, .035));
    for (let zz = 1.0; zz > -.45; zz -= .26) { const yb = .55 + (1.2 - zz) / 1.65 * 1.4; gg.push(bar(V3(sx * .55, yb, zz), V3(sx * .55, yb + .57, zz), .018, 5)); }
    gg.push(flat(new THREE.SphereGeometry(.08, 6, 5).translate(A.x, A.y + .02, A.z), 1), flat(new THREE.SphereGeometry(.07, 6, 5).translate(B.x, B.y + .04, B.z), 1));
  }
  for (let st2 = 0; st2 < 4; st2++) bx(pg, .96, .1, .42, 0, .18 + st2 * .34, 1.0 - st2 * .42, .02);
  bx(pg, .96, .12, .8, 0, 1.83, -.85, .03);
  bx(pg, 1.26, 3.1, .14, 0, 0, -1.3);
  for (const sx of [-.5, .5]) bx(pg, .09, 1.25, .09, sx, 1.95, -.45);
  uvScale(bx(cg2, .9, 1.2, .03, 0, 1.95, -1.21, .01), 1, 1.3);
  bx(gg, 1.32, .1, 1.0, 0, 3.15, -.85, .02);
  gg.push(flat(new THREE.ConeGeometry(.78, .75, 4).rotateY(Math.PI / 4).translate(0, 3.6, -.85), 1), flat(new THREE.SphereGeometry(.1, 10, 8).translate(0, 4.05, -.85), 1));
  { const f = archFrame(.9, 1.75, .09, .1); f.translate(0, 0, 1.24); gg.push(flat(f, 1)); }
  mb.add(mesh(S, merge(pg), M.wood), mesh(S, merge(gg), M.gold, false), mesh(S, merge(cg2), M.arabCream, false));
  R.add(mb, { delay: 1.3, dur: .8, kind: 'grow', amp: .15, fx: 'dust', fxOff: V3(0, .2, 0) });
  S.col(2.55, -6.0, 1.2);
  // wall arabesque panels (inside side walls)
  const wp = [];
  for (const s of [-1, 1]) for (const u of [-1.65, 1.65]) {
    const pl = rbox(1.0, 1.0, .06, .02, 1); uvScale(pl, 1, 1); xf(pl, s * 4.96, PL + 2.0, HALL_Z + u + 0, Math.PI / 2); wp.push(flat(pl, 1));
  }
  const panels = mesh(S, merge(wp), M.arabCream, false); G.add(panels); R.add(panels, { delay: 1.6, dur: .5, kind: 'pop' });
  const pfg = []; for (const s of [-1, 1]) for (const u of [-1.65, 1.65]) { const f = new THREE.TorusGeometry(.72, .05, 4, 4).rotateZ(Math.PI / 4).rotateY(Math.PI / 2).translate(s * 4.94, PL + 2.5, HALL_Z + u); pfg.push(flat(f, 1)); }
  const pf = mesh(S, merge(pfg), M.wood, false); G.add(pf); R.add(pf, { delay: 1.7, dur: .5, kind: 'pop' });
  // chandeliers
  const ch = new THREE.Group(); G.add(ch);
  const hy = PL + WH - .45;
  const chg = [], fl = [], dr = [];
  const zs = [-5.6, -2.75, .1];
  zs.forEach((zz, k) => {
    const cg = new THREE.Group(); cg.position.set(0, 0, zz);
    const cc = [];
    cc.push(flat(new THREE.CylinderGeometry(.015, .015, 1.0, 4).translate(0, hy - .5 + .2 + .0, 0), 1));
    const hang = hy - 1.0; // ring height
    cc.push(flat(new THREE.TorusGeometry(.7, .045, 5, 16).rotateX(Math.PI / 2).translate(0, hang, 0), 1));
    cc.push(flat(new THREE.TorusGeometry(.38, .03, 4, 12).rotateX(Math.PI / 2).translate(0, hang + .22, 0), 1));
    cc.push(flat(new THREE.SphereGeometry(.16, 8, 6).translate(0, hang - .22, 0), 1));
    cc.push(flat(new THREE.ConeGeometry(.1, .3, 8).translate(0, hang - .45, 0).rotateX(Math.PI), 1));
    cc.push(flat(new THREE.CylinderGeometry(.12, .05, .18, 8).translate(0, hy + .0, 0), 1));
    const candles = [], flames = [], drops = [];
    for (let j = 0; j < 8; j++) {
      const a = j / 8 * Math.PI * 2, rx = Math.sin(a) * .7, rz = Math.cos(a) * .7;
      candles.push(flat(new THREE.CylinderGeometry(.04, .04, .22, 5).translate(rx, hang + .16, rz), 1));
      flames.push(new THREE.SphereGeometry(.055, 5, 4).scale(1, 1.4, 1).translate(rx, hang + .36, rz));
      drops.push(flat(new THREE.OctahedronGeometry(.07).translate(rx * .9, hang - .2, rz * .9), 1));
    }
    cg.add(mesh(S, merge(cc.concat(drops)), M.brass, false), mesh(S, merge(candles), M.hide, false), new THREE.Mesh(GE.mergeGeometries(flames, false), M.flame));
    ch.add(cg);
  });
  R.add(ch, { delay: 1.9, dur: .9, kind: 'pop', amp: .25, fx: 'sparkle', fxOff: V3(0, 3.5, -2.75), snd: 'chime' });
  ch.position.set(0, 0, 0);
  S.hallLight = true;
  S.finale(V3(0, 2, -3), 2.6);
}

/* ------------------------------------------------------------------ 8: garden + lanterns */
function s8(S) {
  const { M, G, R } = S;
  // flagstone path from stairs south
  const fs = flat(rbox(1.5, .08, 1.0, .03, 1), 1); const pst = [];
  for (let k = 0; k < 8; k++) pst.push([(rnd() - .5) * .35, 14.2 + k * 1.4]);
  const pin = new THREE.InstancedMesh(fs, M.stone, pst.length); pin.receiveShadow = true; const mm = new THREE.Matrix4(), c = new THREE.Color();
  pst.forEach(([x, z], i) => { mm.compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (rnd() - .5) * .2), V3(1 + rnd() * .2, 1, 1)); pin.setMatrixAt(i, mm); c.set('#ffffff').multiplyScalar(.85 + rnd() * .15); pin.setColorAt(i, c); });
  G.add(pin); R.addInst(pin, { delay: 0, delayFn: (i) => i * .12, dur: .4, kind: 'pop' });
  // path edging: small curb stones on both sides
  { const eg = flat(rbox(.34, .15, .44, .05, 1), 1), ep = [];
    for (const sx of [-1, 1]) for (let z = 14.8; z < 25; z += .5) ep.push([sx * (1.18 + (rnd() - .5) * .05), z]);
    const ei = new THREE.InstancedMesh(eg, M.stone, ep.length); ei.receiveShadow = true;
    ep.forEach(([x, z], i) => { mm.compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (rnd() - .5) * .25), V3(1, .8 + rnd() * .4, 1)); ei.setMatrixAt(i, mm); ei.setColorAt(i, c.set('#ffffff').multiplyScalar(.7 + rnd() * .2)); });
    G.add(ei); R.addInst(ei, { delayFn: (i, p) => .3 + (p.z - 14.8) * .05, dur: .4, kind: 'pop', amp: .5 }); }
  // hedges / bushes (instanced faceted blobs, colour variety)
  const bg = new THREE.IcosahedronGeometry(1, 1); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 7 + p.getZ(i) * 5) * .08); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .8, p.getZ(i) * k); } bg.computeVertexNormals(); shade(bg, { lo: .6, hi: 1, y0: -.8, y1: .8 }); }
  const bushes = [];
  const addB = (x, z, s) => bushes.push([x, z, s]);
  for (const sx of [-1, 1]) { for (let z = -10; z <= -8; z += 1.4) addB(sx * 9.4, z, .8 + rnd() * .2); addB(sx * 9.3, 8.4, .8); addB(sx * 9.3, 7.0, .65); }
  for (let x = -8; x <= 8; x += 1.8) if (Math.abs(x) > 3.3) addB(x, -11.9, .9 + rnd() * .3);
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) addB(sx * (2.35 + rnd() * .15), 15.2 + k * 2.1, .55 + rnd() * .12);
  const bi = new THREE.InstancedMesh(bg, M.bush, bushes.length); bi.castShadow = true; bi.receiveShadow = true;
  const greens = ['#3f9a4f', '#4fae4a', '#2f8545', '#62b84f', '#3a8f5e'];
  bushes.forEach(([x, z, s], i) => { mm.compose(V3(x, .6 * s + (x * x + z * z < 190 ? .02 : 0), z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rnd() * 6), V3(s * 1.1, s, s * 1.1)); bi.setMatrixAt(i, mm); c.set(greens[(rnd() * greens.length) | 0]); bi.setColorAt(i, c); });
  G.add(bi); R.addInst(bi, { delayFn: (i, p) => .2 + Math.hypot(p.x, p.z) * .035, dur: .7, kind: 'pop', amp: .5 });
  // flower beds with instanced blossoms
  const beds = [[-7.6, 14.2], [7.6, 14.2], [-12.8, 11.5], [12.8, 13.5]];
  const bedG = [], soilG = [];
  beds.forEach(([x, z]) => { const b = rbox(3.2, .38, 1.6, .1, 2); b.translate(x, 0, z); bedG.push(shade(b, { lo: .65 })); const s = rbox(2.8, .1, 1.2, .03, 1); s.translate(x, .36, z); soilG.push(shade(s, { lo: 1 })); S.col(x, z, 1.0); });
  const bedM = mesh(S, merge(bedG), M.marble), soilM = mesh(S, merge(soilG), M.soil, false);
  G.add(bedM, soilM); R.add(bedM, { delay: .6, dur: .7, kind: 'grow', fx: 'dust' }); R.add(soilM, { delay: .9, dur: .3, kind: 'pop' });
  const fgeo = new THREE.IcosahedronGeometry(.13, 0), fl = [], fcols = ['#ff7aa8', '#ffd24a', '#ff5a5a', '#ffffff', '#c58bff'];
  beds.forEach(([x, z]) => { for (let k = 0; k < 24; k++) fl.push([x + (rnd() - .5) * 2.6, z + (rnd() - .5) * 1.1, fcols[(rnd() * fcols.length) | 0]]); });
  const fi = new THREE.InstancedMesh(fgeo, M.petal, fl.length);
  fl.forEach(([x, z, col], i) => { mm.compose(V3(x, .55 + rnd() * .12, z), new THREE.Quaternion(), V3(1, 1, 1).multiplyScalar(.8 + rnd() * .6)); fi.setMatrixAt(i, mm); fi.setColorAt(i, c.set(col)); });
  G.add(fi); R.addInst(fi, { delayFn: (i) => 1.1 + i * .012, dur: .5, kind: 'pop', amp: .6 });
  // palms: curved trunks (merged) + instanced fronds
  const palms = [[-13.5, -9], [13.8, -9.5], [-14.5, 12], [15, 8], [-9.5, -14], [8.5, -14.5]];
  const trunk = [], frond = new THREE.PlaneGeometry(.55, 3.0, 2, 8); {
    const p = frond.attributes.position; for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + 1.5) / 3; p.setXYZ(i, p.getX(i) * (1 - v * v * .9) * (1 + .15 * Math.sin(v * 8)), v * 3.0, -(v * v) * 1.5 + Math.abs(p.getX(i)) * .35); }
    frond.computeVertexNormals(); const col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = p.getY(i) / 3, k = .6 + v * .5; col[i * 3] = k * .42; col[i * 3 + 1] = k * 1.0; col[i * 3 + 2] = k * .34; } frond.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const fInst = []; const fq = new THREE.Quaternion(), fe = new THREE.Euler();
  palms.forEach(([x, z], pi) => {
    const lean = (rnd() - .5) * 1.4, ang = rnd() * 6, hgt = 6 + rnd() * 1.6;
    const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(V3(x + Math.cos(ang) * lean * t * t * 1.4, t * hgt, z + Math.sin(ang) * lean * t * t * 1.4)); }
    const cur = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(cur, 10, .2, 6, false); const p = tube.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = .55 + .45 * Math.min(1, p.getY(i) / hgt) + .06 * Math.sin(p.getY(i) * 9); col[i * 3] = k * 1.25; col[i * 3 + 1] = k * 1.05; col[i * 3 + 2] = k * .8; }
    tube.setAttribute('color', new THREE.BufferAttribute(col, 3)); trunk.push(tube);
    const top = pts[8];
    for (let f = 0; f < 10; f++) { const ya = f / 10 * Math.PI * 2 + rnd() * .3; fe.set(-.55 - rnd() * .4, ya, 0, 'YXZ'); fq.setFromEuler(fe); fInst.push({ p: top.clone(), q: fq.clone(), s: .95 + rnd() * .35 }); }
    S.col(x, z, .55);
  });
  const trk = mesh(S, merge(trunk), M.wood); G.add(trk); R.add(trk, { delay: .7, dur: 1.0, kind: 'grow', amp: .05, fx: 'dust' });
  const fi2 = new THREE.InstancedMesh(frond, M.leaf, fInst.length); fi2.castShadow = true;
  fInst.forEach((f, i) => { mm.compose(f.p, f.q, V3(f.s, f.s, f.s)); fi2.setMatrixAt(i, mm); });
  G.add(fi2); R.addInst(fi2, { delayFn: (i) => 1.4 + (i % 10) * .05 + Math.floor(i / 10) * .1, dur: .7, kind: 'pop', amp: .4 });
  // lantern posts (instanced pole + glowing paper lantern)
  const lpos = [[-3.6, 16.2], [3.6, 16.2], [-3.6, 20.6], [3.6, 20.6], [-9.6, 11.2], [9.6, 11.2], [-12.5, -9], [12.5, -9.5]];
  const pole = new THREE.CylinderGeometry(.07, .1, 2.6, 6).translate(0, 1.3, 0); const arm = new THREE.CylinderGeometry(.035, .035, .5, 6).rotateZ(Math.PI / 2).translate(.25, 2.55, 0);
  const pg = merge([flat(pole, 1), flat(arm, 1), flat(new THREE.SphereGeometry(.12, 8, 6).translate(0, 0, 0), 1), flat(new THREE.ConeGeometry(.15, .2, 6).translate(.5, 2.52, 0), 1)]);
  const lanternG = new THREE.CylinderGeometry(.19, .15, .36, 8).translate(.5, 2.25, 0);
  const pi = new THREE.InstancedMesh(pg, M.wood, lpos.length), li = new THREE.InstancedMesh(lanternG, M.lantern, lpos.length);
  pi.castShadow = true;
  lpos.forEach(([x, z], i) => { const ry = Math.atan2(-z, -x) + Math.PI / 2 * 0; mm.compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -Math.atan2(z - 0, x) + Math.PI), V3(1, 1, 1)); pi.setMatrixAt(i, mm); li.setMatrixAt(i, mm); });
  G.add(pi, li); R.addInst(pi, { delayFn: (i) => 2.0 + i * .06, dur: .6, kind: 'grow', amp: .1 }); R.addInst(li, { delayFn: (i) => 2.3 + i * .06, dur: .6, kind: 'pop', amp: .5 });
  S.lanternSpots = lpos;
  S.finale(V3(0, 1.5, 8), 3.5, 'confetti');
}

export const BUILDERS = [null, s1, s2, s3, s4, s5, s6, s7, s8];

// Stage builders for the masjid. Each builder(S) fills S.G and registers animated pieces on S.R.
import * as THREE from 'three';
import { tex, rnd } from './tex.js';
import * as GE from './geo.js';
const { rbox, cyl, shade, merge, flat, xf, uvScale, archPlane, archFrame, wallGeom, tajugRoof } = GE;

// ---- layout constants (metres) ----
export const PL = 0.7;            // plinth top
export const WH = 4.4;            // wall height above plinth
export const HALL_Z = -2.75;      // hall centre z
export const MINARET = { x: -11.8, z: -4.5 };
export const BEDUG = { x: 11, z: -3.5 };
export const WUDHU = { x: -11, z: 6.5 };

const rep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

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
  M.plasterW = std({ map: rep(tex.plaster(), .5, .5), color: 0xfff0d6, vertexColors: true, roughness: .92, emissive: 0x3a2812, emissiveIntensity: .35 });
  night.push({ m: M.plasterW, day: .35, night: .9, col: 0x3a3a66 });
  M.plaster = std({ map: tex.plaster(), vertexColors: true, roughness: .92 });
  M.marble = std({ map: tex.marble(), vertexColors: true, roughness: .38, metalness: .02, envMap: env, envMapIntensity: .35 });
  M.marbleTint = std({ map: tex.marble(), color: 0xe7efe6, vertexColors: true, roughness: .4 });
  M.wood = std({ map: tex.wood(), color: 0xe6c09a, vertexColors: true, roughness: .62 });
  M.woodDark = std({ map: tex.wood(), color: 0xb0836a, vertexColors: true, roughness: .55 });
  M.gold = std({ map: tex.gold(), vertexColors: true, roughness: .3, metalness: .75, envMap: env, envMapIntensity: 1.1, emissive: 0x6a4108, emissiveIntensity: .35 });
  M.roof = std({ map: tex.roofTile(), vertexColors: true, roughness: .62, emissive: 0x4a2418, emissiveIntensity: 0 });
  night.push({ m: M.roof, day: 0, night: .7 });
  M.ridge = std({ map: tex.roofTile(), color: 0xc08a70, vertexColors: true, roughness: .6 });
  M.green = std({ color: 0x2c8a74, vertexColors: true, roughness: .5, metalness: .05 });
  M.arabTeal = std({ map: tex.arabesque('teal'), vertexColors: true, roughness: .45, emissive: 0x0b3d40, emissiveIntensity: .25 });
  M.arabCream = std({ map: tex.arabesque('cream'), vertexColors: true, roughness: .6 });
  M.glass = std({ map: tex.glass(), emissiveMap: tex.glass(), emissive: 0xffffff, emissiveIntensity: .25, roughness: .2, side: THREE.DoubleSide, envMap: env, envMapIntensity: .6 });
  night.push({ m: M.glass, day: .22, night: 3.2 });
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
  M.hideP = std({ color: 0xf0dcb4, roughness: .85 });
  M.leaf = std({ color: 0xffffff, vertexColors: true, roughness: .8, side: THREE.DoubleSide });
  M.bush = std({ color: 0xffffff, vertexColors: true, roughness: .9, flatShading: true });
  M.soil = std({ color: 0x5b3b24, roughness: 1, vertexColors: true });
  M.petal = std({ color: 0xffffff, roughness: .6 });
  M.stone = std({ map: tex.marble(), color: 0xd9c7aa, vertexColors: true, roughness: .8 });
  M.vent = std({ color: 0x28363a, vertexColors: true, roughness: .8 });
  return M;
}

function mesh(S, geo, mat, cast = true, recv = true) {
  if (mat.vertexColors && !geo.attributes.color) flat(geo, 1);
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m;
}
const place = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
function colLine(S, x0, z0, x1, z1, r, step = 1.1) { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); for (let i = 0; i <= n; i++) S.col(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, r); }

/* ------------------------------------------------------------------ 1: foundation + plaza */
function s1(S) {
  const { M, G, R } = S;
  const base = mesh(S, shade(uvScale(rbox(17.6, .38, 20, .12, 3), 4, 4), { lo: .6, hi: 1 }), M.marble); place(base, 0, 0, -1);
  const top = mesh(S, shade(uvScale(rbox(16.4, .34, 18.8, .1, 3), 3, 3), { lo: .82, hi: 1 }), M.marble); place(top, 0, .36, -1);
  G.add(base, top);
  R.add(base, { delay: 0, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', fxOff: V3(8, 0, 9), snd: 'pop' });
  R.add(top, { delay: .35, dur: 1.0, kind: 'grow', amp: .12, fx: 'dust', fxOff: V3(-8, 0, 8), snd: 'pop' });
  // arabesque border strip + gold edge lines on plinth top
  const sg = [], gg = [];
  const strip = (w, d, x, z) => { const g = rbox(w, .03, d, .012, 1); g.translate(x, PL, z); uvScale(g, w > d ? w / .5 : 1, w > d ? 1 : d / .5); sg.push(flat(g, 1)); };
  strip(15.4, .5, 0, -9.7); strip(15.4, .5, 0, 7.7); strip(.5, 17.4, -7.7, -1); strip(.5, 17.4, 7.7, -1);
  const gl = (w, d, x, z) => { const g = rbox(w, .045, d, .015, 1); g.translate(x, PL, z); gg.push(flat(g, 1)); };
  for (const o of [.3, -.3]) { gl(15.9 + o * 2 * 0, .07, 0, -9.7 - 0.31 + (o < 0 ? .62 : 0)); }
  const strips = mesh(S, merge(sg), M.arabTeal, false); G.add(strips); R.add(strips, { delay: .9, dur: .6, kind: 'pop', amp: .3 });
  const gold = mesh(S, merge(gg), M.gold, false); G.add(gold); R.add(gold, { delay: 1.0, dur: .5, kind: 'pop' });
  // front stairs
  const steps = [{ w: 6.2, z: 8.7, h: PL }, { w: 6.8, z: 9.3, h: .47 }, { w: 7.4, z: 9.9, h: .24 }];
  steps.forEach((s, i) => {
    const m = mesh(S, shade(uvScale(rbox(s.w, s.h, .62, .04, 2), 2, 1), { lo: .78, hi: 1 }), M.marble); place(m, 0, 0, s.z); G.add(m);
    R.add(m, { delay: 1.0 + (2 - i) * .13, dur: .55, kind: 'grow', amp: .2, fx: i === 2 ? 'dust' : null });
  });
  // plaza tiles (instanced, ripple in from the plinth outward)
  const P = 1.62, list = [];
  for (let i = -9; i <= 9; i++) for (let j = -10; j <= 9; j++) {
    const x = i * P, z = j * P + 1.0, r = Math.hypot(x, z);
    if (r > 15.4 || (Math.abs(x) < 9.6 && z > -12.2 && z < 10.9) || Math.hypot(x, z - 12.6) < 2.25) continue;
    list.push([x, z, r]);
  }
  const tg = rbox(1.5, .1, 1.5, .035, 1);
  const inst = new THREE.InstancedMesh(tg, M.tile, list.length); inst.receiveShadow = true;
  const mm = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach(([x, z, r], i) => {
    mm.compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (rnd() - .5) * .025), V3(1, 1, 1)); inst.setMatrixAt(i, mm);
    const k = ((Math.round(x / P) + Math.round(z / P)) & 1);
    col.set(r > 12.4 ? '#efcdb0' : k ? '#fff6e6' : '#f1dcb8').multiplyScalar(.92 + rnd() * .1); inst.setColorAt(i, col);
  });
  G.add(inst); R.addInst(inst, { delayFn: (i, p) => .55 + Math.hypot(p.x, p.z - 1) * .055 + rnd() * .12, dur: .6, kind: 'pop', amp: .5 });
  // forecourt medallion
  const med = new THREE.Group(); med.position.set(0, 0, 12.6);
  const disc = mesh(S, shade(cyl(1.75, 1.8, .12, 40), { lo: .9 }), M.arabTeal); const ring = mesh(S, cyl(2.0, 2.05, .09, 40), M.gold);
  const ring2 = mesh(S, cyl(1.9, 1.95, .1, 40), M.marble);
  med.add(ring, ring2, disc); G.add(med); R.add(med, { delay: 1.1, dur: .8, kind: 'pop', fx: 'sparkle', amp: .3 });
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

/* ------------------------------------------------------------------ 2: walls & prayer hall */
function s2(S) {
  const { M, G, R } = S;
  const T = .5, Lside = 10.5, Lfb = 10;
  const win = (u) => ({ u, v: 1.0, w: 1.3, h: 2.7, arch: true });
  const walls = [
    { name: 'W', L: Lside, holes: [win(-3.3), win(0), win(3.3)], x: -5.25, z: HALL_Z, ry: Math.PI / 2 },
    { name: 'E', L: Lside, holes: [win(-3.3), win(0), win(3.3)], x: 5.25, z: HALL_Z, ry: -Math.PI / 2 },
    { name: 'N', L: Lfb, holes: [win(-4.0), { u: 0, v: 0, w: 2.4, h: 3.7, arch: true, frame: 'mihrab' }, win(4.0)], x: 0, z: -7.75, ry: Math.PI },
    { name: 'S', L: Lfb, holes: [win(-3.4), { u: 0, v: 0, w: 2.8, h: 3.7, arch: true, frame: 'door' }, win(3.4)], x: 0, z: 2.25, ry: 0 },
  ];
  walls.forEach((w, wi) => {
    const grp = new THREE.Group(); place(grp, w.x, PL, w.z, w.ry);
    const wm = mesh(S, shade(wallGeom(w.L, WH, T, w.holes), { lo: .74, hi: 1, y0: 0, y1: 3.2, top: 1 }), M.plasterW);
    grp.add(wm);
    const fr = [], gl = [];
    for (const h of w.holes) {
      const f = archFrame(h.w, h.h, h.frame ? .26 : .22, T + .14); f.translate(h.u, h.v, 0); fr.push(flat(f, 1));
      if (!h.frame) { const p = archPlane(h.w, h.h); p.translate(h.u, h.v, 0); gl.push(p); }
    }
    grp.add(mesh(S, merge(fr), M.gold, false));
    const glass = new THREE.Mesh(GE.mergeGeometries(gl.map(g => g), false), M.glass); glass.userData.glass = true; grp.add(glass);
    G.add(grp);
    R.add(grp, { delay: .1 + wi * .28, dur: .95, kind: 'grow', amp: .1, fx: 'dust', fxOff: V3(0, 0, 0), snd: 'pop', onLand: () => S.flash(.8) });
    // wall colliders (leave the door gap on the south wall)
    const cs = Math.cos(w.ry), sn = Math.sin(w.ry);
    for (let u = -w.L / 2; u <= w.L / 2 + .01; u += 1.2) {
      if (w.name === 'S' && Math.abs(u) < 2.0) continue;
      S.col(w.x + u * cs, w.z - u * sn, .85);
    }
  });
  // mihrab bulge behind the back wall (hollow box)
  const bz = -8.0;
  const bulge = new THREE.Group(); place(bulge, 0, PL, bz);
  const bw = (w, h, d, x, y, z, m = M.plaster) => { const g = shade(rbox(w, h, d, .06), { lo: .7 }); g.translate(x, y, z); return mesh(S, g, m); };
  bulge.add(bw(.4, 4.1, 1.5, -1.6, 0, -.75), bw(.4, 4.1, 1.5, 1.6, 0, -.75), bw(3.6, 4.1, .4, 0, 0, -1.5), bw(3.6, .3, 1.8, 0, 4.0, -.8, M.green));
  const bcap = roofGroup(S, { a0: 2.2, b0: 1.6, a1: .1, b1: .1, h: .9, N: 5 }); bcap.position.set(0, 4.3, -.8); bulge.add(bcap); G.add(bulge); R.add(bulge, { delay: 1.15, dur: .8, kind: 'grow', fx: 'dust', fxOff: V3(0, 0, -.8) });
  colLine(S, -1.7, -9.3, 1.7, -9.3, .8, 1.3);
  { const ceil = mesh(S, shade(uvScale(rbox(10.2, .3, 9.7, .05, 1), 3, 3), { lo: .85 }), M.ceiling, false); place(ceil, 0, PL + WH - .38, HALL_Z); G.add(ceil); R.add(ceil, { delay: 1.3, dur: .6, kind: 'pop', amp: .1 }); }
  // pilasters at corners
  const pg = [];
  for (const sx of [-1, 1]) for (const [z] of [[-7.75], [2.25]]) {
    const x = sx * 5.25, add = (w, h, y) => { const g = rbox(w, h, w, .07, 2); g.translate(x, y, z); pg.push(shade(g, { lo: .72, y0: PL, y1: PL + WH })); };
    add(.95, .35, PL); add(.78, WH - .7, PL + .35); add(.98, .35, PL + WH - .35);
    const r = new THREE.TorusGeometry(.42, .05, 6, 14).rotateX(Math.PI / 2).translate(x, PL + WH - .45, z); pg.push(flat(r, 1));
  }
  const pil = mesh(S, merge(pg), M.plaster); G.add(pil); R.add(pil, { delay: 1.0, dur: .8, kind: 'grow', amp: .1 });
  // cornice (gold + plaster) and arabesque frieze under it
  const cg = [], gg = [], fg = [];
  const beam = (arr, w, h, d, x, y, z, r) => { const g = rbox(w, h, d, r, 1); g.translate(x, y, z); arr.push(arr === cg ? shade(g, { lo: .8 }) : flat(g, 1)); };
  const yc = PL + WH - .02;
  beam(cg, 11.5, .3, 1.0, 0, yc - .3, -7.75, .05); beam(cg, 11.5, .3, 1.0, 0, yc - .3, 2.25, .05);
  beam(cg, 1.0, .3, 10.5, -5.25, yc - .3, HALL_Z, .05); beam(cg, 1.0, .3, 10.5, 5.25, yc - .3, HALL_Z, .05);
  beam(gg, 11.55, .11, 1.05, 0, yc - .33, -7.75, .02); beam(gg, 11.55, .11, 1.05, 0, yc - .33, 2.25, .02);
  beam(gg, 1.05, .11, 10.6, -5.25, yc - .33, HALL_Z, .02); beam(gg, 1.05, .11, 10.6, 5.25, yc - .33, HALL_Z, .02);
  const fy = PL + 3.78, fh = .5, fz = T / 2 + .015;
  const fb = (L, x, z, ry) => { const g = rbox(L, fh, .05, .015, 1); uvScale(g, L / fh, 1); xf(g, x, fy, z, ry); fg.push(flat(g, 1)); };
  fb(10, 0, 2.25 + fz, 0); fb(10, 0, -7.75 - fz, 0); fb(10.5, 5.25 + fz, HALL_Z, Math.PI / 2); fb(10.5, -5.25 - fz, HALL_Z, Math.PI / 2);
  const cornice = mesh(S, merge(cg), M.plaster), corG = mesh(S, merge(gg), M.gold, false), frieze = mesh(S, merge(fg), M.arabTeal, false);
  G.add(cornice, corG, frieze);
  for (const [o, d] of [[cornice, 1.3], [corG, 1.38], [frieze, 1.45]]) R.add(o, { delay: d + .1, dur: .6, kind: 'pop', amp: .15 });
  // skirting band
  const kg = [];
  const sk = (L, x, z, ry) => { const g = rbox(L, 1.0, .62, .06, 2); xf(g, x, PL, z, ry); kg.push(shade(g, { lo: .8, hi: 1 })); };
  sk(10.9, 0, 2.25, 0); sk(10.9, 0, -7.75, 0); sk(11, 5.25, HALL_Z, Math.PI / 2); sk(11, -5.25, HALL_Z, Math.PI / 2);
  const skirt = mesh(S, merge(kg), M.stone); G.add(skirt); R.add(skirt, { delay: .7, dur: .7, kind: 'grow' });
  // serambi arcade (veranda): panel with 3 arches + 4 teak columns
  const ar = new THREE.Group(); place(ar, 0, PL, 5.8); G.add(ar);
  const holes = [-4, 0, 4].map(u => ({ u, v: 0, w: 3.2, h: 3.0, arch: true }));
  const aw = mesh(S, shade(wallGeom(12.6, 3.6, .38, holes), { lo: .8, hi: 1, y0: 0, y1: 2 }), M.plasterW); ar.add(aw);
  const af = []; for (const h of holes) { const f = archFrame(h.w, h.h, .12, .46); f.translate(h.u, 0, 0); af.push(flat(f, 1)); }
  ar.add(mesh(S, merge(af), M.gold, false));
  const bandG = rbox(12.6, .32, .44, .04, 1); bandG.translate(0, 3.5, 0); uvScale(bandG, 24, 1);
  ar.add(mesh(S, flat(bandG, 1), M.arabTeal, false));
  R.add(ar, { delay: 1.5, dur: .9, kind: 'grow', amp: .1, fx: 'dust', snd: 'pop' });
  const cgeo = [];
  for (const x of [-6, -2, 2, 6]) {
    const c = cyl(.24, .27, 3.3, 14); c.translate(x, .3, .3); cgeo.push(shade(c, { lo: .7 }));
    const b = rbox(.62, .3, .62, .06); b.translate(x, 0, .3); cgeo.push(shade(b, { lo: .6 }));
    const cap = rbox(.62, .28, .62, .06); cap.translate(x, 3.35, .3); cgeo.push(shade(cap, { lo: .9 }));
    S.col(x, 6.1, .45);
  }
  const cols = mesh(S, merge(cgeo), M.wood); ar.add(cols);
  const ringg = []; for (const x of [-6, -2, 2, 6]) for (const y of [.55, 3.2]) ringg.push(flat(new THREE.TorusGeometry(.27, .045, 6, 14).rotateX(Math.PI / 2).translate(x, y, .3), 1));
  ar.add(mesh(S, merge(ringg), M.gold, false));
  S.finale(V3(0, 3, 0), 2.3);
}

/* ------------------------------------------------------------------ roof helpers */
function roofGroup(S, p) {
  const { M } = S;
  const r = tajugRoof(p);
  const g = new THREE.Group();
  const rc = r.ridge.attributes.color; for (let i = 0; i < rc.count; i++) rc.setXYZ(i, .8, .56, .46); // darker terracotta hip ridges
  const tiles = merge([shade(r.tiles, { lo: .75, hi: 1, y0: 0, y1: p.h * .5 }), r.ridge]);
  const wood = merge([r.wood, r.soffit]);
  g.add(mesh(S, tiles, M.roof), mesh(S, wood, M.woodDark), mesh(S, r.trim, M.gold, false));
  return g;
}
function finial(S) {
  const { M } = S, g = [];
  const add = (geo, y) => { geo.translate(0, y, 0); g.push(flat(geo, 1)); };
  add(new THREE.CylinderGeometry(.5, .65, .2, 16), .1); add(new THREE.SphereGeometry(.34, 16, 12), .5);
  add(new THREE.CylinderGeometry(.16, .24, .5, 12), .95); add(new THREE.SphereGeometry(.22, 14, 10), 1.3);
  add(new THREE.ConeGeometry(.12, 1.0, 10), 1.9);
  const cr = new THREE.TorusGeometry(.5, .09, 8, 28, Math.PI * 1.55); cr.rotateZ(.72 * Math.PI); cr.translate(0, 2.65, 0); g.push(flat(cr, 1));
  const st = new THREE.OctahedronGeometry(.14); st.scale(1, 1, .5); st.translate(.28, 2.85, 0); g.push(flat(st, 1));
  const m = mesh(S, merge(g), M.gold, true); return m;
}

/* ------------------------------------------------------------------ 3: ceiling, soko guru, tiered roofs, finial */
function s3(S) {
  const { M, G, R } = S;
  const y0 = PL + WH;
  // soko guru: four teak columns with carved gold bands
  const cgeo = [], gg = [];
  for (const sx of [-1, 1]) for (const z of [-4.1, -.9]) {
    const x = sx * 3.1;
    const c = cyl(.24, .3, 3.75, 16); c.translate(x, PL + .3, z); cgeo.push(shade(c, { lo: .85 }));
    const b = cyl(.5, .6, .3, 8); b.translate(x, PL, z); cgeo.push(shade(b, { lo: .5 }));
    for (const y of [PL + 1.2, PL + 3.2, y0 - .75]) gg.push(flat(new THREE.TorusGeometry(.3, .06, 6, 16).rotateX(Math.PI / 2).translate(x, y, z), 1));
    S.col(x, z, .4);
  }
  const cols = mesh(S, merge(cgeo), M.wood), cgold = mesh(S, merge(gg), M.gold, false);
  G.add(cols, cgold);
  R.add(cols, { delay: .3, dur: .8, kind: 'grow', amp: .12, fx: 'dust', fxOff: V3(0, .2, -2.5) }); R.add(cgold, { delay: .9, dur: .5, kind: 'pop' });
  // tiered roofs
  const tiers = [
    { p: { a0: 7.3, a1: 4.2, h: 1.9, k: 1.3 }, y: y0 - .05, d: 1.1, drum: null },
    { p: { a0: 5.6, a1: 2.4, h: 1.8, k: 1.3 }, y: y0 + 2.4, d: 2.1, drum: { w: 7.6, h: 1.0, y: y0 + 1.6 } },
    { p: { a0: 3.4, a1: .14, h: 2.5, k: 1.3 }, y: y0 + 4.6, d: 3.1, drum: { w: 4.4, h: .9, y: y0 + 3.9 } },
  ];
  // drums with vent windows
  tiers.forEach((t, i) => {
    if (!t.drum) return;
    const d = t.drum, grp = new THREE.Group(); place(grp, 0, d.y, HALL_Z);
    grp.add(mesh(S, shade(uvScale(rbox(d.w, d.h, d.w, .06, 2), d.w / 2, 1), { lo: .75 }), M.plaster));
    const gl = [], gd = [], vg = i === 1 ? [-1.7, 1.7] : [0];
    for (let f = 0; f < 4; f++) for (const u of vg) {
      const pl = archPlane(.9, d.h * .72); pl.translate(u, .12, d.w / 2 + .012);
      const fr = archFrame(.9, d.h * .72, .09, .06); fr.translate(u, .12, d.w / 2 + .012);
      const q = f * Math.PI / 2; const c = Math.cos(q), s = Math.sin(q);
      const rot = (g) => { g.applyMatrix4(new THREE.Matrix4().makeRotationY(q)); return g; };
      gl.push(rot(pl)); gd.push(flat(rot(fr), 1));
    }
    const glass = new THREE.Mesh(GE.mergeGeometries(gl, false), M.glass); grp.add(glass, mesh(S, merge(gd), M.gold, false));
    const tg = rbox(d.w + .35, .16, d.w + .35, .04, 1); tg.translate(0, d.h - .12, 0); grp.add(mesh(S, flat(tg, 1), M.gold, false));
    G.add(grp); R.add(grp, { delay: t.d + .45, dur: .7, kind: 'grow', amp: .12, onLand: () => S.flash(.7) });
  });
  tiers.forEach((t, i) => {
    const g = roofGroup(S, t.p); place(g, 0, t.y, HALL_Z); G.add(g);
    R.add(g, { delay: t.d, dur: 1.15, kind: 'drop', drop: 7 - i, amp: .12 + i * .03, fx: 'dust', fxOff: V3(0, 0, 0), snd: 'pop' });
  });
  const fin = finial(S); place(fin, 0, y0 + 7.1, HALL_Z); G.add(fin);
  R.add(fin, { delay: 4.0, dur: .9, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, 2.6, 0) });
  // veranda lean-to roof
  const vr = roofGroup(S, { a0: 6.9, b0: 2.7, a1: 5.1, b1: .25, h: .75, k: 1.2, N: 6 });
  place(vr, 0, PL + 3.25, 4.3); G.add(vr); R.add(vr, { delay: .6, dur: 1.0, kind: 'drop', drop: 5, fx: 'dust', snd: 'pop' });
  // finishing flourish
  S.finale(V3(0, 11, HALL_Z), 4.3, 'confetti');
}

/* ------------------------------------------------------------------ 4: menara (Kudus-style tiered tower with tajug cap) */
function s4(S) {
  const { M, G, R } = S, { x, z } = MINARET;
  const root = new THREE.Group(); place(root, x, 0, z); G.add(root);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .9, kind: o.kind ?? 'grow', amp: o.amp ?? .12, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  const box = (w, h, y, mat, d, o = {}, lo = .7) => { const g = rbox(w, h, w, .08, 2); g.translate(0, y, 0); uvScale(g, w / 2, h / 2.5); return part(shade(g, { lo, hi: 1, y0: y, y1: y + h }), mat, d, o); };
  const win = (w, h, yc, half, list, fr) => {
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, m4 = new THREE.Matrix4().makeRotationY(a);
      const pl = archPlane(w, h); pl.translate(0, yc - h / 2, half + .012); pl.applyMatrix4(m4); list.push(pl);
      const f = archFrame(w, h, .14, .1); f.translate(0, yc - h / 2, half + .012); f.applyMatrix4(m4); fr.push(flat(f, 1));
    }
  };
  // stepped plinth + brick-like lower tower
  box(5.0, .5, 0, M.stone, 0, { fx: 'dust', snd: 'pop' }, .6);
  box(4.4, .4, .5, M.marble, .12, {}, .8);
  box(3.9, 6.0, .9, M.plasterW, .3, { fx: 'dust' }, .7);
  const gl = [], fr = [];
  win(1.0, 2.0, 3.6, 1.95, gl, fr);
  // first tajug eave
  const r1 = roofGroup(S, { a0: 2.9, a1: 2.0, h: .55, k: 1.2, N: 4 }); r1.position.set(0, 6.8, 0); root.add(r1); R.add(r1, { delay: .9, dur: .8, kind: 'drop', drop: 3, fx: 'dust', snd: 'pop' });
  box(4.1, .5, 6.45, M.arabTeal, 1.0, { kind: 'pop', dur: .5, cast: false }, .9);
  // upper shaft
  box(3.1, 4.6, 7.2, M.plasterW, 1.2, {}, .85);
  win(.8, 1.7, 9.5, 1.55, gl, fr);
  const r2 = roofGroup(S, { a0: 2.45, a1: 1.8, h: .5, k: 1.2, N: 4 }); r2.position.set(0, 11.7, 0); root.add(r2); R.add(r2, { delay: 1.8, dur: .8, kind: 'drop', drop: 3, fx: 'dust', snd: 'pop' });
  // open belfry pavilion (bedug-tower style): four posts, rail and glass
  const posts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = cyl(.17, .19, 2.4, 10); c.translate(sx * 1.2, 11.9, sz * 1.2); posts.push(shade(c, { lo: .8 })); }
  const bm = []; for (const yy of [11.9, 14.15]) for (const s2 of [-1, 1]) { const a1 = rbox(2.8, .2, .24, .03); a1.translate(0, yy, s2 * 1.2); bm.push(a1); const a2 = rbox(.24, .2, 2.8, .03); a2.translate(s2 * 1.2, yy, 0); bm.push(a2); }
  part(merge(posts.concat(bm)), M.wood, 2.2, { amp: .08, fx: 'dust' });
  const lgl = []; for (let k = 0; k < 4; k++) { const pl = archPlane(1.5, 1.7); pl.translate(0, 12.15, 1.2); pl.applyMatrix4(new THREE.Matrix4().makeRotationY(k * Math.PI / 2)); lgl.push(pl); }
  const rails = []; for (let k = 0; k < 4; k++) { const rl = rbox(2.4, .12, .1, .02); rl.translate(0, 12.55, 1.2); rl.applyMatrix4(new THREE.Matrix4().makeRotationY(k * Math.PI / 2)); rails.push(flat(rl, 1)); }
  gl.push(...lgl);
  const gm = new THREE.Mesh(GE.mergeGeometries(gl, false), M.glass); root.add(gm); R.add(gm, { delay: 2.4, dur: .5, kind: 'pop', onLand: () => S.flash(.7) });
  part(merge(fr.concat(rails)), M.gold, 2.4, { dur: .5, kind: 'pop', cast: false });
  const r3 = roofGroup(S, { a0: 2.6, a1: .12, h: 1.9, k: 1.25, N: 6 }); r3.position.set(0, 14.25, 0); root.add(r3);
  R.add(r3, { delay: 2.9, dur: 1.0, kind: 'drop', drop: 5, amp: .13, fx: 'dust', snd: 'pop' });
  const fin = finial(S); fin.scale.setScalar(.8); fin.position.set(0, 16.1, 0); root.add(fin);
  R.add(fin, { delay: 3.9, dur: .8, kind: 'pop', amp: .5, fx: 'sparkle', snd: 'chime', fxOff: V3(0, 1.8, 0) });
  S.col(x, z, 2.6);
  S.finale(V3(x, 15, z), 4.1, 'confetti');
}

/* ------------------------------------------------------------------ 5: wudhu fountain / ablution pavilion */
function s5(S) {
  const { M, G, R } = S, { x, z } = WUDHU;
  const root = new THREE.Group(); place(root, x, 0, z); G.add(root);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); if (o.pos) m.position.set(...o.pos); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .8, kind: o.kind ?? 'grow', amp: o.amp ?? .15, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  const oct = (rt, rb, h, y0 = 0, seg = 8) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1); g.translate(0, y0 + h / 2, 0); return g; };
  // floor slab
  part(shade(uvScale(rbox(5.8, .22, 5.8, .08, 2), 2, 2), { lo: .7 }), M.marble, 0, { fx: 'dust', snd: 'pop' });
  part(shade(uvScale(oct(2.15, 2.2, .45, .22), 6, .5), { lo: .85 }), M.arabTeal, .25, { kind: 'pop', cast: false });
  // octagonal basin
  part(shade(uvScale(oct(1.85, 1.95, .95, .22), 3, 1), { lo: .6 }), M.marble, .3, { fx: 'dust' });
  const rim = flat(new THREE.TorusGeometry(1.76, .09, 6, 8).rotateX(Math.PI / 2).translate(0, 1.08, 0), 1);
  part(rim, M.gold, .55, { kind: 'pop', dur: .4, cast: false });
  const water = mesh(S, new THREE.CylinderGeometry(1.6, 1.6, .05, 8).translate(0, .98, 0), M.water, false, false); water.userData.water = true; root.add(water);
  R.add(water, { delay: .8, dur: .6, kind: 'pop', amp: .1 }); S.waterMat = M.water;
  // central pedestal fountain
  const fp = [[.01, 0], [.55, 0], [.4, .25], [.2, .5], [.2, .8], [.55, 1.05], [.5, 1.15], [.1, 1.12], [.1, 1.4], [.32, 1.62], [.28, 1.7], [.02, 1.66]].map(([r, h]) => new THREE.Vector2(r, h));
  const pg = new THREE.LatheGeometry(fp, 14); pg.translate(0, .95, 0);
  part(shade(pg, { lo: .7 }), M.marble, .9, { kind: 'pop', amp: .35, fx: 'water', fxOff: V3(0, 2.5, 0), snd: 'splash' });
  part(flat(new THREE.SphereGeometry(.14, 10, 8).translate(0, 2.75, 0), 1), M.gold, 1.1, { kind: 'pop', dur: .5 });
  // posts + roof
  const posts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = cyl(.17, .2, 3.0, 12); c.translate(sx * 2.45, .22, sz * 2.45); posts.push(shade(c, { lo: .65 }));
    const b = rbox(.5, .22, .5, .05); b.translate(sx * 2.45, .22, sz * 2.45); posts.push(shade(b, { lo: .6 }));
    S.col(x + sx * 2.45, z + sz * 2.45, .35);
  }
  part(merge(posts), M.wood, 1.2, { amp: .1, fx: 'dust' });
  const roof = roofGroup(S, { a0: 3.4, a1: .12, h: 2.0, k: 1.55, flick: .2, lift: .4, N: 8 });
  roof.position.set(0, 3.25, 0); root.add(roof);
  R.add(roof, { delay: 1.6, dur: 1.0, kind: 'drop', drop: 5, amp: .13, fx: 'dust', snd: 'pop' });
  const fin = finial(S); fin.scale.setScalar(.55); fin.position.set(0, 5.2, 0); root.add(fin);
  R.add(fin, { delay: 2.6, dur: .7, kind: 'pop', amp: .5, fx: 'sparkle', fxOff: V3(0, 1.3, 0) });
  // tap wall (west) with taps + small basins
  const wall = new THREE.Group(); place(wall, -3.5, 0, 0); root.add(wall);
  const wg = [shade(uvScale(rbox(.7, .95, 6.0, .08, 2), 1, 3), { lo: .6 })];
  const wm = mesh(S, merge(wg), M.stone); wall.add(wm); R.add(wall, { delay: 1.3, dur: .8, kind: 'grow', fx: 'dust' });
  const tg = [], bg = [];
  for (let k = 0; k < 5; k++) {
    const zz = -2.2 + k * 1.1;
    const t = new THREE.CylinderGeometry(.045, .05, .3, 8).rotateZ(Math.PI / 2).translate(.45, 1.15, zz); tg.push(flat(t, 1));
    const t2 = new THREE.CylinderGeometry(.03, .03, .16, 8).translate(.6, 1.08, zz); tg.push(flat(t2, 1));
    const knob = new THREE.SphereGeometry(.06, 8, 6).translate(.35, 1.22, zz); tg.push(flat(knob, 1));
    const bs = new THREE.CylinderGeometry(.34, .26, .1, 10).translate(.7, .52, zz); bg.push(shade(bs, { lo: .8 }));
    const stool = rbox(.34, .32, .34, .05); stool.translate(1.35, 0, zz); bg.push(shade(stool, { lo: .6 }));
  }
  wall.add(mesh(S, merge(tg), M.gold, false), mesh(S, merge(bg), M.marble));
  S.col(x - 3.5, z, 2.2); S.col(x - 3.5, z + 2.5, .9); S.col(x - 3.5, z - 2.5, .9); S.col(x, z, 1.9);
  // water droplets (instanced, animated in update)
  const dg = new THREE.SphereGeometry(.05, 6, 5); dg.scale(1, 1.5, 1);
  const NJ = 8 * 3, NT = 5 * 3;
  const di = new THREE.InstancedMesh(dg, M.drop, NJ + NT); di.frustumCulled = false; di.visible = false;
  root.add(di);
  S.droplets = { mesh: di, NJ, NT, root, ready: false };
  R.add(new THREE.Object3D(), { delay: 1.4, dur: .1, onLand: () => { di.visible = true; S.droplets.ready = true; } });
  S.finale(V3(x, 3, z), 3.0, 'confetti');
}

/* ------------------------------------------------------------------ 6: bedug drum pavilion */
function s6(S) {
  const { M, G, R } = S, { x, z } = BEDUG;
  const root = new THREE.Group(); place(root, x, 0, z); G.add(root);
  const part = (geo, mat, d, o = {}) => { const m = mesh(S, geo, mat, o.cast !== false); root.add(m); R.add(m, { delay: d, dur: o.dur ?? .8, kind: o.kind ?? 'grow', amp: o.amp ?? .15, fx: o.fx, fxOff: o.fxOff, snd: o.snd }); return m; };
  part(shade(uvScale(rbox(5.0, .5, 5.0, .08, 2), 3, 3), { lo: .75 }), M.roof, 0, { fx: 'dust', snd: 'pop' });
  part(shade(uvScale(rbox(4.5, .2, 4.5, .05, 2), 2, 2), { lo: .85 }), M.wood, .25, { kind: 'pop', fx: 'dust' });
  const posts = [], gg = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = sx * 1.9, pz = sz * 1.9;
    const c = cyl(.17, .2, 2.85, 12); c.translate(px, .7, pz); posts.push(shade(c, { lo: .65 }));
    const b = rbox(.46, .2, .46, .05); b.translate(px, .5, pz); posts.push(shade(b, { lo: .6 }));
    const cap = rbox(.44, .2, .44, .05); cap.translate(px, 3.4, pz); posts.push(cap);
    gg.push(flat(new THREE.TorusGeometry(.2, .035, 6, 14).rotateX(Math.PI / 2).translate(px, 1.1, pz), 1), flat(new THREE.TorusGeometry(.2, .035, 6, 14).rotateX(Math.PI / 2).translate(px, 3.2, pz), 1));
    S.col(x + px, z + pz, .45);
  }
  part(merge(posts), M.wood, .5, { fx: 'dust' }); part(merge(gg), M.gold, .9, { kind: 'pop', dur: .4, cast: false });
  // cross beams
  const beams = [];
  for (const s of [-1, 1]) { const b1 = rbox(4.2, .26, .26, .04); b1.translate(0, 3.42, s * 1.9); beams.push(shade(b1, { lo: .8 })); const b2 = rbox(.26, .26, 4.2, .04); b2.translate(s * 1.9, 3.42, 0); beams.push(shade(b2, { lo: .8 })); }
  part(merge(beams), M.woodDark, 1.0, { amp: .08 });
  const roof = roofGroup(S, { a0: 3.2, a1: .1, h: 1.9, k: 1.5, flick: .2, lift: .4, N: 8 }); roof.position.set(0, 3.65, 0); root.add(roof);
  R.add(roof, { delay: 1.3, dur: 1.0, kind: 'drop', drop: 5, amp: .13, fx: 'dust', snd: 'pop' });
  const fin = finial(S); fin.scale.setScalar(.6); fin.position.set(0, 5.5, 0); root.add(fin);
  R.add(fin, { delay: 2.3, dur: .7, kind: 'pop', amp: .5, fx: 'sparkle', fxOff: V3(0, 1.4, 0) });
  // the bedug itself (hanging drum, axis along X)
  const drum = new THREE.Group(); drum.position.set(0, 1.95, 0); root.add(drum);
  const body = [], prof = [[.01, -.95], [.42, -.95], [.5, -.8], [.6, -.4], [.64, 0], [.6, .4], [.5, .8], [.42, .95], [.01, .95]].map(([r, h]) => new THREE.Vector2(r, h));
  const lb = new THREE.LatheGeometry(prof, 24); lb.rotateZ(Math.PI / 2); body.push(shade(lb, { lo: .55, hi: 1, y0: -.64, y1: .64 }));
  drum.add(mesh(S, merge(body), M.wood));
  const heads = [], studs = [], hoops = [];
  for (const s of [-1, 1]) {
    const h = new THREE.CylinderGeometry(.42, .42, .04, 28).rotateZ(Math.PI / 2).translate(s * .95, 0, 0); heads.push(flat(h, 1));
    const r = new THREE.TorusGeometry(.44, .045, 8, 28).rotateY(Math.PI / 2).translate(s * .95, 0, 0); hoops.push(flat(r, 1));
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, st = new THREE.SphereGeometry(.04, 6, 5).translate(s * .96, Math.sin(a) * .51, Math.cos(a) * .51); studs.push(flat(st, 1)); }
  }
  for (const xx of [-.45, .45]) hoops.push(flat(new THREE.TorusGeometry(.63, .035, 6, 28).rotateY(Math.PI / 2).translate(xx, 0, 0), 1));
  drum.add(mesh(S, merge(heads), M.hide), mesh(S, merge(studs), M.gold, false), mesh(S, merge(hoops), M.gold, false));
  // hanging ropes + carved cradle
  const rg = [];
  for (const s of [-1, 1]) for (const zz of [-.35, .35]) { const rp = new THREE.CylinderGeometry(.025, .025, 1.35, 5).translate(s * .55, .67 + .62, zz); rg.push(flat(rp, 1)); }
  drum.add(mesh(S, merge(rg), M.woodDark, false));
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.bedug = true; drum.add(hit);
  S.bedug = { drum, hit, pos: V3(x, 1.95, z), t: 99, rings: [] };
  R.add(drum, { delay: 1.8, dur: 1.1, kind: 'drop', drop: 1.6, amp: .3, fx: 'sparkle', snd: 'bedug', fxOff: V3(0, 0, 0) });
  // mallet resting on a post
  const mal = new THREE.Group(); const hd = mesh(S, new THREE.SphereGeometry(.14, 10, 8), M.hideP); const st = mesh(S, new THREE.CylinderGeometry(.03, .035, .9, 8), M.wood); st.position.y = -.45;
  mal.add(hd, st); mal.position.set(1.2, 1.15, 1.7); mal.rotation.set(.35, 0, -.3); mal.traverse(o => o.castShadow = true); root.add(mal); R.add(mal, { delay: 2.4, dur: .5, kind: 'pop' });
  // wave rings for playing
  const rm = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.9, 1.0, 40), rm.clone()); r.visible = false; r.position.set(0, 1.95, 0); root.add(r); S.bedug.rings.push({ m: r, t: 9, life: .8 }); }
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
  const rows = 5, cols = 6, N = rows * cols, inst = new THREE.InstancedMesh(mg, M.sajadah, N); inst.receiveShadow = true;
  const tints = ['#f1e4c7', '#b13a4a', '#e9d7a8', '#c25b3f', '#f4efe0'], mm = new THREE.Matrix4(), c = new THREE.Color();
  let i = 0;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++, i++) {
    const x = (k - 2.5) * 1.55, zz = -6.35 + r * 1.62;
    mm.compose(V3(x, y + .012, zz), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), (rnd() - .5) * .04), V3(1, 1, 1)); inst.setMatrixAt(i, mm);
    c.set(tints[(r + k * 2) % tints.length]); inst.setColorAt(i, c);
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
  lamp.add(mesh(S, flat(new THREE.CylinderGeometry(.012, .012, .5, 4).translate(0, .3, 0), 1), M.gold, false), mesh(S, new THREE.SphereGeometry(.14, 12, 10), M.lantern, false), mesh(S, flat(new THREE.ConeGeometry(.12, .12, 10).translate(0, .22, 0), 1), M.gold, false));
  mh.add(lamp);
  // mini columns
  const mc = []; for (const s of [-1, 1]) { const c1 = cyl(.1, .12, 3.2, 12); c1.translate(s * 1.28, 0, .02); mc.push(shade(c1, { lo: .8 })); const cap = new THREE.SphereGeometry(.15, 10, 8); cap.translate(s * 1.28, 3.22, .02); mc.push(flat(cap, 1)); }
  mh.add(mesh(S, merge(mc), M.gold, false));
  R.add(mh, { delay: .8, dur: .9, kind: 'pop', amp: .15, onLand: () => S.flash(1) });
  // mimbar (pulpit)
  const mb = new THREE.Group(); place(mb, 2.6, PL, -6.3); mb.scale.setScalar(1.3); G.add(mb);
  const pg = [], gg = [];
  const bx = (arr, w, h, d, px, py, pz, r = .04) => { const g = rbox(w, h, d, r, 1); g.translate(px, py, pz); arr.push(arr === gg ? flat(g, 1) : shade(g, { lo: .7 })); };
  bx(pg, .2, 1.8, 2.4, -.55, 0, 0); bx(pg, .2, 1.8, 2.4, .55, 0, 0); bx(pg, 1.3, 1.6, .15, 0, 0, -1.2);
  for (let s = 0; s < 4; s++) bx(pg, 1.1, .1, .4, 0, .2 + s * .32, 1.0 - s * .42, .02);
  bx(pg, 1.1, .12, 1.0, 0, 1.55, -.6, .03);
  for (const sx of [-.5, .5]) for (const sz of [-1.05, -.2]) bx(pg, .1, 1.2, .1, sx, 1.65, sz);
  bx(gg, 1.3, .1, 1.3, 0, 2.75, -.62, .02); bx(gg, 1.1, .1, .1, 0, 2.15, -1.1);
  const cone = new THREE.ConeGeometry(.9, .9, 4).rotateY(Math.PI / 4).translate(0, 3.25, -.62); gg.push(flat(cone, 1));
  gg.push(flat(new THREE.SphereGeometry(.12, 10, 8).translate(0, 3.8, -.62), 1));
  mb.add(mesh(S, merge(pg), M.wood), mesh(S, merge(gg), M.gold, false)); R.add(mb, { delay: 1.3, dur: .8, kind: 'grow', amp: .15, fx: 'dust', fxOff: V3(0, .2, 0) });
  // wall arabesque panels (inside side walls)
  const wp = [];
  for (const s of [-1, 1]) for (const u of [-1.65, 1.65]) {
    const pl = rbox(1.0, 1.0, .06, .02, 1); uvScale(pl, 1, 1); xf(pl, s * 4.96, PL + 2.0, HALL_Z + u + 0, Math.PI / 2); wp.push(flat(pl, 1));
  }
  const panels = mesh(S, merge(wp), M.arabCream, false); G.add(panels); R.add(panels, { delay: 1.6, dur: .5, kind: 'pop' });
  const pfg = []; for (const s of [-1, 1]) for (const u of [-1.65, 1.65]) { const f = new THREE.TorusGeometry(.72, .04, 6, 4).rotateZ(Math.PI / 4).rotateY(Math.PI / 2).translate(s * 4.94, PL + 2.0, HALL_Z + u); pfg.push(flat(f, 1)); }
  const pf = mesh(S, merge(pfg), M.gold, false); G.add(pf); R.add(pf, { delay: 1.7, dur: .5, kind: 'pop' });
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
    cc.push(flat(new THREE.TorusGeometry(.7, .045, 8, 28).rotateX(Math.PI / 2).translate(0, hang, 0), 1));
    cc.push(flat(new THREE.TorusGeometry(.38, .03, 6, 20).rotateX(Math.PI / 2).translate(0, hang + .22, 0), 1));
    cc.push(flat(new THREE.SphereGeometry(.16, 10, 8).translate(0, hang - .22, 0), 1));
    cc.push(flat(new THREE.ConeGeometry(.1, .3, 8).translate(0, hang - .45, 0).rotateX(Math.PI), 1));
    cc.push(flat(new THREE.CylinderGeometry(.12, .05, .18, 8).translate(0, hy + .0, 0), 1));
    const candles = [], flames = [], drops = [];
    for (let j = 0; j < 8; j++) {
      const a = j / 8 * Math.PI * 2, rx = Math.sin(a) * .7, rz = Math.cos(a) * .7;
      candles.push(flat(new THREE.CylinderGeometry(.04, .04, .22, 6).translate(rx, hang + .16, rz), 1));
      flames.push(new THREE.SphereGeometry(.055, 8, 6).scale(1, 1.4, 1).translate(rx, hang + .36, rz));
      drops.push(flat(new THREE.OctahedronGeometry(.07).translate(rx * .9, hang - .2, rz * .9), 1));
    }
    cg.add(mesh(S, merge(cc.concat(drops)), M.gold, false), mesh(S, merge(candles), M.hide, false), new THREE.Mesh(GE.mergeGeometries(flames, false), M.flame));
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
  // hedges / bushes (instanced faceted blobs, colour variety)
  const bg = new THREE.IcosahedronGeometry(1, 1); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (Math.sin(p.getX(i) * 7 + p.getZ(i) * 5) * .08); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .8, p.getZ(i) * k); } bg.computeVertexNormals(); shade(bg, { lo: .6, hi: 1, y0: -.8, y1: .8 }); }
  const bushes = [];
  const addB = (x, z, s) => bushes.push([x, z, s]);
  for (const sx of [-1, 1]) { for (let z = -10; z <= -8; z += 1.4) addB(sx * 9.4, z, .8 + rnd() * .2); addB(sx * 9.3, 8.4, .8); addB(sx * 9.3, 7.0, .65); }
  for (let x = -8; x <= 8; x += 1.8) if (Math.abs(x) > 3.3) addB(x, -11.9, .9 + rnd() * .3);
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) addB(sx * (2.9 + rnd() * .2), 16 + k * 1.9, .65 + rnd() * .15);
  const bi = new THREE.InstancedMesh(bg, M.bush, bushes.length); bi.castShadow = true; bi.receiveShadow = true;
  const greens = ['#3f9a4f', '#4fae4a', '#2f8545', '#62b84f', '#3a8f5e'];
  bushes.forEach(([x, z, s], i) => { mm.compose(V3(x, .6 * s + (x * x + z * z < 190 ? .02 : 0), z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rnd() * 6), V3(s * 1.1, s, s * 1.1)); bi.setMatrixAt(i, mm); c.set(greens[(rnd() * greens.length) | 0]); bi.setColorAt(i, c); });
  G.add(bi); R.addInst(bi, { delayFn: (i, p) => .2 + Math.hypot(p.x, p.z) * .035, dur: .7, kind: 'pop', amp: .5 });
  // flower beds with instanced blossoms
  const beds = [[-6.6, 13.0], [6.6, 13.0], [-12.8, -2.5 + 14], [12.8, 14.5]];
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
    const tube = new THREE.TubeGeometry(cur, 14, .2, 8, false); const p = tube.attributes.position, col = new Float32Array(p.count * 3);
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
  const lpos = [[-1.9, 15.5], [1.9, 15.5], [-1.9, 19.5], [1.9, 19.5], [-9.5, 12], [9.5, 12], [-12.5, -9], [12.5, -9.5]];
  const pole = new THREE.CylinderGeometry(.06, .09, 2.6, 8).translate(0, 1.3, 0); const arm = new THREE.CylinderGeometry(.035, .035, .5, 6).rotateZ(Math.PI / 2).translate(.25, 2.55, 0);
  const pg = merge([flat(pole, 1), flat(arm, 1), flat(new THREE.SphereGeometry(.12, 8, 6).translate(0, 0, 0), 1), flat(new THREE.ConeGeometry(.15, .2, 6).translate(.5, 2.52, 0), 1)]);
  const lanternG = new THREE.CylinderGeometry(.19, .15, .36, 8).translate(.5, 2.25, 0);
  const pi = new THREE.InstancedMesh(pg, M.gold, lpos.length), li = new THREE.InstancedMesh(lanternG, M.lantern, lpos.length);
  pi.castShadow = true;
  lpos.forEach(([x, z], i) => { const ry = Math.atan2(-z, -x) + Math.PI / 2 * 0; mm.compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -Math.atan2(z - 0, x) + Math.PI), V3(1, 1, 1)); pi.setMatrixAt(i, mm); li.setMatrixAt(i, mm); });
  G.add(pi, li); R.addInst(pi, { delayFn: (i) => 2.0 + i * .06, dur: .6, kind: 'grow', amp: .1 }); R.addInst(li, { delayFn: (i) => 2.3 + i * .06, dur: .6, kind: 'pop', amp: .5 });
  S.lanternSpots = lpos;
  S.finale(V3(0, 1.5, 8), 3.5, 'confetti');
}

export const BUILDERS = [null, s1, s2, s3, s4, s5, s6, s7, s8];

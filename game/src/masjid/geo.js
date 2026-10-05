// Geometry helpers: bevelled boxes, arch shapes, curved tajug roof frusta, AO-style vertex shading
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { mergeGeometries };

const V2 = (x, y) => new THREE.Vector2(x, y);

/** Arch outline, origin bottom-centre. Straight sides then a pointed (ogee-ish) arch. Optional offset grows outline. */
export function archPoints(w, h, N = 16, grow = 0) {
  const r = w / 2 + grow, rise = Math.min(h * .5, w * .62), sy = h - rise;
  const pts = [V2(-r, -grow), V2(r, -grow), V2(r, sy)];
  for (let i = 1; i < N; i++) { const th = (i / N) * Math.PI, c = Math.cos(th); pts.push(V2(r * c, sy + rise * (1 - Math.pow(Math.abs(c), 1.55)) + grow)); }
  pts.push(V2(-r, sy));
  return pts;
}
export function archShape(w, h, grow = 0) { return new THREE.Shape(archPoints(w, h, 16, grow)); }
export function archPath(w, h) { const p = new THREE.Path(archPoints(w, h)); return p; }

/** Flat arch-shaped plane with 0..1 UVs (for glass) */
export function archPlane(w, h) {
  const g = new THREE.ShapeGeometry(archShape(w, h), 8);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h);
  return g;
}
/** Arch-shaped frame ring (gold trim), depth along z, centred on z=0 */
export function archFrame(w, h, t = .22, depth = .62) {
  const s = archShape(w, h, t); s.holes.push(archPath(w, h));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -depth / 2); return g;
}

/** Wall panel with arch/rect holes. L along x (0..L centred), H up from 0, thickness T on z (centred). Raw-metre UVs. */
export function wallGeom(L, H, T, holes) {
  const s = new THREE.Shape([V2(-L / 2, 0), V2(L / 2, 0), V2(L / 2, H), V2(-L / 2, H)]);
  for (const h of holes) {
    if (h.arch) { const p = archPoints(h.w, h.h, 14).map(v => v.clone().add(V2(h.u, h.v))); s.holes.push(new THREE.Path(p.reverse())); }
    else s.holes.push(new THREE.Path([V2(h.u - h.w / 2, h.v), V2(h.u - h.w / 2, h.v + h.h), V2(h.u + h.w / 2, h.v + h.h), V2(h.u + h.w / 2, h.v)]));
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: T - .08, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -(T - .08) / 2);
  return g;
}

/** Bevelled box with origin at bottom-centre */
export function rbox(w, h, d, r = .05, seg = 2) {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
  g.translate(0, h / 2, 0); return g;
}
export function cyl(rt, rb, h, seg = 12, open = false) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); g.translate(0, h / 2, 0); return g; }
export function uvScale(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
export function xf(g, x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m); return g;
}

/** Ambient-occlusion-ish vertex darkening: darker toward y0 (ground contact) and slightly toward y1. Optional tint. */
export function shade(g, { lo = .66, hi = 1, y0 = null, y1 = null, tint = null, top = 1, power = 1 } = {}) {
  g.computeBoundingBox(); const bb = g.boundingBox;
  y0 ??= bb.min.y; y1 ??= bb.max.y;
  const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3);
  const tc = tint ? new THREE.Color(tint) : new THREE.Color(1, 1, 1);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) - y0) / Math.max(1e-4, y1 - y0), 0, 1);
    let f = lo + (hi - lo) * Math.pow(t, power);
    if (n && n.getY(i) > .7) f *= top; // top faces catch light
    col[i * 3] = f * tc.r; col[i * 3 + 1] = f * tc.g; col[i * 3 + 2] = f * tc.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export function flat(g, c = 1) { // plain colour attr
  const col = new Float32Array(g.attributes.position.count * 3).fill(c); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export function ensureColor(g) { if (!g.attributes.color) flat(g); return g; }
export function merge(list) { list.forEach(ensureColor); return mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g), false); }

/**
 * Curved tajug roof frustum, local origin at centre of eave line (y=0 eave, y=h top).
 * Concave swoop with upturned corners. Returns { tiles, wood, trim, ridge } geometries.
 */
export function tajugRoof({ a0, b0 = a0, a1 = .15, b1 = a1, h, k = 1.25, flick = .12, lift = .2, tile = 1.7, N = 9, M = 8, ridgeR = .13 }) {
  const Y = (t, xn) => h * Math.pow(t, k) + flick * Math.pow(1 - t, 4) + lift * Math.pow(xn, 5) * Math.pow(1 - t, 1.6);
  const faces = [];
  const faceDefs = [
    { sx: 1, ax: 'z', dir: 1 }, { sx: -1, ax: 'z', dir: -1 }, { sx: 1, ax: 'x', dir: 1 }, { sx: -1, ax: 'x', dir: -1 }];
  for (const f of faceDefs) {
    const pos = [], uv = [], idx = [], col = [];
    let vlen = 0, prev = null;
    for (let s = 0; s <= N; s++) {
      const t = s / N, A = a0 + (a1 - a0) * t, B = b0 + (b1 - b0) * t;
      const half = f.ax === 'z' ? A : B, off = f.ax === 'z' ? B : A;
      const pts = [];
      for (let i = 0; i <= M; i++) {
        const u = -half + (2 * half) * (i / M), xn = Math.abs(u) / half;
        const y = Y(t, xn);
        const p = f.ax === 'z' ? [u, y, off * f.dir] : [off * f.dir, y, u * (f.dir)];
        pts.push(p);
      }
      if (prev) vlen += Math.hypot(pts[M >> 1][0] - prev[M >> 1][0], pts[M >> 1][1] - prev[M >> 1][1], pts[M >> 1][2] - prev[M >> 1][2]);
      for (let i = 0; i <= M; i++) {
        pos.push(...pts[i]); uv.push((i / M) * (2 * (f.ax === 'z' ? a0 : b0)) / tile, vlen / tile);
        const c = .72 + .28 * Math.min(1, t * 1.6); col.push(c, c, c);
      }
      prev = pts;
    }
    for (let s = 0; s < N; s++) for (let i = 0; i < M; i++) {
      const a = s * (M + 1) + i, b = a + 1, c = a + M + 1, d = c + 1;
      // outward winding depends on face
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    // ensure normals point outward/up
    const nrm = g.attributes.normal; if (nrm.getY((N >> 1) * (M + 1) + (M >> 1)) < 0) { const r = []; for (let q = 0; q < idx.length; q += 3) r.push(idx[q], idx[q + 2], idx[q + 1]); g.setIndex(r); g.computeVertexNormals(); }
    faces.push(g.toNonIndexed());
  }
  const tiles = mergeGeometries(faces, false);
  // hip ridges follow corners
  const rid = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const pts = [];
    for (let s = 0; s <= N; s++) { const t = s / N; pts.push(new THREE.Vector3(sx * (a0 + (a1 - a0) * t), Y(t, 1) + ridgeR * .55, sz * (b0 + (b1 - b0) * t))); }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, ridgeR, 6, false);
    flat(tube, 1);
    const cap = new THREE.SphereGeometry(ridgeR * 1.45, 8, 6); cap.translate(pts[0].x, pts[0].y + .02, pts[0].z); flat(cap, 1);
    rid.push(tube, cap);
  }
  const ridge = merge(rid);
  // fascia (wood) + trim (gold) + soffit
  const wood = [], trim = [], T = .2, Hh = .26, y = -.04;
  const bx = (arr, w, hh, d, x, yy, z, r = .05) => { const g = rbox(w, hh, d, r); g.translate(x, yy, z); arr.push(shade(g, { lo: .7, hi: 1 })); };
  bx(wood, 2 * a0 + T, Hh, T, 0, y - Hh + .12, b0); bx(wood, 2 * a0 + T, Hh, T, 0, y - Hh + .12, -b0);
  bx(wood, T, Hh, 2 * b0 + T, a0, y - Hh + .12, 0); bx(wood, T, Hh, 2 * b0 + T, -a0, y - Hh + .12, 0);
  const tz = .11;
  bx(trim, 2 * a0 + T + .08, tz, T + .06, 0, y - Hh + .1, b0, .02); bx(trim, 2 * a0 + T + .08, tz, T + .06, 0, y - Hh + .1, -b0, .02);
  bx(trim, T + .06, tz, 2 * b0 + T + .08, a0, y - Hh + .1, 0, .02); bx(trim, T + .06, tz, 2 * b0 + T + .08, -a0, y - Hh + .1, 0, .02);
  // little gold corner finials (tips)
  const soffitS = new THREE.Shape([V2(-a0, -b0), V2(a0, -b0), V2(a0, b0), V2(-a0, b0)]);
  const ia = Math.max(.1, a0 * .3), ib = Math.max(.1, b0 * .3);
  const soffit = new THREE.ShapeGeometry(soffitS); soffit.rotateX(Math.PI / 2); soffit.translate(0, y - .02, 0);
  uvScale(soffit, .5, .5); flat(soffit, .8);
  return { tiles, ridge, wood: merge(wood), trim: merge(trim), soffit, Y };
}

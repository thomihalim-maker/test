// Stage-0 construction site ("Calon Masjid") + pulsing build marker. Each removable set is merged per material
// (wood / paint / sign) so the whole site costs ~6 draw calls, the marker 2.
import * as THREE from 'three';
import { rnd } from './tex.js';
import { rbox, merge, flat, shade as shadeGeo } from './geo.js';
import { PL, MINARET, WUDHU, BEDUG } from './stages.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function tint(g, hex, jit = .06) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3), k = 1 - jit + rnd() * jit * 2;
  for (let i = 0; i < n; i++) { col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
// AO shading that keeps (multiplies) an existing tint
function shade(g, o) { const prev = g.attributes.color?.array.slice(); shadeGeo(g, o); if (prev) { const a = g.attributes.color.array; for (let i = 0; i < a.length; i++) a[i] *= prev[i]; } return g; }
const xfm = (g, x, y, z, ry = 0, rx = 0, rz = 0) => { g.applyMatrix4(new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V3(1, 1, 1))); return g; };
function barG(a, b, r, seg = 6) { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, seg); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; }

// where the NEXT stage gets built (index = next stage number)
const MARK = [null, [0, 1.5], [0, 6.5], [0, 6.5], [MINARET.x + 2.6, MINARET.z + 2.6], [WUDHU.x + 2.6, WUDHU.z + 2.4], [BEDUG.x - 2.6, BEDUG.z + 2.6], [0, .5], [0, 13]];

export function createSite(ctx, M, parent, api) {
  const root = new THREE.Group(); root.name = 'masjid-site'; parent.add(root);
  const sets = [];
  function addSet(until, parts, cols, fx) {
    if (api.stage >= until) return;
    const g = new THREE.Group(); root.add(g);
    for (const [mat, list, cast] of parts) if (list.length) { const m = new THREE.Mesh(merge(list), mat); m.castShadow = cast !== false; m.receiveShadow = true; g.add(m); }
    const c = cols.map(([x, z, r]) => { const o = { x, z, r, masjid: true }; ctx.colliders.push(o); return o; });
    sets.push({ until, g, c, fx, t: -1 });
  }

  // --- A: staked string outline of the plinth + hall footprint (until stage 1)
  {
    const wood = [], paint = [];
    const stake = (x, z, flag) => {
      wood.push(shade(xfm(rbox(.09, .75, .09, .02, 1), x, 0, z), { lo: .6 }));
      const tip = new THREE.ConeGeometry(.06, .12, 4); tip.rotateX(Math.PI); wood.push(flat(xfm(tip, x, -.04, z), .7));
      if (flag) paint.push(tint(xfm(new THREE.PlaneGeometry(.28, .18).translate(.14, 0, 0), x + .04, .64, z, rnd() * 6), '#ff6a3d'));
    };
    const line = (pts, closed, y = .55, hex = '#fff3e0') => {
      for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        paint.push(tint(barG(V3(a[0], y, a[1]), V3(b[0], y - .03, b[1]), .014, 4), hex, 0));
      }
    };
    const loop = (x0, z0, x1, z1, step, flagCorners) => {
      const pts = []; const L = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      for (let i = 0; i < 4; i++) {
        const a = L[i], b = L[(i + 1) % 4], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
        for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
      }
      pts.forEach((p, i) => stake(p[0], p[1], flagCorners && L.some(c => c[0] === p[0] && c[1] === p[1])));
      return pts;
    };
    line(loop(-8.8, -11, 8.8, 9, 4.4, true), true);
    line(loop(-5.5, -8, 5.5, 2.5, 5.5, true), true, .4, '#ffb347');
    // chalk centre cross on the ground
    paint.push(tint(xfm(rbox(3.0, .015, .12, .005, 1), 0, .01, -2.75), '#ffffff', 0), tint(xfm(rbox(.12, .015, 3.0, .005, 1), 0, .01, -2.75), '#ffffff', 0));
    addSet(1, [[M.wood, wood], [M.paint, paint, false]], [], [V3(0, .3, 9), V3(8.8, .3, -1), V3(-8.8, .3, -1), V3(0, .3, -11)]);
  }

  // --- B: building materials, wheelbarrow and tarp tent beside the plaza (until stage 3)
  {
    const wood = [], paint = [];
    // brick pallet
    const bx = -11.2, bz = 2.6;
    wood.push(shade(xfm(rbox(1.5, .14, 1.1, .02, 1), bx, 0, bz), { lo: .7 }));
    for (let l = 0; l < 4; l++) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      if (l === 3 && (i + j) % 2) continue;
      const g = rbox(.33, .14, .24, .02, 1);
      paint.push(shade(tint(xfm(g, bx - .53 + i * .35 + (l % 2 ? .04 : 0), .14 + l * .145, bz - .28 + j * .27, (rnd() - .5) * .08), ['#c4532e', '#b24826', '#d0643a'][(rnd() * 3) | 0], .08), { lo: .8 }));
    }
    // timber stack on two sleepers
    const tx = -11.7, tz = 6.0, tr = .35;
    for (const o of [-.9, .9]) wood.push(shade(xfm(rbox(.2, .16, 1.3, .03, 1), tx + Math.cos(tr) * o, 0, tz - Math.sin(tr) * o, tr), { lo: .6 }));
    for (let l = 0; l < 3; l++) for (let k = 0; k < 4 - l; k++) wood.push(shade(xfm(rbox(2.7, .13, .26, .03, 1), tx + Math.sin(tr) * (k - (3 - l) / 2) * .3, .16 + l * .135, tz + Math.cos(tr) * (k - (3 - l) / 2) * .3, tr), { lo: .75 }));
    // bamboo bundle lying on the ground
    for (let k = 0; k < 11; k++) {
      const ox = (k % 4) * .1 - .15, oy = .06 + Math.floor(k / 4) * .09;
      const a = V3(-12.6 + ox * .3, oy, 9.0 + ox), b = V3(-9.0 + ox * .3, oy + .02, 10.0 + ox);
      paint.push(tint(barG(a, b, .05, 7), k % 3 ? '#c9b25a' : '#9fb050', .06));
      for (let q = 1; q < 5; q++) paint.push(tint(barG(a.clone().lerp(b, q / 5), a.clone().lerp(b, q / 5 + .012), .058, 7), '#8a7a3a', 0));
    }
    // ropes tying the bundle
    for (const t of [.25, .75]) { const p = V3(-12.6, .15, 9.0).lerp(V3(-9.0, .15, 10.0), t); paint.push(tint(xfm(new THREE.TorusGeometry(.2, .025, 5, 12), p.x, p.y, p.z, -0.27 + Math.PI / 2), '#e8d2a0', 0)); }
    // sand pile + shovel
    { const sp = new THREE.SphereGeometry(1.15, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); const p = sp.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 4 + p.getZ(i) * 3) * .06; p.setXYZ(i, p.getX(i) * k, p.getY(i) * .5 * k, p.getZ(i) * k); }
      sp.computeVertexNormals(); paint.push(shade(tint(xfm(sp, -12.5, 0, -.9), '#e3c27e', 0), { lo: .75 }));
      wood.push(flat(barG(V3(-12.3, .35, -.8), V3(-11.6, 1.5, -.3), .03), .9));
      paint.push(tint(xfm(rbox(.28, .34, .03, .01, 1), -12.38, .12, -.86, .6, .5), '#8a9198', 0)); }
    // wheelbarrow
    { const wx = -9.95, wz = .4, ry = .9;
      const wb = [], wbw = [];
      const tray = rbox(.75, .32, 1.0, .06, 2); wb.push(tint(xfm(tray, 0, .42, 0, 0, .1), '#2f8a6e', .02));
      wb.push(tint(xfm(new THREE.CylinderGeometry(.22, .22, .09, 16).rotateZ(Math.PI / 2), 0, .22, .68), '#333a40', 0));
      wb.push(tint(xfm(new THREE.CylinderGeometry(.07, .07, .11, 10).rotateZ(Math.PI / 2), 0, .22, .68), '#d9a640', 0));
      for (const s of [-1, 1]) { wbw.push(flat(barG(V3(s * .28, .3, .68), V3(s * .33, .55, -1.05), .03), 1)); wbw.push(flat(barG(V3(s * .28, .4, -.3), V3(s * .3, 0, -.38), .025), 1)); }
      const m4 = new THREE.Matrix4().compose(V3(wx, 0, wz), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), V3(1, 1, 1));
      wb.forEach(g => { g.applyMatrix4(m4); paint.push(g); }); wbw.forEach(g => { g.applyMatrix4(m4); wood.push(g); }); }
    // tarp tent (ridge) with poles + crate
    { const cx = -12.3, cz = -6.4, w = 2.6, half = 1.25, hgt = 1.75, ang = Math.atan2(hgt, half), L = Math.hypot(half, hgt);
      for (const s of [-1, 1]) {
        const pp = new THREE.BoxGeometry(w, .035, L); pp.translate(0, 0, L / 2);
        pp.applyMatrix4(new THREE.Matrix4().makeRotationX(ang).premultiply(new THREE.Matrix4().makeRotationY(s > 0 ? 0 : Math.PI)));
        pp.translate(cx, hgt, cz); paint.push(shade(tint(pp, '#3f7fc4', 0), { lo: .7, y0: 0, y1: hgt }));
      }
      for (const s of [-1, 1]) wood.push(flat(barG(V3(cx + s * w / 2, 0, cz), V3(cx + s * w / 2, hgt + .1, cz), .04), 1));
      wood.push(flat(barG(V3(cx - w / 2 - .1, hgt + .05, cz), V3(cx + w / 2 + .1, hgt + .05, cz), .035), 1));
      for (const s of [-1, 1]) paint.push(tint(barG(V3(cx + s * (w / 2 + .05), hgt, cz), V3(cx + s * (w / 2 + .9), 0, cz + s * .2), .012, 4), '#e8d2a0', 0));
      wood.push(shade(xfm(rbox(.6, .45, .5, .03, 1), cx + .4, 0, cz + .1, .3), { lo: .6 })); }
    addSet(3, [[M.wood, wood], [M.paint, paint]], [[-11.2, 2.6, .9], [-11.7, 6.0, 1.3], [-12.5, -.9, 1.1], [-9.95, .4, .6], [-12.3, -6.4, 1.5], [-10.8, 9.5, .7]],
      [V3(-11.2, .4, 2.6), V3(-11.7, .4, 6), V3(-12.5, .4, -.9), V3(-12.3, .6, -6.4)]);
  }

  // --- D: chunky material piles in view of the spawn (until stage 3): brick stacks, sirap bundles, teak logs
  {
    const wood = [], paint = [];
    for (const [px, pz, ry] of [[7.6, 2.4, .2], [8.9, .6, -.3]]) {
      const m4 = new THREE.Matrix4().compose(V3(px, 0, pz), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), V3(1, 1, 1));
      const loc = [];
      loc.push(['w', shade(rbox(1.7, .16, 1.2, .03, 1), { lo: .7 })]);
      for (let l = 0; l < 3; l++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        if (l === 2 && (i + j) % 2) continue;
        const g = rbox(.5, .24, .34, .03, 1); g.translate(-.53 + i * .53 + (l % 2 ? .05 : 0), .16 + l * .25, -.37 + j * .37); g.rotateY((rnd() - .5) * .06);
        loc.push(['p', shade(tint(g, ['#c4532e', '#b24826', '#d0643a', '#bf5a34'][(rnd() * 4) | 0], .06), { lo: .78 })]);
      }
      for (const [k, g] of loc) { g.applyMatrix4(m4); (k === 'w' ? wood : paint).push(g); }
    }
    // sirap shingle bundles tied with rope
    for (const [px, pz] of [[-6.6, 9.4], [-7.5, 10.2], [-6.9, 10.9]]) {
      const ry = rnd() * 3;
      for (let k = 0; k < 9; k++) { const g = rbox(.62, .045, .3, .01, 1); g.translate(0, .023 + k * .046, 0); g.rotateY(ry + (rnd() - .5) * .12); g.translate(px, 0, pz); paint.push(tint(g, ['#b08458', '#9a7350', '#c09060'][k % 3], .05)); }
      const r = new THREE.TorusGeometry(.2, .022, 4, 10); r.scale(1.6, 1, 1); r.rotateY(ry); r.translate(px, .22, pz); paint.push(tint(r, '#e8d2a0', 0));
    }
    // teak logs
    { const lx = 8.4, lz = -4.6;
      for (const [o, y] of [[-.5, .24], [0, .24], [.5, .24], [-.25, .66], [.25, .66]]) { const g = new THREE.CylinderGeometry(.24, .26, 3.2, 9); g.rotateX(Math.PI / 2); g.translate(lx + o, y, lz); wood.push(shade(g, { lo: .7, y0: 0, y1: .9 })); const e = new THREE.CylinderGeometry(.2, .2, .02, 9); e.rotateX(Math.PI / 2); e.translate(lx + o, y, lz + 1.61); paint.push(tint(e, '#d9a86a', 0)); }
      for (const s2 of [-1, 1]) wood.push(flat(barG(V3(lx - .85, 0, lz + s2 * 1.2), V3(lx - .85, .8, lz + s2 * 1.2), .06), .9), flat(barG(V3(lx + .85, 0, lz + s2 * 1.2), V3(lx + .85, .8, lz + s2 * 1.2), .06), .9)); }
    addSet(3, [[M.wood, wood], [M.paint, paint]], [[7.6, 2.4, 1.0], [8.9, .6, 1.0], [-6.9, 10.1, .8], [8.4, -4.6, 1.3], [8.4, -3.4, 1.0], [8.4, -5.8, 1.0]],
      [V3(7.6, .5, 2.4), V3(-6.9, .3, 10.1), V3(8.4, .5, -4.6)]);
  }

  // --- E: blueprint ghost of the finished masjid (stage 0 only): translucent volumes + bright edges, gently pulsing
  const ghostFill = new THREE.MeshBasicMaterial({ color: 0x6cc4ff, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
  const ghostLine = new THREE.LineBasicMaterial({ color: 0xa8e0ff, transparent: true, opacity: .55, depthWrite: false });
  const ghost = new THREE.Group(); ghost.name = 'masjid-blueprint';
  {
    const parts = [];
    const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); parts.push(g.toNonIndexed()); };
    const pyr = (a0, a1, h, y, z, x = 0) => { const g = new THREE.CylinderGeometry(a1 * Math.SQRT2, a0 * Math.SQRT2, h, 4, 1); g.rotateY(Math.PI / 4); g.translate(x, y + h / 2, z); parts.push(g.toNonIndexed()); };
    box(17.6, PL, 20, 0, 0, -1); const nPlinth = parts.length; box(11, 4.4, 10.5, 0, PL, -2.75);
    pyr(7.6, 4.0, 2.1, 5.05, -2.75); box(7.2, .95, 7.2, 0, 6.9, -2.75); pyr(5.0, 2.45, 2.1, 7.75, -2.75); box(4.4, .75, 4.4, 0, 9.45, -2.75); pyr(3.0, .08, 3.3, 10.1, -2.75);
    box(3.4, 9.5, 3.4, MINARET.x, 0, MINARET.z); pyr(2.95, .06, 2.4, 11.7, MINARET.z, MINARET.x);
    parts.forEach(g => g.deleteAttribute('uv'));
    const merged = merge(parts), upper = merge(parts.slice(nPlinth).map(g => g.clone()));
    const fillM = new THREE.Mesh(upper, ghostFill); fillM.renderOrder = 3; // no fill on the plinth: it would haze the whole ground view
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(merged, 25), ghostLine); lines.renderOrder = 3;
    ghost.add(fillM, lines);
    parent.add(ghost);
  }
  let ghostVis = api.stage === 0 ? 1 : 0;

  // --- C: signboard "Calon Masjid" (until stage 2)
  {
    const wood = [], sign = [];
    const sx = -4.6, sz = 13.4, ry = .5, m4 = new THREE.Matrix4().compose(V3(sx, 0, sz), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), V3(1, 1, 1));
    const loc = [];
    for (const s of [-1, 1]) loc.push(shade(xfm(rbox(.12, 2.3, .12, .03, 1), s * 1.05, 0, 0), { lo: .55 }));
    loc.push(shade(xfm(rbox(2.5, 1.32, .1, .04, 2), 0, .95, -.02), { lo: .8 }));
    loc.push(shade(xfm(rbox(2.7, .12, .2, .03, 1), 0, 2.27, 0), { lo: .9 }));
    loc.forEach(g => { g.applyMatrix4(m4); wood.push(g); });
    const face = new THREE.PlaneGeometry(2.3, 1.15); face.translate(0, 1.61, .036); face.applyMatrix4(m4); sign.push(face);
    addSet(2, [[M.wood, wood], [M.sign, sign]], [], [V3(sx, 1.4, sz)]);
  }

  // --- build marker: saturated gold ring decal with a dark rim, soft gold column, floating hammer icon, periodic sparkles
  const gold = new THREE.MeshBasicMaterial({ color: 0xffb81c, vertexColors: true, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const rgba = (g, fn, rgb = [1, 1, 1]) => { const p = g.attributes.position, c = new Float32Array(p.count * 4); for (let i = 0; i < p.count; i++) { const [r, gg, b] = typeof rgb === 'function' ? rgb(p.getX(i), p.getY(i), p.getZ(i)) : rgb; c[i * 4] = r; c[i * 4 + 1] = gg; c[i * 4 + 2] = b; c[i * 4 + 3] = fn(p.getX(i), p.getY(i), p.getZ(i)); } g.setAttribute('color', new THREE.BufferAttribute(c, 4)); return g.index ? g.toNonIndexed() : g; };
  const DK = [.28, .14, .02];
  const rim = rgba(new THREE.RingGeometry(2.05, 2.35, 48, 1).rotateX(-Math.PI / 2), () => .75, DK);
  const ring = rgba(new THREE.RingGeometry(1.6, 2.05, 48, 1).rotateX(-Math.PI / 2).translate(0, .005, 0), () => 1);
  const inner = rgba(new THREE.RingGeometry(1.32, 1.6, 48, 1).rotateX(-Math.PI / 2).translate(0, .005, 0), () => .75, DK);
  const disc = rgba(new THREE.CircleGeometry(1.32, 48).rotateX(-Math.PI / 2).translate(0, .004, 0), (x, y, z) => .12 + .3 * Math.hypot(x, z) / 1.32);
  const ticks = []; for (let k = 0; k < 8; k++) { const t = new THREE.PlaneGeometry(.22, .5).rotateX(-Math.PI / 2).translate(0, .008, 1.83); t.rotateY(k * Math.PI / 4); ticks.push(rgba(t, () => 1, DK)); }
  const column = rgba(new THREE.CylinderGeometry(1.7, 1.8, 2.6, 32, 3, true).translate(0, 1.3, 0), (x, y) => .32 * Math.pow(1 - y / 2.6, 2));
  const markerMesh = new THREE.Mesh(merge([rim, ring, inner, disc, column, ...ticks]), gold); markerMesh.renderOrder = 2;
  // hammer icon (gold head, teak handle) floating above
  const hammerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .3, emissive: 0x5a3200, emissiveIntensity: .6 });
  const hh = new THREE.BoxGeometry(.9, .36, .36); hh.translate(0, .55, 0); tint(hh, '#ffc22a', 0);
  const hf = new THREE.BoxGeometry(.2, .3, .3); hf.translate(.52, .55, 0); tint(hf, '#d99a10', 0);
  const hs = new THREE.CylinderGeometry(.09, .1, 1.2, 8); hs.translate(0, -.15, 0); tint(hs, '#9a6234', 0);
  const arrow = new THREE.Mesh(merge([hh, hf, hs]), hammerMat); arrow.rotation.z = .5;
  const hammerPivot = new THREE.Group(); hammerPivot.add(arrow);
  const marker = new THREE.Group(); marker.add(markerMesh, hammerPivot); marker.name = 'masjid-build-marker'; parent.add(marker);
  let sparkT = 0;
  const markPos = V3(0, 0, 0); let markVis = 0;
  ctx.interactables ??= [];
  ctx.interactables.push({ kind: 'build', get label() { return api.lang() ? 'Build' : 'Bangun'; }, icon: 'hammer', pos: markPos, r: 2.4, priority: .5, enabled: () => marker.visible && markVis > .5 });
  ctx.on('interact', d => {
    if (d?.kind !== 'build' || !marker.visible) return;
    const ui = ctx.modules.ui;
    if (typeof ui?.openPanel === 'function') ui.openPanel('build'); else api.place();
  });

  return {
    update(dt, t) {
      const st = api.stage;
      // remove finished sets with a squash-out + dust
      for (const s of sets) {
        if (s.t < 0 && st >= s.until) { s.t = 0; for (const p of s.fx) ctx.modules.fx?.burst?.('dust', p.clone()); ctx.colliders.splice(0, ctx.colliders.length, ...ctx.colliders.filter(c => !s.c.includes(c))); }
        if (s.t >= 0 && s.g.parent) {
          s.t += dt; const u = Math.min(1, s.t / .55);
          const k = u < .3 ? 1 + .08 * Math.sin(u / .3 * Math.PI) : Math.max(0, 1 - (u - .3) / .7);
          s.g.scale.set(1, k * k, 1); // collapse into the ground
          if (u >= 1) { root.remove(s.g); s.g.traverse(o => o.geometry?.dispose()); }
        }
      }
      // blueprint ghost: fades out once the foundation is placed
      ghostVis += ((st === 0 ? 1 : 0) - ghostVis) * Math.min(1, dt * 2);
      ghost.visible = ghostVis > .01;
      if (ghost.visible) { const pz = .5 + .5 * Math.sin(t * 1.6); ghostFill.opacity = (.04 + .04 * pz) * ghostVis; ghostLine.opacity = (.3 + .25 * pz) * ghostVis; }
      // marker
      const next = st + 1, show = next < MARK.length && !api.building;
      markVis += ((show ? 1 : 0) - markVis) * Math.min(1, dt * 4);
      marker.visible = markVis > .02;
      if (next < MARK.length) {
        const [mx, mz] = MARK[next];
        markPos.set(mx, ctx.groundHeight(mx, mz), mz);
        marker.position.lerp(markPos, marker.visible && markVis > .9 ? Math.min(1, dt * 3) : 1);
      }
      if (marker.visible) {
        const p = 1 + Math.sin(t * 3.2) * .05;
        markerMesh.scale.set(p * markVis, markVis, p * markVis); markerMesh.rotation.y = t * .3;
        hammerPivot.position.y = 3.0 + Math.sin(t * 3) * .2; hammerPivot.rotation.y = t * 1.4; hammerPivot.scale.setScalar(markVis);
        arrow.rotation.z = .5 + Math.max(0, Math.sin(t * 5)) * .5; // little tapping motion
        gold.opacity = (.85 + Math.sin(t * 3.2) * .15) * markVis;
        if (api.canAfford()) gold.color.setHex(0xffb81c); else gold.color.setHex(0x4fb6e8);
        sparkT -= dt; if (sparkT <= 0 && markVis > .9) { sparkT = 2.6; ctx.modules.fx?.burst?.('sparkle', marker.position.clone().add(V3(0, 2.4, 0)), 4); }
      }
    },
    root, marker,
  };
}

// --- prayer / care markers: pulsing teal-gold ground rings + soft light beam with a floating gem, at masjid.spot(name).
// Two InstancedMeshes shared by every marker (max 4 at once => at most 2 draw calls; hidden entirely when none are on).
const MARK_COLORS = { adzan: '#ffc83d', imam: '#3fd6c4', kentongan: '#ff9f43', bedug: '#ffb81c', mihrab: '#3fd6c4' };
export function createMarkers(ctx, parent, spotFn) {
  const MAX = 4;
  const rgba = (g, fn, rgb = [1, 1, 1]) => { g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position, c = new Float32Array(p.count * 4); for (let i = 0; i < p.count; i++) { const v = typeof rgb === 'function' ? rgb(p.getX(i), p.getY(i), p.getZ(i)) : rgb; c[i * 4] = v[0]; c[i * 4 + 1] = v[1]; c[i * 4 + 2] = v[2]; c[i * 4 + 3] = fn(p.getX(i), p.getY(i), p.getZ(i)); } g.setAttribute('color', new THREE.BufferAttribute(c, 4)); return g; };
  const DK = [.3, .2, .08], WH = [1.25, 1.25, 1.25];
  const ringParts = [
    rgba(new THREE.RingGeometry(.98, 1.12, 40, 1).rotateX(-Math.PI / 2), () => .6, DK),
    rgba(new THREE.RingGeometry(.74, .98, 40, 1).rotateX(-Math.PI / 2).translate(0, .004, 0), () => 1, WH),
    rgba(new THREE.RingGeometry(.62, .74, 40, 1).rotateX(-Math.PI / 2).translate(0, .004, 0), () => .55, DK),
    rgba(new THREE.CircleGeometry(.62, 40).rotateX(-Math.PI / 2).translate(0, .003, 0), (x, y, z) => .1 + .3 * Math.hypot(x, z) / .62),
  ];
  for (let k = 0; k < 6; k++) { const t = new THREE.PlaneGeometry(.12, .3).rotateX(-Math.PI / 2).translate(0, .007, .86); t.rotateY(k * Math.PI / 3); ringParts.push(rgba(t, () => 1, DK)); }
  const ringGeo = merge(ringParts);
  const gem = new THREE.OctahedronGeometry(.24, 0); gem.scale(1, 1.45, 1); gem.translate(0, 3.25, 0);
  const beamGeo = merge([rgba(new THREE.CylinderGeometry(.74, .84, 2.8, 28, 4, true).translate(0, 1.4, 0), (x, y) => .3 * Math.pow(1 - y / 2.8, 2)), rgba(gem, () => 1, WH)]);
  const mat = (o) => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, ...o });
  const ringMat = mat({ polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), beamMat = mat({});
  const ring = new THREE.InstancedMesh(ringGeo, ringMat, MAX), beam = new THREE.InstancedMesh(beamGeo, beamMat, MAX);
  for (const m of [ring, beam]) { m.count = 0; m.visible = false; m.frustumCulled = false; m.renderOrder = 2; m.castShadow = m.receiveShadow = false; m.setColorAt(0, new THREE.Color(1, 1, 1)); parent.add(m); }
  ring.name = 'masjid-marker-rings'; beam.name = 'masjid-marker-beams';
  const list = new Map(); // name -> {on, k, color, ph}
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function set(name, on, o = {}) {
    name = String(name); let m = list.get(name);
    if (!m) { if (!on) return false; m = { on: false, k: 0, color: new THREE.Color(), ph: list.size * 1.7 }; list.set(name, m); }
    m.on = !!on; m.color.set(o.color ?? MARK_COLORS[name] ?? '#ffd27a');
    if (on && [...list.values()].filter(x => x.on).length > MAX) { m.on = false; return false; }
    return true;
  }
  function update(dt, t) {
    let n = 0;
    for (const [name, m] of list) {
      m.k += ((m.on ? 1 : 0) - m.k) * Math.min(1, dt * 5);
      if (!m.on && m.k < .01) { list.delete(name); continue; }
      const sp = spotFn(name); if (!sp || n >= MAX) continue;
      const pulse = 1 + Math.sin(t * 3.2 + m.ph) * .07, k = m.k * (m.on ? 1 : m.k);
      _p.set(sp.x, (sp.y ?? 0) + .02, sp.z); _q.setFromAxisAngle(_up, t * .45 + m.ph); _s.set(k * pulse, 1, k * pulse);
      _m.compose(_p, _q, _s); ring.setMatrixAt(n, _m); ring.setColorAt(n, m.color);
      _p.y += Math.sin(t * 2.4 + m.ph) * .06; _q.setFromAxisAngle(_up, t * 1.3 + m.ph); _s.set(k, k * (.96 + .04 * Math.sin(t * 3 + m.ph)), k);
      _m.compose(_p, _q, _s); beam.setMatrixAt(n, _m); beam.setColorAt(n, m.color);
      n++;
    }
    ring.count = beam.count = n; ring.visible = beam.visible = n > 0;
    if (n) { for (const m of [ring, beam]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } ringMat.opacity = .82 + .18 * Math.sin(t * 3.2); beamMat.opacity = .75 + .25 * Math.sin(t * 2.1); }
  }
  return { set, update, get active() { return [...list].filter(([, m]) => m.on).map(([n]) => n); }, ring, beam };
}

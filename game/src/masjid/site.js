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

  // --- pulsing build marker (ring + light column + bobbing arrow), additive glow
  const glow = new THREE.MeshBasicMaterial({ color: 0xffcf5a, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const rgba = (g, fn) => { const p = g.attributes.position, c = new Float32Array(p.count * 4); for (let i = 0; i < p.count; i++) { c[i * 4] = c[i * 4 + 1] = c[i * 4 + 2] = 1; c[i * 4 + 3] = fn(p.getX(i), p.getY(i), p.getZ(i)); } g.setAttribute('color', new THREE.BufferAttribute(c, 4)); return g; };
  const ring = new THREE.RingGeometry(1.35, 1.75, 48, 1).rotateX(-Math.PI / 2); rgba(ring, () => .95);
  const ring2 = new THREE.RingGeometry(.0, 1.35, 48, 1).rotateX(-Math.PI / 2); rgba(ring2, (x, y, z) => .3 * Math.hypot(x, z) / 1.35);
  const col = new THREE.CylinderGeometry(1.5, 1.55, 3.2, 40, 4, true).translate(0, 1.6, 0); rgba(col, (x, y) => .6 * Math.pow(1 - y / 3.2, 1.5));
  const markerMesh = new THREE.Mesh(merge([ring, ring2, col].map(g => g.index ? g.toNonIndexed() : g)), glow); markerMesh.renderOrder = 2;
  const arrowG = new THREE.ConeGeometry(.5, .8, 4); arrowG.rotateX(Math.PI); rgba(arrowG, () => 1);
  const arrowB = new THREE.CylinderGeometry(.18, .18, .6, 8).translate(0, .7, 0); rgba(arrowB, () => 1);
  const arrow = new THREE.Mesh(merge([arrowG.toNonIndexed(), arrowB.toNonIndexed()]), glow); arrow.renderOrder = 2;
  const marker = new THREE.Group(); marker.add(markerMesh, arrow); marker.name = 'masjid-build-marker'; parent.add(marker);
  const markPos = V3(0, 0, 0); let markVis = 0;
  ctx.interactables ??= [];
  ctx.interactables.push({ kind: 'build', get label() { return api.lang() ? 'Build' : 'Bangun'; }, icon: '🔨', pos: markPos, r: 2.4, priority: .5, enabled: () => marker.visible && markVis > .5 });
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
        const p = 1 + Math.sin(t * 3.2) * .07;
        markerMesh.scale.set(p * markVis, markVis, p * markVis); markerMesh.rotation.y = t * .4;
        arrow.position.y = 3.3 + Math.sin(t * 4) * .22; arrow.rotation.y = t * 1.6; arrow.scale.setScalar(markVis);
        glow.opacity = .75 + Math.sin(t * 3.2) * .25;
        if (api.canAfford()) glow.color.setRGB(1.6, 1.1, .35); else glow.color.setRGB(.55, .95, 1.5);
      }
    },
    root, marker,
  };
}

// Masjid anchors: stage-aware stand points (spot), prayer rows (prayerLayout), dirt zones (zones), inside test and
// door/corner routing. Pure geometry knowledge; no scene objects. All positions in world metres (masjid at origin, faces +Z).
import { PL, HALL_Z, MINARET, BEDUG, WUDHU } from './stages.js';

const PI = Math.PI;
const SOKO = [[-3.1, -4.1], [3.1, -4.1], [-3.1, -.9], [3.1, -.9]];
const MIMBAR = { x: 2.55, z: -6.0 };
const COLS_VER = [-6, -3, 3, 6];           // veranda columns at z = 6.1
const HALL = { x0: -4.7, x1: 4.7, z0: -7.3, z1: 1.8 };   // usable interior
const PORCH = { x0: -7.6, x1: 7.6, z0: 2.75, z1: 8.25 };
const TILE = 1.62;
// hall/bulge obstacle rectangle for routing (wall colliders r .85 + player r .4), and its walk-around corners
const OBST = { x0: -6.2, x1: 6.2, z0: -10.2, z1: 2.8 };
const CORNER = { sw: [-6.6, 3.3], se: [6.6, 3.3], ne: [6.6, -10.6], nw: [-6.6, -10.6] };
const DOOR_OUT = { x: .3, z: 3.4 }, DOOR_IN = { x: .3, z: 1.2 };

export function createAnchors(ctx, api) {
  const stage = () => api.stage | 0;
  const gh = (x, z) => { try { const h = ctx.groundHeight(x, z); return Number.isFinite(h) ? h : 0; } catch (e) { return 0; } };

  // ---------------------------------------------------------------- spots
  const at = (x, z, yaw, y) => ({ x, y: y ?? gh(x, z), z, yaw });
  function spot(name) {
    const s = stage();
    switch (name) {
      case 'imam': return s >= 1 ? at(0, -6.45, PI) : at(0, -2, PI);
      case 'mihrab': return at(0, -6.45, PI);
      // menara stand point sits on the flat plinth top beside the tower (x=-8.35 would be on the plinth's edge slope)
      case 'adzan': return s >= 4 ? at(-7.9, -4.5, PI) : s >= 1 ? at(-2.0, 3.4, PI) : at(0, 8, PI);
      case 'menara': return s >= 4 ? at(-7.9, -4.5, PI) : null;
      case 'mic': return s >= 2 ? at(-2.0, 3.4, PI) : null;
      case 'kentongan': return s >= 2 ? at(-4.5, 7.3, PI) : null;
      case 'bedug': return s >= 6 ? at(BEDUG.x - 3.1, BEDUG.z, PI / 2) : null;
      case 'mimbar': return s >= 7 ? at(MIMBAR.x, -4.35, 0) : null;
      case 'door': return at(0, 2.25, PI);
      case 'porch': return at(0, 5, PI);
      case 'gather': return at(0, 17, PI);
      default: return null;
    }
  }

  // ---------------------------------------------------------------- inside test
  function isInside(x, z) {
    const s = stage();
    if (s >= 2 && x > -5.0 && x < 5.0 && z > -7.5 && z < 2.0) return 'hall';
    if (s >= 1 && x > -7.8 && x < 7.8 && z >= 2.0 && z < 8.4) return 'porch';
    return null;
  }

  // ---------------------------------------------------------------- prayer layout
  // Rows fill from the centre behind the imam outward. Slot centres keep >= collider.r + .35 from every collider.
  const order = (a) => a.sort((p, q) => (Math.abs(p.x) - Math.abs(q.x)) || (q.x - p.x));
  function prayerLayout(o = {}) {
    const s = o.stage ?? stage(), statik = !!o.staticOnly;
    const ok = (x, z, indoor) => {
      if (indoor && (x < HALL.x0 || x > HALL.x1 || z < HALL.z0 || z > HALL.z1)) return false;
      if (s >= 3 && indoor) for (const [cx, cz] of SOKO) if (Math.hypot(x - cx, z - cz) < .9) return false;
      if (s >= 7 && indoor && Math.hypot(x - MIMBAR.x, z - MIMBAR.z) < 1.55) return false;
      if (!statik) for (const c of ctx.colliders) { const r = (c.r || 0) + .35; if (Math.abs(x - c.x) < r && Math.abs(z - c.z) < r && Math.hypot(x - c.x, z - c.z) < r) return false; }
      return true;
    };
    const men = [], women = [];
    if (s >= 1) {
      const indoor = s >= 2;
      [-5.45, -4.35, -3.25, -2.15].forEach((z, row) => { const r = []; for (let k = 0; k <= 8; k++) { const x = +((k - 4) * .95).toFixed(2); if (ok(x, z, indoor)) r.push({ x, z, row }); } men.push(...order(r)); });
      [.1, 1.0].forEach((z, row) => { const r = []; for (let k = 0; k <= 8; k++) { const x = +((k - 4) * .95).toFixed(2); if (Math.abs(x - .3) < .55) continue; if (ok(x, z, indoor)) r.push({ x, z, row }); } women.push(...order(r)); });
      const imam = spot('imam');
      return { imam, facing: PI, men, women, entry: indoor ? [{ x: .3, z: 9.6 }, { x: .3, z: 3.2 }, { x: .3, z: 1.4 }] : [{ x: .3, z: 9.6 }], aisleX: .3, indoor, mats: indoor && s >= 7, stage: s };
    }
    // stage 0: open-air rows on the bare site, behind an imam at (0,-2)
    for (let row = 0; row < 3; row++) { const r = [], z = -.8 + row * 1.05; for (let k = -3; k <= 3; k++) { const x = k * .95; if (ok(x, z, false)) r.push({ x, z, row }); } men.push(...order(r)); }
    for (let row = 0; row < 2; row++) { const r = [], z = -.8 + (row + 3) * 1.05 + .2; for (let k = -3; k <= 3; k++) { const x = k * .95; if (Math.abs(x - .3) < .55) continue; if (ok(x, z, false)) r.push({ x, z, row }); } women.push(...order(r)); }
    return { imam: spot('imam'), facing: PI, men, women, entry: [], aisleX: .3, indoor: false, mats: false, stage: s };
  }

  // ---------------------------------------------------------------- dirt zones
  // plaza tiles (stage>=1) sit on top of the ground (top y = .14); decals must use that height, not groundHeight.
  const tileAt = (x, z) => {
    if (stage() < 1) return false;
    const tx = Math.round(x / TILE) * TILE, tz = Math.round((z - 1) / TILE) * TILE + 1;
    return Math.hypot(tx, tz) <= 13.6 && !(Math.abs(tx) < 9.6 && tz > -12.2 && tz < 10.3);
  };
  const groundY = (x, z) => tileAt(x, z) ? Math.max(gh(x, z), .14) : gh(x, z);
  const nearCol = (x, z, pad = .25) => { for (const c of ctx.colliders) { const r = (c.r || 0) + pad; if (Math.abs(x - c.x) < r && Math.abs(z - c.z) < r && Math.hypot(x - c.x, z - c.z) < r) return true; } return false; };
  const box = (x, z, cx, cz, hx, hz) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz;

  function plazaZone(s) {
    const R = s >= 1 ? 13.0 : 12.0, R0 = s >= 1 ? 0 : 2.5;
    const contains = (x, z) => {
      const r = Math.hypot(x, z); if (r > R || r < R0) return false;
      if (s >= 1 && Math.abs(x) < 9.6 && z > -12.2 && z < 10.3) return false;        // plinth, curbs, stairs
      if (s >= 2 && z > 12.0 && Math.abs(x) < 5.9) return false;                       // gate
      if (s >= 4 && Math.hypot(x - MINARET.x, z - MINARET.z) < 3.3) return false;      // menara
      if (s >= 5 && box(x, z, WUDHU.x, WUDHU.z, 3.95, 3.95)) return false;            // wudhu pavilion + its muddy apron
      if (s >= 6 && box(x, z, BEDUG.x, BEDUG.z, 2.9, 2.9)) return false;              // bedug pavilion
      return true;
    };
    // everything inside r 9.6 is plinth from stage 1 on: sample the outer annulus only
    const rIn = s >= 1 ? 9.6 : R0;
    const pick = (rand) => { const a = rand() * Math.PI * 2, r = Math.sqrt(rIn * rIn + rand() * (R * R - rIn * rIn)); return [Math.cos(a) * r, Math.sin(a) * r]; };
    return { id: 'plaza', types: ['leaf'], floorY: groundY, contains, bounds: [-R, R, -R, R], pick };
  }
  function porchZone(s) {
    const contains = (x, z) => {
      if (x < PORCH.x0 || x > PORCH.x1 || z < PORCH.z0 || z > PORCH.z1) return false;
      if (Math.abs(z - 7.7) < .34 || Math.abs(x) > 7.34) return false;                 // raised arabesque border strips
      if (Math.hypot(x, z - 7.15) < 1.26) return false;                                // raised medallion
      if (s >= 2) { for (const cx of COLS_VER) if (Math.hypot(x - cx, z - 6.1) < .78) return false; if (Math.hypot(x + 2.0, z - 3.0) < .45 || box(x, z, -2.42, 2.86, .3, .25)) return false; }
      return true;
    };
    return { id: 'porch', types: ['leaf', 'dust', 'mud', 'print'], floorY: gh, contains, bounds: [PORCH.x0, PORCH.x1, PORCH.z0, PORCH.z1] };
  }
  function hallZone(s) {
    const contains = (x, z) => {
      if (x < HALL.x0 || x > HALL.x1 || z < HALL.z0 || z > HALL.z1) return false;
      if (s >= 3) for (const [cx, cz] of SOKO) if (Math.hypot(x - cx, z - cz) < .82) return false;
      if (s >= 7 && (box(x, z, MIMBAR.x, -5.95, .9, 1.7) || (Math.abs(x) < 1.8 && z < -6.95))) return false; // mimbar, mihrab frame
      return true;
    };
    // stage 7+ carpet (PL+.01) and sajadah (PL+.022): decals sit above both
    const floorY = (x, z) => gh(x, z) + (s >= 7 ? .035 : 0);
    return { id: 'hall', types: ['dust', 'print'], floorY, contains, bounds: [HALL.x0, HALL.x1, HALL.z0, HALL.z1] };
  }
  function wudhuZone() {
    const W = WUDHU;
    const slab = (lx, lz) => (lx > 2.0 && lx < 2.75 && Math.abs(lz) < 2.0) || (lz > -2.75 && lz < -1.95 && lx > -1.45 && lx < 2.0);
    const contains = (x, z) => {
      const lx = x - W.x, lz = z - W.z, m = Math.max(Math.abs(lx), Math.abs(lz));
      if (slab(lx, lz)) return true;
      return m > 3.1 && m < 3.85 && x < -9.7 && Math.hypot(x, z) < 15.5;               // muddy apron around the slab (off the plinth)
    };
    const floorY = (x, z) => slab(x - W.x, z - W.z) ? .22 : groundY(x, z);
    return { id: 'wudhu', types: ['mud'], floorY, contains, bounds: [W.x - 3.85, W.x + 3.85, W.z - 3.85, W.z + 3.85] };
  }
  function finishZone(zn) {
    const [x0, x1, z0, z1] = zn.bounds; let n = 0;
    for (let x = x0 + .125; x < x1; x += .25) for (let z = z0 + .125; z < z1; z += .25) if (zn.contains(x, z)) n++;
    zn.area = +(n * .0625).toFixed(2);
    zn.sample = (rand = Math.random, tries = 60) => {
      for (let i = 0; i < tries; i++) {
        let x, z; if (zn.pick) [x, z] = zn.pick(rand); else { x = x0 + (x1 - x0) * rand(); z = z0 + (z1 - z0) * rand(); }
        if (zn.contains(x, z) && !nearCol(x, z)) return { x, z };
      }
      return null;
    };
    return zn;
  }
  let zoneCache = null, zoneStage = -1;
  function zones() {
    const s = stage();
    if (zoneCache && zoneStage === s) return zoneCache;
    const list = [plazaZone(s)];
    if (s >= 1) list.push(porchZone(s));
    if (s >= 2) list.push(hallZone(s));
    if (s >= 5) list.push(wudhuZone());
    zoneCache = list.map(finishZone); zoneStage = s;
    return zoneCache;
  }

  // ---------------------------------------------------------------- routing (door + walk around the hall)
  const inObst = (x, z) => x > OBST.x0 && x < OBST.x1 && z > OBST.z0 && z < OBST.z1;
  function segHits(ax, az, bx, bz) { // segment vs obstacle rect (Liang-Barsky)
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - OBST.x0], [dx, OBST.x1 - ax], [-dz, az - OBST.z0], [dz, OBST.z1 - az]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) return false; continue; }
      const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t1 - t0 > 1e-4;
  }
  const RING = [CORNER.sw, CORNER.se, CORNER.ne, CORNER.nw];
  function around(a, b) { // shortest corner chain from a to b around the obstacle (both outside it)
    if (!segHits(a.x, a.z, b.x, b.z)) return [];
    let best = null, bl = Infinity;
    for (let i = 0; i < 4; i++) for (const dir of [1, -1]) {
      const chain = [];
      for (let k = 0, j = i; k < 4; k++, j = (j + dir + 4) % 4) {
        const c = RING[j]; chain.push(c);
        const prev = chain.length > 1 ? chain[chain.length - 2] : [a.x, a.z];
        if (chain.length === 1 && segHits(a.x, a.z, c[0], c[1])) { chain.length = 0; break; }
        if (chain.length > 1 && segHits(prev[0], prev[1], c[0], c[1])) { chain.length = 0; break; }
        if (!segHits(c[0], c[1], b.x, b.z)) break;
        if (k === 3) chain.length = 0;
      }
      if (!chain.length) continue;
      let L = 0, p = [a.x, a.z]; for (const c of chain) { L += Math.hypot(c[0] - p[0], c[1] - p[1]); p = c; } L += Math.hypot(b.x - p[0], b.z - p[1]);
      if (L < bl) { bl = L; best = chain; }
    }
    return (best || []).map(([x, z]) => ({ x, z }));
  }
  // ---- leg repair: a coarse grid A* over the masjid site that respects every collider (veranda columns, porch mic,
  //      menara, wudhu/bedug pavilions, gate piers, flower beds, placed decor...). Only legs that are actually blocked get
  //      re-planned, so the door waypoints above stay exactly where the spec puts them.
  const G = { x0: -21, z0: -19, cs: .4, nx: 95, nz: 108 }; // x -21..17, z -19..24.2
  const PAD = .38;                                           // player radius (.4) minus a hair: legs may graze, not cut
  const blocked = new Uint8Array(G.nx * G.nz);
  let gridKey = '';
  const cols = () => ctx.colliders.filter(c => c && Number.isFinite(c.x) && Number.isFinite(c.z) && c.r > 0 && c.r < 8 &&
    c.x > G.x0 - c.r - 1 && c.x < G.x0 + G.nx * G.cs + c.r + 1 && c.z > G.z0 - c.r - 1 && c.z < G.z0 + G.nz * G.cs + c.r + 1);
  function buildGrid(list) {
    let key = stage() + ':' + list.length; for (const c of list) key += ',' + (c.x * 7 + c.z * 13 + c.r).toFixed(2);
    if (key === gridKey) return; gridKey = key; blocked.fill(0);
    for (const c of list) {
      const R = c.r + PAD, i0 = Math.max(0, Math.floor((c.x - R - G.x0) / G.cs)), i1 = Math.min(G.nx - 1, Math.floor((c.x + R - G.x0) / G.cs));
      const j0 = Math.max(0, Math.floor((c.z - R - G.z0) / G.cs)), j1 = Math.min(G.nz - 1, Math.floor((c.z + R - G.z0) / G.cs));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const x = G.x0 + (i + .5) * G.cs, z = G.z0 + (j + .5) * G.cs;
        if ((x - c.x) ** 2 + (z - c.z) ** 2 < R * R) blocked[j * G.nx + i] = 1;
      }
    }
  }
  /** is the straight leg a->b blocked? ignores colliders the ends themselves stand against (targets beside an object) */
  function legBlocked(a, b, list) {
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / .2));
    for (const c of list) {
      const R = c.r + PAD;
      if (Math.hypot(a.x - c.x, a.z - c.z) < R + .05 || Math.hypot(b.x - c.x, b.z - c.z) < R + .05) continue;
      // quick reject: distance from the collider to the segment's bounding box
      if (c.x < Math.min(a.x, b.x) - R || c.x > Math.max(a.x, b.x) + R || c.z < Math.min(a.z, b.z) - R || c.z > Math.max(a.z, b.z) + R) continue;
      for (let k = 0; k <= n; k++) { const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if ((x - c.x) ** 2 + (z - c.z) ** 2 < R * R) return true; }
    }
    return false;
  }
  const cell = (x, z) => [Math.min(G.nx - 1, Math.max(0, Math.floor((x - G.x0) / G.cs))), Math.min(G.nz - 1, Math.max(0, Math.floor((z - G.z0) / G.cs)))];
  function freeNear(i, j) { // nearest unblocked cell (ring search, up to 2 m)
    if (!blocked[j * G.nx + i]) return [i, j];
    for (let r = 1; r <= 5; r++) { let best = null, bd = 1e9;
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= G.nx || b >= G.nz || blocked[b * G.nx + a]) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, b]; } }
      if (best) return best; }
    return null;
  }
  const losCells = (ax, az, bx, bz) => { // grid line of sight between world points
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (G.cs * .5)));
    for (let k = 0; k <= n; k++) { const t = k / n, [i, j] = cell(ax + (bx - ax) * t, az + (bz - az) * t); if (blocked[j * G.nx + i]) return false; }
    return true;
  };
  const gScore = new Float32Array(G.nx * G.nz), came = new Int32Array(G.nx * G.nz), stamp = new Uint32Array(G.nx * G.nz); let gen = 0;
  function astar(a, b) {
    const s = freeNear(...cell(a.x, a.z)), e = freeNear(...cell(b.x, b.z)); if (!s || !e) return null;
    gen++; const S = s[1] * G.nx + s[0], E = e[1] * G.nx + e[0];
    const heap = [], push = (f, id) => { heap.push([f, id]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const H = (id) => { const dx = Math.abs(id % G.nx - e[0]), dz = Math.abs(((id / G.nx) | 0) - e[1]); return (Math.max(dx, dz) + .414 * Math.min(dx, dz)); };
    stamp[S] = gen; gScore[S] = 0; came[S] = -1; push(H(S), S);
    let found = false, it = 0;
    while (heap.length && it++ < 40000) {
      const [f, id] = pop(); if (id === E) { found = true; break; }
      const i = id % G.nx, j = (id / G.nx) | 0, g0 = gScore[id];
      if (f - H(id) > g0 + 1e-4) continue; // stale entry
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const a2 = i + di, b2 = j + dj; if (a2 < 0 || b2 < 0 || a2 >= G.nx || b2 >= G.nz) continue;
        const nid = b2 * G.nx + a2; if (blocked[nid]) continue;
        if (di && dj && (blocked[j * G.nx + a2] || blocked[b2 * G.nx + i])) continue; // no corner cutting
        const g = g0 + (di && dj ? 1.414 : 1);
        if (stamp[nid] === gen && gScore[nid] <= g) continue;
        stamp[nid] = gen; gScore[nid] = g; came[nid] = id; push(g + H(nid), nid);
      }
    }
    if (!found) return null;
    const cells = []; for (let id = E; id !== -1; id = came[id]) cells.push([G.x0 + (id % G.nx + .5) * G.cs, G.z0 + (((id / G.nx) | 0) + .5) * G.cs]);
    cells.reverse();
    // string-pull: from each kept point jump to the farthest point still in line of sight
    const pts = [[a.x, a.z], ...cells, [b.x, b.z]], out = [];
    for (let i = 0; i < pts.length - 1;) {
      let j = Math.min(pts.length - 1, i + 80);
      while (j > i + 1 && !losCells(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--;
      if (j < pts.length - 1) out.push(pts[j]);
      i = j;
    }
    return out.map(([x, z]) => ({ x: +x.toFixed(2), z: +z.toFixed(2) }));
  }
  /** clip the leg to the grid box so legs that start/end far away (pen, road) can still be repaired near the masjid */
  function clipToGrid(a, b) {
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dz = b.z - a.z, X1 = G.x0 + G.nx * G.cs - .01, Z1 = G.z0 + G.nz * G.cs - .01;
    for (const [p, q] of [[-dx, a.x - G.x0], [dx, X1 - a.x], [-dz, a.z - G.z0], [dz, Z1 - a.z]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
      const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [{ x: a.x + dx * t0, z: a.z + dz * t0 }, { x: a.x + dx * t1, z: a.z + dz * t1 }, t0 > 0, t1 < 1];
  }
  function repair(a, b, list) {
    if (!legBlocked(a, b, list)) return [];
    const c = clipToGrid(a, b); if (!c) return [];
    const [ca, cb, inA, inB] = c;
    const mid = astar(ca, cb); if (!mid) return [];
    return [...(inA ? [{ x: +ca.x.toFixed(2), z: +ca.z.toFixed(2) }] : []), ...mid, ...(inB ? [{ x: +cb.x.toFixed(2), z: +cb.z.toFixed(2) }] : [])];
  }

  function route(from, to) {
    if (!from || !to || stage() < 1) return null;
    const a = { x: from.x, z: from.z }, b = { x: to.x, z: to.z };
    if (![a.x, a.z, b.x, b.z].every(Number.isFinite)) return null;
    let path = [];
    if (stage() >= 2) {
      const aIn = isInside(a.x, a.z) === 'hall', bIn = isInside(b.x, b.z) === 'hall';
      if (aIn && bIn) path = [];
      else if (!aIn && bIn) path = [...(inObst(a.x, a.z) ? [] : around(a, DOOR_OUT)), { ...DOOR_OUT }, { ...DOOR_IN }];
      else if (aIn && !bIn) path = [{ ...DOOR_IN }, { ...DOOR_OUT }, ...(inObst(b.x, b.z) ? [] : around(DOOR_OUT, b))];
      else path = (inObst(a.x, a.z) || inObst(b.x, b.z)) ? [] : around(a, b);
    }
    // repair every leg that cuts through a collider (columns, mic, menara, pavilions, gate, beds, decor...)
    let list; try { list = cols(); buildGrid(list); } catch (e) { return path.length ? path : null; }
    const pts = [a, ...path, b], out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      if (i > 0) out.push(pts[i]);
      try { out.push(...repair(pts[i], pts[i + 1], list)); } catch (e) { }
    }
    return out.length ? out : null;
  }

  return { spot, prayerLayout, zones, isInside, route, groundY, HALL, PORCH };
}

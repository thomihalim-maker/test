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
  function route(from, to) {
    if (!from || !to || stage() < 2) return null;
    const a = { x: from.x, z: from.z }, b = { x: to.x, z: to.z };
    const aIn = isInside(a.x, a.z) === 'hall', bIn = isInside(b.x, b.z) === 'hall';
    if (aIn && bIn) return null;
    let path;
    if (!aIn && bIn) path = [...(inObst(a.x, a.z) ? [] : around(a, DOOR_OUT)), { ...DOOR_OUT }, { ...DOOR_IN }];
    else if (aIn && !bIn) path = [{ ...DOOR_IN }, { ...DOOR_OUT }, ...(inObst(b.x, b.z) ? [] : around(DOOR_OUT, b))];
    else path = (inObst(a.x, a.z) || inObst(b.x, b.z)) ? [] : around(a, b);
    return path.length ? path : null;
  }

  return { spot, prayerLayout, zones, isInside, route, groundY, HALL, PORCH };
}

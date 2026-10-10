// Juicy build animations: pieces grow / pop / drop-in with squash & stretch, dust + sparkle on landing.
import * as THREE from 'three';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// damped overshoot (easeOutElastic-lite)
const elastic = p => p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-6.2 * p) * Math.cos(p * 9.5) * (1 - p * .15);
const easeOutBack = p => { const c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

export function createAnimator(ctx) {
  const stages = new Set();
  let lastSnd = -1;
  const snd = (name, opts) => { if (ctx.time - lastSnd < .09) return; lastSnd = ctx.time; try { ctx.modules.audio?.play(name, opts); } catch (e) { } };
  const burst = (kind, pos) => { try { ctx.modules.fx?.burst(kind, pos.clone ? pos.clone() : pos); } catch (e) { } };

  function runner(onDone) {
    const st = { time: 0, pieces: [], insts: [], onDone, done: false, speed: 1 };

    /** Animate an Object3D. Its current transform is the final one. */
    st.add = (obj, o = {}) => {
      const p = {
        obj, delay: o.delay ?? 0, dur: o.dur ?? .8, kind: o.kind ?? 'grow', amp: o.amp ?? .25, drop: o.drop ?? 5,
        fx: o.fx ?? null, snd: o.snd ?? null, fxOff: o.fxOff ?? null, state: 0, landed: false,
        bp: obj.position.clone(), bs: obj.scale.clone(), onLand: o.onLand,
      };
      obj.visible = false; st.pieces.push(p); return obj;
    };
    /** Animate each instance of an InstancedMesh. o.delayFn(i, pos) -> seconds */
    st.addInst = (mesh, o = {}) => {
      const n = mesh.count, base = new Array(n), pos = new Array(n), quat = new Array(n), sc = new Array(n);
      for (let i = 0; i < n; i++) { mesh.getMatrixAt(i, _m); _m.decompose(_p, _q, _s); pos[i] = _p.clone(); quat[i] = _q.clone(); sc[i] = _s.clone(); }
      const d = new Float32Array(n);
      for (let i = 0; i < n; i++) d[i] = (o.delayFn ? o.delayFn(i, pos[i]) : (o.delay ?? 0)) + (o.delay ?? 0) * (o.delayFn ? 1 : 0);
      const rec = { mesh, n, pos, quat, sc, d, dur: o.dur ?? .55, kind: o.kind ?? 'pop', amp: o.amp ?? .4, drop: o.drop ?? 1.2, done: false, started: false };
      for (let i = 0; i < n; i++) { _m.compose(pos[i], quat[i], _s.set(0, 0, 0)); mesh.setMatrixAt(i, _m); }
      mesh.instanceMatrix.needsUpdate = true; mesh.visible = true; st.insts.push(rec);
      return mesh;
    };
    st.update = dt => {
      if (st.done) return;
      st.time += dt * st.speed; let alive = false;
      for (const p of st.pieces) {
        if (p.state === 2) continue; alive = true;
        const local = (st.time - p.delay) / p.dur;
        if (local < 0) continue;
        const o = p.obj; o.visible = true; p.state = 1;
        const pp = clamp(local);
        apply(o, p, pp);
        if (pp >= .55 && p.kind === 'drop' && !p.landed || pp >= .02 && p.kind !== 'drop' && !p.landed) {
          if (p.kind === 'drop' ? pp >= .55 : pp >= .5) land(p);
        }
        if (local >= 1) { o.position.copy(p.bp); o.scale.copy(p.bs); p.state = 2; if (!p.landed) land(p); }
      }
      for (const r of st.insts) {
        if (r.done) continue; alive = true; let any = false;
        for (let i = 0; i < r.n; i++) {
          const lp = (st.time - r.d[i]) / r.dur;
          if (lp >= 1) { _m.compose(r.pos[i], r.quat[i], r.sc[i]); r.mesh.setMatrixAt(i, _m); continue; }
          any = true;
          const pp = clamp(lp); let k = r.kind === 'drop' ? 1 : elastic(pp);
          _p.copy(r.pos[i]); let sy, sxz;
          if (lp <= 0) { sy = sxz = 0; }
          else if (r.kind === 'drop') { const fall = clamp(pp / .6); _p.y += r.drop * (1 - fall * fall); sy = fall < 1 ? 1.15 : 1; sxz = fall < 1 ? .9 : 1; const q = clamp((pp - .6) / .4), a = Math.exp(-q * 5) * Math.sin(q * 9) * .25; if (fall >= 1) { sy = 1 - a; sxz = 1 + a * .6; } }
          else { const ov = Math.max(0, k - 1); sy = k * (1 + r.amp * ov * 1.2); sxz = k * (1 - r.amp * ov); }
          _m.compose(_p, r.quat[i], _s.set(r.sc[i].x * sxz, r.sc[i].y * sy, r.sc[i].z * sxz)); r.mesh.setMatrixAt(i, _m);
        }
        r.mesh.instanceMatrix.needsUpdate = true;
        if (!any) r.done = true;
      }
      if (!alive) { st.done = true; st.onDone?.(); }
    };
    st.finish = () => { // jump to final state
      for (const p of st.pieces) { p.obj.visible = true; p.obj.position.copy(p.bp); p.obj.scale.copy(p.bs); p.state = 2; if (!p.landed) { p.landed = true; p.onLand?.(p.obj.position); } }
      for (const r of st.insts) { for (let i = 0; i < r.n; i++) { _m.compose(r.pos[i], r.quat[i], r.sc[i]); r.mesh.setMatrixAt(i, _m); } r.mesh.instanceMatrix.needsUpdate = true; r.done = true; }
      st.done = true;
    };
    function land(p) {
      p.landed = true;
      p.obj.getWorldPosition(_v);
      if (p.fxOff) _v.add(p.fxOff);
      if (p.fx) burst(p.fx, _v);
      if (p.snd) snd(p.snd, { pos: _v.clone(), vol: .5 });
      p.onLand?.(_v);
    }
    stages.add(st); return st;
  }

  function apply(o, p, pp) {
    const bp = p.bp, bs = p.bs;
    if (p.kind === 'grow') {
      const k = elastic(pp), ov = Math.max(0, k - 1);
      const sxz = k < 1 ? 1 - p.amp * (1 - k) * .8 : 1 - p.amp * ov * .8;
      o.scale.set(bs.x * sxz, bs.y * Math.max(k, .001), bs.z * sxz); o.position.copy(bp);
    } else if (p.kind === 'pop') {
      const k = elastic(pp), ov = Math.max(0, k - 1);
      o.scale.set(bs.x * k * (1 - p.amp * ov), bs.y * k * (1 + p.amp * ov * 1.2), bs.z * k * (1 - p.amp * ov)); o.position.copy(bp);
    } else if (p.kind === 'drop') {
      const fall = clamp(pp / .55);
      if (pp < .55) {
        const e = fall * fall; o.position.set(bp.x, bp.y + p.drop * (1 - e), bp.z);
        o.scale.set(bs.x * .93, bs.y * 1.08, bs.z * .93);
      } else {
        const q = (pp - .55) / .45, a = Math.exp(-q * 4.5) * Math.sin(q * 11) * p.amp;
        o.position.copy(bp); o.scale.set(bs.x * (1 + a * .5), bs.y * (1 - a), bs.z * (1 + a * .5));
      }
    } else if (p.kind === 'fade') { o.position.copy(bp); o.scale.copy(bs); }
  }

  return {
    runner,
    update(dt) { for (const s of stages) { s.update(dt); if (s.done) stages.delete(s); } },
    easeOutBack, elastic,
  };
}

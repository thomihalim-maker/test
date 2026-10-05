import * as THREE from 'three';
import { personMaterial, outlineMaterial, tartanTexture } from './toon.js';
import * as B from './builder.js';
import { KEYS, IDX, DEF, OMEGA, ZETA, solve } from './anims.js';

const NK = KEYS.length;
const col = (hex)=>{ const c=new THREE.Color(hex); return [c.r,c.g,c.b]; };

export function makePalette(c){
  const a = new Float32Array(15);
  [c.skin,c.top,c.bot,c.head,c.shoe].forEach((h,i)=>a.set(col(h),i*3));
  return a;
}

export class Person{
  constructor(spec){
    this.spec = spec; this.pal = makePalette(spec.colors);
    this.pos = new THREE.Vector3(); this.yaw = 0; this.speed = 0; this.cycle = Math.random()*6;
    this.seed = Math.random()*100; this.t = 0; this.anim = 'loco'; this.carry = null;
    this.accX = 0; this.accZ = 0; this.jy = 0; this.jvy = 0; this.jumpPhase = -1; this.actDur = 1;
    this.stoop = spec.stoop||0; this.size = spec.size||1; this.headScale = spec.headScale||1;
    this.p = new Float32Array(NK); this.v = new Float32Array(NK); this.tg = {};
    for(let i=0;i<NK;i++) this.p[i] = DEF[KEYS[i]];
    this.blinkT = 1+Math.random()*3; this.blinkPh = -1;
    this.handR = new THREE.Matrix4(); this.handL = new THREE.Matrix4(); this.head = new THREE.Vector3();
    this.wantHands = false; this.visible = true; this.prop = null; this.propTilt = 0; this.propPhase = 0;
    this.lastSin = 0; this.onStep = null; this.hit = 0;
  }
  play(name, dur){ this.anim = name; this.t = 0; this.actDur = dur || 1; this.actEnd = true; this._hitDone=false; }
  pose(name){ if(this.anim!==name){ this.anim = name; this.actEnd = false; } }
  step(dt){
    this.t += dt;
    if(this.actEnd && this.t>this.actDur){ this.anim='loco'; this.actEnd=false; }
    const tg = this.tg; for(const k of KEYS) tg[k] = DEF[k];
    solve(this, tg);
    const sub = dt>1/45?2:1, h = dt/sub;
    for(let s=0;s<sub;s++) for(let i=0;i<NK;i++){
      const w = OMEGA[i], z = ZETA[i];
      const acc = w*w*(tg[KEYS[i]]-this.p[i]) - 2*z*w*this.v[i];
      this.v[i] += acc*h; this.p[i] += this.v[i]*h;
    }
    // blink
    this.blinkT -= dt; if(this.blinkT<=0 && this.blinkPh<0){ this.blinkPh = 0; }
    if(this.blinkPh>=0){ this.blinkPh += dt; if(this.blinkPh>.16){ this.blinkPh=-1; this.blinkT = 2+Math.random()*4; } }
    // footsteps
    const sn = Math.sin(this.cycle);
    if(this.speed>.8 && Math.sign(sn)!==Math.sign(this.lastSin) && this.onStep) this.onStep(this, sn>0?1:-1);
    this.lastSin = sn;
  }
}

class PartSet{
  constructor(scene, geo, mat, outMat, max, cast=true){
    this.max = max; this.n = 0;
    const mk = (n)=>{ const a=new THREE.InstancedBufferAttribute(new Float32Array(max*n),n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.c = [0,1,2,3,4].map(i=>{ const a=mk(3); geo.setAttribute('iC'+i,a); return a; });
    this.f = mk(3); geo.setAttribute('iFlex',this.f);
    this.mesh = new THREE.InstancedMesh(geo,mat,max); this.mesh.count=0; this.mesh.frustumCulled=false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = cast; this.mesh.receiveShadow = true; scene.add(this.mesh);
    if(outMat){
      this.out = new THREE.InstancedMesh(geo,outMat,max); this.out.instanceMatrix = this.mesh.instanceMatrix; this.out.frustumCulled=false; this.out.count=0; scene.add(this.out);
    }
  }
  reset(){ this.n = 0; }
  push(m, pal, fx=0,fy=0,fz=0){
    const i = this.n; if(i>=this.max) return; this.n++;
    m.toArray(this.mesh.instanceMatrix.array, i*16);
    if(pal) for(let k=0;k<5;k++){ const a=this.c[k].array; a[i*3]=pal[k*3]; a[i*3+1]=pal[k*3+1]; a[i*3+2]=pal[k*3+2]; }
    const fa=this.f.array; fa[i*3]=fx; fa[i*3+1]=fy; fa[i*3+2]=fz;
  }
  commit(){
    this.mesh.count = this.n; if(this.out) this.out.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; this.f.needsUpdate = true; for(const a of this.c) a.needsUpdate = true;
  }
}

const _r=new THREE.Matrix4(), _p=new THREE.Matrix4(), _c=new THREE.Matrix4(), _n=new THREE.Matrix4(), _a=new THREE.Matrix4(), _t=new THREE.Matrix4(), _o=new THREE.Matrix4(), _h=new THREE.Matrix4();
const _v=new THREE.Vector3();
const T=(m,x,y,z)=>m.multiply(_t.makeTranslation(x,y,z));
const RX=(m,a)=>a?m.multiply(_t.makeRotationX(a)):m;
const RY=(m,a)=>a?m.multiply(_t.makeRotationY(a)):m;
const RZ=(m,a)=>a?m.multiply(_t.makeRotationZ(a)):m;
const S=(m,x,y,z)=>m.multiply(_t.makeScale(x,y,z));

export class People{
  constructor(scene, max=72){
    this.scene = scene; this.max = max;
    const tart = tartanTexture();
    const mat = personMaterial(), matS = personMaterial({map:tart}), matF = personMaterial({rim:0});
    const ot = (t)=>outlineMaterial(t);
    const P = {};
    const mk = (name, geo, m, out, n, cast=true)=>{ P[name] = new PartSet(scene, geo, m, out, n, cast); P[name].mesh.name=name; };
    mk('head', B.buildHead(), mat, ot(.02), max);
    mk('eyes', B.buildEyes(), matF, null, max, false);
    mk('smile', B.buildMouth(false), matF, null, max, false);
    mk('open', B.buildMouth(true), matF, null, max, false);
    mk('koko', B.buildTorso('koko'), mat, ot(.02), max);
    mk('gamis', B.buildTorso('gamis'), mat, ot(.02), max);
    mk('arm', B.buildArm(), mat, ot(.016), max*2);
    mk('leg', B.buildLeg(), mat, ot(.016), max*2);
    mk('sarong', B.buildSarong(), matS, ot(.02), max);
    mk('skirt', B.buildSkirt(), mat, ot(.02), max);
    for(const h of['peci','kopiah','kopiahBeard','hijab','hair']) mk('hat_'+h, B.buildHat(h), mat, ot(.018), max);
    this.parts = P;
    // blob shadows
    const c = document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    const gr=g.createRadialGradient(32,32,2,32,32,31); gr.addColorStop(0,'rgba(0,0,0,.55)'); gr.addColorStop(.6,'rgba(0,0,0,.25)'); gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr; g.fillRect(0,0,64,64);
    const bt=new THREE.CanvasTexture(c);
    this.blob = new THREE.InstancedMesh(B.buildBlob(), new THREE.MeshBasicMaterial({map:bt,transparent:true,depthWrite:false,opacity:.5,polygonOffset:true,polygonOffsetFactor:-2}), max);
    this.blob.frustumCulled=false; this.blob.count=0; this.blob.renderOrder=1; scene.add(this.blob);
    this.groundH = (x,z)=>0;
  }
  setCast(b){ for(const k in this.parts) if(k!=='eyes'&&k!=='smile'&&k!=='open') this.parts[k].mesh.castShadow=b; }
  render(list){
    const P = this.parts; for(const k in P) P[k].reset();
    let bn=0;
    for(const q of list){
      if(!q.visible) continue;
      const p = q.p, I = IDX, sp = q.spec;
      const sx = p[I.sx], sy = p[I.sy], sz = q.size;
      _r.makeTranslation(q.pos.x, q.pos.y+q.jy, q.pos.z); RY(_r,q.yaw); S(_r, sz*sx, sz*sy, sz*sx);
      // blob shadow
      { const bh = Math.max(0,1-q.jy*.9); _o.makeTranslation(q.pos.x,q.pos.y+.03,q.pos.z); S(_o,.95*sz*bh+.2,1,.95*sz*bh+.2);
        _o.toArray(this.blob.instanceMatrix.array,bn*16); bn++; }
      _p.copy(_r); T(_p,0,p[I.py],0); RZ(_p,p[I.pr]); RX(_p,p[I.pp]);
      // legs
      for(const s of [-1,1]){
        _a.copy(_p); T(_a,s*.1,0,0); RX(_a,-(s<0?p[I.lrx]:p[I.llx])); RZ(_a, s*(s<0?p[I.lrz]:p[I.llz]));
        P.leg.push(_a, q.pal);
      }
      // bottom
      _a.copy(_p); S(_a, p[I.sgW], p[I.sgS], p[I.sgW]);
      (sp.bottom==='skirt'?P.skirt:P.sarong).push(_a, q.pal, p[I.fx], 0, p[I.fz]);
      // chest
      _c.copy(_p); RX(_c,p[I.lean]); RY(_c,p[I.twist]); RZ(_c,p[I.roll]);
      _a.copy(_c); S(_a,1+p[I.breath]*.5,1+p[I.breath],1+p[I.breath]*.5);
      (sp.torso==='gamis'?P.gamis:P.koko).push(_a, q.pal);
      // arms
      for(const s of [-1,1]){
        _a.copy(_c); T(_a,s*.205,.34,0); RZ(_a, s*(s<0?p[I.arz]:p[I.alz])); RX(_a,-(s<0?p[I.arx]:p[I.alx]));
        P.arm.push(_a, q.pal);
        if(q.wantHands){ (s<0?q.handR:q.handL).copy(_a).multiply(_t.makeTranslation(0,-.27,.01)); }
      }
      // neck/head
      _n.copy(_c); T(_n,0,.4,0); RX(_n,p[I.hx]); RY(_n,p[I.hy]); RZ(_n,p[I.hz]); S(_n,q.headScale,q.headScale,q.headScale);
      P.head.push(_n, q.pal);
      // head world pos for emotes
      _v.set(0,.7,0).applyMatrix4(_n); q.head.copy(_v); q.head.y += .1;
      const eye = p[I.eye]*(q.blinkPh>=0?(1-Math.sin(q.blinkPh/.16*Math.PI)*.92):1);
      _a.copy(_n); T(_a,p[I.gx]*.02,.26,0); S(_a,1,Math.max(.06,eye),1); T(_a,0,-.26,0); P.eyes.push(_a);
      const m = p[I.mouth], sm = p[I.smile];
      if(m>.18){ _a.copy(_n); T(_a,0,.135,0); S(_a,.8+.5*m,.35+.9*m,1); T(_a,0,-.135,0); P.open.push(_a); }
      else { _a.copy(_n); T(_a,0,.155,0); S(_a,.8+.35*sm,.25+.95*sm,1); T(_a,0,-.155,0); P.smile.push(_a); }
      _a.copy(_n); T(_a,0,.27,0); (P['hat_'+sp.hat]||P.hat_hair).push(_a, q.pal);
    }
    for(const k in P) P[k].commit();
    this.blob.count = bn; this.blob.instanceMatrix.needsUpdate = true;
  }
}

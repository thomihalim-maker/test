// Person state + instanced renderer (all people share ~30 instanced part sets; empty sets are hidden -> 0 draw calls)
import * as THREE from 'three';
import { personMaterial, outlineMaterial, sarongTexture, faceMaterial } from './toon.js';
import { faceAtlas, faceCode, CELL } from './face.js';
import * as B from './builder.js';
import { KEYS, IDX, DEF, OMEGA, ZETA, solve } from './anims.js';

const NK = KEYS.length;
const _c = new THREE.Color();
// 7 rgb slots packed into 24 floats (+flex at 21/22)
export function makePalette(c){
  const a = new Float32Array(24);
  [c.skin,c.top,c.bot,c.head,c.shoe,c.acc??c.top,c.hair??0x2a1d17].forEach((h,i)=>{ _c.set(h); a[i*3]=_c.r; a[i*3+1]=_c.g; a[i*3+2]=_c.b; });
  return a;
}

export class Person{
  constructor(spec){
    this.spec = spec; this.pal = makePalette(spec.colors);
    this.pos = new THREE.Vector3(); this.yaw = 0; this.speed = 0; this.cycle = Math.random()*6;
    this.seed = Math.random()*100; this.t = 0; this.anim = 'loco'; this.carry = null;
    this.accX = 0; this.accZ = 0; this.jy = 0; this.jvy = 0; this.jumpPhase = -1; this.actDur = 1;
    this.stoop = spec.stoop||0; this.size = spec.size||1; this.headScale = spec.headScale||1;
    this.limb = spec.limb||1; this.eyeScale = spec.eyeScale||1; this.bounce = spec.kid?1.7:1;
    this.p = new Float32Array(NK); this.v = new Float32Array(NK); this.tg = {};
    for(let i=0;i<NK;i++) this.p[i] = DEF[KEYS[i]];
    this.blinkT = 1+Math.random()*3; this.blinkPh = -1;
    this.handR = new THREE.Matrix4(); this.handL = new THREE.Matrix4(); this.head = new THREE.Vector3();
    this.wantHands = false; this.visible = true; this.prop = null; this.propTilt = 0; this.propPhase = 0;
    this.lastSin = 0; this.onStep = null; this.hit = 0; this.camDist = 0;
  }
  play(name, dur){ this.anim = name; this.t = 0; this.actDur = dur || 1; this.actEnd = true; this._hitDone=false; }
  pose(name){ if(this.anim!==name){ this.anim = name; this.actEnd = false; } }
  setSpec(spec){ this.spec = spec; this.pal = makePalette(spec.colors); }
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
    this.blinkT -= dt; if(this.blinkT<=0 && this.blinkPh<0){ this.blinkPh = 0; }
    if(this.blinkPh>=0){ this.blinkPh += dt; if(this.blinkPh>.16){ this.blinkPh=-1; this.blinkT = 2+Math.random()*4; } }
    const sn = Math.sin(this.cycle);
    if(this.speed>.8 && Math.sign(sn)!==Math.sign(this.lastSin) && this.onStep) this.onStep(this, sn>0?1:-1);
    this.lastSin = sn;
  }
}

class PartSet{
  constructor(scene, geo, mat, outMat, max, cast=true, recv=true){
    this.max = max; this.n = 0;
    this.c = [0,1,2,3,4,5].map(i=>{ const a=new THREE.InstancedBufferAttribute(new Float32Array(max*4),4); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iP'+i,a); return a; });
    this.mesh = new THREE.InstancedMesh(geo,mat,max); this.mesh.count=0; this.mesh.frustumCulled=false; this.mesh.visible=false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = cast; this.mesh.receiveShadow = recv; scene.add(this.mesh);
    this.cast = cast;
    if(outMat){ this.out = new THREE.InstancedMesh(geo,outMat,max); this.out.instanceMatrix = this.mesh.instanceMatrix; this.out.frustumCulled=false; this.out.count=0; this.out.visible=false; scene.add(this.out); }
  }
  push(m, pal, fx=0, fz=0, w=0){
    const i = this.n; if(i>=this.max) return; this.n++;
    m.toArray(this.mesh.instanceMatrix.array, i*16);
    const o=i*4;
    for(let k=0;k<5;k++){ const a=this.c[k].array; a[o]=pal[k*4]; a[o+1]=pal[k*4+1]; a[o+2]=pal[k*4+2]; a[o+3]=pal[k*4+3]; }
    const a5=this.c[5].array; a5[o]=pal[20]; a5[o+1]=fx; a5[o+2]=fz; a5[o+3]=w;
  }
  commit(){
    const n=this.n, v=n>0;
    this.mesh.count = n; this.mesh.visible = v; if(this.out){ this.out.count = n; this.out.visible = v; }
    if(v){ this.mesh.instanceMatrix.needsUpdate = true; for(const a of this.c) a.needsUpdate = true; }
  }
}

const _r=new THREE.Matrix4(), _p=new THREE.Matrix4(), _ch=new THREE.Matrix4(), _H=new THREE.Matrix4(), _a=new THREE.Matrix4(), _k=new THREE.Matrix4(), _t=new THREE.Matrix4(), _o=new THREE.Matrix4();
const _v=new THREE.Vector3();
const T=(m,x,y,z)=>m.multiply(_t.makeTranslation(x,y,z));
const RX=(m,a)=>a?m.multiply(_t.makeRotationX(a)):m;
const RY=(m,a)=>a?m.multiply(_t.makeRotationY(a)):m;
const RZ=(m,a)=>a?m.multiply(_t.makeRotationZ(a)):m;
const S=(m,x,y,z)=>m.multiply(_t.makeScale(x,y,z));
const NOPAL = new Float32Array(24);

const HATS = ['peci','kopiah','hijab','hijabSport','hairShort','hairKid'];
const DRAPES = ['std','long','sport','pashmina'];
const ACCS = ['moustache','beard','goatee','glasses'];

let _sarongTex = null;
export class People{
  constructor(scene, {max=72, D=1, cast=true, name='people'}={}){
    this.scene = scene; this.max = max; this.D = D;
    _sarongTex ??= sarongTexture();
    const mat = personMaterial(), matS = personMaterial({map:_sarongTex}), matF = personMaterial({rim:0});
    const ol = (t,mx=2.0)=>outlineMaterial(t,mx);
    const P = this.parts = {};
    const mk = (key, geo, m, out, n, c=cast, recv=true)=>{ P[key] = new PartSet(scene, geo, m, out, n, c, recv); P[key].mesh.name = name+':'+key; };
    const o1 = ol(.012), oThin = ol(.008,1.4), oHead = ol(.013,2.0);
    const matFace = faceMaterial(faceAtlas());
    for(const v of [0,1]) mk('head'+v, B.buildHead(v,D), matFace, oHead, max, cast, false);
    mk('koko', B.buildTorso('koko',D), mat, o1, max);
    mk('kid', B.buildTorso('kid',D), mat, o1, max);
    mk('gamis', B.buildTorso('gamis',D), mat, o1, max);
    mk('sash', B.buildSash(D), mat, oThin, max);
    mk('arm', B.buildArm(D), mat, oThin, max*2);
    mk('thigh', B.buildThigh(D), mat, oThin, max*2);
    mk('shin', B.buildShin(D), mat, oThin, max*2);
    mk('sarong', B.buildSarong(D), matS, o1, max);
    mk('skirt', B.buildSkirt(D), mat, o1, max);
    for(const h of HATS) mk('hat_'+h, B.buildHat(h,D), mat, o1, max, cast, false);
    for(const d of DRAPES) mk('drape_'+d, B.buildDrape(d,D), mat, o1, max, cast, false);
    for(const a of ACCS) mk('acc_'+a, B.buildAcc(a,D), a==='glasses'?matF:mat, a==='beard'?oThin:null, max, a==='beard', false);
    // ground-tinted blob shadows (always; cheap contact shadow)
    const c = document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    const gr=g.createRadialGradient(32,32,2,32,32,31); gr.addColorStop(0,'rgba(255,255,255,.75)'); gr.addColorStop(.55,'rgba(255,255,255,.4)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr; g.fillRect(0,0,64,64);
    this.blob = new THREE.InstancedMesh(B.buildBlob(), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),color:0x2c2a1c,transparent:true,depthWrite:false,opacity:.55,polygonOffset:true,polygonOffsetFactor:-2}), max);
    this.blob.frustumCulled=false; this.blob.count=0; this.blob.renderOrder=1; this.blob.name=name+':blob'; scene.add(this.blob);
  }
  setCast(b){ for(const k in this.parts){ const s=this.parts[k]; s.mesh.castShadow = b && s.cast; } }
  render(list){
    const P = this.parts; for(const k in P) P[k].n = 0;
    let bn=0; const I = IDX;
    for(const q of list){
      if(!q.visible) continue;
      const p = q.p, sp = q.spec, pal = q.pal, L = q.limb;
      const sx = p[I.sx], sy = p[I.sy], sz = q.size;
      _r.makeTranslation(q.pos.x, q.pos.y+q.jy, q.pos.z); RY(_r,q.yaw); S(_r, sz*sx, sz*sy, sz*sx);
      if(bn<this.max){ const bh = Math.max(0,1-q.jy*.9); _o.makeTranslation(q.pos.x,q.pos.y+.03,q.pos.z); RY(_o,q.yaw); S(_o,(.8*bh+.25)*sz,1,(.95*bh+.25)*sz);
        _o.toArray(this.blob.instanceMatrix.array,bn*16); bn++; }
      // pelvis
      _p.copy(_r); T(_p,0,p[I.py]*L,0); RZ(_p,p[I.pr]); RX(_p,p[I.pp]);
      const bw = sp.bodyW||1, kid = !!sp.kid;
      // legs: thigh + shin (knee)
      for(const s of [-1,1]){
        const right = s<0;
        _a.copy(_p); T(_a,s*.112*bw,0,0); RX(_a,-(right?p[I.lrx]:p[I.llx])); RZ(_a, s*(right?p[I.lrz]:p[I.llz])); S(_a,1,L,1);
        P.thigh.push(_a, pal);
        _k.copy(_a); T(_k,0,-.19,0); RX(_k, right?p[I.krx]:p[I.klx]); if(kid) S(_k,1.18,1,1.18);
        P.shin.push(_k, pal);
      }
      // bottom
      _a.copy(_p); S(_a, p[I.sgW]*bw, p[I.sgS], p[I.sgW]*bw);
      (sp.bottom==='skirt'?P.skirt:P.sarong).push(_a, pal, p[I.fx], p[I.fz]);
      // chest
      const ty = kid ? .86 : 1;
      _ch.copy(_p); RX(_ch,p[I.lean]); RY(_ch,p[I.twist]); RZ(_ch,p[I.roll]); S(_ch,bw,ty,bw);
      _a.copy(_ch); S(_a,1+p[I.breath]*.5,1+p[I.breath],1+p[I.breath]*.5);
      (sp.torso==='gamis'?P.gamis:kid?P.kid:P.koko).push(_a, pal);
      if(sp.sash) P.sash.push(_ch, pal);
      if(sp.hat==='hijab'||sp.hat==='hijabSport') P['drape_'+(sp.drape||'std')].push(_ch, pal, p[I.fx]*.5, p[I.fz]*.6);
      // arms (param: negative = forward); undo chest non-uniform scale for limbs
      const AL = L>.95?1:.9;
      for(const s of [-1,1]){
        const right = s<0;
        _a.copy(_ch); T(_a,s*.214,.345,0); S(_a,1/bw,1/ty,1/bw); RZ(_a, s*(right?p[I.arz]:p[I.alz])); RX(_a, right?p[I.arx]:p[I.alx]); S(_a,kid?1.14:1,AL,kid?1.14:1);
        P.arm.push(_a, pal);
        if(q.wantHands){ (right?q.handR:q.handL).copy(_a).multiply(_t.makeTranslation(0,-.278,.01)); }
      }
      // head (head-centre frame); sunk ~.025 into the collar
      _H.copy(_ch); T(_H,0,.385,0); S(_H,1/bw,1/ty,1/bw); RX(_H,p[I.hx]); RY(_H,p[I.hy]); RZ(_H,p[I.hz]); const hs=q.headScale; S(_H,hs,hs,hs); T(_H,0,.27,0);
      if(sp.headShape) S(_H,sp.headShape[0],sp.headShape[1],sp.headShape[2]);
      _v.set(0,.38,0).applyMatrix4(_H); q.head.copy(_v);
      // painted face state
      const blink = q.blinkPh>=0 ? (1-Math.sin(q.blinkPh/.16*Math.PI)*.94) : 1;
      const eye = p[I.eye], sm = p[I.smile], m = p[I.mouth], oh = p[I.oh];
      let eC = sp.eyeCell ?? (kid?CELL.eyeKid:[CELL.eyeRound,CELL.eyeOval,CELL.eyeGentle][sp.eyes|0]), open = Math.min(1,Math.max(0,eye))*blink;
      if(eye<.3 && q.blinkPh<0){ eC = sm>.68?CELL.eyeHappy:CELL.eyeCalm; open=1; }
      else if(oh>.5){ eC = CELL.eyeWide; }
      let mC = m>.18 ? (sm>.9&&m>.45?CELL.mGrin:CELL.mTalk) : oh>.5 ? CELL.mO : sm<.32 ? CELL.mFlat : (sp.catSmile&&sm<.8?CELL.mCat:CELL.mSmile);
      const code = faceCode(eC, mC, sp.brow ?? CELL.browAngled, sp.cheek ?? (kid?CELL.cheekKid:CELL.cheekBlush), open);
      P['head'+(sp.head|0)].push(_H, pal, 0, 0, code);
      (P['hat_'+sp.hat]||P.hat_hairShort).push(_H, pal);
      if(sp.acc) for(const a of sp.acc) P['acc_'+a]?.push(_H, pal);
    }
    for(const k in P) P[k].commit();
    this.blob.count = bn; this.blob.visible = bn>0; this.blob.instanceMatrix.needsUpdate = true;
  }
}

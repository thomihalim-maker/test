// Marbot hero: the player character rebuilt from assets/ref/marbot-ref.png with the img2threejs process
// (reconstruction-by-code: measured landmarks -> sculpt spec -> procedural geometry, verified by screenshot comparison).
//
// One SkinnedMesh (one toon material: palette uniforms + canvas tartan / embroidery / painted-face atlas) + one
// inverted-hull outline + one contact blob = 3 draw calls (+1 shadow pass). ~10k triangles.
//
// Units: game rig space at size 1 (ground y=0, peci top 1.41, +Z forward, character left = +X); the game scales the
// root by player.size (1.18) exactly like the old instanced rig, so colliders, camera, prop grips and reach are kept.
//
// Named joints (THREE.Bone, all Object3D pivots):
//   root > hips > { sarong, spine > { chest, neck > head, shoulderL > elbowL > handL, shoulderR > elbowR > handR },
//                   hipL > kneeL > footL, hipR > kneeR > footR }
// Sockets: hero.sockets.handL / handR (prop grip points, children of the hand joints).
// poseHero(hero, person) maps the legacy 31-channel pose (anims.js) onto these joints (2-bone arm IK onto the legacy
// straight-arm hand target, so every existing pose and prop grip still lines up) and writes person.handR/handL/head.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { gradientMap, OUTLINE_U } from './toon.js';
import { IDX } from './anims.js';

// ------------------------------------------------------------------ skeleton
export const BONES = ['root','hips','sarong','spine','chest','neck','head','shoulderL','elbowL','handL','shoulderR','elbowR','handR','hipL','kneeL','footL','hipR','kneeR','footR'];
const BI = {}; BONES.forEach((n,i)=>BI[n]=i);
const PARENT = { hips:'root', sarong:'hips', spine:'hips', chest:'spine', neck:'spine', head:'neck', shoulderL:'spine', elbowL:'shoulderL', handL:'elbowL',
  shoulderR:'spine', elbowR:'shoulderR', handR:'elbowR', hipL:'hips', kneeL:'hipL', footL:'kneeL', hipR:'hips', kneeR:'hipR', footR:'kneeR' };
const SH_X = .17, SH_Y = .725, EL_X = .30, WR_X = .415, HIP_X = .095;     // bind joints (T-pose, from the reference)
const JP = { root:[0,0,0], hips:[0,.40,0], sarong:[0,.37,0], spine:[0,.405,0], chest:[0,.41,0], neck:[0,.785,0], head:[0,.79,0],
  shoulderL:[SH_X,SH_Y,0], elbowL:[EL_X,SH_Y,0], handL:[WR_X,SH_Y,0], shoulderR:[-SH_X,SH_Y,0], elbowR:[-EL_X,SH_Y,0], handR:[-WR_X,SH_Y,0],
  hipL:[HIP_X,.40,0], kneeL:[HIP_X,.21,0], footL:[HIP_X,.02,0], hipR:[-HIP_X,.40,0], kneeR:[-HIP_X,.21,0], footR:[-HIP_X,.02,0] };
const ARM_A = .13, ARM_B = .165;              // shoulder->elbow, elbow->grip (wrist .115 + palm .05)

// palette slots (uPal): 0 fixed white, 1 skin, 2 koko, 3 sarong, 4 peci, 5 sandal, 6 trim (buttons), 7 hair
const SL = { FIX:0, SKIN:1, KOKO:2, SARONG:3, PECI:4, SHOE:5, TRIM:6, HAIR:7 };
// surface modes: 0 plain, 1 tartan uv, 2 koko front (embroidery projection), 3 painted face projection
const MODE = { PLAIN:0, TARTAN:1, EMB:2, FACE:3 };

// reference look (sampled from the reference, de-lit by eye)
export const HERO_LOOK = { skin:0xe8b896, koko:0xf1ebe1, sarong:0x57a33a, peci:0x151518, shoe:0x5a3e2e, trim:0xf3eee4, hair:0x2a1d16 };
const REF_SARONGS = new Set([0x57a33a, 0x1f7a63, 0x2f7d6c]);    // default/klasik look -> the reference tartan

// face decal rect (bind space) and embroidery rect
const FACE = { x0:-.19, y0:.85, w:.38, h:.32 };
const EMB = { x0:-.1, y0:.53, w:.2, h:.27 };
const EYE_Y = 1.04;

// ------------------------------------------------------------------ geometry builder
const sstep = (a,b,x)=>{ x = Math.min(1, Math.max(0, (x-a)/(b-a))); return x*x*(3-2*x); };
const clamp = (x,a,b)=>Math.min(b, Math.max(a, x));
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s3 = new THREE.Vector3(), _c = new THREE.Color();

class HB {
  constructor(){ this.list = []; }
  // o: { slot, tone|color, mode, bone | w(x,y,z)->[[boneIdx,weight],...], flex(x,y,z), pos, rot, scale, smooth }
  add(g, o={}){
    if(o.smooth){ for(const k of Object.keys(g.attributes)) if(k!=='position') g.deleteAttribute(k); g = mergeVertices(g, 1e-5); }
    if(o.scale || o.rot || o.pos){
      let sc = o.scale ?? 1; if(typeof sc==='number') sc = [sc,sc,sc];
      const [rx=0,ry=0,rz=0] = o.rot||[]; _e.set(rx,ry,rz,o.order||'XYZ'); _q.setFromEuler(_e);
      _m4.compose(_v.set(...(o.pos||[0,0,0])), _q, _s3.set(...sc)); g.applyMatrix4(_m4);
    }
    if(o.deform){ const p = g.attributes.position; for(let i=0;i<p.count;i++){ const r = o.deform(p.getX(i),p.getY(i),p.getZ(i)); p.setXYZ(i,r[0],r[1],r[2]); } }
    if(o.smooth || o.deform || !g.attributes.normal) g.computeVertexNormals();
    if(o.flipNormals){ const n = g.attributes.normal; for(let i=0;i<n.count;i++) n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i)); const ix = g.index.array; for(let i=0;i<ix.length;i+=3){ const t=ix[i+1]; ix[i+1]=ix[i+2]; ix[i+2]=t; } }
    for(const k of Object.keys(g.attributes)) if(!['position','normal','uv'].includes(k)) g.deleteAttribute(k);
    const n = g.attributes.position.count, pos = g.attributes.position;
    if(!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n*2),2));
    if(o.uv){ const uv = g.attributes.uv; for(let i=0;i<n;i++){ const r = o.uv(pos.getX(i),pos.getY(i),pos.getZ(i)); uv.setXY(i,r[0],r[1]); } }
    if(!g.index){ const ix = new (n>65535?Uint32Array:Uint16Array)(n); for(let i=0;i<n;i++) ix[i]=i; g.setIndex(new THREE.BufferAttribute(ix,1)); }
    _c.set(o.color ?? 0xffffff); if(typeof o.tone==='number') _c.setRGB(o.tone,o.tone,o.tone,THREE.LinearSRGBColorSpace);
    const col = new Float32Array(n*3), smf = new Float32Array(n*3), si = new Uint16Array(n*4), sw = new Float32Array(n*4);
    for(let i=0;i<n;i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      col[i*3]=_c.r; col[i*3+1]=_c.g; col[i*3+2]=_c.b;
      smf[i*3] = o.slot||0; smf[i*3+1] = o.mode||0; smf[i*3+2] = o.flex ? o.flex(x,y,z) : 0;
      let ws = o.w ? o.w(x,y,z) : [[BI[o.bone||'root'],1]];
      ws = ws.filter(a=>a[1]>1e-4).sort((a,b)=>b[1]-a[1]).slice(0,4);
      let t = 0; for(const a of ws) t += a[1]; if(t<=0){ ws=[[BI.root,1]]; t=1; }
      ws.forEach((a,k)=>{ si[i*4+k]=a[0]; sw[i*4+k]=a[1]/t; });
    }
    g.setAttribute('color', new THREE.BufferAttribute(col,3));
    g.setAttribute('aSMF', new THREE.BufferAttribute(smf,3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si,4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw,4));
    this.list.push(g);
    return this;
  }
  build(){ if(HB.keepParts) HB.parts = this.list.slice(); const g = mergeGeometries(this.list, false); g.computeBoundingSphere(); return g; }
}

// ring loft along +Y. rings: [y, rx, rz, cx=0, cz=0]; superellipse exponent n (2 = ellipse); seam at the back.
function loft(rings, seg, { n=2, a0=-Math.PI, a1=Math.PI, capTop=false, capBot=false, capDy=.012 }={}){
  const pos = [], idx = [], R = rings.length, cols = seg+1;
  for(const [y,rx,rz,cx=0,cz=0,nn=n] of rings) for(let j=0;j<=seg;j++){
    const a = a0 + (a1-a0)*j/seg, s = Math.sin(a), c = Math.cos(a);
    const k = Math.pow(Math.pow(Math.abs(s),nn)+Math.pow(Math.abs(c),nn), -1/nn);
    pos.push(cx + rx*s*k, y, cz + rz*c*k);
  }
  for(let i=0;i<R-1;i++) for(let j=0;j<seg;j++){ const A=i*cols+j, B=A+cols; idx.push(A,A+1,B, B,A+1,B+1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx);
  // ring order bottom->top with angle from back through right(-x), front, left(+x): verify the side faces outward
  g.computeVertexNormals();
  let p = g.attributes.position, nrm = g.attributes.normal; const t = Math.floor(R/2)*cols + Math.floor(seg/2);
  const [,,, cxm=0, czm=0] = rings[Math.floor(R/2)];
  if((p.getX(t)-cxm)*nrm.getX(t) + (p.getZ(t)-czm)*nrm.getZ(t) < 0) for(let i=0;i<idx.length;i+=3){ const q=idx[i+1]; idx[i+1]=idx[i+2]; idx[i+2]=q; }
  // caps (slightly coned), wound so their normal faces away from the solid (+Y top, -Y bottom)
  const cap = (ring, up)=>{ const [y,,,cx=0,cz=0] = rings[ring]; const ci = pos.length/3; pos.push(cx, y + (up?capDy:-capDy), cz);
    for(let j=0;j<seg;j++){ const A = ring*cols+j, B = A+1;
      const ax=pos[A*3]-cx, az=pos[A*3+2]-cz, bx=pos[B*3]-cx, bz=pos[B*3+2]-cz, ny = az*bx - ax*bz;   // y of (A-c)x(B-c)
      if((ny>0) === up) idx.push(ci,A,B); else idx.push(ci,B,A); } };
  if(capTop) cap(R-1, true); if(capBot) cap(0, false);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  p = g.attributes.position; nrm = g.attributes.normal;
  // weld the seam normals
  if(a1-a0 > 6.28) for(let i=0;i<R;i++){ const A=i*cols, B=A+seg; _v.set(nrm.getX(A)+nrm.getX(B), nrm.getY(A)+nrm.getY(B), nrm.getZ(A)+nrm.getZ(B)).normalize(); nrm.setXYZ(A,_v.x,_v.y,_v.z); nrm.setXYZ(B,_v.x,_v.y,_v.z); }
  return g;
}
const sph = (r=1,w=16,h=12)=>new THREE.SphereGeometry(r,w,h);

// ------------------------------------------------------------------ weights
const W = (name)=>[[BI[name],1]];
function wSarong(x,y,z){
  const t = clamp((.37-y)/(.37-.09),0,1), f = sstep(0,.45,t), k = sstep(.55,.95,t);
  const r = Math.hypot(x,z)||1, sL = sstep(-.5,.5,x/r), L = f*sL, R = f*(1-sL);
  const c = sstep(.37,.52,y);            // the band above the waist (under the koko) bends with the chest like the koko hem
  return [[BI.chest,c],[BI.sarong,(1-f)*(1-c)],[BI.hipL,L*(1-k)],[BI.kneeL,L*k],[BI.hipR,R*(1-k)],[BI.kneeR,R*k]];
}
function wKoko(x,y,z){ const c = sstep(.37,.52,y); return [[BI.chest,c],[BI.hips,1-c]]; }
function wSleeve(x,y,z){
  const ax = Math.abs(x), L = x>0, s = sstep(SH_X-.025, SH_X+.045, ax), e = sstep(EL_X-.03, EL_X+.03, ax);
  return [[BI.spine,1-s],[BI[L?'shoulderL':'shoulderR'],s*(1-e)],[BI[L?'elbowL':'elbowR'],s*e]];
}
function wNeck(x,y,z){ const h = sstep(.775,.83,y); return [[BI.spine,1-h],[BI.head,h]]; }

// ------------------------------------------------------------------ the sculpt (one merged geometry)
function buildGeometry(D=1){
  const S = (n)=>Math.max(6, Math.round(n*D));
  const b = new HB();

  // ---- head: one continuous deformed ellipsoid (half-w .198, half-h .216, depth .19), cheeks fuller below centre
  const HC = 1.035;
  b.add(sph(1,S(46),S(34)).rotateY(-Math.PI/2), { smooth:true, slot:SL.SKIN, mode:MODE.FACE, bone:'head',
    deform:(x,y,z)=>{ const ch = Math.exp(-(((y+.42)/.42)**2));
      let X = x*.19*(1+.045*ch), Y = y*.216, Z = z*.19*(1+.035*ch);
      if(z<0) Z *= 1.06;                                 // fuller back of the skull
      if(z>0) Z *= 1 - .07*Math.max(0, z)*(1-Math.abs(y)); // slightly flattened face plane (decal reads cleaner)
      return [X, HC+Y, Z]; } });
  // nose bulb
  b.add(sph(1,S(12),S(9)), { smooth:true, scale:[.024,.018,.018], pos:[0,.99,.184], slot:SL.SKIN, mode:MODE.FACE, tone:.97, flex:()=>-1, bone:'head' });
  // ears: flattened round auricles angled forward, C-shaped rim, warmer inner bowl
  for(const s of [-1,1]){
    // auricle: a thick round disc facing forward-outward, rim bulge + recessed warm concha
    b.add(sph(1,S(18),S(14)), { smooth:true, scale:[.024,.074,.048], rot:[0,-s*.85,s*-.1], order:'YXZ', pos:[s*.218,.975,-.025], slot:SL.SKIN, tone:.98, bone:'head' });
    b.add(sph(1,S(12),S(10)), { smooth:true, scale:[.009,.036,.02], rot:[0,-s*.85,s*-.1], order:'YXZ', pos:[s*.232,.97,-.014], slot:SL.SKIN, color:0xeaa892, flex:()=>-1, bone:'head' });
  }
  // ---- hair: shell over the skull below/inside the peci + fringe tufts
  { const cols=S(48), rows=S(10), pos=[], idx=[];
    const line = (a)=>{ const A = Math.abs(a);          // lower hairline (theta from top) per azimuth; 0 = front
      if(A<.5) return .3; if(A<1.1) return .3 + (A-.5)/.6*.2; if(A<1.3) return .5 + (A-1.1)/.2*.04;
      if(A<1.9) return .54 - Math.sin((A-1.3)/.6*Math.PI)*.04; return .54 + (A-1.9)/(Math.PI-1.9)*.24; };
    for(let j=0;j<=cols;j++){ const a = -Math.PI + 2*Math.PI*j/cols, th1 = line(a)*Math.PI;
      for(let i=0;i<=rows;i++){ const th = th1*i/rows, sy = Math.cos(th), sxz = Math.sin(th);
        const bulge = 1.13 - .08*Math.max(0,(th-1.0))/(1.0) ;         // voluminous at the temples (under the peci rim)
        pos.push(Math.sin(a)*sxz*.198*bulge, HC + sy*.216*1.03, Math.cos(a)*sxz*.19*(a>-1.6&&a<1.6?1.0:1.1)*Math.min(1.1,bulge)); } }
    for(let j=0;j<cols;j++) for(let i=0;i<rows;i++){ const A=j*(rows+1)+i, B=A+rows+1; idx.push(A,B,A+1, B,B+1,A+1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
    // outward check
    const n = g.attributes.normal; const t = Math.floor(cols/2)*(rows+1)+rows; if(n.getZ(t) < 0){ const ix=g.index.array; for(let i=0;i<ix.length;i+=3){ const q=ix[i+1]; ix[i+1]=ix[i+2]; ix[i+2]=q; } g.computeVertexNormals(); }
    b.add(g, { slot:SL.HAIR, bone:'head' });
  }
  // fringe: short pointed tufts peeking under the front peci rim; sideburn wedges in front of the ears
  for(const [x,y,len,rz,w] of [[-.1,1.19,.042,.4,.04],[-.035,1.185,.046,.12,.045],[.035,1.185,.044,-.15,.045],[.1,1.19,.042,-.42,.04]]){
    const z = .19*Math.sqrt(Math.max(0,1-(x/.2)**2-((y-HC)/.22)**2))+.004;
    b.add(new THREE.ConeGeometry(w,len,S(8),1), { rot:[Math.PI-.42,0,rz], order:'XYZ', scale:[1.2,1,.38], pos:[x,y-len*.3,z], slot:SL.HAIR, bone:'head' });
  }
  for(const s of [-1,1]) b.add(new THREE.ConeGeometry(.022,.055,S(8),1), { rot:[Math.PI,0,s*-.12], scale:[1,1,.55], pos:[s*.18,1.015,.07], slot:SL.HAIR, bone:'head' });
  // ---- peci (songkok): tapered flat-top oval, tilted back, closed bottom
  { const pts = [[.0,.004],[.226,.0],[.229,.018],[.206,.19],[.198,.214],[.184,.226],[.12,.231],[.0,.232]].map(p=>new THREE.Vector2(p[0],p[1]));
    b.add(new THREE.LatheGeometry(pts, S(36)), { smooth:true, scale:[1,1,1.07], rot:[-.2,0,0], pos:[0,1.168,-.012], slot:SL.PECI, bone:'head' }); }

  b.add(new THREE.TorusGeometry(1,.0075,S(5),S(40)), { rot:[Math.PI/2-.2,0,0], scale:[.229,.245,1], pos:[0,1.172,-.008], slot:SL.PECI, color:0x6a6a74, bone:'head' });
  // ---- neck stub (hidden in the collar)
  b.add(new THREE.CylinderGeometry(.052,.058,.11,S(14),1,true), { pos:[0,.815,-.005], slot:SL.SKIN, tone:.78, w:wNeck });
  // ---- koko torso: boxy superellipse loft, shoulder .745 -> hem .355, slight hem flare; closed shoulder cap
  const TOR = [[.352,.1775,.1432],[.37,.1762,.1418],[.42,.1712,.1381],[.52,.166,.134],[.62,.166,.134],[.7,.166,.133],[.745,.162,.128],[.775,.146,.112],[.794,.105,.084],[.802,.07,.066]];
  b.add(loft(TOR, S(40), { n:2.5, capTop:true, capBot:true }), { slot:SL.KOKO, mode:MODE.EMB, w:wKoko });
  // hem lip (rolled edge)
  b.add(new THREE.TorusGeometry(1,.008,S(5),S(40)), { rot:[Math.PI/2,0,0], scale:[.176,.142,1], pos:[0,.356,0], slot:SL.KOKO, tone:.94, w:wKoko });
  // stand collar with a front V notch
  b.add(loft([[.785,.074,.07],[.81,.072,.068],[.83,.068,.064],[.836,.063,.059]], S(30), { a0:.2, a1:Math.PI*2-.2 }), { slot:SL.KOKO, tone:.97, bone:'chest' });
  b.add(loft([[.785,.064,.06],[.83,.06,.056]], S(30), { a0:.2, a1:Math.PI*2-.2 }), { flipNormals:true, slot:SL.KOKO, tone:.8, flex:()=>-1, bone:'chest' });
  // dark V notch in the collar front
  b.add(new THREE.ConeGeometry(.012,.034,S(6),1), { rot:[Math.PI,0,0], scale:[1,1,.3], pos:[0,.818,.066], slot:SL.FIX, color:0x6e4a3a, flex:()=>-1, bone:'chest' });
  // placket plate (raised, outlined) with pointed end + 3 domed buttons
  { const sh = new THREE.Shape(); const w=.0185, top=.79, bot=.6, tip=.585;
    sh.moveTo(-w,top); sh.lineTo(w,top); sh.lineTo(w,bot); sh.lineTo(0,tip); sh.lineTo(-w,bot); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,curveSegments:2});
    // bend onto the torso front (z = front surface at that height)
    b.add(g, { deform:(x,y,z)=>[x, y, z + .1325 - (x*x)*1.6], slot:SL.KOKO, tone:.985, mode:MODE.PLAIN, flex:()=>-1, bone:'chest' }); }
  for(const y of [.776,.741,.706]) b.add(sph(1,S(9),S(6)), { smooth:true, scale:[.0105,.0105,.006], pos:[0,y,.1425], slot:SL.TRIM, tone:.98, flex:()=>-1, bone:'chest' });
  // ---- sleeves (T-pose bind, along X): root inside the torso, cuff with a slight flare + dark inner opening
  for(const s of [-1,1]){
    const R = [[.135,.064,.06],[.17,.062,.058],[.21,.059,.056],[.26,.056,.053],[.31,.053,.05],[.36,.051,.048],[.4,.049,.047],[.413,.052,.05]];
    const g = loft(R.map(r=>[r[0],r[1],r[2]]), S(18), {});
    g.rotateZ(-s*Math.PI/2); g.translate(0, SH_Y, 0);          // +Y -> +X (left) / -X (right)
    b.add(g, { slot:SL.KOKO, w:wSleeve });
    b.add(new THREE.TorusGeometry(.0505,.006,S(5),S(18)), { rot:[0,Math.PI/2,0], scale:[1,1,.96], pos:[s*.414,SH_Y,0], slot:SL.KOKO, tone:.95, bone:s>0?'elbowL':'elbowR' });
    b.add(new THREE.CircleGeometry(.047,S(14)), { rot:[0,s*Math.PI/2,0], pos:[s*.409,SH_Y,0], slot:SL.FIX, color:0x8a7060, bone:s>0?'elbowL':'elbowR' });
    // hand: mitten palm + finger block + thumb (palm down, fingers outward); wrist inside the cuff
    const H = s>0?'handL':'handR';
    b.add(new THREE.CylinderGeometry(.03,.034,.06,S(12)), { rot:[0,0,Math.PI/2], scale:[1,1,1.05], pos:[s*.42,SH_Y-.002,0], slot:SL.SKIN, bone:H });
    b.add(sph(1,S(14),S(10)), { smooth:true, scale:[.05,.03,.042], pos:[s*.462,SH_Y-.004,0], slot:SL.SKIN, bone:H });
    b.add(sph(1,S(14),S(10)), { smooth:true, scale:[.055,.023,.04], pos:[s*.515,SH_Y-.01,-.003], rot:[0,0,s*-.1], slot:SL.SKIN, tone:.98, bone:H });
    b.add(new THREE.CapsuleGeometry(.015,.035,2,S(8)), { rot:[Math.PI/2,s*-.7,0], order:'YXZ', pos:[s*.468,SH_Y-.002,.042], slot:SL.SKIN, tone:.97, bone:H });
  }
  // ---- legs (thighs hidden; shins/ankles show under the hem when walking)
  for(const s of [-1,1]){
    const L = s>0?'L':'R';
    b.add(new THREE.CapsuleGeometry(.054,.15,2,S(10)), { pos:[s*HIP_X,.305,0], slot:SL.SKIN, tone:.9, bone:'hip'+L });
    b.add(new THREE.CapsuleGeometry(.036,.15,2,S(10)), { pos:[s*HIP_X,.125,0], slot:SL.SKIN, bone:'knee'+L });
    // foot + toes
    b.add(sph(1,S(14),S(10)), { smooth:true, scale:[.05,.03,.08], pos:[s*(HIP_X+.01),.048,.03], slot:SL.SKIN, bone:'foot'+L });
    for(let t=0;t<5;t++){ const sz = t===0?.017:.012-.0008*t;
      b.add(sph(1,S(7),S(5)), { smooth:true, scale:[sz,sz*.8,sz*1.1], pos:[s*(HIP_X+.01) + s*(-.025+t*.0125), .035, .1 - Math.abs(t-1)*.006], slot:SL.SKIN, tone:.98, bone:'foot'+L }); }
    // flip-flop sole (rounded rect) + V thong strap
    const sole = new THREE.Shape(); { const w=.06, l0=-.06, l1=.128, r=.05;
      sole.moveTo(-w+r*.4,l0); sole.lineTo(w-r*.4,l0); sole.quadraticCurveTo(w,l0,w,l0+r*.6); sole.lineTo(w,l1-r); sole.quadraticCurveTo(w,l1,0,l1); sole.quadraticCurveTo(-w,l1,-w,l1-r); sole.lineTo(-w,l0+r*.6); sole.quadraticCurveTo(-w,l0,-w+r*.4,l0); }
    const sg = new THREE.ExtrudeGeometry(sole,{depth:.02,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,curveSegments:4});
    b.add(sg, { rot:[Math.PI/2,0,0], pos:[s*(HIP_X+.01),.023,0], slot:SL.SHOE, tone:.82, bone:'foot'+L });
    const fx = s*(HIP_X+.01);
    for(const k of [-1,1]){ const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(fx+k*.055,.026,.0), new THREE.Vector3(fx+k*.046,.062,.035), new THREE.Vector3(fx+s*.012*-1+k*.004,.058,.078), new THREE.Vector3(fx-s*.012,.03,.098)]);
      b.add(new THREE.TubeGeometry(curve,S(10),.0085,S(5),false), { slot:SL.SHOE, tone:.62, bone:'foot'+L }); }
  }
  // ---- sarong: straight tartan tube waist -> mid-shin, skinned to hips/thighs/knees; front overlap fold; inner hem
  const SAR = [[.083,.168,.148],[.11,.168,.148],[.16,.167,.147],[.22,.166,.146],[.28,.164,.144],[.32,.162,.142],[.345,.158,.134],[.38,.148,.124],[.45,.142,.118],[.52,.136,.112]];
  const tUV = (x,y,z)=>{ const a = Math.atan2(x,z); return [(a/(Math.PI*2)+.5)*.97/.25, y/.25]; };
  const flex = (x,y,z)=>Math.pow(Math.max(0,(.36-y)/.27),1.5);
  b.add(loft(SAR, S(44), {}), { slot:SL.FIX, mode:MODE.TARTAN, uv:tUV, w:wSarong, flex });
  // inner hem shell (seen from below/behind when the legs swing)
  b.add(loft([[.083,.165,.145],[.17,.16,.14]], S(30), {}), { flipNormals:true, slot:SL.FIX, mode:MODE.TARTAN, tone:.55, uv:tUV, w:wSarong, flex });
  // hem roll
  b.add(new THREE.TorusGeometry(1,.0055,S(4),S(44)), { rot:[Math.PI/2,0,0], scale:[.168,.148,1], pos:[0,.084,0], slot:SL.FIX, mode:MODE.TARTAN, tone:.9, uv:tUV, w:wSarong, flex });
  // front overlap fold: a raised flap over the character-left front with a crease line
  b.add(loft([[.085,.1735,.1535],[.2,.1715,.1515],[.3,.169,.149],[.34,.164,.141]], S(8), { a0:.06, a1:.42 }), { slot:SL.FIX, mode:MODE.TARTAN, uv:tUV, tone:.97, w:wSarong, flex });
  b.add(new THREE.CylinderGeometry(.0035,.0035,.25,S(5)), { pos:[Math.sin(.06)*.174,.218,Math.cos(.06)*.154], slot:SL.FIX, mode:MODE.TARTAN, uv:tUV, tone:.5, w:wSarong, flex });
  return b.build();
}

// debug/QA: the unmerged part geometries (bind pose), used by the img2threejs self-intersection gate
export function heroPartGeometries(D=1){ HB.keepParts = true; buildGeometry(D); HB.keepParts = false; const p = HB.parts; HB.parts = null; return p; }

// ------------------------------------------------------------------ canvas textures
function tartanTexture(base){
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const img = g.createImageData(S,S), d = img.data;
  let G, B, N, P, Y;
  if(REF_SARONGS.has(base)){ G=[88,166,58]; B=[55,70,178]; N=[24,34,74]; P=[232,236,200]; Y=[226,214,92]; }
  else { const col = new THREE.Color(base), hsl = {}; col.getHSL(hsl);
    const mk = (h,s,l)=>{ const o = new THREE.Color().setHSL(((h%1)+1)%1, clamp(s,0,1), clamp(l,0,1)); return [o.r*255,o.g*255,o.b*255].map(v=>Math.round(Math.pow(v/255,1/2.2)*255)); };
    G = mk(hsl.h, hsl.s*1.05, Math.max(.3,hsl.l)); B = mk(hsl.h+.28, hsl.s*.9, hsl.l*.75); N = mk(hsl.h+.3, .5, .15); P = [232,232,210]; Y = mk(.14,.7,.62); }
  // one sett = 64px: ground, a wide blue band with navy edges, pale + yellow pinstripes
  const sett = new Array(64);
  for(let i=0;i<64;i++){ let col = G;
    if(i>=6 && i<28) col = B; if(i===5||i===6||i===27||i===28) col = N; if(i===16) col = N;
    if(i===40||i===41) col = P; if(i===52) col = Y; if(i>=46 && i<49) col = [G[0]*.72,G[1]*.72,G[2]*.72];
    sett[i] = col; }
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){
    const a = sett[x&63], b = sett[y&63], tw = ((x+y)&3)<2 ? .58 : .42;          // 2/2 twill
    const o = (y*S+x)*4; d[o]=a[0]*tw+b[0]*(1-tw); d[o+1]=a[1]*tw+b[1]*(1-tw); d[o+2]=a[2]*tw+b[2]*(1-tw); d[o+3]=255; }
  g.putImageData(img,0,0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function embroideryTexture(){
  const Wd = 256, Ht = Math.round(256*EMB.h/EMB.w), c = document.createElement('canvas'); c.width = Wd; c.height = Ht; const g = c.getContext('2d');
  const X = (x)=>(x-EMB.x0)/EMB.w*Wd, Y = (y)=>(EMB.y0+EMB.h-y)/EMB.h*Ht;
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  // placket border (double line) with pointed end
  g.lineWidth = 2.2;
  for(const o of [0,.007]){ const w = .0215+o; g.beginPath(); g.moveTo(X(-w),Y(.775)); g.lineTo(X(-w),Y(.6-o*.4)); g.lineTo(X(0),Y(.583-o*1.4)); g.lineTo(X(w),Y(.6-o*.4)); g.lineTo(X(w),Y(.775)); g.stroke(); }
  // scrolling vine on both sides: S-curls stacked down the placket
  for(const s of [-1,1]){
    g.lineWidth = 2.4;
    for(let i=0;i<7;i++){ const y = .765 - i*.027, x = s*.046;
      g.beginPath(); g.arc(X(x), Y(y), 5.5, s>0?Math.PI*.2:Math.PI*.8, s>0?Math.PI*1.7:Math.PI*-.7, s<0); g.stroke();
      g.beginPath(); g.moveTo(X(x+s*.008), Y(y-.004)); g.quadraticCurveTo(X(x+s*.02), Y(y-.014), X(x+s*.004), Y(y-.022)); g.stroke();
      g.beginPath(); g.ellipse(X(x-s*.012), Y(y-.013), 2.2, 4, s*.5, 0, Math.PI*2); g.fill(); }
    // yoke tendrils from the collar out to the shoulders
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(X(s*.035),Y(.785)); g.quadraticCurveTo(X(s*.06),Y(.775),X(s*.072),Y(.787)); g.quadraticCurveTo(X(s*.086),Y(.797),X(s*.095),Y(.784)); g.stroke();
    for(const k of [.05,.075]){ g.beginPath(); g.arc(X(s*k),Y(.774),3,0,Math.PI*2); g.stroke(); }
  }
  // bottom ornament
  g.lineWidth = 2.2; g.beginPath(); g.moveTo(X(-.03),Y(.572)); g.quadraticCurveTo(X(0),Y(.548),X(.03),Y(.572)); g.stroke();
  for(const k of [-1,0,1]){ g.beginPath(); g.ellipse(X(k*.016),Y(.556-(k?0:.006)),3,5.5,k*.6,0,Math.PI*2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// painted face atlas: 4x3 cells of 256px covering FACE rect. Cells:
// 0 base (brows, blush, nostrils) | 1 eyes open | 2 eyes half | 3 eyes happy ^^ | 4 eyes calm (closed) | 5 eyes wide
// 6 grin (toothy, reference) | 7 smile | 8 talk | 9 O | 10 flat | 11 laugh
export const FCELL = { base:0, eyeOpen:1, eyeHalf:2, eyeHappy:3, eyeCalm:4, eyeWide:5, mGrin:6, mSmile:7, mTalk:8, mO:9, mFlat:10, mLaugh:11 };
function faceTexture(){
  const C = 256, cols = 4, rows = 3, c = document.createElement('canvas'); c.width = C*cols; c.height = C*rows; const g = c.getContext('2d');
  const X = (x)=>(x-FACE.x0)/FACE.w*C, Y = (y)=>(FACE.y0+FACE.h-y)/FACE.h*C, PX = C/FACE.w, PY = C/FACE.h;
  const INK = '#2b1a12';
  const cell = (i, f)=>{ g.save(); g.translate((i%cols)*C, ((i/cols)|0)*C); g.beginPath(); g.rect(1,1,C-2,C-2); g.clip(); g.lineCap='round'; g.lineJoin='round'; f(); g.restore(); };
  const eyes = (f)=>{ for(const s of [-1,1]) f(X(s*.09), Y(EYE_Y), s); };
  cell(0, ()=>{
    for(const s of [-1,1]){ // blush
      const cx = X(s*.132), cy = Y(.94), r = .062*PX;
      const gr = g.createRadialGradient(cx,cy,1,cx,cy,r); gr.addColorStop(0,'rgba(236,104,96,.5)'); gr.addColorStop(.55,'rgba(236,110,100,.26)'); gr.addColorStop(1,'rgba(236,120,110,0)');
      g.fillStyle = gr; g.save(); g.scale(1,.8); g.beginPath(); g.arc(cx,cy/.8,r,0,Math.PI*2); g.fill(); g.restore();
      // thin arched brow
      g.strokeStyle = '#3a2418'; g.lineWidth = .0095*PY;
      g.beginPath(); g.moveTo(X(s*.058),Y(1.118)); g.quadraticCurveTo(X(s*.092),Y(1.15),X(s*.13),Y(1.116)); g.stroke();
      // nostril shading under the nose bulb
      g.fillStyle = 'rgba(150,80,60,.45)'; g.beginPath(); g.ellipse(X(s*.009),Y(.976),.004*PX,.003*PY,0,0,Math.PI*2); g.fill();
    }
  });
  const ovalEye = (cx,cy,s,k=1)=>{ const rx = .0155*PX*k, ry = .0235*PY*k;
    const gr = g.createLinearGradient(cx,cy-ry,cx,cy+ry); gr.addColorStop(0,'#050505'); gr.addColorStop(1,'#241c18');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx+s*rx*.28, cy-ry*.42, rx*.34, ry*.24, 0, 0, Math.PI*2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(cx-s*rx*.3, cy+ry*.5, rx*.14, 0, Math.PI*2); g.fill(); };
  cell(1, ()=>eyes((cx,cy,s)=>ovalEye(cx,cy,s)));
  cell(5, ()=>eyes((cx,cy,s)=>ovalEye(cx,cy-2,s,1.25)));
  cell(2, ()=>eyes((cx,cy,s)=>{ g.save(); g.beginPath(); g.rect(cx-30,cy-2,60,60); g.clip(); ovalEye(cx,cy,s); g.restore();
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(cx-.019*PX,cy-1); g.lineTo(cx+.019*PX,cy-1); g.stroke(); }));
  cell(3, ()=>eyes((cx,cy,s)=>{ g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(cx,cy+.012*PY,.018*PX,Math.PI*1.15,Math.PI*1.85); g.stroke(); }));
  cell(4, ()=>eyes((cx,cy,s)=>{ g.strokeStyle = INK; g.lineWidth = 5.5; g.beginPath(); g.arc(cx,cy-.01*PY,.017*PX,Math.PI*.15,Math.PI*.85); g.stroke(); }));
  const MY = Y(.926), MX = X(0), mw = .06*PX;
  const mouthShape = (top, bot, cornerUp)=>{ g.beginPath(); g.moveTo(MX-mw, MY-cornerUp); g.quadraticCurveTo(MX, MY-top, MX+mw, MY-cornerUp); g.quadraticCurveTo(MX+mw*.6, MY+bot, MX, MY+bot); g.quadraticCurveTo(MX-mw*.6, MY+bot, MX-mw, MY-cornerUp); g.closePath(); };
  cell(6, ()=>{ // toothy grin (reference): wide D-shaped opening, tall white upper-teeth band, a hint of lower teeth
    mouthShape(-3, 26, 9); g.fillStyle = '#4a1816'; g.fill();
    g.save(); mouthShape(-3, 26, 9); g.clip();
    g.fillStyle = '#fbf9f4'; g.beginPath(); g.moveTo(MX-mw, MY-14); g.lineTo(MX+mw, MY-14); g.lineTo(MX+mw, MY+6); g.quadraticCurveTo(MX, MY+15, MX-mw, MY+6); g.fill();
    g.strokeStyle = 'rgba(190,180,170,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(MX-mw*.7, MY+6); g.quadraticCurveTo(MX, MY+12, MX+mw*.7, MY+6); g.stroke();
    g.fillStyle = '#e9e4dc'; g.beginPath(); g.ellipse(MX, MY+24, mw*.5, 5, 0, 0, Math.PI*2); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(140,60,50,.85)'; g.lineWidth = 2; mouthShape(-3, 26, 9); g.stroke(); });
  cell(7, ()=>{ g.strokeStyle = '#7a3428'; g.lineWidth = 5; g.beginPath(); g.moveTo(MX-mw*.85, MY-6); g.quadraticCurveTo(MX, MY+12, MX+mw*.85, MY-6); g.stroke(); });
  cell(8, ()=>{ mouthShape(-4, 22, 4); g.fillStyle = '#5a1f1c'; g.fill(); g.save(); mouthShape(-4,22,4); g.clip();
    g.fillStyle = '#fbf8f2'; g.fillRect(MX-mw, MY-12, mw*2, 9); g.fillStyle = '#e8737f'; g.beginPath(); g.ellipse(MX, MY+18, mw*.5, 8, 0, 0, Math.PI*2); g.fill(); g.restore(); });
  cell(9, ()=>{ g.fillStyle = '#5a1f1c'; g.beginPath(); g.ellipse(MX, MY+4, 10, 13, 0, 0, Math.PI*2); g.fill(); });
  cell(10, ()=>{ g.strokeStyle = '#7a3428'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(MX-mw*.5, MY+2); g.quadraticCurveTo(MX, MY+6, MX+mw*.5, MY+2); g.stroke(); });
  cell(11, ()=>{ mouthShape(-4, 30, 9); g.fillStyle = '#5a1f1c'; g.fill(); g.save(); mouthShape(-4,30,9); g.clip();
    g.fillStyle = '#fbf8f2'; g.beginPath(); g.moveTo(MX-mw, MY-14); g.lineTo(MX+mw, MY-14); g.lineTo(MX+mw, MY+2); g.quadraticCurveTo(MX, MY+9, MX-mw, MY+2); g.fill();
    g.fillStyle = '#e8737f'; g.beginPath(); g.ellipse(MX, MY+26, mw*.55, 9, 0, 0, Math.PI*2); g.fill(); g.restore(); });
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ------------------------------------------------------------------ materials
const PAL_GLSL = `uniform vec3 uPal[8]; attribute vec3 aSMF; vec3 palOf(float s){ return uPal[int(s+0.5)]; }`;
const SHADOW_BIAS = `#include <shadowmap_vertex>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  for(int i=0;i<NUM_DIR_LIGHT_SHADOWS;i++){
    vec4 swp = worldPosition + vec4(shadowWorldNormal * (directionalLightShadows[i].shadowNormalBias + 0.07), 0.0);
    vDirectionalShadowCoord[i] = directionalShadowMatrix[i] * swp;
  }
#endif`;
function heroMaterial(U){
  const m = new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradientMap(), vertexColors:true });
  m.onBeforeCompile = (sh)=>{
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        ${PAL_GLSL}
        uniform vec2 uFlex; varying vec3 vSM; varying vec2 vBind; varying float vNz; varying vec2 vTUV;`)
      .replace('#include <color_vertex>', 'vColor = color.rgb * palOf(aSMF.x);')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.xz += uFlex * max(aSMF.z, 0.0);
        vSM = aSMF; vBind = position.xy; vNz = normal.z; vTUV = uv;`)
      .replace('#include <shadowmap_vertex>', SHADOW_BIAS);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uTartan, uEmb, uFace; uniform vec4 uFaceRect, uEmbRect, uCells; uniform vec3 uEmbTint;
        varying vec3 vSM; varying vec2 vBind; varying float vNz; varying vec2 vTUV;
        vec4 cellS(float idx, vec2 uv){
          if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0) return vec4(0.0);
          float col = mod(idx, 4.0), row = floor(idx/4.0);
          return texture2D(uFace, vec2((col+uv.x)/4.0, (row+1.0-uv.y)/3.0));
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float md = floor(vSM.y + 0.5);
        if(md > 0.5 && md < 1.5){ diffuseColor.rgb *= texture2D(uTartan, vTUV).rgb; }
        else if(md > 1.5 && md < 2.5){
          vec2 e = (vBind - uEmbRect.xy) / uEmbRect.zw;
          if(e.x>0.0 && e.y>0.0 && e.x<1.0 && e.y<1.0 && vNz>0.25){ float a = texture2D(uEmb, vec2(e.x, 1.0-e.y)).a * smoothstep(0.25,0.45,vNz);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uEmbTint, a); }
        } else if(md > 2.5){
          vec2 f = (vBind - uFaceRect.xy) / uFaceRect.zw; float fm = smoothstep(0.05, 0.3, vNz);
          if(fm > 0.0){
            vec4 c = cellS(0.0, f); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb, c.a*fm);
            vec2 eu = f; float ev = ${((EYE_Y-FACE.y0)/FACE.h).toFixed(4)}; eu.y = ev + (eu.y-ev)/max(uCells.z, 0.06);
            c = cellS(uCells.x, eu); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb, c.a*fm);
            c = cellS(uCells.y, f); diffuseColor.rgb = mix(diffuseColor.rgb, c.rgb, c.a*fm);
          }
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float fr = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
          totalEmissiveRadiance += pow(fr,3.0) * 0.15 * vec3(1.0,0.84,0.66) * diffuseColor.rgb; }`)
      .replace('#include <opaque_fragment>', `
        { float sl = floor(vSM.x+0.5); float cloth = (sl==2.0||sl==4.0||sl==6.0||floor(vSM.y+0.5)==1.0) ? 1.0 : 0.0;
          float lb = dot(diffuseColor.rgb, vec3(.333)) + 1e-3;
          float shd = 1.0 - clamp(dot(outgoingLight, vec3(.333)) / lb, 0.0, 1.0);
          outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.9,0.86,1.06), cloth * clamp(shd*1.2,0.0,1.0) * 0.8); }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = ()=>'marbotHero1';
  return m;
}
function heroOutline(U, thick=.011, maxPx=2.0, minPx=.7){
  const m = new THREE.MeshBasicMaterial({ color:0xffffff, side:THREE.BackSide, vertexColors:true });
  m.onBeforeCompile = (sh)=>{
    Object.assign(sh.uniforms, { uPal:U.uPal, uFlex:U.uFlex, uRes:OUTLINE_U.uRes, uDpr:OUTLINE_U.uDpr });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform vec2 uRes; uniform float uDpr; uniform vec2 uFlex; ${PAL_GLSL}`)
      .replace('#include <color_vertex>', `{ vec3 pc = color.rgb * palOf(aSMF.x); if(aSMF.y > 0.5 && aSMF.y < 1.5) pc = vec3(0.25,0.4,0.3);
          vColor = mix(vec3(0.17,0.10,0.07), pc*vec3(0.30,0.24,0.26), 0.55); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.xz += uFlex * max(aSMF.z, 0.0);`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 p1 = projectionMatrix * modelViewMatrix * vec4(transformed + normalize(objectNormal)*0.02, 1.0);
          vec2 a = gl_Position.xy/gl_Position.w, b = p1.xy/p1.w;
          vec2 d = (b-a) * uRes * 0.5; float L = length(d);
          vec2 dir = L>1e-5 ? d/L : vec2(0.0);
          float px = aSMF.z < -0.5 ? 0.0 : clamp(L*(${thick.toFixed(4)}/0.02), ${minPx.toFixed(2)}*uDpr, ${maxPx.toFixed(2)}*uDpr);
          gl_Position.xy += dir * px * 2.0 / uRes * gl_Position.w; }`);
  };
  m.customProgramCacheKey = ()=>'marbotHeroOutline1';
  return m;
}

// ------------------------------------------------------------------ public builder
let _geoCache = null;
export function buildMarbotHero({ look = {}, outline = true, castShadow = true, D = 1 } = {}){
  const geo = (D===1 && _geoCache) ? _geoCache : buildGeometry(D); if(D===1) _geoCache = geo;
  const U = {
    uPal:{ value: Array.from({length:8},()=>new THREE.Color(1,1,1)) }, uFlex:{ value:new THREE.Vector2() },
    uTartan:{ value:null }, uEmb:{ value:embroideryTexture() }, uFace:{ value:faceTexture() },
    uFaceRect:{ value:new THREE.Vector4(FACE.x0, FACE.y0, FACE.w, FACE.h) }, uEmbRect:{ value:new THREE.Vector4(EMB.x0, EMB.y0, EMB.w, EMB.h) },
    uEmbTint:{ value:new THREE.Vector3(.84,.81,.75) }, uCells:{ value:new THREE.Vector4(FCELL.eyeOpen, FCELL.mGrin, 1, 0) },
  };
  const group = new THREE.Group(); group.name = 'marbotHero';
  // bones (bind pose = T-pose of the reference)
  const joints = {};
  for(const n of BONES){ const b = new THREE.Bone(); b.name = n; joints[n] = b; }
  for(const n of BONES){ const b = joints[n], p = PARENT[n], jp = JP[n], pp = p ? JP[p] : [0,0,0];
    b.position.set(jp[0]-pp[0], jp[1]-pp[1], jp[2]-pp[2]); (p ? joints[p] : group).add(b); }
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(BONES.map(n=>joints[n]));
  const mat = heroMaterial(U);
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.name = 'marbotHero:body';
  mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.bind(skeleton, new THREE.Matrix4()); group.add(mesh);
  let hull = null;
  if(outline){ hull = new THREE.SkinnedMesh(geo, heroOutline(U)); hull.name = 'marbotHero:outline'; hull.frustumCulled = false; hull.bind(skeleton, new THREE.Matrix4()); group.add(hull); }
  // contact blob (ground plane, follows the group but not the jump)
  const bc = document.createElement('canvas'); bc.width = bc.height = 64; { const g = bc.getContext('2d'); const gr = g.createRadialGradient(32,32,2,32,32,31);
    gr.addColorStop(0,'rgba(255,255,255,.75)'); gr.addColorStop(.55,'rgba(255,255,255,.4)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,0,64,64); }
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(bc), color:0x2c2a1c, transparent:true, depthWrite:false, opacity:.55, polygonOffset:true, polygonOffsetFactor:-2 }));
  blob.name = 'marbotHero:blob'; blob.renderOrder = 1; blob.position.y = .03; group.add(blob);
  // prop sockets (palm centre, slightly in front)
  const sockets = {};
  for(const [n,s] of [['handL',1],['handR',-1]]){ const o = new THREE.Object3D(); o.name = 'socket_'+n; o.position.set(s*(ARM_B-(WR_X-EL_X)), -.004, .01); joints[n].add(o); sockets[n] = o; }
  const hero = { group, mesh, outline:hull, blob, skeleton, joints, sockets, uniforms:U, lookKey:'',
    stats:{ triangles: geo.index.count/3, vertices: geo.attributes.position.count, drawCalls: 1 + (hull?1:0) + 1 },
    setLook(l){ setLook(hero, l); }, setFace(f){ setFace(hero, f); }, dispose(){ geo.dispose(); mat.dispose(); hull?.material.dispose(); U.uTartan.value?.dispose(); U.uEmb.value.dispose(); U.uFace.value.dispose(); } };
  group.userData.sculptRuntime = { joints, sockets, bones:BONES.slice(), stats:hero.stats, source:'img2threejs spec marbot-hero (assets/ref/marbot-ref.png)' };
  setLook(hero, look);
  return hero;
}

// img2threejs rig payload (validate_rig_payload.py): bind joints, parents, local matrices, packed skin
export function rigPayload(hero){
  const B = hero.skeleton.bones, g = hero.mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  hero.group.updateMatrixWorld(true);
  return { schemaVersion:1, coordinateSystem:{ up:'Y', handedness:'right', unit:'game-unit (rig space, size 1)' },
    joints: BONES.map(n=>JP[n]), parents: BONES.map(n=>PARENT[n] ? BI[PARENT[n]] : null), names: BONES.slice(),
    matrix_local: B.map(b=>Array.from(b.matrix.elements)),
    skinIndex: Array.from({length:si.count},(_,i)=>[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)]),
    skinWeight: Array.from({length:sw.count},(_,i)=>[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)]) };
}
export function setLook(hero, look={}){
  const l = { ...HERO_LOOK, ...look }, key = JSON.stringify(l); if(key===hero.lookKey) return; hero.lookKey = key;
  const P = hero.uniforms.uPal.value, hex = (v)=>typeof v==='string' ? new THREE.Color(v).getHex() : v;
  P[0].setRGB(1,1,1); P[1].set(hex(l.skin)); P[2].set(hex(l.koko)); P[3].set(hex(l.sarong)); P[4].set(hex(l.peci)); P[5].set(hex(l.shoe)); P[6].set(hex(l.trim ?? l.koko)); P[7].set(hex(l.hair));
  // trim defaults to a cream that sits on the koko (the reference buttons/embroidery are tone-on-tone)
  if(look.trim==null || hex(look.trim)===0xd4a84a) P[6].set(hex(l.koko)).multiplyScalar(.97);
  const sar = hex(l.sarong);
  if(hero._sar !== sar){ hero._sar = sar; hero.uniforms.uTartan.value?.dispose(); hero.uniforms.uTartan.value = tartanTexture(sar); }
}
// f: { eye: cell, mouth: cell, open: 0..1 }
export function setFace(hero, f){ const c = hero.uniforms.uCells.value; if(f.eye!=null) c.x = f.eye; if(f.mouth!=null) c.y = f.mouth; if(f.open!=null) c.z = f.open; }

// ------------------------------------------------------------------ legacy pose -> joints
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _Qa = new THREE.Quaternion(), _Qb = new THREE.Quaternion(), _E = new THREE.Euler();
const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _D = new THREE.Vector3(), _P = new THREE.Vector3(), _U = new THREE.Vector3(), _F = new THREE.Vector3(), _Z = new THREE.Vector3(), _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _El = new THREE.Vector3(), _G = new THREE.Vector3();
const _HL = new THREE.Vector3(), _HR = new THREE.Vector3(), _Qs = new THREE.Quaternion(), _Vp = new THREE.Vector3(), _Vs = new THREE.Vector3(), _one = new THREE.Vector3(1,1,1);
const OLD_SH = [.214, .345], OLD_ARM = .278, SPINE_DY = JP.spine[1] - JP.hips[1];   // legacy chest frame = pelvis origin
function basisQuat(xAxis, zHint, out){
  _Z.copy(zHint).addScaledVector(xAxis, -zHint.dot(xAxis));
  if(_Z.lengthSq()<1e-6) _Z.set(0,0,1).addScaledVector(xAxis, -xAxis.z);
  _Z.normalize(); _Y.crossVectors(_Z, xAxis);
  _M.makeBasis(xAxis, _Y, _Z); return out.setFromRotationMatrix(_M);
}
// s=+1 left, -1 right. ax/az = legacy alx/alz (left) or arx/arz (right). Writes the arm joints; returns the legacy frame quat in _Qa.
function solveArm(H, s, ax, az, earBlend, over=null, overW=0){
  const sh = H.joints[s>0?'shoulderL':'shoulderR'], el = H.joints[s>0?'elbowL':'elbowR'], hd = H.joints[s>0?'handL':'handR'];
  _E.set(ax, 0, s*az, 'ZXY'); _Qa.setFromEuler(_E);                       // legacy straight-arm frame (chest space)
  _T.set(0, -OLD_ARM, .01).applyQuaternion(_Qa).add(_P.set(s*OLD_SH[0], OLD_SH[1] - SPINE_DY, 0));
  if(earBlend>0) _T.lerp(_G.set(s*.285, .56, .055), earBlend);           // adzan: open hands right beside the ears
  if(over && overW>0) _T.lerp(over, overW);                               // e.g. sujud: palms flat on the mat
  _S.set(s*SH_X, SH_Y-JP.spine[1], 0);
  _D.subVectors(_T, _S); let d = _D.length(); const dir = _D.multiplyScalar(1/Math.max(d,1e-5));
  d = clamp(d, .06, ARM_A+ARM_B-1e-4);
  const cosA = clamp((ARM_A*ARM_A + d*d - ARM_B*ARM_B)/(2*ARM_A*d), -1, 1), sinA = Math.sqrt(1-cosA*cosA);
  _P.set(s*.45, -.3, -1).normalize(); _P.addScaledVector(dir, -_P.dot(dir));
  if(_P.lengthSq()<1e-6) _P.set(s,0,0).addScaledVector(dir,-dir.x*s); _P.normalize();
  _U.copy(dir).multiplyScalar(cosA).addScaledVector(_P, sinA);            // upper-arm direction
  _El.copy(_S).addScaledVector(_U, ARM_A);
  _F.copy(_S).addScaledVector(dir, d).sub(_El).normalize();               // forearm direction
  _Z.set(0,0,1).applyQuaternion(_Qa); const zh = _G.copy(_Z);
  _X.copy(_U).multiplyScalar(s); basisQuat(_X, zh, sh.quaternion);
  _X.copy(_F).multiplyScalar(s); basisQuat(_X, zh, _Qb);
  el.quaternion.copy(sh.quaternion).invert().multiply(_Qb);
  hd.quaternion.identity();
}
const FC = FCELL;
export function poseHero(H, q){
  const p = q.p, I = IDX, J = H.joints;
  H.group.visible = q.visible !== false;
  H.group.position.copy(q.pos); H.group.rotation.set(0, q.yaw, 0);
  const sz = q.size, L = q.limb || 1;
  J.root.position.set(0, q.jy, 0); J.root.scale.set(sz*p[I.sx], sz*p[I.sy], sz*p[I.sx]);
  { const bh = Math.max(0, 1-q.jy*.9); H.blob.scale.set((.8*bh+.25)*sz, 1, (.95*bh+.25)*sz); }
  J.hips.position.y = p[I.py]*L; J.hips.rotation.set(p[I.pp], 0, p[I.pr], 'ZXY');
  // sarong: the cloth follows the thighs/knees through its skin weights; fx/fz add the trailing flex
  J.sarong.rotation.set(-p[I.fz]*.35, 0, p[I.fx]*.35);
  H.uniforms.uFlex.value.set(p[I.fx]*.3, p[I.fz]*.3);
  // sujud: the reference head is smaller than the legacy one, so bow a little deeper to bring the forehead to the mat
  const suj = clamp((p[I.pp]-.35)/.15, 0, 1) * clamp((p[I.lean]-.5)/.3, 0, 1);
  J.spine.rotation.set(p[I.lean] + .2*suj, p[I.twist], p[I.roll], 'XYZ');
  const br = p[I.breath]; J.chest.scale.set(1+br*.5, 1+br, 1+br*.5);
  J.head.rotation.set(p[I.hx] + .35*suj, p[I.hy], p[I.hz], 'XYZ'); J.head.scale.setScalar(q.headScale || 1);
  // legs (legacy: RX(-llx) RZ(s*llz) at the hip, RX(klx) at the knee); feet kept roughly level
  J.hipL.rotation.set(-p[I.llx], 0, p[I.llz], 'XZY'); J.hipR.rotation.set(-p[I.lrx], 0, -p[I.lrz], 'XZY');
  J.kneeL.rotation.set(p[I.klx], 0, 0); J.kneeR.rotation.set(p[I.krx], 0, 0);
  J.footL.rotation.set(clamp(p[I.llx]-p[I.klx]-p[I.pp], -.55, .45), 0, 0);
  J.footR.rotation.set(clamp(p[I.lrx]-p[I.krx]-p[I.pp], -.55, .45), 0, 0);
  // arms: 2-bone IK onto the legacy straight-arm hand target (so every pose + prop grip keeps lining up)
  const adz = q.anim==='adzan' ? clamp((p[I.alz]-.3)/1.9, 0, 1) : 0;
  let ovL = null, ovR = null;
  if(suj>0){                                     // palms on the mat either side of the head (character space -> spine space)
    H.group.updateMatrixWorld(true);
    J.head.getWorldPosition(_Vs); J.root.worldToLocal(_Vs); const hz = _Vs.z;
    ovL = _HL.set(.15, .03, hz - .04); J.root.localToWorld(ovL); J.spine.worldToLocal(ovL);
    ovR = _HR.set(-.15, .03, hz - .04); J.root.localToWorld(ovR); J.spine.worldToLocal(ovR);
  }
  solveArm(H,  1, p[I.alx], p[I.alz], adz, ovL, suj); _Qs.copy(_Qa);
  solveArm(H, -1, p[I.arx], p[I.arz], adz, ovR, suj);
  H.group.updateMatrixWorld(true);
  // prop frames: legacy arm orientation (what props.js expects) at the new grip sockets
  if(q.wantHands){
    J.spine.getWorldQuaternion(_Q);
    for(const [k,qa] of [['handL',_Qs],['handR',_Qa]]){
      H.sockets[k].getWorldPosition(_Vp); _Qb.copy(_Q).multiply(qa);
      (k==='handL'?q.handL:q.handR).compose(_Vp, _Qb, _one);
    }
  }
  _Vp.set(0, .625, 0); J.head.localToWorld(_Vp); q.head.copy(_Vp);
  // painted face state (same rules as the instanced rig, mapped onto the hero's cells)
  const blink = q.blinkPh>=0 ? (1-Math.sin(q.blinkPh/.16*Math.PI)*.94) : 1;
  const eye = p[I.eye], sm = p[I.smile], m = p[I.mouth], oh = p[I.oh];
  let eC = FC.eyeOpen, open = clamp(eye,0,1)*blink;
  if(eye<.3 && q.blinkPh<0){ eC = sm>.68 ? FC.eyeHappy : FC.eyeCalm; open = 1; }
  else if(oh>.5) eC = FC.eyeWide;
  else if(eye<.7 && q.blinkPh<0){ eC = FC.eyeHalf; open = 1; }
  const mC = m>.18 ? (sm>.9 && m>.45 ? FC.mLaugh : FC.mTalk) : oh>.5 ? FC.mO : sm<.32 ? FC.mFlat : sm<.45 ? FC.mSmile : FC.mGrin;
  const c = H.uniforms.uCells.value; c.x = eC; c.y = mC; c.z = open;
}

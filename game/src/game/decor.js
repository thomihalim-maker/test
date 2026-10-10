// Placeable decorations: procedural meshes merged per kind (one InstancedMesh per kind), glowing slot markers,
// screen-space tap picking. Slots are typed (ground | floor | wall | ceil) and gated by masjid stage, so the hall and
// porch can be decorated too. Empty kinds are hidden (no draw call); ~2 calls per visible kind at most.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PL = 0.7; // masjid plinth top (src/masjid/stages.js)
// lv = Berkah level that unlocks it; price in coins; fits = slot types it can stand in; zone = shop grouping hint
export const DECOR_KINDS = [
  { id:'pot',      lv:1, price:25, icon:'pot',      r:.38, fits:['ground','floor'], zone:'both',   name:['Pot Bunga','Flower Pot'],          desc:['Bunga warna-warni','Colourful flowers'] },
  { id:'lantern',  lv:2, price:40, icon:'lantern',  r:.25, fits:['ground','floor'], zone:'both',   name:['Lentera','Lantern'],                desc:['Menyala saat malam','Glows at night'] },
  { id:'banner',   lv:3, price:35, icon:'banner',   r:.15, fits:['ground'],         zone:'plaza',  name:['Umbul-umbul','Festive Banner'],     desc:['Berkibar ditiup angin','Flutters in the wind'] },
  { id:'bench',    lv:4, price:60, icon:'bench',    r:.75, fits:['ground','floor'], zone:'both',   name:['Bangku Kayu','Wooden Bench'],       desc:['Tempat jamaah beristirahat','A seat for visitors'] },
  { id:'umbrella', lv:5, price:70, icon:'umbrella', r:.6,  fits:['ground'],         zone:'plaza',  name:['Payung Teduh','Shade Umbrella'],    desc:['Teduh di siang terik','Shade on hot days'] },
  { id:'ketupat',  lv:6, price:55, icon:'ketupat',  r:.5,  fits:['ground'],         zone:'plaza',  name:['Hiasan Ketupat','Ketupat Garland'], desc:['Hiasan hari raya','Festive Eid ornament'] },
  // masjid decorations (hall + porch)
  { id:'karpet',   lv:1, price:30, icon:'carpet',   r:0,   fits:['floor'],          zone:'masjid', name:['Permadani','Rug'],                  desc:['Permadani bermotif untuk lantai masjid','A patterned rug for the masjid floor'] },
  { id:'ketupatG', lv:1, price:25, icon:'ketupat',  r:0,   fits:['ceil'],           zone:'masjid', name:['Ketupat Gantung','Hanging Ketupat'], desc:['Untaian ketupat untuk Idul Adha','Ketupat strings for Eid'] },
  { id:'palem',    lv:2, price:35, icon:'plant',    r:.4,  fits:['ground','floor'], zone:'both',   name:['Palem Pot','Potted Palm'],          desc:['Daun palem yang segar','Fresh palm leaves'] },
  { id:'lampu',    lv:2, price:45, icon:'lamp',     r:0,   fits:['ceil'],           zone:'masjid', name:['Lampu Gantung','Hanging Lamp'],     desc:['Lampu kuningan yang hangat','A warm brass lamp'] },
  { id:'lampion',  lv:3, price:30, icon:'lampion',  r:0,   fits:['ceil'],           zone:'masjid', name:['Lampion','Lampion'],                desc:['Lampion bulat merah-emas','A round red-gold lampion'] },
  { id:'panel',    lv:3, price:50, icon:'panel',    r:0,   fits:['wall'],           zone:'masjid', name:['Panel Arabesk','Arabesque Panel'],  desc:['Ukiran bintang delapan','An eight-point star carving'] },
];
export const ZONE_LABEL = { plaza:['Plaza','Plaza'], masjid:['Masjid','Masjid'], both:['Plaza & Masjid','Plaza & Masjid'] };

// Slots: [id, x, z, ry, meta?]; meta {t:'ground'|'floor'|'wall'|'ceil', y? (absolute, wall/ceil), st: min masjid stage, zone}
// Outdoor slots are kept off the masjid footprint, paths and pen fence; masjid slots sit in the hall/porch (ry faces the room).
const F = (zone, st) => ({ t:'floor', st, zone }), W = (y, zone) => ({ t:'wall', y, st:2, zone }), Cl = (y, zone) => ({ t:'ceil', y, st:2, zone });
export const SLOTS = [
  ['p1',-4.6,12.4,Math.PI],['p2',4.6,12.4,Math.PI],['p3',-10.6,12.8,Math.PI*.8],['p4',8.4,10.6,-Math.PI*.8],
  ['p5',-13.6,1.6,Math.PI/2],['p6',13.6,.6,-Math.PI/2],['p7',-13.2,-9.2,Math.PI*.3],['p8',13.2,-9.2,-Math.PI*.3],
  ['p9',-6.8,-13.2,0],['p10',6.8,-13.2,0],['p11',0,-14.4,0],
  ['w1',12.6,8.6,Math.PI],['w2',13.8,3.4,0],['w3',16.6,2.6,0],
  ['k1',21,-1.8,0],['k2',26,-1.8,0],['k3',31,-1.8,0],['k4',21,13.8,Math.PI],['k5',26,13.8,Math.PI],['k6',31,13.8,Math.PI],
  ['k7',35.9,3,-Math.PI/2],['k8',35.9,9,-Math.PI/2],
  ['d1',-19.2,10.6,Math.PI*.6],['d2',-18.8,17,Math.PI*.4],['d3',-28.5,8.5,-Math.PI*.2],['d4',-24,20.5,Math.PI],
  // hall floor corners (stage 2: walls) — clear of the mihrab, mimbar and prayer rows
  ['h1',-4.3,-7.0,0,F('hall',2)],['h2',4.35,-7.0,0,F('hall',2)],['h3',-4.3,1.4,Math.PI,F('hall',2)],['h4',4.3,1.4,Math.PI,F('hall',2)],
  // porch floor (stage 1: plinth)
  ['s1',-4.5,4.2,0,F('porch',1)],['s2',4.5,4.2,0,F('porch',1)],['s3',-7.5,4.0,Math.PI/2,F('porch',1)],['s4',7.5,4.0,-Math.PI/2,F('porch',1)],
  ['s5',-7.3,7.6,Math.PI,F('porch',1)],['s6',7.3,7.6,Math.PI,F('porch',1)],
  // walls: north wall beside the mihrab, porch facade either side of the door
  ['hw1',-2.55,-7.47,0,W(PL+2.3,'hall')],['pw1',-2.0,2.53,0,W(PL+2.4,'porch')],['pw2',2.0,2.53,0,W(PL+2.4,'porch')],
  // ceilings: hall ceiling underside PL+4.0, veranda beam underside PL+3.27 (hanging kinds drop at most ~1m)
  ['hc1',-3.0,-6.4,0,Cl(PL+4.0,'hall')],['hc2',-3.0,.9,0,Cl(PL+4.0,'hall')],['hc3',3.0,.9,0,Cl(PL+4.0,'hall')],
  ['pc1',-1.6,6.1,0,Cl(PL+3.27,'porch')],['pc2',1.6,6.1,0,Cl(PL+3.27,'porch')],['pc3',4.5,6.1,0,Cl(PL+3.27,'porch')],
];
const ZONE_OF_PREFIX = id => id[0]==='k' ? 'pen' : id[0]==='d' ? 'pond' : 'plaza';
export const slotMeta = s => s[4] || { t:'ground', st:0, zone:ZONE_OF_PREFIX(s[0]) };
const SLOT_BY_ID = new Map(SLOTS.map(s=>[s[0],s]));
export const kindOf = id => DECOR_KINDS.find(k=>k.id===id) || null;
export function slotFits(kind, slotId){ const k=kindOf(kind), s=SLOT_BY_ID.get(slotId); return !!(k&&s&&k.fits.includes(slotMeta(s).t)); }
/** slot ids that fit the kind and exist at this masjid stage */
export function slotsFor(kind, stage=99){ const k=kindOf(kind); if(!k) return []; return SLOTS.filter(s=>{ const m=slotMeta(s); return k.fits.includes(m.t) && (m.st|0)<=stage; }).map(s=>s[0]); }
export const slotZone = id => { const s=SLOT_BY_ID.get(id); return s ? slotMeta(s).zone : null; };

const C = h => new THREE.Color(h);
function part(g, col, x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1){
  g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), new THREE.Vector3(sx,sy,sz)));
  const n = g.attributes.position.count, a = new Float32Array(n*3);
  const cols = Array.isArray(col) ? col.map(C) : null, c = cols ? null : C(col);
  for(let i=0;i<n;i++){ const cc = cols ? cols[Math.floor(i/3) % cols.length] : c; // per-triangle colours when an array is given
    const k = .9 + .1 * (g.attributes.normal ? Math.max(0, g.attributes.normal.getY(i)) : 1); // a touch of fake top light
    a[i*3]=cc.r*k; a[i*3+1]=cc.g*k; a[i*3+2]=cc.b*k; }
  g.setAttribute('color', new THREE.BufferAttribute(a,3)); return g;
}
const box = (w,h,d) => new THREE.BoxGeometry(w,h,d);
const cyl = (rt,rb,h,s=8,open=false) => new THREE.CylinderGeometry(rt,rb,h,s,1,open);
const lathe = (pts, seg=12) => new THREE.LatheGeometry(pts.map(([x,y])=>new THREE.Vector2(x,y)), seg);
// an arching palm/fern frond: tapered strip bent down along its length, x = across, y = along
function frond(len=1.1, w=.26, droop=.55){
  const g = new THREE.PlaneGeometry(w, len, 2, 6); const p = g.attributes.position;
  for(let i=0;i<p.count;i++){ const v=(p.getY(i)+len/2)/len, x=p.getX(i)*(1-v*.85)*(1+.25*Math.sin(v*14));
    p.setXYZ(i, x, v*len*.75, -(v*v)*len*droop + Math.abs(x)*.5); }
  g.computeVertexNormals(); return g;
}

function build(kind){
  const P = [], glow = [];
  if(kind==='pot'){
    P.push(part(cyl(.34,.24,.42,10),'#c8693a',0,.21), part(new THREE.TorusGeometry(.33,.05,6,14),'#dc8250',0,.42,0,Math.PI/2),
      part(cyl(.3,.3,.04,10),'#6b4426',0,.41), part(new THREE.IcosahedronGeometry(.36,1),'#5fae4a',0,.72,0,0,0,0,1,.85,1),
      part(new THREE.IcosahedronGeometry(.24,1),'#74c55a',.14,.92,.06));
    const fc=['#ff7aa2','#ffd34a','#ffffff','#ff9a3d','#c08bff','#ff7aa2'];
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+.3, r=.3; P.push(part(new THREE.IcosahedronGeometry(.075,0),fc[i],Math.cos(a)*r,.8+(i%2)*.14,Math.sin(a)*r)); }
  } else if(kind==='lantern'){
    P.push(part(cyl(.22,.28,.16,8),'#b9ad98',0,.08), part(box(.11,1.75,.11),'#6b4a2e',0,.96), part(box(.36,.06,.36),'#3d2a1c',0,1.84));
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) P.push(part(box(.035,.42,.035),'#3d2a1c',sx*.16,2.05,sz*.16));
    P.push(part(new THREE.ConeGeometry(.32,.24,4),'#2f8f7e',0,2.38,0,0,Math.PI/4), part(new THREE.IcosahedronGeometry(.05,0),'#ffc83d',0,2.53));
    glow.push(part(box(.26,.36,.26),'#ffffff',0,2.05));
  } else if(kind==='banner'){
    P.push(part(cyl(.045,.06,3.7,6),'#d8b46a',0,1.85));
    for(const y of [.8,1.7,2.6]) P.push(part(cyl(.062,.062,.06,6),'#a8843a',0,y));
    P.push(part(box(.6,.04,.04),'#a8843a',.26,3.55));
    const bc=['#e8483f','#ffffff','#ffc83d','#35b5a5','#e8483f','#ffffff'];
    for(let i=0;i<6;i++) P.push(part(box(.4,.36,.02),bc[i],.3,3.36-i*.36));
    P.push(part(new THREE.ConeGeometry(.2,.4,3),'#ffc83d',.3,1.0,0,Math.PI,0,0,1,1,.1));
  } else if(kind==='bench'){
    P.push(part(box(1.4,.08,.44),'#b07a45',0,.46), part(box(1.4,.3,.06),'#a06a38',0,.78,-.2), part(box(1.4,.05,.07),'#c58a50',0,.95,-.2));
    for(const sx of [-.6,.6]) for(const sz of [-.16,.16]) P.push(part(box(.08,.46,.08),'#6b4a2e',sx,.23,sz));
    for(const sx of [-.66,.66]) P.push(part(box(.07,.06,.4),'#8a5a32',sx,.64,0), part(box(.06,.2,.06),'#6b4a2e',sx,.55,.16));
  } else if(kind==='umbrella'){
    P.push(part(cyl(.04,.04,2.35,6),'#f3ead6',0,1.18), part(new THREE.ConeGeometry(1.2,.55,8,1,true),['#e8483f','#e8483f','#fff6e0','#fff6e0'],0,2.5),
      part(new THREE.IcosahedronGeometry(.07,0),'#ffc83d',0,2.8), part(cyl(.46,.46,.06,14),'#c58a50',0,.72), part(cyl(.06,.1,.7,6),'#8a5a32',0,.36));
    for(const sx of [-.85,.85]) P.push(part(cyl(.19,.17,.42,10),'#35b5a5',sx,.21));
  } else if(kind==='ketupat'){
    for(const sx of [-.75,.75]) P.push(part(box(.1,2.1,.1),'#8a5a32',sx,1.05), part(cyl(.12,.14,.1,6),'#b9ad98',sx,.05));
    P.push(part(box(1.7,.09,.09),'#a06a38',0,2.05));
    const kc=['#8bc34a','#ffd34a','#8bc34a'];
    for(let i=0;i<3;i++){ const x=(i-1)*.5, L=.3+(i%2)*.18;
      P.push(part(box(.015,L,.015),'#e8d2a0',x,2.0-L/2), part(new THREE.OctahedronGeometry(.17,0),kc[i],x,2.0-L-.17,0,0,Math.PI/4,0,1,1.25,1),
        part(new THREE.ConeGeometry(.04,.16,4),'#ffd34a',x,2.0-L-.42,0,Math.PI)); }
  } else if(kind==='karpet'){
    // permadani 1.6 x 1.0: maroon border, cream band, deep teal field, gold octagon medallion + corner diamonds, white fringe
    P.push(part(box(1.6,.016,1.0),'#8a1f2d',0,.008), part(box(1.44,.02,.84),'#f2e2bf',0,.01), part(box(1.32,.024,.72),'#1f6b6a',0,.012));
    P.push(part(cyl(.27,.27,.03,8),'#d9a028',0,.015,0,0,Math.PI/8), part(cyl(.19,.19,.034,8),'#8a1f2d',0,.017,0,0,Math.PI/8), part(cyl(.08,.08,.038,8),'#f2e2bf',0,.019));
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]) P.push(part(box(.13,.03,.13),'#d9a028',sx*.5,.015,sz*.24,0,Math.PI/4));
    for(const sx of [-1,1]) for(let i=0;i<9;i++) P.push(part(box(.06,.008,.025),'#fff8ea',sx*.83,.004,(i-4)*.105));
    for(let i=0;i<7;i++) for(const sz of [-1,1]) P.push(part(box(.05,.03,.05),'#d9a028',(i-3)*.19,.012,sz*.385,0,Math.PI/4));
  } else if(kind==='palem'){
    // glazed teal pot + three short trunk rings + eight arching fronds
    P.push(part(lathe([[0,0],[.22,0],[.3,.12],[.33,.36],[.28,.46],[.31,.5],[0,.5]],12),'#2f8f86'),
      part(new THREE.TorusGeometry(.3,.035,6,14),'#e8c34a',0,.47,0,Math.PI/2), part(cyl(.27,.27,.03,10),'#5a3a22',0,.48));
    for(let i=0;i<3;i++) P.push(part(cyl(.07-i*.008,.085-i*.008,.2,7),i%2?'#8a6a3a':'#a07a45',0,.58+i*.19,0,0,i));
    const greens=['#3f8f3a','#5aa646','#4c9a3c','#66b04c'];
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+.2, up=i%2?.35:.15;
      P.push(part(frond(.95+(i%3)*.12,.3,.5),greens[i%4],0,1.08,0,-up,a,0)); }
    P.push(part(new THREE.IcosahedronGeometry(.08,0),'#7cc457',0,1.12));
  } else if(kind==='lampu'){
    // brass lampu gantung, hanging from y=0 (ceiling) down to about -1.0
    const brass='#c9962a', dark='#8a6420';
    P.push(part(cyl(.05,.15,.06,10),brass,0,-.03), part(cyl(.012,.012,.42,4),dark,0,-.27));
    for(let i=0;i<3;i++) P.push(part(new THREE.TorusGeometry(.03,.008,4,8),dark,0,-.08-i*.13,0,0,i*Math.PI/2));
    P.push(part(new THREE.ConeGeometry(.24,.16,10),brass,0,-.55), part(new THREE.TorusGeometry(.24,.02,5,14),'#e0b04a',0,-.63,0,Math.PI/2));
    for(let k=0;k<4;k++){ const a=k/4*Math.PI*2+.4; P.push(part(cyl(.008,.008,.3,3),dark,Math.cos(a)*.17,-.78,Math.sin(a)*.17)); }
    P.push(part(lathe([[0,-.98],[.12,-.95],[.22,-.9],[.24,-.86],[.2,-.84],[0,-.84]],12),brass),
      part(new THREE.SphereGeometry(.045,6,4),'#e0b04a',0,-1.0));
    glow.push(part(cyl(.11,.14,.24,10),'#fff1c8',0,-.72));
  } else if(kind==='lampion'){
    // round red lampion: string, gold caps + ribs, glowing red body, gold/red tassel; lowest point about -1.0
    P.push(part(cyl(.008,.008,.28,3),'#e8d2a0',0,-.14), part(cyl(.1,.12,.06,10),'#d9a028',0,-.3), part(cyl(.12,.1,.06,10),'#d9a028',0,-.84));
    for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; P.push(part(new THREE.TorusGeometry(.27,.008,3,16,Math.PI),'#d9a028',0,-.57,0,0,a,Math.PI/2,1,1,1)); }
    P.push(part(cyl(.012,.012,.08,3),'#d9a028',0,-.9), part(new THREE.ConeGeometry(.06,.14,6),'#d63a32',0,-.98,0,Math.PI));
    glow.push(part(new THREE.SphereGeometry(.265,14,10),'#ff4a36',0,-.57,0,0,0,0,1,.86,1));
  } else if(kind==='ketupatG'){
    // bamboo bar under the ceiling with five woven ketupat on strings of different length (lowest about -.95)
    P.push(part(cyl(.025,.025,.95,6),'#c8a052',0,-.05,0,0,0,Math.PI/2), part(cyl(.006,.006,.06,3),'#e8d2a0',-.4,-.02), part(cyl(.006,.006,.06,3),'#e8d2a0',.4,-.02));
    const kc=['#7cb342','#e8c34a','#8bc34a','#d9b23a','#7cb342'], Ls=[.28,.5,.36,.56,.3];
    for(let i=0;i<5;i++){ const x=(i-2)*.2, L=Ls[i], z=(i%2)*.05-.025;
      P.push(part(cyl(.005,.005,L,3),'#e8d2a0',x,-.05-L/2,z),
        part(new THREE.OctahedronGeometry(.12,0),[kc[i],'#5f8f2a',kc[i],'#a6c95a'],x,-.05-L-.12,z,0,Math.PI/4,0,1,1.2,1),
        part(cyl(.004,.004,.14,3),'#e8c34a',x,-.05-L-.33,z), part(new THREE.ConeGeometry(.03,.08,4),'#e8483f',x,-.05-L-.42,z,Math.PI)); }
  } else if(kind==='panel'){
    // geometric arabesque panel 0.9 x 0.9 on the wall (centre at the slot height), teak frame + 8-point star (no text)
    const z0=.035;
    P.push(part(box(.9,.9,.05),'#7a4a2c',0,0,z0), part(box(.78,.78,.02),'#f2e6cc',0,0,z0+.03));
    P.push(part(box(.46,.46,.016),'#2f8f86',0,0,z0+.045), part(box(.46,.46,.016),'#2f8f86',0,0,z0+.045,0,0,Math.PI/4));
    P.push(part(box(.36,.36,.012),'#d9a028',0,0,z0+.055), part(box(.36,.36,.012),'#d9a028',0,0,z0+.055,0,0,Math.PI/4));
    P.push(part(cyl(.12,.12,.012,8),'#2f8f86',0,0,z0+.064,Math.PI/2,0,Math.PI/8), part(cyl(.05,.05,.014,8),'#f2e6cc',0,0,z0+.07,Math.PI/2,0,Math.PI/8));
    for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]) P.push(part(box(.1,.1,.014),'#d9a028',sx*.3,sy*.3,z0+.045,0,0,Math.PI/4), part(box(.05,.05,.016),'#2f8f86',sx*.3,sy*.3,z0+.05,0,0,Math.PI/4));
    for(let i=0;i<4;i++){ const a=i*Math.PI/2; P.push(part(box(.1,.04,.014),'#2f8f86',Math.cos(a)*.34,Math.sin(a)*.34,z0+.045,0,0,a)); }
  }
  return { geo: mergeGeometries(P), glow: glow.length ? mergeGeometries(glow) : null };
}

export function createDecor(ctx){
  const scene = ctx.scene, gh = (x,z)=>ctx.groundHeight?.(x,z) ?? 0;
  const root = new THREE.Group(); root.name='decor'; scene.add(root);
  const N = SLOTS.length, slotPos = new Map();
  let stage = 0;
  // slot heights follow the ground (the plinth appears at stage 1, the hall carpet at stage 7)
  function refresh(st){
    stage = st|0;
    for(const s of SLOTS){ const [id,x,z,ry]=s, m=slotMeta(s);
      const y = m.y!=null ? m.y : m.t==='floor' ? gh(x,z)+.01+(stage>=7&&m.zone==='hall'?.02:0) : gh(x,z);
      slotPos.set(id,{ x, y, z, ry, t:m.t, st:m.st|0, zone:m.zone }); }
  }
  refresh(0);
  const mats = {}, meshes = {}, glows = {};
  const glowMat = new THREE.MeshBasicMaterial({ color:'#ffd27a', vertexColors:true, toneMapped:false });
  for(const k of DECOR_KINDS){
    const { geo, glow } = build(k.id);
    const two = k.id==='umbrella'||k.id==='palem';
    const m = new THREE.MeshLambertMaterial({ vertexColors:true, side: two ? THREE.DoubleSide : THREE.FrontSide });
    const im = new THREE.InstancedMesh(geo, m, N); im.count=0; im.visible=false; im.castShadow=k.id!=='karpet'; im.receiveShadow=true; im.frustumCulled=false; im.name='decor:'+k.id; root.add(im);
    mats[k.id]=m; meshes[k.id]=im;
    if(glow){ const g = new THREE.InstancedMesh(glow, glowMat, N); g.count=0; g.visible=false; g.frustumCulled=false; root.add(g); glows[k.id]=g; }
  }
  // slot markers: flat ring + soft additive beam (2 draw calls, only while placing). They draw through roofs/walls
  // (no depth test) so porch and ceiling slots stay findable from any camera.
  const ringGeo = new THREE.RingGeometry(.5,.78,32).rotateX(-Math.PI/2);
  const beamGeo = new THREE.CylinderGeometry(.62,.62,1.8,20,1,true).translate(0,.9,0);
  { const n=beamGeo.attributes.position.count, c=new Float32Array(n*4); for(let i=0;i<n;i++){ const y=beamGeo.attributes.position.getY(i); c[i*4]=1; c[i*4+1]=.88; c[i*4+2]=.45; c[i*4+3]=y<.1?.55:0; } beamGeo.setAttribute('color',new THREE.BufferAttribute(c,4)); }
  const ringMat = new THREE.MeshBasicMaterial({ color:'#ffe066', transparent:true, opacity:.9, depthWrite:false, depthTest:false, side:THREE.DoubleSide, toneMapped:false });
  const beamMat = new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, toneMapped:false });
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, N), beams = new THREE.InstancedMesh(beamGeo, beamMat, N);
  for(const im of [rings,beams]){ im.count=0; im.visible=false; im.frustumCulled=false; im.renderOrder=9; root.add(im); }
  let shown = []; // slot ids with markers

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), S1 = new THREE.Vector3(1,1,1), V = new THREE.Vector3(), Y = new THREE.Vector3(0,1,0), X = new THREE.Vector3(1,0,0), SC = new THREE.Vector3();
  const QX = new THREE.Quaternion().setFromAxisAngle(X, Math.PI/2);
  let placedList = [], colliders = [], bannerIdx = [], swayIdx = [], swayKinds = [], lastPlaced = [];
  function sync(placed){
    lastPlaced = placed;
    placedList = placed.filter(p=>slotPos.has(p.slot) && meshes[p.kind] && slotPos.get(p.slot).st<=stage);
    for(const c of colliders){ const i=ctx.colliders.indexOf(c); if(i>=0) ctx.colliders.splice(i,1); } colliders=[];
    const cnt = {}; bannerIdx = []; swayIdx = [];
    for(const p of placedList){ const s=slotPos.get(p.slot), im=meshes[p.kind], i=cnt[p.kind]=(cnt[p.kind]||0); cnt[p.kind]++;
      Q.setFromAxisAngle(Y,s.ry); M.compose(V.set(s.x,s.y,s.z),Q,S1); im.setMatrixAt(i,M); if(glows[p.kind]) glows[p.kind].setMatrixAt(i,M);
      if(p.kind==='banner') bannerIdx.push({i,s});
      if(s.t==='ceil') swayIdx.push({ kind:p.kind, i, s, ph:s.x*1.7+s.z });
      const r=kindOf(p.kind)?.r??.3; if(r>0 && (s.t==='ground'||s.t==='floor')){ const col={x:s.x,z:s.z,r,decor:true}; ctx.colliders.push(col); colliders.push(col); } }
    swayKinds = [...new Set(swayIdx.map(w=>w.kind))];
    for(const k in meshes){ const n=cnt[k]||0; meshes[k].count=n; meshes[k].visible=n>0; meshes[k].instanceMatrix.needsUpdate=true; if(glows[k]){ glows[k].count=n; glows[k].visible=n>0; glows[k].instanceMatrix.needsUpdate=true; } }
  }
  function markerMatrix(s, k=1){
    if(s.t==='wall'){ Q.setFromAxisAngle(Y,s.ry).multiply(QX); M.compose(V.set(s.x,s.y,s.z),Q,SC.set(k*.75,.6,k*.75)); }
    else if(s.t==='ceil'){ Q.identity(); M.compose(V.set(s.x,s.y-.05,s.z),Q,SC.set(k*.8,-.9,k*.8)); }
    else { Q.identity(); M.compose(V.set(s.x,s.y+.04,s.z),Q,SC.set(k,1,k)); }
    return M;
  }
  function showSlots(ids){
    shown = ids ? ids.filter(id=>slotPos.has(id)) : [];
    shown.forEach((id,i)=>{ const s=slotPos.get(id); markerMatrix(s); rings.setMatrixAt(i,M); beams.setMatrixAt(i,M); });
    rings.count=beams.count=shown.length; rings.visible=beams.visible=shown.length>0; rings.instanceMatrix.needsUpdate=beams.instanceMatrix.needsUpdate=true;
  }
  // nearest shown slot to a screen point (px), within maxPx
  function pick(cx, cy, maxPx=70){
    const r=ctx.canvas.getBoundingClientRect(); let best=null, bd=maxPx;
    for(const id of shown){ const s=slotPos.get(id); V.set(s.x,s.y+(s.t==='ground'||s.t==='floor'?.3:0),s.z).project(ctx.camera); if(V.z>1) continue;
      const sx=r.left+(V.x*.5+.5)*r.width, sy=r.top+(-V.y*.5+.5)*r.height, d=Math.hypot(sx-cx,sy-cy); if(d<bd){ bd=d; best=id; } }
    return best;
  }
  function nearest(ids, p){ let best=null, bd=1e9; for(const id of ids){ const s=slotPos.get(id); if(!s) continue; const d=Math.hypot(s.x-p.x,s.z-p.z)+Math.abs((s.y||0)-(p.y||0))*.3; if(d<bd){ bd=d; best=id; } } return best; }
  return {
    root, sync, showSlots, pick, nearest, slotPos, get shown(){ return shown; }, get stage(){ return stage; },
    setStage(st){ refresh(st); sync(lastPlaced); if(shown.length) showSlots(shown); },
    update(dt,t){
      if(shown.length){ const k=1+Math.sin(t*4)*.08; ringMat.opacity=.65+.3*Math.sin(t*4);
        for(let i=0;i<shown.length;i++){ markerMatrix(slotPos.get(shown[i]),k); rings.setMatrixAt(i,M); } rings.instanceMatrix.needsUpdate=true; }
      // lantern glow follows night; banners flutter; hanging ornaments sway gently
      const h=ctx.hour??12, night=h<6||h>18 ? 1 : h<7 ? 7-h : h>17 ? h-17 : 0;
      glowMat.color.setRGB(1,.86,.62).multiplyScalar(.6+night*1.5);
      if(bannerIdx.length){ const im=meshes.banner; for(const {i,s} of bannerIdx){ Q.setFromAxisAngle(Y,s.ry+Math.sin(t*1.7+s.x)*.18); M.compose(V.set(s.x,s.y,s.z),Q,S1); im.setMatrixAt(i,M); } im.instanceMatrix.needsUpdate=true; }
      if(swayIdx.length){
        for(const w of swayIdx){ const s=w.s, a=Math.sin(t*1.1+w.ph)*.045, b=Math.sin(t*.83+w.ph*1.3)*.035;
          Q.setFromAxisAngle(Y,s.ry); Q2.setFromAxisAngle(X,a); Q.multiply(Q2); Q2.setFromAxisAngle(V.set(0,0,1),b); Q.multiply(Q2);
          M.compose(V.set(s.x,s.y,s.z),Q,S1); meshes[w.kind].setMatrixAt(w.i,M); glows[w.kind]?.setMatrixAt(w.i,M); }
        for(const k of swayKinds){ meshes[k].instanceMatrix.needsUpdate=true; if(glows[k]) glows[k].instanceMatrix.needsUpdate=true; } }
    },
  };
}

// The sacrificial-animal pen: fence, gate, troughs, wash tub, shelter, hay bales, props. All procedural.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { woodTexture, strawTexture, thatchTexture, penGroundTexture, mulberry32 } from './textures.js';

export const PEN = { cx:26, cz:6, hw:8, hd:6 };   // centre + half extents (x: 18..34, z: 0..12). Gate on -X side at z=6.
const V3=THREE.Vector3;

export const PEN_EXT=[[0,0],[3,2],[6,4]];   // pen upgrade level -> extra metres on +X,+Z
export function buildPen(ctx,lvl=0){
  lvl=Math.max(0,Math.min(2,lvl|0)); const [EX,EZ]=PEN_EXT[lvl]; const X1=8+EX, Z1=6+EZ;
  const root=new THREE.Group(); root.name='animalPen'; root.position.set(PEN.cx,0,PEN.cz);
  const rnd=mulberry32(99);
  const B={wood:[],straw:[],thatch:[],trim:[],misc:[],foam:[],tubfoam:[]}; const low=ctx.quality==='low';
  const obstacles=[];  // local coords {x,z,r}
  const colliders=[];  // local coords for player
  const tmpM=new THREE.Matrix4(), tmpQ=new THREE.Quaternion(), tmpE=new THREE.Euler();
  function put(bucket,geo,{p=[0,0,0],r=[0,0,0],s=[1,1,1],c='#ffffff',uv=1}={}){
    tmpM.compose(new V3(...p),tmpQ.setFromEuler(tmpE.set(...r)),new V3(...s)); geo.applyMatrix4(tmpM);
    if(uv!==1){ const u=geo.attributes.uv; for(let i=0;i<u.count;i++) u.setXY(i,u.getX(i)*uv,u.getY(i)*uv); }
    const n=geo.attributes.position.count; const col=new THREE.Color(c); const a=new Float32Array(n*3);
    for(let i=0;i<n;i++){ a[i*3]=col.r; a[i*3+1]=col.g; a[i*3+2]=col.b; }
    geo.setAttribute('color',new THREE.BufferAttribute(a,3));
    if(geo.index===null) geo=geo.toNonIndexed&&geo; B[bucket].push(geo); return geo;
  }
  const rbox=(w,h,d,rad=.03,seg=1)=>new RoundedBoxGeometry(w,h,d,1,rad); // seg forced to 1: chamfered, ~108 tris/box
  const WOODS=['#c79a63','#b98652','#d2a56d','#a9774a','#c18f5a'];
  const woodC=()=>WOODS[Math.floor(rnd()*WOODS.length)];

  // ------------ fence ------------
  const posts=[];
  const postKeys=new Set();
  const addPost=(x,z,h=1.05,w=.16,tall=false)=>{ const key=x.toFixed(2)+','+z.toFixed(2); if(postKeys.has(key)) return; postKeys.add(key); posts.push({x,z,h});
    put('wood',rbox(w,h,w,.04),{p:[x,h/2,z],r:[(rnd()-.5)*.05,rnd()*3,(rnd()-.5)*.05],c:tall?'#a97745':woodC()});
    put('wood',new THREE.SphereGeometry(w*.62,8,5),{p:[x,h+.015,z],s:[1,.7,1],c:tall?'#e9b95c':'#d9b27a'});
    colliders.push({x,z,r:.28});
  };
  const rail=(x1,z1,x2,z2)=>{ const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),ang=Math.atan2(-dz,dx);
    for(const y of [.42,.82]) put('wood',rbox(len+.06,.085,.06,.025),{p:[(x1+x2)/2,y+(rnd()-.5)*.01,(z1+z2)/2],r:[0,ang,0],c:woodC()}); };
  // a straight fence run with posts ~every 2 m (skipA/skipB leave an end post to the gate)
  const fenceLine=(ax,az,bx,bz,skipA=false,skipB=false)=>{ const len=Math.hypot(bx-ax,bz-az), n=Math.max(1,Math.round(len/2));
    for(let i=0;i<=n;i++){ const t=i/n, x=ax+(bx-ax)*t, z=az+(bz-az)*t; if((i===0&&skipA)||(i===n&&skipB)) continue; addPost(x,z); }
    for(let i=0;i<n;i++){ const t0=i/n,t1=(i+1)/n; rail(ax+(bx-ax)*t0,az+(bz-az)*t0,ax+(bx-ax)*t1,az+(bz-az)*t1); }
    const m=Math.ceil(len/.9); for(let i=0;i<=m;i++){ const t=i/m; colliders.push({x:ax+(bx-ax)*t,z:az+(bz-az)*t,r:.3}); } };
  fenceLine(-8,-6,X1,-6); fenceLine(-8,Z1,X1,Z1); fenceLine(X1,-6,X1,Z1);
  fenceLine(-8,-6,-8,-1.2,false,true); fenceLine(-8,1.2,-8,Z1,true,false);
  addPost(-8,-1.2,2.15,.24,true); addPost(-8,1.2,2.15,.24,true);

  // gate arch + open leaves
  put('wood',rbox(.22,.2,2.9,.05),{p:[-8,2.05,0],c:'#a97745'});
  put('wood',rbox(.16,.14,2.7,.04),{p:[-8,1.75,0],c:'#b98652'});
  for(const s of[-1,1]){ // open leaves swung outward (-X)
    const hx=-8,hz=s*1.2;
    put('wood',rbox(1.05,.1,.07,.03),{p:[hx-.55,.45,hz-s*.0],r:[0,Math.PI/2*0+.0,0],c:'#c79a63'});
    put('wood',rbox(1.05,.1,.07,.03),{p:[hx-.55,.85,hz],c:'#c79a63'});
    put('wood',rbox(.09,.62,.06,.02),{p:[hx-.3,.65,hz],r:[0,0,.0],c:'#b98652'});
    put('wood',rbox(.09,.62,.06,.02),{p:[hx-.85,.65,hz],c:'#b98652'});
  }
  // bunting
  const flagCols=['#ff6b81','#ffd166','#2ec4b6','#6c8cff','#ffffff','#ff9f43','#b983ff'];
  const bunting=(a,b,sag,n)=>{ for(let i=0;i<n;i++){ const t=(i+.5)/n; const p=new V3().lerpVectors(a,b,t); p.y-=Math.sin(t*Math.PI)*sag;
      put('misc',new THREE.SphereGeometry(i%3===1?.075:.05,6,4),{p:[p.x,p.y,p.z],c:flagCols[i%flagCols.length]}); } };
  const bl=(a,b,sag)=>bunting(a,b,sag,Math.round(a.distanceTo(b)*1.85));
  bl(new V3(-8,2.0,-1.2),new V3(-8,1.05,-6),.35); bl(new V3(-8,2.0,1.2),new V3(-8,1.05,Z1),.35);
  bl(new V3(-8,1.05,-6),new V3(X1,1.05,-6),.5); bl(new V3(-8,1.05,Z1),new V3(X1,1.05,Z1),.5); bl(new V3(X1,1.05,-6),new V3(X1,1.05,Z1),.5);

  // ------------ hay bales (cylinders lying down) ------------
  // bale = cylinder lying along its local X axis, rotated by ry; twine rings wrap around it
  const bale=(x,y,z,ry,c)=>{ put('straw',new THREE.CylinderGeometry(.42,.42,.78,18,1).rotateZ(Math.PI/2).rotateY(ry),{p:[x,y+.42,z],c,uv:1.2});
    for(const o of[-.22,.22]) put('misc',new THREE.TorusGeometry(.426,.017,6,24).rotateY(Math.PI/2).translate(o,0,0).rotateY(ry),{p:[x,y+.42,z],c:'#a8733c'}); };
  bale(5.6,0,-1.4,.2,'#f0d07a'); bale(5.6,0,-.45,-.1,'#f4d886'); bale(5.62,.8,-.92,.08,'#ecca72');
  obstacles.push({x:5.6,z:-.9,r:1.0}); colliders.push({x:5.6,z:-.9,r:.9});
  bale(-6.2,0,-4.8,.5,'#f4d886'); bale(-6.6,0,-3.9,-.3,'#f0d07a');
  obstacles.push({x:-6.4,z:-4.3,r:.95}); colliders.push({x:-6.4,z:-4.3,r:.8});

  // ------------ troughs ------------
  const dynamic=[]; const stations={ feed:[], water:null, wash:null, shade:null };
  function trough(x,z,len,{water=false,ry=0}={}){
    const place=(geo,p,r,c)=>{ // compose local->root
      const m=new THREE.Matrix4().compose(new V3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new V3(1,1,1));
      const w=new THREE.Matrix4().compose(new V3(x,0,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new V3(1,1,1));
      geo.applyMatrix4(m); geo.applyMatrix4(w);
      const n=geo.attributes.position.count; const col=new THREE.Color(c); const a=new Float32Array(n*3); for(let i=0;i<n;i++){a[i*3]=col.r;a[i*3+1]=col.g;a[i*3+2]=col.b;} geo.setAttribute('color',new THREE.BufferAttribute(a,3)); B.wood.push(geo); };
    const w=water?.9:.62, h=water?.5:.4, hh=.55;
    place(rbox(len,.08,w,.03),[0,.34,0],[0,0,0],'#a9774a');                     // floor
    place(rbox(len,h,.08,.03),[0,.34+h/2,w/2-.04],[0,0,0],'#c79a63');             // long sides
    place(rbox(len,h,.08,.03),[0,.34+h/2,-w/2+.04],[0,0,0],'#c79a63');
    place(rbox(.08,h,w,.03),[len/2-.04,.34+h/2,0],[0,0,0],'#b98652');             // ends
    place(rbox(.08,h,w,.03),[-len/2+.04,.34+h/2,0],[0,0,0],'#b98652');
    for(const sx of[-1,1]) for(const sz of[-1,1]){ place(rbox(.1,.38,.1,.02),[sx*(len/2-.1),.19,sz*(w/2-.08)],[0,0,0],'#8a5e38'); }
    place(rbox(len+.1,.04,.12,.015),[0,.34+h+.01,w/2-.04],[0,0,0],'#d9b27a'); place(rbox(len+.1,.04,.12,.015),[0,.34+h+.01,-w/2+.04],[0,0,0],'#d9b27a');
    return {len,w,h};
  }
  const fills=[];
  // feed troughs along north (-Z) fence, hay mounds dynamic
  for(const fx of[-3.4,.2]){
    const t=trough(fx,-5.0,2.2);
    const hay=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),new THREE.MeshStandardMaterial({color:'#f1cf78',map:strawTexture(),roughness:1}));
    hay.scale.set(1,.2,.26); hay.position.set(fx,.62,-5.0); hay.castShadow=!low; root.add(hay);
    { const gs=[]; for(let i=0;i<16;i++){ const side=i%2?1:-1, x=(rnd()-.5)*1.9, len=.22+rnd()*.16; const g=new THREE.BoxGeometry(.018,.01,len);
        g.translate(0,0,len/2).rotateX(-side*(.35+rnd()*.35)).rotateY((rnd()-.5)*.8+(side<0?Math.PI:0)).translate(x,(rnd()-.5)*.03,side*.12); gs.push(g); }
      const strands=new THREE.Mesh(mergeGeometries(gs),hay.material); strands.position.set(fx,.7,-5.0); root.add(strands); hay.userData.strands=strands; }
    const slots=[new V3(fx-.55,0,-4.85),new V3(fx+.55,0,-4.85)];
    const st={pos:new V3(fx,0,-5.0),slots,occ:[null,null],fill:0.0,mesh:hay,head:new V3(fx,.5,-4.95),face:Math.PI}; stations.feed.push(st); fills.push(st);
    obstacles.push({x:fx-.75,z:-5.0,r:.5},{x:fx+.75,z:-5.0,r:.5}); colliders.push({x:fx-.7,z:-5,r:.5},{x:fx,z:-5,r:.5},{x:fx+.7,z:-5,r:.5});
  }
  // water trough (east, near NE corner)
  { const wx=5.4,wz=-4.9; trough(wx,wz,2.4,{water:true});
    const wm=new THREE.MeshStandardMaterial({color:'#67d0f2',roughness:.05,metalness:.1,transparent:true,opacity:.88,emissive:'#2b8fb8',emissiveIntensity:.25});
    const wat=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.72).rotateX(-Math.PI/2),wm); wat.position.set(wx,.7,wz); root.add(wat);
    const st={pos:new V3(wx,0,wz),slots:[new V3(wx-.6,0,wz+.3),new V3(wx+.6,0,wz+.3)],occ:[null,null],fill:0,mesh:wat,face:Math.PI,head:new V3(wx,.7,wz)}; stations.water=st; fills.push(st); st.isWater=true;
    obstacles.push({x:wx-.85,z:wz,r:.62},{x:wx+.85,z:wz,r:.62}); colliders.push({x:wx-.8,z:wz,r:.55},{x:wx,z:wz,r:.55},{x:wx+.8,z:wz,r:.55}); }

  // ------------ wash tub (round barrel tub + foam + duck) ------------
  { const tx=-5.2,tz=3.9, R=.95;
    const tub=new THREE.CylinderGeometry(R,R*.88,.62,28,1,true); put('wood',tub.clone(),{p:[tx,.35,tz],c:'#b98652',uv:2});
    put('wood',new THREE.CylinderGeometry(R*.88,R*.88,.06,24),{p:[tx,.08,tz],c:'#8a5e38'});
    put('wood',new THREE.CylinderGeometry(R*.9,R*.9,.04,28,1,true),{p:[tx,.36,tz],c:'#8a5e38'});
    for(const y of[.18,.52]) put('misc',new THREE.TorusGeometry(R*(y<.3?.9:.98),.02,6,32).rotateX(Math.PI/2),{p:[tx,y+.04,tz],c:'#7a8590'});
    put('wood',new THREE.TorusGeometry(R,.04,8,32).rotateX(Math.PI/2),{p:[tx,.67,tz],c:'#d9b27a'});
    const wm=new THREE.MeshStandardMaterial({color:'#9fe0f5',roughness:.1,transparent:true,opacity:.9,emissive:'#4aa7c9',emissiveIntensity:.2});
    const wat=new THREE.Mesh(new THREE.CircleGeometry(R*.93,28).rotateX(-Math.PI/2),wm); wat.position.set(tx,.58,tz); root.add(wat);
    // foam bubbles
    for(let i=0;i<84;i++){ const a=rnd()*7,rim=i<66,rr=rim?R*(.74+rnd()*.17):Math.sqrt(rnd())*R*.5,s=rim?.05+rnd()*.055:.03+rnd()*.035; put('tubfoam',new THREE.SphereGeometry(s,7,5),{p:[tx+Math.cos(a)*rr,.6+s*.4,tz+Math.sin(a)*rr],s:[1,.75,1],c:'#ffffff'}); }
    // rubber duck
    const dx=tx+.25,dz=tz-.2; put('misc',new THREE.SphereGeometry(.13,10,8),{p:[dx,.68,dz],s:[1.1,.85,1],c:'#ffd43b'}); put('misc',new THREE.SphereGeometry(.085,10,8),{p:[dx+.07,.79,dz],c:'#ffd43b'}); put('misc',new THREE.ConeGeometry(.035,.07,6).rotateZ(-Math.PI/2),{p:[dx+.17,.78,dz],c:'#ff8a3d'});
    put('misc',new THREE.SphereGeometry(.015,6,5),{p:[dx+.14,.82,dz+.05],c:'#222'}); put('misc',new THREE.SphereGeometry(.015,6,5),{p:[dx+.14,.82,dz-.05],c:'#222'});
    // soap + bucket + sponge on a stool
    put('wood',rbox(.5,.06,.4,.02),{p:[tx+1.5,.3,tz+.2],c:'#c79a63'}); for(const sx of[-1,1]) for(const sz of[-1,1]) put('wood',rbox(.06,.3,.06,.01),{p:[tx+1.5+sx*.2,.15,tz+.2+sz*.15],c:'#8a5e38'});
    put('misc',rbox(.16,.07,.1,.03),{p:[tx+1.4,.36,tz+.2],c:'#ff9ec1'}); put('misc',rbox(.14,.06,.1,.03),{p:[tx+1.62,.36,tz+.15],r:[0,.4,0],c:'#ffe066'});
    // scrub brush on stool + bucket beside the tub
    put('wood',rbox(.22,.05,.08,.02),{p:[tx+1.5,.36,tz+.34],r:[0,.3,0],c:'#c9964f'}); put('misc',rbox(.2,.035,.06,.01),{p:[tx+1.5,.325,tz+.34],r:[0,.3,0],c:'#f5e3a8'});
    put('misc',new THREE.CylinderGeometry(.22,.17,.32,14),{p:[tx-1.45,.16,tz+.5],c:'#ff7a59'}); put('misc',new THREE.TorusGeometry(.2,.015,5,14).rotateX(Math.PI/2),{p:[tx-1.45,.32,tz+.5],c:'#6b4a2e'}); put('foam',new THREE.SphereGeometry(.13,8,6),{p:[tx-1.45,.34,tz+.5],s:[1,.7,1],c:'#ffffff'});
    colliders.push({x:tx-1.45,z:tz+.5,r:.25});
    stations.wash={pos:new V3(tx,0,tz),slots:[new V3(tx+1.5,0,tz-1.1),new V3(tx-.4,0,tz-1.5),new V3(tx+.6,0,tz+1.6)],occ:[null,null,null],face:0,water:wat,fill:.6,direct:true};
    obstacles.push({x:tx,z:tz,r:1.05},{x:tx+1.5,z:tz+.2,r:.4}); colliders.push({x:tx,z:tz,r:1.0},{x:tx+1.5,z:tz+.2,r:.4}); }

  // ------------ shade shelter (thatched, bamboo posts) ------------
  const lanterns=[]; const shadeSpots=[], shadeRoof=[];
  let _floorMat=null; const floorMat=()=>{ if(_floorMat) return _floorMat; const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    const gr=g.createRadialGradient(64,64,20,64,64,64); gr.addColorStop(0,'#fff'); gr.addColorStop(.7,'#bbb'); gr.addColorStop(1,'#000'); g.fillStyle=gr; g.fillRect(0,0,128,128);
    const st=strawTexture(); st.repeat.set(2,1.6);
    return _floorMat=new THREE.MeshStandardMaterial({map:st,alphaMap:new THREE.CanvasTexture(c),color:'#dcc48a',transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}); };
  function shelter(sx,sz,W,D,ph,extra){
    { const f=new THREE.Mesh(new THREE.PlaneGeometry(W+.6,D+.6).rotateX(-Math.PI/2),floorMat()); f.position.set(sx,.035,sz); f.renderOrder=2; f.receiveShadow=true; root.add(f); }
    for(const a of[-1,1]) for(const b of[-1,1]){ const x=sx+a*(W/2-.12),z=sz+b*(D/2-.12); put('wood',new THREE.CylinderGeometry(.11,.13,ph,10),{p:[x,ph/2,z],c:'#d6a566'}); put('wood',new THREE.SphereGeometry(.14,8,6),{p:[x,.1,z],s:[1,.5,1],c:'#a9774a'}); obstacles.push({x,z,r:.35}); colliders.push({x,z,r:.3}); }
    put('wood',rbox(W,.14,.16,.03),{p:[sx,ph,sz-D/2+.12],c:'#c18f5a'}); put('wood',rbox(W,.14,.16,.03),{p:[sx,ph,sz+D/2-.12],c:'#c18f5a'});
    put('wood',rbox(.16,.14,D,.03),{p:[sx-W/2+.12,ph,sz],c:'#c18f5a'}); put('wood',rbox(.16,.14,D,.03),{p:[sx+W/2-.12,ph,sz],c:'#c18f5a'});
    // roof: two steeper slopes (ridge along X) with wooden eave trim
    const slope=.62, over=.32, rw=D/2+over, th=.12; const rl=Math.hypot(rw,rw*slope); const ang=Math.atan(slope);
    for(const s2 of[-1,1]){ const cy=ph+.14+(rw*slope)/2, cz=sz+s2*rw/2; put('thatch',rbox(W+.5,th,rl,.04,2),{p:[sx,cy,cz],r:[s2*ang,0,0],c:'#fff3cf',uv:2.0});
      const ey=ph+.14+.0, ez=sz+s2*rw; put('trim',rbox(W+.56,.07,.07,.02),{p:[sx,ey+.02,ez],c:'#e0b377'});
      for(const e of[-1,1]) put('trim',rbox(.06,.07,rl,.02),{p:[sx+e*(W+.5)/2,cy,cz],r:[s2*ang,0,0],c:'#e0b377'}); }
    put('thatch',new THREE.CylinderGeometry(.12,.12,W+.6,10).rotateZ(Math.PI/2),{p:[sx,ph+.14+rw*slope+.05,sz],c:'#d4a45c'});
    const lantern=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),new THREE.MeshStandardMaterial({color:'#ffd27a',emissive:'#ffb347',emissiveIntensity:.3,roughness:.5})); lantern.scale.set(1,1.25,1); lantern.position.set(sx,ph-.35,sz); root.add(lantern); lanterns.push(lantern);
    put('misc',new THREE.CylinderGeometry(.008,.008,.35,4),{p:[sx,ph-.12,sz],c:'#4a3a2a'});
    const cols=Math.max(2,Math.floor((W-.6)/1.05)), rows=D>2.5?2:1;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ shadeSpots.push(new V3(sx-(cols-1)*.525+c*1.05+(r?.25:0),0,sz+(rows>1?(r?.5:-.45):0))); shadeRoof.push(true); }
    for(const e of (extra||[])){ shadeSpots.push(new V3(sx+e[0],0,sz+e[1])); shadeRoof.push(false); }
  }
  shelter(4.6,3.4,5.0,3.0,1.85);
  if(lvl>=1) shelter(X1-2.3,Z1-1.7,4.0,2.7,1.75);
  if(lvl>=2) shelter(X1-2.5,-3.3,4.2,2.7,1.75);
  stations.shade={pos:new V3(4.6,0,3.4),sleep:shadeSpots,roof:shadeRoof};
  // straw clumps on the floor, salt lick, puddle
  { const nC=low?12:30; for(let i=0,k=0;i<nC&&k<200;k++){ const x=-7.4+rnd()*(X1+7.4-.6), z=-5.4+rnd()*(Z1+5.4-.6);
      if(obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.4)||(x<-5.5&&Math.abs(z)<1.6)) continue; i++;
      for(let j=0;j<5;j++){ const g=new THREE.ConeGeometry(.012,.16+rnd()*.1,3); g.translate(0,.08,0).rotateZ((rnd()-.5)*2.2).rotateY(rnd()*6.28); put('straw',g,{p:[x+(rnd()-.5)*.18,.02,z+(rnd()-.5)*.18],c:rnd()<.5?'#f2d07a':'#e2b65a'}); } }
    put('wood',rbox(.34,.12,.34,.02),{p:[2.7,.06,-5.5],c:'#a9774a'}); put('misc',rbox(.26,.2,.26,.05),{p:[2.7,.22,-5.5],r:[0,.4,0],c:'#f6dcd6'});
    obstacles.push({x:2.7,z:-5.5,r:.35}); colliders.push({x:2.7,z:-5.5,r:.25});
    const pud=new THREE.Mesh(new THREE.CircleGeometry(.6,24).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#7aa9b8',roughness:.06,metalness:.1,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
    pud.scale.set(1.5,1,.7); pud.position.set(5.4,.04,-3.5); pud.renderOrder=3; root.add(pud); }
  // sacks & bucket & lantern props
  { for(const [x,z,s] of[[7,-2.6,1],[7.2,-3.2,.9],[-6.8,-1.0,.8]]){ put('misc',new THREE.SphereGeometry(.3*s,12,10),{p:[x,.3*s,z],s:[1,1.15,.85],c:'#d9c29a'}); put('misc',new THREE.SphereGeometry(.12*s,8,6),{p:[x,.68*s,z],c:'#c4a97a'}); put('misc',new THREE.TorusGeometry(.12*s,.015,5,12).rotateX(Math.PI/2),{p:[x,.6*s,z],c:'#8a5e38'}); colliders.push({x,z,r:.3}); obstacles.push({x,z,r:.45}); }
    put('misc',new THREE.CylinderGeometry(.2,.16,.3,14),{p:[6.9,.15,-4.2],c:'#4aa3c9'}); put('misc',new THREE.TorusGeometry(.19,.015,5,14).rotateX(Math.PI/2),{p:[6.9,.3,-4.2],c:'#8a5e38'}); }
  // tufts of grass + flowers around the fence (decor, instanced)
  const mx=(X1-8)/2, hx=(X1+8)/2, mz=(Z1-6)/2, hz=(Z1+6)/2;
  const perim=(side,t,off)=>{ if(side===0) return [mx+t*(hx+.6),-6-off]; if(side===1) return [mx+t*(hx+.6),Z1+off]; if(side===2) return [X1+off,mz+t*(hz+.6)];
    let z=mz+t*(hz+.6); if(Math.abs(z)<2) z+=3.5*Math.sign(z||1); return [-8-off,z]; };
  const tuftG=(()=>{ const gs=[]; for(let i=0;i<5;i++){ const g=new THREE.ConeGeometry(.045,.32+(i%3)*.08,4); g.translate(0,.16,0); g.rotateZ((i-2)*.22); g.rotateY(i*1.3);
      const n=g.attributes.position.count,a=new Float32Array(n*3); for(let k=0;k<n;k++){ const t=g.attributes.position.getY(k)/.4; a[k*3]=.35+.2*t; a[k*3+1]=.7+.2*t; a[k*3+2]=.25; } g.setAttribute('color',new THREE.BufferAttribute(a,3)); gs.push(g);} return mergeGeometries(gs); })();
  const tN=low?40:110, tufts=new THREE.InstancedMesh(tuftG,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}),tN); const dm=new THREE.Object3D();
  for(let i=0;i<tN;i++){ const side=rnd()*4|0, t=(rnd()*2-1), off=.35+rnd()*.7;
    let [x,z]=perim(side,t,off);
    dm.position.set(x,0,z); dm.rotation.y=rnd()*6; dm.scale.setScalar(.8+rnd()*.9); dm.updateMatrix(); tufts.setMatrixAt(i,dm.matrix); }
  root.add(tufts);
  const fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.05,6,5),new THREE.MeshStandardMaterial({roughness:.6}),low?20:50); const fc=['#fff','#ffd166','#ff8fb1','#b9a3ff'];
  for(let i=0;i<fl.count;i++){ const side=rnd()*4|0,t=(rnd()*2-1),off=.5+rnd()*.9; let [x,z]=perim(side,t,off);
    dm.position.set(x,.3+rnd()*.12,z); dm.rotation.set(0,0,0); dm.scale.setScalar(.9+rnd()*.6); dm.updateMatrix(); fl.setMatrixAt(i,dm.matrix); fl.setColorAt(i,new THREE.Color(fc[i%4])); }
  root.add(fl);

  // ------------ ground patch ------------
  const GW=X1+8+2.2, GH=Z1+6+2.2, gx0=-9.1, gz0=-7.1; const uvOf=(x,z,r)=>[(x-gx0)/GW,(z-gz0)/GH,r];
  const gtex=penGroundTexture(GW,GH,[uvOf(5.4,-4.0,1.64),uvOf(-5.2,3.9,1.78),uvOf(1.3,5.1,.85)]);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(GW,GH).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:gtex,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  ground.position.set((X1-8)/2,.025,(Z1-6)/2); ground.receiveShadow=true; ground.renderOrder=1; root.add(ground);
  // dirt path from gate outward
  { const pc=document.createElement('canvas'); pc.width=128; pc.height=64; const g=pc.getContext('2d'); g.filter='blur(5px)'; g.fillStyle='#c9ab74'; g.beginPath(); g.roundRect(10,10,108,44,18); g.fill();
    const t=new THREE.CanvasTexture(pc); t.colorSpace=THREE.SRGBColorSpace;
    const p=new THREE.Mesh(new THREE.PlaneGeometry(6,2.6).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})); p.position.set(-11,.026,0); p.renderOrder=1; root.add(p); }

  // ------------ sign ------------
  { const c=document.createElement('canvas'); c.width=512; c.height=160; const g=c.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,160); gr.addColorStop(0,'#d9a866'); gr.addColorStop(1,'#b3743c'); g.fillStyle=gr; g.beginPath(); g.roundRect(6,6,500,148,26); g.fill();
    g.strokeStyle='#7a4a24'; g.lineWidth=8; g.stroke(); g.strokeStyle='rgba(255,236,190,.7)'; g.lineWidth=3; g.beginPath(); g.roundRect(18,18,476,124,18); g.stroke();
    g.fillStyle='#4a2a14'; g.font='bold 54px "Trebuchet MS",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('KANDANG',256,62); g.font='bold 38px "Trebuchet MS",sans-serif'; g.fillStyle='#fff3cf'; g.strokeStyle='#4a2a14'; g.lineWidth=6; g.strokeText('QURBAN',256,114); g.fillText('QURBAN',256,114);
    g.fillStyle='#ffd24a'; g.beginPath(); g.arc(70,80,26,0,7); g.fill(); g.fillStyle='#d9a866'; g.beginPath(); g.arc(80,76,23,0,7); g.fill();
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
    const m=new THREE.MeshStandardMaterial({map:t,roughness:.8,side:THREE.DoubleSide});
    const s=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.6),m); s.rotation.y=-Math.PI/2; s.position.set(-8.13,1.42,0); s.castShadow=true; root.add(s);
    for(const z of[-.8,.8]) put('misc',new THREE.CylinderGeometry(.012,.012,.35,5),{p:[-8.1,1.6,z],c:'#7a4a24'}); }

  // ------------ materials + merge ------------
  const mats={ wood:new THREE.MeshStandardMaterial({vertexColors:true,map:woodTexture(),roughness:.88}),
    straw:new THREE.MeshStandardMaterial({vertexColors:true,map:strawTexture(),roughness:1}),
    thatch:new THREE.MeshStandardMaterial({vertexColors:true,map:thatchTexture(),roughness:1}),
    misc:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide}),
    foam:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,emissive:'#bfe8ff',emissiveIntensity:.05}) }; mats.tubfoam=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,emissive:'#ffffff',emissiveIntensity:.18,transparent:true,opacity:.88,depthWrite:false});
  mats.trim=new THREE.MeshStandardMaterial({vertexColors:true,map:mats.wood.map,roughness:.88}); 
  const meshes={};
  for(const k of Object.keys(B)){
    if(!B[k].length) continue;
    const list=B[k].map(g=>{ let q=g.index?g.toNonIndexed():g; for(const n of Object.keys(q.attributes)) if(!['position','normal','uv','color'].includes(n)) q.deleteAttribute(n); return q; });
    const m=new THREE.Mesh(mergeGeometries(list),mats[k]); m.castShadow=!(k==='thatch'||k==='trim'||k==='foam'||k==='tubfoam'||(low&&k==='misc')); m.receiveShadow=!low||k!=='misc'; m.name='pen_'+k; root.add(m); meshes[k]=m;
  }
  // legacy sub-group for troughs (kept empty-safe)
  ctx.scene.add(root);
  const colRefs=colliders.map(c=>({x:c.x+PEN.cx,z:c.z+PEN.cz,r:c.r})); ctx.colliders.push(...colRefs);

  // convert helpers: local -> world positions for stations
  const toWorld=(v)=>v.clone().add(new V3(PEN.cx,0,PEN.cz));
  const world={ obstacles:obstacles.map(o=>({x:o.x+PEN.cx,z:o.z+PEN.cz,r:o.r})) };
  for(const st of stations.feed){ st.pos=toWorld(st.pos); st.slots=st.slots.map(toWorld); st.head=toWorld(st.head); }
  stations.water.pos=toWorld(stations.water.pos); stations.water.slots=stations.water.slots.map(toWorld); stations.water.head=toWorld(stations.water.head);
  stations.wash.pos=toWorld(stations.wash.pos); stations.wash.slots=stations.wash.slots.map(toWorld);
  stations.shade.pos=toWorld(stations.shade.pos); stations.shade.sleep=stations.shade.sleep.map(toWorld); stations.shade.occ=stations.shade.sleep.map(()=>null);

  const warm=new THREE.PointLight('#ffb35c',0,9,1.6); warm.position.set(PEN.cx+4.6,1.5,PEN.cz+3.4); ctx.scene.add(warm);
  function update(dt,t){
    const h=ctx.hour??8; const night=Math.max(Math.min(1,Math.max(0,(h-17.3)/1.8)),Math.min(1,Math.max(0,(6.8-h)/1.5)));
    warm.intensity=night*7*(.94+.06*Math.sin(t*7)); for(const l of lanterns) l.material.emissiveIntensity=.3+night*2.2;
    { const c=ctx.camera.position, near=Math.hypot(c.x-PEN.cx-(X1-8)/2,c.z-PEN.cz-(Z1-6)/2)<28; const high=near?Math.min(1,Math.max(0,(c.y-5.5)/4)):0;
      const o=1-.68*Math.max(high,night*.85); for(const mt of [mats.thatch,mats.trim]){ mt.opacity=o; const tr=o<.985; if(mt.transparent!==tr){ mt.transparent=tr; mt.depthWrite=!tr; } } } mats.foam.emissiveIntensity=.05+night*.5;
    for(const st of stations.feed){ const f=Math.max(0,st.fill); st.mesh.visible=f>0.01; st.mesh.scale.set(1,.12+.14*f,.24+.05*f); st.mesh.position.y=.58+.14*f; const sd=st.mesh.userData.strands; if(sd){ sd.visible=f>.12; sd.position.y=.6+.16*f; } }
    const w=stations.water; w.mesh.position.y=.46+.28*Math.max(.05,w.fill)+Math.sin(t*2.2)*.004; w.mesh.material.emissiveIntensity=.2+Math.sin(t*1.7)*.05; w.mesh.visible=w.fill>.01;
    const wf=stations.wash.fill??0; stations.wash.water.position.y=.3+.28*Math.max(.05,wf)+Math.sin(t*1.5)*.006; stations.wash.water.visible=wf>.01;
    if(meshes.tubfoam){ meshes.tubfoam.visible=wf>.06; meshes.tubfoam.position.y=(Math.min(1,wf)-1)*.28; meshes.tubfoam.scale.y=1; }
  }
  function dispose(){ ctx.scene.remove(root); ctx.scene.remove(warm); warm.dispose?.();
    for(const c of colRefs){ const i=ctx.colliders.indexOf(c); if(i>=0) ctx.colliders.splice(i,1); }
    root.traverse(o=>{ o.geometry?.dispose?.(); const ms=Array.isArray(o.material)?o.material:[o.material]; for(const m of ms){ if(!m) continue; m.map?.dispose?.(); m.dispose?.(); } }); }
  return { root, stations, obstacles:world.obstacles, update, dispose, level:lvl, bounds:{x0:PEN.cx-8,x1:PEN.cx+X1,z0:PEN.cz-6,z1:PEN.cz+Z1}, gate:new V3(PEN.cx-8,0,PEN.cz) };
}

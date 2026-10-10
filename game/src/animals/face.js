// Painted animal face atlas (eyes / nose+mouth / cheeks), projected onto the head + muzzle in the animal shader.
// Face rect in head-centre space: x in [-.95,.95]*hR.x -> u, y in [-1.0,.8]*hR.y -> v. Cells are 256x256, grid 4x3.
import * as THREE from 'three';

export const FACE = { COLS:4, ROWS:3, X:.95, Y0:1.0, Y1:.8,
  eyeOpen:0, eyeHappy:1, eyeSleep:2, eyeLid:3, eyeBaby:4, eyeLash:5,
  mGoat:6, mGoatOpen:7, mCow:8, mCowOpen:9, cheeks:10, none:11 };
export const EYE_V = 1-85/256;           // eye centre line (v) used for blink squash
const S=256, INK='#2a1610';
const EX=[71,185], EY=85;               // eye centres in a cell (px)

function iris(g,cx,cy,rx,ry,s,extra){
  // soft dark glossy iris, almost no white
  const gr=g.createRadialGradient(cx-s*4,cy+ry*.35,2,cx,cy,ry*1.05);
  gr.addColorStop(0,'#7a4426'); gr.addColorStop(.45,'#3a1d12'); gr.addColorStop(1,'#140906');
  g.fillStyle='rgba(255,246,232,.95)'; g.beginPath(); g.ellipse(cx,cy+1,rx+4,ry+4,0,0,7); g.fill();
  g.fillStyle=gr; g.beginPath(); g.ellipse(cx,cy,rx,ry,0,0,7); g.fill();
  g.strokeStyle=INK; g.lineWidth=3; g.stroke();
  g.fillStyle='rgba(255,255,255,.96)'; g.beginPath(); g.ellipse(cx+s*-rx*.28,cy-ry*.38,rx*.34,ry*.3,-.4,0,7); g.fill();
  g.beginPath(); g.arc(cx+s*rx*.36,cy+ry*.4,rx*.15,0,7); g.fill();
  if(extra){ g.fillStyle='rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx+s*rx*.05,cy+ry*.05,rx*.08,0,7); g.fill(); }
}
function eyes(g,kind){
  EX.forEach((cx,i)=>{ const s=i?1:-1, cy=EY; g.lineCap='round'; g.lineJoin='round';
    switch(kind){
      case 'open': iris(g,cx,cy,37,43,s); break;
      case 'baby': iris(g,cx,cy+2,42,48,s,true); break;
      case 'lash': iris(g,cx,cy,37,43,s); g.strokeStyle=INK; g.lineWidth=5;
        for(const k of [0,1]){ g.beginPath(); g.moveTo(cx+s*(28+k*7),cy-30+k*8); g.lineTo(cx+s*(42+k*7),cy-40+k*5); g.stroke(); } break;
      case 'happy': g.strokeStyle=INK; g.lineWidth=9; g.beginPath(); g.arc(cx,cy+18,30,Math.PI*1.15,Math.PI*1.85); g.stroke(); break;
      case 'sleep': g.strokeStyle=INK; g.lineWidth=8; g.beginPath(); g.arc(cx,cy-10,28,Math.PI*.15,Math.PI*.85); g.stroke();
        g.lineWidth=4; for(const k of[.32,.5,.68]){ const a=Math.PI*k; g.beginPath(); g.moveTo(cx+Math.cos(a)*23,cy-10+Math.sin(a)*23); g.lineTo(cx+Math.cos(a)*31,cy-10+Math.sin(a)*31); g.stroke(); } break;
      case 'lid': { // relaxed / unwell half-lidded eye
        g.save(); g.beginPath(); g.rect(cx-40,cy-6,80,60); g.clip(); iris(g,cx,cy+4,36,40,s); g.restore();
        g.strokeStyle=INK; g.lineWidth=8; g.beginPath(); g.moveTo(cx-39,cy-4+s*2); g.quadraticCurveTo(cx,cy-13,cx+39,cy-4-s*2); g.stroke(); break; }
    }
  });
}
function mouth(g,kind){
  const cx=128; g.lineCap='round'; g.lineJoin='round';
  if(kind==='goat'||kind==='goatOpen'){
    g.fillStyle='#3a2420'; g.beginPath(); g.moveTo(cx-14,146); g.quadraticCurveTo(cx,141,cx+14,146); g.quadraticCurveTo(cx+4,160,cx,161); g.quadraticCurveTo(cx-4,160,cx-14,146); g.fill();
    g.fillStyle='rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx-5,147,4,2,0,0,7); g.fill();
    g.strokeStyle='#3a2420'; g.lineWidth=4; g.beginPath(); g.moveTo(cx,161); g.lineTo(cx,172); g.stroke();
    if(kind==='goat'){ g.beginPath(); g.arc(cx-9,171,9,Math.PI*.1,Math.PI*.9); g.stroke(); g.beginPath(); g.arc(cx+9,171,9,Math.PI*.1,Math.PI*.9); g.stroke(); }
    else { g.fillStyle='#5a1c1c'; g.beginPath(); g.ellipse(cx,186,19,15,0,0,7); g.fill(); g.fillStyle='#ef7a86'; g.beginPath(); g.ellipse(cx,193,11,6,0,0,7); g.fill(); }
  } else {
    for(const s of[-1,1]){ g.fillStyle='#9a5a5e'; g.beginPath(); g.ellipse(cx+s*24,150,8,11,s*.35,0,7); g.fill(); }
    g.strokeStyle='#8a4a4e'; g.lineWidth=4;
    if(kind==='cow'){ g.beginPath(); g.moveTo(cx-24,181); g.quadraticCurveTo(cx,192,cx+24,181); g.stroke(); }
    else { g.fillStyle='#5a1c1c'; g.beginPath(); g.ellipse(cx,188,22,15,0,0,7); g.fill(); g.fillStyle='#ef7a86'; g.beginPath(); g.ellipse(cx,195,13,6,0,0,7); g.fill(); }
  }
}
function cheeks(g){
  for(const s of[-1,1]){ const cx=128+s*86, cy=138, r=26; const gr=g.createRadialGradient(cx,cy,2,cx,cy,r);
    gr.addColorStop(0,'rgba(255,120,130,.6)'); gr.addColorStop(.6,'rgba(255,128,136,.3)'); gr.addColorStop(1,'rgba(255,140,140,0)'); g.fillStyle=gr; g.beginPath(); g.arc(cx,cy,r,0,7); g.fill(); }
}

let _tex=null;
export function faceAtlas(){
  if(_tex) return _tex;
  const c=document.createElement('canvas'); c.width=S*FACE.COLS; c.height=S*FACE.ROWS; const g=c.getContext('2d');
  const cells=[()=>eyes(g,'open'),()=>eyes(g,'happy'),()=>eyes(g,'sleep'),()=>eyes(g,'lid'),()=>eyes(g,'baby'),()=>eyes(g,'lash'),
    ()=>mouth(g,'goat'),()=>mouth(g,'goatOpen'),()=>mouth(g,'cow'),()=>mouth(g,'cowOpen'),()=>cheeks(g),()=>{}];
  cells.forEach((f,i)=>{ const col=i%FACE.COLS,row=(i/FACE.COLS)|0; g.save(); g.translate(col*S,row*S); g.beginPath(); g.rect(4,4,S-8,S-8); g.clip(); f(); g.restore(); });
  _tex=new THREE.CanvasTexture(c); _tex.colorSpace=THREE.SRGBColorSpace; _tex.anisotropy=4;
  return _tex;
}

// ---------------------------------------------------------------------------------------------
// Painted 2D portraits for the Hewanku roster (front-facing chibi head badge, drawn from the breed
// palette + the same face atlas cells as the 3D animals). Returns a PNG dataURL; callers cache it.
// m = {kind, pal, horns, baby, male, lash, collar, seed}; mood = 'normal'|'happy'|'sleep'|'sick'
const OUT='#3a2418';
const hexMix=(a,b,t)=>{ const A=new THREE.Color(a), B2=new THREE.Color(b); return '#'+A.lerp(B2,t).getHexString(); };
function rnd32(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// soft clay ellipse: radial shading (lit top-left) + chunky outline
function clay(g,x,y,rx,ry,rot,col,o={}){
  g.save(); g.translate(x,y); g.rotate(rot||0);
  const gr=g.createRadialGradient(-rx*.35,-ry*.45,Math.min(rx,ry)*.1,0,0,Math.max(rx,ry)*1.05);
  gr.addColorStop(0,hexMix(col,'#ffffff',o.hi??.22)); gr.addColorStop(.55,col); gr.addColorStop(1,hexMix(col,'#3a2418',o.lo??.16));
  g.beginPath(); g.ellipse(0,0,rx,ry,0,0,Math.PI*2); g.fillStyle=gr; g.fill();
  if(o.line!==0){ g.lineWidth=o.line??5; g.strokeStyle=o.stroke||OUT; g.stroke(); }
  g.restore();
}
function hornPath(g,pts,w0,w1,col){ // tapered horn along a quadratic path
  g.save(); g.lineCap='round'; g.lineJoin='round';
  const n=10; for(let pass=0;pass<2;pass++) for(let i=0;i<n;i++){ const t0=i/n,t1=(i+1)/n; const P=(t)=>{ const u=1-t; return [u*u*pts[0][0]+2*u*t*pts[1][0]+t*t*pts[2][0], u*u*pts[0][1]+2*u*t*pts[1][1]+t*t*pts[2][1]]; };
    const a=P(t0),b=P(t1); const w=w0+(w1-w0)*t0; g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]);
    if(pass===0){ g.strokeStyle=OUT; g.lineWidth=w+7; } else { g.strokeStyle=hexMix(col,'#ffffff',.15*(1-t0)); g.lineWidth=w; } g.stroke(); }
  // ridges
  g.strokeStyle=hexMix(col,OUT,.35); g.lineWidth=2;
  for(const t of[.25,.45,.65]){ const u=1-t; const x=u*u*pts[0][0]+2*u*t*pts[1][0]+t*t*pts[2][0], y=u*u*pts[0][1]+2*u*t*pts[1][1]+t*t*pts[2][1]; const w=(w0+(w1-w0)*t)*.45; g.beginPath(); g.moveTo(x-w,y+1); g.lineTo(x+w,y-1); g.stroke(); }
  g.restore();
}
function curlHorn(g,cx,cy,s,col){ // garut ram spiral
  g.save(); g.lineCap='round';
  const pts=[]; for(let i=0;i<=30;i++){ const t=i/30, a=-1.2+t*5.2, r=30*(1-t*.62); pts.push([cx+s*(Math.cos(a)*r), cy+Math.sin(a)*r]); }
  for(let pass=0;pass<2;pass++){ for(let i=0;i<30;i++){ const w=17*(1-i/30*.6); g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i+1]); g.lineWidth=pass?w:w+7; g.strokeStyle=pass?hexMix(col,'#ffffff',.12):OUT; g.stroke(); } }
  g.restore();
}
function drawFaceCells(g,atlas,eyeIdx,mouthIdx,cx,cy,rx,ry,mouthDy,eyeScale){
  const cw=atlas.width/FACE.COLS, ch=atlas.height/FACE.ROWS;
  const cell=(idx,x,y,w,h)=>{ const col=idx%FACE.COLS,row=(idx/FACE.COLS)|0; g.drawImage(atlas,col*cw+4,row*ch+4,cw-8,ch-8,x,y,w,h); };
  // atlas cell spans x:[-.95,.95]*rx, y:[-.8,+1.0]*ry around the head centre (see face.js header)
  const w=1.9*rx, h=1.8*ry;
  cell(FACE.cheeks,cx-w/2,cy-.8*ry,w,h);
  const ew=w*eyeScale, eh=h*eyeScale; const ey=cy-.2*ry; // eye line sits at 85/256 of the cell
  cell(eyeIdx,cx-ew/2,ey-eh*(85/256),ew,eh);
  cell(mouthIdx,cx-w/2,cy-.8*ry+mouthDy,w,h);
}
export function drawPortrait(m,size=128,mood='normal'){
  const R=Math.max(32,Math.min(512,size|0))*2; // 2x for crispness, downscaled below
  const c=document.createElement('canvas'); c.width=c.height=R; const g=c.getContext('2d');
  const k=R/256; g.scale(k,k); g.lineJoin='round'; g.lineCap='round';
  const P=m.pal||{}, kind=m.kind, baby=!!m.baby, rng=rnd32((m.seed|0)^0x51ed);
  const col=m.collar||'#ff5d8f';
  // ---- badge background ----
  const bg=g.createRadialGradient(128,104,10,128,128,124);
  bg.addColorStop(0,hexMix(col,'#fffaf0',.86)); bg.addColorStop(.75,hexMix(col,'#fff6e6',.7)); bg.addColorStop(1,hexMix(col,'#f6dcb8',.55));
  g.beginPath(); g.arc(128,128,122,0,Math.PI*2); g.fillStyle=bg; g.fill();
  g.save(); g.beginPath(); g.arc(128,128,116,0,Math.PI*2); g.clip();
  // little sparkles / grass tufts for charm
  g.fillStyle='rgba(255,255,255,.65)'; for(let i=0;i<5;i++){ const a=rng()*6.28, r=70+rng()*35; g.beginPath(); g.arc(128+Math.cos(a)*r,110+Math.sin(a)*r*.7,2+rng()*3,0,7); g.fill(); }
  g.fillStyle=hexMix('#8fcf6a',col,.15); g.beginPath(); g.ellipse(128,262,150,62,0,0,7); g.fill();
  // ---- shoulders / neck ----
  const bodyCol=kind==='sheep'?P.wool:P.base;
  const headCol=kind==='sheep'?P.face:P.head;
  const sc=baby?.9:1; // overall head scale
  const cx=128, cy=baby?118:122;
  if(kind==='sheep'){ for(let i=0;i<9;i++){ const a=Math.PI*(.05+i/8*.9); clay(g,128+Math.cos(a)*96,248-Math.sin(a)*44,30,26,0,P.wool,{line:4}); } clay(g,128,236,86,44,0,P.wool,{line:4}); }
  else clay(g,128,240,kind==='cow'?92:78,52,0,bodyCol||'#ddd',{line:5});
  // collar band + gold tag
  g.save(); g.lineCap='round';
  g.beginPath(); g.ellipse(128,206,kind==='cow'?66:56,18,0,Math.PI*.05,Math.PI*.95); g.strokeStyle=OUT; g.lineWidth=17; g.stroke(); g.strokeStyle=col; g.lineWidth=11; g.stroke();
  g.strokeStyle='rgba(255,255,255,.45)'; g.lineWidth=3; g.beginPath(); g.ellipse(128,203,kind==='cow'?64:54,16,0,Math.PI*.25,Math.PI*.6); g.stroke();
  g.restore();
  // ---- head (per kind) ----
  g.save(); g.translate(cx,cy); g.scale(sc,sc); g.translate(-cx,-cy);
  let rx, ry, mdy, eyeS=baby?1.12:1;
  if(kind==='goat'){
    rx=baby?62:58; ry=baby?62:66;
    const longE=P.k==='etawa'||P.k==='boer', ear=P.ear||headCol;
    for(const s of[-1,1]){ // ears behind head: long droopy (etawa/boer) or perky side ears
      const ex=cx+s*(rx*.86), ey=cy-ry*.18;
      if(longE){ clay(g,ex+s*14,ey+30,17,longE&&P.k==='etawa'?46:38,-s*.32,ear); clay(g,ex+s*13,ey+32,8,28,-s*.32,'#f0b0ae',{line:0}); }
      else { clay(g,ex+s*22,ey+4,36,15,s*.42,ear); clay(g,ex+s*20,ey+5,22,7,s*.42,'#f0b0ae',{line:0}); }
    }
    if(m.horns) for(const s of[-1,1]) hornPath(g,[[cx+s*22,cy-ry*.72],[cx+s*34,cy-ry*1.25],[cx+s*58,cy-ry*1.38]],baby?9:15,4,P.horn||'#e9ddc2');
    clay(g,cx,cy,rx,ry,0,headCol);
    if(P.blaze){ g.save(); g.beginPath(); g.ellipse(cx,cy,rx-3,ry-3,0,0,7); g.clip(); g.fillStyle=P.blaze; g.beginPath(); g.ellipse(cx,cy-10,11,ry,0,0,7); g.fill(); g.restore(); }
    if(P.k==='etawa'){ g.save(); g.beginPath(); g.ellipse(cx,cy,rx-3,ry-3,0,0,7); g.clip(); clay(g,cx-rx*.7,cy-ry*.55,24,20,0,'#8a5a3a',{line:0}); g.restore(); }
    clay(g,cx,cy-ry*.86,24,13,0,hexMix(headCol,'#ffffff',.18),{line:4}); // forelock tuft
    if(!baby){ g.fillStyle=P.beard||headCol; g.strokeStyle=OUT; g.lineWidth=5; g.beginPath(); g.moveTo(cx-17,cy+ry*.8); g.quadraticCurveTo(cx,cy+ry*1.42,cx+17,cy+ry*.8); g.closePath(); g.fill(); g.stroke(); }
    clay(g,cx,cy+ry*.46,rx*.6,ry*.38,0,P.muzzle||'#f0d0b0',{line:4});
    mdy=ry*.06;
  } else if(kind==='sheep'){
    rx=baby?52:48; ry=baby?54:56;
    // woolly puff ring behind the face
    const N=13; for(let i=0;i<N;i++){ const a=i/N*Math.PI*2-Math.PI/2; if(Math.sin(a)>.75) continue; const r=rx+16+rng()*6;
      clay(g,cx+Math.cos(a)*r*.98,cy-6+Math.sin(a)*r*1.02,24+rng()*6,22+rng()*5,0,hexMix(P.wool,'#fff1d6',.1),{line:4}); }
    for(const s of[-1,1]){ clay(g,cx+s*(rx+30),cy-4,32,13,s*.25,P.ear||P.face); clay(g,cx+s*(rx+28),cy-3,20,6,s*.25,'#ec9fa0',{line:0}); }
    if(!baby&&(m.horns||P.k==='garut')){ g.save(); const hs=m.horns?1:.78; for(const s of[-1,1]){ g.save(); g.translate(cx+s*(rx+6),cy-ry*.3); g.scale(hs,hs); curlHorn(g,0,0,s,P.horn||'#d8c7a5'); g.restore(); } g.restore(); }
    clay(g,cx,cy,rx,ry,0,headCol);
    // wool fringe cap over the forehead
    for(let i=0;i<5;i++){ const a=(i/4-.5)*2.3; clay(g,cx+Math.sin(a)*34,cy-ry*.86+Math.abs(a)*7,19,16,0,hexMix(P.wool,'#fff1d6',.1),{line:4}); }
    clay(g,cx,cy-ry*1.0,22,17,0,hexMix(P.wool,'#ffffff',.15),{line:4});
    clay(g,cx,cy+ry*.5,rx*.56,ry*.34,0,P.muzzle||P.face,{line:4});
    mdy=ry*.02;
  } else { // cow
    rx=baby?64:66; ry=baby?58:56;
    const droopy=P.k==='brahman';
    for(const s of[-1,1]){ const ex=cx+s*(rx+10), ey=cy-ry*.28;
      if(droopy){ clay(g,ex,ey+24,20,40,-s*.55,P.ear); clay(g,ex,ey+25,10,28,-s*.55,'#f4a6a8',{line:0}); }
      else { clay(g,ex+s*2,ey,29,15,s*.24,P.ear); clay(g,ex+s*2,ey+1,18,7,s*.24,'#f4a6a8',{line:0}); } }
    if(m.horns) for(const s of[-1,1]) hornPath(g,[[cx+s*rx*.5,cy-ry*.78],[cx+s*rx*.95,cy-ry*1.0],[cx+s*rx*1.02,cy-ry*1.35]],baby?8:14,5,P.horn||'#efe6cf');
    clay(g,cx,cy,rx,ry,0,headCol);
    g.save(); g.beginPath(); g.ellipse(cx,cy,rx-3,ry-3,0,0,7); g.clip();
    if(P.k==='holstein'){ g.fillStyle='#2c2a2e'; g.beginPath(); g.ellipse(cx+rx*.55,cy-ry*.55,rx*.55,ry*.5,.3,0,7); g.fill(); if(rng()<.7){ g.beginPath(); g.ellipse(cx-rx*.75,cy-ry*.1+rng()*10,rx*.3,ry*.28,-.4,0,7); g.fill(); } }
    if(P.k==='bali'){ g.fillStyle='rgba(255,246,230,.55)'; g.beginPath(); g.ellipse(cx,cy+ry*.3,rx*.7,ry*.4,0,0,7); g.fill(); }
    g.restore();
    clay(g,cx,cy-ry*.92,26,13,0,P.k==='holstein'?'#3a373b':hexMix(headCol,'#ffffff',.1),{line:4}); // tuft
    clay(g,cx,cy+ry*.5,rx*.66,ry*.42,0,P.muzzle||'#f2d6c8',{line:4});
    mdy=ry*.0;
  }
  // ---- face (shared atlas cells) ----
  const atlas=faceAtlas().image;
  let eye=m.eyes?.open??(baby?FACE.eyeBaby:FACE.eyeOpen);
  if(mood==='happy') eye=FACE.eyeHappy; else if(mood==='sleep'||mood==='sick') eye=FACE.eyeSleep; // sick: soft closed eyes (the lid cell reads grumpy at badge size)
  const mouthIdx=kind==='cow'?FACE.mCow:FACE.mGoat;
  drawFaceCells(g,atlas,eye,mouthIdx,cx,cy,rx,ry,mdy,eyeS);
  if(mood==='sick'){ // pale-blue cheeks, a sweat drop and a little plaster: 'unwell, needs care' (gentle, not scary)
    g.fillStyle='rgba(120,170,255,.30)'; for(const s of[-1,1]){ g.beginPath(); g.ellipse(cx+s*rx*.48,cy+ry*.05,14,7,0,0,7); g.fill(); }
    const dx=cx+rx*.78, dy=cy-ry*.42; g.beginPath(); g.moveTo(dx,dy-13); g.quadraticCurveTo(dx+9,dy+1,dx,dy+6); g.quadraticCurveTo(dx-9,dy+1,dx,dy-13);
    g.fillStyle='#bfe6ff'; g.fill(); g.lineWidth=3; g.strokeStyle='#4a7fb0'; g.stroke(); g.fillStyle='#fff'; g.beginPath(); g.arc(dx-2,dy-1,2.2,0,7); g.fill();
    g.save(); g.translate(cx-rx*.42,cy-ry*.62); g.rotate(-.55);
    for(const r of[0,Math.PI/2]){ g.save(); g.rotate(r); g.beginPath(); g.roundRect(-17,-6.5,34,13,6); g.fillStyle='#ffe2c2'; g.fill(); g.lineWidth=3; g.strokeStyle=OUT; g.stroke();
      g.fillStyle='#f3c79c'; for(const k of[-4,0,4]){ g.beginPath(); g.arc(k,0,1.3,0,7); g.fill(); } g.restore(); }
    g.restore(); }
  if(mood==='sleep'){ g.save(); g.font='bold 26px sans-serif'; g.lineWidth=5; g.strokeStyle=OUT; g.fillStyle='#e9f2ff';
    for(const [x,y,s] of [[cx+rx*.98,cy-ry*.62,1],[cx+rx*1.22,cy-ry*.98,.72]]){ g.save(); g.translate(x,y); g.scale(s,s); g.strokeText('z',0,0); g.fillText('z',0,0); g.restore(); } g.restore(); }
  g.restore();
  // gold tag + bell on the collar
  g.fillStyle='#ffd24a'; g.strokeStyle=OUT; g.lineWidth=4; g.beginPath(); g.arc(128,226,12,0,7); g.fill(); g.stroke();
  g.fillStyle='#fff2b0'; g.beginPath(); g.arc(124,222,4,0,7); g.fill();
  g.restore(); // disc clip
  // ---- rims ----
  g.beginPath(); g.arc(128,128,119,0,Math.PI*2); g.lineWidth=7; g.strokeStyle='#fff4dc'; g.stroke();
  g.beginPath(); g.arc(128,128,123,0,Math.PI*2); g.lineWidth=3; g.strokeStyle='rgba(58,36,24,.55)'; g.stroke();
  // downscale for smooth edges
  const S2=R/2; const o=document.createElement('canvas'); o.width=o.height=S2; const og=o.getContext('2d'); og.imageSmoothingQuality='high'; og.drawImage(c,0,0,S2,S2);
  return o.toDataURL('image/png');
}

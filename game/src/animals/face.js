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

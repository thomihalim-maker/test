// Painted face atlas (eyes / mouths / brows / cheeks). Faces are a texture decal projected onto the head sphere in the
// shader, so features never poke past the silhouette, stay crisp (canvas AA) and cost no extra draw calls.
// Cell grid 6x4. Face rect in head-centre space: x[-.31,.31] -> u, y[-.27,.17] -> v.
import * as THREE from 'three';

export const CW = 224, CH = 160, COLS = 6, ROWS = 4;
export const CELL = {
  eyeRound:0, eyeOval:1, eyeGentle:2, eyeKid:3, eyeHappy:4, eyeCalm:5, eyeWide:6, eyeSleepy:7,
  mSmile:8, mTalk:9, mO:10, mFlat:11, mGrin:12, mCat:13,
  browAngled:14, browArch:15, browThick:16, browSoft:17,
  cheekBlush:18, cheekFreckle:19, cheekLight:20, cheekKid:21
};
export const EYE_V = (-.02+.27)/.44;   // eye centre line in face-rect v (blink squash pivot)

const X = (x)=> (x+.31)/.62*CW, Y = (y)=> (.17-y)/.44*CH;
const INK = '#3a2117';

function drawEye(g, cx, cy, s, o){
  const { rx=25, ry=30, irx=19, iry=24, lid=0, pupil=1 } = o;
  g.save();
  // clip for lidded eyes
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
  if(lid){ g.save(); g.clip(); }
  // sclera
  g.fillStyle = '#fffaf3'; g.fill();
  // iris gradient
  const gr = g.createLinearGradient(cx, cy-iry, cx, cy+iry);
  gr.addColorStop(0,'#24130c'); gr.addColorStop(.55,'#4a2a19'); gr.addColorStop(1,'#8a5532');
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx-s*1.5, cy+3, irx, iry, 0, 0, Math.PI*2); g.fill();
  if(pupil){ g.fillStyle = '#140904'; g.beginPath(); g.ellipse(cx-s*1.5, cy+1, irx*.5, iry*.52, 0, 0, Math.PI*2); g.fill(); }
  // highlights
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(cx+s*5-1, cy-iry*.42, irx*.36, irx*.36, 0, 0, Math.PI*2); g.fill();
  g.beginPath(); g.arc(cx-s*7-1, cy+iry*.45, irx*.17, 0, Math.PI*2); g.fill();
  if(lid){
    g.fillStyle = 'rgba(0,0,0,0)'; g.restore();
    // lid: erase the top part, then draw the lid line
    g.globalCompositeOperation = 'destination-out';
    const ly = cy - 2*ry + lid;
    g.beginPath(); g.ellipse(cx, ly, rx+8, ry, 0, 0, Math.PI*2); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = INK; g.lineCap='round';
    g.lineWidth = 2.6; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI*.08, Math.PI*.92); g.stroke();
    g.lineWidth = 5.5; g.beginPath(); g.ellipse(cx, ly, rx+1, ry, 0, Math.PI*.2, Math.PI*.8); g.stroke();
  } else {
    // outline + heavier upper lash line
    g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); g.stroke();
    g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI*1.12, Math.PI*1.88); g.stroke();
    g.beginPath(); g.moveTo(cx+s*rx*.85, cy-ry*.45); g.lineTo(cx+s*(rx+6), cy-ry*.62); g.stroke(); // lash flick
  }
  g.restore();
}
function eyesCell(g, kind){
  for(const s of [-1,1]){
    const cx = X(s*.122), cy = Y(-.02);
    const so = s; // so>0 = character's left (screen right)
    switch(kind){
      case 'round': drawEye(g,cx,cy,so,{}); break;
      case 'oval': drawEye(g,cx,cy,so,{rx:19,ry:32,irx:15,iry:27}); break;
      case 'gentle': drawEye(g,cx,cy+3,so,{rx:24,ry:25,irx:18,iry:20,lid:16}); break;
      case 'kid': drawEye(g,cx,cy+2,so,{rx:30,ry:34,irx:24,iry:28}); break;
      case 'wide': drawEye(g,cx,cy-2,so,{rx:28,ry:34,irx:12,iry:14}); break;
      case 'sleepy': drawEye(g,cx,cy+4,so,{rx:24,ry:24,irx:18,iry:20,lid:24}); break;
      case 'happy': g.strokeStyle=INK; g.lineWidth=6; g.lineCap='round'; g.beginPath(); g.arc(cx,cy+12,19,Math.PI*1.12,Math.PI*1.88); g.stroke(); break;
      case 'calm': g.strokeStyle=INK; g.lineWidth=5.5; g.lineCap='round'; g.beginPath(); g.arc(cx,cy-8,19,Math.PI*.15,Math.PI*.85); g.stroke();
        g.lineWidth=3; for(const k of[.3,.5,.7]){ const a=Math.PI*k; g.beginPath(); g.moveTo(cx+Math.cos(a)*19,cy-8+Math.sin(a)*19); g.lineTo(cx+Math.cos(a)*25,cy-8+Math.sin(a)*25); g.stroke(); } break;
    }
  }
}
function mouthCell(g, kind){
  const cx = X(0), cy = Y(-.12);
  g.lineCap='round'; g.lineJoin='round';
  const red='#6e2a22', dark='#5a1c1c', tongue='#ef7a86';
  switch(kind){
    case 'smile': g.strokeStyle=red; g.lineWidth=5; g.beginPath(); g.arc(cx,cy-12,18,Math.PI*.22,Math.PI*.78); g.stroke(); break;
    case 'talk': g.fillStyle=dark; g.beginPath(); g.moveTo(cx-15,cy-5); g.quadraticCurveTo(cx,cy-9,cx+15,cy-5); g.quadraticCurveTo(cx+14,cy+15,cx,cy+16); g.quadraticCurveTo(cx-14,cy+15,cx-15,cy-5); g.fill();
      g.fillStyle=tongue; g.beginPath(); g.ellipse(cx,cy+10,9,5,0,0,Math.PI*2); g.fill(); break;
    case 'o': g.fillStyle=dark; g.beginPath(); g.ellipse(cx,cy+2,7,9,0,0,Math.PI*2); g.fill(); break;
    case 'flat': g.strokeStyle=red; g.lineWidth=4.5; g.beginPath(); g.moveTo(cx-10,cy+1); g.quadraticCurveTo(cx,cy+4,cx+10,cy+1); g.stroke(); break;
    case 'grin': g.fillStyle=dark; g.beginPath(); g.moveTo(cx-21,cy-7); g.quadraticCurveTo(cx,cy-3,cx+21,cy-7); g.quadraticCurveTo(cx+18,cy+20,cx,cy+21); g.quadraticCurveTo(cx-18,cy+20,cx-21,cy-7); g.fill();
      g.fillStyle=tongue; g.beginPath(); g.ellipse(cx,cy+13,11,6,0,0,Math.PI*2); g.fill(); break;
    case 'cat': g.strokeStyle=red; g.lineWidth=4.5; g.beginPath(); g.arc(cx-8,cy-3,8,Math.PI*.1,Math.PI*.95); g.stroke(); g.beginPath(); g.arc(cx+8,cy-3,8,Math.PI*.05,Math.PI*.9); g.stroke(); break;
  }
}
function browCell(g, kind){
  g.strokeStyle='#ffffff'; g.lineCap='round';
  for(const s of [-1,1]){
    const cx = X(s*.122), cy = Y(.105);
    g.beginPath();
    switch(kind){
      case 'angled': g.lineWidth=7; g.moveTo(cx-s*14,cy+1); g.lineTo(cx+s*15,cy+5); break;
      case 'arch': g.lineWidth=6; g.arc(cx,cy+14,17,Math.PI*1.2,Math.PI*1.8); break;
      case 'thick': g.lineWidth=10; g.moveTo(cx-14,cy+3); g.lineTo(cx+14,cy+3); break;
      case 'soft': g.lineWidth=6.5; g.moveTo(cx-s*14,cy+6); g.lineTo(cx+s*14,cy); break;
    }
    g.stroke();
  }
}
function cheekCell(g, kind){
  for(const s of [-1,1]){
    const cx = X(s*.2), cy = Y(-.11), r = kind==='kid'?32:26;
    const a = kind==='light'?.32:kind==='kid'?.62:.52;
    const gr = g.createRadialGradient(cx,cy,2,cx,cy,r); gr.addColorStop(0,`rgba(255,112,118,${a})`); gr.addColorStop(.6,`rgba(255,120,124,${a*.55})`); gr.addColorStop(1,'rgba(255,130,130,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.fill();
    if(kind==='freckle'){ g.fillStyle='rgba(150,84,52,.75)'; for(const [dx,dy] of [[-9,-6],[3,-9],[10,0],[-3,4],[6,8]]){ g.beginPath(); g.arc(cx+dx,cy+dy,2.3,0,Math.PI*2); g.fill(); } }
    if(kind==='kid'){ g.fillStyle='rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx+s*-8,cy-8,3.2,0,Math.PI*2); g.fill(); }
  }
}

let _tex = null;
export function faceAtlas(){
  if(_tex) return _tex;
  const c = document.createElement('canvas'); c.width = CW*COLS; c.height = CH*ROWS;
  const g = c.getContext('2d');
  const cells = [
    ['e','round'],['e','oval'],['e','gentle'],['e','kid'],['e','happy'],['e','calm'],['e','wide'],['e','sleepy'],
    ['m','smile'],['m','talk'],['m','o'],['m','flat'],['m','grin'],['m','cat'],
    ['b','angled'],['b','arch'],['b','thick'],['b','soft'],
    ['c','blush'],['c','freckle'],['c','light'],['c','kid']
  ];
  cells.forEach(([t,k],i)=>{
    const col=i%COLS, row=(i/COLS)|0;
    g.save(); g.translate(col*CW,row*CH); g.beginPath(); g.rect(2,2,CW-4,CH-4); g.clip();
    if(t==='e') eyesCell(g,k); else if(t==='m') mouthCell(g,k); else if(t==='b') browCell(g,k); else cheekCell(g,k);
    g.restore();
  });
  _tex = new THREE.CanvasTexture(c);
  _tex.flipY = false; _tex.colorSpace = THREE.SRGBColorSpace; _tex.anisotropy = 4;
  _tex.premultiplyAlpha = false; _tex.generateMipmaps = true; _tex.minFilter = THREE.LinearMipmapLinearFilter;
  return _tex;
}

// pack face state into one float (exact integer < 2^24)
export function faceCode(eyes, mouth, brow, cheek, open){
  const o = Math.max(0,Math.min(7,Math.round(open*7)));
  return eyes + (mouth<<5) + (brow<<10) + (cheek<<15) + (o<<20);
}

// Procedural canvas textures + tiny utils for the animals module.
import * as THREE from 'three';

export function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function hash3(x,y,z){ let h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453; return h-Math.floor(h); }
export function vnoise(x,y,z){
  const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z); const xf=x-xi,yf=y-yi,zf=z-zi;
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf), w=zf*zf*(3-2*zf);
  const l=(a,b,t)=>a+(b-a)*t;
  return l(l(l(hash3(xi,yi,zi),hash3(xi+1,yi,zi),u),l(hash3(xi,yi+1,zi),hash3(xi+1,yi+1,zi),u),v),
           l(l(hash3(xi,yi,zi+1),hash3(xi+1,yi,zi+1),u),l(hash3(xi,yi+1,zi+1),hash3(xi+1,yi+1,zi+1),u),v),w);
}

function cv(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return [c,c.getContext('2d')]; }
function tex(c,{repeat=true,srgb=true,aniso=4}={}){
  const t=new THREE.CanvasTexture(c); if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}
  if(srgb) t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=aniso; return t;
}

// soft fur/wool grain, multiplies vertex colour (centered near white)
export function furTexture(){
  const [c,g]=cv(128,128); const rnd=mulberry32(7);
  g.fillStyle='#f6f6f6'; g.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){
    const x=rnd()*128,y=rnd()*128,l=3+rnd()*7,a=rnd()*Math.PI;
    g.strokeStyle=rnd()<.5?'rgba(255,255,255,.3)':'rgba(190,190,190,.16)'; g.lineWidth=1+rnd();
    for(const ox of [-128,0,128]) for(const oy of [-128,0,128]){
      g.beginPath(); g.moveTo(x+ox,y+oy); g.lineTo(x+ox+Math.cos(a)*l,y+oy+Math.sin(a)*l); g.stroke();
    }
  }
  return tex(c);
}
export function woodTexture(){
  const [c,g]=cv(256,256); const rnd=mulberry32(3);
  g.fillStyle='#d9c3a0'; g.fillRect(0,0,256,256);
  for(let i=0;i<70;i++){
    const y=rnd()*256; g.strokeStyle=`rgba(${90+rnd()*40|0},${60+rnd()*30|0},${30+rnd()*20|0},${.10+rnd()*.18})`; g.lineWidth=1+rnd()*3;
    g.beginPath(); g.moveTo(0,y); for(let x=0;x<=256;x+=32) g.lineTo(x,y+Math.sin(x*.05+i)*3+rnd()*2); g.stroke();
  }
  for(let i=0;i<4;i++){ const x=rnd()*256,y=rnd()*256; g.strokeStyle='rgba(80,50,25,.35)'; g.lineWidth=2;
    g.beginPath(); g.ellipse(x,y,10,4,0,0,7); g.stroke(); g.beginPath(); g.ellipse(x,y,5,2,0,0,7); g.stroke(); }
  return tex(c);
}
export function strawTexture(){
  const [c,g]=cv(256,256); const rnd=mulberry32(11);
  g.fillStyle='#e8c46a'; g.fillRect(0,0,256,256);
  for(let i=0;i<1400;i++){
    const x=rnd()*256,y=rnd()*256,l=10+rnd()*28,a=(rnd()-.5)*2.2;
    const k=rnd(); g.strokeStyle=k<.4?'#f7dc8a':k<.7?'#c99a3c':'#e0b04e'; g.lineWidth=1+rnd()*1.4;
    for(const ox of [-256,0,256]) for(const oy of [-256,0,256]){
      g.beginPath(); g.moveTo(x+ox,y+oy); g.lineTo(x+ox+Math.cos(a)*l,y+oy+Math.sin(a)*l); g.stroke(); }
  }
  return tex(c);
}
export function thatchTexture(){
  const [c,g]=cv(256,256); const rnd=mulberry32(5);
  g.fillStyle='#e0b867'; g.fillRect(0,0,256,256);
  for(let r=0;r<16;r++){
    const y=r*16; const grd=g.createLinearGradient(0,y,0,y+16); grd.addColorStop(0,'#c99a54'); grd.addColorStop(.35,'#f0cd82'); grd.addColorStop(1,'#d8ae62');
    g.fillStyle=grd; g.fillRect(0,y,256,16);
    for(let i=0;i<60;i++){ const x=rnd()*256; g.strokeStyle=`rgba(${rnd()<.5?'255,230,160':'80,50,20'},.35)`; g.lineWidth=1; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(rnd()-.5)*5,y+16); g.stroke(); }
  }
  return tex(c);
}
// ground patch for inside the pen: dirt + straw + grass specks, soft alpha edge
export function penGroundTexture(){
  const [c,g]=cv(512,384); const rnd=mulberry32(21);
  g.fillStyle='#d1b777'; g.fillRect(0,0,512,384);
  for(let i=0;i<2600;i++){
    const x=rnd()*512,y=rnd()*384; const k=rnd();
    g.fillStyle=k<.35?'rgba(120,88,44,.28)':k<.6?'rgba(235,205,125,.35)':k<.8?'rgba(110,150,60,.30)':'rgba(255,240,190,.20)';
    g.beginPath(); g.ellipse(x,y,2+rnd()*7,1+rnd()*3,rnd()*3,0,7); g.fill();
  }
  for(let i=0;i<500;i++){ const x=rnd()*512,y=rnd()*384,a=rnd()*3; g.strokeStyle='rgba(224,185,95,.5)'; g.lineWidth=1.2;
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9); g.stroke(); }
  // mud puddles near water trough + wash tub
  for(const [mx,my,mr] of [[400,85,46],[110,297,50],[300,330,24]]){ const gr=g.createRadialGradient(mx,my,4,mx,my,mr); gr.addColorStop(0,'rgba(92,64,38,.75)'); gr.addColorStop(.7,'rgba(110,80,48,.45)'); gr.addColorStop(1,'rgba(110,80,48,0)'); g.fillStyle=gr; g.beginPath(); g.ellipse(mx,my,mr*1.3,mr*.85,.3,0,7); g.fill(); }
  // hoof prints (pairs of crescents)
  for(let i=0;i<46;i++){ const x=40+rnd()*430,y=40+rnd()*300,a=rnd()*6.28; g.save(); g.translate(x,y); g.rotate(a); g.fillStyle='rgba(88,62,36,.4)';
    for(const o of[-5,5]){ g.beginPath(); g.ellipse(o,0,3,6.5,0,0,7); g.fill(); g.fillStyle='rgba(150,115,70,.35)'; g.beginPath(); g.ellipse(o,.5,1.2,4,0,0,7); g.fill(); g.fillStyle='rgba(88,62,36,.4)'; } g.restore(); }
  // clover patches
  for(let i=0;i<28;i++){ const x=30+rnd()*450,y=30+rnd()*320; g.fillStyle=rnd()<.5?'rgba(96,160,70,.8)':'rgba(124,184,84,.8)'; for(let k=0;k<3;k++){ g.beginPath(); g.arc(x+Math.cos(k*2.09)*3.5,y+Math.sin(k*2.09)*3.5,3.4,0,7); g.fill(); } if(rnd()<.2){ g.fillStyle='#fff'; g.beginPath(); g.arc(x,y-6,2.2,0,7); g.fill(); } }
  // loose straw tufts
  for(let i=0;i<60;i++){ const x=rnd()*512,y=rnd()*384; g.strokeStyle='rgba(247,222,140,.9)'; g.lineWidth=1.6; for(let k=0;k<4;k++){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+(rnd()-.5)*18,y+(rnd()-.5)*10); g.stroke(); } }
  // alpha mask: rounded rect with feathered edge
  const [m,mg]=cv(512,384); mg.fillStyle='#000'; mg.fillRect(0,0,512,384);
  mg.filter='blur(14px)'; mg.fillStyle='#fff'; mg.beginPath(); mg.roundRect(26,26,460,332,40); mg.fill();
  const id=g.getImageData(0,0,512,384), md=mg.getImageData(0,0,512,384);
  for(let i=0;i<id.data.length;i+=4) id.data[i+3]=md.data[i];
  g.putImageData(id,0,0);
  return tex(c,{repeat:false});
}
// particle atlas 4 cells: heart, bubble, sparkle, Z
export function particleAtlas(){
  const [c,g]=cv(256,64);
  const cell=(i,fn)=>{ g.save(); g.translate(i*64+32,32); fn(); g.restore(); };
  cell(0,()=>{ g.fillStyle='#ff5d8f'; g.strokeStyle='#fff'; g.lineWidth=4; g.beginPath(); g.moveTo(0,20); g.bezierCurveTo(-34,-4,-20,-30,0,-12); g.bezierCurveTo(20,-30,34,-4,0,20); g.fill(); g.stroke();
    g.fillStyle='rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(-10,-10,5,3,-.7,0,7); g.fill(); });
  cell(1,()=>{ const gr=g.createRadialGradient(-6,-8,2,0,0,24); gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(.35,'rgba(200,235,255,.25)'); gr.addColorStop(.85,'rgba(170,220,255,.45)'); gr.addColorStop(1,'rgba(255,255,255,.9)');
    g.fillStyle=gr; g.beginPath(); g.arc(0,0,24,0,7); g.fill(); });
  cell(2,()=>{ g.fillStyle='#fff7c2'; g.beginPath(); for(let i=0;i<8;i++){ const r=i%2?7:26,a=i*Math.PI/4; g.lineTo(Math.cos(a)*r,Math.sin(a)*r);} g.closePath(); g.fill(); });
  cell(3,()=>{ g.font='bold 44px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=7; g.strokeStyle='#3b4a8c'; g.fillStyle='#fff'; g.strokeText('Z',0,2); g.fillText('Z',0,2); });
  return tex(c,{repeat:false});
}

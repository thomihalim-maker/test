// Canvas-generated tileable textures (grass / dirt / sand detail, soft blobs, glows)
import * as THREE from 'three';
import { pfbm, pnoise, mulberry32 } from './noise.js';

function tile(size, fn, { repeat = true } = {}){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); fn(g, size, c);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function noiseFill(g, size, base, amp, freq, seed, per=1){
  const img = g.getImageData(0,0,size,size), d = img.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const n = pfbm(x/size*freq+seed, y/size*freq+seed*0.7, freq, 4);
    const v = Math.max(0,Math.min(255,(base + (n-0.5)*amp)*255));
    const i=(y*size+x)*4; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
  }
  g.putImageData(img,0,0);
}
// strokes wrapped for seamless tiling
function wrapStroke(g,size,x,y,fn){ for(const ox of [-size,0,size])for(const oy of [-size,0,size]){ if(x+ox<-40||x+ox>size+40||y+oy<-40||y+oy>size+40) continue; g.save(); g.translate(ox,oy); fn(); g.restore(); } }

export function makeGrassTex(){
  return tile(256,(g,s)=>{
    noiseFill(g,s,0.80,0.34,6,3.1);
    const r = mulberry32(11);
    // painterly blade strokes
    for(let i=0;i<2600;i++){
      const x=r()*s,y=r()*s,len=5+r()*9,ang=-Math.PI/2+(r()-0.5)*1.1;
      const v = r()<0.5? 0.62+r()*0.2 : 0.95+r()*0.1; const a=0.22+r()*0.28;
      wrapStroke(g,s,x,y,()=>{ g.strokeStyle=`rgba(${v*255|0},${v*255|0},${v*255|0},${a})`; g.lineWidth=1+r()*1.6; g.lineCap='round';
        g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+Math.cos(ang)*len*0.5+3*(r()-.5),y+Math.sin(ang)*len*0.5,x+Math.cos(ang)*len,y+Math.sin(ang)*len); g.stroke(); });
    }
    // soft dabs
    for(let i=0;i<120;i++){ const x=r()*s,y=r()*s,rad=8+r()*18,v=r()<0.5?0.7:1.0;
      wrapStroke(g,s,x,y,()=>{ const gr=g.createRadialGradient(x,y,0,x,y,rad); gr.addColorStop(0,`rgba(${v*255|0},${v*255|0},${v*255|0},0.14)`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x-rad,y-rad,rad*2,rad*2); }); }
  });
}
export function makeDirtTex(){
  return tile(256,(g,s)=>{
    noiseFill(g,s,0.80,0.42,8,7.7);
    const r = mulberry32(5);
    for(let i=0;i<900;i++){ const x=r()*s,y=r()*s,rad=0.8+r()*2.4,v=r()<0.5?0.55:1;
      wrapStroke(g,s,x,y,()=>{ g.fillStyle=`rgba(${v*255|0},${v*255|0},${v*255|0},${0.18+r()*0.3})`; g.beginPath(); g.ellipse(x,y,rad*1.3,rad,r()*3,0,6.3); g.fill(); }); }
    // hairline dry cracks (random-walk with branches), dark line + soft light lip
    const crack=(x,y,a,len,w)=>{ const pts=[[x,y]]; for(let k=0;k<len;k++){ a+=(r()-0.5)*0.9; x+=Math.cos(a)*3.2; y+=Math.sin(a)*3.2; pts.push([x,y]); if(r()<0.08&&w>0.6) crack(x,y,a+(r()<0.5?1:-1)*(0.8+r()*0.6),(len-k)*0.5|0,w*0.7); }
      wrapStroke(g,s,pts[0][0],pts[0][1],()=>{ g.lineCap='round'; g.lineJoin='round';
        g.strokeStyle='rgba(255,255,255,0.22)'; g.lineWidth=w+1.2; g.beginPath(); pts.forEach(([px,py],i)=>i?g.lineTo(px+0.8,py+0.8):g.moveTo(px+0.8,py+0.8)); g.stroke();
        g.strokeStyle='rgba(40,40,40,0.5)'; g.lineWidth=w; g.beginPath(); pts.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py)); g.stroke(); }); };
    for(let i=0;i<9;i++) crack(r()*s,r()*s,r()*6.28,10+(r()*14|0),1.1+r()*0.6);
    // little straw scratches
    for(let i=0;i<160;i++){ const x=r()*s,y=r()*s,a=r()*6.28,l=4+r()*8;
      wrapStroke(g,s,x,y,()=>{ g.strokeStyle='rgba(255,255,255,0.35)'; g.lineWidth=1; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke(); }); }
  });
}
export function makeSandTex(){
  return tile(256,(g,s)=>{
    noiseFill(g,s,0.84,0.22,5,1.3);
    const r = mulberry32(2);
    // ripple lines
    for(let k=0;k<9;k++){ const y0=(k+0.5)/9*s; g.strokeStyle='rgba(255,255,255,0.10)'; g.lineWidth=3; g.beginPath();
      for(let x=0;x<=s;x+=4){ const y=y0+Math.sin(x/s*6.283*3+k)*5+ (pnoise(x/30,k*3.1,8)-.5)*10; x?g.lineTo(x,y):g.moveTo(x,y);} g.stroke(); }
    for(let i=0;i<1400;i++){ const x=r()*s,y=r()*s; g.fillStyle=`rgba(${r()<.5?60:255},${r()<.5?60:255},${r()<.5?60:255},0.10)`; g.fillRect(x,y,1.5,1.5); }
  });
}
export function makeRadialTex(stops, size=128){
  const c=document.createElement('canvas'); c.width=c.height=size; const g=c.getContext('2d');
  const gr=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  for(const [o,col] of stops) gr.addColorStop(o,col);
  g.fillStyle=gr; g.fillRect(0,0,size,size);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

// Emote bubbles: pooled sprites with canvas-drawn icons
import * as THREE from 'three';

function icon(type){
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  g.translate(64,60);
  // bubble
  g.fillStyle='#fffdf6'; g.strokeStyle='#4a3326'; g.lineWidth=6;
  g.beginPath(); g.arc(0,0,50,0,Math.PI*2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-14,44); g.lineTo(0,66); g.lineTo(14,44); g.closePath(); g.fillStyle='#fffdf6'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-12,45); g.lineTo(12,45); g.strokeStyle='#fffdf6'; g.lineWidth=8; g.stroke();
  g.lineWidth=5; g.strokeStyle='#4a3326'; g.lineJoin='round'; g.lineCap='round';
  switch(type){
    case 'heart': g.fillStyle='#ff5d7a'; g.beginPath(); g.moveTo(0,22); g.bezierCurveTo(-40,-6,-24,-34,0,-14); g.bezierCurveTo(24,-34,40,-6,0,22); g.fill(); g.stroke(); break;
    case 'smile': g.fillStyle='#ffd45e'; g.beginPath(); g.arc(0,0,30,0,7); g.fill(); g.stroke(); g.fillStyle='#4a3326'; g.beginPath(); g.arc(-11,-8,4,0,7); g.arc(11,-8,4,0,7); g.fill(); g.beginPath(); g.arc(0,2,15,.2,Math.PI-.2); g.stroke(); break;
    case '!': g.fillStyle='#ff8a3d'; g.beginPath(); g.roundRect(-8,-34,16,42,7); g.fill(); g.stroke(); g.beginPath(); g.arc(0,22,9,0,7); g.fill(); g.stroke(); break;
    case '?': g.fillStyle='#4aa3e8'; g.lineWidth=10; g.strokeStyle='#4aa3e8'; g.beginPath(); g.arc(0,-12,16,Math.PI*1.1,Math.PI*2.4); g.lineTo(0,10); g.stroke(); g.beginPath(); g.arc(0,28,3,0,7); g.stroke(); break;
    case 'note': g.fillStyle='#7a5ad8'; g.strokeStyle='#7a5ad8'; g.lineWidth=8; g.beginPath(); g.moveTo(8,18); g.lineTo(8,-30); g.lineTo(30,-20); g.stroke(); g.beginPath(); g.ellipse(-3,20,14,10,-.4,0,7); g.fill(); break;
    case 'coin': g.fillStyle='#ffcf3a'; g.beginPath(); g.arc(0,0,32,0,7); g.fill(); g.stroke(); g.fillStyle='#d89a12'; g.beginPath(); g.arc(0,0,20,0,7); g.fill(); g.fillStyle='#ffe58a'; g.font='bold 34px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('$',0,2); break;
    case 'star': g.fillStyle='#ffd23f'; g.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?15:34; g.lineTo(Math.cos(a)*r,Math.sin(a)*r+2); } g.closePath(); g.fill(); g.stroke(); break;
    case 'dome': // listening to the adzan: a little masjid dome with a crescent
      g.fillStyle='#3fbfa8'; g.beginPath(); g.moveTo(-28,22); g.lineTo(-28,6); g.bezierCurveTo(-28,-22,28,-22,28,6); g.lineTo(28,22); g.closePath(); g.fill(); g.stroke();
      g.fillStyle='#fff3c4'; g.beginPath(); g.roundRect(-8,6,16,16,[8,8,0,0]); g.fill(); g.stroke();
      g.strokeStyle='#e8a91a'; g.lineWidth=4; g.beginPath(); g.moveTo(0,-14); g.lineTo(0,-24); g.stroke();
      g.fillStyle='#ffd23f'; g.beginPath(); g.arc(0,-31,7,0,7); g.fill(); g.fillStyle='#fffdf6'; g.beginPath(); g.arc(3,-33,6,0,7); g.fill(); break;
    default: g.fillStyle='#4a3326'; for(const x of[-22,0,22]){ g.beginPath(); g.arc(x,6,7,0,7); g.fill(); }
  }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

export function createBubbles(scene, n=14){
  const tex={}; const types=['heart','smile','!','?','note','coin','star','dots','dome'];
  for(const k of types) tex[k]=icon(k);
  const pool=[], active=[];
  for(let i=0;i<n;i++){ const m=new THREE.SpriteMaterial({map:tex.smile,transparent:true,depthWrite:false}); const s=new THREE.Sprite(m); s.visible=false; s.renderOrder=20; scene.add(s); pool.push(s); }
  return {
    emote(person,type,dur=2.2){
      const ex=active.find(a=>a.person===person); if(ex){ ex.t=0; ex.dur=dur; ex.sprite.material.map=tex[type]||tex.dots; ex.sprite.material.needsUpdate=true; return; }
      const s=pool.pop(); if(!s) return;
      s.material.map=tex[type]||tex.dots; s.material.needsUpdate=true; s.visible=true; s.material.opacity=1;
      active.push({sprite:s,person,t:0,dur});
    },
    update(dt){
      for(let i=active.length-1;i>=0;i--){
        const a=active[i]; a.t+=dt; const u=a.t/a.dur; const s=a.sprite;
        if(u>=1||!a.person.visible){ s.visible=false; pool.push(s); active.splice(i,1); continue; }
        const x=Math.min(1,a.t/.28), pop = 1+2.2*Math.pow(x-1,3)+1.2*Math.pow(x-1,2); // easeOutBack
        const k=.62*pop*(a.person.size*.4+.6);
        s.scale.set(k,k,1);
        s.position.set(a.person.head.x, a.person.head.y+.28*a.person.size+.1*Math.min(1,a.t*2), a.person.head.z);
        s.material.opacity = u>.8?(1-u)/.2:1;
      }
    }
  };
}

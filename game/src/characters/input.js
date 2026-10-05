// Input: virtual joystick (touch), WASD/arrows, contextual action button + tool chip. Pure DOM.
import * as THREE from 'three';

const CSS = `
#mb-input{position:fixed;inset:0;pointer-events:none;z-index:20;user-select:none;-webkit-user-select:none;touch-action:none}
#mb-joy{position:absolute;left:calc(env(safe-area-inset-left,0px) + 22px);bottom:calc(env(safe-area-inset-bottom,0px) + 26px);width:132px;height:132px;pointer-events:auto;touch-action:none;display:none}
#mb-joy.on{display:block}
#mb-joy .base{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.28),rgba(255,248,225,.14));border:3px solid rgba(255,255,255,.55);box-shadow:0 6px 18px rgba(60,40,10,.25),inset 0 0 18px rgba(255,255,255,.25)}
#mb-joy .knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fffdf2,#ffe9a8 60%,#f3c968);border:3px solid #fff;box-shadow:0 5px 12px rgba(80,50,0,.35);transition:transform .08s}
#mb-act{position:absolute;right:calc(env(safe-area-inset-right,0px) + 24px);bottom:calc(env(safe-area-inset-bottom,0px) + 30px);width:92px;height:92px;border-radius:50%;pointer-events:auto;touch-action:none;
  background:radial-gradient(circle at 35% 28%,#fff6c9,#ffd45e 55%,#f0a62c);border:4px solid #fff;box-shadow:0 8px 20px rgba(90,55,0,.4),inset 0 -6px 10px rgba(200,110,0,.35);
  display:flex;flex-direction:column;align-items:center;justify-content:center;font:800 14px/1.1 ui-rounded,system-ui,sans-serif;color:#5a3300;cursor:pointer;transition:transform .12s,opacity .2s,filter .2s}
#mb-act .ic{width:38px;height:38px;line-height:1;filter:drop-shadow(0 2px 0 rgba(255,255,255,.5))}
#mb-act .ic svg,#mb-tool svg{width:100%;height:100%;display:block}
#mb-act .lb{margin-top:2px;text-shadow:0 1px 0 rgba(255,255,255,.6)}
#mb-act.idle{filter:saturate(.9);opacity:.95}
#mb-act.down{transform:scale(.9)}
#mb-act.ready{animation:mbpulse 1.1s ease-in-out infinite}
@keyframes mbpulse{50%{transform:scale(1.07)}}
#mb-tool{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 132px);display:none;gap:6px;pointer-events:auto}
#mb-tool.on{display:flex}
#mb-tool button{width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.8);background:rgba(255,246,214,.78);padding:6px!important;box-shadow:0 4px 10px rgba(60,40,0,.3);padding:0;cursor:pointer;opacity:.7}
#mb-tool button.sel{opacity:1;background:#fff;transform:scale(1.14);border-color:#ffc94a}
`;

// emoji -> clay SVG icon from the UI sprite (#i-*), falls back to the emoji text
const ICO={'✋':'hand','🌾':'hay','💧':'water','🧼':'soap','🤍':'heart','🥁':'drum','🥕':'treat','👋':'people','🍎':'treat'};
const icoSvg=e=>ICO[e]?`<svg viewBox="0 0 48 48"><use href="#i-${ICO[e]}"/></svg>`:`<span style="font-size:28px">${e??''}</span>`;
export function createInput(ctx){
  const input = { move:new THREE.Vector2(), actionPressed:false, actionJustPressed:false, run:false, touch:false, tool:null, hasTool:false };
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id='mb-input';
  root.innerHTML = `<div id="mb-joy"><div class="base"></div><div class="knob"></div></div>
    <div id="mb-tool"></div>
    <div id="mb-act" class="idle"><div class="ic">${icoSvg("✋")}</div><div class="lb">Aksi</div></div>`;
  (document.getElementById('ui')||document.body).appendChild(root);
  const joy = root.querySelector('#mb-joy'), knob = joy.querySelector('.knob'), act = root.querySelector('#mb-act'), toolBox = root.querySelector('#mb-tool');
  const q = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window || q.has('joy');
  if(coarse){ joy.classList.add('on'); input.touch = true; }

  // joystick
  let jid=null, jc={x:0,y:0}; const R=46;
  const jset=(e)=>{
    let dx=e.clientX-jc.x, dy=e.clientY-jc.y; const d=Math.hypot(dx,dy); const k=d>R?R/d:1; dx*=k; dy*=k;
    knob.style.transform=`translate(${dx}px,${dy}px)`;
    let mx=dx/R, my=dy/R; const m=Math.hypot(mx,my); if(m<.12){mx=my=0;} else { const s=(m-.12)/.88; mx=mx/m*s; my=my/m*s; }
    joyV.set(mx,my);
  };
  const joyV = new THREE.Vector2();
  joy.addEventListener('pointerdown',e=>{ if(jid!==null) return; jid=e.pointerId; joy.setPointerCapture(jid); const r=joy.getBoundingClientRect(); jc={x:r.left+r.width/2,y:r.top+r.height/2}; input.touch=true; jset(e); e.preventDefault(); });
  joy.addEventListener('pointermove',e=>{ if(e.pointerId===jid) jset(e); });
  const jend=e=>{ if(e.pointerId!==jid) return; jid=null; joyV.set(0,0); knob.style.transform=''; };
  joy.addEventListener('pointerup',jend); joy.addEventListener('pointercancel',jend);
  // show joystick after first touch anywhere
  addEventListener('touchstart',()=>{ joy.classList.add('on'); input.touch=true; },{once:true,passive:true});

  // keyboard
  const keys = new Set();
  const norm = k=>k.length===1?k.toLowerCase():k;
  addEventListener('keydown',e=>{
    if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k=norm(e.key); keys.add(k);
    if((k===' '||k==='e'||k==='Enter') && !e.repeat){ press(); e.preventDefault(); }
    if(k==='Tab'||k==='q'){ if(!e.repeat){ input.cycleTool?.(); e.preventDefault(); } }
    if(k.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup',e=>{ const k=norm(e.key); keys.delete(k); if(k===' '||k==='e'||k==='Enter') release(); });
  addEventListener('blur',()=>{ keys.clear(); release(); });
  function press(){ input.actionPressed=true; input.actionJustPressed=true; act.classList.add('down'); }
  function release(){ input.actionPressed=false; act.classList.remove('down'); }
  act.addEventListener('pointerdown',e=>{ act.setPointerCapture(e.pointerId); press(); e.preventDefault(); });
  act.addEventListener('pointerup',release); act.addEventListener('pointercancel',release);

  input.update = ()=>{
    let kx=0,ky=0;
    if(keys.has('a')||keys.has('ArrowLeft')) kx-=1; if(keys.has('d')||keys.has('ArrowRight')) kx+=1;
    if(keys.has('w')||keys.has('ArrowUp')) ky-=1; if(keys.has('s')||keys.has('ArrowDown')) ky+=1;
    if(kx||ky){ const l=Math.hypot(kx,ky); kx/=l; ky/=l; }
    input.move.set(kx+joyV.x, ky+joyV.y); if(input.move.length()>1) input.move.normalize();
    input.run = keys.has('Shift') || joyV.length()>.93;
    input.actionJustPressed = false; // consumed by controller via _jp
  };
  // actionJustPressed must survive until controller reads it: controller calls input.consume()
  let jp=false; const _press=press; press=function(){ jp=true; _press(); };
  input.consume = ()=>{ const v=jp; jp=false; return v; };

  // contextual UI
  input.setContext = (c)=>{ // {icon,label} or null
    if(c){ act.classList.remove('idle'); act.classList.add('ready'); act.querySelector('.ic').innerHTML=icoSvg(c.icon); act.querySelector('.lb').textContent=c.label; }
    else { act.classList.add('idle'); act.classList.remove('ready'); act.querySelector('.ic').innerHTML=icoSvg('✋'); act.querySelector('.lb').textContent='Aksi'; }
  };
  input.setTools = (tools, sel, onPick)=>{ // tools:[{id,icon}] or null
    toolBox.innerHTML=''; if(!tools){ toolBox.classList.remove('on'); return; }
    toolBox.classList.add('on');
    for(const t of tools){ const b=document.createElement('button'); b.innerHTML=icoSvg(t.icon); if(t.id===sel) b.className='sel';
      b.addEventListener('pointerdown',e=>{ e.stopPropagation(); onPick(t.id); e.preventDefault(); }); toolBox.appendChild(b); }
  };
  input.dispose = ()=>root.remove();
  return input;
}

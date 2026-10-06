import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createCtx } from './ctx.js';
import { load, save } from './state.js';

const ctx = createCtx(document.getElementById('c'));
ctx.state = load();
ctx.THREE = THREE;
const { renderer, scene, camera } = ctx;
const low = ctx.quality === 'low';
if (low) renderer.shadowMap.type = THREE.PCFShadowMap;

// Post: MSAA scene target (WebGL2) -> bloom -> output (tone mapping/sRGB handled by OutputPass)
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: low ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256,256), 0.28, 0.7, 0.92);
// Guard: one non-finite pixel from any module would otherwise blur into a fully black frame through bloom.
bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace(
  'vec4 texel = texture2D( tDiffuse, vUv );',
  'vec4 texel = texture2D( tDiffuse, vUv ); texel = ( any( isnan( texel ) ) || any( isinf( texel ) ) ) ? vec4( 0.0 ) : min( texel, vec4( 64.0 ) );');
composer.addPass(bloom); composer.addPass(new OutputPass());
ctx.composer = composer; ctx.bloom = bloom;

// Dynamic resolution: drop pixel ratio when frames run long, recover when there is headroom.
let dpr = renderer.getPixelRatio();
const minDpr = 0.75;
function applySize(){
  const w=innerWidth,h=innerHeight;
  renderer.setPixelRatio(dpr); renderer.setSize(w,h,false);
  composer.setPixelRatio(dpr); composer.setSize(w,h);
  // Bloom is soft by nature; run it at half the composer resolution.
  bloom.setSize(Math.max(1,(w*dpr)>>1), Math.max(1,(h*dpr)>>1));
  camera.aspect=w/h; camera.updateProjectionMatrix();
}
addEventListener('resize',applySize); addEventListener('orientationchange',applySize); applySize();

// Accurate per-frame stats (composer passes would otherwise reset renderer.info mid-frame).
renderer.info.autoReset = false;
ctx.stats = { fps:60, calls:0, triangles:0, dpr };

// Module load order matters. Missing modules are skipped so agents can work independently.
const order = ['world/world','audio/audio','masjid/masjid','characters/characters','animals/animals','fx/fx','game/progress','ui/ui'];
const mods = [];
// Loading-screen progress for boot.js (index.html). Harmless when nothing listens (e.g. build-play snapshot).
const signal = (type, detail) => { try { dispatchEvent(new CustomEvent(type, { detail })); } catch (e) {} };
for (const [i, name] of order.entries()){
  signal('game:progress', { done:i, total:order.length, next:name });
  try{
    const m = await import(`./${name}.js`);
    const inst = await m.init(ctx); ctx.modules[name.split('/')[1]] = inst; if(inst?.update) mods.push(inst);
  }catch(e){ console.error('module failed:',name,e); signal('game:error', { name, message:String(e?.message||e), where:String(e?.stack||'').split('\n').find(l=>/:\d+:\d+\)?$/.test(l))?.trim()||'' }); }
}

const clock = new THREE.Clock();
let acc=0, frames=0, slow=0, fast=0;
// Off under automation (headless software GL runs ~1 fps and would otherwise blur screenshots).
const auto = !new URLSearchParams(location.search).has('fixeddpr') && !navigator.webdriver;
function frame(){
  const raw = clock.getDelta();
  const dt = Math.min(raw,1/30); ctx.time += dt;
  for (const m of mods) m.update(dt, ctx.time);
  renderer.info.reset();
  composer.render();
  ctx.stats.calls = renderer.info.render.calls; ctx.stats.triangles = renderer.info.render.triangles;
  acc += raw; frames++;
  if (acc >= 1){
    const fps = frames/acc; ctx.stats.fps = fps; acc = 0; frames = 0;
    if (auto && !document.hidden){
      if (fps < 45){ fast=0; if(++slow>=2 && dpr>minDpr){ dpr=Math.max(minDpr,dpr-0.25); slow=0; applySize(); } }
      else if (fps > 58){ slow=0; if(++fast>=5 && dpr<ctx.maxDpr){ dpr=Math.min(ctx.maxDpr,dpr+0.25); fast=0; applySize(); } }
      else { slow=fast=0; }
      ctx.stats.dpr = dpr;
    }
  }
}
signal('game:progress', { done:order.length, total:order.length });
renderer.setAnimationLoop(frame);
// Tell the loading screen once the first frame has been drawn.
requestAnimationFrame(()=>requestAnimationFrame(()=>signal('game:ready', { version: window.MARBOT_VERSION || 'dev' })));
// Autosave. A save that vanished means 'Hapus Progres' just ran (ui.js: reset(); location.reload()): never write the
// old in-memory state back while the page unloads. (boot.js guards localStorage the same way for every writer.)
let hadSave = (()=>{ try{ return localStorage.getItem('marbot.save')!==null; }catch(e){ return false; } })(), wiped = false;
const persist = ()=>{
  if (wiped) return;
  try{ if (hadSave && localStorage.getItem('marbot.save')===null){ wiped = true; return; } }catch(e){}
  save(ctx.state); hadSave = true;
};
document.addEventListener('visibilitychange',()=>{ if(document.hidden) persist(); else clock.getDelta(); });
addEventListener('pagehide',persist); // reload / app close / update prompt
setInterval(persist,10000);
window.__ctx = ctx; // for debugging / test harness (single-player, offline: nothing secret in here)

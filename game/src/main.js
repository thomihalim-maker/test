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

// Post: bloom + output (tone mapping/sRGB handled by OutputPass)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256,256), 0.28, 0.7, 0.92);
composer.addPass(bloom); composer.addPass(new OutputPass());
ctx.composer = composer; ctx.bloom = bloom;

function resize(){
  const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); composer.setSize(w,h);
  camera.aspect=w/h; camera.updateProjectionMatrix();
}
addEventListener('resize',resize); addEventListener('orientationchange',resize); resize();

// Module load order matters. Missing modules are skipped so agents can work independently.
const order = ['world/world','audio/audio','masjid/masjid','characters/characters','animals/animals','fx/fx','ui/ui'];
const mods = [];
for (const name of order){
  try{
    const m = await import(`./${name}.js`);
    const inst = await m.init(ctx); ctx.modules[name.split('/')[1]] = inst; if(inst?.update) mods.push(inst);
  }catch(e){ console.error('module failed:',name,e); }
}

const clock = new THREE.Clock();
function frame(){
  const dt = Math.min(clock.getDelta(),1/30); ctx.time += dt;
  for (const m of mods) m.update(dt, ctx.time);
  composer.render();
}
renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(ctx.state); });
setInterval(()=>save(ctx.state),10000);
window.__ctx = ctx; // for debugging / test harness

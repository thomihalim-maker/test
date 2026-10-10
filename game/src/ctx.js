// Shared game context + tiny event bus. Every module: export function init(ctx){ ...; return {update(dt,t){}} }
import * as THREE from 'three';
export function createCtx(canvas){
  // Quality tier: 'low' on touch/small devices or ?q=low; modules read ctx.quality to scale density/shadows.
  const qp = new URLSearchParams(location.search).get('q');
  const mobile = matchMedia('(pointer:coarse)').matches || Math.min(screen.width,screen.height) < 600;
  const quality = qp==='low'||qp==='high' ? qp : (mobile ? 'low' : 'high');
  // MSAA is applied on the composer target (see main.js), so the default framebuffer needs none.
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance'});
  const maxDpr = quality==='low' ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio,maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const handlers = {};
  const ctx = {
    THREE, renderer, scene, camera, canvas, quality, maxDpr,
    time:0, hour:8,            // hour: 0-24 in-game clock (world module drives it)
    state:{},                  // shared mutable game state (see src/state.js)
    sun:null, hemi:null,       // set by world: DirectionalLight / HemisphereLight
    groundHeight:(x,z)=>0,     // replaced by world.terrain
    colliders:[],              // {x,z,r} circles for simple avoidance
    modules:{},                // name -> module instance
    on(e,f){(handlers[e]??=[]).push(f);return ()=>handlers[e]=handlers[e].filter(g=>g!==f)},
    // one throwing listener must not abort the emitter or the other listeners
    emit(e,d){(handlers[e]||[]).slice().forEach(f=>{ try{ f(d); }catch(err){ console.error('listener',e,err); } })},
  };
  return ctx;
}

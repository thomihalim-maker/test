// Shared game context + tiny event bus. Every module: export function init(ctx){ ...; return {update(dt,t){}} }
import * as THREE from 'three';
export function createCtx(canvas){
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const handlers = {};
  const ctx = {
    THREE, renderer, scene, camera, canvas,
    time:0, hour:8,            // hour: 0-24 in-game clock (world module drives it)
    state:{},                  // shared mutable game state (see src/state.js)
    sun:null, hemi:null,       // set by world: DirectionalLight / HemisphereLight
    groundHeight:(x,z)=>0,     // replaced by world.terrain
    colliders:[],              // {x,z,r} circles for simple avoidance
    modules:{},                // name -> module instance
    on(e,f){(handlers[e]??=[]).push(f);return ()=>handlers[e]=handlers[e].filter(g=>g!==f)},
    emit(e,d){(handlers[e]||[]).slice().forEach(f=>f(d))},
  };
  return ctx;
}

import * as THREE from 'three';
import { buildAnimal } from './model.js';
export async function init(ctx){
  if(!ctx.modules.world){ const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#7fb069'})); g.receiveShadow=true; ctx.scene.add(g);
    ctx.scene.add(new THREE.HemisphereLight('#bfe3ff','#8a7a50',1.1)); const d=new THREE.DirectionalLight('#fff0cc',2.6); d.position.set(30,40,20); ctx.scene.add(d); ctx.scene.background=new THREE.Color('#9fd3ff'); }
  const kinds=['goat','goat','goat','goat','sheep','sheep','sheep','sheep','cow','cow','cow','cow'];
  kinds.forEach((k,i)=>{ const a=buildAnimal(k,i*37+5); a.group.position.set(26+(i%4)*2.2-3.3,0,6+Math.floor(i/4)*2.4-2.4); a.group.rotation.y=.55; ctx.scene.add(a.group); console.log(k,a.breed,a.dims.tris); });
  const q=new URLSearchParams(location.search).get('cam');
  return { update(){ if(q){ const v=q.split(',').map(Number); ctx.camera.position.set(v[0],v[1],v[2]); ctx.camera.lookAt(v[3],v[4],v[5]); } } };
}

// Procedural geometry builders: grass tufts, flowers, bushes, rocks, palm / banana / mango trees
import * as THREE from 'three';
import { mulberry32, clamp } from './noise.js';

class B {
  constructor(){ this.p=[]; this.n=[]; this.c=[]; this.i=[]; }
  v(p,n,c){ this.p.push(p[0],p[1],p[2]); this.n.push(n[0],n[1],n[2]); this.c.push(c[0],c[1],c[2]); return this.p.length/3-1; }
  t(a,b,c){ this.i.push(a,b,c); }
  q(a,b,c,d){ this.i.push(a,b,c,a,c,d); }
  geo(){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3)); g.setIndex(this.i); g.computeBoundingSphere(); return g; }
}
const nrm=(x,y,z)=>{const l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l];};
const hx=(s)=>{const c=new THREE.Color(s);return [c.r,c.g,c.b];};
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];

// ---------- grass tuft: n blades, normals up for soft lighting ----------
export function grassTuft({ n=5, height=1, width=0.09, spread=0.16, seed=1, base=[0.5,0.62,0.45], mid=[0.9,1.0,0.7], tip=[1.35,1.45,0.85] }={}){
  const b=new B(), r=mulberry32(seed);
  for(let k=0;k<n;k++){
    const a=r()*Math.PI*2, d=r()*spread, ox=Math.cos(a)*d, oz=Math.sin(a)*d;
    const yaw=r()*Math.PI*2, h=height*(0.55+r()*0.6), w=width*(0.8+r()*0.5), lean=(0.1+r()*0.35)*h;
    const cy=Math.cos(yaw), sy=Math.sin(yaw), lx=Math.cos(yaw+1.57)*lean, lz=Math.sin(yaw+1.57)*lean;
    const up=[0,1,0], nn=nrm(Math.cos(yaw+1.57)*0.25,1,Math.sin(yaw+1.57)*0.25);
    const rows=[[0,w,0,base],[0.5,w*0.8,0.25,mid]];
    const idx=[];
    for(const [t,ww,l,c] of rows){
      const cx=ox+lx*l*t*2, cz=oz+lz*l*t*2, y=h*t;
      idx.push(b.v([cx-cy*ww/2,y,cz-sy*ww/2],nn,c),b.v([cx+cy*ww/2,y,cz+sy*ww/2],nn,c));
    }
    const tip3=b.v([ox+lx*1.0,h,oz+lz*1.0],nn,tip);
    b.q(idx[0],idx[1],idx[3],idx[2]); b.t(idx[2],idx[3],tip3);
  }
  return b.geo();
}
// flower: returns {petals, stem}
export function flowerGeo(){
  const bs=new B(), bp=new B();
  const g=hx('#4a9a2e'), g2=hx('#78c040'), gold=hx('#ffc83a');
  const H=0.34, up=[0,1,0];
  // stem: thin 3-sided
  const s0=[],s1=[];
  for(let k=0;k<3;k++){ const a=k/3*Math.PI*2; s0.push(bs.v([Math.cos(a)*0.012,0,Math.sin(a)*0.012],[Math.cos(a),0.2,Math.sin(a)],g)); s1.push(bs.v([Math.cos(a)*0.008,H,Math.sin(a)*0.008],[Math.cos(a),0.2,Math.sin(a)],g2)); }
  for(let k=0;k<3;k++){ const m=(k+1)%3; bs.q(s0[k],s0[m],s1[m],s1[k]); }
  // small leaf
  bs.t(bs.v([0,0.08,0],up,g),bs.v([0.12,0.2,0.0],up,g2),bs.v([0.01,0.12,0.03],up,g));
  // center
  const cc=bs.v([0,H+0.035,0],up,gold); const ring=[]; for(let k=0;k<6;k++){ const a=k/6*6.283; ring.push(bs.v([Math.cos(a)*0.035,H+0.02,Math.sin(a)*0.035],up,gold)); }
  for(let k=0;k<6;k++) bs.t(cc,ring[(k+1)%6],ring[k]);
  // petals (white; tinted by instance color)
  const P=5;
  for(let k=0;k<P;k++){ const a=k/P*6.283;
    const ca=Math.cos(a), sa=Math.sin(a), pa=Math.cos(a+0.55), pb=Math.sin(a+0.55), qa=Math.cos(a-0.55), qb=Math.sin(a-0.55);
    const nn=nrm(ca*0.5,1,sa*0.5);
    const i0=bp.v([ca*0.025,H+0.02,sa*0.025],nn,[0.9,0.9,0.9]);
    const i1=bp.v([pa*0.08,H+0.045,pb*0.08],nn,[1.1,1.1,1.1]);
    const i2=bp.v([ca*0.15,H+0.06,sa*0.15],nn,[1,1,1]);
    const i3=bp.v([qa*0.08,H+0.045,qb*0.08],nn,[1.1,1.1,1.1]);
    bp.q(i0,i1,i2,i3);
  }
  return { stem:bs.geo(), petals:bp.geo() };
}

// ---------- blob (displaced sphere with spherical normals) ----------
function blob(b, c, rx,ry,rz, color, {wd=9,hd=6,disp=0.18,seed=1,upBias=0.35,aoFn=null}={}){
  const r=mulberry32(seed), phase=[r()*9,r()*9,r()*9];
  const rows=[];
  for(let j=0;j<=hd;j++){ const phi=j/hd*Math.PI; const row=[];
    for(let i=0;i<wd;i++){ const th=i/wd*Math.PI*2;
      let x=Math.sin(phi)*Math.cos(th), y=Math.cos(phi), z=Math.sin(phi)*Math.sin(th);
      const d=1+disp*(Math.sin(x*3+phase[0])*Math.cos(y*3+phase[1])+Math.sin(z*4+phase[2])*0.5);
      const p=[c[0]+x*rx*d,c[1]+y*ry*d,c[2]+z*rz*d]; const nn=nrm(x/rx*0.8+0*x,y*1+upBias,z/rz*0.8); 
      let col=typeof color==='function'?color(x,y,z,p):color; if(aoFn) col=mul(col,aoFn(p,[x,y,z]));
      row.push(b.v(p,nrm(x,y+upBias,z),col)); } rows.push(row); }
  for(let j=0;j<hd;j++)for(let i=0;i<wd;i++){ const i2=(i+1)%wd; b.q(rows[j][i],rows[j+1][i],rows[j+1][i2],rows[j][i2]); }
}
export function bushGeo({flowers=false,seed=3}={}){
  const b=new B(), r=mulberry32(seed);
  const lo=hx('#2f8a3e'), hi=hx('#8fd44c'), fl=[hx('#ff7ca8'),hx('#ffffff'),hx('#ffd23f')];
  const fc=fl[seed%3];
  for(let k=0;k<4;k++){
    const a=k/4*6.283+r(), d=k?0.45:0, c=[Math.cos(a)*d,0.42+r()*0.1,Math.sin(a)*d], s=0.62+r()*0.25;
    blob(b,c,s,s*0.82,s,(x,y,z,p)=>{ let col=mix(lo,hi,clamp(y*0.5+0.55,0,1)); if(flowers && r()<0.09 && y>-0.1) col=mul(fc,1.25); return col; },{seed:seed*7+k,disp:0.2,wd:8,hd:5,aoFn:(p,n)=>0.65+0.35*clamp((p[1]+0.1)/0.8,0,1)});
  }
  return b.geo();
}
export function rockGeo(seed=2){
  const b=new B(); const lo=hx('#8e897c'), hi=hx('#c4bfae');
  blob(b,[0,0.22,0],0.55,0.38,0.5,(x,y)=>mix(lo,hi,clamp(y*0.5+0.5,0,1)),{seed,disp:0.28,wd:7,hd:4,upBias:0.1});
  blob(b,[0.45,0.12,0.15],0.3,0.22,0.28,(x,y)=>mix(lo,hi,clamp(y*0.5+0.5,0,1)),{seed:seed+1,disp:0.25,wd:6,hd:3,upBias:0.1});
  return b.geo();
}

// ---------- tube ----------
function tube(b, pts, radii, seg, colorFn, {flare=0}={}){
  const rings=[];
  for(let i=0;i<pts.length;i++){
    const p=pts[i], pn=pts[Math.min(i+1,pts.length-1)], pp=pts[Math.max(i-1,0)];
    const tx=pn[0]-pp[0], ty=pn[1]-pp[1], tz=pn[2]-pp[2]; const T=new THREE.Vector3(tx,ty,tz).normalize();
    const side=new THREE.Vector3().crossVectors(T,new THREE.Vector3(0,0,1)); if(side.lengthSq()<1e-4) side.set(1,0,0); side.normalize();
    const fw=new THREE.Vector3().crossVectors(side,T).normalize();
    const row=[]; const rad=radii[i]*(1+(i===0?flare:0));
    for(let k=0;k<seg;k++){ const a=k/seg*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
      const n=side.clone().multiplyScalar(ca).addScaledVector(fw,sa);
      row.push(b.v([p[0]+n.x*rad,p[1]+n.y*rad,p[2]+n.z*rad],[n.x,n.y,n.z],colorFn(i/(pts.length-1),k,i))); }
    rings.push(row);
  }
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<seg;k++){ const k2=(k+1)%seg; b.q(rings[i][k],rings[i][k2],rings[i+1][k2],rings[i+1][k]); }
}

// ---------- leaf strip (palm frond / banana leaf) ----------
function leaf(b, base, yaw, len, rise, droop, width, rows, cBase, cTip, {jag=0,notch=0,fold=0.3,seed=1,sweep=0.0,mid=1.15,shape=0.75,twist=0}={}){
  const r=mulberry32(seed);
  const hx_=Math.cos(yaw), hz_=Math.sin(yaw), sx=-hz_, sz=hx_;
  const P=(s)=>[base[0]+hx_*len*s,base[1]+rise*s-droop*s*s,base[2]+hz_*len*s];
  const idx=[];
  for(let i=0;i<=rows;i++){
    const s=i/rows, p=P(s), p2=P(Math.min(1,s+0.02)), p1=P(Math.max(0,s-0.02));
    const t=nrm(p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]);
    let w=width*Math.pow(Math.sin(Math.PI*Math.pow(s,shape)),0.85);
    if(s>0.98) w=0.0;
    let wl=w, wr=w;
    if(jag && i%2===1) { wl*=1-jag; wr*=1-jag; }
    if(notch && r()<notch && i>2 && i<rows){ if(r()<0.5) wl*=0.35; else wr*=0.35; }
    const tw=twist*s;
    const c=mix(cBase,cTip,Math.pow(s,0.9));
    const sw=jag&&i%2===1? -0.0:0; // placeholder
    const L=[p[0]-sx*wl+hx_*(sweep*wl),p[1]-fold*wl-tw*wl,p[2]-sz*wl+hz_*(sweep*wl)];
    const R=[p[0]+sx*wr+hx_*(sweep*wr),p[1]-fold*wr+tw*wr,p[2]+sz*wr+hz_*(sweep*wr)];
    const side=[sx,0,sz]; let n=[t[1]*side[2]-t[2]*side[1],t[2]*side[0]-t[0]*side[2],t[0]*side[1]-t[1]*side[0]]; if(n[1]<0) n=[-n[0],-n[1],-n[2]];
    const nc=nrm(n[0],n[1]+0.5,n[2]), nl=nrm(n[0]-sx*0.5,n[1]+0.5,n[2]-sz*0.5), nr=nrm(n[0]+sx*0.5,n[1]+0.5,n[2]+sz*0.5);
    const dark=0.82;
    idx.push([b.v(L,nl,mul(c,dark)),b.v(p,nc,mul(c,mid)),b.v(R,nr,mul(c,dark))]);
  }
  for(let i=0;i<rows;i++){ const a=idx[i], d=idx[i+1]; b.q(a[0],a[1],d[1],d[0]); b.q(a[1],a[2],d[2],d[1]); }
}

export function palmGeo(seed=1){
  const b=new B(), r=mulberry32(seed);
  const H=7.8, lean=1.1; const pts=[], rad=[];
  for(let i=0;i<=10;i++){ const t=i/10; pts.push([lean*t*t+0.25*Math.sin(t*3.0),H*t,0.35*Math.sin(t*2.2)]); rad.push(0.34-0.15*t); }
  const dark=hx('#8a6240'), light=hx('#c9a26c');
  tube(b,pts,rad,7,(t,k,i)=>mul(mix(dark,light,0.4+0.5*((i%2)?1:0.55)*(0.7+0.3*Math.sin(k*2.1))),0.6+0.5*t),{flare:0.5});
  const top=pts[10];
  const cb=hx('#3a9a30'), ct=hx('#a8e050');
  const NF=11;
  for(let i=0;i<NF;i++){
    const yaw=i/NF*Math.PI*2+r()*0.3, up=i%3===0;
    leaf(b,[top[0],top[1]-0.05,top[2]],yaw,3.5+r()*0.8,up?2.4:1.3+r()*0.5,up?2.2:3.2+r()*0.8,0.62,16,mix(cb,hx('#3f9a34'),r()*0.5),mix(ct,hx('#c0e860'),r()*0.4),{jag:0.55,fold:0.35,seed:seed*13+i,sweep:-0.9,shape:0.7,mid:1.25});
  }
  // coconuts
  for(let i=0;i<3;i++){ const a=i*2.1+r(); blob(b,[top[0]+Math.cos(a)*0.28,top[1]-0.42,top[2]+Math.sin(a)*0.28],0.17,0.19,0.17,hx('#6a4a2a'),{wd:6,hd:4,disp:0.05,seed:i+3}); }
  return b.geo();
}
export function bananaGeo(seed=1){
  const b=new B(), r=mulberry32(seed);
  const pts=[],rad=[]; for(let i=0;i<=5;i++){ const t=i/5; pts.push([0.15*t*t,2.5*t,0]); rad.push(0.27-0.08*t); }
  tube(b,pts,rad,7,(t,k,i)=>mul(mix(hx('#76ad45'),hx('#b9d86a'),0.5+0.3*Math.sin(i*2+k)),0.85+0.3*t),{flare:0.4});
  const top=pts[5];
  const cb=hx('#4c9d34'), ct=hx('#97d54a');
  for(let i=0;i<8;i++){
    const yaw=i/8*Math.PI*2+r()*0.4;
    leaf(b,[top[0],top[1]-0.1,top[2]],yaw,3.4+r()*0.8,(i%2?1.3:2.2),(i%2?3.6:2.8),0.8,12,mix(cb,hx('#5eb040'),r()*0.5),mix(ct,hx('#b9e25c'),r()*0.4),{notch:0.35,fold:0.28,seed:seed*7+i,mid:1.18,shape:0.7,twist:(r()-0.5)*0.4});
  }
  // hanging bunch + bud
  const stalk=[[top[0],top[1]-0.1,top[2]],[top[0]+0.22,top[1]-0.5,top[2]],[top[0]+0.38,top[1]-1.0,top[2]]];
  tube(b,stalk,[0.04,0.04,0.04],4,()=>hx('#5c8a3a'));
  for(let k=0;k<2;k++)for(let m=0;m<5;m++){ const a=m/5*6.283, y0=top[1]-0.85-k*0.2;
    const f=[[top[0]+0.36+Math.cos(a)*0.1,y0,Math.sin(a)*0.1],[top[0]+0.38+Math.cos(a)*0.17,y0-0.2,Math.sin(a)*0.17],[top[0]+0.38+Math.cos(a)*0.2,y0-0.4,Math.sin(a)*0.2]];
    tube(b,f,[0.045,0.06,0.04],5,(t)=>mix(hx('#9fc43e'),hx('#e6d352'),t)); }
  blob(b,[top[0]+0.4,top[1]-1.5,0],0.12,0.2,0.12,hx('#7b2f6a'),{wd:6,hd:4,disp:0.04,seed:9});
  return b.geo();
}
export function mangoGeo(seed=1){
  const b=new B(), r=mulberry32(seed);
  const pts=[],rad=[]; for(let i=0;i<=5;i++){ const t=i/5; pts.push([0.15*Math.sin(t*3),2.4*t,0]); rad.push(0.36-0.14*t); }
  tube(b,pts,rad,7,(t,k)=>mul(mix(hx('#5c3f28'),hx('#8a6540'),0.5+0.5*Math.sin(k*2.3)),0.8+0.3*t),{flare:0.6});
  const cy=3.9, R=1.55, blobs=[];
  for(let i=0;i<9;i++){ const a=i/9*6.283+r()*0.5, d=i?R*(0.6+0.4*r()):0; blobs.push([Math.cos(a)*d,cy+(i?(r()-0.3)*0.9:0.5),Math.sin(a)*d, 1.05+r()*0.7]); }
  // branches
  for(const bl of blobs.slice(1,6)) tube(b,[[0,2.1,0],[bl[0]*0.5,2.9,bl[2]*0.5],[bl[0]*0.85,bl[1]-0.4,bl[2]*0.85]],[0.12,0.09,0.06],4,()=>hx('#6a4a30'));
  const lo=hx('#2a8a3c'), mid=hx('#52b83e'), hi=hx('#a8e24f');
  blobs.forEach((bl,i)=>{
    const tint=r(); const hiC=mix(hi,hx('#c4e255'),tint*0.5);
    blob(b,[bl[0],bl[1],bl[2]],bl[3],bl[3]*0.82,bl[3],(x,y,z,p)=>{ const t=clamp((p[1]-2.8)/3.0,0,1); return mix(mix(lo,mid,clamp(t*1.6,0,1)),hiC,clamp((t-0.35)*1.6,0,1)); },
      {seed:seed*11+i,disp:0.22,wd:10,hd:7,upBias:0.45,aoFn:(p,n)=>{ const dc=Math.hypot(p[0],p[2]); return 0.78+0.3*clamp(dc/(R*1.4)+ (p[1]-3.0)*0.12,0,1); }});
  });
  for(let i=0;i<7;i++){ const a=r()*6.283,d=R*(0.7+0.5*r()); blob(b,[Math.cos(a)*d*0.9,cy-0.5-r()*0.6,Math.sin(a)*d*0.9],0.12,0.17,0.12,mix(hx('#ffb03a'),hx('#ff8a3a'),r()),{wd:6,hd:4,disp:0.03,seed:i}); }
  return b.geo();
}
export function lilyGeo(){
  const b=new B(); const g1=hx('#3d9a4a'), g2=hx('#6ec25a'); const N=14, c=b.v([0,0,0],[0,1,0],g2);
  const ring=[]; for(let i=0;i<=N;i++){ const a=0.25+i/N*(Math.PI*2-0.5); ring.push(b.v([Math.cos(a)*0.5,0,Math.sin(a)*0.5],[0,1,0],g1)); }
  for(let i=0;i<N;i++) b.t(c,ring[i+1],ring[i]);
  return b.geo();
}
export function lotusGeo(){
  const b=new B(); const w=hx('#fff0f4'), p=hx('#ff9bbd'), y=hx('#ffd23f');
  for(let k=0;k<8;k++){ const a=k/8*6.283; const ca=Math.cos(a), sa=Math.sin(a), pa=Math.cos(a+0.4), pb=Math.sin(a+0.4), qa=Math.cos(a-0.4), qb=Math.sin(a-0.4);
    const nn=nrm(ca*0.6,1,sa*0.6);
    b.q(b.v([0,0.02,0],nn,w),b.v([pa*0.12,0.1,pb*0.12],nn,p),b.v([ca*0.26,0.2,sa*0.26],nn,mix(p,w,0.3)),b.v([qa*0.12,0.1,qb*0.12],nn,p)); }
  for(let k=0;k<5;k++){ const a=k/5*6.283; b.t(b.v([0,0.04,0],[0,1,0],y),b.v([Math.cos(a+0.5)*0.07,0.12,Math.sin(a+0.5)*0.07],[0,1,0],y),b.v([Math.cos(a)*0.07,0.12,Math.sin(a)*0.07],[0,1,0],y)); }
  return b.geo();
}

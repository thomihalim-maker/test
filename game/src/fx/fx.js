// Pooled particle system: two THREE.Points (additive + normal), one draw call each, soft sprite atlas from canvas.
import * as THREE from 'three';
export async function init(ctx){
  // ---- sprite atlas 8x1: soft dot | heart | leaf | star glint | (confetti, procedural) | streak | bubble | slim glint ----
  const S=64, cv=document.createElement('canvas'); cv.width=S*8; cv.height=S; const g=cv.getContext('2d');
  let gr=g.createRadialGradient(32,32,0,32,32,30); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.35,'rgba(255,255,255,0.8)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,S,S);
  g.save(); g.translate(S,0); g.fillStyle='#fff'; g.beginPath(); g.moveTo(32,54); g.bezierCurveTo(4,34,10,8,32,22); g.bezierCurveTo(54,8,60,34,32,54); g.fill(); g.restore();
  g.save(); g.translate(S*2,0); g.fillStyle='#fff'; g.beginPath(); g.moveTo(8,56); g.quadraticCurveTo(6,10,56,8); g.quadraticCurveTo(58,52,8,56); g.fill(); g.strokeStyle='rgba(0,0,0,0.25)'; g.lineWidth=2; g.beginPath(); g.moveTo(10,54); g.lineTo(46,18); g.stroke(); g.restore();
  g.save(); g.translate(S*3,0); g.fillStyle='#fff'; g.beginPath(); // 4-point star glint
  for(let i=0;i<8;i++){ const a=i*Math.PI/4, r=i%2?7:28; g.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r); } g.fill(); g.fillStyle='rgba(255,255,255,0.5)'; g.fillRect(16,28,32,8); g.restore();
  // 5: soft horizontal streak (dust swish)
  g.save(); g.translate(S*5,0); { const lg=g.createLinearGradient(2,0,62,0); lg.addColorStop(0,'rgba(255,255,255,0)'); lg.addColorStop(0.55,'rgba(255,255,255,0.9)'); lg.addColorStop(1,'rgba(255,255,255,0.15)');
    g.fillStyle=lg; g.beginPath(); g.ellipse(32,32,30,7,0,0,Math.PI*2); g.fill(); g.globalCompositeOperation='destination-in'; const vg=g.createLinearGradient(0,24,0,40); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(0.5,'rgba(0,0,0,1)'); vg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=vg; g.fillRect(0,0,S,S); } g.restore();
  // 6: foam bubble (soft fill, bright rim, highlight)
  g.save(); g.translate(S*6,0); { const bg=g.createRadialGradient(32,32,10,32,32,26); bg.addColorStop(0,'rgba(255,255,255,0.35)'); bg.addColorStop(0.78,'rgba(255,255,255,0.55)'); bg.addColorStop(0.92,'rgba(255,255,255,1)'); bg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=bg; g.beginPath(); g.arc(32,32,27,0,Math.PI*2); g.fill(); g.fillStyle='rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(23,22,6,4,-0.6,0,Math.PI*2); g.fill(); } g.restore();
  // 7: slim 4-point glint with soft core (floor shine)
  g.save(); g.translate(S*7,0); g.fillStyle='#fff'; g.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4, r=i%2?4:30; g.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r); } g.fill();
    { const cg=g.createRadialGradient(32,32,0,32,32,14); cg.addColorStop(0,'rgba(255,255,255,1)'); cg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=cg; g.fillRect(14,14,36,36); } g.restore();
  const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
  // square confetti sprite uses cell 3's centre via a flag: type 4 = flat quad
  const mkSystem=(N,additive)=>{
    const geo=new THREE.BufferGeometry();
    const pos=new Float32Array(N*3), col=new Float32Array(N*3), size=new Float32Array(N), alpha=new Float32Array(N), rot=new Float32Array(N), typ=new Float32Array(N);
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor',new THREE.BufferAttribute(col,3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize',new THREE.BufferAttribute(size,1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aRot',new THREE.BufferAttribute(rot,1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aType',new THREE.BufferAttribute(typ,1).setUsage(THREE.DynamicDrawUsage));
    const mat=new THREE.ShaderMaterial({
      uniforms:{map:{value:tex},scale:{value:500}}, transparent:true, depthWrite:false, depthTest:true,
      blending:additive?THREE.AdditiveBlending:THREE.NormalBlending, fog:false,
      vertexShader:`attribute vec3 aColor;attribute float aSize,aAlpha,aRot,aType;uniform float scale;varying vec3 vC;varying float vA,vR,vT;
        void main(){vC=aColor;vA=aAlpha;vR=aRot;vT=aType;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(aSize*scale/max(-mv.z,0.1),160.);}`,
      fragmentShader:`uniform sampler2D map;varying vec3 vC;varying float vA,vR,vT;
        void main(){vec2 p=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y);vec2 uv=p+.5;
          if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;
          vec4 t;if(vT>3.5&&vT<4.5){t=vec4(1.,1.,1.,step(abs(p.x),.33)*step(abs(p.y),.2));}else{t=texture2D(map,vec2((uv.x+vT)*.125,1.-uv.y));}
          float a=t.a*vA;if(a<.01)discard;gl_FragColor=vec4(vC*t.rgb,a);}`,
    });
    const pts=new THREE.Points(geo,mat); pts.frustumCulled=false; pts.renderOrder=additive?12:11; ctx.scene.add(pts);
    // per-particle sim state
    const vx=new Float32Array(N),vy=new Float32Array(N),vz=new Float32Array(N),life=new Float32Array(N),max=new Float32Array(N),grav=new Float32Array(N),drag=new Float32Array(N),s0=new Float32Array(N),spin=new Float32Array(N),grow=new Float32Array(N),sway=new Float32Array(N),ph=new Float32Array(N),a0=new Float32Array(N),twk=new Float32Array(N),att=new Float32Array(N),acx=new Float32Array(N),acz=new Float32Array(N);
    let head=0;
    return {pts,geo,mat,N,pos,col,size,alpha,rot,typ,vx,vy,vz,life,max,grav,drag,s0,spin,grow,sway,ph,a0,twk,
      spawn(o){ const i=head; head=(head+1)%N; pos[i*3]=o.x;pos[i*3+1]=o.y;pos[i*3+2]=o.z; vx[i]=o.vx||0;vy[i]=o.vy||0;vz[i]=o.vz||0; life[i]=max[i]=o.life||1; grav[i]=o.grav||0; drag[i]=o.drag??0.5; s0[i]=o.size||0.3; grow[i]=o.grow||0; spin[i]=o.spin||0; rot[i]=o.rot||0; typ[i]=o.type||0; sway[i]=o.sway||0; ph[i]=Math.random()*6.28; a0[i]=o.alpha??1; twk[i]=o.twinkle||0; att[i]=o.att||0; if(att[i]){ acx[i]=o.ax; acz[i]=o.az; } col[i*3]=o.r;col[i*3+1]=o.g;col[i*3+2]=o.b; },
      step(dt,t){ let any=false; for(let i=0;i<N;i++){ if(life[i]<=0){ if(size[i]!==0){size[i]=0;any=true;} continue; } any=true; life[i]-=dt; if(life[i]<=0){size[i]=0;continue;}
          const k=1-life[i]/max[i], dr=Math.exp(-drag[i]*dt); if(att[i]){ vx[i]+=(acx[i]-pos[i*3])*att[i]*dt; vz[i]+=(acz[i]-pos[i*3+2])*att[i]*dt; } vx[i]*=dr; vz[i]*=dr; vy[i]=vy[i]*dr-grav[i]*dt;
          const sw=sway[i]; pos[i*3]+=(vx[i]+(sw?Math.sin(t*1.7+ph[i])*sw:0))*dt; pos[i*3+1]+=vy[i]*dt; pos[i*3+2]+=(vz[i]+(sw?Math.cos(t*1.3+ph[i])*sw:0))*dt;
          rot[i]+=spin[i]*dt; const fadeIn=Math.min(1,k*8), fadeOut=Math.min(1,(1-k)*3.2);
          size[i]=s0[i]*(1+grow[i]*k)*(0.4+0.6*Math.min(1,k*10)); alpha[i]=a0[i]*fadeIn*fadeOut*(twk[i]?0.6+0.4*Math.sin(t*twk[i]+ph[i]):1); }
        if(any){ for(const n of ['position','aSize','aAlpha','aRot']) geo.attributes[n].needsUpdate=true; geo.attributes.aColor.needsUpdate=true; geo.attributes.aType.needsUpdate=true; } }};
  };
  const add=mkSystem(1200,true), nrm=mkSystem(1600,false);
  const C=h=>{const c=new THREE.Color(h);return c;};
  const palettes={
    sparkle:['#fff3b0','#ffe27a','#ffffff','#ffd1f0','#bff3ff'], hearts:['#ff6f91','#ff8fab','#ffb3c6'],
    dust:['#d9c3a0','#c8b08a','#e6d5b8'], leaf:['#8bd450','#6bbf4b','#b5e07a','#e8c34a'],
    water:['#bfe9ff','#8fd3f4','#ffffff'], coin:['#ffd24a','#ffe27a','#fff2b0'],
    swish:['#f3e6cc','#e9d8b6','#fff6e2'], suds:['#ffffff','#eef9ff','#d8f0ff'], shine:['#ffffff','#e6fbff','#fff7d1','#c9f3ff'],
    salam:['#ff8fab','#ffb3c6','#ff6f91'],
    confetti:['#ff5d73','#ffc447','#2fd0b5','#6cc4ff','#c08bff','#ffffff','#9be564'],
  };
  const P=(k)=>{ const a=palettes[k]; return C(a[(Math.random()*a.length)|0]); };
  const R=(a,b)=>a+Math.random()*(b-a);
  const kinds={
    sparkle(p,n){ for(let i=0;i<n;i++){ const c=P('sparkle'),a=R(0,6.28),s=R(0.8,2.6); add.spawn({x:p.x+R(-.3,.3),y:p.y+R(0,.5),z:p.z+R(-.3,.3),vx:Math.cos(a)*s,vy:R(0.5,2.4),vz:Math.sin(a)*s,life:R(.7,1.3),grav:-0.4,drag:1.4,size:R(.28,.55),type:Math.random()<.5?3:0,spin:R(-3,3),twinkle:R(14,24),r:c.r,g:c.g,b:c.b}); } },
    hearts(p,n){ for(let i=0;i<n;i++){ const c=P('hearts'); nrm.spawn({x:p.x+R(-.4,.4),y:p.y+R(.2,.9),z:p.z+R(-.4,.4),vx:R(-.3,.3),vy:R(1,1.8),vz:R(-.3,.3),life:R(1.1,1.7),grav:-0.2,drag:.6,size:R(.5,.85),type:1,sway:.5,rot:R(-.4,.4),spin:R(-.6,.6),grow:.25,r:c.r,g:c.g,b:c.b}); } },
    dust(p,n){ for(let i=0;i<n;i++){ const c=P('dust'),a=R(0,6.28),s=R(.6,1.8); nrm.spawn({x:p.x,y:p.y+.1,z:p.z,vx:Math.cos(a)*s,vy:R(.2,.9),vz:Math.sin(a)*s,life:R(.5,.95),grav:-.2,drag:2.2,size:R(.5,1.0),grow:1.4,alpha:.55,r:c.r,g:c.g,b:c.b}); } },
    leaf(p,n){ for(let i=0;i<n;i++){ const c=P('leaf'),a=R(0,6.28),s=R(.5,2); nrm.spawn({x:p.x+R(-.3,.3),y:p.y+R(.4,1.2),z:p.z+R(-.3,.3),vx:Math.cos(a)*s,vy:R(1,3),vz:Math.sin(a)*s,life:R(1.3,2.3),grav:2.2,drag:1.2,size:R(.3,.5),type:2,spin:R(-5,5),rot:R(0,6),sway:1.2,r:c.r,g:c.g,b:c.b}); } },
    water(p,n){ for(let i=0;i<n;i++){ const c=P('water'),a=R(0,6.28),s=R(.5,2); nrm.spawn({x:p.x,y:p.y+.1,z:p.z,vx:Math.cos(a)*s,vy:R(2.5,5),vz:Math.sin(a)*s,life:R(.6,1),grav:11,drag:.3,size:R(.2,.4),alpha:.85,r:c.r,g:c.g,b:c.b}); } },
    coin(p,n){ for(let i=0;i<n;i++){ const c=P('coin'); add.spawn({x:p.x+R(-.2,.2),y:p.y+R(.2,.6),z:p.z+R(-.2,.2),vx:R(-.8,.8),vy:R(3,5),vz:R(-.8,.8),life:R(.7,1.1),grav:9,drag:.3,size:R(.35,.55),type:Math.random()<.4?3:0,spin:R(-6,6),twinkle:20,r:c.r,g:c.g,b:c.b}); } },
    confetti(p,n){ for(let i=0;i<n;i++){ const c=P('confetti'),a=R(0,6.28),s=R(1.5,6); nrm.spawn({x:p.x+R(-.5,.5),y:p.y+R(.5,1.5),z:p.z+R(-.5,.5),vx:Math.cos(a)*s,vy:R(4,10),vz:Math.sin(a)*s,life:R(1.8,3.2),grav:7,drag:1.3,size:R(.22,.4),type:4,spin:R(-9,9),rot:R(0,6),sway:.9,r:c.r,g:c.g,b:c.b}); } },
  };
  // screen-space angle of a world direction (for streak sprites lying along the motion)
  const cam=ctx.camera;
  function screenAng(dx,dy,dz){ const e=cam.matrixWorld.elements; const sx=dx*e[0]+dy*e[1]+dz*e[2], sy=dx*e[4]+dy*e[5]+dz*e[6]; return -Math.atan2(sy,sx); }
  // ---- masjid-care kinds (opts: {yaw, color}) ----
  Object.assign(kinds,{
    swish(p,n,o){ // arc of pale dust streaks + a few leaf flicks across the broom path (right -> left sweep)
      const yaw=o?.yaw??0, fx=Math.sin(yaw), fz=Math.cos(yaw), rx=fz, rz=-fx, gy=p.y;
      for(let i=0;i<n;i++){ const k=i/Math.max(1,n-1), a=(0.5-k)*1.9+R(-.15,.15), rad=R(.35,.75), ca=Math.cos(a), sa=Math.sin(a);
        const ox=fx*ca*rad+rx*sa*rad, oz=fz*ca*rad+rz*sa*rad;
        const tx=-(rx*ca-fx*sa), tz=-(rz*ca-fz*sa), sp=R(1.6,3.2); // tangent: sweeping toward the left side, a bit forward
        const vx=tx*sp+fx*.7, vz=tz*sp+fz*.7, c=o?.color?C(o.color):P('swish');
        if(Math.random()<.78) nrm.spawn({x:p.x+ox,y:gy+R(.05,.25),z:p.z+oz,vx,vy:R(.2,.7),vz,life:R(.35,.6),grav:.6,drag:3.2,size:R(.45,.8),type:5,rot:screenAng(vx,.3,vz),grow:.6,alpha:.62,r:c.r,g:c.g,b:c.b});
        else { const lc=P('leaf'); nrm.spawn({x:p.x+ox,y:gy+.08,z:p.z+oz,vx:vx*1.1,vy:R(1.6,2.8),vz:vz*1.1,life:R(.8,1.2),grav:6,drag:1.6,size:R(.22,.32),type:2,spin:R(-9,9),rot:R(0,6),r:lc.r,g:lc.g,b:lc.b}); } }
      for(let i=0;i<Math.ceil(n/5);i++){ const c=P('dust'); nrm.spawn({x:p.x+fx*R(.3,.7)+R(-.2,.2),y:gy+.06,z:p.z+fz*R(.3,.7)+R(-.2,.2),vx:R(-.4,.4)+fx*.4,vy:R(.15,.45),vz:R(-.4,.4)+fz*.4,life:R(.5,.9),grav:-.1,drag:2,size:R(.4,.7),grow:1.2,alpha:.4,r:c.r,g:c.g,b:c.b}); } },
    suds(p,n,o){ // white foam bubbles low on the floor, wobbling and popping
      const yaw=o?.yaw??0, fx=Math.sin(yaw), fz=Math.cos(yaw);
      for(let i=0;i<n;i++){ const c=o?.color?C(o.color):P('suds'), a=R(0,6.28), r=Math.sqrt(Math.random())*.55;
        nrm.spawn({x:p.x+Math.cos(a)*r+fx*R(-.25,.25),y:p.y+R(.03,.12),z:p.z+Math.sin(a)*r+fz*R(-.25,.25),vx:Math.cos(a)*R(.1,.45),vy:R(.15,.55),vz:Math.sin(a)*R(.1,.45),life:R(.7,1.5),grav:.25,drag:2.4,size:R(.1,.26),grow:.35,type:6,sway:.12,alpha:.92,r:c.r,g:c.g,b:c.b}); }
      for(let i=0;i<Math.ceil(n/6);i++){ const c=P('water'); nrm.spawn({x:p.x+R(-.3,.3),y:p.y+.05,z:p.z+R(-.3,.3),vx:R(-.8,.8),vy:R(1,2),vz:R(-.8,.8),life:R(.35,.55),grav:9,drag:.3,size:R(.08,.14),alpha:.8,r:c.r,g:c.g,b:c.b}); } },
    shine(p,n,o){ // small 4-point glints hugging the floor
      for(let i=0;i<n;i++){ const c=o?.color?C(o.color):P('shine'), a=R(0,6.28), r=Math.sqrt(Math.random())*.5;
        add.spawn({x:p.x+Math.cos(a)*r,y:p.y+R(.04,.16),z:p.z+Math.sin(a)*r,vx:0,vy:R(.05,.25),vz:0,life:R(.55,1.05),drag:2,size:R(.22,.42),type:7,rot:R(-.3,.3),spin:R(-1.2,1.2),grow:.3,twinkle:R(10,18),alpha:.95,r:c.r,g:c.g,b:c.b}); }
      add.spawn({x:p.x,y:p.y+.08,z:p.z,life:.5,drag:1,size:.7,grow:.8,type:0,alpha:.45,r:.85,g:.97,b:1}); },
    leafpile(p,n){ // leaves spiral inward and up into the pengki
      const gy=p.y;
      for(let i=0;i<n;i++){ const c=P('leaf'), a=R(0,6.28), r=R(.7,1.3), x=p.x+Math.cos(a)*r, z=p.z+Math.sin(a)*r, ts=R(2.2,3.2);
        nrm.spawn({x,y:gy+R(.05,.3),z,vx:-Math.sin(a)*ts-Math.cos(a)*.6,vy:R(.9,1.8),vz:Math.cos(a)*ts-Math.sin(a)*.6,att:R(9,13),ax:p.x,az:p.z,life:R(.8,1.15),grav:.4,drag:1.8,size:R(.26,.4),type:2,spin:R(-8,8),rot:R(0,6),r:c.r,g:c.g,b:c.b}); }
      kinds.dust({x:p.x,y:gy,z:p.z},4); for(let i=0;i<4;i++){ const c=P('sparkle'); add.spawn({x:p.x+R(-.2,.2),y:gy+R(.5,.9),z:p.z+R(-.2,.2),vx:R(-.6,.6),vy:R(.8,1.6),vz:R(-.6,.6),life:R(.6,1),grav:-.2,drag:1.4,size:R(.25,.4),type:3,twinkle:18,spin:R(-3,3),r:c.r,g:c.g,b:c.b}); } },
    salam(p,n){ // tiny hearts + sparkles
      for(let i=0;i<n;i++){ if(i%2===0){ const c=P('salam'); nrm.spawn({x:p.x+R(-.3,.3),y:p.y+R(1.3,1.7),z:p.z+R(-.3,.3),vx:R(-.25,.25),vy:R(.7,1.2),vz:R(-.25,.25),life:R(1,1.5),grav:-.15,drag:.8,size:R(.28,.42),type:1,sway:.35,rot:R(-.3,.3),grow:.2,r:c.r,g:c.g,b:c.b}); }
        else { const c=P('sparkle'), a=R(0,6.28); add.spawn({x:p.x+Math.cos(a)*.3,y:p.y+R(1.2,1.8),z:p.z+Math.sin(a)*.3,vx:Math.cos(a)*R(.3,.9),vy:R(.3,1),vz:Math.sin(a)*R(.3,.9),life:R(.6,1),grav:-.2,drag:1.5,size:R(.18,.3),type:3,twinkle:20,spin:R(-3,3),r:c.r,g:c.g,b:c.b}); } } },
  });
  const defaults={sparkle:14,hearts:5,dust:8,leaf:8,water:14,coin:8,confetti:60,swish:16,suds:12,shine:7,leafpile:16,salam:6};
  const NEWK=new Set(['swish','suds','shine','leafpile','salam']);
  const ZERO={x:0,y:0,z:0};
  function burst(kind,pos,count,opts){ const f=kinds[kind]; if(!f||!pos) return; let n=count??defaults[kind]; if(!(n>0)) return; if(NEWK.has(kind)&&ctx.quality==='low') n=Math.max(1,Math.ceil(n/2));
    try{ f(pos.isVector3||pos.x!==undefined?pos:ZERO,n|0,opts); }catch(e){ console.warn('fx burst',kind,e); } }

  // ---- expanding ripple rings (adzan 'call' visual): one InstancedMesh, additive, max 8 live ----
  const RMAX=8;
  const ringGeo=new THREE.PlaneGeometry(2,2); ringGeo.rotateX(-Math.PI/2);
  const rAlpha=new THREE.InstancedBufferAttribute(new Float32Array(RMAX),1).setUsage(THREE.DynamicDrawUsage);
  const rCol=new THREE.InstancedBufferAttribute(new Float32Array(RMAX*3),3).setUsage(THREE.DynamicDrawUsage);
  const rWid=new THREE.InstancedBufferAttribute(new Float32Array(RMAX),1).setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('aAlpha',rAlpha); ringGeo.setAttribute('aCol',rCol); ringGeo.setAttribute('aWid',rWid);
  const ringMat=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, fog:false,
    vertexShader:`attribute float aAlpha,aWid;attribute vec3 aCol;varying vec2 vUv;varying float vA,vW;varying vec3 vC;
      void main(){vUv=position.xz;vA=aAlpha;vW=aWid;vC=aCol;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying float vA,vW;varying vec3 vC;
      void main(){float d=length(vUv);float band=1.-smoothstep(0.,vW,abs(d-.86));float glow=(1.-smoothstep(0.,vW*3.2,abs(d-.84)))*.35;
        float a=(band*.85+glow)*vA*step(d,1.);if(a<.004)discard;gl_FragColor=vec4(vC*(1.+band*.6),a);}`,
  });
  const ringMesh=new THREE.InstancedMesh(ringGeo,ringMat,RMAX); ringMesh.frustumCulled=false; ringMesh.renderOrder=13; ringMesh.count=0; ringMesh.visible=false; ringMesh.castShadow=ringMesh.receiveShadow=false;
  ctx.scene.add(ringMesh);
  // live ring slots + pending (scheduled) rings; fixed-size pools, no per-frame allocation
  const rings=[]; for(let i=0;i<RMAX;i++) rings.push({on:false,t:0,life:1,x:0,y:0,z:0,r0:.5,r1:6,cr:1,cg:.8,cb:.5,born:0});
  const pend=[]; for(let i=0;i<24;i++) pend.push({on:false,at:0,x:0,y:0,z:0,r0:.5,r1:6,life:2.2,cr:1,cg:.8,cb:.5});
  const rc=new THREE.Color(), rm=new THREE.Matrix4(); let clock=0, ringBorn=0;
  function startRing(q){ let s=null, old=null; for(const r of rings){ if(!r.on){ s=r; break; } if(!old||r.born<old.born) old=r; } s=s||old;
    s.on=true; s.t=0; s.life=q.life; s.x=q.x; s.y=q.y; s.z=q.z; s.r0=q.r0; s.r1=q.r1; s.cr=q.cr; s.cg=q.cg; s.cb=q.cb; s.born=++ringBorn; }
  function ring(pos,{color='#ffd27a',r0=.5,r1=6,life=2.2,count=3,interval=.5}={}){
    if(!pos||!Number.isFinite(pos.x)) return 0; rc.set(color); let n=0;
    for(let k=0;k<Math.max(1,count|0);k++){ let q=null; for(const p of pend) if(!p.on){ q=p; break; } if(!q) break;
      q.on=true; q.at=clock+k*interval; q.x=pos.x; q.y=pos.y??0; q.z=pos.z; q.r0=r0; q.r1=r1; q.life=Math.max(.2,life); q.cr=rc.r; q.cg=rc.g; q.cb=rc.b; n++; }
    return n;
  }
  function stepRings(dt){
    clock+=dt;
    for(const q of pend) if(q.on&&q.at<=clock){ q.on=false; startRing(q); }
    let c=0;
    for(const r of rings){ if(!r.on) continue; r.t+=dt; const k=r.t/r.life; if(k>=1){ r.on=false; continue; }
      const e=1-Math.pow(1-k,2.2), rad=r.r0+(r.r1-r.r0)*e;
      rm.makeScale(rad,1,rad); rm.setPosition(r.x,r.y+k*.6,r.z); ringMesh.setMatrixAt(c,rm);
      rAlpha.array[c]=Math.min(1,k*6)*Math.pow(1-k,1.4)*.9; rWid.array[c]=.05+.05*(1-k);
      rCol.array[c*3]=r.cr; rCol.array[c*3+1]=r.cg; rCol.array[c*3+2]=r.cb; c++; }
    ringMesh.count=c; ringMesh.visible=c>0;
    if(c){ ringMesh.instanceMatrix.needsUpdate=true; rAlpha.needsUpdate=rWid.needsUpdate=rCol.needsUpdate=true; }
  }
  // adzan: rings around the marbot every 2s until adzan:end (12s safety cap)
  let adzanRing=null; const adzP={x:0,y:0,z:0};
  ctx.on('adzan:start',d=>{ const p=d?.pos; if(!p||!Number.isFinite(p.x)) return; adzP.x=p.x; adzP.y=(p.y??ctx.groundHeight?.(p.x,p.z)??0)+2; adzP.z=p.z;
    adzanRing={next:0,left:12}; burst('sparkle',{x:p.x,y:adzP.y-.3,z:p.z},10); });
  ctx.on('adzan:end',()=>{ adzanRing=null; });
  ctx.on('prayer:close',()=>{ adzanRing=null; });
  function stepAdzan(dt){ if(!adzanRing) return; adzanRing.left-=dt; if(adzanRing.left<=0){ adzanRing=null; return; } adzanRing.next-=dt; if(adzanRing.next<=0){ adzanRing.next=2; ring(adzP,{count:3,interval:.5}); } }

  // ---- care / prayer event wiring ----
  const tp={x:0,y:0,z:0}; const okP=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
  const floorY=p=>Number.isFinite(p.y)?p.y:(ctx.groundHeight?.(p.x,p.z)||0);
  ctx.on('care:stroke',d=>{ const p=d?.pos; if(!okP(p)) return; const yaw=Number.isFinite(d.yaw)?d.yaw:0;
    tp.x=p.x+Math.sin(yaw)*.6; tp.y=floorY(p); tp.z=p.z+Math.cos(yaw)*.6; burst(d.tool==='pel'?'suds':'swish',tp,undefined,{yaw}); });
  ctx.on('care:clean',d=>{ const p=d?.pos; if(!d?.removed||!okP(p)) return; tp.x=p.x; tp.y=floorY(p); tp.z=p.z;
    if(d.tool==='pel') burst('shine',tp); else if(d.type==='leaf') burst('leaf',tp,3); else burst('dust',tp,3); });
  ctx.on('care:gather',d=>{ const p=d?.pos; if(!okP(p)) return; tp.x=p.x; tp.y=floorY(p); tp.z=p.z; burst('leafpile',tp,Math.min(26,10+(d.n|0))); });
  ctx.on('visitor:salam',d=>{ const p=d?.pos; if(!okP(p)) return; tp.x=p.x; tp.y=floorY(p); tp.z=p.z; burst('salam',tp); });
  ctx.on('kentongan:hit',d=>{ const p=d?.pos; if(!okP(p)) return; burst('dust',p,4); });

  // ---- wind ----
  let windK=0;
  function setWind(k){ windK=Math.max(0,Math.min(1,+k||0)); }
  ctx.on('event:day',d=>setWind(d?.id==='angin'?.8:0));
  try{ if(ctx.state?.event?.id==='angin') setWind(.8); }catch(e){}
  ctx.on('animal:happy',d=>{ const p=d?.pos||d?.animal?.pos; if(p) burst('hearts',p); });
  ctx.on('animal:fed',d=>{ const p=d?.pos||d?.animal?.pos; if(p) burst('leaf',p,5); });
  ctx.on('animal:washed',d=>{ const p=d?.pos||d?.animal?.pos; if(p) burst('water',p,12); });

  // ---- ambient emitters around the camera target: pollen/motes (day), fireflies (night), drifting leaves ----
  let ambOn=true, rainOn=false, acc={pol:0,ff:0,lf:0,rn:0}; const tmp=new THREE.Vector3();
  function ambient(dt,t){
    const rig=ctx.cameraRig; const c=rig?.target; if(!c) return; const h=ctx.hour??12;
    const day=Math.max(0,Math.min(1,Math.sin((h-6)/12*Math.PI)*1.6)), night=1-day;
    acc.pol+=dt*6*day*(rainOn?0:1); acc.ff+=dt*5*night*(rainOn?.2:1); acc.lf+=dt*0.7*Math.max(day,windK*.6)*(1+windK*4);
    if(rainOn){ acc.rn+=dt*110; while(acc.rn>=1){ acc.rn--; const a=R(0,6.28),r=Math.sqrt(Math.random())*16, x=c.x+Math.cos(a)*r, z=c.z+Math.sin(a)*r, gy=ctx.groundHeight?.(x,z)||0, y=gy+R(6,11);
      nrm.spawn({x,y,z,vx:-1.2,vy:-15,vz:0,life:(y-gy)/15,drag:0,size:R(.07,.11),alpha:.55,r:.75,g:.86,b:1}); if(Math.random()<.12) nrm.spawn({x,y:gy+.05,z,vx:R(-.6,.6),vy:R(1,2),vz:R(-.6,.6),life:.3,grav:9,drag:.3,size:.09,alpha:.5,r:.85,g:.93,b:1}); } }
    while(acc.pol>=1){ acc.pol--; const a=R(0,6.28),r=R(2,22); add.spawn({x:c.x+Math.cos(a)*r,y:(ctx.groundHeight?.(c.x+Math.cos(a)*r,c.z+Math.sin(a)*r)||0)+R(.5,4),z:c.z+Math.sin(a)*r,vx:R(-.3,.3),vy:R(.05,.3),vz:R(-.3,.3),life:R(4,7),drag:.2,size:R(.12,.22),alpha:.5,sway:.4,twinkle:R(2,4),r:1,g:.95,b:.7}); }
    while(acc.ff>=1){ acc.ff--; const a=R(0,6.28),r=R(2,20); add.spawn({x:c.x+Math.cos(a)*r,y:(ctx.groundHeight?.(c.x+Math.cos(a)*r,c.z+Math.sin(a)*r)||0)+R(.4,2.6),z:c.z+Math.sin(a)*r,vx:R(-.2,.2),vy:R(0,.2),vz:R(-.2,.2),life:R(5,9),drag:.1,size:R(.3,.5),alpha:.9,sway:.7,twinkle:R(3,6),r:.75,g:1,b:.35}); }
    while(acc.lf>=1){ acc.lf--; const a=R(0,6.28),r=R(6,22),cc=P('leaf'); nrm.spawn({x:c.x+Math.cos(a)*r-windK*6,y:R(5,9),z:c.z+Math.sin(a)*r,vx:R(.5,1.2)+windK*R(2.5,4),vy:0,vz:R(-.3,.3)+windK*R(-.6,.9),life:R(6,9),grav:.35,drag:.5,size:R(.3,.45),type:2,spin:R(-2,2),rot:R(0,6),sway:1.1,alpha:.9,r:cc.r,g:cc.g,b:cc.b}); }
  }
  const api={
    burst, kinds:Object.keys(kinds), ring, setWind, get wind(){ return windK; }, get ringsLive(){ return ringMesh.count; },
    // continuous / custom helpers
    sparkleAt:(p,n)=>burst('sparkle',p,n), confettiRain(center,n=120,radius=8){ for(let i=0;i<n;i++){ const a=R(0,6.28),r=Math.sqrt(Math.random())*radius,c=P('confetti'); nrm.spawn({x:center.x+Math.cos(a)*r,y:center.y+R(8,14),z:center.z+Math.sin(a)*r,vx:R(-.5,.5),vy:R(-1,0),vz:R(-.5,.5),life:R(3,5),grav:1.5,drag:.8,size:R(.25,.42),type:4,spin:R(-7,7),rot:R(0,6),sway:1.4,r:c.r,g:c.g,b:c.b}); } },
    setAmbient(on){ ambOn=!!on; }, setRain(on){ rainOn=!!on; }, get raining(){ return rainOn; }, ambient:{ get enabled(){return ambOn;}, set enabled(v){ambOn=!!v;} },
    update(dt,t){
      const h=ctx.renderer.domElement.height||720; const sc=h/(2*Math.tan(ctx.camera.fov*Math.PI/360)); add.mat.uniforms.scale.value=nrm.mat.uniforms.scale.value=sc;
      if(ambOn) ambient(dt,t); add.step(dt,t); nrm.step(dt,t); stepAdzan(dt); stepRings(dt);
    },
  };
  return api;
}

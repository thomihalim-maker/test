// Procedural WebAudio: ambience, calm pentatonic music, SFX, positional pan. No samples, no adhan/Quran.
export async function init(ctx){
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac=null, master, sfxBus, musBus, ambBus, verb, verbSend, comp, noiseBuf, pinkBuf;
  let muted=!!ctx.state?.settings?.mute, musicVol=ctx.state?.settings?.music ?? 0.6, sfxVol=ctx.state?.settings?.sfx ?? 1;
  let started=false, musicOn=true;
  // ducking: named reasons -> music multiplier (min wins); birds dim while any reason is active
  const ducks={}; let musMul=1, birdMul=1, duckTc=0.4;
  // weather
  let rainOn=false, windK=0, rainG=null, dripT=1;
  const rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[(Math.random()*a.length)|0];
  const mtof=m=>440*Math.pow(2,(m-69)/12);

  function build(){
    if(ac||!AC) return;
    ac=new AC({latencyHint:'interactive'});
    comp=ac.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=3; comp.attack.value=0.01; comp.release.value=0.25;
    master=ac.createGain(); master.gain.value=muted?0:0.9; master.connect(comp); comp.connect(ac.destination);
    sfxBus=ac.createGain(); sfxBus.gain.value=sfxVol; sfxBus.connect(master);
    musBus=ac.createGain(); musBus.gain.value=0.34*musicVol*musMul; musBus.connect(master);
    ambBus=ac.createGain(); ambBus.gain.value=0.5; ambBus.connect(master);
    // reverb: generated decaying noise impulse
    const len=ac.sampleRate*2.2, ir=ac.createBuffer(2,len,ac.sampleRate);
    for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); }
    verb=ac.createConvolver(); verb.buffer=ir; const vg=ac.createGain(); vg.gain.value=0.5; verb.connect(vg); vg.connect(master);
    verbSend=ac.createGain(); verbSend.gain.value=1; verbSend.connect(verb);
    // noise buffers
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate); const n=noiseBuf.getChannelData(0); for(let i=0;i<n.length;i++) n[i]=Math.random()*2-1;
    pinkBuf=ac.createBuffer(1,ac.sampleRate*4,ac.sampleRate); const p=pinkBuf.getChannelData(0); let b0=0,b1=0,b2=0; for(let i=0;i<p.length;i++){ const w=Math.random()*2-1; b0=0.99765*b0+w*0.099; b1=0.963*b1+w*0.2965; b2=0.57*b2+w*1.0526; p[i]=(b0+b1+b2+w*0.1848)*0.25; }
    startAmbient();
  }
  function unlock(){
    if(!AC) return; build(); if(ac.state!=='running') ac.resume().catch(()=>{});
    if(!started){ started=true; nextNoteT=ac.currentTime+0.5; }
  }
  for(const ev of ['pointerdown','touchend','keydown','click']) addEventListener(ev,unlock,{passive:true});

  // ---------- helpers ----------
  function out(pan=0,vol=1,reverb=0.15){
    const g=ac.createGain(); g.gain.value=vol; let node=g;
    if(ac.createStereoPanner){ const p=ac.createStereoPanner(); p.pan.value=Math.max(-1,Math.min(1,pan)); g.connect(p); node=p; }
    node.connect(sfxBus); if(reverb>0){ const s=ac.createGain(); s.gain.value=reverb; node.connect(s); s.connect(verbSend); }
    return g;
  }
  function env(g,t,a,peak,d,tail=0){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d+tail); }
  function osc(type,f,t,dur,dest,peak=0.3,a=0.005){ const o=ac.createOscillator(), g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); env(g,t,a,peak,dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t+a+dur+0.05); return {o,g}; }
  function noise(t,dur,dest,{type='bandpass',f=1000,q=1,peak=0.3,a=0.003,f2=null}={}){
    const s=ac.createBufferSource(); s.buffer=noiseBuf; s.loop=true; const flt=ac.createBiquadFilter(); flt.type=type; flt.frequency.setValueAtTime(f,t); if(f2) flt.frequency.exponentialRampToValueAtTime(f2,t+dur); flt.Q.value=q;
    const g=ac.createGain(); env(g,t,a,peak,dur); s.connect(flt); flt.connect(g); g.connect(dest); s.start(t,Math.random()); s.stop(t+dur+0.1); return flt;
  }
  function bell(f,t,dest,peak=0.2,dur=1.2){ // gamelan/kalimba-ish: inharmonic partials
    osc('sine',f,t,dur,dest,peak,0.002); osc('sine',f*2.76,t,dur*0.35,dest,peak*0.35,0.001); osc('sine',f*5.4,t,dur*0.12,dest,peak*0.15,0.001);
  }
  function formant(t,f0,dur,forms,dest,{peak=0.3,vib=5,vibAmt=0.02,am=0,glide=null,type='sawtooth'}={}){
    const o=ac.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); if(glide) o.frequency.exponentialRampToValueAtTime(glide,t+dur);
    const lfo=ac.createOscillator(), lg=ac.createGain(); lfo.frequency.value=vib; lg.gain.value=f0*vibAmt; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t+dur+0.1);
    const mix=ac.createGain(); env(mix,t,0.04,peak,dur*0.9);
    if(am){ const a=ac.createOscillator(), ag=ac.createGain(), base=ac.createGain(); base.gain.value=0.6; a.frequency.value=am; ag.gain.value=0.4; a.connect(ag); ag.connect(base.gain); a.start(t); a.stop(t+dur+0.1); mix.connect(base); base.connect(dest); } else mix.connect(dest);
    for(const [ff,q,gain] of forms){ const b=ac.createBiquadFilter(); b.type='bandpass'; b.frequency.value=ff; b.Q.value=q; const g=ac.createGain(); g.gain.value=gain; o.connect(b); b.connect(g); g.connect(mix); }
    o.start(t); o.stop(t+dur+0.1);
  }

  // ---------- SFX ----------
  const SFX={
    ui_tap(t,d){ osc('sine',720,t,0.07,d,0.18); osc('sine',1080,t+0.01,0.05,d,0.08); },
    pop(t,d){ const o=ac.createOscillator(), g=ac.createGain(); o.frequency.setValueAtTime(260,t); o.frequency.exponentialRampToValueAtTime(820,t+0.09); env(g,t,0.003,0.3,0.1); o.connect(g); g.connect(d); o.start(t); o.stop(t+0.2); },
    step(t,d){ noise(t,0.07,d,{type:'lowpass',f:rnd(500,800),peak:0.18}); osc('sine',rnd(70,95),t,0.08,d,0.2); },
    coin(t,d){ bell(1318.5,t,d,0.16,0.35); bell(1975.5,t+0.075,d,0.17,0.7); },
    chime(t,d){ [72,76,79,84].forEach((m,i)=>bell(mtof(m),t+i*0.11,d,0.14,1.6)); },
    build(t,d){ for(let i=0;i<3;i++){ const tt=t+i*0.11; noise(tt,0.06,d,{type:'bandpass',f:900,q:2,peak:0.35}); osc('triangle',rnd(180,230),tt,0.1,d,0.3); } [60,64,67,72].forEach((m,i)=>bell(mtof(m),t+0.4+i*0.09,d,0.14,1.2)); },
    bedug(t,d){ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(52,t+0.35); env(g,t,0.004,0.9,1.6); o.connect(g); g.connect(d); o.start(t); o.stop(t+2);
      osc('sine',98,t,1.2,d,0.35,0.01); noise(t,0.05,d,{type:'lowpass',f:700,peak:0.5}); noise(t,0.5,d,{type:'bandpass',f:160,q:3,peak:0.2}); },
    splash(t,d){ noise(t,0.5,d,{type:'bandpass',f:1200,f2:3200,q:0.8,peak:0.28,a:0.02}); for(let i=0;i<5;i++) noise(t+0.05+i*0.07,0.08,d,{type:'highpass',f:rnd(2500,5000),peak:0.1}); },
    munch(t,d){ for(let i=0;i<3;i++){ noise(t+i*0.13,0.07,d,{type:'bandpass',f:rnd(1400,2200),q:1.2,peak:0.28}); noise(t+i*0.13,0.05,d,{type:'lowpass',f:400,peak:0.2}); } },
    bleat_goat(t,d){ const f=rnd(380,460); formant(t,f,0.75,[[1000,7,1],[1900,9,0.7],[2900,10,0.3]],d,{peak:0.5,vib:rnd(26,34),vibAmt:0.05,am:0,glide:f*0.82}); },
    bleat_sheep(t,d){ const f=rnd(260,320); formant(t,f,0.9,[[780,6,1],[1400,8,0.7],[2400,10,0.25]],d,{peak:0.45,vib:rnd(18,24),vibAmt:0.045,glide:f*0.85}); },
    // ---- masjid care / prayer (no voice, no formant: brushes, wood, bells only) ----
    sweep(t,d){ // soft dry bristle swish: two overlapping brushed-noise strokes
      noise(t,0.22,d,{type:'bandpass',f:rnd(2600,3200),f2:rnd(1300,1700),q:0.9,peak:0.2,a:0.04});
      noise(t+0.05,0.16,d,{type:'highpass',f:rnd(4200,5200),peak:0.07,a:0.03});
      for(let i=0;i<3;i++) noise(t+0.04+i*0.05,0.025,d,{type:'bandpass',f:rnd(3500,6000),q:3,peak:0.05}); },
    mop(t,d){ // wet slosh: lowpassed noise push + a few watery blips
      noise(t,0.32,d,{type:'lowpass',f:700,f2:1500,q:1.4,peak:0.22,a:0.05});
      noise(t+0.08,0.22,d,{type:'bandpass',f:1100,f2:600,q:2.2,peak:0.12,a:0.03});
      for(let i=0;i<3;i++){ const tt=t+0.12+i*rnd(0.05,0.09); const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; const f=rnd(500,900); o.frequency.setValueAtTime(f,tt); o.frequency.exponentialRampToValueAtTime(f*1.8,tt+0.05); env(g,tt,0.003,0.05,0.05); o.connect(g); g.connect(d); o.start(tt); o.stop(tt+0.1); } },
    squeak(t,d){ // clean-floor squeak + tiny 'ting'
      const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(1500,t); o.frequency.exponentialRampToValueAtTime(2500,t+0.09); env(g,t,0.01,0.08,0.09); o.connect(g); g.connect(d); o.start(t); o.stop(t+0.15);
      bell(mtof(96),t+0.08,d,0.08,0.5); },
    leaves(t,d){ // rustle: a scatter of tiny crackles under a soft hiss
      noise(t,0.38,d,{type:'bandpass',f:3200,q:0.7,peak:0.07,a:0.06});
      for(let i=0;i<7;i++) noise(t+rnd(0,0.35),0.03,d,{type:'bandpass',f:rnd(2500,6000),q:2.5,peak:rnd(0.05,0.11)}); },
    bag(t,d){ // soft thump of leaves landing in the pengki
      noise(t,0.12,d,{type:'lowpass',f:380,peak:0.3}); osc('sine',rnd(82,96),t,0.16,d,0.26,0.004);
      noise(t+0.02,0.14,d,{type:'bandpass',f:1800,q:0.8,peak:0.06}); },
    pile(t,d){ // light crunch
      for(let i=0;i<4;i++) noise(t+i*rnd(0.03,0.05),0.035,d,{type:'bandpass',f:rnd(1400,2600),q:1.6,peak:rnd(0.1,0.16)}); },
    kentongan(t,d){ // hollow wooden slit drum: tok..tok-tok, bandpassed 600-1000 Hz, short decay
      const n=Math.random()<0.5?2:3, gaps=[0,0.34,0.5];
      for(let i=0;i<n;i++){ const tt=t+gaps[i]+rnd(0,0.02), f=rnd(760,840)*(i===n-1?0.94:1);
        const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(f*1.12,tt); o.frequency.exponentialRampToValueAtTime(f,tt+0.03); env(g,tt,0.002,0.28,0.16); o.connect(g); g.connect(d); o.start(tt); o.stop(tt+0.25);
        osc('triangle',f*0.62,tt,0.1,d,0.1,0.002);
        noise(tt,0.06,d,{type:'bandpass',f:rnd(820,960),q:5,peak:0.22,a:0.001}); noise(tt,0.012,d,{type:'highpass',f:2500,peak:0.06,a:0.001}); } },
    adzan_chime(t,d){ // gentle gamelan/kalimba bell swell chord ~3.5s (bells and pads only; never a voice)
      const ch=[62,66,69,74,78];
      ch.forEach((m,i)=>bell(mtof(m),t+i*0.16,d,0.075,3.0-i*0.2));
      bell(mtof(50),t,d,0.1,3.6);
      for(const [m,det] of [[62,-5],[69,5],[74,0]]){ const o=ac.createOscillator(), g=ac.createGain(), fl=ac.createBiquadFilter(); o.type='triangle'; o.frequency.value=mtof(m); o.detune.value=det; fl.type='lowpass'; fl.frequency.value=900;
        g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.04,t+1.4); g.gain.linearRampToValueAtTime(0.0001,t+3.6); o.connect(fl); fl.connect(g); g.connect(d); o.start(t); o.stop(t+3.7); }
      bell(mtof(81),t+1.5,d,0.05,2.0); },
    prayer_start(t,d){ bell(mtof(50),t,d,0.16,3.2); osc('sine',mtof(38),t,2.4,d,0.08,0.02); },
    salam(t,d){ bell(mtof(76),t,d,0.12,1.4); bell(mtof(81),t+0.2,d,0.13,1.9); osc('sine',mtof(64),t,1.6,d,0.04,0.05); },
    moo(t,d){ const f=rnd(98,115); formant(t,f*1.15,1.5,[[420,5,1],[820,6,0.7],[2200,10,0.15]],d,{peak:0.7,vib:4.5,vibAmt:0.012,glide:f*0.9}); },
  };
  const ALIAS={bleat:'bleat_goat',goat:'bleat_goat',sheep:'bleat_sheep',cow:'moo',click:'ui_tap',tap:'ui_tap',success:'chime'};
  const v3={x:0,y:0,z:0};
  function play(name,opts={}){
    if(!ac||muted||ac.state!=='running') return; const fn=SFX[name]||SFX[ALIAS[name]]; if(!fn) return;
    let pan=0,vol=opts.vol??1,rev=0.14;
    const pos=opts.pos; if(pos){
      const cam=ctx.camera; const dx=pos.x-cam.position.x, dy=pos.y-cam.position.y, dz=pos.z-cam.position.z; const dist=Math.hypot(dx,dy,dz);
      cam.matrixWorld.elements; const e=cam.matrixWorld.elements; // right vector = column 0
      const dot=(dx*e[0]+dy*e[1]+dz*e[2])/(dist||1); pan=dot*0.85; vol*=1/(1+dist/14); rev+=Math.min(0.3,dist/120);
    }
    if(vol<0.01) return;
    try{ const t=ac.currentTime+0.005; const d=out(pan,vol,rev); fn(t,d); }catch(e){}
  }

  // ---------- Ambience ----------
  let wind, windG, waterG, waterF, birdG, cricketG, nightness=0;
  function loopNoise(buf,dest,ftype,f,q,gain){ const s=ac.createBufferSource(); s.buffer=buf; s.loop=true; const flt=ac.createBiquadFilter(); flt.type=ftype; flt.frequency.value=f; flt.Q.value=q; const g=ac.createGain(); g.gain.value=gain; s.connect(flt); flt.connect(g); g.connect(dest); s.start(); return {s,flt,g}; }
  function startAmbient(){
    const w=loopNoise(pinkBuf,ambBus,'bandpass',420,0.6,0.0); wind=w.flt; windG=w.g;
    const l=ac.createOscillator(), lg=ac.createGain(); l.frequency.value=0.11; lg.gain.value=220; l.connect(lg); lg.connect(wind.frequency); l.start();
    const l2=ac.createOscillator(), l2g=ac.createGain(); l2.frequency.value=0.07; l2g.gain.value=0.08; l2.connect(l2g); l2g.connect(windG.gain); l2.start();
    const wt=loopNoise(noiseBuf,ambBus,'bandpass',1700,0.9,0.0); waterG=wt.g; waterF=wt.flt;
    const wl=ac.createOscillator(), wlg=ac.createGain(); wl.frequency.value=0.6; wlg.gain.value=500; wl.connect(wlg); wlg.connect(waterF.frequency); wl.start();
    birdG=ac.createGain(); birdG.gain.value=1; birdG.connect(ambBus); const br=ac.createGain(); br.gain.value=0.3; birdG.connect(br); br.connect(verbSend);
    cricketG=ac.createGain(); cricketG.gain.value=0; cricketG.connect(ambBus);
    // rain bed (silent until setWeather({rain:true}))
    const rn=loopNoise(pinkBuf,ambBus,'lowpass',2500,0.5,0.0); rainG=rn.g;
  }
  function drip(){ // occasional soft drip ticks from eaves
    const t=ac.currentTime+0.01, p=ac.createStereoPanner?ac.createStereoPanner():null; if(p){p.pan.value=rnd(-0.8,0.8); p.connect(ambBus);} const dest=p||ambBus;
    const o=ac.createOscillator(), g=ac.createGain(), f=rnd(1300,2400); o.type='sine'; o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*1.6,t+0.04); env(g,t,0.002,rnd(0.02,0.045),0.06); o.connect(g); g.connect(dest); o.start(t); o.stop(t+0.12);
  }
  function chirp(){
    const t=ac.currentTime+0.01, pan=rnd(-0.8,0.8), base=rnd(2200,4200), n=(Math.random()*4|0)+2, step=rnd(0.07,0.12);
    const p=ac.createStereoPanner?ac.createStereoPanner():null; if(p){p.pan.value=pan; p.connect(birdG);} const dest=p||birdG;
    const kind=Math.random()<0.5;
    for(let i=0;i<n;i++){ const tt=t+i*step, o=ac.createOscillator(), g=ac.createGain(); o.type='sine';
      const f=base*(kind?1+i*0.06:1-i*0.04); o.frequency.setValueAtTime(f,tt); o.frequency.exponentialRampToValueAtTime(f*(kind?1.35:0.7),tt+step*0.8);
      env(g,tt,0.01,0.05*(0.6+0.4*Math.random()),step*0.7); o.connect(g); g.connect(dest); o.start(tt); o.stop(tt+step+0.05); }
  }
  function cricketPulse(){
    const t=ac.currentTime+0.01, f=rnd(4200,4800), dur=rnd(0.5,1.1);
    const o=ac.createOscillator(), g=ac.createGain(), a=ac.createOscillator(), ag=ac.createGain(); o.frequency.value=f; a.frequency.value=rnd(26,32); ag.gain.value=0.5;
    const base=ac.createGain(); base.gain.value=0.5; a.connect(ag); ag.connect(base.gain); o.connect(base); base.connect(g);
    const p=ac.createStereoPanner?ac.createStereoPanner():null; if(p){p.pan.value=rnd(-0.9,0.9); g.connect(p); p.connect(cricketG);} else g.connect(cricketG);
    env(g,t,0.05,0.03,dur); o.start(t); a.start(t); o.stop(t+dur+0.1); a.stop(t+dur+0.1);
  }
  let birdT=2, cricT=1, ambK=0;
  function ambient(dt){
    const h=ctx.hour??12; const day=Math.max(0,Math.min(1,Math.sin((h-6)/12*Math.PI)*1.6)); nightness=1-day;
    const tc=ac.currentTime;
    windG.gain.setTargetAtTime((0.05+0.03*nightness)*(1+windK*2.6),tc,1);
    birdG.gain.setTargetAtTime(day*birdMul*(rainOn?0.3:1),tc,birdMul<1?0.5:1.5);
    if(rainG) rainG.gain.setTargetAtTime(rainOn?0.06:0,tc,1.2);
    if(rainOn){ dripT-=dt; if(dripT<=0){ dripT=rnd(0.3,1.4); drip(); } }
    cricketG.gain.setTargetAtTime(nightness,tc,1.5);
    // water louder near pond (-24,14) and a gentle base level
    const tg=ctx.cameraRig?.target; let wv=0.025; if(tg){ const d=Math.hypot(tg.x+24,tg.z-14); wv=0.02+0.12*Math.max(0,1-d/28); }
    waterG.gain.setTargetAtTime(wv,tc,0.6);
    birdT-=dt; if(birdT<=0){ birdT=rnd(1.5,6); if(day>0.25) chirp(); }
    cricT-=dt; if(cricT<=0){ cricT=rnd(0.25,0.9); if(nightness>0.3) cricketPulse(); }
  }

  // ---------- Music: calm pentatonic kalimba/gamelan ----------
  const SCALE=[0,2,4,7,9]; // major pentatonic
  const ROOTS=[60,57,62,55,60,64,57,62]; // gentle progression
  let nextNoteT=0, step=0, barIdx=0, deg=2, tempo=62; // bpm
  const delay={}; let delayBuilt=false;
  function buildDelay(){ if(delayBuilt) return; delayBuilt=true; const d=ac.createDelay(2); d.delayTime.value=60/tempo*0.75; const fb=ac.createGain(); fb.gain.value=0.38; const lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400; d.connect(lp); lp.connect(fb); fb.connect(d); const send=ac.createGain(); send.gain.value=0.5; send.connect(d); lp.connect(musBus); delay.send=send; }
  function mNote(m,t,peak,dur=2.2){ const f=mtof(m); const g=ac.createGain(); g.gain.value=1; g.connect(musBus); g.connect(delay.send); const rv=ac.createGain(); rv.gain.value=0.3; g.connect(rv); rv.connect(verbSend); bell(f,t,g,peak,dur); }
  function pad(m,t,dur){ const f=mtof(m); for(const dt of [-4,4]){ const o=ac.createOscillator(), g=ac.createGain(), fl=ac.createBiquadFilter(); o.type='triangle'; o.frequency.value=f; o.detune.value=dt; fl.type='lowpass'; fl.frequency.value=700;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.035,t+dur*0.4); g.gain.linearRampToValueAtTime(0.0001,t+dur); o.connect(fl); fl.connect(g); g.connect(musBus); o.start(t); o.stop(t+dur+0.1); } }
  function music(){
    if(!started||!musicOn||muted) { if(ac && nextNoteT<ac.currentTime) nextNoteT=ac.currentTime+0.2; return; }
    if(musMul<0.02){ nextNoteT=Math.max(nextNoteT,ac.currentTime+0.2); return; } // respectful quiet during salat
    buildDelay(); const beat=60/tempo/2; // eighth notes
    while(nextNoteT<ac.currentTime+0.4){
      const t=nextNoteT, root=ROOTS[barIdx%ROOTS.length], stepInBar=step%8;
      if(stepInBar===0){ mNote(root-12,t,0.2,3.2); pad(root,t,beat*8+0.5); }
      if(stepInBar===4 && Math.random()<0.6) mNote(root-12+7,t,0.1,2.4);
      const dayish=1-nightness; const prob=stepInBar%2===0?0.55:0.28*(0.6+dayish*0.4);
      if(Math.random()<prob){
        deg+=pick([-2,-1,-1,0,1,1,2]); deg=Math.max(-2,Math.min(9,deg));
        const oct=Math.floor(deg/5), idx=((deg%5)+5)%5; const midi=root+12+SCALE[idx]+12*oct;
        mNote(midi,t+rnd(0,0.015),rnd(0.07,0.12),rnd(1.4,2.4));
        if(Math.random()<0.12) mNote(midi+ (Math.random()<0.5?7:12),t+beat*0.5,0.05,1.5);
      }
      step++; if(step%8===0) barIdx++; nextNoteT+=beat*(stepInBar%2?1.0:1.0);
    }
  }

  // ---------- API ----------
  function apply(){ if(!ac) return; master.gain.setTargetAtTime(muted?0:0.9,ac.currentTime,0.05); musBus.gain.setTargetAtTime(0.34*musicVol*musMul,ac.currentTime,duckTc); sfxBus.gain.setTargetAtTime(sfxVol,ac.currentTime,0.05); }
  function reduck(tc){
    let m=1; for(const k in ducks) m=Math.min(m,ducks[k].level);
    musMul=m; birdMul=Object.keys(ducks).length?0.6:1; duckTc=tc;
    if(ac) musBus.gain.setTargetAtTime(0.34*musicVol*musMul,ac.currentTime,duckTc);
  }
  // duck(on, level=.2, {key, fade, ttl}): fade = seconds to (mostly) reach the target; ttl = safety auto-release
  function duck(on,level=0.2,{key='manual',fade=on?0.8:2,ttl=0}={}){
    if(on) ducks[key]={level:Math.max(0,Math.min(1,+level||0)),ttl:ttl||0}; else delete ducks[key];
    reduck(Math.max(0.03,fade/3));
  }
  function unduckAll(fade=2){ for(const k in ducks) if(k!=='manual') delete ducks[k]; reduck(Math.max(0.03,fade/3)); }
  function setWeather({rain,wind}={}){ if(rain!==undefined) rainOn=!!rain; if(wind!==undefined) windK=Math.max(0,Math.min(1,+wind||0)); }
  // ---- event wiring ----
  const now=()=>performance.now()/1000; let lastSweep=-9, lastSqueak=-9, lastBell=-9, lastPop=-9;
  const P=d=>{ const p=d?.pos; return p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?p:undefined; };
  ctx.on('care:stroke',d=>{ const t=now(); if(t-lastSweep<0.25) return; lastSweep=t; play(d?.tool==='pel'?'mop':'sweep',{pos:P(d),vol:0.6}); });
  ctx.on('care:clean',d=>{ if(!d?.removed||d.tool!=='pel') return; const t=now(); if(t-lastSqueak<0.15) return; lastSqueak=t; play('squeak',{pos:P(d),vol:0.7}); });
  ctx.on('care:pile',d=>play('leaves',{pos:P(d),vol:0.7}));
  ctx.on('care:gather',d=>{ play('bag',{pos:P(d),vol:0.9}); play('pile',{pos:P(d),vol:0.7}); });
  ctx.on('visitor:salam',d=>{ const t=now(); if(t-lastPop<0.2) return; lastPop=t; play('pop',{pos:P(d),vol:0.3}); });
  ctx.on('adzan:start',d=>{ duck(true,0.15,{key:'adzan',fade:1.2,ttl:30}); play('adzan_chime',{pos:P(d),vol:1.3}); });
  ctx.on('adzan:end',()=>duck(false,0,{key:'adzan',fade:2}));
  const bellOnce=()=>{ const t=now(); if(t-lastBell<4) return; lastBell=t; play('prayer_start',{vol:0.8}); };
  ctx.on('prayer:lead',()=>{ duck(true,0.1,{key:'lead',fade:1.5,ttl:240}); bellOnce(); });
  ctx.on('prayer:start',()=>{ duck(true,0,{key:'prayer',fade:1.5,ttl:240}); bellOnce(); });
  ctx.on('prayer:done',()=>{ delete ducks.prayer; delete ducks.lead; delete ducks.adzan; reduck(1); play('salam',{vol:0.8}); });
  ctx.on('prayer:close',()=>unduckAll(2));
  const weatherFor=id=>setWeather({rain:id==='hujan',wind:id==='angin'?0.8:0});
  ctx.on('event:day',d=>weatherFor(d?.id));
  try{ weatherFor(ctx.state?.event?.id); }catch(e){}
  const api={
    play, unlock, duck, unduckAll, setWeather,
    get weather(){ return {rain:rainOn,wind:windK}; },
    get ducking(){ return musMul; },
    debug:{ get musGain(){ return musBus?musBus.gain.value:0.34*musicVol*musMul; }, get target(){ return 0.34*musicVol*musMul; }, get master(){ return master?master.gain.value:(muted?0:0.9); }, get ducks(){ return JSON.parse(JSON.stringify(ducks)); } },
    get muted(){return muted}, setMuted(m){ muted=!!m; if(ctx.state.settings) ctx.state.settings.mute=muted; apply(); },
    setMusic(v){ musicVol=v; if(ctx.state.settings) ctx.state.settings.music=v; apply(); },
    setSfx(v){ sfxVol=v; if(ctx.state.settings) ctx.state.settings.sfx=v; apply(); },
    get musicVol(){return musicVol}, get sfxVol(){return sfxVol},
    get ready(){ return !!ac && ac.state==='running'; },
    names:Object.keys(SFX),
    update(dt){
      // safety: a duck reason never outlives its ttl (e.g. if prayer:done was never emitted)
      let ch=false; for(const k in ducks){ const r=ducks[k]; if(r.ttl>0){ r.ttl-=dt; if(r.ttl<=0){ delete ducks[k]; ch=true; } } } if(ch) reduck(1);
      if(!ac||ac.state!=='running') return; try{ ambient(dt); music(); }catch(e){ console.warn('audio',e); } },
  };
  return api;
}

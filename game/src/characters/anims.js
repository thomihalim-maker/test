// Procedural pose targets. Pose params are driven through springs (secondary motion / overshoot).
export const KEYS = ['py','pp','pr','lean','twist','roll','breath','hx','hy','hz','alx','alz','arx','arz','llx','lrx','llz','lrz','sgS','sgW','fx','fz','eye','smile','mouth','gx','sx','sy','tilt'];
export const IDX = {}; KEYS.forEach((k,i)=>IDX[k]=i);
export const DEF = { py:.34,pp:0,pr:0,lean:0,twist:0,roll:0,breath:0,hx:0,hy:0,hz:0,alx:0,alz:.1,arx:0,arz:.1,llx:0,lrx:0,llz:0,lrz:0,sgS:1,sgW:1,fx:0,fz:0,eye:1,smile:.45,mouth:0,gx:0,sx:1,sy:1,tilt:0 };
// spring (omega, zeta)
const SP = {}; for(const k of KEYS) SP[k]=[20,.75];
Object.assign(SP,{ alx:[26,.5],arx:[26,.5],alz:[24,.55],arz:[24,.55],llx:[30,.7],lrx:[30,.7], fx:[11,.32],fz:[11,.32], hx:[16,.55],hy:[14,.7],hz:[15,.5], sx:[28,.38],sy:[28,.38], py:[22,.8], lean:[18,.6], eye:[30,.9], smile:[18,.8], mouth:[26,.9], breath:[12,.9], tilt:[10,.5], twist:[20,.7] });
export const OMEGA = KEYS.map(k=>SP[k][0]), ZETA = KEYS.map(k=>SP[k][1]);

const sstep=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const PI=Math.PI;

export const ACTS = {
  // duration, impact time (s) for emit
  feed:{dur:1.5,hit:.55}, water:{dur:1.9,hit:.9}, wash:{dur:2.4,hit:.5}, pet:{dur:1.7,hit:.6},
  hammer:{dur:2.5,hit:.5}, wave:{dur:1.6,hit:.2}, jump:{dur:1.2,hit:.2}, bedug:{dur:2.4,hit:.15}, greet:{dur:1.5,hit:.2},
  cheer:{dur:1.4,hit:.2}
};
// pose names usable as P.anim directly (looping)
export function solve(P, tg){
  const t = P.t, a = P.anim, sd = P.seed;
  const w = clamp(P.speed/1.4,0,1), run = clamp((P.speed-3.6)/2.4,0,1);
  const ph = P.cycle, s = Math.sin(ph), c = Math.cos(ph);
  const idle = 1-w;
  // ---- base: idle breathing + locomotion
  tg.breath = .022*Math.sin(t*2.3+sd);
  tg.hy = Math.sin(t*.55+sd)*.22*idle; tg.hx = (.04*Math.sin(t*.9+sd)+.02)*idle;
  tg.roll = Math.sin(t*.7+sd)*.025*idle;
  tg.alz = tg.arz = .12+.03*Math.sin(t*2.3+sd);
  tg.alx = .06*Math.sin(t*1.1+sd); tg.arx = -.06*Math.sin(t*1.1+sd);
  const amp = (.62+.5*run)*w;
  tg.llx = s*amp; tg.lrx = -s*amp;
  tg.alx += -s*amp*1.05; tg.arx += s*amp*1.05;
  tg.alz += .1*run*w; tg.arz += .1*run*w;
  tg.py = .34 + (.028+.02*run)*(1-Math.abs(s))*w - .02*w;
  tg.sy = 1 + .04*Math.cos(2*ph)*w; tg.sx = 1 - (tg.sy-1)*.7;
  tg.lean = (.07*w + .2*run) + (P.stoop||0) + P.accZ*.012;
  tg.twist = s*.16*w; tg.pr = s*.05*w; tg.hz = -s*.05*w; tg.roll += -P.accX*.012 + c*.02*w;
  tg.fz = -(.1*w+.12*run) - P.accZ*.025; tg.fx = Math.sin(ph+.6)*.06*w - P.accX*.02;
  tg.sgW = 1+.04*Math.abs(s)*w; tg.hx -= (P.stoop||0)*.6;
  tg.llz = tg.lrz = .02;
  tg.smile = .5 + .1*Math.sin(t*.4+sd); tg.eye = 1;
  P.prop = null; P.propTilt = 0;

  // ---- carry overlays
  const car = P.carry;
  if(car==='bucket'){
    tg.arx = .05 + Math.sin(ph*2)*.06*w; tg.arz = .22; tg.alz = .55; tg.alx = -.05 + (-s*amp*.6);
    tg.roll += .06; tg.lean += .03; P.prop='bucket';
  } else if(car==='hay'){
    tg.alx = tg.arx = -1.3; tg.alz = tg.arz = -.12; tg.lean = (tg.lean||0)-.1+ .05*w; tg.hx -= .12; P.prop='hay';
    tg.alx += -Math.sin(ph*2)*.05*w; tg.arx += Math.sin(ph*2)*.05*w;
  } else if(car==='hammer'){
    tg.arx = -.9 + s*amp*.2; tg.arz = .35; P.prop='hammer';
  }

  // ---- actions & poses
  const dur = P.actDur||1, u = clamp(t/dur,0,1);
  switch(a){
    case 'feed': {
      const r = sstep(0,.28,u)*(1-sstep(.78,1,u));
      tg.alx = tg.arx = -1.15*r + (car==='hay'?-.15:0) + Math.sin(u*PI*4)*.35*r; tg.alz=tg.arz = -.1;
      tg.lean = .45*r; tg.py = .34-.05*r; tg.smile=.9; tg.mouth=.35*r; tg.hx = -.15*r;
      P.prop = 'hay'; tg.llx=tg.lrx=0; tg.sy = 1-.04*r; tg.sx = 1+.03*r; break; }
    case 'water': {
      const r = sstep(0,.25,u)*(1-sstep(.82,1,u));
      tg.arx = -1.05*r; tg.arz = .1; tg.alx = -.5*r; tg.alz = .5; tg.lean = .28*r; tg.py = .34-.03*r; tg.smile=.8;
      P.prop='bucket'; P.propTilt = 1.25*sstep(.3,.5,u)*(1-sstep(.78,.95,u)); tg.hx=-.1*r;
      tg.llx=tg.lrx=0; break; }
    case 'wash': {
      const r = sstep(0,.15,u)*(1-sstep(.9,1,u)); const f=t*15;
      tg.alx = -1.0*r + Math.sin(f)*.45*r; tg.arx = -1.0*r + Math.sin(f+PI)*.45*r; tg.alz=tg.arz=-.05;
      tg.lean = .5*r; tg.py = .34-.1*r; tg.twist = Math.sin(f*.5)*.16*r; tg.mouth=.4*r; tg.smile=.9; tg.sy = 1+.025*Math.sin(f*2)*r;
      tg.llx = tg.lrx = 0; tg.hx=-.2*r; P.prop='brush'; P.propPhase=f; break; }
    case 'pet': {
      const r = sstep(0,.2,u)*(1-sstep(.85,1,u));
      tg.py = .34-.13*r; tg.lean = .5*r; tg.arx = -1.35*r + Math.sin(t*6)*.22*r; tg.arz = .02;
      tg.alx = -.6*r; tg.alz = .35; tg.smile = 1; tg.eye = 1-.8*r; tg.hz = .14*r; tg.hx = -.1*r; tg.llx = .5*r; tg.lrx=-.2*r;
      tg.sx = 1+.03*Math.sin(t*6)*r; break; }
    case 'hammer': {
      const c2 = (t/.85)%1; let up=0, slam=0;
      if(c2<.55) up = sstep(0,.55,c2)*.9+ .1*Math.sin(c2*30)*0;
      else if(c2<.68) { up = 1-sstep(.55,.68,c2); slam = sstep(.55,.68,c2)*(1-sstep(.68,.7,c2)); } else { up=0; }
      const ang = -.35 - 2.35*(c2<.55 ? sstep(0,.55,c2) : c2<.68 ? 1-sstep(.55,.66,c2) : 0);
      tg.arx = ang; tg.alx = ang*.85; tg.arz = .05; tg.alz = .05;
      tg.lean = c2<.55 ? -.18*sstep(0,.55,c2) : .38*slam + .1*(1-sstep(.68,.95,c2));
      tg.py = .34 + (c2<.55?.035*sstep(0,.55,c2):-.07*slam); tg.sy = c2<.55 ? 1+.05*sstep(0,.55,c2) : 1-.1*slam; tg.sx = 1-(tg.sy-1)*.8;
      tg.mouth = .5*slam; tg.eye = 1-.6*slam; tg.smile=.7; tg.llx=-.25*slam; tg.lrx=.3*slam; tg.hx = .15*slam;
      P.prop='hammer'; P.hit = (c2>=.6 && !P._hitDone)?(P._hitDone=true,1):0; if(c2<.3) P._hitDone=false; break; }
    case 'wave': case 'greet': {
      const r = sstep(0,.15,u)*(1-sstep(.85,1,u));
      tg.arz = .3+2.3*r + Math.sin(t*11)*.35*r; tg.arx = -.1*r; tg.hz = .12*r; tg.hy=.1*r; tg.smile=1; tg.mouth=.4*r; tg.eye=1-.3*r;
      tg.py = .34+.015*Math.sin(t*11)*r; tg.roll = .05*Math.sin(t*5.5)*r; break; }
    case 'cheer': {
      const r = sstep(0,.15,u)*(1-sstep(.85,1,u));
      tg.alx = tg.arx = -2.6*r; tg.alz = tg.arz = .45*r+.1; tg.smile=1; tg.mouth=.8*r; tg.eye=1-.8*r;
      tg.py = .34+.04*Math.abs(Math.sin(t*9))*r; break; }
    case 'jump': {
      const ph2 = P.jumpPhase; // 0 crouch,1 air-up,2 air-down,3 land
      if(ph2===0){ tg.sy=.78; tg.sx=1.2; tg.py=.34-.1; tg.alx=tg.arx=.9; tg.lean=.2; tg.llx=tg.lrx=.7; tg.eye=.6; }
      else if(ph2===1){ tg.sy=1.17; tg.sx=.9; tg.alx=tg.arx=-2.7; tg.alz=tg.arz=.4; tg.llx=-.5; tg.lrx=-.2; tg.mouth=.9; tg.smile=1; tg.eye=.3; tg.hx=-.2; tg.py=.36; }
      else if(ph2===2){ tg.sy=1.05; tg.sx=.97; tg.alx=tg.arx=-2.2; tg.alz=tg.arz=.6; tg.llx=.15; tg.lrx=.4; tg.mouth=.9; tg.smile=1; tg.eye=.3; tg.py=.35; }
      else { tg.sy=.8; tg.sx=1.2; tg.py=.34-.1; tg.alx=tg.arx=-.2; tg.lean=.25; tg.llx=tg.lrx=.5; tg.smile=1; tg.mouth=.6; tg.eye=.4; }
      P.prop=null; break; }
    case 'bedug': {
      const f = t*7.5; const r = sstep(0,.2,u)*(1-sstep(.9,1,u));
      tg.alx = -(.9+.75*Math.max(0,Math.sin(f)))*r; tg.arx = -(.9+.75*Math.max(0,Math.sin(f+PI)))*r; tg.alz=tg.arz=-.05;
      tg.lean = .15*r + .08*Math.abs(Math.sin(f))*r; tg.py = .34-.02*Math.abs(Math.cos(f))*r; tg.smile=.9; tg.mouth=.3*r; tg.llx=tg.lrx=0; tg.twist=Math.sin(f)*.1*r; break; }
    // ---- prayer / sitting poses (looping, spring-blended)
    case 'qiyam': tg.alx=tg.arx=-1.15; tg.alz=tg.arz=-.32; tg.arx=-1.3; tg.hx=.28; tg.eye=.55; tg.smile=.3; tg.llx=tg.lrx=0; tg.lean=.03+(P.stoop||0)*.5; tg.hy=0; tg.fz=0; tg.breath=.02*Math.sin(t*1.6+sd); break;
    case 'takbir': tg.alx=tg.arx=-2.5; tg.alz=tg.arz=.35; tg.hx=.08; tg.eye=.55; tg.smile=.3; tg.llx=tg.lrx=0; break;
    case 'rukuk': tg.lean=1.38; tg.alx=tg.arx=1.25; tg.alz=tg.arz=.05; tg.hx=-.95; tg.eye=.6; tg.smile=.3; tg.llx=tg.lrx=-.12; tg.py=.34; tg.pp=-.05; break;
    case 'itidal': tg.alx=tg.arx=.05; tg.alz=tg.arz=.1; tg.hx=.05; tg.eye=.55; tg.smile=.35; tg.llx=tg.lrx=0; tg.lean=0; break;
    case 'sujud': tg.py=.2; tg.lean=1.38; tg.alx=tg.arx=1.95; tg.alz=tg.arz=.2; tg.hx=-.35; tg.eye=.4; tg.smile=.25; tg.llx=tg.lrx=-1.3; tg.llz=tg.lrz=.0; tg.sgS=.55; tg.sgW=1.15; tg.fz=-.1; break;
    case 'tahiyat': case 'sit': tg.py=.13; tg.llx=1.35; tg.lrx=1.25; tg.llz=.18; tg.lrz=.18; tg.alx=tg.arx=-.85; tg.alz=tg.arz=-.1; tg.sgS=.5; tg.sgW=1.28; tg.hx=.12; tg.eye=a==='sit'?1:.55; tg.lean=.02; tg.fz=.12;
      tg.smile=a==='sit'?.7:.3; if(a==='sit') tg.hy = Math.sin(t*.5+sd)*.3; break;
    case 'salam': { const d = Math.sin(t*1.3)>0?1:-1; tg.py=.13; tg.llx=1.35; tg.lrx=1.25; tg.llz=.18; tg.lrz=.18; tg.alx=tg.arx=-.85; tg.alz=tg.arz=-.1; tg.sgS=.5; tg.sgW=1.28; tg.hy=d*.95; tg.hz=-d*.1; tg.hx=.05; tg.eye=.55; tg.fz=.12; break; }
    case 'chat': {
      const talk = Math.max(0,Math.sin(t*3.1+sd*3)); const g = Math.sin(t*5+sd);
      tg.mouth = talk*(.5+.4*Math.abs(Math.sin(t*14+sd))); tg.smile=.8;
      tg.arx = -.7-.5*talk+g*.15*talk; tg.arz=.25; tg.alx=-.2; tg.hz = Math.sin(t*1.7+sd)*.1; tg.hx=.05+.1*talk; tg.hy = (P.chatYaw||0);
      tg.py=.34-.02*(1-talk)*0; tg.roll = Math.sin(t*1.3+sd)*.04; break; }
    case 'chatSit': {
      const talk = Math.max(0,Math.sin(t*3.1+sd*3));
      tg.py=.13; tg.llx=1.35; tg.lrx=1.25; tg.llz=.18; tg.lrz=.18; tg.sgS=.5; tg.sgW=1.28; tg.fz=.12;
      tg.mouth = talk*(.5+.4*Math.abs(Math.sin(t*14+sd))); tg.smile=.85;
      tg.alx=tg.arx=-.85; tg.arx = -.9-.5*talk; tg.alz=-.1; tg.arz=.2; tg.hz=Math.sin(t*1.7+sd)*.1; tg.hx=.1; tg.hy=(P.chatYaw||0)+Math.sin(t*.6+sd)*.15; tg.roll=Math.sin(t*1.2+sd)*.04; break; }
    case 'sleep': break;
    default: break;
  }
}

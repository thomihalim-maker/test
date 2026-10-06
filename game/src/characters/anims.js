// Procedural pose targets, driven through per-channel springs (secondary motion / overshoot).
// Conventions: legs llx/lrx  + = swing forward;  knees klx/krx + = bend (shin back);
//              arms alx/arx  - = swing forward/up; alz/arz + = away from body.  lean + = chest forward.
export const KEYS = ['py','pp','pr','lean','twist','roll','breath','hx','hy','hz','alx','alz','arx','arz','llx','lrx','llz','lrz','klx','krx','sgS','sgW','fx','fz','eye','smile','mouth','oh','gx','sx','sy'];
export const IDX = {}; KEYS.forEach((k,i)=>IDX[k]=i);
export const PY = .40;
export const DEF = { py:PY,pp:0,pr:0,lean:0,twist:0,roll:0,breath:0,hx:0,hy:0,hz:0,alx:0,alz:.16,arx:0,arz:.16,llx:0,lrx:0,llz:.03,lrz:.03,klx:.04,krx:.04,sgS:1,sgW:1,fx:0,fz:0,eye:1,smile:.5,mouth:0,oh:0,gx:0,sx:1,sy:1 };
const SP = {}; for(const k of KEYS) SP[k]=[20,.75];
Object.assign(SP,{ alx:[24,.5],arx:[24,.5],alz:[22,.55],arz:[22,.55],llx:[30,.72],lrx:[30,.72],klx:[30,.72],krx:[30,.72], fx:[10,.3],fz:[10,.3], hx:[16,.55],hy:[13,.7],hz:[15,.5],
  sx:[26,.36],sy:[26,.36], py:[22,.8], lean:[16,.62], eye:[30,.9], smile:[16,.8], mouth:[28,.9], oh:[30,1], breath:[12,.9], twist:[20,.7], sgS:[14,.8], sgW:[14,.6] });
export const OMEGA = KEYS.map(k=>SP[k][0]), ZETA = KEYS.map(k=>SP[k][1]);

const sstep=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const PI=Math.PI;

export const ACTS = {
  feed:{dur:1.5,hit:.55}, water:{dur:1.9,hit:.9}, wash:{dur:2.4,hit:.5}, pet:{dur:1.7,hit:.6}, treat:{dur:1.5,hit:.55},
  hammer:{dur:2.5,hit:.5}, wave:{dur:1.6,hit:.2}, jump:{dur:1.2,hit:.2}, bedug:{dur:2.4,hit:.15}, greet:{dur:1.5,hit:.2}, cheer:{dur:1.4,hit:.2},
  // masjid care + prayer acts
  sweep:{dur:1.3,hit:.45}, mop:{dur:1.6,hit:.6}, scoop:{dur:1.2,hit:.55}, adzan:{dur:7,hit:.5}, takbir:{dur:.8,hit:.3}, nod:{dur:1.6,hit:.3}
};

// ---- straight-arm IK: aim a hand at a point given in CHARACTER space (x right-negative, y up from the ground, z forward).
// The point is moved into the chest frame (undo pelvis height, bow and twist) and the arm is pointed at it (arm length .278:
// out-of-reach targets are reached as far as the arm goes along that direction). Used for the two-hand tool grips.
const ARM = .278;
function chestPoint(tg, x, y, z, out){
  const a = tg.lean + tg.pp, tw = tg.twist, ca = Math.cos(a), sa = Math.sin(a);
  const py = y - tg.py;
  const y1 = py*ca + z*sa, z1 = -py*sa + z*ca;
  const ct = Math.cos(tw), st = Math.sin(tw);
  out[0] = x*ct - z1*st; out[1] = y1; out[2] = x*st + z1*ct; return out;
}
const _cp = [0,0,0];
function armAt(tg, s, x, y, z){
  chestPoint(tg, x, y, z, _cp);
  const dx = _cp[0]-s*.214, dy = _cp[1]-.345, dz = _cp[2], n = Math.max(1e-4, Math.hypot(dx,dy,dz));
  const sa = clamp(-dz/n,-1,1), ca = Math.max(.08, Math.sqrt(1-sa*sa));
  const ax = Math.atan2(sa, ca), th = Math.atan2(dx/(n*ca), -dy/(n*ca));
  if(s>0){ tg.alx = ax; tg.alz = th; } else { tg.arx = ax; tg.arz = -th; }
}
// A long tool (broom/mop) held in both hands near its top, its tip resting on the floor at (tx,tz) (character space).
// The two hands sit on the tool line around the grip point (gx,gy,gz), left hand above the right. Chibi arms are short
// (about a fifth of the body height), so a close two-hand grip in front of the belly is what keeps the handle steep.
// P.aimX/aimZ tell props.js where the tip touches the floor; the prop then runs from that point up through the hands.
function gripTool(tg, P, tx, tz, gx, gy, gz, sep=.075){
  let dx = gx-tx, dy = gy, dz = gz-tz; const n = Math.hypot(dx,dy,dz)||1; dx/=n; dy/=n; dz/=n;
  armAt(tg,  1, gx+dx*sep, gy+dy*sep, gz+dz*sep);
  armAt(tg, -1, gx-dx*sep, gy-dy*sep, gz-dz*sep);
  P.aimX = tx; P.aimZ = tz;
}

function sitLegs(tg, cross){
  if(cross){ tg.py=.19; tg.llx=tg.lrx=1.42; tg.llz=tg.lrz=.42; tg.klx=tg.krx=2.35; }
  else { tg.py=.17; tg.llx=tg.lrx=1.45; tg.llz=tg.lrz=.06; tg.klx=tg.krx=2.8; }
  tg.sgS=.62; tg.sgW=1.22; tg.fz=.1;
}

export function solve(P, tg){
  const t = P.t, a = P.anim, sd = P.seed;
  const w = clamp(P.speed/1.4,0,1), run = clamp((P.speed-3.6)/2.4,0,1);
  const ph = P.cycle, s = Math.sin(ph), c = Math.cos(ph);
  const idle = 1-w;
  // ---- idle breathing / weight shift
  tg.breath = .024*Math.sin(t*2.3+sd);
  tg.hy = Math.sin(t*.55+sd)*.22*idle; tg.hx = (.04*Math.sin(t*.9+sd)+.02)*idle;
  tg.roll = Math.sin(t*.7+sd)*.025*idle; tg.pr = Math.sin(t*.7+sd)*.02*idle;
  tg.alz = tg.arz = .16+.03*Math.sin(t*2.3+sd);
  tg.alx = .05*Math.sin(t*1.1+sd); tg.arx = -.05*Math.sin(t*1.1+sd);
  // ---- locomotion
  const amp = (.6+.45*run)*w;
  tg.llx = s*amp; tg.lrx = -s*amp;
  tg.klx = .04 + Math.max(0,c)*(.75+.5*run)*w; tg.krx = .04 + Math.max(0,-c)*(.75+.5*run)*w;
  tg.alx += s*amp*1.1; tg.arx += -s*amp*1.1;            // opposite arm swing
  tg.alz += .08*run*w; tg.arz += .08*run*w;
  const bo = P.bounce||1;
  tg.py = PY + (.03+.025*run)*bo*(1-Math.abs(s))*w - .025*w;
  tg.sy = 1 + .045*bo*Math.cos(2*ph)*w; tg.sx = 1 - (tg.sy-1)*.7;
  tg.lean = (.08*w + .2*run) + (P.stoop||0) + P.accZ*.012;
  tg.twist = s*.17*w; tg.pr += s*.06*w; tg.hz = -s*.05*w; tg.roll += -P.accX*.012 + c*.025*w;
  tg.fz = -(.1*w+.14*run) - P.accZ*.025; tg.fx = Math.sin(ph+.6)*.1*w - P.accX*.02;
  tg.sgW = 1+.07*Math.abs(s)*w; tg.hx -= (P.stoop||0)*.6;
  tg.smile = .5 + .12*Math.sin(t*.4+sd) + .15*run;
  P.prop = null; P.propTilt = 0; P.propMode = null;

  // ---- carry overlays
  const car = P.carry;
  if(car==='bucket'){
    tg.arx = .05 + Math.sin(ph*2)*.06*w; tg.arz = .26; tg.alz = .55; tg.alx = s*amp*.6 - .1;
    tg.roll += .07; tg.lean += .02; P.prop='bucket';
  } else if(car==='hay'){
    tg.alx = tg.arx = -1.25 + Math.sin(ph*2)*.05*w; tg.alz = tg.arz = -.08; tg.lean = tg.lean*.6 - .06; tg.hx -= .1; P.prop='hay';
  } else if(car==='hammer'){
    tg.arx = -.95 + s*amp*.2; tg.arz = .3; P.prop='hammer';
  } else if(car==='broom' || car==='mop'){
    // tool held upright at the right side, one hand, swinging gently with the walk
    tg.arx = -.3 + s*amp*.12; tg.arz = .25; P.prop = car; P.propMode = 'carry';
  }

  const dur = P.actDur||1, u = clamp(t/dur,0,1);
  switch(a){
    case 'feed': case 'treat': {
      const r = sstep(0,.28,u)*(1-sstep(.78,1,u));
      tg.alx = tg.arx = -1.15*r - .1 + Math.sin(u*PI*4)*.3*r; tg.alz=tg.arz = -.1;
      tg.lean = .4*r; tg.py = PY-.06*r; tg.klx=tg.krx=.25*r; tg.smile=.95; tg.mouth=.3*r; tg.hx = -.1*r;
      P.prop = a==='treat'?null:'hay'; tg.llx=tg.lrx=.08*r; tg.sy = 1-.04*r; tg.sx = 1+.03*r; break; }
    case 'water': {
      const r = sstep(0,.25,u)*(1-sstep(.82,1,u));
      tg.arx = -1.05*r; tg.arz = .1; tg.alx = -.45*r; tg.alz = .5; tg.lean = .25*r; tg.py = PY-.03*r; tg.smile=.85;
      P.prop='bucket'; P.propTilt = 1.25*sstep(.3,.5,u)*(1-sstep(.78,.95,u)); tg.hx=-.1*r; tg.llx=tg.lrx=0; break; }
    case 'wash': {
      const r = sstep(0,.15,u)*(1-sstep(.9,1,u)); const f=t*15;
      tg.alx = -1.0*r + Math.sin(f)*.42*r; tg.arx = -1.0*r + Math.sin(f+PI)*.42*r; tg.alz=tg.arz=-.04;
      tg.lean = .45*r; tg.py = PY-.09*r; tg.klx=tg.krx=.35*r; tg.llx=tg.lrx=.12*r; tg.twist = Math.sin(f*.5)*.16*r; tg.mouth=.35*r; tg.smile=.95; tg.sy = 1+.025*Math.sin(f*2)*r;
      tg.hx=-.15*r; P.prop='brush'; P.propPhase=f; break; }
    case 'pet': {
      const r = sstep(0,.2,u)*(1-sstep(.85,1,u));
      tg.py = PY-.14*r; tg.klx=.6*r; tg.krx=.35*r; tg.llx=.45*r; tg.lrx=.05*r; tg.lean = .45*r;
      tg.arx = -1.3*r + Math.sin(t*6)*.22*r; tg.arz = .04; tg.alx = -.35*r; tg.alz = .35;
      tg.smile = 1; tg.eye = 1-.85*r; tg.hz = .14*r; tg.hx = -.05*r; tg.sx = 1+.03*Math.sin(t*6)*r; break; }
    case 'hammer': {
      const c2 = (t/.85)%1; let slam=0;
      if(c2>=.55 && c2<.68) slam = sstep(.55,.68,c2)*(1-sstep(.68,.7,c2));
      const ang = -.4 - 2.3*(c2<.55 ? sstep(0,.55,c2) : c2<.68 ? 1-sstep(.55,.66,c2) : 0);
      tg.arx = ang; tg.alx = ang*.8; tg.arz = .06; tg.alz = .06;
      tg.lean = c2<.55 ? -.16*sstep(0,.55,c2) : .34*slam + .1*(1-sstep(.68,.95,c2));
      tg.py = PY + (c2<.55?.03*sstep(0,.55,c2):-.07*slam); tg.klx=tg.krx=.4*slam; tg.sy = c2<.55 ? 1+.05*sstep(0,.55,c2) : 1-.1*slam; tg.sx = 1-(tg.sy-1)*.8;
      tg.mouth = .5*slam; tg.eye = 1-.75*slam; tg.smile=.75; tg.llx=-.2*slam; tg.lrx=.25*slam; tg.hx = .12*slam;
      P.prop='hammer'; P.hit = (c2>=.6 && !P._hitDone)?(P._hitDone=true,1):0; if(c2<.3) P._hitDone=false; break; }
    case 'wave': {
      const r = sstep(0,.15,u)*(1-sstep(.85,1,u));
      tg.arz = .3+2.3*r + Math.sin(t*11)*.35*r; tg.arx = -.15*r; tg.hz = .12*r; tg.hy=.1*r; tg.smile=1; tg.mouth=.4*r; tg.eye=1-.25*r;
      tg.py = PY+.015*Math.sin(t*11)*r; tg.roll = .05*Math.sin(t*5.5)*r; break; }
    case 'greet': { // salaman: both hands offered forward, a soft shake, a small bow, then the right hand to the chest
      const r = sstep(0,.15,u)*(1-sstep(.88,1,u)), shake = sstep(.15,.3,u)*(1-sstep(.62,.72,u)), chest = sstep(.62,.75,u)*r;
      const b = Math.sin(t*14)*.08*shake;
      tg.arx = (-1.05 + b)*r*(1-chest) - 1.0*chest; tg.arz = .02*(1-chest) - .5*chest + .16*(1-r);
      tg.alx = (-.95 + b)*r*(1-chest) + .03*chest; tg.alz = -.02*(1-chest) + .16*(1-r) + .14*chest;
      tg.lean = .2*r*(shake*.6+.4); tg.hx = .2*r; tg.smile = 1; tg.eye = 1-.55*r; tg.mouth = .2*shake; tg.py = PY - .015*r; break; }
    case 'cheer': {
      const r = sstep(0,.15,u)*(1-sstep(.85,1,u));
      tg.alx = tg.arx = -2.6*r; tg.alz = tg.arz = .45*r+.12; tg.smile=1; tg.mouth=.8*r; tg.eye=1-.85*r;
      tg.py = PY+.04*Math.abs(Math.sin(t*9))*r; tg.klx=tg.krx=.2*Math.abs(Math.cos(t*9))*r; break; }
    case 'jump': {
      const j = P.jumpPhase;
      if(j===0){ tg.sy=.8; tg.sx=1.18; tg.py=PY-.1; tg.klx=tg.krx=.9; tg.llx=tg.lrx=.45; tg.alx=tg.arx=.8; tg.lean=.2; tg.eye=.6; }
      else if(j===1){ tg.sy=1.16; tg.sx=.9; tg.alx=tg.arx=-2.7; tg.alz=tg.arz=.45; tg.llx=.5; tg.lrx=.1; tg.klx=1.1; tg.krx=.5; tg.mouth=.9; tg.smile=1; tg.eye=.2; tg.hx=-.2; tg.py=PY; }
      else if(j===2){ tg.sy=1.05; tg.sx=.97; tg.alx=tg.arx=-2.2; tg.alz=tg.arz=.6; tg.llx=.2; tg.lrx=.3; tg.klx=.4; tg.krx=.6; tg.mouth=.9; tg.smile=1; tg.eye=.2; }
      else { tg.sy=.8; tg.sx=1.2; tg.py=PY-.1; tg.klx=tg.krx=.9; tg.llx=tg.lrx=.45; tg.alx=tg.arx=-.2; tg.lean=.25; tg.smile=1; tg.mouth=.6; tg.eye=.25; }
      tg.fz = j===1?-.2:j===2?.15:0; P.prop=null; break; }
    case 'bedug': {
      const f = t*7.5; const r = sstep(0,.2,u)*(1-sstep(.9,1,u));
      tg.alx = -(.9+.75*Math.max(0,Math.sin(f)))*r; tg.arx = -(.9+.75*Math.max(0,Math.sin(f+PI)))*r; tg.alz=tg.arz=-.05;
      tg.lean = .12*r + .08*Math.abs(Math.sin(f))*r; tg.py = PY-.025*Math.abs(Math.cos(f))*r; tg.klx=tg.krx=.15*r; tg.smile=.95; tg.mouth=.3*r; tg.llx=tg.lrx=0; tg.twist=Math.sin(f)*.1*r; break; }
    // ---- masjid care (two-hand tools aimed at a point on the floor; arms solved so the handle runs through both hands)
    case 'sweep': {
      const r = sstep(0,.12,u)*(1-sstep(.9,1,u));
      // stroke: wind the broom out to the right, swish it across the front, ease back (one stroke per act)
      const a = u<.25 ? sstep(0,.25,u) : u<.55 ? 1-2*sstep(.25,.55,u) : -1+sstep(.55,1,u);
      const swish = u>.25&&u<.55 ? Math.sin((u-.25)/.3*PI) : 0;
      tg.lean = (.3 + .06*swish)*r; tg.pp = .04*r; tg.py = PY - .035*r; tg.twist = (-.15 - .3*a)*r;
      tg.klx = .18*r + .1*Math.max(0,a)*r; tg.krx = .18*r + .1*Math.max(0,-a)*r;  // weight shifts from foot to foot
      tg.llx = .1*r - .08*a*r; tg.lrx = -.06*r + .08*a*r; tg.llz = tg.lrz = .05;
      tg.roll = .05*a*r; tg.hx = -.1*r; tg.hy = -.25*a*r; tg.hz = .04*a*r;
      const ph = .62 + a*.62, R0 = .82;
      gripTool(tg, P, -R0*Math.sin(ph), R0*Math.cos(ph), -.01 - .05*a, .55, .36);
      if(r<1){ const k=1-r; tg.alx=tg.alx*r+DEF.alx*k; tg.arx=tg.arx*r+DEF.arx*k; tg.alz=tg.alz*r+DEF.alz*k; tg.arz=tg.arz*r+DEF.arz*k; }
      tg.smile = .9; tg.mouth = .25*swish*r; tg.eye = 1-.3*swish;
      tg.sy = 1+.02*swish; tg.sx = 1-.015*swish;
      P.prop = 'broom'; P.propMode = 'grip'; P.propPhase = a; break; }
    case 'mop': {
      const r = sstep(0,.12,u)*(1-sstep(.9,1,u));
      // two long push/pull passes over the floor
      const w = Math.sin(u*PI*2*2 - PI/2)*.5+.5;          // 0 pulled in .. 1 pushed out
      tg.lean = (.18 + .2*w)*r; tg.pp = .05*r; tg.py = PY - (.02+.03*w)*r;
      tg.llx = (.08 + .22*w)*r; tg.lrx = (-.1 - .1*w)*r; tg.klx = (.15+.2*w)*r; tg.krx = .12*r; tg.llz = tg.lrz = .05;
      tg.twist = -.12*r + Math.sin(u*PI*6)*.05*r; tg.hx = -.12*r; tg.hy = -.12*r;
      gripTool(tg, P, -.12 + Math.sin(u*PI*4)*.07, .64 + .42*w, -.02, .55, .34 + .06*w);
      if(r<1){ const k=1-r; tg.alx=tg.alx*r+DEF.alx*k; tg.arx=tg.arx*r+DEF.arx*k; tg.alz=tg.alz*r+DEF.alz*k; tg.arz=tg.arz*r+DEF.arz*k; }
      tg.smile = .95; tg.mouth = .2*w*r;
      P.prop = 'mop'; P.propMode = 'grip'; P.propPhase = w; break; }
    case 'scoop': {
      // crouch with the pengki flat on the floor, nudge the leaves in, then lift it up tilted back so nothing spills
      const r = sstep(0,.18,u)*(1-sstep(.88,1,u)), lift = sstep(.45,.7,u)*(1-sstep(.88,1,u));
      const down = r*(1-lift*.75), nudge = Math.sin(u*PI*6)*(1-lift)*r;
      tg.py = PY - .1*down; tg.klx = tg.krx = .5*down; tg.llx = tg.lrx = .28*down; tg.llz = tg.lrz = .07;
      tg.lean = .42*down + .12*lift; tg.pp = .1*down; tg.hx = -.2*down - .05*lift; tg.twist = -.08*r;
      armAt(tg, -1, -.13, .27 + .3*lift, .44 - .04*lift + .02*nudge);          // right hand: pengki handle
      armAt(tg,  1, .16 - .06*lift, .36 + .22*lift + .05*nudge, .4);           // left hand helps / steadies
      if(r<1){ const k=1-r; tg.alx=tg.alx*r+DEF.alx*k; tg.arx=tg.arx*r+DEF.arx*k; tg.alz=tg.alz*r+DEF.alz*k; tg.arz=tg.arz*r+DEF.arz*k; }
      tg.smile = 1; tg.mouth = .35*lift; tg.eye = 1 - .5*lift;
      P.prop = 'pengki'; P.propTilt = (-.08*down + .5*lift)*r; P.propPhase = lift; break; }
    case 'adzan': {
      // traditional adzan posture: upright, both hands raised open beside the ears, chin slightly up, eyes softly closed.
      // Purely visual: no sound or voice comes from the character. Arms swing up sideways (never through the head).
      const r = sstep(0,.08,u)*(1-sstep(.95,1,u)), rr = Math.min(1,r*1.15);
      tg.alx = tg.arx = -.4*rr; tg.alz = tg.arz = .16 + 2.29*rr;            // hands just in front of the ears, beside the face
      tg.lean = -.02*r; tg.hx = -.08*r; tg.hy = 0; tg.hz = 0; tg.pr = tg.roll = 0; tg.twist = 0;
      tg.llx = tg.lrx = 0; tg.klx = tg.krx = .04; tg.fx = 0; tg.fz = 0;
      tg.eye = 1 - .9*r; tg.smile = .45; tg.mouth = (.13 + .1*Math.sin(t*1.8))*r;
      tg.breath = .035*Math.sin(t*1.8); break; }
    case 'nod': { // salam from the rows: right hand on the chest, a gentle bow and smile
      const r = sstep(0,.2,u)*(1-sstep(.8,1,u));
      tg.arx = -1.0*r; tg.arz = -.55*r + .16*(1-r); tg.lean = .14*r*(.6+.4*Math.sin(u*PI)); tg.hx = .25*r; tg.smile = 1; tg.eye = 1-.6*r; break; }
    case 'duduk': sitLegs(tg,false); tg.alx=tg.arx=-.9; tg.alz=tg.arz=-.06; tg.hx=.02; tg.hy=0; tg.eye=1; tg.smile=.55; tg.lean=.02; tg.pr=tg.roll=0; tg.breath=.02*Math.sin(t*1.5+sd); break;
    case 'salamR': case 'salamL': { const d = a==='salamR'?-1:1; sitLegs(tg,false); tg.alx=tg.arx=-.85; tg.alz=tg.arz=-.08; tg.hy=d*.95; tg.hz=-d*.1; tg.hx=.05; tg.eye=.45; tg.smile=.5; tg.pr=tg.roll=0; break; }
    case 'khutbah': { // the khatib stands calmly and gestures gently while the jamaah sit and listen (no text, no voice)
      const g = Math.max(0,Math.sin(t*1.1+sd));
      tg.alx = -.35 - .45*g; tg.alz = .2 + .1*g; tg.arx = -.25; tg.arz = .12; tg.hx = .05 + .05*Math.sin(t*.7); tg.hy = Math.sin(t*.45+sd)*.35;
      tg.smile = .55; tg.mouth = .08*g; tg.eye = 1; tg.llx=tg.lrx=0; tg.lean = .02; break; }
    // ---- prayer / sitting poses (looping, spring-blended)
    case 'qiyam': tg.alx=-1.05; tg.arx=-1.22; tg.alz=tg.arz=-.36; tg.hx=.3; tg.eye=.2; tg.smile=.25; tg.llx=tg.lrx=0; tg.klx=tg.krx=.03; tg.lean=.03+(P.stoop||0)*.5; tg.hy=0; tg.hz=0; tg.fz=0; tg.fx=0; tg.pr=0; tg.roll=0; tg.breath=.02*Math.sin(t*1.6+sd); break;
    case 'takbir': tg.alx=tg.arx=-2.45; tg.alz=tg.arz=.38; tg.hx=.08; tg.eye=.2; tg.smile=.3; tg.llx=tg.lrx=0; tg.hy=0; tg.pr=tg.roll=0; break;
    case 'rukuk': tg.lean=.8; tg.pp=.32; tg.alx=tg.arx=-.42; tg.alz=tg.arz=.08; tg.hx=-.85; tg.eye=.2; tg.smile=.3; tg.llx=tg.lrx=.2; tg.klx=tg.krx=.2; tg.py=PY-.02; tg.hy=0; tg.pr=tg.roll=0; tg.fz=-.04; break;
    case 'itidal': tg.alx=tg.arx=.03; tg.alz=tg.arz=.12; tg.hx=.1; tg.eye=.2; tg.smile=.3; tg.llx=tg.lrx=0; tg.lean=0; tg.hy=0; tg.pr=tg.roll=0; break;
    case 'sujud': tg.py=.28; tg.pp=.5; tg.lean=.8; tg.alx=tg.arx=-2.4; tg.alz=tg.arz=.35; tg.hx=.1; tg.eye=.2; tg.smile=.25; tg.llx=tg.lrx=.62; tg.klx=tg.krx=1.62; tg.llz=tg.lrz=.05;
      tg.sgS=.8; tg.sgW=1.08; tg.fz=-.04; tg.fx=0; tg.hy=0; tg.pr=tg.roll=0; tg.twist=0; break;
    case 'tahiyat': sitLegs(tg,false); tg.alx=tg.arx=-.85; tg.alz=tg.arz=-.08; tg.hx=.15; tg.eye=.2; tg.lean=.04; tg.smile=.3; tg.hy=0; tg.pr=tg.roll=0; break;
    case 'sit': sitLegs(tg,true); tg.alx=tg.arx=-.8; tg.alz=tg.arz=-.08; tg.hx=.08; tg.smile=.7; tg.hy = Math.sin(t*.5+sd)*.3; break;
    case 'salam': { const d = Math.sin(t*1.3)>0?1:-1; sitLegs(tg,false); tg.alx=tg.arx=-.85; tg.alz=tg.arz=-.08; tg.hy=d*.95; tg.hz=-d*.1; tg.hx=.05; tg.eye=.45; tg.smile=.5; tg.pr=tg.roll=0; break; }
    case 'chat': {
      const talk = Math.max(0,Math.sin(t*3.1+sd*3)); const g = Math.sin(t*5+sd);
      tg.mouth = talk*(.5+.4*Math.abs(Math.sin(t*14+sd))); tg.oh = (talk<.05 && Math.sin(t*.9+sd)>.85)?1:0; tg.smile=.85;
      tg.eye = Math.sin(t*.7+sd*2)>.8 ? .1 : 1;
      tg.arx = -.65-.5*talk+g*.15*talk; tg.arz=.25; tg.alx=-.15; tg.hz = Math.sin(t*1.7+sd)*.1; tg.hx=.05+.1*talk; tg.hy = (P.chatYaw||0);
      tg.roll = Math.sin(t*1.3+sd)*.04; break; }
    case 'chatSit': {
      const talk = Math.max(0,Math.sin(t*3.1+sd*3));
      sitLegs(tg,true);
      tg.mouth = talk*(.5+.4*Math.abs(Math.sin(t*14+sd))); tg.smile=.85; tg.eye = Math.sin(t*.6+sd*2)>.85 ? .1 : 1;
      tg.alx=-.8; tg.arx = -.85-.5*talk; tg.alz=-.08; tg.arz=.2; tg.hz=Math.sin(t*1.7+sd)*.1; tg.hx=.1; tg.hy=(P.chatYaw||0)+Math.sin(t*.6+sd)*.15; tg.roll=Math.sin(t*1.2+sd)*.04; break; }
    default: break;
  }
}

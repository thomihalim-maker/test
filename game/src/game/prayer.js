// PRAYER TIMES: the five daily prayers mapped onto the in-game clock. The marbot may strike the kentongan/bedug,
// then calls the adzan at the menara/porch mic (posture + descriptive caption + chime — never a voice), jamaah come,
// and the marbot leads them as imam with one calm tap. Prayer is never scored, timed or failed: if nobody leads,
// Pak Haji (an NPC elder) leads kindly. While a prayer is near/open the clock runs at 25% so nothing feels rushed.
export const PRAYERS = [
  { id:'subuh',   name:['Subuh','Fajr'],      start:4.75,  end:6.5 },
  { id:'dzuhur',  name:['Dzuhur','Dhuhr'],    start:12.0,  end:14.5 },
  { id:'ashar',   name:['Ashar','Asr'],       start:15.25, end:17.5 },
  { id:'maghrib', name:['Maghrib','Maghrib'], start:18.0,  end:19.15 },
  { id:'isya',    name:['Isya','Isha'],       start:19.25, end:21.25 },
];
const JUMAT_NAME = ['Salat Jumat','Jumu\'ah'];
const SOON = .4, SLOW = .75, PL = .7;
const T = {
  adzanLabel: ['Kumandangkan Adzan','Call the Adzan'],
  imamLabel:  ['Pimpin Salat','Lead the Prayer'],
  adzanCap:   ['Marbot mengumandangkan adzan {p}. Mari salat berjamaah.','The marbot calls the adzan for {p}. Come pray together.'],
  npcCap:     ['Pak Haji memimpin salat. Kamu bisa memimpin di waktu berikutnya.','Pak Haji leads the prayer. You can lead next time.'],
  doneCap:    ['Alhamdulillah, salat berjamaah selesai.','Alhamdulillah, the congregational prayer is complete.'],
  khutbahCap: ['Khatib menyampaikan khutbah Jumat.','The preacher gives the Friday sermon.'],
  tandaCap:   ['Tanda waktu salat dibunyikan. Saatnya adzan.','The prayer-time signal sounds. Time for the adzan.'],
  leadCap:    ['Jamaah merapikan saf di belakang imam.','The jamaah straighten their rows behind the imam.'],
};

export async function init(ctx){
  const S = ctx.state, Q = new URLSearchParams(location.search);
  const L = p => S.lang === 'en' ? p[1] : p[0];
  const freeze = Q.has('freeze') || Q.get('hourspeed') === '0';
  const low = ctx.quality === 'low';
  const Mj = () => ctx.modules.masjid, Ch = () => ctx.modules.characters, V = () => ctx.modules.characters?.visitors;
  const stageNow = () => { const m = Mj(); return typeof m?.stage === 'number' ? m.stage : (S.masjid?.stage|0); };
  const isJumat = () => { const p = ctx.modules.progress; try{ if(p?.isJumat) return !!p.isJumat(S.day); }catch(e){} return (((S.day - 1) % 7) + 7) % 7 === 4; };
  const addPahala = (n, src) => { try{ const u = ctx.modules.ui; if(u?.addPahala) u.addPahala(n, src); else { S.pahala = (S.pahala || 0) + n; ctx.emit('coins:change', { coins:S.coins, pahala:S.pahala }); } }catch(e){} };
  const caption = (text, o={}) => ctx.emit('caption', { text, icon:o.icon ?? 'adzan', dur:o.dur ?? 4, kind:o.kind ?? 'prayer' });
  const safe = (f, d=null) => { try{ return f(); }catch(e){ console.warn('prayer:', e); return d; } };

  // ---------- state ----------
  if(!S.prayer || S.prayer.day !== S.day) S.prayer = { day:S.day, log:{}, lima:false };
  S.prayer.log ??= {};
  const closed = new Set(Object.keys(S.prayer.log).filter(k => S.prayer.log[k] > 0)); // handled before a reload
  let cur = null;   // { p, phase, t, tanda, wave, jumat, imam, readyT }
  const nameOf = p => p.id === 'dzuhur' && isJumat() && stageNow() >= 7 ? JUMAT_NAME : p.name;
  const logOf = id => S.prayer.log[id] | 0;
  function setLog(id, bit){ S.prayer.log[id] = logOf(id) | bit; checkLima(); }
  function checkLima(){
    if(S.prayer.lima) return;
    if(PRAYERS.every(p => logOf(p.id) & 3)){ S.prayer.lima = true; S.stats.limaWaktu = (S.stats.limaWaktu|0) + 1; safe(() => ctx.modules.progress?.checkStickers?.()); }
  }

  // ---------- anchors (masjid.spot with stage-aware fallbacks) ----------
  const FB = {
    adzan: st => st >= 4 ? { x:-8.35, y:0, z:-4.5, yaw:Math.PI } : st >= 1 ? { x:-2.0, y:PL, z:3.4, yaw:Math.PI } : { x:0, y:0, z:8, yaw:Math.PI },
    imam: st => st >= 1 ? { x:0, y:PL, z:-6.45, yaw:Math.PI } : { x:0, y:0, z:-2, yaw:Math.PI },
    kentongan: st => st >= 2 ? { x:-4.5, y:PL, z:7.3, yaw:Math.PI } : null,
    bedug: st => st >= 6 ? { x:11, y:0, z:-1.2, yaw:Math.PI } : null,
    mihrab: st => ({ x:0, y:st >= 1 ? PL : 0, z:-6.45, yaw:Math.PI }),
  };
  function spot(name){
    const st = stageNow(); let s = safe(() => Mj()?.spot?.(name));
    if(!s || !Number.isFinite(s.x) || !Number.isFinite(s.z)) s = FB[name]?.(st) ?? null;
    return s;
  }
  const cache = { adzan:{ x:0, y:0, z:8 }, imam:{ x:0, y:0, z:-2 } };
  const posOf = name => { const s = spot(name), c = cache[name]; if(s){ c.x = s.x; c.y = s.y ?? 0; c.z = s.z; } return c; };
  const yawOf = name => { const y = spot(name)?.yaw; return Number.isFinite(y) ? y : Math.PI; };

  // ---------- jamaah ----------
  function gathered(){
    const v = V(); if(!v) return 0;
    const g = safe(() => v.gathered);
    if(typeof g === 'number') return g;
    return (v.list || []).filter(x => x.mode === 'pray' && (x.state === 'gather' || x.state === 'arrive')).length;
  }
  const setHold = on => safe(() => V()?.setHold?.(!!on));
  function waveSize(){
    const st = stageNow(), capMul = safe(() => ctx.modules.care?.attraction?.().capMul, 1) ?? 1;
    const n = Math.round((3 + st * 1.2) * capMul * (cur?.jumat ? 1.5 : 1) * (cur?.tanda ? 1.25 : 1));
    return Math.max(2, Math.min(low ? 10 : 20, n));
  }
  function callWave(n){
    const v = V(); if(!v) return 0;
    if(typeof v.wave === 'function'){ const r = safe(() => v.wave(n, { mode:'pray', prayerId:cur?.p.id })); return typeof r === 'number' ? r : n; }
    // older visitors API: stagger plain spawns and make them pray-mode
    let made = 0;
    for(let i = 0; i < n; i++) setTimeout(() => { const x = safe(() => v.spawn?.()); if(x){ x.mode = 'pray'; } }, 300 + i * 900), made++;
    return made;
  }

  // ---------- markers ----------
  const markers = {};
  function marker(name, on){ on = !!on; if(markers[name] === on) return; markers[name] = on; safe(() => Mj()?.setMarker?.(name, on)); }
  function syncMarkers(){
    const ph = cur?.phase, st = stageNow();
    marker('adzan', ph === 'open');
    marker('kentongan', (ph === 'open' || ph === 'soon') && !cur?.tanda && st >= 2);
    marker('bedug', (ph === 'open' || ph === 'soon') && !cur?.tanda && st >= 6);
    marker('imam', ph === 'ready' || (ph === 'called' && gathered() >= 1));
  }
  const cutaway = on => safe(() => Mj()?.setCutaway?.('prayer', !!on));

  // ---------- state machine ----------
  function info(p){ return { id:p.id, name:nameOf(p), start:p.start, end:p.end }; }
  function begin(p, h){
    cur = { p, phase: h < p.start ? 'soon' : 'open', t:0, tanda:false, wave:0, jumat: p.id === 'dzuhur' && isJumat(), imam:null, readyT:0 };
    ctx.emit('prayer:soon', { ...info(p) });
    if(cur.phase === 'open') ctx.emit('prayer:open', { ...info(p), jumat:cur.jumat });
    syncMarkers();
  }
  function close(){
    if(!cur) return;
    const id = cur.p.id; closed.add(id);
    const leading = cur.phase === 'leading' || cur.phase === 'npc';
    cur = null; syncMarkers();
    if(!leading) setHold(false);
    cutaway(false);
    ctx.emit('prayer:close', { id, log:logOf(id) });
  }
  function canAdzan(){ return !!cur && cur.phase === 'open'; }
  function canLead(){ return !!cur && (cur.phase === 'ready' || (cur.phase === 'called' && gathered() >= 1)); }
  function startAdzan(pos, yaw){
    if(!canAdzan()) return false;
    const p = cur.p, nm = nameOf(p), sp = spot('adzan');
    cur.phase = 'adzan'; cur.t = 0;
    setLog(p.id, 1);
    const at = pos ? { x:pos.x, y:pos.y ?? 0, z:pos.z } : sp ? { x:sp.x, y:sp.y ?? 0, z:sp.z } : { x:0, y:0, z:8 };
    syncMarkers();
    ctx.emit('adzan:start', { prayerId:p.id, name:nm, pos:at, yaw:Number.isFinite(yaw) ? yaw : yawOf('adzan'), tanda:cur.tanda });
    caption([T.adzanCap[0].replace('{p}', nm[0]), T.adzanCap[1].replace('{p}', nm[1])], { kind:'adzan', icon:'adzan', dur:6 });
    addPahala(5 + (cur.tanda ? 2 : 0), 'adzan');
    return true;
  }
  function endAdzan(){
    if(!cur || cur.phase !== 'adzan') return;
    const n = waveSize(); const got = callWave(n);
    cur.wave = got > 0 ? got : n; cur.phase = 'called'; cur.t = 0;
    setHold(true);
    ctx.emit('adzan:end', { prayerId:cur.p.id, wave:cur.wave });
    syncMarkers();
  }
  function ready(){
    cur.phase = 'ready'; cur.t = 0;
    ctx.emit('prayer:ready', { id:cur.p.id, jamaah:gathered() });
    syncMarkers();
  }
  function startLead(){
    if(!canLead()) return false;
    const p = cur.p, st = stageNow(), khutbah = cur.jumat && st >= 7, count = gathered();
    let ok = false;
    const C = Ch();
    let sim = false;
    if(C?.leadPrayer) ok = !!safe(() => C.leadPrayer({ prayerId:p.id, jumat:cur.jumat, khutbah }), false);
    else { const v = V(); if(v?.startPrayer) ok = !!safe(() => v.startPrayer({ imam:'player', prayerId:p.id }), false); else { ok = true; sim = true; } } // no choreography available: still never get stuck
    if(!ok) return false;
    cur.phase = 'leading'; cur.t = 0; cur.imam = 'player'; cur.sim = sim;
    syncMarkers(); cutaway(true);
    ctx.emit('prayer:lead', { id:p.id, imam:'player', count });
    if(khutbah) caption(T.khutbahCap, { kind:'prayer', icon:'imam', dur:8 });
    else caption(T.leadCap, { kind:'prayer', icon:'imam', dur:4 });
    return true;
  }
  function npcLead(){
    if(!cur) return false;
    const p = cur.p, count = gathered();
    const v = V(), sim = !v?.startPrayer;
    const ok = sim ? count > 0 : !!safe(() => v.startPrayer({ imam:'npc', prayerId:p.id }), false);
    if(!ok){ close(); return false; }
    cur.phase = 'npc'; cur.t = 0; cur.imam = 'npc'; cur.sim = sim;
    setLog(p.id, 4);
    syncMarkers();
    ctx.emit('prayer:lead', { id:p.id, imam:'npc', count });
    caption(T.npcCap, { kind:'prayer', icon:'imam', dur:6 });
    return true;
  }
  function finish(d){
    const p = cur.p, imam = d?.imam || cur.imam || 'npc', count = d?.count ?? gathered();
    if(imam === 'player'){ setLog(p.id, 2); addPahala(8 + Math.min(10, count|0), 'imam'); caption(T.doneCap, { kind:'prayer', icon:'imam', dur:5 }); }
    else setLog(p.id, 4);
    setHold(false); cutaway(false);
    cur.phase = 'done'; cur.t = 0; syncMarkers();
  }

  // ---------- events ----------
  ctx.on('interact', d => {
    if(d?.kind === 'adzan') startAdzan(d.pos, d.yaw);
    else if(d?.kind === 'imam') startLead();
  });
  ctx.on('act:end', d => { if(cur?.phase === 'adzan' && d && (d.kind === 'adzan' || d.name === 'adzan') && d.cancelled) endAdzan(); });
  const onTanda = () => {
    if(!cur || (cur.phase !== 'open' && cur.phase !== 'soon') || cur.tanda) return;
    cur.tanda = true; ctx.emit('prayer:tanda', { id:cur.p.id });
    caption(T.tandaCap, { kind:'info', icon:'kentongan', dur:3.5 });
    syncMarkers();
  };
  ctx.on('kentongan:hit', onTanda);
  ctx.on('bedug:hit', onTanda);
  ctx.on('prayer:done', d => { if(cur && (cur.phase === 'leading' || cur.phase === 'npc')) finish(d); });
  ctx.on('event:day', d => {
    if(S.prayer.day === S.day) return;
    if(cur) close();
    S.prayer = { day:S.day, log:{}, lima:false }; closed.clear(); setHold(false);
  });

  // ---------- clock + update ----------
  let lastH = ctx.hour ?? 8, first = true, markT = 0;
  function activeAt(h){
    for(const p of PRAYERS){ if(closed.has(p.id)) continue; if(h >= p.start - SOON && h < p.end) return p; }
    return null;
  }
  function debugOpen(id){
    const p = PRAYERS.find(x => x.id === id); if(!p) return false;
    if(cur) close();
    closed.delete(p.id);
    const h = p.start + .01, pr = ctx.modules.progress;
    if(pr?.setHour) pr.setHour(h); else ctx.hour = h;
    lastH = ctx.hour;
    cur = { p, phase:'open', t:0, tanda:false, wave:0, jumat:p.id === 'dzuhur' && isJumat(), imam:null, readyT:0 };
    ctx.emit('prayer:soon', { ...info(p) });
    ctx.emit('prayer:open', { ...info(p), jumat:cur.jumat });
    syncMarkers();
    return true;
  }
  const slowPhase = ph => ph && ph !== 'done';
  function update(dt){
    if(first){ first = false;
      const po = Q.get('prayopen'); if(po) debugOpen(po);
      const pf = parseFloat(Q.get('prayfast')); if(pf > 0){ const v = V(); if(v?.prayer) v.prayer.speed = pf; }
    }
    // clock: 25% speed while a prayer is near, open, called or being prayed (never across midnight or big jumps)
    let h = ctx.hour ?? 8; const dh = h - lastH;
    if(!freeze && slowPhase(cur?.phase) && dh > 0 && dh < .5){ h = h - SLOW * dh; ctx.hour = h; }
    lastH = h;
    if(!cur){ const p = activeAt(h); if(p && !(logOf(p.id) & 7)) begin(p, h); else if(p) closed.add(p.id); }
    if(!cur) return;
    cur.t += dt;
    const p = cur.p;
    switch(cur.phase){
      case 'soon': if(h >= p.start){ cur.phase = 'open'; cur.t = 0; ctx.emit('prayer:open', { ...info(p), jumat:cur.jumat }); syncMarkers(); } break;
      case 'open': if(h >= p.end){ if(gathered() >= 2) npcLead(); else close(); } break;
      case 'adzan': if(cur.t >= 7) endAdzan(); break;
      case 'called': { const g = gathered(); if(g >= Math.min(3, Math.max(1, cur.wave)) || (cur.t > 12 && g >= 1)) ready(); else if(cur.t > 75 && g === 0) close(); break; }
      case 'ready': if(cur.t > 45) npcLead(); else if(gathered() === 0 && cur.t > 20) close(); break;
      case 'leading': case 'npc': if(cur.t > (cur.sim ? 6 : 300)) finish({ imam:cur.imam, count:gathered() }); break;
      case 'done': if(cur.t > 25 || h >= p.end || h < p.start - 1) close(); break;
    }
    markT += dt; if(markT > 1){ markT = 0; syncMarkers(); }
  }

  // ---------- interactables ----------
  ctx.interactables ??= [];
  const adzanIt = { kind:'adzan', get label(){ return L(T.adzanLabel); }, icon:'adzan', get pos(){ return posOf('adzan'); }, r:2.0, priority:1.5,
    enabled:() => canAdzan(), anim:'adzan', get yaw(){ return yawOf('adzan'); }, dur:7, cancelAfter:3, prayer:true };
  const imamIt = { kind:'imam', get label(){ return L(T.imamLabel); }, icon:'imam', get pos(){ return posOf('imam'); }, r:1.8, priority:1.5,
    enabled:() => canLead(), anim:'takbir', dur:.6, yaw:Math.PI, prayer:true };
  ctx.interactables.push(adzanIt, imamIt);

  function nextAfter(h){ for(const p of PRAYERS) if(p.start > h && !closed.has(p.id)) return p; return PRAYERS[0]; }
  function current(){
    const h = ctx.hour ?? 8, p = cur?.p || nextAfter(h), nx = nextAfter(Math.max(h, p.start));
    return { id:p.id, name:nameOf(p), phase:cur?.phase || 'idle', start:p.start, end:p.end, log:logOf(p.id), jumat:p.id === 'dzuhur' && isJumat(),
      jamaah:cur ? gathered() : 0, wave:cur?.wave || 0, next:{ id:nx.id, name:nameOf(nx), start:nx.start }, canAdzan:canAdzan(), canLead:canLead(), tanda:!!cur?.tanda };
  }
  function schedule(){
    const h = ctx.hour ?? 8;
    return PRAYERS.map(p => { const lg = logOf(p.id);
      let state = lg & 2 ? 'led' : lg & 4 ? 'npc' : lg & 1 ? 'adzan' : (cur?.p === p && cur.phase !== 'done' && cur.phase !== 'soon') ? 'open' : h >= p.end ? 'passed' : 'upcoming';
      return { id:p.id, name:nameOf(p), start:p.start, end:p.end, state }; });
  }
  function guide(target='adzan'){
    const s = spot(target === 'mihrab' ? 'imam' : target); if(!s) return null;
    const C = Ch(); if(!C?.walkTo) return null;
    return safe(() => C.walkTo({ x:s.x, z:s.z }, { r:.6 }));
  }
  return {
    PRAYERS, current, schedule, canAdzan, canLead, guide, debugOpen, spot, gathered,
    adzan(){ const C = Ch(); const ok = startAdzan(C?.pos, C?.yaw); if(ok) safe(() => C?.play?.('adzan', { dur:7, emit:false, cancel:false })); return ok; },
    endAdzan, lead(){ return startLead(); }, npcLead,
    get phase(){ return cur?.phase || 'idle'; }, get log(){ return { ...S.prayer.log }; },
    update,
  };
}

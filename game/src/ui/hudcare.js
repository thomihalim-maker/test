// HUD "care row" for the masjid-care loop: prayer-time chip, Kebersihan pill, animal alert chip, plus the bottom
// stack (caption bar + floating "Datangi" button) and one-time tips. Built by ui.js; every foreign call is guarded.
// Respect rules: the prayer chip never shows red, countdowns or failure wording; a passed prayer quietly disappears.
const TX = {
  adzanNow:['Waktunya adzan','Time for adzan'], adzanOn:['Adzan {p}','{p} adzan'], gather:['Jamaah berkumpul','Jamaah gathering'],
  praying:['Sedang salat','Praying together'], done:['Selesai','Done'], next:['Berikutnya','Next'],
  goMenara:['Ayo ke menara untuk adzan!','Let\'s go to the minaret for the adzan!'], goMic:['Ayo ke mikrofon serambi untuk adzan!','Let\'s go to the porch mic for the adzan!'],
  goMihrab:['Ayo ke mihrab, pimpin salat!','Let\'s go to the mihrab and lead the prayer!'], nextPr:['Salat berikutnya: {p} {h}','Next prayer: {p} {h}'],
  soon:['Sebentar lagi waktu {p}','{p} time is coming soon'], open:['Waktunya adzan {p}','Time for the {p} adzan'],
  ready:['Jamaah sudah berkumpul. Pimpin salat di mihrab!','The jamaah have gathered. Lead the prayer at the mihrab!'],
  clean:['Kebersihan','Cleanliness'], cleanOk:['Masjid sudah bersih, Alhamdulillah!','The masjid is spotless, Alhamdulillah!'], goClean:['Ayo bersihkan!','Let\'s clean it!'],
  dirty:['Masjid mulai kotor, ayo bersih-bersih!','The masjid is getting dirty, let\'s tidy up!'],
  hunger:['Lapar','Hungry'], thirst:['Haus','Thirsty'], cleanN:['Kotor','Dirty'], happy:['Sedih','Lonely'], sick:['Sakit','Unwell'],
  go:['Datangi','Go to'], hide:['Sembunyikan','Hide'], walkStop:['Jalan otomatis berhenti','Auto-walk stopped'],
  tipDirt:['Tekan Sapu untuk menyapu','Tap the Broom to sweep'],
  tipPile:['Tumpukan daun! Tekan Aksi untuk mengangkutnya','A leaf pile! Press Action to bag it'],
  tipOpen:['Datang ke menara untuk adzan','Go to the minaret to call the adzan'],
  tipReady:['Jamaah sudah menunggu. Berdiri di mihrab untuk memimpin salat','The jamaah are waiting. Stand at the mihrab to lead the prayer'],
};
export const hhmm = h => { h = ((+h || 0) % 24 + 24) % 24; const H = Math.floor(h), M = Math.round((h - H) * 60); return String(M === 60 ? H + 1 : H).padStart(2,'0') + ':' + String(M === 60 ? 0 : M).padStart(2,'0'); };

export function createCare(U){
  const { ctx, S, L, ic, el, hud, sfx } = U;
  const T = (k, v) => { let s = L(TX[k]); if(v) for(const a in v) s = s.replace('{' + a + '}', v[a]); return s; };
  const M = n => ctx.modules[n];
  const safe = (f, d) => { try{ const r = f(); return r === undefined ? d : r; }catch(e){ return d; } };
  const ppos = () => { const p = M('characters')?.pos || ctx.cameraRig?.target; return p && Number.isFinite(p.x) ? p : null; };

  // ---------- DOM ----------
  const row = el('div'); row.id = 'carerow';
  row.innerHTML = `<button class="cchip clay" id="prChip"><span class="ci">${ic('clock')}</span><span class="ct"><b id="prA"></b><small id="prB"></small></span></button>
    <button class="cchip clay" id="clPill"><span class="ci">${ic('sparkle')}</span><span class="ct"><b id="clN"></b><span class="cbar"><i id="clBar"></i></span></span></button>
    <div class="cchip clay alert" id="anChip"><button class="amain" id="anMain"><img id="anImg" alt=""><span class="ct"><b id="anName"></b><small id="anNeed"></small></span></button><button class="ax" id="anX">${ic('close')}</button></div>`;
  hud.appendChild(row);
  const bstack = el('div'); bstack.id = 'bstack';
  bstack.innerHTML = `<div id="caption" class="clay"><span class="ci" id="capI"></span><span id="capT"></span></div><button id="goBtn" class="btn teal">${ic('walk')}<span id="goT"></span></button>`;
  hud.appendChild(bstack);
  const tipEl = el('div', 'clay'); tipEl.id = 'tip';
  tipEl.innerHTML = `<div class="av">${ic('marbot')}</div><div class="tx" id="tipTx"></div><button class="x" id="tipX">${ic('close')}</button>`;
  hud.appendChild(tipEl);
  const $ = id => document.getElementById(id);
  const prChip = $('prChip'), clPill = $('clPill'), anChip = $('anChip'), cap = $('caption'), goBtn = $('goBtn');
  const pulse = n => { n.classList.remove('pulse1'); void n.offsetWidth; n.classList.add('pulse1'); };

  // ---------- prayer chip ----------
  let prKey = '';
  function renderPrayer(){
    const P = M('prayer'); const cur = P && safe(() => P.current(), null);
    if(!cur){ prChip.style.display = 'none'; return; }
    prChip.style.display = '';
    const nm = cur.name ? L(cur.name) : cur.id, ph = cur.phase;
    let a, b, cls = '', icon = 'clock';
    if(ph === 'open'){ a = T('adzanNow'); b = nm; cls = 'gold glow'; icon = 'adzan'; }
    else if(ph === 'adzan'){ a = T('adzanOn', { p:nm }); b = ''; cls = 'gold'; icon = 'adzan'; }
    else if(ph === 'called' || ph === 'ready'){ a = T('gather'); b = (cur.jamaah ? cur.jamaah + ' · ' : '') + nm; cls = ph === 'ready' ? 'teal glow' : 'teal'; icon = 'imam'; }
    else if(ph === 'leading' || ph === 'npc'){ a = T('praying'); b = nm; cls = 'teal'; icon = 'imam'; }
    else if(ph === 'done'){ a = T('done'); b = nm; icon = 'check'; }
    else { a = nm; b = hhmm(cur.start); if(ph === 'soon') cls = 'glow'; }
    const key = a + '|' + b + '|' + cls + '|' + icon;
    if(key === prKey) return; prKey = key;
    prChip.className = 'cchip clay ' + cls; $('prA').textContent = a; $('prB').textContent = b; prChip.querySelector('.ci').innerHTML = ic(icon);
    prChip.setAttribute('aria-label', a + ' ' + b);
  }
  prChip.onclick = () => {
    const P = M('prayer'); const cur = P && safe(() => P.current(), null); if(!cur) return;
    const ph = cur.phase, st = stage();
    if(ph === 'open' || ph === 'soon'){ walkGuide(() => P.guide('adzan')); U.toast(st >= 4 ? T('goMenara') : T('goMic'), 'adzan'); }
    else if(ph === 'called' || ph === 'ready'){ walkGuide(() => P.guide('imam')); U.toast(T('goMihrab'), 'imam'); }
    else { const n = cur.phase === 'idle' ? cur : cur.next; if(n) U.toast(T('nextPr', { p:L(n.name), h:hhmm(n.start) }), 'clock'); }
  };
  const stage = () => { const m = M('masjid'); return m && typeof m.stage === 'number' ? m.stage : (S.masjid?.stage | 0); };

  // ---------- kebersihan pill ----------
  let clLast = -1;
  function renderClean(force){
    const C = M('care'); const c = C && safe(() => C.clean(), null);
    if(c == null || !Number.isFinite(c)){ clPill.style.display = 'none'; return; }
    clPill.style.display = '';
    if(c === clLast && !force) return; clLast = c;
    $('clN').textContent = c + '%'; $('clBar').style.width = Math.max(4, c) + '%';
    clPill.dataset.lv = c >= 70 ? 'hi' : c >= 40 ? 'mid' : 'lo';
    clPill.setAttribute('aria-label', T('clean') + ' ' + c + '%');
  }
  clPill.onclick = () => {
    const C = M('care'), p = ppos(); const n = C && p && safe(() => C.nearest(p, 30), null);
    if(!n || !n.pos){ U.toast(T('cleanOk'), 'sparkle', 'good'); return; }
    if(n.tool && S.tool !== n.tool){ S.tool = n.tool; ctx.emit('tool:select', n.tool); }
    walkGuide(() => M('characters')?.walkTo?.({ x:n.pos.x, z:n.pos.z }, { r:1.0 })); U.toast(T('goClean'), n.icon || 'broom');
  };

  // ---------- auto-walk bookkeeping (toast only when a walk WE started is cancelled) ----------
  let uiWalk = false;
  function walkGuide(f){ uiWalk = false; const h = safe(f, null); uiWalk = !!h; return h; }
  ctx.on('player:walk', d => { if(!d) return; if(d.state === 'cancel'){ if(uiWalk) U.toast(T('walkStop'), 'walk'); uiWalk = false; hideGo(); } else if(d.state === 'arrive'){ uiWalk = false; hideGo(); } });

  // ---------- animal alert ----------
  let anId = null, anNeed = null, anHideUntil = 0, anKey = '';
  const NEED_TX = { hunger:'hunger', thirst:'thirst', clean:'cleanN', happy:'happy', sick:'sick' };
  function pickUrgent(){
    const A = M('animals'); const ro = A?.roster ? safe(() => A.roster(), []) : []; let best = null, bv = 9;
    for(const r of ro){ if(!r.need) continue; const v = r.need === 'sick' ? -1 : (r.stats?.[r.need] ?? 1); if(v < bv){ bv = v; best = r; } }
    return best;
  }
  function renderAnimal(){
    const blocked = !U.started() || U.panel() || U.cardOpen() || performance.now() < anHideUntil;
    const r = blocked ? null : pickUrgent();
    if(!r){ anChip.classList.remove('on'); anId = null; return; }
    const key = r.id + '|' + r.need + '|' + S.lang;
    if(key !== anKey){
      anKey = key; if(anId !== r.id || anNeed !== r.need) pulse(anChip); anId = r.id; anNeed = r.need;
      const src = safe(() => M('animals').portrait(r.id, { size:64 }), '');
      const img = $('anImg'); if(src){ img.src = src; img.style.display = ''; } else img.style.display = 'none';
      $('anName').textContent = r.name || L(r.kindName || ['Hewan','Animal']); $('anNeed').textContent = T(NEED_TX[r.need] || 'hunger');
      anChip.dataset.need = r.need;
    }
    anChip.classList.add('on');
  }
  $('anMain').onclick = () => { if(anId != null) U.openHewan(anId); };
  $('anX').onclick = e => { e.stopPropagation(); anHideUntil = performance.now() + 60000; renderAnimal(); };
  ctx.on('animal:need', () => { anKey = ''; renderAnimal(); });

  // ---------- caption bar ----------
  let capT = 0, capOn = false;
  function caption(text, o = {}){
    const s = Array.isArray(text) ? L(text) : (text && typeof text === 'object' ? L([text.id || text[0], text.en || text[1]]) : String(text || ''));
    if(!s) return;
    $('capT').textContent = s; $('capI').innerHTML = ic(o.icon || (o.kind === 'adzan' ? 'adzan' : o.kind === 'prayer' ? 'imam' : 'chat'));
    cap.className = 'clay ' + (o.kind || 'info'); void cap.offsetWidth; cap.classList.add('on');
    capOn = true; capT = Math.max(1.5, +o.dur || 4);
    if(tipEl.classList.contains('on')){ tipEl.classList.remove('on'); if(tipCur && tipTimer > 0) tipQ.unshift(tipCur); tipCur = null; tipTimer = 0; }   // one bottom message at a time
    layoutStack();
  }
  ctx.on('caption', d => { if(!d) return; if(typeof d === 'string' || Array.isArray(d)) caption(d); else caption(d.text, d); });

  // ---------- floating "Datangi" after "Lihat" ----------
  let goT = 0, goFn = null;
  function showGo(label, fn, secs = 6){ $('goT').textContent = label || T('go'); goFn = fn; goT = secs; goBtn.classList.add('on'); layoutStack(); }
  function hideGo(){ goT = 0; goFn = null; goBtn.classList.remove('on'); }
  goBtn.onclick = () => { const f = goFn; hideGo(); if(f) f(); };

  // ---------- one-time tips (S.tips) ----------
  // Each tip carries a "still applies" check: it is skipped (or closed early) once its goal is met, and it waits
  // while a mode hint (tutorial, decor placement, design sheet, an open panel) or a caption owns the screen.
  let tipTimer = 0, tipCur = null; const tipQ = [];
  const STILL = {
    dirt: () => S.tool !== 'sapu' && S.tool !== 'pel',
    pile: () => true,
    prayerOpen: () => { const ph = M('prayer')?.phase; return (ph === 'open' || ph === 'soon') && !nearSpot('adzan', 3); },
    prayerReady: () => { const ph = M('prayer')?.phase; return (ph === 'ready' || ph === 'called') && !nearSpot('imam', 2.5); },
  };
  function nearSpot(n, r){ const p = ppos(); const s = p && safe(() => M('prayer')?.spot?.(n) || M('masjid')?.spot?.(n), null); return !!(s && Number.isFinite(s.x) && Math.hypot(p.x - s.x, p.z - s.z) < r); }
  const applies = x => { const f = x.still || STILL[x.key]; return !f || !!safe(f, true); };
  const tipBlocked = () => !U.started() || U.panel() || U.cardOpen() || capOn || document.body.classList.contains('design-on') || hud.classList.contains('placing') || hud.classList.contains('hint-on');
  function tip(key, text, icon, still){
    if(!key) return false; if(!S.tips || typeof S.tips !== 'object') S.tips = {};
    if(S.tips[key]) return false;
    const x = { key, text, icon, still }; if(!applies(x)) return false;
    S.tips[key] = Math.max(1, S.day | 0);
    tipQ.push(x); if(!tipTimer && !tipCur) nextTip(); return true;
  }
  function nextTip(){
    if(tipBlocked()) return;                                    // update() retries once the screen is free
    let x; while((x = tipQ.shift()) && !applies(x));
    if(!x){ tipEl.classList.remove('on'); tipTimer = 0; tipCur = null; return; }
    tipCur = x;
    const s = Array.isArray(x.text) ? L(x.text) : String(x.text);
    $('tipTx').textContent = s; tipEl.querySelector('.av').innerHTML = ic(x.icon || 'marbot');
    tipEl.classList.remove('on'); void tipEl.offsetWidth; tipEl.classList.add('on'); tipTimer = 7; sfx('pop'); layoutStack();
  }
  function closeTip(key){
    for(let i = tipQ.length - 1; i >= 0; i--) if(!key || tipQ[i].key === key) tipQ.splice(i, 1);
    if(tipCur && (!key || tipCur.key === key) && tipTimer > 0) tipTimer = 0.001;
  }
  $('tipX').onclick = () => { tipTimer = 0.001; };

  // ---------- event wiring ----------
  ctx.on('care:change', () => { renderClean(); pulse(clPill); });
  ctx.on('care:clean', d => { if(d?.removed) pulse(clPill); if(S.tips && !S.tips.dirt) S.tips.dirt = Math.max(1, S.day | 0); closeTip('dirt'); });
  ctx.on('tool:select', t => { if(t === 'sapu' || t === 'pel') closeTip('dirt'); });
  ctx.on('care:gather', () => closeTip('pile'));
  ctx.on('care:dirty', () => U.toast(T('dirty'), 'sparkle'));
  ctx.on('care:pile', d => { if((d?.n | 0) >= 3) tip('pile', TX.tipPile, 'leafpile'); });
  const prName = d => d?.name ? L(d.name) : '';
  // prayer toasts drop out of the queue once the prayer has moved past the phase they announce
  const phaseIs = (...ph) => () => { const P = M('prayer'); if(!P) return false; return !ph.includes(P.phase); };
  ctx.on('prayer:soon', d => { prKey = ''; renderPrayer(); pulse(prChip); U.toast(T('soon', { p:prName(d) }), 'clock', '', { stale:phaseIs('soon', 'idle') }); });
  ctx.on('prayer:open', d => { prKey = ''; renderPrayer(); pulse(prChip); U.toast(T('open', { p:prName(d) }), 'adzan', 'good', { stale:phaseIs('open') });
    tip('prayerOpen', stage() >= 4 ? TX.tipOpen : [TX.goMic[0], TX.goMic[1]], 'adzan'); });
  ctx.on('prayer:ready', () => { prKey = ''; renderPrayer(); pulse(prChip); tip('prayerReady', TX.tipReady, 'imam'); });
  ctx.on('adzan:start', () => { closeTip('prayerOpen'); });
  for(const e of ['prayer:lead','prayer:start']) ctx.on(e, () => { closeTip('prayerOpen'); closeTip('prayerReady'); });
  for(const e of ['prayer:lead','prayer:start','prayer:done','prayer:close','adzan:start','adzan:end']) ctx.on(e, () => { prKey = ''; renderPrayer(); });
  ctx.on('prayer:start', () => { if(!capOn) caption(['Salat berjamaah…','Praying together…'], { kind:'prayer', icon:'imam', dur:4 }); });

  const coarse = matchMedia('(pointer:coarse)'), narrow = matchMedia('(max-width:640px) and (orientation:portrait)');
  const TOUCH = () => coarse.matches || narrow.matches || !!ctx.input?.touch || document.body.classList.contains('touch');
  // ---------- layout: the bottom stack sits just above the hotbar (and above a tutorial hint) ----------
  function layoutStack(){
    const hb = document.getElementById('hotbar'), hint = document.getElementById('hint');
    let top = innerHeight - 8;
    for(const n of [hb, hint, tipEl.classList.contains('on') ? tipEl : null]){ if(!n || n.classList.contains('hidden')) continue; const r = n.getBoundingClientRect(); if(r.height && r.top < top && r.bottom > innerHeight * .45) top = r.top; }
    bstack.style.bottom = Math.round(innerHeight - top + 10) + 'px';
    const toasts = document.getElementById('toasts');
    if(toasts){ const busy = capOn || goT > 0; if(busy){ const r = bstack.getBoundingClientRect(); toasts.style.bottom = Math.round(innerHeight - r.top + 8) + 'px'; } else toasts.style.bottom = ''; }
    // the tip box floats above the hotbar on desktop; on touch screens it sits at the top, under the HUD chips, so it
    // never covers the marbot in the middle of the screen
    if(TOUCH()){ const rr = row.getBoundingClientRect(), tr = document.getElementById('tracker')?.getBoundingClientRect();
      const y = Math.max(rr.height ? rr.bottom : 0, tr && tr.height ? tr.bottom : 0, 60); tipEl.style.top = Math.round(y + 8) + 'px'; tipEl.style.bottom = 'auto'; tipEl.classList.add('top'); }
    else { tipEl.style.top = ''; tipEl.classList.remove('top'); if(hb){ const r = hb.getBoundingClientRect(); tipEl.style.bottom = Math.round(innerHeight - (r.height ? r.top : innerHeight) + 10) + 'px'; } }
    // the care row tucks under the quest tracker (which can unfold)
    const tr = document.getElementById('tracker'); if(tr){ const r = tr.getBoundingClientRect(); const tb = document.getElementById('topbar')?.getBoundingClientRect();
      const y = r.height && tr.style.display !== 'none' ? r.bottom : (tb ? tb.bottom : 60); row.style.top = Math.round(y + 8) + 'px'; }
  }

  // ---------- periodic ----------
  let acc = 0, dirtT = 0, lastNow = performance.now();
  function update(){
    // UI timers run on wall-clock time (game dt is clamped and can crawl on slow devices)
    const now = performance.now(), dt = Math.min(.5, (now - lastNow) / 1000); lastNow = now;
    if(capOn){ capT -= dt; if(capT <= 0){ capOn = false; cap.classList.remove('on'); layoutStack(); } }
    if(goT > 0){ goT -= dt; if(goT <= 0) hideGo(); }
    if(tipTimer > 0){
      if(tipBlocked() && !capOn){ tipEl.classList.remove('on'); if(tipCur) tipQ.unshift(tipCur); tipCur = null; tipTimer = 0; }
      else { tipTimer -= dt; if(tipCur && !applies(tipCur)) tipTimer = Math.min(tipTimer, 0); if(tipTimer <= 0){ tipTimer = 0; tipCur = null; tipEl.classList.remove('on'); setTimeout(() => { if(!tipTimer && !tipCur) nextTip(); }, 350); } }
    } else if(!tipCur && tipQ.length && !tipBlocked()) nextTip();
    acc += dt; if(acc < .5) return; acc = 0;
    row.classList.toggle('off', !U.started());
    renderPrayer(); renderClean(); renderAnimal(); layoutStack();
    // first time near dirt: one gentle tip
    dirtT += .5; if(dirtT >= 1.5 && U.started() && !S.tips?.dirt){ dirtT = 0; const C = M('care'), p = ppos(); const n = C && p && safe(() => C.nearest(p, 3.5), null); if(n && n.kind !== 'gather' && n.tool !== 'pel') tip('dirt', TX.tipDirt, 'broom'); }
  }
  function refresh(){ prKey = ''; anKey = ''; renderPrayer(); renderClean(true); renderAnimal(); }
  return { update, refresh, caption, tip, closeTip, showGo, hideGo, walkGuide, layout:layoutStack, T, get captionOn(){ return capOn; } };
}

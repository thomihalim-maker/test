// "Desain Masjid" sheet: choose roof/wall/trim colours and roof/finial/menara/gate/lantern styles with a live 3D
// preview (custom.preview -> masjid.applyCustom). Compact bottom sheet on phones, right side sheet in landscape, over a
// transparent backdrop so the masjid stays visible. Data/buying lives in game/custom.js; this is only the UI.
const TX = {
  title:['Desain Masjid','Masjid Design'], use:['Pakai','Use'], buyUse:['Beli & Pakai','Buy & Use'], cancel:['Batal','Cancel'], inUse:['Dipakai','In use'],
  free:['Gratis','Free'], lv:['Berkah {l}','Berkah {l}'], unlockAt:['Terbuka di Berkah {l}','Unlocks at Berkah {l}'], howLv:['Kumpulkan pahala dengan merawat masjid','Earn pahala by caring for the masjid'],
  more:['Pilihan lain','More choices'], notBuilt:['Belum dibangun — pilihanmu dipakai saat dibangun','Not built yet — your choice is used when it is built'],
  lockedMsg:['Terbuka di Berkah {l}. Kumpulkan pahala dengan merawat masjid, ya!','Unlocks at Berkah {l}. Earn pahala by caring for the masjid!'],
  done:['Masjid makin cantik!','The masjid looks lovely!'], bought:['Dibeli & dipakai!','Bought & in use!'], noCoins:['Koin tidak cukup','Not enough coins'],
  pick:['Ketuk pilihan untuk melihatnya langsung','Tap a choice to preview it live'], owned:['Milikmu','Owned'], none:['Desain belum tersedia','Design is not available yet'],
  entry:['Desain Masjid','Masjid Design'], entrySub:['Ubah warna & bentuk sesukamu','Change colours & shapes your way'],
};
const STAGE_FALLBACK = { trim:1, wall:2, gate:2, roof:3, roofStyle:3, finial:3, menara:4, floor:7, lantern:8 };
const O = '#7a4a22';
function shade(hex, k){ const n = parseInt(String(hex || '#888').slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }

// small painted thumbnails for the style options (no text, geometric only)
function thumb(cat, id, c){
  const roof = c.roof || '#c98a4f', rd = shade(roof, -.3), wall = c.wall || '#fffaf0', trim = c.trim || '#2f8f86', gold = '#ffc83d', wood = '#6b4426', brick = '#b9583b', brd = '#8f3d28';
  const tier = (y, w, h, apex) => apex ? `<path d="M${32 - w} ${y}Q32 ${y - h - 4} 32 ${y - h}Q32 ${y - h - 4} ${32 + w} ${y}Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/>`
    : `<path d="M${32 - w} ${y}L${32 - w * .45} ${y - h}H${32 + w * .45}L${32 + w} ${y}Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/><path d="M${32 - w} ${y}H${32 + w}" stroke="${rd}" stroke-width="2.4"/>`;
  const body = `<rect x="14" y="44" width="36" height="14" fill="${wall}" stroke="${O}" stroke-width="1.6"/><rect x="14" y="44" width="36" height="3" fill="${trim}"/><path d="M29 58v-6a3 3 0 0 1 6 0v6z" fill="${wood}"/>`;
  const knob = y => `<path d="M32 ${y}v-5" stroke="#a8650c" stroke-width="1.6"/><circle cx="32" cy="${y - 6}" r="2.6" fill="${gold}" stroke="#a8650c" stroke-width="1.2"/>`;
  let s = '';
  if(cat === 'roofStyle'){
    if(id === 'tumpang2') s = body + tier(45, 24, 12) + tier(34, 15, 14, true) + knob(20);
    else if(id === 'kubah') s = body + tier(45, 24, 10) + tier(36, 16, 8) + `<path d="M23 28a9 9 0 0 1 18 0z" fill="${shade(roof, .15)}" stroke="${O}" stroke-width="1.6"/><path d="M26 25a6 6 0 0 1 5-4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/>` + knob(19);
    else s = body + tier(45, 24, 9) + tier(36, 17, 9) + tier(27, 11, 11, true) + knob(16);
  } else if(cat === 'finial'){
    const base = `<path d="M18 58L26 44H38L46 58Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/><rect x="28" y="38" width="8" height="7" rx="2" fill="${gold}" stroke="#a8650c" stroke-width="1.4"/>`;
    if(id === 'kuncup') s = base + `<path d="M32 12C24 20 24 32 32 38C40 32 40 20 32 12Z" fill="#ffb3c7" stroke="${O}" stroke-width="1.6"/><path d="M32 38C26 34 22 30 21 25C26 27 30 31 32 38ZM32 38C38 34 42 30 43 25C38 27 34 31 32 38Z" fill="#ff8fae" stroke="${O}" stroke-width="1.4"/>`;
    else if(id === 'bulan') s = base + `<path d="M32 38V26" stroke="#a8650c" stroke-width="2"/><path d="M38 9a10 10 0 1 0 2 17a8 8 0 1 1 -2 -17z" fill="${gold}" stroke="#a8650c" stroke-width="1.4"/>`;
    else if(id === 'mahkota') s = base + `<path d="M20 36L22 20L27 28L32 15L37 28L42 20L44 36Z" fill="${gold}" stroke="#a8650c" stroke-width="1.6"/><circle cx="32" cy="30" r="2.6" fill="#e8483f"/><circle cx="25" cy="32" r="1.8" fill="#35b5a5"/><circle cx="39" cy="32" r="1.8" fill="#35b5a5"/>`;
    else s = base + `<path d="M32 38V30" stroke="#a8650c" stroke-width="2"/><path d="M32 12Q42 24 38 32H26Q22 24 32 12Z" fill="${gold}" stroke="#a8650c" stroke-width="1.6"/><path d="M29 20q2-3 4-4" stroke="#fff" stroke-width="1.6" fill="none"/>`;
  } else if(cat === 'menara'){
    if(id === 'ramping') s = `<path d="M27 60L28 22H36L37 60Z" fill="#fffaf0" stroke="${O}" stroke-width="1.6"/><rect x="24" y="20" width="16" height="4" rx="1.5" fill="${trim}" stroke="${O}" stroke-width="1.4"/><path d="M26 20L32 9L38 20Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/><circle cx="32" cy="8" r="2" fill="${gold}"/><path d="M30 60v-6a2 2 0 0 1 4 0v6z" fill="${wood}"/><path d="M32 30v4M32 40v4" stroke="${trim}" stroke-width="2"/>`;
    else s = `<path d="M22 60L24 26H40L42 60Z" fill="${brick}" stroke="${O}" stroke-width="1.6"/><path d="M23 36H41M23 46H41" stroke="${brd}" stroke-width="2"/><rect x="21" y="24" width="22" height="3" fill="${brd}"/><path d="M24 24V17M40 24V17M32 24V17" stroke="${wood}" stroke-width="2"/><path d="M19 18L26 11H38L45 18Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/><path d="M27 11L32 5L37 11Z" fill="${roof}" stroke="${O}" stroke-width="1.4"/><circle cx="29" cy="41" r="1.8" fill="#fff"/><circle cx="35" cy="51" r="1.8" fill="#fff"/><path d="M30 60v-6a2 2 0 0 1 4 0v6z" fill="#4a2414"/>`;
  } else if(cat === 'gate'){
    if(id === 'sederhana') s = `<rect x="14" y="26" width="9" height="34" fill="#fffaf0" stroke="${O}" stroke-width="1.6"/><rect x="41" y="26" width="9" height="34" fill="#fffaf0" stroke="${O}" stroke-width="1.6"/><path d="M14 28Q32 12 50 28" stroke="${trim}" stroke-width="4" fill="none"/><circle cx="32" cy="17" r="2.6" fill="${gold}" stroke="#a8650c" stroke-width="1.2"/><rect x="12" y="24" width="13" height="3" fill="${trim}"/><rect x="39" y="24" width="13" height="3" fill="${trim}"/>`;
    else if(id === 'paduraksa') s = `<path d="M10 60V30H54V60H40V40H24V60Z" fill="${brick}" stroke="${O}" stroke-width="1.6"/><path d="M24 60V42H40V60" fill="#8a5530"/><path d="M32 42V60" stroke="${wood}" stroke-width="1.4"/><path d="M8 30L18 20H46L56 30Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/><path d="M20 20L32 9L44 20Z" fill="${roof}" stroke="${O}" stroke-width="1.6"/><circle cx="32" cy="7" r="2" fill="${gold}"/><path d="M12 38H22M42 38H52M12 48H22M42 48H52" stroke="${brd}" stroke-width="1.4"/>`;
    else { const half = `<path d="M8 60V40H12V30H16V22H20V14H25V60Z" fill="${brick}" stroke="${O}" stroke-width="1.6"/><path d="M12 40H8M16 30H12M20 22H16" stroke="#e08d68" stroke-width="1.6"/>`;
      s = half + `<g transform="translate(64 0) scale(-1 1)">${half}</g>`; }
  } else if(cat === 'lantern'){
    const pole = `<path d="M32 60V36" stroke="${wood}" stroke-width="3"/><rect x="25" y="57" width="14" height="3" rx="1.5" fill="${wood}"/>`;
    if(id === 'bambu') s = pole + `<rect x="26" y="14" width="12" height="22" rx="3" fill="#c9b25a" stroke="${O}" stroke-width="1.6"/><path d="M26 22H38M26 29H38" stroke="#8a7a2a" stroke-width="1.4"/><ellipse cx="32" cy="14" rx="5" ry="2" fill="#ffd45a"/><path d="M32 12q-2-4 0-7q2 3 0 7z" fill="#ff9a3c"/>`;
    else if(id === 'gantung') s = `<path d="M32 4V14" stroke="${O}" stroke-width="1.6"/><path d="M22 22L32 14L42 22Z" fill="#d9a028" stroke="${O}" stroke-width="1.6"/><path d="M23 22H41L38 40H26Z" fill="#ffe08a" stroke="${O}" stroke-width="1.6"/><path d="M28 24V38M32 24V38M36 24V38" stroke="#c47a0c" stroke-width="1.2"/><path d="M25 40H39L35 46H29Z" fill="#d9a028" stroke="${O}" stroke-width="1.4"/><circle cx="32" cy="31" r="10" fill="#fff3a6" opacity=".25"/>`;
    else if(id === 'lampion') s = `<path d="M32 4V14" stroke="${O}" stroke-width="1.6"/><rect x="27" y="13" width="10" height="4" rx="1.5" fill="${gold}"/><ellipse cx="32" cy="30" rx="13" ry="13" fill="#e8483f" stroke="${O}" stroke-width="1.6"/><path d="M32 17V43M24 19Q20 30 24 41M40 19Q44 30 40 41" stroke="#a82a22" stroke-width="1.4" fill="none"/><rect x="27" y="43" width="10" height="4" rx="1.5" fill="${gold}"/><path d="M32 47V56" stroke="${gold}" stroke-width="2"/><path d="M26 25q2-4 6-5" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/>`;
    else s = pole + `<path d="M24 16H40L38 36H26Z" fill="#fff3d0" stroke="${O}" stroke-width="1.6"/><path d="M24 16L32 10L40 16Z" fill="${roof}" stroke="${O}" stroke-width="1.4"/><path d="M28 18V34M36 18V34" stroke="#e0b86a" stroke-width="1.2"/><ellipse cx="32" cy="27" rx="4" ry="6" fill="#ffc83d" opacity=".9"/>`;
  }
  return `<svg viewBox="0 0 64 64" class="dthumb" aria-hidden="true">${s}</svg>`;
}
// colour swatches: a little textured disc (shingle rows for roofs, plaster for walls, a patterned band for trim, carpet rows)
function swatch(cat, hex){
  const d = shade(hex, -.28), l = shade(hex, .35);
  let pat = '';
  if(cat === 'roof') pat = `<path d="M8 22H56M6 32H58M8 42H56" stroke="${d}" stroke-width="2.4"/><path d="M16 22v10M30 22v10M44 22v10M23 32v10M37 32v10M51 32v10" stroke="${d}" stroke-width="1.6"/>`;
  else if(cat === 'trim') pat = `<path d="M8 32l8-8 8 8-8 8zM24 32l8-8 8 8-8 8zM40 32l8-8 8 8-8 8z" fill="${l}" stroke="${d}" stroke-width="1.4"/>`;
  else if(cat === 'floor') pat = `<path d="M10 20H54M10 44H54" stroke="${l}" stroke-width="2.6"/><path d="M20 32l6-6 6 6-6 6zM32 32l6-6 6 6-6 6z" fill="none" stroke="${l}" stroke-width="1.6"/>`;
  else pat = `<circle cx="22" cy="26" r="2" fill="${d}" opacity=".35"/><circle cx="40" cy="38" r="2.4" fill="${d}" opacity=".3"/><circle cx="34" cy="22" r="1.5" fill="${d}" opacity=".3"/>`;
  return `<svg viewBox="0 0 64 64" class="dthumb" aria-hidden="true"><defs><clipPath id="dsc"><circle cx="32" cy="32" r="25"/></clipPath></defs><circle cx="32" cy="32" r="25" fill="${hex}"/><g clip-path="url(#dsc)">${pat}</g><circle cx="32" cy="32" r="25" fill="none" stroke="${O}" stroke-width="2.4"/><path d="M17 22a18 18 0 0 1 10-8" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/></svg>`;
}

export function createDesign(U){
  const { ctx, S, L, ic } = U;
  const T = (k, v) => { let s = L(TX[k] || [k,k]); if(v) for(const a in v) s = s.replace('{' + a + '}', v[a]); return s; };
  const C = () => ctx.modules.custom || ctx.modules.progress?.custom;
  const safe = (f, d) => { try{ const r = f(); return r === undefined ? d : r; }catch(e){ console.warn('design', e); return d; } };
  let cat = null;
  const order = () => C()?.ORDER || [];
  const stage = () => { const m = ctx.modules.masjid; return m && typeof m.stage === 'number' ? m.stage : (S.masjid?.stage | 0); };
  const built = c => { const cu = C(); if(cu?.isBuilt) return !!safe(() => cu.isBuilt(c), true); return stage() >= ((cu?.STAGE_OF || STAGE_FALLBACK)[c] ?? 0); };
  const level = () => safe(() => ctx.modules.progress.level(), 1);
  function colours(){ const cu = C(), cur = safe(() => cu.current, null) || S.masjid?.custom || {}, sw = (k) => cu?.CATALOG?.[k]?.options.find(o => o.id === cur[k])?.swatch;
    return { roof:sw('roof'), wall:sw('wall'), trim:sw('trim') }; }
  function open(c){ const cu = C(); if(!cu) return; cat = cu.CATALOG?.[c] ? c : (cat && cu.CATALOG?.[cat] ? cat : order()[0]); safe(() => cu.open(cat)); ctx.emit('design:open', { cat }); }
  function close(){ const cu = C(); if(cu) safe(() => cu.close()); ctx.emit('design:close', { cat }); }
  function html(){
    const cu = C(); if(!cu?.CATALOG) return `<div class="hempty">${ic('palette')}<span>${T('none')}</span></div>`;
    if(!cat || !cu.CATALOG[cat]) cat = order()[0];
    const opts = safe(() => cu.options(cat), []), col = colours();
    const pv = opts.find(o => o.previewing) || opts.find(o => o.selected) || opts[0];
    const tabsH = `<div class="dtabw"><button class="dscr l" data-dscr="-1" aria-label="${T('more')}">${ic('chev','back')}</button><div class="dtabs">${order().map(c => { const K = cu.CATALOG[c]; return `<button data-dcat="${c}" class="${c === cat ? 'on' : ''} ${built(c) ? '' : 'nb'}" aria-label="${L(K.name)}">${ic(K.icon)}<span>${L(K.name)}</span></button>`; }).join('')}</div><button class="dscr r" data-dscr="1" aria-label="${T('more')}">${ic('chev','chevr')}</button></div>`;
    const note = built(cat) ? `<div class="dnote">${ic('eye')}<span>${T('pick')}</span></div>` : `<div class="dnote warn">${ic('hammer')}<span>${T('notBuilt')}</span></div>`;
    const optsH = `<div class="dopts">${opts.map(o => { const lk = !o.unlocked && !o.owned;
      const chip = o.selected ? `<span class="dchip use">${ic('check')}${T('inUse')}</span>` : lk ? `<span class="dchip lock">${ic('lock')}${T('lv', { l:o.lv })}</span>` : o.price > 0 && !o.owned ? `<span class="dchip price">${ic('coin')}${o.price}</span>` : `<span class="dchip free">${o.price > 0 ? T('owned') : T('free')}</span>`;
      return `<button class="dopt ${o.selected ? 'sel' : ''} ${o === pv ? 'pv' : ''} ${lk ? 'lockd' : ''}" data-dopt="${o.id}" aria-label="${L(o.name)}"><span class="dimg">${o.swatch ? swatch(cat, o.swatch) : thumb(cat, o.id, col)}${lk ? `<span class="dlock">${ic('lock')}</span>` : ''}</span><b>${L(o.name)}</b>${chip}</button>`; }).join('')}</div>`;
    // primary action for the option being previewed
    let act = '';
    if(pv){ const lk = !pv.unlocked && !pv.owned;
      if(pv.selected) act = `<button class="btn cl off" disabled>${ic('check')}${T('inUse')}</button>`;
      else if(lk) act = `<button class="btn cl lockb" data-dlock="${pv.lv}">${ic('lock')}<span class="lkt"><b>${T('unlockAt', { l:pv.lv })}</b><small>${T('howLv')}</small></span></button>`;
      else if(pv.owned || !(pv.price > 0)) act = `<button class="btn teal" data-dcommit="${pv.id}">${ic('check')}${T('use')}</button>`;
      else act = `<button class="btn gold ${S.coins >= pv.price ? '' : 'poor'}" data-dcommit="${pv.id}">${T('buyUse')} <span class="price">${ic('coin')}${pv.price}</span></button>`; }
    const dirty = opts.some(o => o.previewing && !o.selected);
    return tabsH + note + optsH + `<div class="dact"><button class="btn cl ${dirty ? '' : 'off'}" data-dcancel>${ic('close')}${T('cancel')}</button>${act}</div>`;
  }
  function bind(modal){
    const cu = C(); if(!cu) return;
    const on = (sel, fn) => modal.querySelectorAll(sel).forEach(b => b.onclick = () => fn(b));
    on('[data-dcat]', b => { const c = b.dataset.dcat; if(c === cat) return; if(Object.keys(safe(() => cu.draft, {}) || {}).length) safe(() => cu.revert()); cat = c; safe(() => cu.focus(c)); U.render(); });
    on('[data-dopt]', b => { safe(() => cu.preview(cat, b.dataset.dopt)); U.sfx('pop'); U.render(); });
    // category strip: chevrons scroll it, the edge fades show there is more; the active tab is kept in view
    const strip = modal.querySelector('.dtabs'), wrap = modal.querySelector('.dtabw');
    const edges = () => { if(!strip || !wrap) return; const m = strip.scrollWidth - strip.clientWidth; wrap.classList.toggle('fl', strip.scrollLeft > 4); wrap.classList.toggle('fr', strip.scrollLeft < m - 4); };
    if(strip){ const a = strip.querySelector('button.on'); if(a){ const l = a.offsetLeft - strip.clientWidth / 2 + a.offsetWidth / 2; strip.style.scrollBehavior = 'auto'; strip.scrollLeft = Math.max(0, l); strip.style.scrollBehavior = ''; }
      strip.addEventListener('scroll', edges, { passive:true }); requestAnimationFrame(edges); edges(); }
    on('[data-dscr]', b => { if(strip) strip.scrollBy({ left:(+b.dataset.dscr) * strip.clientWidth * .7, behavior:'smooth' }); });
    on('[data-dcancel]', () => { safe(() => cu.revert()); U.render(); });
    on('[data-dlock]', b => { U.toast(T('lockedMsg', { l:b.dataset.dlock }), 'lock'); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); });
    on('[data-dcommit]', b => { const r = safe(() => cu.commit(cat, b.dataset.dcommit), null); if(!r) return;
      if(r.ok){ U.toast(r.bought ? T('bought') : T('done'), r.bought ? 'coin' : 'palette', 'good'); U.render(); }
      else if(r.reason === 'coins'){ U.toast(T('noCoins'), 'coin', 'bad'); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); }
      else if(r.reason === 'level'){ const o = safe(() => cu.options(cat), []).find(x => x.id === b.dataset.dcommit); U.toast(T('lockedMsg', { l:o?.lv ?? '?' }), 'lock'); } });
  }
  // ---------- live-preview framing around the sheet ----------
  // The sheet covers the bottom ~46% (portrait) or the right side (landscape). We shift the projection centre into the
  // free part of the screen (camera.setViewOffset) and, on narrow screens, widen the view so the subject (walls+porch,
  // roof, gate...) fits there. Eased in/out; cleared when the sheet closes. A characters-side inset API wins if present.
  const vo = { x:0, y:0, z:1, on:false, inset:null };
  function inset(){
    const sh = document.querySelector('#modal.clear .sheet.dsheet'); if(!sh) return null;
    const r = sh.getBoundingClientRect(), W = innerWidth, H = innerHeight; if(!r.width || !r.height) return null;
    const bottom = r.top > H * .3 && r.width > W * .7 ? Math.max(0, H - r.top) : 0, right = !bottom && r.left > W * .3 ? Math.max(0, W - r.left) : 0;
    return { top:0, left:0, bottom, right };
  }
  function viewport(dt){
    const cam = ctx.camera; if(!cam?.setViewOffset) return;
    const open = U.panel() === 'design';
    const ins = open ? inset() : null; vo.inset = ins;
    const Ch = ctx.modules.characters;
    if(Ch?.setViewInset){ safe(() => Ch.setViewInset(ins)); return; }
    const cv = ctx.renderer?.domElement, W = cv?.clientWidth || innerWidth, H = cv?.clientHeight || innerHeight;
    let tx = 0, ty = 0, tz = 1;
    if(ins){
      const rw = W - ins.right, rh = H - ins.bottom;
      // narrow free area: zoom out so roughly a 1:1 field of view fits across it
      tz = Math.max(1, Math.min(2.3, (H / Math.max(1, rw)) * (ins.bottom ? .95 : .8)));
      tx = rw / 2 / W; ty = rh * .52 / H;                         // normalised screen point for the orbit target
    } else { tx = .5; ty = .5; }
    if(!vo.on && !ins) return;
    if(!vo.on){ vo.on = true; vo.x = .5; vo.y = .5; vo.z = 1; }
    const k = 1 - Math.exp(-7 * Math.min(.25, dt || .016));
    vo.x += (tx - vo.x) * k; vo.y += (ty - vo.y) * k; vo.z += (tz - vo.z) * k;
    if(!ins && Math.abs(vo.x - .5) < .002 && Math.abs(vo.y - .5) < .002 && Math.abs(vo.z - 1) < .003){ vo.on = false; cam.clearViewOffset(); return; }
    // vo.x/vo.y: where (as a fraction of the screen) the orbit target lands; vo.z: field-of-view scale
    const w = W * vo.z, h = H * vo.z, ox = W / 2 - vo.x * W * vo.z, oy = H / 2 - vo.y * H * vo.z;
    cam.setViewOffset(W, H, ox, oy, w, h);
  }
  const entryHTML = () => `<button class="dentry clay gold" data-design>${ic('palette')}<span><b>${T('entry')}</b><small>${T('entrySub')}</small></span>${ic('chev','chevr')}</button>`;
  return { html, bind, open, close, entryHTML, viewport, get inset(){ return vo.inset; }, get cat(){ return cat; }, set cat(c){ cat = c; }, ribbon:TX.title };
}

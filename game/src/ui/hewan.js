// "Hewanku" (My Animals) roster panel: painted portraits, kind/breed, weight, age/growth, need bars, sick/sleep
// badges and the Idul Adha star forecast. Bars refresh in place every second (scroll is kept); tapping a card opens
// a detail view with "Lihat" (camera focus) and "Datangi" (auto-walk). Data: animals.roster()/get()/portrait().
const TX = {
  title:['Hewanku','My Animals'], all:['Semua','All'], goat:['Kambing','Goats'], sheep:['Domba','Sheep'], cow:['Sapi','Cows'], care:['Perlu Dirawat','Needs Care'],
  sort:['Urutkan','Sort'], sCare:['Perhatian','Attention'], sName:['Nama','Name'], sW:['Berat','Weight'], sKind:['Jenis','Kind'],
  hunger:['Makan','Food'], thirst:['Minum','Water'], clean:['Bersih','Clean'], happy:['Senang','Happy'],
  sick:['Sakit','Unwell'], sleep:['Tidur','Asleep'], kid:['Anak','Young'], adult:['Dewasa','Adult'], male:['Jantan','Male'], female:['Betina','Female'],
  eid:['Perkiraan Idul Adha','Eid forecast'], young:['Masih kecil, ikut tahun depan','Still young, stays for next year'],
  look:['Lihat','Look'], go:['Datangi','Go to'], back:['Kembali','Back'], count:['{n}/{m} ekor','{n}/{m} animals'],
  empty:['Belum ada hewan. Beli di Toko, yuk!','No animals yet. Visit the Shop!'], none:['Tidak ada hewan di sini','No animals here'],
  allGood:['Semua sehat & senang','Everyone is healthy & happy'], needs:['{n} perlu dirawat','{n} need care'],
  nextStar:['Bintang berikutnya {p}%','Next star {p}%'], fullStar:['Bintang penuh!','All stars!'], starHow:['Rawat & beri makan supaya bintangnya bertambah','Feed and care for it to grow its stars'],
  weight:['Berat','Weight'], growth:['Tumbuh','Growth'], target:['target {w} kg','goal {w} kg'], kindL:['Jenis','Kind'],
  needHunger:['Sedang lapar, beri jerami','Hungry: bring some hay'], needThirst:['Sedang haus, beri air','Thirsty: bring water'],
  needClean:['Perlu dimandikan','Needs a bath'], needHappy:['Ingin diajak main','Wants some attention'], needSick:['Sedang sakit, rawat dengan sabar','Feeling unwell: care for it gently'], needNone:['Sehat dan senang','Healthy and happy'],
};
const NEEDS = [['hunger','hay'],['thirst','water'],['clean','soap'],['happy','heart']];
const KORD = { goat:0, sheep:1, cow:2 };
export function createHewan(U){
  const { ctx, S, L, ic } = U;
  const T = (k, v) => { let s = L(TX[k] || [k,k]); if(v) for(const a in v) s = s.replace('{' + a + '}', v[a]); return s; };
  const A = () => ctx.modules.animals, P = () => ctx.modules.progress;
  const safe = (f, d) => { try{ const r = f(); return r === undefined ? d : r; }catch(e){ return d; } };
  let filter = 'all', sort = 'care', detail = null, sig = '';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const roster = () => { const a = A(); return a?.roster ? safe(() => a.roster(), []) : []; };
  const urgency = r => r.sick ? -1 : Math.min(r.stats.hunger, r.stats.thirst, r.stats.clean, r.stats.happy);
  const kindName = r => L(r.kindName || A()?.KIND_NAMES?.[r.kind] || [r.kind, r.kind]);
  const grade = r => { const a = safe(() => A().get(r.id), null); return a ? safe(() => P()?.gradeAnimal?.(a), null) : null; };
  const lvCls = v => v >= .6 ? 'g' : v >= .3 ? 'm' : 'l';
  // fractional forecast: the next star fills up as care and weight improve (thresholds mirror progress.gradeAnimal)
  const nextP = g => { if(!g) return 0; const q = +g.q || 0; if(g.stars >= 3) return 1;
    const [a, b] = g.stars >= 2 ? [.55, .78] : [.3, .55]; return Math.max(0, Math.min(.95, (q - a) / (b - a))); };
  const stars = (n, p = 0) => { const pp = Math.round(p * 20) * 5;
    return `<span class="hstars" aria-label="${n}/3">${[1,2,3].map(i => { const f = i <= n ? 100 : i === n + 1 ? pp : 0;
      return `<span class="hst"><svg class="ic"><use href="#i-star"/></svg>${f ? `<span class="hsf" style="width:${f}%"><svg class="ic on"><use href="#i-star"/></svg></span>` : ''}</span>`; }).join('')}</span>`; };
  function list(){
    let r = roster();
    if(filter === 'goat' || filter === 'sheep' || filter === 'cow') r = r.filter(x => x.kind === filter);
    else if(filter === 'care') r = r.filter(x => x.need || x.sick);
    const by = { care:(a,b) => urgency(a) - urgency(b), name:(a,b) => String(a.name).localeCompare(String(b.name)), weight:(a,b) => b.weight - a.weight,
      kind:(a,b) => (KORD[a.kind] ?? 9) - (KORD[b.kind] ?? 9) || String(a.name).localeCompare(String(b.name)) }[sort];
    return r.slice().sort(by);
  }
  const bars = (r, big) => `<div class="hbars ${big ? 'big' : ''}">${NEEDS.map(([n,i]) => { const v = r.stats[n] ?? 0;
    return `<div class="nb ${lvCls(v)}" data-n="${n}" title="${T(n)}">${ic(i)}<small>${T(n)}</small><i><b style="width:${Math.round(v*100)}%"></b></i>${big ? `<em>${Math.round(v*100)}%</em>` : ''}</div>`; }).join('')}</div>`;
  const ageChip = r => r.baby ? `<span class="hage kid">${ic('baby')}${T('kid')} <span data-f="grow">${Math.round(r.growth*100)}%</span><i><b data-f="growbar" style="width:${Math.round(r.growth*100)}%"></b></i></span>` : `<span class="hage">${T('adult')}</span>`;
  const badges = r => `<span class="hbadges" data-f="badges">${r.sick ? `<span class="hb2 sick">${ic('sick')}${T('sick')}</span>` : ''}${r.sleeping ? `<span class="hb2 zz">${ic('zzz')}${T('sleep')}</span>` : ''}</span>`;
  const eidHTML = r => { if(r.baby) return `<span class="heid young">${ic('baby')}${T('young')}</span>`; const g = grade(r);
    const n = g?.stars || 1, p = nextP(g);
    return `<span class="heid" title="${T('eid')}">${ic('crescent')}<small>${T('eid')}</small>${stars(n, n < 3 ? p : 0)}<em class="hnext">${n >= 3 ? T('fullStar') : Math.round(p * 20) * 5 + '%'}</em></span>`; };
  const portrait = (r, size) => { const u = safe(() => A().portrait(r.id, { size }), ''); return u ? `<img src="${u}" alt="" draggable="false">` : ic(r.kind === 'cow' ? 'cow' : 'goat'); };
  function cardHTML(r){
    return `<button class="hcard ${r.need ? 'needy n-' + r.need : ''}" data-aid="${r.id}" style="--col:${esc(r.collar)}">
      <span class="hpor">${portrait(r, 128)}</span>
      <span class="hmain">
        <span class="hname"><b>${esc(r.name)}</b><span class="hsex">${T(r.male ? 'male' : 'female')}</span>${badges(r)}</span>
        <span class="hkind">${kindName(r)} · ${L(r.breedName || [r.breed, r.breed])}</span>
        <span class="hmeta"><span class="hkg">${ic('scale')}<b data-f="kg">${(+r.weight).toFixed(1)}</b> kg</span>${ageChip(r)}</span>
        ${bars(r)}
        <span class="hfoot" data-f="eid">${eidHTML(r)}</span>
      </span></button>`;
  }
  function detailHTML(r){
    const g = r.baby ? null : grade(r), nd = r.sick ? 'needSick' : r.need ? 'need' + r.need[0].toUpperCase() + r.need.slice(1) : 'needNone';
    return `<div class="hdet" data-aid="${r.id}" style="--col:${esc(r.collar)}">
      <button class="btn cl hback" data-hback>${ic('chev','back')}${T('back')}</button>
      <div class="hdtop"><span class="hpor big">${portrait(r, 256)}</span>
        <div class="hdinfo"><h3>${esc(r.name)}</h3><div class="hkind">${kindName(r)} · ${L(r.breedName || [r.breed, r.breed])} · ${T(r.male ? 'male' : 'female')}</div>
          <div class="hstatus ${r.need ? 'warn' : 'ok'}" data-f="status">${ic(r.sick ? 'sick' : r.need ? ({hunger:'hay',thirst:'water',clean:'soap',happy:'heart'}[r.need]) : 'heart')}<span>${T(nd)}</span></div>
          ${badges(r)}</div></div>
      <div class="hdgrid">
        <div class="hdbox">${ic('scale')}<div><small>${T('weight')}</small><b><span data-f="kg">${(+r.weight).toFixed(1)}</span> kg</b><div class="prog"><i data-f="wbar" style="width:${Math.min(100, r.weight / (r.wMax || 1) * 100)}%"></i></div><small>${T('target', { w:Math.round(r.wMax || 0) })}</small></div></div>
        <div class="hdbox">${ic(r.baby ? 'baby' : 'star')}<div><small>${T('growth')}</small><b>${r.baby ? T('kid') + ' ' + `<span data-f="grow">${Math.round(r.growth*100)}%</span>` : T('adult')}</b>${r.baby ? `<div class="prog"><i data-f="growbar" style="width:${Math.round(r.growth*100)}%"></i></div>` : ''}</div></div>
      </div>
      ${bars(r, true)}
      <div class="hdeid">${r.baby ? `${ic('baby')}<span>${T('young')}</span>` : `${ic('crescent')}<span>${T('eid')}</span>${stars(g?.stars || 1, (g?.stars || 1) < 3 ? nextP(g) : 0)}<small class="hnext">${(g?.stars || 1) >= 3 ? T('fullStar') : T('nextStar', { p:Math.round(nextP(g) * 20) * 5 }) + ' · ' + T('starHow')}</small>`}</div>
      <div class="btnrow"><button class="btn gold" data-hlook>${ic('eye')}${T('look')}</button><button class="btn teal" data-hgo>${ic('walk')}${T('go')}</button></div></div>`;
  }
  function html(){
    const ro = roster(), A0 = A();
    if(!A0?.roster) return `<div class="hempty">${ic('paw')}<span>${T('empty')}</span></div>`;
    if(detail != null){ const r = ro.find(x => x.id === detail); if(r) return detailHTML(r); detail = null; }
    const max = A0.maxAnimals ?? ro.length, nNeed = ro.filter(r => r.need).length;
    const chips = [['all','all','paw'],['goat','goat','goat'],['sheep','sheep','goat'],['cow','cow','cow'],['care','care','heart']];
    const items = list(); sig = ro.map(r => r.id + (r.baby ? 'b' : '')).join(',') + '|' + filter + sort + S.lang;
    return `<div class="hhead"><span class="hcount">${ic('paw')}<b>${T('count', { n:ro.length, m:max })}</b></span><span class="hsum ${nNeed ? 'warn' : ''}">${ic(nNeed ? 'heart' : 'check')}${nNeed ? T('needs', { n:nNeed }) : T('allGood')}</span></div>
      <div class="hfilt">${chips.map(([id,k,i]) => `<button data-hf="${id}" class="${filter === id ? 'on' : ''}">${ic(i)}<span>${T(k)}</span>${id === 'care' && nNeed ? `<em>${nNeed}</em>` : ''}</button>`).join('')}</div>
      <div class="hsort"><span>${ic('sort')}</span><div class="seg">${[['care','sCare'],['name','sName'],['weight','sW'],['kind','sKind']].map(([id,k]) => `<button data-hs="${id}" class="${sort === id ? 'on' : ''}">${T(k)}</button>`).join('')}</div></div>
      <div class="hlist">${items.length ? items.map(cardHTML).join('') : `<div class="hempty">${ic('paw')}<span>${ro.length ? T('none') : T('empty')}</span></div>`}</div>`;
  }
  function bind(modal){
    const on = (sel, fn) => modal.querySelectorAll(sel).forEach(b => b.onclick = e => fn(b, e));
    on('[data-hf]', b => { filter = b.dataset.hf; U.render(); });
    on('[data-hs]', b => { sort = b.dataset.hs; U.render(); });
    on('.hcard', b => { detail = +b.dataset.aid; U.render(true); });
    on('[data-hback]', () => { detail = null; U.render(true); });
    on('[data-hlook]', () => look(detail));
    on('[data-hgo]', () => goTo(detail));
  }
  const live = id => safe(() => A().get(id), null);
  function look(id){
    const a = live(id); if(!a) return; U.closePanel();
    const C = ctx.modules.characters;
    safe(() => C?.focusCamera?.(a.pos, { dist:7, pitch:.55, dur:4, follow:true }));
    safe(() => A().highlight?.(id, 4));
    U.showGo(T('go') + ' ' + (a.name || ''), () => goTo(id, true), 6);
  }
  function goTo(id, already){
    const a = live(id); if(!a) return; if(!already) U.closePanel();
    safe(() => A().highlight?.(id, 4));
    U.walkGuide(() => ctx.modules.characters?.walkTo?.(a.pos, { follow:true, r:1.6 }));
  }
  // in-place refresh: bars, weight, growth, badges, eid stars. Full re-render only when the set of animals changes.
  function tick(modal){
    const ro = roster(); const s = ro.map(r => r.id + (r.baby ? 'b' : '')).join(',') + '|' + filter + sort + S.lang;
    if(detail == null && s !== sig){ U.render(); return; }
    for(const r of ro){
      const root = modal.querySelector(`[data-aid="${r.id}"]`); if(!root) continue;
      for(const [n] of NEEDS){ const nb = root.querySelector(`.nb[data-n="${n}"]`); if(!nb) continue; const v = r.stats[n] ?? 0;
        nb.className = 'nb ' + lvCls(v); nb.querySelector('b').style.width = Math.round(v*100) + '%'; const em = nb.querySelector('em'); if(em) em.textContent = Math.round(v*100) + '%'; }
      root.querySelectorAll('[data-f="kg"]').forEach(n => n.textContent = (+r.weight).toFixed(1));
      root.querySelectorAll('[data-f="grow"]').forEach(n => n.textContent = Math.round(r.growth*100) + '%');
      root.querySelectorAll('[data-f="growbar"]').forEach(n => n.style.width = Math.round(r.growth*100) + '%');
      root.querySelectorAll('[data-f="wbar"]').forEach(n => n.style.width = Math.min(100, r.weight / (r.wMax || 1) * 100) + '%');
      const bd = root.querySelector('[data-f="badges"]'); if(bd){ const h = badges(r); if(bd.outerHTML !== h) bd.outerHTML = h; }
      if(root.classList.contains('hcard')){ root.className = 'hcard ' + (r.need ? 'needy n-' + r.need : ''); const ef = root.querySelector('[data-f="eid"]'); if(ef){ const h = eidHTML(r); if(ef.innerHTML !== h) ef.innerHTML = h; } }
    }
  }
  return { html, bind, tick, open(id){ detail = id != null && live(id) ? +(live(id).id) : null; }, reset(){ detail = null; }, get detail(){ return detail; }, T, ribbon:TX.title };
}

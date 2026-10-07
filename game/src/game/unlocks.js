// GRADUAL FEATURE UNLOCKS ("berlevel"): the game opens up one gentle activity at a time, Animal Crossing style.
// Day 1 is just the animals (hay + water) and the first build stage; sweeping, washing, the shop, the adzan, mopping,
// leading the prayer, decorating and Desain Masjid arrive over the first days / stages / Berkah levels.
// Unlocked features are stored in ctx.state.unlocks (id -> day unlocked) and are never taken away again.
// Older saves are migrated silently: everything their progress already reached (or used) is simply there.
// API (ctx.modules.unlocks): isUnlocked(id), list(), tools(), check(), FEATURES; events: 'unlock:new' {id, ...feature}.

// always on (the starting loop)
export const BASE = ['pen', 'build', 'tugas', 'hewan'];
// order matters: features that unlock together are announced (one card at a time) in this order
export const FEATURES = [
  { id:'sapu',   icon:'broom',   when:c => c.stage >= 1 || c.day >= 2, used:['swept','piles'],
    name:['Menyapu masjid','Sweeping the masjid'], how:['Pilih Sapu di bawah, dekati daun atau debu, lalu tekan Aksi.','Pick the Broom below, walk to leaves or dust and press Action.'] },
  { id:'wash',   icon:'soap',    when:c => c.stage >= 1 || c.day >= 2, used:['washed','treats'],
    name:['Memandikan hewan','Washing the animals'], how:['Pilih Sabun, dekati hewan yang kotor, lalu tekan Aksi. Camilan juga sudah ada!','Pick Soap, walk to a muddy animal and press Action. Treats are here too!'] },
  { id:'shop',   icon:'bag',     when:c => c.stage >= 1 || c.day >= 2, used:['bought'],
    name:['Toko','The Shop'], how:['Buka Menu lalu Toko untuk membeli jerami, air, dan hewan baru.','Open the Menu, then Shop for hay, water and new animals.'] },
  { id:'adzan',  icon:'adzan',   when:c => c.stage >= 2 || c.day >= 3, used:['adzan','bedug','tanda','prayers'],
    name:['Waktu salat & adzan','Prayer times & adzan'], how:['Saat waktu salat tiba, datangi mikrofon atau menara, lalu tekan Aksi.','When a prayer time comes, go to the mic or minaret and press Action.'] },
  { id:'pel',    icon:'mop',     when:c => c.stage >= 2 || c.day >= 3, used:['mopped'],
    name:['Mengepel lantai','Mopping the floor'], how:['Pilih Pel untuk membersihkan lumpur dan jejak kaki di lantai.','Pick the Mop to clean mud and footprints off the floor.'] },
  { id:'imam',   icon:'imam',    when:(c, on) => on('adzan') && (c.stage >= 3 || c.lv >= 2), used:['imam'],
    name:['Menjadi imam','Leading the prayer'], how:['Setelah adzan dan jamaah berkumpul, berdiri di mihrab lalu tekan Aksi.','After the adzan, when the jamaah gather, stand at the mihrab and press Action.'] },
  { id:'decor',  icon:'lamp',    when:c => c.lv >= 3, used:['decorPlaced','masjidDecor'],
    name:['Menghias masjid','Decorating the masjid'], how:['Beli hiasan di Toko, lalu pasang di masjid atau plaza.','Buy decorations in the Shop, then place them in the masjid or plaza.'] },
  { id:'book',   icon:'book',    when:c => c.lv >= 3, used:[],
    name:['Buku Stiker','Sticker Book'], how:['Kumpulkan stiker dari kegiatanmu. Lihat di Menu, Buku Stiker.','Collect stickers as you play. Find them in Menu, Sticker Book.'] },
  { id:'design', icon:'palette', when:c => c.lv >= 4 || c.stage >= 4, used:['designed'],
    name:['Desain Masjid','Masjid Design'], how:['Pilih warna atap, dinding, dan menara di Menu, Desain Masjid.','Choose roof, wall and minaret styles in Menu, Masjid Design.'] },
];
const BY_ID = Object.fromEntries(FEATURES.map(f => [f.id, f]));
// hotbar entries and what they need
export const TOOL_NEED = { hay:'pen', water:'pen', soap:'wash', treat:'wash', sapu:'sapu', pel:'pel' };
// quest id -> feature it needs (quests not listed only need the base loop)
export const QUEST_NEED = { wash:'wash', washcow:'wash', treat:'wash', buy:'shop', decor:'decor', pray:'adzan', bedug:'adzan',
  sweep:'sapu', pile:'sapu', clean:'sapu', mop:'pel', adzan:'adzan', ajak:'adzan', tanda:'adzan', imam:'imam', mdecor:'decor', design:'design' };
// stat (guest requests) -> feature
export const STAT_NEED = { treats:'wash', decorPlaced:'decor', swept:'sapu' };
// a feature's "try it" quest, offered on the first day(s) after it arrives
export const INTRO_QUEST = { sapu:'sweep', wash:'wash', adzan:'adzan', pel:'mop', imam:'imam', decor:'decor', design:'design' };

export function createUnlocks(ctx, { level, stage }){
  const S = ctx.state, Q = new URLSearchParams(location.search);
  if(!S.unlocks || typeof S.unlocks !== 'object' || Array.isArray(S.unlocks)) S.unlocks = {};
  const U = S.unlocks;
  // test override (?unlock=all or ?unlock=sapu,adzan): runtime only, never written to the save
  const qa = (Q.get('unlock') || '').split(',').map(s => s.trim()).filter(Boolean);
  const forceAll = qa.includes('all'), forced = new Set(qa);
  const isUnlocked = id => BASE.includes(id) || forceAll || forced.has(id) || !!U[id];
  const snap = () => ({ day:S.day | 0, stage:stage() | 0, lv:level() | 0 });
  function evidence(f){ // something the player already did with this feature (old saves)
    const st = S.stats || {};
    if(f.used.some(k => (st[k] | 0) > 0)) return true;
    if(f.id === 'book') return Object.keys(S.stickers || {}).length >= 3;
    if(f.id === 'decor') return (S.decor?.placed?.length | 0) > 0 || Object.values(S.decor?.owned || {}).some(n => n > 0);
    if(f.id === 'design') return Object.keys(S.masjid?.owned || {}).length > 0;
    return false;
  }
  // migration: a save without the unlock record gets every feature its progress already reached, silently
  const migrate = !U._v;
  function check(silent = false){
    const c = snap(), fresh = [];
    for(const f of FEATURES){
      if(U[f.id]) continue;
      let ok = false; try{ ok = !!f.when(c, isUnlocked); }catch(e){}
      if(!ok && silent && evidence(f)) ok = true;
      if(ok){ U[f.id] = Math.max(1, S.day | 0); fresh.push(f); }
    }
    if(!silent) for(const f of fresh) ctx.emit('unlock:new', { ...f });
    if(fresh.length) ctx.emit('unlock:change', { ids:fresh.map(f => f.id) });
    return fresh;
  }
  if(migrate){ check(true); U._v = 1; }
  // the activities the hotbar may show, in strip order
  const tools = () => ['sapu', 'pel', 'hay', 'water', 'soap', 'treat'].filter(t => isUnlocked(TOOL_NEED[t]));
  const questOk = id => !QUEST_NEED[id] || isUnlocked(QUEST_NEED[id]);
  // features that arrived today or yesterday (newest first) — used to offer a gentle "try it" task
  const recent = () => FEATURES.map((f, i) => [f, i]).filter(([f]) => U[f.id] && (S.day | 0) - U[f.id] <= 1 && (S.day | 0) >= U[f.id])
    .sort((a, b) => (U[b[0].id] - U[a[0].id]) || a[1] - b[1]).map(([f]) => f);
  return {
    FEATURES, BASE, TOOL_NEED, QUEST_NEED, STAT_NEED, INTRO_QUEST,
    isUnlocked, check, tools, questOk, recent, feature:id => BY_ID[id] || null,
    list:() => [...BASE, ...FEATURES.filter(f => isUnlocked(f.id)).map(f => f.id)],
    get forceAll(){ return forceAll; },
  };
}

// Game progression: day cycle, daily events, rotating quest pool, streaks, Berkah levels & unlocks,
// decorations (coin sink), sticker book, Eid climax + new year. Pure logic + decor meshes; the DOM lives in ui/.
// Kid-friendly by design: no real money, no punishing timers — unclaimed quests auto-claim at day end, streaks only add bonuses.
import { createDecor, DECOR_KINDS, SLOTS } from './decor.js';
import { save } from '../state.js';

// pahala needed to reach level i+1 (pahala is never spent, so it is a lifetime total)
export const LEVELS = [0, 40, 100, 180, 300, 450, 650, 900, 1200, 1600];
export const OUTFITS = [
  { id:'klasik', lv:1, name:['Klasik','Classic'],        look:{ koko:0xf8f3e6, sarong:0x2f7d6c, peci:0x1c1c20 } },
  { id:'daun',   lv:2, name:['Hijau Daun','Leaf Green'], look:{ koko:0xe4f5cf, sarong:0x3f8f3a, peci:0x1c1c20 } },
  { id:'laut',   lv:3, name:['Biru Laut','Ocean Blue'],  look:{ koko:0xd9edff, sarong:0x2a5ea8, peci:0x1d2a4a } },
  { id:'emas',   lv:5, name:['Batik Emas','Golden Batik'], look:{ koko:0xfff1c2, sarong:0x9a5a1a, peci:0x3a2410 } },
  { id:'senja',  lv:7, name:['Ungu Senja','Dusk Purple'], look:{ koko:0xf3e6ff, sarong:0x6a3f9a, peci:0x221830 } },
  { id:'putih',  lv:9, name:['Putih Berseri','Radiant White'], look:{ koko:0xffffff, sarong:0xc9a24a, peci:0xf4efe2 } },
];
const SLOT_LV = [[1,3],[3,4],[6,5]];          // [level, quest slots]
const PEN_LV = { 4:1, 8:2 };                  // level -> pen upgrade level
export const WEEKDAYS = [['Senin','Mon'],['Selasa','Tue'],['Rabu','Wed'],['Kamis','Thu'],['Jumat','Fri'],['Sabtu','Sat'],['Ahad','Sun']];

export const EVENTS = {
  cerah: { icon:'sun',    w:3,   name:['Cerah','Sunny'],              desc:['Hari yang cerah dan tenang.','A calm, sunny day.'] },
  panas: { icon:'hot',    w:2,   name:['Panas Terik','Heatwave'],     desc:['Hewan cepat haus. Siapkan air!','Animals get thirsty fast. Bring water!'], force:['water'] },
  hujan: { icon:'rain',   w:2,   name:['Hujan','Rainy Day'],          desc:['Hewan berteduh, tak perlu banyak mandi.','Animals shelter; less washing needed.'], ban:['wash','washcow'] },
  pasar: { icon:'bag',    w:1.5, name:['Hari Pasar','Market Day'],    desc:['Perlengkapan diskon 25% di toko!','Supplies 25% off in the shop!'] },
  tamu:  { icon:'chat',   w:1.5, name:['Tamu Istimewa','Special Guest'], desc:['Pak Ustadz berkunjung dan punya permintaan.','A guest visits with a special request.'], special:true },
  ramai: { icon:'people', w:1,   name:['Jamaah Ramai','Busy Day'],    desc:['Banyak jamaah datang hari ini.','Lots of visitors today.'], force:['vis'], crowd:4 },
  jumat: { icon:'dome',   w:0,   name:['Jumat Berkah','Blessed Friday'], desc:['Hadiah tugas ×1.5 dan jamaah ramai!','Task rewards ×1.5 and lots of visitors!'], force:['vis'], crowd:6, mul:1.5 },
};

// ---- quest pool (16 types). goal(c) and can(c) read a context snapshot; title uses {n}
const clampI = (v,a,b) => Math.max(a, Math.min(b, Math.round(v)));
export const QUESTS = [
  { id:'feed',    cat:'care',  icon:'hay',    stat:'fed',        title:['Beri makan {n} hewan','Feed {n} animals'],            goal:c=>clampI(c.nA*.6,2,6), can:c=>c.nA>0, coins:n=>15+n*4, pahala:5 },
  { id:'water',   cat:'care',  icon:'water',  stat:'watered',    title:['Beri minum {n} hewan','Give water to {n} animals'],    goal:c=>clampI(c.nA*.5,2,5), can:c=>c.nA>0, coins:n=>12+n*4, pahala:4 },
  { id:'wash',    cat:'care',  icon:'soap',   stat:'washed',     title:['Mandikan {n} hewan','Wash {n} animals'],               goal:c=>clampI(c.nA*.3,1,3), can:c=>c.nA>0, coins:n=>15+n*6, pahala:5 },
  { id:'washcow', cat:'care',  icon:'cow',    stat:'washedCow',  title:['Mandikan sapi','Wash a cow'],                          goal:()=>1, can:c=>c.nCow>0, coins:()=>25, pahala:5 },
  { id:'treat',   cat:'care',  icon:'treat',  stat:'treats',     title:['Beri camilan ke {n} hewan','Give {n} treats'],         goal:c=>clampI(c.nA*.3,1,3), can:c=>c.nA>0, coins:n=>10+n*5, pahala:4 },
  { id:'pet',     cat:'care',  icon:'heart',  stat:'petted',     title:['Elus semua hewan ({n})','Pet every animal ({n})'],    goal:c=>clampI(c.nA,1,12), can:c=>c.nA>0, coins:n=>12+n*3, pahala:6 },
  { id:'happy',   cat:'care',  icon:'heart',  stat:'happy',      title:['Buat {n} hewan senang','Make {n} animals happy'],      goal:c=>clampI(c.nA*.4,2,5), can:c=>c.nA>0, coins:n=>12+n*4, pahala:5 },
  { id:'healthy', cat:'care',  icon:'pahala', stat:'healthy',    title:['Jaga semua hewan sehat sampai sore','Keep every animal healthy till evening'], goal:()=>1, can:c=>c.nA>0, coins:()=>30, pahala:8 },
  { id:'build',   cat:'build', icon:'dome',   stat:'placed',     title:['Bangun tahap masjid berikutnya','Build the next masjid stage'], goal:()=>1, can:c=>c.stage<c.stages, coins:()=>30, pahala:8 },
  { id:'decor',   cat:'build', icon:'lantern',stat:'decorPlaced',title:['Pasang {n} hiasan','Place {n} decoration(s)'],         goal:c=>c.lv>=4?2:1, can:()=>true, coins:n=>10+n*8, pahala:4 },
  { id:'buy',     cat:'build', icon:'goat',   stat:'bought',     title:['Rawat hewan baru dari toko','Adopt a new animal from the shop'], goal:()=>1, can:c=>c.canBuy&&c.day>1, coins:()=>20, pahala:5 },
  { id:'vis',     cat:'social',icon:'people', stat:'visitors',   title:['Sambut {n} jamaah','Welcome {n} visitors'],            goal:c=>clampI(2+c.stage*.8,2,8), can:()=>true, coins:n=>10+n*3, pahala:5 },
  { id:'donate',  cat:'social',icon:'coin',   stat:'donations',  title:['Terima {n} sedekah jamaah','Receive {n} donations'],    goal:c=>clampI(1+c.stage*.5,2,5), can:c=>c.stage>=1, coins:n=>8+n*3, pahala:4 },
  { id:'pray',    cat:'social',icon:'flag',   stat:'prayers',    title:['Saksikan salat berjamaah','See the jamaah pray together'], goal:()=>1, can:c=>c.stage>=2, coins:()=>20, pahala:8 },
  { id:'bedug',   cat:'social',icon:'drum',   stat:'bedugDusk',  title:['Tabuh bedug saat senja (17–19)','Beat the bedug at dusk (5–7pm)'], goal:()=>1, can:c=>c.bedug, coins:()=>20, pahala:6 },
  { id:'coins',   cat:'misc',  icon:'coin',   stat:'coins',      title:['Kumpulkan {n} koin hari ini','Earn {n} coins today'],   goal:c=>clampI(30+c.stage*12,30,140), can:()=>true, coins:()=>15, pahala:4 },
];
const GUEST = [ // special requests on 'tamu' days (double rewards)
  { stat:'happy',  icon:'heart',   title:['Tamu ingin melihat {n} hewan senang','The guest wants to see {n} happy animals'], goal:c=>clampI(c.nA*.5,2,5), can:c=>c.nA>0 },
  { stat:'treats', icon:'treat',   title:['Tamu membawa camilan: beri {n} hewan','The guest brought treats: give {n}'], goal:c=>clampI(c.nA*.4,2,4), can:c=>c.nA>0 },
  { stat:'decorPlaced', icon:'pot',title:['Tamu ingin plaza lebih indah: pasang hiasan','The guest wants a prettier plaza: place a decoration'], goal:()=>1, can:()=>true },
  { stat:'petted', icon:'heart',   title:['Tamu ingin berkenalan: elus {n} hewan','The guest wants to meet {n} animals: pet them'], goal:c=>clampI(c.nA*.6,2,8), can:c=>c.nA>0 },
];

// ---- stickers (20)
export const STICKERS = [
  { id:'first_feed', icon:'hay',     rim:'#7fcf5a', name:['Suapan Pertama','First Meal'],      test:(S)=>S.stats.fed>=1 },
  { id:'first_pet',  icon:'heart',   rim:'#ff8fab', name:['Elusan Sayang','Gentle Touch'],     test:(S)=>S.stats.petted>=1 },
  { id:'first_wash', icon:'soap',    rim:'#9ad7ff', name:['Bersih Wangi','Squeaky Clean'],     test:(S)=>S.stats.washed>=1 },
  { id:'water10',    icon:'water',   rim:'#4aa8ee', name:['Pembawa Air','Water Bearer'],       test:(S)=>S.stats.watered>=10 },
  { id:'build1',     icon:'hammer',  rim:'#35b5a5', name:['Batu Pertama','First Stone'],       test:(S,c)=>c.stage>=1 },
  { id:'build_all',  icon:'dome',    rim:'#ffc83d', name:['Masjid Megah','Grand Masjid'],      test:(S,c)=>c.stages>0&&c.stage>=c.stages },
  { id:'vis10',      icon:'people',  rim:'#35b5a5', name:['Tuan Rumah','Kind Host'],           test:(S)=>S.stats.visitors>=10 },
  { id:'vis50',      icon:'people',  rim:'#ffc83d', name:['Masjid Ramai','Busy Masjid'],       test:(S)=>S.stats.visitors>=50 },
  { id:'cow300',     icon:'cow',     rim:'#c9a468', name:['Sapi Jumbo','Jumbo Cow'],           test:(S,c)=>c.maxCow>=300 },
  { id:'herd8',      icon:'goat',    rim:'#7fcf5a', name:['Kandang Penuh Cinta','Full Pen'],   test:(S,c)=>c.nA>=8 },
  { id:'bedug',      icon:'drum',    rim:'#f0701c', name:['Dum Dum!','Boom Boom!'],            test:(S)=>S.stats.bedug>=1 },
  { id:'maghrib',    icon:'moon',    rim:'#7d8cf0', name:['Penanda Senja','Dusk Drummer'],     test:(S)=>S.stats.bedugDusk>=1 },
  { id:'streak3',    icon:'star',    rim:'#ffc83d', name:['Rajin 3 Hari','3-Day Streak'],      test:(S)=>S.bestStreak>=3 },
  { id:'streak7',    icon:'star',    rim:'#ff7a8a', name:['Rajin Sepekan','Week Streak'],      test:(S)=>S.bestStreak>=7 },
  { id:'jumat',      icon:'calendar',rim:'#35b5a5', name:['Jumat Berkah','Blessed Friday'],    test:(S)=>S.stats.jumatDone>=1 },
  { id:'decor1',     icon:'pot',     rim:'#ff7aa2', name:['Tangan Kreatif','Decorator'],       test:(S)=>S.stats.decorPlaced>=1 },
  { id:'decor10',    icon:'lantern', rim:'#ffc83d', name:['Plaza Meriah','Festive Plaza'],     test:(S)=>(S.decor.placed||[]).length>=10 },
  { id:'berkah5',    icon:'pahala',  rim:'#35b5a5', name:['Penuh Berkah','Truly Blessed'],     test:(S,c)=>c.lv>=5 },
  { id:'eid1',       icon:'crescent',rim:'#ffc83d', name:['Idul Adha Pertama','First Eid'],    test:(S)=>S.stats.eids>=1 },
  { id:'eid3star',   icon:'crescent',rim:'#ff7a8a', name:['Kurban Terbaik','Best Care'],       test:(S)=>S.stats.eid3>=1 },
];

const freshDaily = () => ({ fed:0, treats:0, watered:0, washed:0, washedCow:0, petted:0, happy:0, placed:0, bought:0, visitors:0, donations:0, prayers:0, bedug:0, bedugDusk:0, decorPlaced:0, sick:0, healthy:0, coins:0, pahala:0 });
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function init(ctx){
  const S = ctx.state, Q = new URLSearchParams(location.search);
  const ui = () => ctx.modules.ui, A = () => ctx.modules.animals, Mj = () => ctx.modules.masjid;
  const sfx = (n,o) => { try{ ctx.modules.audio?.play(n,o); }catch(e){} };
  const fxb = (k,p,n) => { try{ ctx.modules.fx?.burst(k,p,n); }catch(e){} };
  const L = p => S.lang==='en' ? p[1] : p[0];
  const addCoins = (n,src) => { if(ui()?.addCoins) ui().addCoins(n,src); else { S.coins=Math.max(0,(S.coins||0)+n); ctx.emit('coins:change',{coins:S.coins}); } };
  const addPahala = (n,src) => { if(ui()?.addPahala) ui().addPahala(n,src); else { S.pahala=Math.max(0,(S.pahala||0)+n); ctx.emit('coins:change',{coins:S.coins,pahala:S.pahala}); } };
  const spend = n => ui()?.spend ? ui().spend(n) : (S.coins>=n ? (S.coins-=n, ctx.emit('coins:change',{coins:S.coins}), true) : false);
  const playerPos = () => ctx.modules.characters?.pos || ctx.cameraRig?.target || { x:0, y:0, z:0 };

  let prevHour = ctx.hour ?? 8, acc = 0, dirty = false, crowdT = 20, crowdN = 0, crowdDay = -1;
  const notified = new Set();
  // ---------- levels ----------
  const levelOf = p => { let l=1; for(let i=0;i<LEVELS.length;i++) if(p>=LEVELS[i]) l=i+1; return l; };
  const level = () => levelOf(S.pahala||0);
  function levelInfo(){ const lv=level(), cur=LEVELS[lv-1], next=LEVELS[lv]; return { lv, max:LEVELS.length, cur, next:next??null, pct: next ? Math.min(1,((S.pahala||0)-cur)/(next-cur)) : 1, pahala:S.pahala||0 }; }
  const questSlots = (lv=level()) => SLOT_LV.reduce((s,[l,n])=>lv>=l?n:s,3);
  function unlocksAt(lv){ const u=[];
    for(const o of OUTFITS) if(o.lv===lv&&lv>1) u.push({ type:'outfit', id:o.id, icon:'shirt', name:o.name });
    for(const d of DECOR_KINDS) if(d.lv===lv&&lv>1) u.push({ type:'decor', id:d.id, icon:d.icon, name:d.name });
    for(const [l,n] of SLOT_LV) if(l===lv&&lv>1) u.push({ type:'slot', icon:'scroll', name:[`Slot tugas ke-${n}`,`Task slot #${n}`] });
    if(PEN_LV[lv]) u.push({ type:'pen', icon:'goat', name:['Kandang lebih luas','Bigger pen'] });
    return u; }

  // ---------- context snapshot for quests/stickers ----------
  function qctx(){
    const list = A()?.list || [], m = Mj();
    return { nA:list.length, nCow:list.filter(a=>a.kind==='cow').length, maxCow:Math.max(0,...list.filter(a=>a.kind==='cow').map(a=>a.weight||0)),
      stage: m && typeof m.stage==='number' ? m.stage : (S.masjid?.stage|0), stages: m?.stages?.length ?? 8,
      bedug: !!(m?.bedugPos || m?.playBedug) && (m?.stage|0) >= 6, canBuy: A()?.canAdd ? A().canAdd() : false, lv:level(), day:S.day };
  }

  // ---------- day roll: event + quests ----------
  const weekday = d => ((d-1)%7+7)%7;
  const isJumat = d => weekday(d)===4;
  function rollDay(){
    const R = rng(S.year*7919 + S.day*104729 + 17), c = qctx();
    let ev = 'cerah';
    if(isJumat(S.day)) ev='jumat';
    else if(!(S.day===1&&S.year===1)){ const keys=Object.keys(EVENTS).filter(k=>EVENTS[k].w>0&&k!==S.event?.id); const tot=keys.reduce((s,k)=>s+EVENTS[k].w,0); let r=R()*tot; for(const k of keys){ r-=EVENTS[k].w; if(r<=0){ ev=k; break; } } }
    if(Q.get('event')&&EVENTS[Q.get('event')]) ev=Q.get('event');
    const E = EVENTS[ev];
    S.event = { day:S.day, id:ev };
    const pool = QUESTS.filter(q=>q.can(c) && !(E.ban||[]).includes(q.id));
    const picked = [], has = id => picked.some(q=>q.id===id), slots = questSlots();
    const first = S.day===1 && S.year===1 ? ['feed','water','build'] : [];
    for(const id of [...first, ...(E.force||[])]){ const q=pool.find(p=>p.id===id); if(q&&!has(id)&&picked.length<slots) picked.push(q); }
    const rest = pool.filter(q=>!has(q.id)).map(q=>({q,k:R()+(picked.some(p=>p.cat===q.cat)?.6:0)+(S.quests?.list||[]).some(p=>p.id===q.id)*.35})).sort((a,b)=>a.k-b.k);
    for(const {q} of rest){ if(picked.length>=slots) break; picked.push(q); }
    const list = picked.map(q=>{ const n=q.goal(c); return { id:q.id, goal:n, coins:q.coins(n), pahala:q.pahala }; });
    if(E.special){ const gs=GUEST.filter(g=>g.can(c)); if(gs.length){ const g=gs[Math.floor(R()*gs.length)], n=g.goal(c); list.push({ id:'guest', guest:GUEST.indexOf(g), goal:n, coins:40+n*5, pahala:15, special:true }); } }
    S.quests = { day:S.day, list, claimed:{} };
    S.daily = freshDaily(); S.pettedToday = []; notified.clear();
    rainSet();
  }
  const defOf = q => q.id==='guest' ? GUEST[q.guest] || GUEST[0] : QUESTS.find(d=>d.id===q.id);
  function quests(){
    const D = S.daily||{}, mul = EVENTS[S.event?.id]?.mul || 1;
    return (S.quests?.list||[]).map(q=>{ const d=defOf(q); if(!d) return null; const prog=Math.min(q.goal, D[d.stat]||0);
      return { id:q.id, icon:d.icon, title:d.title, goal:q.goal, prog, done:prog>=q.goal, claimed:!!S.quests.claimed[q.id], coins:Math.round(q.coins*mul), pahala:Math.round(q.pahala*mul), special:!!q.special }; }).filter(Boolean);
  }
  function checkQuests(){
    for(const q of quests()) if(q.done && !notified.has(q.id)){ notified.add(q.id); if(!q.claimed) ctx.emit('quest:done',q); }
    ctx.emit('quest:update');
  }
  function claim(id){
    const q = quests().find(x=>x.id===id); if(!q || !q.done || q.claimed) return null;
    S.quests.claimed[id] = true; addCoins(q.coins,'quest'); addPahala(q.pahala,'quest');
    sfx('coin'); const p=playerPos(); fxb('sparkle',{x:p.x,y:(p.y||0)+2.2,z:p.z},18);
    ctx.emit('quest:claimed',q); ctx.emit('quest:update'); return q;
  }

  // ---------- counters from gameplay events ----------
  const bump = (k,n=1) => { S.daily[k]=(S.daily[k]||0)+n; if(S.stats[k]!==undefined) S.stats[k]+=n; checkQuests(); };
  ctx.on('animal:fed', d=>{ bump('fed'); if(d?.item==='treat') bump('treats'); });
  ctx.on('animal:watered', ()=>bump('watered'));
  ctx.on('animal:washed', d=>{ bump('washed'); if(d?.animal?.kind==='cow') bump('washedCow'); });
  ctx.on('animal:petted', d=>{ const a=d?.animal; if(!a) return; const id=a.name||a.seed||'?'; if(!S.pettedToday.includes(id)){ S.pettedToday.push(id); S.daily.petted=S.pettedToday.length; S.stats.petted++; checkQuests(); } });
  ctx.on('animal:happy', ()=>bump('happy'));
  ctx.on('animal:sick', ()=>{ S.daily.sick=(S.daily.sick||0)+1; });
  ctx.on('animal:added', ()=>{ if(!loadingBatch) bump('bought'); });
  ctx.on('build:placed', ()=>{ bump('placed'); setTimeout(checkStickers,500); });
  ctx.on('visitor:arrive', ()=>bump('visitors'));
  ctx.on('visitor:donate', ()=>bump('donations'));
  ctx.on('prayer:done', ()=>bump('prayers'));
  ctx.on('bedug:hit', ()=>{ bump('bedug'); const h=ctx.hour??12; if(h>=17&&h<19.5) bump('bedugDusk'); });
  ctx.on('coins:change', ()=>{ if(dirty) return; dirty=true; queueMicrotask(()=>{ dirty=false; checkLevel(); checkQuests(); }); });

  // ---------- stickers ----------
  function stickers(){ return STICKERS.map(s=>({ ...s, got: S.stickers[s.id]||0 })); }
  function checkStickers(){
    const c = qctx();
    for(const s of STICKERS) if(!S.stickers[s.id]){ let ok=false; try{ ok=s.test(S,c); }catch(e){} if(ok){ S.stickers[s.id]=S.day||1; ctx.emit('sticker:new',s); sfx('chime'); } }
  }

  // ---------- level watcher ----------
  function checkLevel(){
    const lv = level();
    if(lv > S.berkahSeen){ const from=S.berkahSeen; S.berkahSeen=lv; const unlocks=[]; for(let l=from+1;l<=lv;l++){ unlocks.push(...unlocksAt(l)); if(PEN_LV[l]){ S.penLevel=Math.max(S.penLevel,PEN_LV[l]); ctx.emit('pen:upgrade',{ level:S.penLevel }); } }
      ctx.emit('berkah:level',{ lv, unlocks }); sfx('chime'); const p=playerPos(); fxb('sparkle',{x:p.x,y:(p.y||0)+2,z:p.z},30); checkStickers(); }
  }

  // ---------- outfits ----------
  const outfits = () => OUTFITS.map(o=>({ ...o, unlocked: level()>=o.lv, worn: S.outfit===o.id }));
  function setOutfit(id){ const o=OUTFITS.find(x=>x.id===id); if(!o||level()<o.lv) return false; S.outfit=id; S.look={ ...(S.look||{}), ...o.look }; ctx.emit('player:look',o.look);
    const p=playerPos(); fxb('sparkle',{x:p.x,y:(p.y||0)+1.2,z:p.z},20); sfx('pop'); return true; }

  // ---------- decorations ----------
  const decor = createDecor(ctx); decor.sync(S.decor.placed);
  let placing = null, tapStart = null, camSave = null;
  const freeSlots = () => SLOTS.map(s=>s[0]).filter(id=>!S.decor.placed.some(p=>p.slot===id));
  const decorKinds = () => DECOR_KINDS.map(k=>({ ...k, unlocked: level()>=k.lv, owned: S.decor.owned[k.id]||0, placed: S.decor.placed.filter(p=>p.kind===k.id).length }));
  function buyDecor(kind){ const k=DECOR_KINDS.find(x=>x.id===kind); if(!k||level()<k.lv) return false; if(!spend(k.price)) return false; S.decor.owned[kind]=(S.decor.owned[kind]||0)+1; sfx('coin'); ctx.emit('decor:change'); return true; }
  function placeDecor(kind, slot){
    if(!(S.decor.owned[kind]>0) || !freeSlots().includes(slot)) return false;
    S.decor.owned[kind]--; S.decor.placed.push({ slot, kind }); decor.sync(S.decor.placed);
    const s = decor.slotPos.get(slot); fxb('sparkle',{x:s.x,y:s.y+.8,z:s.z},22); fxb('dust',{x:s.x,y:s.y,z:s.z},8); sfx('build',{pos:{x:s.x,y:s.y,z:s.z}});
    bump('decorPlaced'); ctx.emit('decor:placed',{ kind, slot }); ctx.emit('decor:change'); checkStickers(); save(S);
    if(!(S.decor.owned[kind]>0)) stopPlace(); else decor.showSlots(freeSlots());
    return true;
  }
  function storeDecor(kind){ const i=S.decor.placed.map(p=>p.kind).lastIndexOf(kind); if(i<0) return false; S.decor.placed.splice(i,1); S.decor.owned[kind]=(S.decor.owned[kind]||0)+1; decor.sync(S.decor.placed); sfx('pop'); ctx.emit('decor:change'); return true; }
  function startPlace(kind){
    if(!(S.decor.owned[kind]>0)) return false; placing=kind; decor.showSlots(freeSlots());
    const R=ctx.cameraRig; if(R&&!camSave){ camSave={ dist:R.dist, pitch:R.pitch }; R.dist=Math.max(R.dist,26); R.pitch=Math.max(R.pitch,.95); }
    ctx.emit('decor:placing',{ kind }); return true;
  }
  function stopPlace(){ if(!placing) return; placing=null; decor.showSlots(null); const R=ctx.cameraRig; if(R&&camSave){ R.dist=camSave.dist; R.pitch=camSave.pitch; } camSave=null; ctx.emit('decor:placing',null); }
  function placeAuto(){ if(!placing) return false; const id=decor.nearest(freeSlots(), playerPos()); return id ? placeDecor(placing,id) : false; }
  addEventListener('pointerdown', e=>{ if(placing && e.target===ctx.canvas) tapStart={ x:e.clientX, y:e.clientY, t:performance.now() }; }, true);
  addEventListener('pointerup', e=>{ if(!placing||!tapStart||e.target!==ctx.canvas) return; const d=Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y); const dt=performance.now()-tapStart.t; tapStart=null;
    if(d<12&&dt<600){ const id=decor.pick(e.clientX,e.clientY); if(id) placeDecor(placing,id); } }, true);
  const priceMul = type => S.event?.id==='pasar' && type==='supply' ? .75 : 1;

  // ---------- rain (hujan) ----------
  function rainSet(){ try{ ctx.modules.fx?.setRain?.(S.event?.id==='hujan'); }catch(e){} }

  // ---------- day end ----------
  let lastDayT = -99, pendingEid = false;
  function endDay(){
    if(ctx.time-lastDayT<1.5) return; lastDayT=ctx.time;
    const finished = S.day, D = { ...S.daily }, ev = S.event?.id;
    // auto-claim finished quests so nothing is lost
    let autoCoins=0, autoPah=0; for(const q of quests()) if(q.done&&!q.claimed){ S.quests.claimed[q.id]=true; autoCoins+=q.coins; autoPah+=q.pahala; }
    if(autoCoins) addCoins(autoCoins,'quest'); if(autoPah) addPahala(autoPah,'quest');
    const qs = quests(), doneN = qs.filter(q=>q.done).length, all = qs.length>0 && doneN===qs.length;
    const goodDay = qs.length>0 && doneN >= Math.max(1, qs.length-1);
    if(goodDay){ S.streak++; S.bestStreak=Math.max(S.bestStreak,S.streak); } else S.streak=0;
    const streakBonus = goodDay ? Math.min(S.streak,7)*5 : 0; if(streakBonus) addCoins(streakBonus,'streak');
    if(ev==='jumat' && all){ S.stats.jumatDone++; }
    S.day++; if(S.daysToEid>0) S.daysToEid--;
    rollDay(); checkStickers(); save(S);
    pendingEid = S.daysToEid<=0 && !S.eidDone;
    ctx.emit('day:summary',{ day:finished, stats:D, doneN, total:qs.length, all, streak:S.streak, streakBonus, autoCoins, event:S.event.id, eid:pendingEid, weekday:weekday(S.day) });
  }
  ctx.on('day:new', endDay);

  // ---------- Eid ----------
  let eidCache = null, loadingBatch = false;
  function gradeAnimal(a){
    const K = a.K || A()?.KIND?.[a.kind] || { wMax: a.kind==='cow'?520:a.kind==='sheep'?55:42 };
    const s = a.stats||{}, care = ((s.happy??.7)*2+(s.hunger??.7)+(s.thirst??.7)+(s.clean??.7))/5;
    const grow = Math.min(1, (a.weight||0) / (K.wMax*.7));
    const q = .6*care + .4*grow - (a.sick?.15:0);
    const stars = q>.78?3:q>.55?2:1, w = a.weight || K.wMax*.5;
    return { kind:a.kind, name:a.name||'', w, stars, packs:Math.max(1,Math.round(w*.45/.5)) };
  }
  function celebrateEid(){
    if(eidCache) return eidCache;
    const list = A()?.list || [];
    const an = list.length ? list.map(gradeAnimal) : [];
    const packs = an.reduce((s,a)=>s+a.packs,0), stars = an.reduce((s,a)=>s+a.stars,0);
    const coins = stars*15, pahala = 50 + stars*8;
    S.eidDone = true; S.stats.eids++; if(an.length && an.every(a=>a.stars===3)) S.stats.eid3++;
    addCoins(coins,'eid'); addPahala(pahala,'eid'); checkStickers(); save(S);
    eidCache = { animals:an, packs, third:Math.round(packs/3), coins, pahala, year:S.year };
    return eidCache;
  }
  function newYear(){
    if(!S.eidDone) celebrateEid();
    const an = A(); if(an?.list?.length && an.remove && an.add){ loadingBatch=true; const kinds=an.list.map(a=>a.kind); for(const a of an.list.slice()) an.remove(a); for(const k of kinds) an.add(k); loadingBatch=false; }
    S.year++; S.daysToEid=10; S.eidDone=false; eidCache=null; S.stats.years++; save(S);
    ctx.emit('year:new',{ year:S.year });
  }

  // ---------- init ----------
  if(!Array.isArray(S.quests?.list) || S.quests.day!==S.day) rollDay(); else rainSet();
  if(S.daysToEid<=0 && S.eidDone) newYear();            // celebrated but the new year never started (reload)
  pendingEid = S.daysToEid<=0 && !S.eidDone;
  if(!S.berkahSeen) S.berkahSeen = level();
  if(S.outfit && S.outfit!=='klasik') { const o=OUTFITS.find(x=>x.id===S.outfit); if(o&&level()>=o.lv) S.look={ ...(S.look||{}), ...o.look }; }
  if(Q.get('decor')==='all'){ S.decor.placed = SLOTS.map((s,i)=>({ slot:s[0], kind:DECOR_KINDS[i%DECOR_KINDS.length].id })); decor.sync(S.decor.placed); }
  if(Q.has('slots')) decor.showSlots(freeSlots());
  setTimeout(()=>{ checkQuests(); checkStickers(); },1500);

  return {
    LEVELS, OUTFITS, EVENTS, STICKERS, QUESTS, DECOR_KINDS, WEEKDAYS,
    level, levelInfo, unlocksAt, questSlots, quests, claim, stickers, outfits, setOutfit,
    decorKinds, buyDecor, placeDecor, storeDecor, startPlace, stopPlace, placeAuto, get placing(){ return placing; }, decor,
    priceMul, weekday, isJumat, event:()=>({ id:S.event?.id||'cerah', ...EVENTS[S.event?.id||'cerah'] }),
    get pendingEid(){ return pendingEid; }, celebrateEid, newYear, endDay, rollDay,
    update(dt,t){
      // fallback clock when no world module drives ctx.hour (paused while overlays are open)
      if(!ctx.modules.world && ui()?.started && !ui()?.overlayOpen?.()) ctx.hour=((ctx.hour??8)+dt*24/420)%24;
      const h = ctx.hour ?? 8; if(h < prevHour-6) ctx.emit('day:new'); prevHour = h;
      decor.update(dt,t);
      const now=performance.now(); if(now-acc>500){ acc=now;
        if(!S.daily.healthy && h>=17 && !S.daily.sick && (A()?.list||[]).length && !(A().list.some(a=>a.sick))) { S.daily.healthy=1; checkQuests(); }
        if(Math.random()<.2) checkStickers();
      }
      // busy days: a few extra visitors spread over the day
      const E = EVENTS[S.event?.id]; if(crowdDay!==S.day){ crowdDay=S.day; crowdN=0; }
      if(E?.crowd && crowdN<E.crowd && h>7 && h<19){ crowdT-=dt; if(crowdT<=0){ crowdT=18+Math.random()*14; const v=ctx.modules.characters?.visitors; try{ if(v?.spawn){ v.spawn(); crowdN++; } }catch(e){} } }
      // weather nudges on animals (gentle)
      if(E && (S.event.id==='panas'||S.event.id==='hujan')) for(const a of A()?.list||[]){ const s=a.stats; if(!s) continue;
        if(S.event.id==='panas') s.thirst=Math.max(0,s.thirst-.0012*dt); else s.clean=Math.min(1,s.clean+.0008*dt); }
    },
  };
}

// Marbot Masjid DOM HUD. Indonesian primary, English fallback (Settings > Bahasa).
import { SPRITE, ic } from './icons.js';
import { save, reset, defaultState } from '../state.js';
import { createCare } from './hudcare.js';
import { createHewan } from './hewan.js';
import { createDesign } from './design.js';

// Nunito (OFL, bundled). Registered from JS with module-relative URLs so it resolves no matter where the
// stylesheet ends up (linked, inlined by a host, or copied into a snapshot). Failures fall back silently.
(function loadFonts(){ try{ if(!('FontFace' in window)||!document.fonts) return;
  for(const [w,range] of [[700,'400 700'],[800,'800'],[900,'900']]){
    const f=new FontFace('Nunito',`url("${new URL(`./fonts/nunito-latin-${w}-normal.woff2`,import.meta.url).href}") format("woff2")`,{weight:range,style:'normal',display:'swap'});
    document.fonts.add(f); f.load().catch(()=>{}); } }catch(e){} })();

const D={ // key: [id, en]
 day:['Hari','Day'], toEid:['menuju Idul Adha','to Eid al-Adha'], eidToday:['Idul Adha!','Eid!'], eidSub:['Hari Raya Kurban','Festival of Sacrifice'], daysLeft:['{n} hari lagi','{n} days left'], claim:['Ambil','Claim'], claimed:['Diambil','Claimed'], doneTap:['Tugas selesai! Ketuk untuk ambil hadiah','Task done! Tap to claim'], holdReset:['Tahan untuk hapus progres','Hold to reset progress'], danger:['Zona bahaya','Danger zone'], h1k:['Gunakan tombol WASD atau panah untuk berjalan.','Use WASD or arrow keys to walk.'], eidGloss:['Semoga Allah menerima amal kita semua','May Allah accept it from us all'],
 quests:['Tugas','Tasks'], tasksToday:['Tugas Hari Ini','Today\'s Tasks'], shop:['Toko','Shop'], build:['Bangun','Build'], settings:['Atur','Settings'],
 hay:['Jerami','Hay'], water:['Air','Water'], soap:['Sabun','Soap'], treat:['Camilan','Treat'],
 hayD:['Makanan utama kambing & sapi','Main feed for goats & cows'], waterD:['Air bersih segar','Fresh clean water'], soapD:['Untuk memandikan hewan','For bathing animals'], treatD:['Bikin hewan senang','Makes animals happy'],
 buy:['Beli','Buy'], owned:['Punya','Own'], noCoins:['Koin tidak cukup','Not enough coins'], bought:['Dibeli','Bought'],
 shopTitle:['Toko Peternakan','Farm Shop'], buildTitle:['Bangun Masjid','Build the Masjid'], questTitle:['Papan Tugas','Task Board'], setTitle:['Pengaturan','Settings'],
 coins:['Koin','Coins'], pahala:['Berkah','Blessings'], built:['Terbangun','Built'], mosque:['Masjid','Mosque'], reward:['Hadiah','Reward'],
 place:['Bangun','Build'], need:['Butuh','Needs'], tapTool:['Pilih alat','Pick tool'],
 sound:['Suara','Sound'], music:['Musik','Music'], sfx:['Efek','Effects'], lang:['Bahasa','Language'], resetSave:['Hapus Progres','Reset Progress'], sure:['Yakin? Ketuk lagi','Sure? Tap again'],
 close:['Tutup','Close'], sick:['sedang sakit, rawat dengan baik','is feeling sick, take care'], recovered:['sudah sehat lagi!','is healthy again!'], shopGear:['Perlengkapan','Supplies'], shopAnimals:['Hewan Kurban','Animals'], baby:['Anak','Baby'], penFull:['Kandang penuh','Pen is full'], nextYear:['Menuju Idul Adha berikutnya: 10 hari lagi!','Next Eid al-Adha in 10 days!'], locked:['Terkunci','Locked'], start:['Mulai Bermain','Start Game'], cont:['Lanjutkan','Continue'], tagline:['Rawat hewan kurban, bangun masjid','Care for the animals, build the masjid'],
 sumTitle:['Hari {n} Selesai','Day {n} Complete'], sumSub:['Alhamdulillah, kerja bagus hari ini!','Alhamdulillah, great work today!'], next:['Lanjut ke Hari {n}','On to Day {n}'],
 fed:['Hewan diberi makan','Animals fed'], washed:['Hewan dimandikan','Animals washed'], happy:['Hewan senang','Happy animals'], placed:['Bagian dibangun','Parts built'], visitors:['Jamaah datang','Visitors'], earned:['Koin didapat','Coins earned'], pahalaE:['Berkah didapat','Blessings earned'],
 eidTitle:['Selamat Idul Adha!','Eid al-Adha Mubarak!'], eidGreet:['Taqabbalallahu minna wa minkum','Taqabbalallahu minna wa minkum'],
 eidSum:['Hewan kurban dibagikan dengan penuh syukur.','The sacrifice is shared with gratitude.'], dFam:['Keluarga','Family'], dNeigh:['Tetangga & Kerabat','Neighbors'], dPoor:['Fakir Miskin','The Needy'], packs:['paket daging','meat packs'],
 animals:['Hewan kurban','Animals'], goats:['kambing','goats'], sheeps:['domba','sheep'], cows:['sapi','cows'], jamaah:['Jamaah','Visitors'], again:['Tahun Baru','New Year'], keep:['Lanjut ke Tahun Depan','On to Next Year'],
 h1:['Geser joystick untuk berjalan keliling.','Use the joystick to walk around.'], h2:['Dekati kambing, lalu tekan tombol aksi untuk memberi makan.','Walk up to a goat and press action to feed it.'],
 h3:['Buka Menu, lalu Bangun untuk mulai membangun masjid!','Open the Menu, then Build to start the masjid!'], h4:['Selesaikan tugas harian sebelum Idul Adha tiba.','Finish daily tasks before Eid arrives.'],
 q_feed:['Beri makan 3 kambing','Feed 3 goats'], q_wash:['Mandikan sapi','Wash a cow'], q_water:['Beri minum 2 hewan','Water 2 animals'], q_happy:['Buat 2 hewan senang','Make 2 animals happy'], q_build:['Bangun 1 bagian masjid','Build 1 masjid part'], q_vis:['Sambut 2 jamaah','Welcome 2 visitors'],
 build_ok:['Masjid bertambah indah!','The masjid grows!'], q_done:['Tugas selesai!','Task complete!'], newday:['Hari baru dimulai','A new day begins'], eidSoon:['Idul Adha sebentar lagi!','Eid is almost here!'], masjidDone:['Masjid selesai dibangun!','Masjid complete!'],
 allDone:['Semua tugas beres!','All tasks done!'], special:['Permintaan Tamu','Guest request'], streak:['Rajin {n} hari berturut-turut!','{n}-day streak!'], streak0:['Besok semangat lagi, ya!','Fresh start tomorrow!'], streakHint:['Selesaikan hampir semua tugas untuk bonus rajin','Finish (almost) all tasks for a streak bonus'],
 tasksDone:['Tugas selesai','Tasks done'], autoClaim:['Hadiah tugas otomatis diambil','Task rewards auto-collected'], tomorrow:['Besok','Next'], toEidBtn:['Sambut Idul Adha!','Welcome Eid!'],
 berkah:['Berkah','Blessings'], lv:['Level','Level'], book:['Buku','Book'], bookTitle:['Buku Marbot','Marbot Book'], tabBerkah:['Berkah','Blessings'], tabStickers:['Stiker','Stickers'], tabOutfit:['Baju','Outfits'],
 nextLv:['{n} berkah lagi ke Level {l}','{n} more blessings to Level {l}'], maxLv:['Level tertinggi! Masya Allah','Top level! Masha Allah'], unlockAt:['Level {l}','Level {l}'], wear:['Pakai','Wear'], wearing:['Dipakai','Wearing'],
 stickerNew:['Stiker baru','New sticker'], lvUp:['Naik Level!','Level Up!'], lvUpSub:['Level {l}: hadiah baru terbuka','Level {l}: new rewards unlocked'], yay:['Asyik!','Yay!'], moreSoon:['Terus berbuat baik!','Keep doing good!'],
 tabSupply:['Barang','Supplies'], tabAnimal:['Hewan','Animals'], tabDecor:['Hiasan','Decor'], put:['Pasang','Place'], store:['Simpan satu','Store one'], onPlaza:['Terpasang','Placed'], sale:['Hari pasar: perlengkapan diskon 25%!','Market day: supplies 25% off!'],
 placeHint:['Ketuk lingkaran bercahaya untuk memasang {k}','Tap a glowing circle to place {k}'], auto:['Dekat saya','Near me'], cancel:['Batal','Cancel'], noSlot:['Tidak ada tempat kosong','No free spot'],
 goatD:['Lincah dan suka jerami','Lively, loves hay'], sheepD:['Berbulu lembut','Soft and woolly'], cowD:['Besar dan sabar','Big and patient'],
 thanks:['Terima kasih, {names}! Kalian membawa kebahagiaan untuk banyak keluarga.','Thank you, {names}! You brought joy to many families.'], rewardEid:['Hadiah Idul Adha','Eid rewards'],
 newBatch:['Hewan-hewan baru telah tiba di kandang','A new group of animals has arrived'], eidCarry:['Level, hiasan, dan masjidmu tetap tersimpan.','Your level, decorations and masjid carry over.'], eidIn:['Idul Adha: {n} hari','Eid in {n} days'], eidTmr:['Idul Adha besok!','Eid is tomorrow!'], toBook:['Lihat cara mendapatkannya di Buku','See how to earn it in the Book'], howTo:['Cara:','How:'], nextYearBtn:['Sambut Tahun Baru','Welcome the New Year'], young:['{names} masih kecil, jadi tetap tinggal dan tumbuh bersamamu.','{names} are still young, so they stay and grow with you.'],
 hewan:['Hewanku','My Animals'], design:['Desain','Design'], sapu:['Sapu','Broom'], pel:['Pel','Mop'], more:['Lainnya','More'], tabPlaza:['Plaza','Plaza'], tabMasjid:['Masjid','Masjid'],
 placeHintM:['Ketuk lingkaran di dalam masjid untuk memasang {k}','Tap a circle inside the masjid to place {k}'], placeHintP:['Ketuk lingkaran di serambi atau plaza untuk memasang {k}','Tap a circle on the porch or plaza to place {k}'],
 clean:['Kebersihan','Cleanliness'], adzanN:['Adzan dikumandangkan','Adzan called'], imamN:['Memimpin salat','Prayers led'],
 menu:['Menu','Menu'], tugasTile:['Tugas','Tasks'], toko:['Toko','Shop'], bangun:['Bangun','Build'], desainTile:['Desain Masjid','Masjid Design'], stikerTile:['Buku Stiker','Sticker Book'],
 newFeat:['Fitur baru: {f}!','New: {f}!'], newTag:['Baru','New'], okGo:['Oke, ayo!','Okay, let\'s go!'], goalClaim:['Ambil hadiah','Collect reward'], restNow:['Semua tugas beres. Santai dulu, ya!','All done. Time to relax!'], menuSub:['Mau ke mana?','Where to?'],
 lvName:['Level {l}','Level {l}'], bword:['berkah','blessings'], adult:['Dewasa','Adult'], lvTotal:['{n} berkah terkumpul','{n} blessings collected'],
};
const PARTS=[ // fallback list if masjid module has none
 {id:'pondasi',name:['Pondasi & Lantai','Foundation & Floor'],cost:40,desc:['Dasar yang kokoh','A solid base']},
 {id:'dinding',name:['Dinding Utama','Main Walls'],cost:60,desc:['Ruang sholat teduh','A shady prayer hall']},
 {id:'atap',name:['Atap & Kubah','Roof & Dome'],cost:90,desc:['Kubah hijau berkilau','A shiny green dome']},
 {id:'menara',name:['Menara','Minaret'],cost:80,desc:['Tempat suara bedug','Home of the bedug']},
 {id:'mihrab',name:['Mihrab & Mimbar','Mihrab & Minbar'],cost:50,desc:['Tempat imam','For the imam']},
 {id:'wudhu',name:['Tempat Wudhu','Wudhu Area'],cost:45,desc:['Air jernih mengalir','Fresh flowing water']},
 {id:'taman',name:['Taman & Pagar','Garden & Fence'],cost:35,desc:['Hijau dan asri','Green and lovely']},
 {id:'bedug',name:['Bedug Besar','Great Bedug'],cost:55,desc:['Dentum penanda waktu','A drum to mark time']},
];
const SHOP=[ {id:'hay',qty:5,price:10,icon:'hay'},{id:'water',qty:5,price:8,icon:'water'},{id:'soap',qty:1,price:15,icon:'soap'},{id:'treat',qty:3,price:18,icon:'treat'} ];
export async function init(ctx){
  const root=document.getElementById('ui')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'ui'}));
  const S=ctx.state; const Q=new URLSearchParams(location.search);
  for(const k in defaultState()) if(S[k]===undefined) S[k]=defaultState()[k];
  if(['id','en'].includes(Q.get('lang'))) S.lang=Q.get('lang');
  if(!S.lang) S.lang=(navigator.language||'').toLowerCase().startsWith('id')?'id':'en';
  const t=(k,v)=>{ const e=D[k]; let s=e?(S.lang==='en'?e[1]:e[0]):k; if(v) for(const a in v) s=s.replace('{'+a+'}',v[a]); return s; };
  const L=(pair)=>S.lang==='en'?pair[1]:pair[0];
  const $=(s,r=root)=>r.querySelector(s);
  const audio=()=>ctx.modules.audio, fx=()=>ctx.modules.fx;
  const sfx=(n,o)=>{ try{ audio()?.play(n,o); }catch(e){} };
  const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!==undefined) e.innerHTML=html; return e; };
  const fmt=n=>Math.round(n).toLocaleString('id-ID');
  const camTarget=()=>ctx.cameraRig?.target||{x:0,y:0,z:0};

  if(!document.getElementById('i-coin')) root.insertAdjacentHTML('afterbegin',SPRITE);
  // ---------------- HUD skeleton ----------------
  const hud=el('div'); hud.id='hud';
  hud.innerHTML=`
  <div id="topbar">
    <div class="tb-left"><button class="pill clay daypill" id="daypill"><div class="dico" id="dico"></div><div class="dtxt"><b id="dayN"></b><small id="clock"></small></div><span class="evb" id="evb"></span></button></div>
    <div class="tb-right">
      <div class="pill clay wallet"><button class="wc" id="coinpill" aria-label="Coins">${ic('coin')}<b id="coinN">0</b></button><span class="sep"></span><button class="wp" id="pahpill" aria-label="Level"><span class="lvstar">${ic('pahala')}<b id="lvb"></b></span></button></div>
      <button class="iconbtn clay" id="setBtn" aria-label="Settings">${ic('gear')}</button>
    </div>
  </div>
  <button id="tracker" class="clay"><span id="qchip"></span></button>
  <div id="ptr"></div>
  <button id="menuBtn" class="clay" aria-label="Menu">${ic('menu')}<span class="ml" data-t="menu"></span><i class="mdot" id="menuDot"></i></button>
  <div id="toasts"></div><div id="ach"></div>
  <div id="placebar" class="clay hidden"></div>
  <div id="hint" class="clay hidden"><div class="av">${ic('marbot')}</div><div class="tx" id="hintTx"></div><button class="x" id="hintX" aria-label="Close">${ic('close')}</button></div>
  <div id="hotbar" class="clay"></div>`;
  root.appendChild(hud);
  const modal=el('div'); modal.id='modal'; root.appendChild(modal);
  const summary=el('div','overlay'); summary.id='summary'; root.appendChild(summary);
  const eidOv=el('div','overlay'); eidOv.id='eid'; root.appendChild(eidOv);
  const title=el('div'); title.id='title'; root.appendChild(title);

  function applyLang(r=root){ r.querySelectorAll('[data-t]').forEach(n=>n.textContent=t(n.dataset.t)); document.documentElement.lang=S.lang; }

  // ---------------- tap sound + press feedback ----------------
  root.addEventListener('pointerdown',e=>{ const b=e.target.closest('button,.btn,.hb,#tracker,.eid,#daypill'); if(b){ sfx('ui_tap'); } },{passive:true});
  // fewer always-visible controls: dock labels fold away after a few idle seconds (targets stay 52px)
  let lastInput=performance.now(); const wake=()=>{ lastInput=performance.now(); hud.classList.remove('idle'); }; addEventListener('pointerdown',wake,{passive:true,capture:true}); addEventListener('keydown',wake);

  // ---------------- economy ----------------
  const D0=()=>S.daily;
  // ---- THE ledger: all coin/pahala changes (ours and other modules') flow through here or are diffed in syncLedger ----
  let lastCoins=S.coins, lastPah=S.pahala;
  const fin=n=>Number.isFinite(+n)?+n:0;
  function emitLedger(){ ctx.emit('coins:change',{coins:S.coins,pahala:S.pahala,delta:S.coins-lastCoins}); }
  function addCoins(n,src){ n=fin(n); S.coins=Math.max(0,S.coins+n); emitLedger(); }
  function addPahala(n,src){ n=fin(n); S.pahala=Math.max(0,S.pahala+n); emitLedger(); }
  function spend(n){ n=fin(n); if(n<0||S.coins<n) return false; S.coins-=n; emitLedger(); return true; }
  function syncLedger(){ // detects every change (incl. direct mutation by masjid) -> daily stats + floating numbers
    const dc=S.coins-lastCoins, dp=S.pahala-lastPah; lastCoins=S.coins; lastPah=S.pahala;
    if(dc){ if(dc>0) D0().coins+=dc; float(dc>0?'+'+dc:''+dc,'#coinpill',dc>0?'#ffe27a':'#ffb0a0'); bump('coinpill'); }
    if(dp){ if(dp>0) D0().pahala+=dp; float((dp>0?'+':'')+dp,'#pahpill','#9ff3e4'); bump('pahpill'); }
  }
  function bump(id){ const e=document.getElementById(id); if(!e) return; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
  function float(txt,sel,color){ const e=$(sel); if(!e||!txt) return; const r=e.getBoundingClientRect(); const f=el('div','floatnum',txt); f.style.left=(r.left+r.width/2-10)+'px'; f.style.top=(r.bottom)+'px'; f.style.color=color; document.body.appendChild(f); setTimeout(()=>f.remove(),1300); }

  // ---------------- toasts ----------------
  const toasts=$('#toasts');
  // one toast at a time (queued) just above the hotbar; achievements slide in top-right. Screen centre stays clear.
  function queued(box,cls,ms,hold){ const q=[]; let busy=false;
    const next=()=>{ while(q.length&&q[0].stale&&(()=>{ try{ return q[0].stale(); }catch(e){ return false; } })()) q.shift();
      if(!q.length){ busy=false; return; } if(hold&&hold()){ busy=true; setTimeout(next,400); return; }
      const x=q.shift(); busy=true; const n=el('div',cls+' '+(x.kind||''),x.html); box.appendChild(n); if(box.id==='ach') hud.classList.add('ach-on');
      setTimeout(()=>{ n.classList.add('out'); setTimeout(()=>{ n.remove(); if(!box.children.length) hud.classList.remove('ach-on'); next(); },320); }, q.length?Math.max(1400,ms*.55):ms); };
    return (html,kind,key,stale)=>{ if(q.some(x=>x.key===key)) return; q.push({html,kind,key,stale}); if(q.length>6) q.shift(); if(!busy) next(); }; }
  const portrait=matchMedia('(max-width:640px) and (orientation:portrait)');
  // achievements wait while a panel/card is open, during the quiet first steps, and (phones) while a hint uses the slot
  const achHold=()=>!started||!!panel||cardOpen()||quiet()||(portrait.matches&&(!hint.classList.contains('hidden')||!$('#placebar').classList.contains('hidden')));
  // while a caption is showing it is the only bottom message: toasts wait (stale ones are dropped when it ends)
  const capHold=()=>{ try{ return !!care?.captionOn; }catch(e){ return false; } };
  const pushToast=queued(toasts,'toast clay',2600,capHold), pushAch=queued($('#ach'),'achv clay',3400,achHold);
  function toast(msg,icon='chat',kind,o){ if(!msg) return; pushToast(`${ic(icon)}<span>${msg}</span>`,kind,msg,typeof o?.stale==='function'?o.stale:null); }
  function ach(title,name,icon,rim){ pushAch(`<div class="ad" style="--rim:${rim||'#ffc83d'}">${ic(icon)}</div><div><small>${title}</small><b>${name}</b></div>`,'',title+name); }
  // one word for the blessing meter everywhere: other modules may still say "pahala" in their toasts
  const word=m=>typeof m==='string'?m.replace(/\bpahala\b/gi,t('bword')):m;
  ctx.on('toast',m=>{ if(typeof m==='string') toast(word(m)); else if(m) toast(word(m.msg||m.text),m.icon||'chat',m.kind); });

  // ---------------- top bar ----------------
  const tween={coins:S.coins,pahala:S.pahala};
  function renderTop(dt=1){
    tween.coins+=(S.coins-tween.coins)*Math.min(1,dt*10); tween.pahala+=(S.pahala-tween.pahala)*Math.min(1,dt*10);
    if(Math.abs(S.coins-tween.coins)<.5) tween.coins=S.coins; if(Math.abs(S.pahala-tween.pahala)<.5) tween.pahala=S.pahala;
    $('#coinN').textContent=fmt(tween.coins);
  }
  let lastClock='';
  const tbEl=()=>document.getElementById('topbar');
  function measureTop(){ const b=tbEl()?.getBoundingClientRect(); if(b&&b.height) hud.style.setProperty('--tb',Math.ceil(b.bottom)+'px'); }
  function renderClock(){
    const h=ctx.hour??8, hh=Math.floor(h)%24, mm=Math.floor((h%1)*60/10)*10; const s=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
    const night=h<5.5||h>=18.5; const key=s+night+S.day+S.daysToEid+S.lang+S.eidDone+S.pahala+(S.event?.id||''); if(key===lastClock) return; lastClock=key;
    const pr=ctx.modules.progress, wd=pr?.WEEKDAYS?.[pr.weekday(S.day)], ev=pr?.event?.();
    // one compact pill: day, weekday + clock, and one small badge (Eid close by > today's weather/event)
    const e=S.daysToEid, eidNear=e<=3;
    $('#clock').textContent=(wd?L(wd)+' · ':'')+s; $('#evb').innerHTML=eidNear?ic('crescent'):ev&&ev.id!=='cerah'?ic(ev.icon):''; $('#evb').classList.toggle('eidb',eidNear); $('#lvb').textContent=pr?pr.level():''; $('#pahpill').setAttribute('aria-label',t('berkah')+' · '+t('lvName',{l:pr?pr.level():1})); $('#coinpill').setAttribute('aria-label',t('coins'));
    $('#dayN').textContent=t('day')+' '+S.day; $('#dico').innerHTML=ic(night?'moon':'sun'); $('#daypill').classList.toggle('night',night);
    $('#daypill').setAttribute('aria-label',t('day')+' '+S.day+' · '+s+' · '+(e<=0?t('eidToday'):e===1?t('eidTmr'):t('eidIn',{n:e})));
  }

  // ---------------- hotbar ----------------
  const hotbar=$('#hotbar');
  // contextual strip: near the masjid the cleaning tools (sapu, pel) are out and the feed items fold into one button;
  // at the pen the items are out and the tools fold; elsewhere only the selected slot shows. Tap a fold to unfold all.
  const TOOLS=[{id:'sapu',icon:'broom'},{id:'pel',icon:'mop'}];
  let hotOpenUntil=0, hotMode='pen';
  hotbar.addEventListener('pointerdown',e=>{ if(hotbar.classList.contains('mini')&&!e.target.closest('.fold')){ hotOpenUntil=performance.now()+6000; applyHotMode(); } },true);
  // only the activities the player already has (gradual unlocks); everything is available when the module is absent
  const UNL=()=>ctx.modules.unlocks, isOn=id=>{ try{ const u=UNL(); return u?.isUnlocked?!!u.isUnlocked(id):true; }catch(e){ return true; } };
  const toolOn=id=>{ try{ const u=UNL(); return u?.tools?u.tools().includes(id):true; }catch(e){ return true; } };
  function updateHotbar(now){ const p=ctx.modules.characters?.pos||ctx.cameraRig?.target; let m=hotMode; const hasTools=TOOLS.some(x=>toolOn(x.id));
    if(p&&Number.isFinite(p.x)){ const dPen=Math.hypot(p.x-26,p.z-6), dM=Math.hypot(p.x,p.z+1); m=dPen<14?'pen':dM<18&&hasTools?'masjid':hasTools?'mini':'pen'; }
    if(m!==hotMode){ hotMode=m; } applyHotMode(now); }
  function applyHotMode(now=performance.now()){
    const open=!started||now<hotOpenUntil; const mode=open?'all':hotMode;
    hotbar.classList.toggle('mini',mode==='mini'); hotbar.dataset.mode=mode; }
  function renderHotbar(){
    hotbar.innerHTML='';
    const tools=TOOLS.filter(x=>toolOn(x.id)), items=SHOP.filter(x=>toolOn(x.id));
    if(!toolOn(S.tool)&&items.length){ S.tool=items[0].id; ctx.emit('tool:select',S.tool); return; }
    const isTool=tools.some(x=>x.id===S.tool);
    const selItem=items.find(x=>x.id===S.tool)||items[0]||SHOP[0], selTool=tools.find(x=>x.id===S.tool)||tools[0]||TOOLS[0];
    const pick=id=>{ if(S.tool!==id){ S.tool=id; ctx.emit('tool:select',id); } hotOpenUntil=Math.max(hotOpenUntil,performance.now()+4000); renderHotbar(); applyHotMode(); };
    const tg=el('div','hgrp tools'); for(const it of tools){ const b=el('button','hb tool'+(S.tool===it.id?' sel':''),`${ic(it.icon)}<span class="tl">${t(it.id)}</span>`); b.dataset.tool=it.id; b.title=t(it.id); b.setAttribute('aria-label',t(it.id)); b.onclick=()=>pick(it.id); tg.appendChild(b); }
    const ig=el('div','hgrp items'); for(const it of items){ const n=S.inventory[it.id]||0; const b=el('button','hb'+(S.tool===it.id?' sel':'')+(n<=0?' empty':''),`${ic(it.icon)}<em>${n}</em>`); b.dataset.tool=it.id; b.title=t(it.id); b.setAttribute('aria-label',t(it.id)); b.onclick=()=>pick(it.id); ig.appendChild(b); }
    const unfold=()=>{ hotOpenUntil=performance.now()+6000; applyHotMode(); };
    const fi=el('button','hb fold fi'+(!isTool?' sel':''),`${ic(selItem.icon)}<span class="dots"><i></i><i></i><i></i></span>`); fi.setAttribute('aria-label',t('more')); fi.onclick=unfold;
    const ft=el('button','hb fold ft tool'+(isTool?' sel':''),`${ic(selTool.icon)}<span class="dots"><i></i><i></i><i></i></span>`); ft.setAttribute('aria-label',t('more')); ft.onclick=unfold;
    hotbar.classList.toggle('notools',!tools.length);
    if(tools.length) hotbar.append(ft,tg,el('span','hsep'),ig,fi); else hotbar.append(ig); applyHotMode();
  }
  ctx.on('tool:select',()=>{ renderHotbar(); });
  ctx.on('inventory:change',renderHotbar);

  // ---------------- quests (logic lives in game/progress) ----------------
  const P=()=>ctx.modules.progress;
  let claimN=0, lastChip='', peekT=0;
  const qTitle=q=>L(q.title).replace('{n}',q.goal);
  const qs=()=>P()?.quests?.()||[];
  // ONE current goal on the HUD: a reward waiting > the task already under way > the next open one. Full list in Tugas.
  function currentGoal(list=qs()){
    const cl=list.filter(q=>q.done&&!q.claimed); if(cl.length) return { q:cl[0], claim:true };
    const open=list.filter(q=>!q.done); if(!open.length) return null;
    const started=open.filter(q=>q.prog>0).sort((a,b)=>b.prog/b.goal-a.prog/a.goal);
    return { q:started[0]||open[0], claim:false };
  }
  function renderTracker(){
    const list=qs(), g=currentGoal(list), cl=list.filter(q=>q.done&&!q.claimed);
    const tr=$('#tracker'); tr.classList.toggle('claim',!!g?.claim); tr.classList.toggle('rest',!g); tr.style.display=list.length?'':'none';
    const chip=g?`<span class="gi">${ic(g.claim?'check':g.q.icon)}</span><span class="qt">${g.claim?`<small>${t('goalClaim')}</small>`:''}${qTitle(g.q)}</span>${g.claim?ic('coin','gc'):`<span class="cnt">${g.q.prog}/${g.q.goal}</span>`}`
      :`<span class="gi">${ic('check')}</span><span class="qt">${t('restNow')}</span>`;
    if(chip!==lastChip){ if(lastChip){ tr.classList.add('peek'); clearTimeout(peekT); peekT=setTimeout(()=>tr.classList.remove('peek'),4000); } lastChip=chip; $('#qchip').innerHTML=chip; tr.setAttribute('aria-label',t('quests')+': '+tr.textContent); }
    claimN=cl.length; renderBookBadge();
  }
  function claim(id){ const q=P()?.claim(id); if(q){ renderTracker(); if(panel==='quest') renderPanel(); } }
  ctx.on('quest:done',q=>{ toast(t('doneTap'),'check','good'); sfx('chime'); });
  ctx.on('quest:update',()=>{ renderTracker(); if(panel==='quest') renderPanel(); });
  ctx.on('animal:happy',d=>{ addPahala(d?.reason==='cared'?3:1,'animal:happy'); });
  ctx.on('animal:sick',d=>toast((d?.animal?.name?d.animal.name+' ':'')+t('sick'),'heart','bad'));
  ctx.on('animal:recovered',d=>toast((d?.animal?.name?d.animal.name+' ':'')+t('recovered'),'heart','good'));
  ctx.on('build:placed',()=>{ S.stats.built++; if(panel==='build') renderPanel(); });
  ctx.on('build:complete',()=>{ ach(t('mosque'),t('masjidDone'),'dome'); sfx('bedug'); sfx('chime'); });
  ctx.on('coins:change',()=>{ syncLedger(); if(panel==='shop'||panel==='build') renderPanel(); });
  ctx.on('sticker:new',s=>{ if(!isOn('book')) return;   // stickers are still collected quietly; the Book arrives later
    ach(t('stickerNew'),L(s.name),s.icon,s.rim); if(panel!=='book') bookNew++; renderBookBadge(); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2,z:c.z},16); if(panel==='book') renderPanel(); });
  ctx.on('berkah:level',d=>{ if(panel!=='book') bookNew++; renderBookBadge(); lastClock=''; const f=()=>showLevelUp(d); f.soft=true; queueCard(f); });
  ctx.on('decor:change',()=>{ if(panel==='shop') renderPanel(); });
  ctx.on('year:new',()=>{ lastClock=''; renderAll(); });
  // one small dot on the Menu button when something inside waits (a reward, a sick animal, a new sticker or feature)
  let bookNew=0; const newTiles=new Set();
  const sickN=()=>(ctx.modules.animals?.list||[]).filter(x=>x.sick).length;
  const tileBadge=id=>id==='quest'?(claimN||''):id==='hewan'?(sickN()||''):id==='book'&&bookNew&&isOn('book')?'!':'';
  function renderBookBadge(){ const q=quiet();
    const any=!q&&panel!=='menu'&&(claimN>0||sickN()>0||(bookNew>0&&isOn('book'))||newTiles.size>0);
    $('#menuDot').classList.toggle('on',!!any); }

  // ---------------- panels ----------------
  let panel=null, shopTab='supply', bookTab='berkah';
  const ribbons={menu:['menu','menu'],shop:['bag','shopTitle'],build:['dome','buildTitle'],quest:['scroll','questTitle'],settings:['gear','setTitle'],book:['book','bookTitle'],hewan:['paw','hewan'],design:['palette','designT']};
  // shared helpers for the care HUD, Hewanku and Desain Masjid sub-modules
  const U={ ctx, S, L, t, ic, el, hud, root, sfx, toast:(m,i,k,o)=>toast(m,i,k,o), render:(f)=>renderPanel(f), closePanel:()=>closePanel(), openHewan:(id)=>openHewan(id),
    started:()=>started, panel:()=>panel, cardOpen:()=>cardOpen(), showGo:(...a)=>care.showGo(...a), walkGuide:(f)=>care.walkGuide(f) };
  const care=createCare(U), hewan=createHewan(U), design=createDesign(U);
  D.designT=design.ribbon;
  function openPanel(name,arg){
    if(!ribbons[name]) return; P()?.stopPlace?.();
    if(panel==='design'&&name!=='design') design.close();
    if(name==='hewan'&&panel!=='hewan'&&arg==null) hewan.reset();
    if(name==='hewan'&&arg!=null) hewan.open(arg);
    const wasDesign=panel==='design';
    panel=name; modal.classList.add('on'); modal.classList.toggle('clear',name==='design'); document.body.classList.toggle('design-on',name==='design');
    if(name==='design'&&!wasDesign) design.open(arg||undefined);
    newTiles.delete(name); renderPanel(true); if(name==='build') tutDone('build'); if(name==='book'){ bookNew=0; } renderBookBadge();
  }
  function closePanel(){ const was=panel; panel=null; modal.classList.remove('on','clear'); document.body.classList.remove('design-on'); modal.innerHTML=''; if(was==='design') design.close(); }
  function openHewan(id){ openPanel('hewan',id==null?undefined:id); }
  function openDesign(cat){ if(panel==='design'&&cat){ const cu=ctx.modules.custom; if(cat!==design.cat&&cu&&Object.keys(cu.draft||{}).length) cu.revert?.(); design.cat=cat; cu?.focus?.(cat); renderPanel(); return; } openPanel('design',cat); }
  modal.addEventListener('pointerdown',e=>{ if(e.target===modal&&panel!=='design') closePanel(); });
  function renderPanel(fresh){
    if(!panel) return; const [icon,tk]=ribbons[panel]; const scroll=$('.body',modal)?.scrollTop||0, oscroll=$('.dopts',modal)?.scrollLeft||0, tscroll=$('.dtabs',modal)?.scrollLeft||0;
    const body={menu:menuHTML,shop:shopHTML,build:buildHTML,quest:questHTML,settings:settingsHTML,book:bookHTML,hewan:hewan.html,design:design.html}[panel]();
    const money=panel==='shop'||panel==='build'||panel==='design';
    modal.innerHTML=`<div class="sheet clay ${money?'money':''} ${panel==='design'?'dsheet':''} ${panel==='hewan'?'hsheet':''} ${panel==='menu'?'msheet':''}" style="${fresh?'':'animation:none'}"><div class="ribbon clay teal">${ic(icon)}<span>${t(tk)}</span></div>${money?`<div class="hcoin">${ic('coin')}<b>${fmt(S.coins)}</b></div>`:''}<button class="x clay gold" id="pX" aria-label="${t('close')}">${ic('close')}</button><div class="body">${body}</div></div>`;
    if(!fresh){ $('.body',modal).scrollTop=scroll; const o=$('.dopts',modal); if(o) o.scrollLeft=oscroll; }
    const tb=$('.dtabs',modal); if(tb){ tb.scrollLeft=tscroll; if(fresh){ const on=tb.querySelector('.on'); if(on) tb.scrollLeft=Math.max(0,on.offsetLeft-tb.clientWidth/2+on.offsetWidth/2); } }
    $('#pX',modal).onclick=closePanel; bindPanel();
  }
  // ---- Menu: big friendly tiles, only for what the player already has (locked features are simply absent) ----
  const TILES=[['quest','scroll','tugasTile','tugas'],['hewan','paw','hewan','hewan'],['build','dome','bangun','build'],['shop','bag','toko','shop'],['design','palette','desainTile','design'],['book','book','stikerTile','book']];
  const tileOn=([id,,,need])=>isOn(need)&&(id!=='design'||!!ctx.modules.custom);
  function menuHTML(){
    return `<div class="mgrid">${TILES.filter(tileOn).map(([id,icon,k],i)=>{ const b=tileBadge(id);
      return `<button class="mtile clay ${id==='build'?'teal':''}" id="mt-${id}" data-open="${id}" style="animation-delay:${i*.04}s">${ic(icon)}<b>${t(k)}</b>${b?`<span class="badge">${b}</span>`:''}${newTiles.has(id)?`<em class="newtag">${t('newTag')}</em>`:''}</button>`; }).join('')}</div>`;
  }
  const coinChip=()=>`<span class="pill clay" style="padding:.25em .8em .25em .4em">${ic('coin')}<b>${fmt(S.coins)}</b></span>`;
  const tabs=(cur,list,attr)=>`<div class="tabs" style="--n:${list.length}">${list.map(([id,k,i])=>`<button data-${attr}="${id}" class="${cur===id?'on':''}">${ic(i)}<span>${t(k)}</span></button>`).join('')}</div>`;
  const price=(n,old)=>`<span class="price">${ic('coin')}${old&&old!==n?`<s>${old}</s>`:''}${n}</span>`;
  function shopHTML(){
    const an=ctx.modules.animals, pr=P(), mul=pr?.priceMul?.('supply')??1;
    let body=''; if(shopTab==='decor'&&!isOn('decor')) shopTab='supply';
    if(shopTab==='supply') body=(mul<1?`<div class="sale">${ic('bag')}${t('sale')}</div>`:'')+'<div class="grid">'+SHOP.map(it=>{ const p=Math.round(it.price*mul); return `<div class="card"><div class="big">${ic(it.icon)}</div><h5>${t(it.id)} ×${it.qty}</h5><p>${t(it.id+'D')}</p><span class="own">${t('owned')} ${S.inventory[it.id]||0}</span><button class="btn gold ${S.coins>=p?'':'off'}" data-buy="${it.id}">${t('buy')} ${price(p,it.price)}</button></div>`; }).join('')+'</div>';
    else if(shopTab==='animal'&&an?.price) body='<div class="grid">'+['goat','sheep','cow'].map(k=>{ const p=an.price(k), ok=an.canAdd?an.canAdd(k):true, bp=Math.round(p*.5);
      return `<div class="card"><div class="big">${ic(k==='cow'?'cow':'goat')}</div><h5>${t(k==='goat'?'goats':k==='sheep'?'sheeps':'cows')}</h5><p>${t(k+'D')}</p><div class="duo"><button class="btn gold ${ok&&S.coins>=p?'':'off'}" data-animal="${k}">${t('buy')} ${price(p)}</button><button class="btn teal ${ok&&S.coins>=bp?'':'off'}" data-animal="${k}:baby">${t('baby')} ${price(bp)}</button></div>${ok?'':`<span class="own lk">${t('penFull')}</span>`}</div>`; }).join('')+'</div>';
    else if(shopTab==='decor'&&pr){
      const card=k=>{
        const zl=k.zoneLabel&&k.zone==='both'?`<span class="ztag z-${k.zone||'plaza'}">${ic(k.zone==='masjid'?'dome':k.zone==='both'?'flag':'pot')}${L(k.zoneLabel)}</span>`:'';
        if(!k.unlocked) return `<div class="card lockd"><div class="big">${ic(k.icon)}</div><h5>${L(k.name)}</h5><p>${L(k.desc)}</p><span class="own lk">${ic('lock')}${t('unlockAt',{l:k.lv})}</span></div>`;
        return `<div class="card">${zl}<div class="big">${ic(k.icon)}</div><h5>${L(k.name)}</h5><p>${L(k.desc)}</p>${k.owned?`<span class="own">${t('owned')} ${k.owned}</span><button class="btn teal" data-dput="${k.id}">${ic('pot')}${t('put')}</button>`:`<button class="btn gold ${S.coins>=k.price?'':'off'}" data-dbuy="${k.id}">${t('buy')} ${price(k.price)}</button>`}${k.placed?`<div class="plc">${t('onPlaza')} ${k.placed} · <button class="btn link small" data-dstore="${k.id}">${t('store')}</button></div>`:''}</div>`; };
      const ks=pr.decorKinds(), isM=k=>k.zone==='masjid'||(!k.zone&&Array.isArray(k.fits)&&!k.fits.includes('ground'));
      const mk=ks.filter(isM), pk=ks.filter(k=>!isM(k));
      const sec=(icon,key,list)=>list.length?`<h4 class="dsec">${ic(icon)}<span>${t(key)}</span></h4><div class="grid">${list.map(card).join('')}</div>`:'';
      body=mk.length?sec('dome','tabMasjid',mk)+sec('pot','tabPlaza',pk):'<div class="grid">'+ks.map(card).join('')+'</div>'; }
    return tabs(shopTab,[['supply','tabSupply','hay'],...(an?.price?[['animal','tabAnimal','goat']]:[]),...(pr&&isOn('decor')?[['decor','tabDecor','lantern']]:[])],'stab')+body;
  }
  function parts(){
    const m=ctx.modules.masjid; const st=m?.stages;
    if(Array.isArray(st)&&st.length) return st.map((s,i)=>{ const f=PARTS.find(p=>p.id===(s.id??s.name)); return {id:s.id??s.name??i,name:(S.lang==='en'&&s.nameEn)||s.name||s.label||s.id||('#'+(i+1)),cost:s.cost??s.price??f?.cost??40,desc:(S.lang==='en'&&s.descEn)||s.desc||s.description||(f?L(f.desc):''),raw:true}; });
    return PARTS.map(p=>({id:p.id,name:L(p.name),cost:p.cost,desc:L(p.desc)}));
  }
  const mStage=()=>{ const m=ctx.modules.masjid; return m&&typeof m.stage==='number'?m.stage:(S.masjid.stage|0); };
  function buildHTML(){
    const ps=parts(), st=Math.min(mStage(),ps.length);
    return (ctx.modules.custom&&isOn('design')?design.entryHTML():'')+`<div class="sub"><div style="display:flex;gap:.6em;align-items:center;flex:1"><span>${t('mosque')} ${st}/${ps.length}</span><div class="prog"><i style="width:${st/ps.length*100}%"></i></div></div></div><div class="grid">`+
      ps.map((p,i)=>{ const dn=i<st, lk=i>st, can=!lk&&S.coins>=p.cost;
        return `<div class="card ${dn?'done':''}"><div class="big">${ic(dn?'check':lk?'lock':i%3==0?'dome':i%3==1?'flag':'hammer')}</div><h5>${p.name}</h5><p>${p.desc||''}</p>${dn?`<span class="own">${t('built')}</span>`:lk?`<span class="own lk">${t('locked')}</span>`:`<button class="btn cl ${can?'teal':''} ${can?'':'off'}" data-place="${p.id}">${price(p.cost)} ${t('place')}</button>`}</div>`; }).join('')+'</div>';
  }
  function questHTML(){
    const pr=P(), ev=pr?.event?.(), wd=pr?.WEEKDAYS?.[pr.weekday(S.day)];
    return `<div class="sub"><span>${t('day')} ${S.day}${wd?' · '+L(wd):''}</span><span style="display:flex;gap:.4em;align-items:center">${ic('calendar')}${t('daysLeft',{n:Math.max(0,S.daysToEid)})}</span></div>`+
      (ev?`<div class="evcard">${ic(ev.icon)}<div><b>${L(ev.name)}</b><small>${L(ev.desc)}</small></div></div>`:'')+
      qs().map(q=>`<div class="qrow ${q.done?'done':''} ${q.special?'sp':''}"><div class="qi">${ic(q.done?'check':q.icon)}</div><div class="mid">${q.special?`<em class="tagsp">${ic('star')}${t('special')}</em>`:''}<b>${qTitle(q)}</b><div style="display:flex;gap:.6em;align-items:center"><div class="prog" style="height:.7em"><i style="width:${q.prog/q.goal*100}%"></i></div><small>${q.prog}/${q.goal}</small></div></div><div class="rw"><span>${ic('coin')}${q.coins}</span><span>${ic('pahala')}${q.pahala}</span></div>${q.done&&!q.claimed?`<button class="btn teal claim" data-claim="${q.id}">${t('claim')}</button>`:q.claimed?`<div class="got">${ic('check')}${t('claimed')}</div>`:''}</div>`).join('')+
      `<div class="streakline">${ic('flame')}${S.streak?t('streak',{n:S.streak}):t('streakHint')}</div>`;
  }
  function bookHTML(){
    const pr=P(); if(!pr) return '';
    const li=pr.levelInfo(); let body=''; if(bookTab==='stickers'&&!isOn('book')) bookTab='berkah';
    if(bookTab==='berkah'){
      body=`<div class="lvhead"><div class="lvbig">${ic('pahala')}<b>${li.lv}</b></div><div style="flex:1;min-width:0"><b>${t('lvName',{l:li.lv})}</b><div class="prog"><i style="width:${li.pct*100}%"></i></div><small>${li.next?t('nextLv',{n:li.next-li.pahala,l:li.lv+1}):t('maxLv')}</small><small class="tot">${ic('pahala')}${t('lvTotal',{n:fmt(li.pahala)})}</small></div></div><div class="lvlist">`+
        pr.LEVELS.map((_,i)=>{ const l=i+1, u=pr.unlocksAt(l); if(!u.length) return ''; const got=li.lv>=l;
          return `<div class="lvrow ${got?'got':''}"><span class="lvn">${l}</span><div class="chips">${u.map(x=>`<span class="uchip">${x.swatch?`<i class="usw" style="background:${x.swatch}"></i>`:ic(x.icon)}${x.catName&&x.swatch?L(x.catName)+': ':''}${L(x.name)}</span>`).join('')}</div>${got?ic('check'):ic('lock')}</div>`; }).join('')+'</div>';
    } else if(bookTab==='stickers'){
      const st=pr.stickers(), n=st.filter(s=>s.got).length;
      body=`<div class="sub"><span>${n}/${st.length}</span><div class="prog"><i style="width:${n/st.length*100}%"></i></div></div><div class="stk">`+st.map(s=>`<div class="sticker ${s.got?'got':''}" style="--rim:${s.rim}"><div class="disc">${ic(s.icon)}</div><b>${L(s.name)}</b>${s.got?'':`<small>${s.how?L(s.how):''}</small>`}</div>`).join('')+'</div>';
    } else {
      body='<div class="grid outfits">'+pr.outfits().map(o=>{ const hx=n=>'#'+n.toString(16).padStart(6,'0');
        return `<div class="card ${o.worn?'done':''} ${o.unlocked?'':'lockd'}"><div class="big swatch"><svg viewBox="0 0 48 48" class="ic"><path d="M16 5l-11 7 4 9 5-3v25h20V18l5 3 4-9-11-7c-1 4-4 6-8 6s-7-2-8-6z" fill="${hx(o.look.koko)}" stroke="#7a4a22" stroke-width="2.4"/><rect x="14" y="32" width="20" height="11" fill="${hx(o.look.sarong)}" stroke="#7a4a22" stroke-width="2"/><path d="M17 4h14v4H17z" fill="${hx(o.look.peci)}"/></svg></div><h5>${L(o.name)}</h5>${o.worn?`<span class="own">${t('wearing')}</span>`:o.unlocked?`<button class="btn teal" data-outfit="${o.id}">${t('wear')}</button>`:`<span class="own lk">${ic('lock')}${t('unlockAt',{l:o.lv})}</span>`}</div>`; }).join('')+'</div>';
    }
    return tabs(bookTab,[['berkah','tabBerkah','pahala'],...(isOn('book')?[['stickers','tabStickers','star']]:[]),['outfit','tabOutfit','shirt']],'btab')+body;
  }
  function settingsHTML(){
    const m=audio()?.muted??S.settings.mute;
    return `<div class="set"><span style="display:flex;gap:.6em;align-items:center">${ic(m?'mute':'sound')}${t('sound')}</span><button class="sw ${m?'':'on'}" id="swMute"></button></div>
    <div class="set"><span>${t('music')}</span><input type="range" id="rMus" min="0" max="1" step=".05" value="${S.settings.music}"></div>
    <div class="set"><span>${t('sfx')}</span><input type="range" id="rSfx" min="0" max="1" step=".05" value="${S.settings.sfx}"></div>
    <div class="set"><span>${t('lang')}</span><div class="seg"><button data-lang="id" class="${S.lang==='id'?'on':''}">Indonesia</button><button data-lang="en" class="${S.lang==='en'?'on':''}">English</button></div></div>
    <div class="danger"><div class="set"><span>${t('danger')}</span><button class="hold" id="bReset"><i></i><span>${t('holdReset')}</span></button></div></div>`;
  }
  const noCoins=b=>{ toast(t('noCoins'),'coin','bad'); b.classList.add('shake'); setTimeout(()=>b.classList.remove('shake'),400); };
  function bindPanel(){
    const on=(sel,fn)=>modal.querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
    on('[data-open]',b=>openPanel(b.dataset.open));
    on('[data-stab]',b=>{ shopTab=b.dataset.stab; renderPanel(); });
    on('[data-btab]',b=>{ bookTab=b.dataset.btab; renderPanel(); });
    on('[data-animal]',b=>{ const [k,bb]=b.dataset.animal.split(':'); const an=ctx.modules.animals; if(!an) return; if(an.canAdd&&!an.canAdd(k)){ toast(t('penFull'),'goat','bad'); return; }
      const p=Math.round(an.price(k)*(bb?.5:1)); if(!spend(p)) return noCoins(b); const r=bb?an.add(k,{baby:true}):an.add(k); if(!r){ addCoins(p,'refund'); toast(t('penFull'),'goat','bad'); return; } sfx('coin'); sfx('pop'); renderPanel(); });
    on('[data-claim]',b=>claim(b.dataset.claim));
    on('[data-buy]',b=>{ const it=SHOP.find(i=>i.id===b.dataset.buy), p=Math.round(it.price*(P()?.priceMul?.('supply')??1)); if(!spend(p)) return noCoins(b);
      S.inventory[it.id]=(S.inventory[it.id]||0)+it.qty; ctx.emit('inventory:change',S.inventory); sfx('coin'); sfx('pop'); renderHotbar(); renderPanel(); });
    on('[data-dbuy]',b=>{ if(!P().buyDecor(b.dataset.dbuy)) return noCoins(b); sfx('pop'); renderPanel(); });
    on('[data-dput]',b=>{ if(P().startPlace(b.dataset.dput)) closePanel(); });
    on('[data-dstore]',b=>{ P().storeDecor(b.dataset.dstore); renderPanel(); });
    on('[data-outfit]',b=>{ if(P().setOutfit(b.dataset.outfit)) renderPanel(); });
    on('[data-place]',b=>{ const p=parts().find(x=>String(x.id)===b.dataset.place); placePart(p); });
    on('[data-design]',()=>openPanel('design'));
    if(panel==='hewan') hewan.bind(modal); if(panel==='design') design.bind(modal);
    $('#swMute',modal)&&($('#swMute',modal).onclick=()=>{ const a=audio(); const m=!(a?.muted??S.settings.mute); S.settings.mute=m; a?.setMuted?.(m); if(!m) sfx('chime'); renderPanel(); });
    $('#rMus',modal)&&($('#rMus',modal).oninput=e=>{ S.settings.music=+e.target.value; audio()?.setMusic?.(S.settings.music); });
    $('#rSfx',modal)&&($('#rSfx',modal).oninput=e=>{ S.settings.sfx=+e.target.value; audio()?.setSfx?.(S.settings.sfx); });
    for(const id of ['#rMus','#rSfx']) $(id,modal)&&($(id,modal).onchange=()=>sfx('pop'));
    on('[data-lang]',b=>{ S.lang=b.dataset.lang; applyLang(); lastClock=''; renderAll(); renderPanel(); });
    const r=$('#bReset',modal); if(r){ let t0=0,raf=0; const bar=r.querySelector('i'); const stop=()=>{ cancelAnimationFrame(raf); t0=0; bar.style.width='0'; };
      const tick=()=>{ const p=(performance.now()-t0)/1200; bar.style.width=Math.min(100,p*100)+'%'; if(p>=1){ reset(); location.reload(); } else raf=requestAnimationFrame(tick); };
      r.addEventListener('pointerdown',e=>{ e.preventDefault(); t0=performance.now(); raf=requestAnimationFrame(tick); }); for(const ev of ['pointerup','pointerleave','pointercancel']) r.addEventListener(ev,stop); }
  }
  function placePart(p){
    if(!p||S.coins<p.cost) return; const m=ctx.modules.masjid; const fn=m?.place||m?.api?.place;
    if(fn){ let ok; try{ ok=fn.call(m?.api&&m.api.place===fn?m.api:m,p.id); }catch(e){ console.warn(e); ok=false; } if(ok===false){ return; } } // masjid charges coins/pahala and emits build:placed itself
    else { if(!spend(p.cost)) return; S.masjid.parts[p.id]=true; S.masjid.stage=(S.masjid.stage|0)+1; ctx.emit('build:placed',{id:p.id}); if(S.masjid.stage>=parts().length) ctx.emit('build:complete',{}); }
    sfx('build'); const c=camTarget(); fx()?.burst('dust',{x:c.x,y:c.y,z:c.z},12); renderPanel();
  }
  // decoration placement bar
  const placebar=$('#placebar');
  ctx.on('decor:placing',d=>{
    if(!d){ placebar.classList.add('hidden'); return; } const k=P()?.DECOR_KINDS.find(x=>x.id===d.kind);
    const pk=d.masjid||d.hall?'placeHintM':(k&&k.zone&&k.zone!=='plaza'?'placeHintP':'placeHint');
    placebar.innerHTML=`${ic(k?.icon||'pot')}<span class="tx">${t(pk,{k:k?L(k.name):''})}</span><button class="btn teal" id="plAuto">${t('auto')}</button><button class="x" id="plX" aria-label="${t('cancel')}">${ic('close')}</button>`;
    placebar.classList.remove('hidden'); $('#plAuto').onclick=()=>{ if(!P().placeAuto()) toast(t('noSlot'),'pot','bad'); }; $('#plX').onclick=()=>P().stopPlace();
  });
  // goal chip: a waiting reward is collected right here, otherwise it opens the full task list
  $('#tracker').onclick=()=>{ const g=currentGoal(); if(g?.claim){ claim(g.q.id); return; } openPanel('quest'); };
  $('#menuBtn').onclick=()=>panel==='menu'?closePanel():openPanel('menu'); $('#setBtn').onclick=()=>openPanel('settings'); $('#pahpill').onclick=()=>{ bookTab='berkah'; openPanel('book'); };
  $('#daypill').onclick=()=>{ const ev=P()?.event?.(), e=S.daysToEid; toast(`${ev?L(ev.name)+' · ':''}${e<=0?t('eidToday'):e===1?t('eidTmr'):t('eidIn',{n:e})}`,ev&&ev.id!=='cerah'?ev.icon:'crescent'); };
  addEventListener('keydown',e=>{ if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if(e.key==='Escape'){ closePanel(); P()?.stopPlace?.(); } const k={t:'quest',b:'build',p:'shop',k:'book',h:'hewan',g:'design',m:'menu'}[e.key.toLowerCase()]; const need={shop:'shop',design:'design'}[k]; if(k&&!e.repeat&&started&&!cardOpen()&&(!need||isOn(need))) (panel===k?closePanel():openPanel(k)); });

  // ---------------- tutorial hints ----------------
  const hint=$('#hint'), ptr=$('#ptr'); const hintSteps=[['h1','move'],['h2','fed'],['h3','build'],['h4','end']]; let hStep=0, hTimer=0, moveT=0;
  // first ~30s: no stickers/badges/level cards until the player has walked and fed an animal (capped so nothing waits forever)
  const quiet=()=>!S.tutDone&&hStep<2&&(!started||performance.now()-startT<120000);
  const joyOn=()=>{ const e=document.getElementById('mb-joy'); return e&&e.offsetWidth>0?e:null; };
  function showHint(){ if(S.tutDone||!started){ hint.classList.add('hidden'); hud.classList.remove('hint-on'); ptr.style.display='none'; return; } const s=hintSteps[hStep]; if(!s){ S.tutDone=true; hint.classList.add('hidden'); hud.classList.remove('hint-on'); ptr.style.display='none'; return; }
    $('#hintTx').textContent=t(s[0]==='h1'&&!joyOn()?'h1k':s[0]); hint.classList.remove('hidden'); hud.classList.add('hint-on'); hint.style.animation='none'; void hint.offsetWidth; hint.style.animation=''; hTimer=0; moveT=0; }
  function tutDone(ev){ if(hintSteps[hStep]?.[1]===ev){ hStep++; renderBookBadge(); ptr.style.display='none'; setTimeout(showHint,ev==='end'?0:900); } }
  function placePtr(){ const s=hintSteps[hStep]?.[1]; const tgt=s==='move'?joyOn():s==='fed'?document.getElementById('mb-act'):s==='build'?document.getElementById(panel==='menu'?'mt-build':'menuBtn'):null;
    if(!tgt||hint.classList.contains('hidden')){ ptr.style.display='none'; return; } const r=tgt.getBoundingClientRect(); if(!r.width){ ptr.style.display='none'; return; } ptr.style.display='block'; ptr.style.left=(r.left+r.width/2)+'px'; ptr.style.top=(r.top+r.height/2)+'px'; }
  $('#hintX').onclick=()=>{ S.tutDone=true; renderBookBadge(); hint.classList.add('hidden'); hud.classList.remove('hint-on'); ptr.style.display='none'; };
  ctx.on('animal:fed',()=>tutDone('fed'));

  // ---------------- cards: day summary, level-up, Eid (queued so they never stack) ----------------
  const cardQ=[];
  const cardOpen=()=>summary.classList.contains('on')||eidOv.classList.contains('on');
  // feature cards are extra gentle: never in the tutorial's first steps, never over an open panel, and spaced apart
  const UNLOCK_GAP=25000; let lastUnlockT=-1e9;
  const cardWaits=f=>(f.soft&&quiet())||(f.unlock&&(!!panel||performance.now()-lastUnlockT<UNLOCK_GAP));
  function nextCard(){ if(!started||cardOpen()||!cardQ.length) return; const i=cardQ.findIndex(f=>!cardWaits(f)); if(i>=0) cardQ.splice(i,1)[0](); }
  function queueCard(fn){ cardQ.push(fn); nextCard(); }
  function closeCard(o){ o.classList.remove('on'); if(o===eidOv) document.body.classList.remove('eid-on'); sfx('pop'); setTimeout(nextCard,250); }
  function statHTML(icon,val,label,i){ return `<div class="stat" style="animation-delay:${.12*i+.2}s">${ic(icon)}<div><b>${val}</b><small>${label}</small></div></div>`; }
  ctx.on('day:summary',d=>{ lastClock=''; renderAll(); if(S.daysToEid===3) toast(t('eidSoon'),'crescent','good'); queueCard(()=>showSummary(d)); });
  function showSummary(d){
    const s=d.stats||{}, pr=P(), ev=pr?.event?.(), wd=pr?.WEEKDAYS?.[d.weekday??0];
    summary.innerHTML=`<div class="sumcard clay"><div class="moonbig">${ic(d.eid?'crescent':'sun')}</div><h2>${t('sumTitle',{n:d.day})}</h2><div class="sm">${t('sumSub')}</div>
      <div class="stats">${statHTML('scroll',`${d.doneN||0}/${d.total||0}`,t('tasksDone'),0)}${statHTML('hay',s.fed||0,t('fed'),1)}${s.clean!=null&&ctx.modules.care?statHTML('sparkle',(s.clean|0)+'%',t('clean'),2):statHTML('heart',s.happy||0,t('happy'),2)}${statHTML('adzan',s.adzan||0,t('adzanN'),3)}${statHTML('imam',s.imam||0,t('imamN'),4)}${statHTML('people',s.visitors||0,t('visitors'),5)}${statHTML('coin',s.coins||0,t('earned'),6)}${statHTML('pahala',s.pahala||0,t('pahalaE'),7)}</div>
      <div class="streakline big ${d.streak?'':'zero'}">${ic('flame')}<span>${d.streak?t('streak',{n:d.streak}):t('streak0')}</span>${d.streakBonus?`<em>+${d.streakBonus} ${ic('coin')}</em>`:''}</div>
      ${d.autoCoins?`<div class="autoc">${ic('check')}${t('autoClaim')} (+${d.autoCoins})</div>`:''}
      ${ev?`<div class="evcard"><small class="evday">${t('tomorrow')}: ${t('day')} ${S.day}${wd?' · '+L(wd):''}</small>${ic(ev.icon)}<div><b>${L(ev.name)}</b><small>${L(ev.desc)}</small></div></div>`:''}
      <div class="sm">${S.daysToEid>0?t('daysLeft',{n:S.daysToEid})+' '+t('toEid'):t('eidToday')}</div>
      <button class="btn teal" id="sumGo" style="font-size:1.1em">${d.eid?t('toEidBtn'):t('next',{n:S.day})}</button></div>`;
    summary.classList.add('on'); sfx('chime'); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2,z:c.z},24);
    $('#sumGo').onclick=()=>{ closeCard(summary); if(d.eid) cardQ.unshift(showEid); else toast(t('newday')+' · '+t('day')+' '+S.day,'sun'); };
  }
  function showLevelUp(d){
    summary.innerHTML=`<div class="sumcard clay lvup"><div class="moonbig">${ic('pahala')}</div><h2>${t('lvUp')}</h2><div class="sm">${t('lvUpSub',{l:d.lv})}</div>
      <div class="lvbig center">${ic('pahala')}<b>${d.lv}</b></div>
      <div class="chips center">${(d.unlocks||[]).map((u,i)=>`<span class="uchip big" style="animation-delay:${.3+i*.15}s">${u.swatch?`<i class="usw" style="background:${u.swatch}"></i>`:ic(u.icon)}${u.catName&&u.swatch?L(u.catName)+': ':''}${L(u.name)}</span>`).join('')||`<span class="uchip">${ic('star')}${t('moreSoon')}</span>`}</div>
      <button class="btn gold" id="lvGo" style="font-size:1.1em">${t('yay')}</button></div>`;
    summary.classList.add('on'); sfx('chime'); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2.2,z:c.z},30);
    $('#lvGo').onclick=()=>closeCard(summary);
  }
  // ---------------- gradual features: one cozy card per new activity ----------------
  const TILE_OF={shop:'shop',book:'book',design:'design'};
  ctx.on('unlock:new',f=>{ if(!f?.id) return; if(TILE_OF[f.id]) newTiles.add(TILE_OF[f.id]);
    renderAll(); renderBookBadge(); if(panel) renderPanel();
    // queued after whatever the same moment announces (e.g. the day summary), so the order reads naturally
    setTimeout(()=>{ const c=()=>showUnlock(f); c.soft=true; c.unlock=true; queueCard(c); },0); });
  function showUnlock(f){
    summary.innerHTML=`<div class="sumcard clay unlockc"><div class="moonbig">${ic(f.icon||'star')}</div><h2>${t('newFeat',{f:L(f.name)})}</h2><div class="sm how">${L(f.how)}</div>
      <button class="btn teal" id="ulGo" style="font-size:1.1em">${t('okGo')}</button></div>`;
    summary.classList.add('on'); sfx('chime'); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2,z:c.z},20);
    $('#ulGo').onclick=()=>{ lastUnlockT=performance.now(); closeCard(summary); };
  }
  const KG={goat:30,sheep:35,cow:280};
  let eidTimer=0;
  const starsHTML=n=>'<span class="stars">'+[1,2,3].map(i=>`<svg class="ic" style="width:1.15em;height:1.15em;opacity:${i<=n?1:.25}"><use href="#i-star"/></svg>`).join('')+'</span>';
  function showEid(){
    const pr=P(); let R=pr?.celebrateEid?.();
    if(!R){ const an=[['goat',1],['sheep',2],['cow',1]].flatMap(([k,n])=>Array.from({length:n},()=>({kind:k,name:'',w:KG[k],stars:2,packs:Math.round(KG[k]*.9)}))); const packs=an.reduce((s,a)=>s+a.packs,0); R={animals:an,packs,third:Math.round(packs/3),coins:0,pahala:0}; }
    const nm={goat:t('goats'),sheep:t('sheeps'),cow:t('cows')}, names=R.animals.map(a=>a.name).filter(Boolean);
    const nameStr=names.length>3?names.slice(0,3).join(', ')+' …':names.join(', ')||t('animals');
    const CC=['#ff5d73','#ffc447','#2fd0b5','#6cc4ff','#c08bff','#ffffff','#9be564'];
    // CSS-only confetti (transform-only, compositor friendly) layered ABOVE the card; shapes: strip, dot, ketupat diamond
    const confetti=Array.from({length:32},(_,i)=>`<i class="${['','dot','kt'][i%3]}" style="left:${(i*37+11)%100}%;--c:${CC[i%CC.length]};--d:${3.4+(i%5)*.55}s;--dl:${-((i*.73)%4.2).toFixed(2)}s;--x:${((i%7)-3)*4}vw;--r:${(i%2?1:-1)*(360+i*25)}deg"></i>`).join('');
    const bunt=`<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M-10 6Q200 52 410 6" stroke="#8a5a2c" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/>${Array.from({length:15},(_,i)=>{ const x=i*27+11, tt=x/400, y=6+(1-(2*tt-1)**2)*23; const c=['#e8483f','#ffc83d','#35b5a5','#fff6e0','#2f9d5a'][i%5]; return `<path d="M${x-8} ${y}L${x+8} ${y+.6}L${x} ${y+17}z" fill="${c}" stroke="#7a4a22" stroke-width="1"/>`; }).join('')}</svg>`;
    eidOv.innerHTML=`<div class="eidcard clay"><div class="moonbig"><i class="ring"></i><i class="ring r2"></i>${ic('crescent')}</div>
      <div class="ehead"><h1>${t('eidTitle')}</h1><div class="gr">${t('eidGreet')}<small>${t('eidGloss')}</small></div></div>
      <div class="ebody"><div class="ecol">
        <div class="thanks">${ic('heart')}<span>${t('thanks',{names:nameStr})}</span></div>
        <div class="dist">${[['people',t('dFam')],['dome',t('dNeigh')],['heart',t('dPoor')]].map(([i,l])=>`<div class="stat">${ic(i)}<b>${R.third}</b><small>${t('packs')}<br>${l}</small></div>`).join('')}</div>
        ${R.coins||R.pahala?`<div class="rwrow"><span>${t('rewardEid')}</span><b>${ic('coin')}+${R.coins}</b><b>${ic('pahala')}+${R.pahala}</b></div>`:''}
      </div><div class="ecol">
        <div class="alist">${R.animals.map(a=>`<div class="arow">${ic(a.kind==='cow'?'cow':'goat')}<span class="an">${a.name||nm[a.kind]}</span><span class="aw">${Math.round(a.w)} kg</span>${starsHTML(a.stars)}</div>`).join('')}</div>
        ${R.young?.length?`<div class="sm young">${ic('heart')}<span>${t('young',{names:R.young.join(', ')})}</span></div>`:''}
        <div class="sm carry">${t('eidCarry')}</div>
      </div></div>
      <div class="btnrow"><button class="btn gold" id="eKeep">${t('nextYearBtn')}</button></div></div>
      <div class="eidfx" aria-hidden="true">${confetti}</div><div class="ebunt" aria-hidden="true">${bunt}</div>
      <div class="eidintro" aria-hidden="true"><i class="burst"></i><i class="burst b2"></i>${ic('crescent')}<b>${t('eidTitle')}</b><small>${t('eidSub')}</small></div>`;
    eidOv.classList.add('on'); document.body.classList.add('eid-on'); P()?.stopPlace?.(); if(panel) closePanel(); save(S);
    // the intro splash only animates opacity away; it is also removed by timer so a stalled animation can never cover the card
    const intro=$('.eidintro',eidOv); if(Q.has('introhold')) intro.style.animation='none'; else setTimeout(()=>intro?.remove(),1900);
    $('#eKeep').onclick=()=>{ closeCard(eidOv); eidTimer=0; if(pr?.newYear) pr.newYear(); else { S.eidDone=false; S.daysToEid=10; S.stats.years++; } lastClock=''; sfx('chime'); renderAll(); save(S); toast(t('newBatch'),'goat','good'); setTimeout(()=>toast(t('nextYear'),'calendar','good'),1200); };
    sfx('bedug'); setTimeout(()=>sfx('chime'),900); setTimeout(()=>sfx('bedug'),1600); eidTimer=0.01; confettiWave();
  }
  function confettiWave(){ const c=camTarget(); fx()?.confettiRain?.({x:c.x,y:c.y,z:c.z},140,10); fx()?.burst('confetti',{x:c.x,y:c.y,z:c.z},80); }
  const overlayOpen=()=>!started||cardOpen()||!!panel;

  // ---------------- title screen ----------------
  let started=false, startT=0; const hasSave=S.day>1||S.pahala>0;
  function buildTitle(){
    const hills=(c1,c2,y,amp,seed)=>{ let d=`M0 ${y}`; for(let i=0;i<=8;i++){ d+=` Q ${i*200+100} ${y-amp*(((i*seed)%3)+.6)} ${i*200+200} ${y}`; } return `<path d="${d} V900 H0z" fill="url(#hl${seed})"/><defs><linearGradient id="hl${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`; };
    const tree=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-40" width="12" height="46" rx="5" fill="#8a5a2c"/><circle cx="0" cy="-60" r="34" fill="${c}"/><circle cx="-24" cy="-44" r="24" fill="${c}"/><circle cx="24" cy="-46" r="24" fill="${c}"/><circle cx="-8" cy="-74" r="16" fill="#fff" opacity=".12"/></g>`;
    const palm=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q8 -60 -4 -120" stroke="#9a6a38" stroke-width="10" fill="none" stroke-linecap="round"/>${[-70,-30,10,50,90,130].map(a=>`<path transform="translate(-4 -120) rotate(${a})" d="M0 0Q30 -40 70 -10Q35 -20 0 0" fill="#4fae4a" stroke="#2f7f35" stroke-width="2"/>`).join('')}</g>`;
    const goat=(x,y,s,f=1)=>`<g transform="translate(${x} ${y}) scale(${s*f} ${s})"><ellipse cx="0" cy="-30" rx="38" ry="24" fill="#fffaf0"/><rect x="-26" y="-12" width="9" height="22" rx="4" fill="#f1dcaa"/><rect x="16" y="-12" width="9" height="22" rx="4" fill="#f1dcaa"/><ellipse cx="38" cy="-48" rx="17" ry="14" fill="#fffaf0"/><path d="M34 -60q-4 -14 -12 -14M44 -60q2 -14 10 -14" stroke="#c9a468" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="-42" rx="9" ry="7" fill="#ffd1c4"/><circle cx="40" cy="-52" r="2.6" fill="#5a3a1e"/><ellipse cx="26" cy="-48" rx="9" ry="4" transform="rotate(30 26 -48)" fill="#f1dcaa"/></g>`;
    // Title illustration matches the in-game masjid: Demak-style 3-tier tajug (honey sirap), whitewash hall on dark
    // wood posts, gold mustaka, brick Kudus menara with a pavilion top, bedug pendopo, and a red-brick candi bentar gate.
    const masjidArt=()=>{
      const R1='#c98a4f', R2='#9a5a32', RS='#7a4426', FAS='#5e3a22', WALL='#fff6e6', WOOD='#6b4426', BR='#b9583b', BRD='#8f3d28', BRL='#e08d68', STONE='#ece2cc';
      const tier=(id,ex,ey,tx,ty,apex)=>{ // front face (lit) + right side sliver (shade) + shingle rows + fascia
        const sx=tx*.62+ex*.38*.5, face=apex?`M${-ex} ${ey}Q${-ex*.45} ${ey-12} 0 ${ty}Q${ex*.2} ${ey-14} ${ex*.62} ${ey}Z`:`M${-ex} ${ey}Q${-(ex+tx)/2-6} ${ey-10} ${-tx} ${ty}H${tx*.72}Q${sx+6} ${ey-12} ${ex*.8} ${ey}Z`;
        const side=apex?`M${ex*.62} ${ey}Q${ex*.2} ${ey-14} 0 ${ty}Q${ex*.45} ${ey-12} ${ex} ${ey}Z`:`M${ex*.8} ${ey}Q${sx+6} ${ey-12} ${tx*.72} ${ty}H${tx}Q${(ex+tx)/2+6} ${ey-10} ${ex} ${ey}Z`;
        const rows=[]; for(let y=ty+7;y<ey-3;y+=8) rows.push(`M${-ex} ${y}H${ex}`);
        return `<clipPath id="${id}"><path d="${face} ${side}"/></clipPath><path d="${face}" fill="url(#rfg)"/><path d="${side}" fill="${R2}"/><path d="${rows.join('')}" stroke="${RS}" stroke-width="2" opacity=".35" clip-path="url(#${id})"/><path d="M${-ex-4} ${ey}H${ex+4}L${ex-4} ${ey+7}H${-ex+4}Z" fill="${FAS}"/>`;
      };
      const band=(w,y0,y1)=>`<rect x="${-w}" y="${y0}" width="${w*2}" height="${y1-y0}" fill="${WALL}"/>${[-1,-.5,0,.5,1].map(k=>`<rect x="${k*(w-4)-2.5}" y="${y0}" width="5" height="${y1-y0}" fill="${WOOD}"/>`).join('')}<rect x="${-w}" y="${y0}" width="${w*2}" height="3" fill="rgba(90,50,20,.25)"/>`;
      const gold=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -6V-40" stroke="#c47a0c" stroke-width="3"/><ellipse cx="0" cy="-4" rx="9" ry="5" fill="#f3b33a" stroke="#a8650c" stroke-width="1.5"/><path d="M0 -30Q11 -16 7 -8H-7Q-11 -16 0 -30Z" fill="url(#gg)" stroke="#a8650c" stroke-width="1.5"/><path d="M5 -52a9 9 0 1 0 1 15a7 7 0 1 1 -1 -15z" fill="#ffd23f" stroke="#a8650c" stroke-width="1.2"/></g>`;
      const win=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#7a4a2a" stroke="${WOOD}" stroke-width="2.5"/><path d="M${x+w/2} ${y}V${y+h}M${x} ${y+h/3}H${x+w}M${x} ${y+h*2/3}H${x+w}" stroke="#d9a868" stroke-width="1.6"/>`;
      const gateHalf=`<path d="M-34 104H-116V72H-104V12H-94V-8H-82V-24H-68V-38H-56V-50H-45V-62H-34Z" fill="${BR}"/>
        <path d="M-40 104V-62H-34V104Z" fill="${BRD}"/>
        <path d="M-116 72H-104M-104 12H-94M-94 -8H-82M-82 -24H-68M-68 -38H-56M-56 -50H-45" stroke="${BRL}" stroke-width="3"/>
        <path d="${Array.from({length:12},(_,i)=>`M-114 ${100-i*9}H-36`).join('')}" stroke="${BRD}" stroke-width="1.2" opacity=".45"/>
        <rect x="-118" y="66" width="84" height="7" fill="${STONE}"/><circle cx="-70" cy="36" r="5" fill="#fff" stroke="#c9b48c" stroke-width="1.5"/><circle cx="-62" cy="-14" r="4" fill="#fff" stroke="#c9b48c" stroke-width="1.5"/>`;
      return `<defs><linearGradient id="rfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d99a5c"/><stop offset="1" stop-color="${R1}"/></linearGradient>
        <linearGradient id="mnr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c8664a"/><stop offset=".7" stop-color="${BR}"/><stop offset="1" stop-color="${BRD}"/></linearGradient></defs>
      <g transform="translate(800 648) scale(.7)">
        <ellipse cx="0" cy="26" rx="300" ry="26" fill="#2f7f45" opacity=".25"/>
        <!-- Kudus menara: tapered brick shaft, cornices, ceramic plates, pavilion with a 2-tier roof -->
        <g transform="translate(-206 0)">
          <rect x="-40" y="-10" width="80" height="32" fill="${BRD}"/><rect x="-42" y="-14" width="84" height="7" fill="${BRL}"/>
          <path d="M-33 -10L-29 -150H29L33 -10Z" fill="url(#mnr)"/>
          <path d="${Array.from({length:15},(_,i)=>`M-31 ${-18-i*9}H31`).join('')}" stroke="${BRD}" stroke-width="1.2" opacity=".4"/>
          ${[-62,-112].map(y=>`<rect x="-37" y="${y}" width="74" height="8" fill="${BRD}"/><rect x="-37" y="${y}" width="74" height="2.5" fill="${BRL}"/>`).join('')}
          <rect x="-41" y="-158" width="82" height="9" fill="${BRD}"/><rect x="-41" y="-158" width="82" height="3" fill="${BRL}"/>
          <path d="M-9 -12V-36a9 9 0 0 1 18 0V-12Z" fill="#4a2414"/>
          ${[[-16,-86],[16,-86],[0,-134]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5.5" fill="#fff" stroke="#c9b48c" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="2.2" fill="#4aa8ee"/>`).join('')}
          <rect x="-36" y="-196" width="7" height="40" fill="${WOOD}"/><rect x="29" y="-196" width="7" height="40" fill="${WOOD}"/><rect x="-3" y="-196" width="6" height="40" fill="${WOOD}" opacity=".8"/>
          <rect x="-38" y="-170" width="76" height="5" fill="${WOOD}"/><path d="M-30 -165V-158M-18 -165V-158M-6 -165V-158M6 -165V-158M18 -165V-158M30 -165V-158" stroke="${WOOD}" stroke-width="3"/>
          ${tier('mt1',54,-196,30,-220,false)}${tier('mt2',36,-222,0,-254,true)}${gold(0,-254,.55)}
        </g>
        <!-- bedug pendopo -->
        <g transform="translate(206 0)">
          <rect x="-46" y="-6" width="92" height="24" fill="${STONE}"/><rect x="-46" y="-6" width="92" height="4" fill="#d6c8aa"/>
          <rect x="-40" y="-74" width="7" height="68" fill="${WOOD}"/><rect x="33" y="-74" width="7" height="68" fill="${WOOD}"/>
          <path d="M-20 -6L-12 -24M20 -6L12 -24" stroke="${WOOD}" stroke-width="4"/>
          <rect x="-24" y="-46" width="48" height="26" rx="6" fill="#c98a4a" stroke="${FAS}" stroke-width="2"/><ellipse cx="-24" cy="-33" rx="6" ry="13" fill="#f3e2bf" stroke="${FAS}" stroke-width="2"/><path d="M-14 -46V-20M0 -46V-20M14 -46V-20" stroke="${FAS}" stroke-width="1.5" opacity=".5"/>
          ${tier('pt1',58,-74,28,-98,false)}${tier('pt2',34,-100,0,-128,true)}
        </g>
        <!-- hall: batu putih base, whitewash walls, dark wood posts, carved door, lattice windows -->
        <rect x="-150" y="-4" width="300" height="28" fill="${STONE}"/><rect x="-150" y="-4" width="300" height="5" fill="#d6c8aa"/>
        <path d="${Array.from({length:9},(_,i)=>`M${-130+i*33} 3V24`).join('')}" stroke="#c9b896" stroke-width="1.5"/>
        <rect x="-130" y="-88" width="260" height="84" fill="${WALL}"/>
        <rect x="-130" y="-88" width="260" height="14" fill="rgba(120,70,30,.2)"/>
        ${win(-112,-66,22,30)}${win(-74,-66,22,30)}${win(52,-66,22,30)}${win(90,-66,22,30)}
        <rect x="-22" y="-70" width="44" height="66" rx="3" fill="#8a5530" stroke="#e0b050" stroke-width="3"/><path d="M0 -70V-4M-14 -58H-6M6 -58H14" stroke="#5e3a22" stroke-width="2.5"/><circle cx="-5" cy="-36" r="2.4" fill="#ffd23f"/><circle cx="5" cy="-36" r="2.4" fill="#ffd23f"/>
        ${[-126,-38,30,118].map(x=>`<rect x="${x}" y="-88" width="9" height="84" fill="${WOOD}"/>`).join('')}
        <rect x="-36" y="24" width="72" height="9" fill="#ddd0b6"/><rect x="-28" y="33" width="56" height="9" fill="#d2c4a8"/>
        <!-- three-tier tajug -->
        ${band(84,-150,-138)}${band(52,-201,-190)}
        ${tier('rt1',182,-88,94,-140,false)}${tier('rt2',134,-148,62,-190,false)}${tier('rt3',90,-199,0,-268,true)}
        ${gold(0,-268,1)}
        <!-- stone path and the split candi bentar gate in front -->
        <path d="M-30 104H30L74 262H-74Z" fill="#e8d9b8"/><path d="M-27 132H27M-22 166H22M-36 200H36M-46 234H46" stroke="#cdbb92" stroke-width="3"/>
        <g>${gateHalf}</g><g transform="scale(-1 1)">${gateHalf}</g>
      </g>`;
    };
    const stars=Array.from({length:18},(_,i)=>`<i class="spark" style="left:${(i*53)%100}%;top:${20+(i*37)%60}%;animation-delay:${(i%7)*.45}s"></i>`).join('');
    const letters=(w,off)=>[...w].map((c,i)=>`<span style="animation-delay:${off+i*.07}s,${(off+i*.07)+1}s">${c}</span>`).join('');
    title.innerHTML=`
     <div class="lay" data-d="6"><div class="sun"></div></div>
     <div class="lay" data-d="10"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"><g class="cloud" opacity=".95" fill="#fff"><g transform="translate(200 190)"><ellipse rx="110" ry="34"/><circle cx="-30" cy="-26" r="40"/><circle cx="35" cy="-34" r="48"/></g><g transform="translate(1180 120) scale(.8)"><ellipse rx="110" ry="34"/><circle cx="-30" cy="-26" r="40"/><circle cx="35" cy="-34" r="48"/></g><g transform="translate(720 270) scale(.6)" opacity=".8"><ellipse rx="110" ry="34"/><circle cx="-30" cy="-26" r="40"/><circle cx="35" cy="-34" r="48"/></g></g></svg></div>
     <div class="lay" data-d="16"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">${hills('#8fd6c0','#6fc0a8',660,60,1)}</svg></div>
     <div class="lay mosq" data-d="26"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        ${hills('#6cc58a','#4fa86a',740,50,2)}
        ${masjidArt()}</svg></div>
     <div class="lay" data-d="40"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">${hills('#8fdc6a','#5cb84a',830,60,3)}${tree(170,800,1.2,'#58b84e')}${tree(300,830,.9,'#6fc85a')}${palm(1380,810,1.2)}${tree(1500,820,1,'#58b84e')}${palm(1230,830,.9)}
        ${goat(520,845,1)}${goat(1060,850,.85,-1)}</svg></div>
     <div class="lay" data-d="60"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"><path d="M0 900V850Q200 810 420 860T900 860T1400 840T1600 850V900z" fill="#4ca83e"/><g fill="#3d9232">${Array.from({length:30},(_,i)=>`<path transform="translate(${i*55+10} 870)" d="M0 40Q-6 8 -10 -8Q4 14 6 40zM8 40Q12 12 22 4Q18 22 18 40z"/>`).join('')}</g></svg></div>
     <div class="lay bunt" data-d="8"><svg viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M-10 18Q200 92 410 18" stroke="#8a5a2c" stroke-width="2" fill="none"/>${Array.from({length:13},(_,i)=>{ const x=i*32+8, tt=x/400, y=18+(1-(2*tt-1)**2)*37; const c=['#e8483f','#ffc83d','#35b5a5','#fff6e0','#c08bff'][i%5]; return `<path d="M${x-9} ${y}L${x+9} ${y+1}L${x} ${y+20}z" fill="${c}" stroke="#7a4a22" stroke-width="1.2"/>`; }).join('')}</svg></div>
     <div class="sparks">${stars}</div>
     <div class="logo"><svg class="ic crescent" aria-hidden="true"><use href="#i-crescent"/></svg><div class="lg a">${letters('Marbot',.1)}</div><div class="lg b">${letters('Masjid',.55)}</div><div class="tag" data-t="tagline"></div></div>
     <div class="menu"><button class="btn gold play" id="tPlay"></button><small id="tSub"></small></div>
     <div class="lang"><div class="seg clay"><button data-lang="id">ID</button><button data-lang="en">EN</button></div></div><div class="ver">v1.0</div>`;
    const lays=[...title.querySelectorAll('.lay')];
    const mv=(x,y)=>{ for(const l of lays){ const d=+l.dataset.d; l.style.transform=`translate(${x*d}px,${y*d*.4}px)`; } };
    title.addEventListener('pointermove',e=>mv((e.clientX/innerWidth-.5)*-1,(e.clientY/innerHeight-.5)*-1));
    addEventListener('deviceorientation',e=>{ if(started||e.gamma==null) return; mv(-(e.gamma||0)/40,-(e.beta||0)/60); });
    let ph=0; const tick=()=>{ if(started) return; ph+=.01; if(!title.matches(':hover')) mv(Math.sin(ph)*.35,Math.cos(ph*.8)*.15); requestAnimationFrame(tick); }; tick();
    const setTexts=()=>{ applyLang(title); $('#tPlay',title).textContent=hasSave?t('cont'):t('start'); $('#tSub',title).textContent=hasSave?`${t('day')} ${S.day} · ${t('daysLeft',{n:S.daysToEid})}`:''; title.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('on',b.dataset.lang===S.lang)); };
    setTexts();
    title.querySelectorAll('[data-lang]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); S.lang=b.dataset.lang; setTexts(); applyLang(); lastClock=''; renderAll(); });
    $('#tPlay',title).onclick=startGame;
  }
  function startGame(){
    if(started) return; started=true; startT=performance.now(); audio()?.unlock?.(); sfx('chime'); title.classList.add('gone'); setTimeout(()=>{ title.remove(); },1000);
    setTimeout(()=>{ sfx('bedug'); },300); setTimeout(showHint,1600); S.started=true;
  }

  function renderAll(){ applyLang(); renderTop(1); renderClock(); renderHotbar(); renderTracker(); care.refresh(); }
  ctx.on('masjid:custom',()=>{ if(panel==='design') renderPanel(); });
  ctx.on('animal:added',()=>{ if(panel==='hewan') renderPanel(); });

  // ---------------- init ----------------
  buildTitle(); renderAll(); renderBookBadge();
  const skip=()=>{ started=true; startT=performance.now(); title.remove(); };
  if(Q.has('nt')||Q.has('skip')) skip();
  if(Q.has('hint')){ skip(); setTimeout(showHint,300); }
  const demo=Q.get('panel'); if(demo){ skip(); if(Q.get('tab')){ shopTab=bookTab=Q.get('tab'); } setTimeout(()=>openPanel(demo,Q.get('cat')||undefined),200); }
  const show=Q.get('show'); if(show){ skip();
    if(show==='eid') setTimeout(showEid,300);
    if(show==='summary') setTimeout(()=>showSummary({day:S.day,stats:{fed:5,washed:2,happy:4,visitors:6,placed:1,coins:140,pahala:23},doneN:3,total:4,streak:2,streakBonus:10,autoCoins:25,weekday:P()?.weekday?.(S.day)}),300);
    if(show==='level') setTimeout(()=>showLevelUp({lv:3,unlocks:P()?.unlocksAt?.(3)||[]}),300);
    if(show==='unlock') setTimeout(()=>{ const f=ctx.modules.unlocks?.feature?.(Q.get('feat')||'sapu'); if(f) showUnlock(f); },300);
    if(show==='sticker'){ hStep=2; setTimeout(()=>{ const s0=P()?.STICKERS?.[0]; if(s0) ctx.emit('sticker:new',s0); },400); } }
  if(Q.has('demo')){ S.coins=340; S.pahala=Math.max(S.pahala,128); S.daily={...S.daily,fed:2,washed:1,happy:2}; renderAll(); tween.coins=S.coins; tween.pahala=S.pahala; lastPah=S.pahala; lastCoins=S.coins; }
  // an Eid that was due before a reload still gets celebrated once the player is in
  if(P()?.pendingEid) queueCard(showEid);

  let acc=0, measureT=0, hewT=0, vpT=0;
  return {
    toast, openPanel, closePanel, overlayOpen, addCoins, addPahala, spend, showSummary, showEid, showLevelUp, showUnlock, startGame, t, get started(){ return started; },
    caption:(text,o)=>care.caption(text,o||{}), tip:(key,text,icon)=>care.tip(key,text,icon), openHewan, openDesign, get panel(){ return panel; }, viewInset:()=>design.inset, closeTip:(k)=>care.closeTip(k),
    update(dt){
      if(started&&performance.now()-lastInput>6000&&!hud.classList.contains('idle')) hud.classList.add('idle');
      renderTop(dt); const now=performance.now(); if(now-acc>500){ acc=now; renderClock(); renderBookBadge(); updateHotbar(now); S.hour=ctx.hour; syncLedger(); }
      care.update(dt); try{ design.viewport((now-(vpT||now))/1000); }catch(e){ console.warn('design viewport',e); } vpT=now; hud.classList.toggle('placing',!$('#placebar').classList.contains('hidden'));
      if(panel==='hewan'){ if(now-hewT>=1000){ hewT=now; try{ hewan.tick(modal); }catch(e){ console.warn('hewan tick',e); } } }
      if(eidTimer>0){ eidTimer+=dt; if(eidTimer>5){ eidTimer=0.01; if(eidOv.classList.contains('on')) confettiWave(); else eidTimer=0; } }
      if(cardQ.length) nextCard();
      // tutorial: advance only on real actions
      if(started&&!S.tutDone&&!hint.classList.contains('hidden')){ hTimer+=dt; const m=ctx.input?.move; const s=hintSteps[hStep]?.[1];
        if(s==='move'){ if(m&&(Math.abs(m.x)+Math.abs(m.y)>.3)) moveT+=dt; if(moveT>.8) tutDone('move'); }
        else if(s==='end'&&hTimer>6) tutDone('end'); placePtr(); }
      if(!(measureT=(measureT||0)+dt)||measureT>.5){ measureT=0.01; measureTop(); }
    },
  };
}

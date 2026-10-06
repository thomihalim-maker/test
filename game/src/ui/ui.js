// Marbot Masjid DOM HUD. Indonesian primary, English fallback (Settings > Bahasa).
import { SPRITE, ic } from './icons.js';
import { save, reset, defaultState } from '../state.js';

const D={ // key: [id, en]
 day:['Hari','Day'], toEid:['menuju Idul Adha','to Eid al-Adha'], eidToday:['Idul Adha!','Eid!'], eidSub:['Hari Raya Kurban','Day of Sacrifice'], daysLeft:['{n} hari lagi','{n} days left'], claim:['Ambil','Claim'], claimed:['Diambil','Claimed'], doneTap:['Tugas selesai! Ketuk untuk ambil hadiah','Task done! Tap to claim'], holdReset:['Tahan untuk hapus progres','Hold to reset progress'], danger:['Zona bahaya','Danger zone'], h1k:['Gunakan tombol WASD atau panah untuk berjalan.','Use WASD or arrow keys to walk.'], eidGloss:['Semoga Allah menerima amal kita semua','May Allah accept it from us all'],
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
 h3:['Buka menu Bangun untuk membangun masjid!','Open Build to start the masjid!'], h4:['Selesaikan tugas harian sebelum Idul Adha tiba.','Finish daily tasks before Eid arrives.'],
 q_feed:['Beri makan 3 kambing','Feed 3 goats'], q_wash:['Mandikan sapi','Wash a cow'], q_water:['Beri minum 2 hewan','Water 2 animals'], q_happy:['Buat 2 hewan senang','Make 2 animals happy'], q_build:['Bangun 1 bagian masjid','Build 1 masjid part'], q_vis:['Sambut 2 jamaah','Welcome 2 visitors'],
 build_ok:['Masjid bertambah indah!','The masjid grows!'], q_done:['Tugas selesai!','Task complete!'], newday:['Hari baru dimulai','A new day begins'], eidSoon:['Idul Adha sebentar lagi!','Eid is almost here!'], masjidDone:['Masjid selesai dibangun!','Masjid complete!'],
 allDone:['Semua tugas beres!','All tasks done!'], special:['Permintaan Tamu','Guest request'], streak:['Rajin {n} hari berturut-turut!','{n}-day streak!'], streak0:['Besok semangat lagi, ya!','Fresh start tomorrow!'], streakHint:['Selesaikan hampir semua tugas untuk bonus rajin','Finish (almost) all tasks for a streak bonus'],
 tasksDone:['Tugas selesai','Tasks done'], autoClaim:['Hadiah tugas otomatis diambil','Task rewards auto-collected'], tomorrow:['Besok','Next'], toEidBtn:['Sambut Idul Adha!','Welcome Eid!'],
 berkah:['Berkah','Blessings'], lv:['Level','Level'], book:['Buku','Book'], bookTitle:['Buku Marbot','Marbot Book'], tabBerkah:['Level','Level'], tabStickers:['Stiker','Stickers'], tabOutfit:['Baju','Outfits'],
 nextLv:['{n} berkah lagi ke Level {l}','{n} more blessings to Level {l}'], maxLv:['Level tertinggi! Masya Allah','Top level! Masha Allah'], unlockAt:['Level {l}','Level {l}'], wear:['Pakai','Wear'], wearing:['Dipakai','Wearing'],
 stickerNew:['Stiker baru','New sticker'], lvUp:['Naik Level!','Level Up!'], lvUpSub:['Level {l}: hadiah baru terbuka','Level {l}: new rewards unlocked'], yay:['Asyik!','Yay!'], moreSoon:['Terus berbuat baik!','Keep doing good!'],
 tabSupply:['Barang','Supplies'], tabAnimal:['Hewan','Animals'], tabDecor:['Hiasan','Decor'], put:['Pasang','Place'], store:['Simpan satu','Store one'], onPlaza:['Terpasang','Placed'], sale:['Hari pasar: perlengkapan diskon 25%!','Market day: supplies 25% off!'],
 placeHint:['Ketuk lingkaran bercahaya untuk memasang {k}','Tap a glowing circle to place {k}'], auto:['Dekat saya','Near me'], cancel:['Batal','Cancel'], noSlot:['Tidak ada tempat kosong','No free spot'],
 goatD:['Lincah dan suka jerami','Lively, loves hay'], sheepD:['Berbulu lembut','Soft and woolly'], cowD:['Besar dan sabar','Big and patient'],
 thanks:['Terima kasih, {names}! Kalian membawa kebahagiaan untuk banyak keluarga.','Thank you, {names}! You brought joy to many families.'], rewardEid:['Hadiah Idul Adha','Eid rewards'],
 newBatch:['Hewan-hewan baru telah tiba di kandang','A new group of animals has arrived'], eidCarry:['Level, hiasan, dan masjidmu tetap tersimpan.','Your level, decorations and masjid carry over.'], eidIn:['Idul Adha: {n} hari','Eid in {n} days'], eidTmr:['Idul Adha besok!','Eid is tomorrow!'], toBook:['Lihat cara mendapatkannya di Buku','See how to earn it in the Book'], howTo:['Cara:','How:'], nextYearBtn:['Sambut Tahun Baru','Welcome the New Year'], young:['{names} masih kecil, jadi tetap tinggal dan tumbuh bersamamu.','{names} are still young, so they stay and grow with you.'],
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
    <div class="tb-left"><div class="pill clay daypill" id="daypill"><div class="dico" id="dico"></div><div class="dtxt"><b id="dayN"></b><small id="clock"></small></div><span class="evb" id="evb"></span></div></div>
    <div class="eid clay gold" id="eidpill"><div class="moon">${ic('calendar')}</div><div class="h" id="eidH"></div></div>
    <div class="tb-wallet">
      <div class="pill clay wallet"><button class="wc" id="coinpill" aria-label="Coins">${ic('coin')}<b id="coinN">0</b></button><span class="sep"></span><button class="wp" id="pahpill" aria-label="Level"><span class="lvstar">${ic('pahala')}<b id="lvb"></b></span><b id="pahN">0</b></button></div>
    </div>
    <button class="iconbtn clay" id="setBtn" aria-label="Settings">${ic('gear')}</button>
  </div>
  <div id="tracker" class="clay"><div id="qchip"></div><div id="qlist"></div></div>
  <div id="ptr"></div>
  <div id="dock">
    <button class="dbtn clay" id="dQ" style="position:relative">${ic('scroll')}<span data-t="quests"></span><span class="badge" id="qBadge"></span></button>
    <button class="dbtn clay" id="dS">${ic('bag')}<span data-t="shop"></span></button>
    <button class="dbtn clay teal" id="dB">${ic('dome')}<span data-t="build"></span></button>
    <button class="dbtn clay" id="dK" style="position:relative">${ic('book')}<span data-t="book"></span><span class="badge" id="kBadge"></span></button>
  </div>
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
    const next=()=>{ if(!q.length){ busy=false; return; } if(hold&&hold()){ busy=true; setTimeout(next,400); return; }
      const x=q.shift(); busy=true; const n=el('div',cls+' '+(x.kind||''),x.html); box.appendChild(n); if(box.id==='ach') hud.classList.add('ach-on');
      setTimeout(()=>{ n.classList.add('out'); setTimeout(()=>{ n.remove(); if(!box.children.length) hud.classList.remove('ach-on'); next(); },320); }, q.length?Math.max(1400,ms*.55):ms); };
    return (html,kind,key)=>{ if(q.some(x=>x.key===key)) return; q.push({html,kind,key}); if(q.length>6) q.shift(); if(!busy) next(); }; }
  const portrait=matchMedia('(max-width:640px) and (orientation:portrait)');
  // achievements wait while a panel/card is open, during the quiet first steps, and (phones) while a hint uses the slot
  const achHold=()=>!started||!!panel||cardOpen()||quiet()||(portrait.matches&&!hint.classList.contains('hidden'));
  const pushToast=queued(toasts,'toast clay',2600), pushAch=queued($('#ach'),'achv clay',3400,achHold);
  function toast(msg,icon='chat',kind){ if(!msg) return; pushToast(`${ic(icon)}<span>${msg}</span>`,kind,msg); }
  function ach(title,name,icon,rim){ pushAch(`<div class="ad" style="--rim:${rim||'#ffc83d'}">${ic(icon)}</div><div><small>${title}</small><b>${name}</b></div>`,'',title+name); }
  ctx.on('toast',m=>{ if(typeof m==='string') toast(m); else if(m) toast(m.msg||m.text,m.icon||'chat',m.kind); });

  // ---------------- top bar ----------------
  const tween={coins:S.coins,pahala:S.pahala};
  function renderTop(dt=1){
    tween.coins+=(S.coins-tween.coins)*Math.min(1,dt*10); tween.pahala+=(S.pahala-tween.pahala)*Math.min(1,dt*10);
    if(Math.abs(S.coins-tween.coins)<.5) tween.coins=S.coins; if(Math.abs(S.pahala-tween.pahala)<.5) tween.pahala=S.pahala;
    $('#coinN').textContent=fmt(tween.coins); $('#pahN').textContent=fmt(tween.pahala);
  }
  let lastClock='';
  const tbEl=()=>document.getElementById('topbar');
  function measureTop(){ const b=tbEl()?.getBoundingClientRect(); if(b&&b.height) hud.style.setProperty('--tb',Math.ceil(b.bottom)+'px'); }
  function renderClock(){
    const h=ctx.hour??8, hh=Math.floor(h)%24, mm=Math.floor((h%1)*60/10)*10; const s=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
    const night=h<5.5||h>=18.5; const key=s+night+S.day+S.daysToEid+S.lang+S.eidDone+S.pahala+(S.event?.id||''); if(key===lastClock) return; lastClock=key;
    const pr=ctx.modules.progress, wd=pr?.WEEKDAYS?.[pr.weekday(S.day)], ev=pr?.event?.();
    $('#clock').textContent=(wd?L(wd)+' · ':'')+s; $('#evb').innerHTML=ev&&ev.id!=='cerah'?ic(ev.icon):''; $('#lvb').textContent=pr?pr.level():'';
    $('#dayN').textContent=t('day')+' '+S.day; $('#dico').innerHTML=ic(night?'moon':'sun'); $('#daypill').classList.toggle('night',night);
    const e=S.daysToEid; $('#eidH').textContent=e<=0?t('eidToday'):e===1?t('eidTmr'):t('eidIn',{n:e}); $('#eidpill').classList.toggle('soon',e<=2);
  }

  // ---------------- hotbar ----------------
  const hotbar=$('#hotbar');
  function renderHotbar(){
    hotbar.innerHTML=''; for(const it of SHOP){ const n=S.inventory[it.id]||0; const b=el('button','hb'+(S.tool===it.id?' sel':'')+(n<=0?' empty':''),`${ic(it.icon)}<em>${n}</em>`); b.title=t(it.id);
      b.onclick=()=>{ S.tool=it.id; ctx.emit('tool:select',it.id); renderHotbar(); }; hotbar.appendChild(b); }
  }
  ctx.on('inventory:change',renderHotbar);

  // ---------------- quests (logic lives in game/progress) ----------------
  const P=()=>ctx.modules.progress;
  const qlist=$('#qlist'); let qOpen=false;
  const qTitle=q=>L(q.title).replace('{n}',q.goal);
  const qs=()=>P()?.quests?.()||[];
  function renderTracker(){
    const list=qs(); qlist.innerHTML='';
    for(const q of list) qlist.appendChild(el('div','q'+(q.done?' done':'')+(q.special?' sp':''),`<div class="chk">${ic(q.done?'check':q.icon)}</div><div class="qt">${q.special?ic('star','spi'):''}${qTitle(q)}<div class="bar"><i style="width:${q.prog/q.goal*100}%"></i></div></div><div class="cnt">${q.prog}/${q.goal}</div>`));
    const cl=list.filter(q=>q.done&&!q.claimed), cur=cl[0]||list.find(q=>!q.done);
    const tr=$('#tracker'); tr.classList.toggle('claim',!!cl.length); tr.classList.toggle('open',qOpen); tr.style.display=list.length?'':'none';
    $('#qchip').innerHTML=cur?`${ic(cl.length?'check':cur.icon)}<span class="qt">${cl.length?t('claim')+': ':''}${qTitle(cur)}</span><span class="cnt">${cur.prog}/${cur.goal}</span>${ic('chev','chev')}`:`${ic('check')}<span class="qt">${t('allDone')}</span>${ic('chev','chev')}`;
    $('#qBadge').textContent=cl.length||'';
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
  ctx.on('sticker:new',s=>{ ach(t('stickerNew'),L(s.name),s.icon,s.rim); if(panel!=='book') bookNew++; renderBookBadge(); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2,z:c.z},16); if(panel==='book') renderPanel(); });
  ctx.on('berkah:level',d=>{ if(panel!=='book') bookNew++; renderBookBadge(); lastClock=''; queueCard(()=>showLevelUp(d)); });
  ctx.on('decor:change',()=>{ if(panel==='shop') renderPanel(); });
  ctx.on('year:new',()=>{ lastClock=''; renderAll(); });
  let bookNew=0; function renderBookBadge(){ $('#kBadge').textContent=bookNew&&!quiet()?'!':''; }

  // ---------------- panels ----------------
  let panel=null, shopTab='supply', bookTab='berkah';
  const ribbons={shop:['bag','shopTitle'],build:['dome','buildTitle'],quest:['scroll','questTitle'],settings:['gear','setTitle'],book:['book','bookTitle']};
  function openPanel(name){
    if(!ribbons[name]) return; P()?.stopPlace?.();
    panel=name; modal.classList.add('on'); renderPanel(true); if(name==='build') tutDone('build'); if(name==='book'){ bookNew=0; renderBookBadge(); }
  }
  function closePanel(){ panel=null; modal.classList.remove('on'); modal.innerHTML=''; }
  modal.addEventListener('pointerdown',e=>{ if(e.target===modal) closePanel(); });
  function renderPanel(fresh){
    if(!panel) return; const [icon,tk]=ribbons[panel]; const scroll=$('.body',modal)?.scrollTop||0;
    const body={shop:shopHTML,build:buildHTML,quest:questHTML,settings:settingsHTML,book:bookHTML}[panel]();
    const money=panel==='shop'||panel==='build';
    modal.innerHTML=`<div class="sheet clay ${money?'money':''}" style="${fresh?'':'animation:none'}"><div class="ribbon clay teal">${ic(icon)}<span>${t(tk)}</span></div>${money?`<div class="hcoin">${ic('coin')}<b>${fmt(S.coins)}</b></div>`:''}<button class="x clay gold" id="pX" aria-label="${t('close')}">${ic('close')}</button><div class="body">${body}</div></div>`;
    if(!fresh) $('.body',modal).scrollTop=scroll; $('#pX',modal).onclick=closePanel; bindPanel();
  }
  const coinChip=()=>`<span class="pill clay" style="padding:.25em .8em .25em .4em">${ic('coin')}<b>${fmt(S.coins)}</b></span>`;
  const tabs=(cur,list,attr)=>`<div class="tabs" style="--n:${list.length}">${list.map(([id,k,i])=>`<button data-${attr}="${id}" class="${cur===id?'on':''}">${ic(i)}<span>${t(k)}</span></button>`).join('')}</div>`;
  const price=(n,old)=>`<span class="price">${ic('coin')}${old&&old!==n?`<s>${old}</s>`:''}${n}</span>`;
  function shopHTML(){
    const an=ctx.modules.animals, pr=P(), mul=pr?.priceMul?.('supply')??1;
    let body='';
    if(shopTab==='supply') body=(mul<1?`<div class="sale">${ic('bag')}${t('sale')}</div>`:'')+'<div class="grid">'+SHOP.map(it=>{ const p=Math.round(it.price*mul); return `<div class="card"><div class="big">${ic(it.icon)}</div><h5>${t(it.id)} ×${it.qty}</h5><p>${t(it.id+'D')}</p><span class="own">${t('owned')} ${S.inventory[it.id]||0}</span><button class="btn gold ${S.coins>=p?'':'off'}" data-buy="${it.id}">${t('buy')} ${price(p,it.price)}</button></div>`; }).join('')+'</div>';
    else if(shopTab==='animal'&&an?.price) body='<div class="grid">'+['goat','sheep','cow'].map(k=>{ const p=an.price(k), ok=an.canAdd?an.canAdd(k):true, bp=Math.round(p*.5);
      return `<div class="card"><div class="big">${ic(k==='cow'?'cow':'goat')}</div><h5>${t(k==='goat'?'goats':k==='sheep'?'sheeps':'cows')}</h5><p>${t(k+'D')}</p><div class="duo"><button class="btn gold ${ok&&S.coins>=p?'':'off'}" data-animal="${k}">${price(p)}</button><button class="btn teal ${ok&&S.coins>=bp?'':'off'}" data-animal="${k}:baby">${price(bp)} ${t('baby')}</button></div></div>`; }).join('')+'</div>';
    else if(shopTab==='decor'&&pr) body='<div class="grid">'+pr.decorKinds().map(k=>{
      if(!k.unlocked) return `<div class="card lockd"><div class="big">${ic(k.icon)}</div><h5>${L(k.name)}</h5><p>${L(k.desc)}</p><span class="own lk">${ic('lock')}${t('unlockAt',{l:k.lv})}</span></div>`;
      return `<div class="card"><div class="big">${ic(k.icon)}</div><h5>${L(k.name)}</h5><p>${L(k.desc)}</p>${k.owned?`<span class="own">${t('owned')} ${k.owned}</span><button class="btn teal" data-dput="${k.id}">${ic('pot')}${t('put')}</button>`:`<button class="btn gold ${S.coins>=k.price?'':'off'}" data-dbuy="${k.id}">${t('buy')} ${price(k.price)}</button>`}${k.placed?`<div class="plc">${t('onPlaza')} ${k.placed} · <button class="btn link small" data-dstore="${k.id}">${t('store')}</button></div>`:''}</div>`; }).join('')+'</div>';
    return tabs(shopTab,[['supply','tabSupply','hay'],...(an?.price?[['animal','tabAnimal','goat']]:[]),...(pr?[['decor','tabDecor','lantern']]:[])],'stab')+body;
  }
  function parts(){
    const m=ctx.modules.masjid; const st=m?.stages;
    if(Array.isArray(st)&&st.length) return st.map((s,i)=>{ const f=PARTS.find(p=>p.id===(s.id??s.name)); return {id:s.id??s.name??i,name:(S.lang==='en'&&s.nameEn)||s.name||s.label||s.id||('#'+(i+1)),cost:s.cost??s.price??f?.cost??40,desc:(S.lang==='en'&&s.descEn)||s.desc||s.description||(f?L(f.desc):''),raw:true}; });
    return PARTS.map(p=>({id:p.id,name:L(p.name),cost:p.cost,desc:L(p.desc)}));
  }
  const mStage=()=>{ const m=ctx.modules.masjid; return m&&typeof m.stage==='number'?m.stage:(S.masjid.stage|0); };
  function buildHTML(){
    const ps=parts(), st=Math.min(mStage(),ps.length);
    return `<div class="sub"><div style="display:flex;gap:.6em;align-items:center;flex:1"><span>${t('mosque')} ${st}/${ps.length}</span><div class="prog"><i style="width:${st/ps.length*100}%"></i></div></div></div><div class="grid">`+
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
    const li=pr.levelInfo(); let body='';
    if(bookTab==='berkah'){
      body=`<div class="lvhead"><div class="lvbig">${ic('pahala')}<b>${li.lv}</b></div><div style="flex:1"><b>${t('berkah')} ${t('lv')} ${li.lv}</b><div class="prog"><i style="width:${li.pct*100}%"></i></div><small>${li.next?t('nextLv',{n:li.next-li.pahala,l:li.lv+1}):t('maxLv')}</small></div></div><div class="lvlist">`+
        pr.LEVELS.map((_,i)=>{ const l=i+1, u=pr.unlocksAt(l); if(!u.length) return ''; const got=li.lv>=l;
          return `<div class="lvrow ${got?'got':''}"><span class="lvn">${l}</span><div class="chips">${u.map(x=>`<span class="uchip">${ic(x.icon)}${L(x.name)}</span>`).join('')}</div>${got?ic('check'):ic('lock')}</div>`; }).join('')+'</div>';
    } else if(bookTab==='stickers'){
      const st=pr.stickers(), n=st.filter(s=>s.got).length;
      body=`<div class="sub"><span>${n}/${st.length}</span><div class="prog"><i style="width:${n/st.length*100}%"></i></div></div><div class="stk">`+st.map(s=>`<div class="sticker ${s.got?'got':''}" style="--rim:${s.rim}"><div class="disc">${ic(s.icon)}</div><b>${L(s.name)}</b>${s.got?'':`<small>${s.how?L(s.how):''}</small>`}</div>`).join('')+'</div>';
    } else {
      body='<div class="grid outfits">'+pr.outfits().map(o=>{ const hx=n=>'#'+n.toString(16).padStart(6,'0');
        return `<div class="card ${o.worn?'done':''} ${o.unlocked?'':'lockd'}"><div class="big swatch"><svg viewBox="0 0 48 48" class="ic"><path d="M16 5l-11 7 4 9 5-3v25h20V18l5 3 4-9-11-7c-1 4-4 6-8 6s-7-2-8-6z" fill="${hx(o.look.koko)}" stroke="#7a4a22" stroke-width="2.4"/><rect x="14" y="32" width="20" height="11" fill="${hx(o.look.sarong)}" stroke="#7a4a22" stroke-width="2"/><path d="M17 4h14v4H17z" fill="${hx(o.look.peci)}"/></svg></div><h5>${L(o.name)}</h5>${o.worn?`<span class="own">${t('wearing')}</span>`:o.unlocked?`<button class="btn teal" data-outfit="${o.id}">${t('wear')}</button>`:`<span class="own lk">${ic('lock')}${t('unlockAt',{l:o.lv})}</span>`}</div>`; }).join('')+'</div>';
    }
    return tabs(bookTab,[['berkah','tabBerkah','pahala'],['stickers','tabStickers','star'],['outfit','tabOutfit','shirt']],'btab')+body;
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
    placebar.innerHTML=`${ic(k?.icon||'pot')}<span class="tx">${t('placeHint',{k:k?L(k.name):''})}</span><button class="btn teal" id="plAuto">${t('auto')}</button><button class="x" id="plX" aria-label="${t('cancel')}">${ic('close')}</button>`;
    placebar.classList.remove('hidden'); $('#plAuto').onclick=()=>{ if(!P().placeAuto()) toast(t('noSlot'),'pot','bad'); }; $('#plX').onclick=()=>P().stopPlace();
  });
  $('#dQ').onclick=()=>openPanel('quest'); $('#tracker').onclick=()=>{ const q=qs().find(q=>q.done&&!q.claimed); if(q){ claim(q.id); return; } qOpen=!qOpen; renderTracker(); };
  $('#dS').onclick=()=>openPanel('shop'); $('#dB').onclick=()=>openPanel('build'); $('#dK').onclick=()=>openPanel('book'); $('#setBtn').onclick=()=>openPanel('settings'); $('#pahpill').onclick=()=>{ bookTab='berkah'; openPanel('book'); };
  $('#daypill').onclick=()=>{ const ev=P()?.event?.(); if(ev) toast(`${L(ev.name)} · ${L(ev.desc)}`,ev.icon); };
  addEventListener('keydown',e=>{ if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if(e.key==='Escape'){ closePanel(); P()?.stopPlace?.(); } const k={t:'quest',b:'build',p:'shop',k:'book'}[e.key.toLowerCase()]; if(k&&!e.repeat&&started&&!cardOpen()) (panel===k?closePanel():openPanel(k)); });

  // ---------------- tutorial hints ----------------
  const hint=$('#hint'), ptr=$('#ptr'); const hintSteps=[['h1','move'],['h2','fed'],['h3','build'],['h4','end']]; let hStep=0, hTimer=0, moveT=0;
  const quiet=()=>!S.tutDone&&hStep<2;   // first ~30s: no stickers/badges until the player has walked and fed an animal
  const joyOn=()=>{ const e=document.getElementById('mb-joy'); return e&&e.offsetWidth>0?e:null; };
  function showHint(){ if(S.tutDone||!started){ hint.classList.add('hidden'); hud.classList.remove('hint-on'); ptr.style.display='none'; return; } const s=hintSteps[hStep]; if(!s){ S.tutDone=true; hint.classList.add('hidden'); hud.classList.remove('hint-on'); ptr.style.display='none'; return; }
    $('#hintTx').textContent=t(s[0]==='h1'&&!joyOn()?'h1k':s[0]); hint.classList.remove('hidden'); hud.classList.add('hint-on'); hint.style.animation='none'; void hint.offsetWidth; hint.style.animation=''; hTimer=0; moveT=0; }
  function tutDone(ev){ if(hintSteps[hStep]?.[1]===ev){ hStep++; renderBookBadge(); ptr.style.display='none'; setTimeout(showHint,ev==='end'?0:900); } }
  function placePtr(){ const s=hintSteps[hStep]?.[1]; const tgt=s==='move'?joyOn():s==='fed'?document.getElementById('mb-act'):s==='build'?document.getElementById('dB'):null;
    if(!tgt||hint.classList.contains('hidden')){ ptr.style.display='none'; return; } const r=tgt.getBoundingClientRect(); if(!r.width){ ptr.style.display='none'; return; } ptr.style.display='block'; ptr.style.left=(r.left+r.width/2)+'px'; ptr.style.top=(r.top+r.height/2)+'px'; }
  $('#hintX').onclick=()=>{ S.tutDone=true; renderBookBadge(); hint.classList.add('hidden'); hud.classList.remove('hint-on'); ptr.style.display='none'; };
  ctx.on('animal:fed',()=>tutDone('fed'));

  // ---------------- cards: day summary, level-up, Eid (queued so they never stack) ----------------
  const cardQ=[];
  const cardOpen=()=>summary.classList.contains('on')||eidOv.classList.contains('on');
  function queueCard(fn){ if(cardOpen()||!started) cardQ.push(fn); else fn(); }
  function closeCard(o){ o.classList.remove('on'); sfx('pop'); setTimeout(()=>{ if(!cardOpen()&&cardQ.length) cardQ.shift()(); },250); }
  function statHTML(icon,val,label,i){ return `<div class="stat" style="animation-delay:${.12*i+.2}s">${ic(icon)}<div><b>${val}</b><small>${label}</small></div></div>`; }
  ctx.on('day:summary',d=>{ lastClock=''; renderAll(); if(S.daysToEid===3) toast(t('eidSoon'),'crescent','good'); queueCard(()=>showSummary(d)); });
  function showSummary(d){
    const s=d.stats||{}, pr=P(), ev=pr?.event?.(), wd=pr?.WEEKDAYS?.[d.weekday??0];
    summary.innerHTML=`<div class="sumcard clay"><div class="moonbig">${ic(d.eid?'crescent':'sun')}</div><h2>${t('sumTitle',{n:d.day})}</h2><div class="sm">${t('sumSub')}</div>
      <div class="stats">${statHTML('scroll',`${d.doneN||0}/${d.total||0}`,t('tasksDone'),0)}${statHTML('hay',s.fed||0,t('fed'),1)}${statHTML('heart',s.happy||0,t('happy'),2)}${statHTML('people',s.visitors||0,t('visitors'),3)}${statHTML('coin',s.coins||0,t('earned'),4)}${statHTML('pahala',s.pahala||0,t('pahalaE'),5)}</div>
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
      <div class="chips center">${(d.unlocks||[]).map((u,i)=>`<span class="uchip big" style="animation-delay:${.3+i*.15}s">${ic(u.icon)}${L(u.name)}</span>`).join('')||`<span class="uchip">${ic('star')}${t('moreSoon')}</span>`}</div>
      <button class="btn gold" id="lvGo" style="font-size:1.1em">${t('yay')}</button></div>`;
    summary.classList.add('on'); sfx('chime'); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2.2,z:c.z},30);
    $('#lvGo').onclick=()=>closeCard(summary);
  }
  const KG={goat:30,sheep:35,cow:280};
  let eidTimer=0;
  const starsHTML=n=>'<span class="stars">'+[1,2,3].map(i=>`<svg class="ic" style="width:1.15em;height:1.15em;opacity:${i<=n?1:.25}"><use href="#i-star"/></svg>`).join('')+'</span>';
  function showEid(){
    const pr=P(); let R=pr?.celebrateEid?.();
    if(!R){ const an=[['goat',3],['sheep',2],['cow',1]].flatMap(([k,n])=>Array.from({length:n},()=>({kind:k,name:'',w:KG[k],stars:2,packs:Math.round(KG[k]*.9)}))); const packs=an.reduce((s,a)=>s+a.packs,0); R={animals:an,packs,third:Math.round(packs/3),coins:0,pahala:0}; }
    const nm={goat:t('goats'),sheep:t('sheeps'),cow:t('cows')}, names=R.animals.map(a=>a.name).filter(Boolean);
    const nameStr=names.length>3?names.slice(0,3).join(', ')+' …':names.join(', ')||t('animals');
    const CC=['#ff5d73','#ffc447','#2fd0b5','#6cc4ff','#c08bff','#ffffff','#9be564'];
    const confetti=Array.from({length:26},(_,i)=>`<i style="left:${(i*37)%100}%;--c:${CC[i%CC.length]};--d:${3.2+(i%5)*.6}s;--dl:${-((i*.73)%4).toFixed(2)}s;--x:${((i%7)-3)*4}vw;--r:${(i%2?1:-1)*(360+i*25)}deg;${i%3?'':'border-radius:50%;'}"></i>`).join('');
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
      <div class="eidfx" aria-hidden="true">${confetti}</div>`;
    eidOv.classList.add('on'); save(S);
    $('#eKeep').onclick=()=>{ closeCard(eidOv); eidTimer=0; if(pr?.newYear) pr.newYear(); else { S.eidDone=false; S.daysToEid=10; S.stats.years++; } lastClock=''; sfx('chime'); renderAll(); save(S); toast(t('newBatch'),'goat','good'); setTimeout(()=>toast(t('nextYear'),'calendar','good'),1200); };
    sfx('bedug'); setTimeout(()=>sfx('chime'),900); setTimeout(()=>sfx('bedug'),1600); eidTimer=0.01; confettiWave();
  }
  function confettiWave(){ const c=camTarget(); fx()?.confettiRain?.({x:c.x,y:c.y,z:c.z},140,10); fx()?.burst('confetti',{x:c.x,y:c.y,z:c.z},80); }
  const overlayOpen=()=>!started||cardOpen()||!!panel;

  // ---------------- title screen ----------------
  let started=false; const hasSave=S.day>1||S.pahala>0;
  function buildTitle(){
    const hills=(c1,c2,y,amp,seed)=>{ let d=`M0 ${y}`; for(let i=0;i<=8;i++){ d+=` Q ${i*200+100} ${y-amp*(((i*seed)%3)+.6)} ${i*200+200} ${y}`; } return `<path d="${d} V900 H0z" fill="url(#hl${seed})"/><defs><linearGradient id="hl${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`; };
    const tree=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-40" width="12" height="46" rx="5" fill="#8a5a2c"/><circle cx="0" cy="-60" r="34" fill="${c}"/><circle cx="-24" cy="-44" r="24" fill="${c}"/><circle cx="24" cy="-46" r="24" fill="${c}"/><circle cx="-8" cy="-74" r="16" fill="#fff" opacity=".12"/></g>`;
    const palm=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0Q8 -60 -4 -120" stroke="#9a6a38" stroke-width="10" fill="none" stroke-linecap="round"/>${[-70,-30,10,50,90,130].map(a=>`<path transform="translate(-4 -120) rotate(${a})" d="M0 0Q30 -40 70 -10Q35 -20 0 0" fill="#4fae4a" stroke="#2f7f35" stroke-width="2"/>`).join('')}</g>`;
    const goat=(x,y,s,f=1)=>`<g transform="translate(${x} ${y}) scale(${s*f} ${s})"><ellipse cx="0" cy="-30" rx="38" ry="24" fill="#fffaf0"/><rect x="-26" y="-12" width="9" height="22" rx="4" fill="#f1dcaa"/><rect x="16" y="-12" width="9" height="22" rx="4" fill="#f1dcaa"/><ellipse cx="38" cy="-48" rx="17" ry="14" fill="#fffaf0"/><path d="M34 -60q-4 -14 -12 -14M44 -60q2 -14 10 -14" stroke="#c9a468" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="-42" rx="9" ry="7" fill="#ffd1c4"/><circle cx="40" cy="-52" r="2.6" fill="#5a3a1e"/><ellipse cx="26" cy="-48" rx="9" ry="4" transform="rotate(30 26 -48)" fill="#f1dcaa"/></g>`;
    const stars=Array.from({length:18},(_,i)=>`<i class="spark" style="left:${(i*53)%100}%;top:${20+(i*37)%60}%;animation-delay:${(i%7)*.45}s"></i>`).join('');
    const letters=(w,off)=>[...w].map((c,i)=>`<span style="animation-delay:${off+i*.07}s,${(off+i*.07)+1}s">${c}</span>`).join('');
    title.innerHTML=`
     <div class="lay" data-d="6"><div class="sun"></div></div>
     <div class="lay" data-d="10"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"><g class="cloud" opacity=".95" fill="#fff"><g transform="translate(200 190)"><ellipse rx="110" ry="34"/><circle cx="-30" cy="-26" r="40"/><circle cx="35" cy="-34" r="48"/></g><g transform="translate(1180 120) scale(.8)"><ellipse rx="110" ry="34"/><circle cx="-30" cy="-26" r="40"/><circle cx="35" cy="-34" r="48"/></g><g transform="translate(720 270) scale(.6)" opacity=".8"><ellipse rx="110" ry="34"/><circle cx="-30" cy="-26" r="40"/><circle cx="35" cy="-34" r="48"/></g></g></svg></div>
     <div class="lay" data-d="16"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">${hills('#8fd6c0','#6fc0a8',660,60,1)}</svg></div>
     <div class="lay mosq" data-d="26"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        ${hills('#6cc58a','#4fa86a',740,50,2)}
        <g transform="translate(800 610) scale(.78)"><rect x="-150" y="0" width="300" height="130" rx="10" fill="#fff6e0"/><rect x="-150" y="0" width="300" height="14" fill="#f0c874"/><path d="M-85 0c0-70 38-120 85-120s85 50 85 120z" fill="#35b5a5"/><path d="M-60 -20c8-40 26-62 52-70" stroke="#8ff0de" stroke-width="12" fill="none" stroke-linecap="round" opacity=".7"/><path d="M0 -122v-30" stroke="#c47a0c" stroke-width="6"/><path d="M12 -168a20 20 0 1 0 -4 34a14 14 0 1 1 4 -34z" fill="#ffc83d"/>
          <rect x="-215" y="-110" width="42" height="240" rx="8" fill="#fff6e0"/><path d="M-222 -110l28-50 28 50z" fill="#35b5a5"/><rect x="173" y="-110" width="42" height="240" rx="8" fill="#fff6e0"/><path d="M166 -110l28-50 28 50z" fill="#35b5a5"/>
          <rect x="-205" y="-70" width="22" height="30" rx="11" fill="#ffd45a"/><rect x="183" y="-70" width="22" height="30" rx="11" fill="#ffd45a"/>
          ${[-110,-60,60,110].map(x=>`<rect x="${x-12}" y="30" width="24" height="46" rx="12" fill="#ffd45a"/>`).join('')}<path d="M-28 130v-60a28 28 0 0 1 56 0v60z" fill="#7a4a22"/></g></svg></div>
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
    if(started) return; started=true; audio()?.unlock?.(); sfx('chime'); title.classList.add('gone'); setTimeout(()=>{ title.remove(); },1000);
    setTimeout(()=>{ sfx('bedug'); },300); setTimeout(showHint,1600); S.started=true;
  }

  function renderAll(){ applyLang(); renderTop(1); renderClock(); renderHotbar(); renderTracker(); }

  // ---------------- init ----------------
  buildTitle(); renderAll(); renderBookBadge();
  const skip=()=>{ started=true; title.remove(); };
  if(Q.has('nt')||Q.has('skip')) skip();
  if(Q.has('hint')){ skip(); setTimeout(showHint,300); }
  const demo=Q.get('panel'); if(demo){ skip(); if(Q.get('tab')){ shopTab=bookTab=Q.get('tab'); } setTimeout(()=>openPanel(demo),200); }
  const show=Q.get('show'); if(show){ skip();
    if(show==='eid') setTimeout(showEid,300);
    if(show==='summary') setTimeout(()=>showSummary({day:S.day,stats:{fed:5,washed:2,happy:4,visitors:6,placed:1,coins:140,pahala:23},doneN:3,total:4,streak:2,streakBonus:10,autoCoins:25,weekday:P()?.weekday?.(S.day)}),300);
    if(show==='level') setTimeout(()=>showLevelUp({lv:3,unlocks:P()?.unlocksAt?.(3)||[]}),300); }
  if(Q.has('demo')){ S.coins=340; S.pahala=Math.max(S.pahala,128); S.daily={...S.daily,fed:2,washed:1,happy:2}; renderAll(); tween.coins=S.coins; tween.pahala=S.pahala; lastPah=S.pahala; lastCoins=S.coins; }
  // an Eid that was due before a reload still gets celebrated once the player is in
  if(P()?.pendingEid) queueCard(showEid);

  let acc=0, measureT=0;
  return {
    toast, openPanel, closePanel, overlayOpen, addCoins, addPahala, spend, showSummary, showEid, showLevelUp, startGame, t, get started(){ return started; },
    update(dt){
      if(started&&performance.now()-lastInput>6000&&!hud.classList.contains('idle')) hud.classList.add('idle');
      renderTop(dt); const now=performance.now(); if(now-acc>500){ acc=now; renderClock(); S.hour=ctx.hour; syncLedger(); }
      if(eidTimer>0){ eidTimer+=dt; if(eidTimer>5){ eidTimer=0.01; if(eidOv.classList.contains('on')) confettiWave(); else eidTimer=0; } }
      if(started&&cardQ.length&&!cardOpen()) cardQ.shift()();
      // tutorial: advance only on real actions
      if(started&&!S.tutDone&&!hint.classList.contains('hidden')){ hTimer+=dt; const m=ctx.input?.move; const s=hintSteps[hStep]?.[1];
        if(s==='move'){ if(m&&(Math.abs(m.x)+Math.abs(m.y)>.3)) moveT+=dt; if(moveT>.8) tutDone('move'); }
        else if(s==='end'&&hTimer>6) tutDone('end'); placePtr(); }
      if(!(measureT=(measureT||0)+dt)||measureT>.5){ measureT=0.01; measureTop(); }
    },
  };
}

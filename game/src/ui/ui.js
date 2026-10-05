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
 coins:['Koin','Coins'], pahala:['Pahala','Pahala'], built:['Terbangun','Built'], mosque:['Masjid','Mosque'], reward:['Hadiah','Reward'],
 place:['Bangun','Build'], need:['Butuh','Needs'], tapTool:['Pilih alat','Pick tool'],
 sound:['Suara','Sound'], music:['Musik','Music'], sfx:['Efek','Effects'], lang:['Bahasa','Language'], resetSave:['Hapus Progres','Reset Progress'], sure:['Yakin? Ketuk lagi','Sure? Tap again'],
 close:['Tutup','Close'], nextYear:['Menuju Idul Adha berikutnya: 10 hari lagi!','Next Eid al-Adha in 10 days!'], locked:['Terkunci','Locked'], start:['Mulai Bermain','Start Game'], cont:['Lanjutkan','Continue'], tagline:['Rawat hewan kurban, bangun masjid','Care for the animals, build the masjid'],
 sumTitle:['Hari {n} Selesai','Day {n} Complete'], sumSub:['Alhamdulillah, kerja bagus hari ini!','Alhamdulillah, great work today!'], next:['Lanjut ke Hari {n}','On to Day {n}'],
 fed:['Hewan diberi makan','Animals fed'], washed:['Hewan dimandikan','Animals washed'], happy:['Hewan senang','Happy animals'], placed:['Bagian dibangun','Parts built'], visitors:['Jamaah datang','Visitors'], earned:['Koin didapat','Coins earned'], pahalaE:['Pahala didapat','Pahala earned'],
 eidTitle:['Selamat Idul Adha!','Eid al-Adha Mubarak!'], eidGreet:['Taqabbalallahu minna wa minkum','Taqabbalallahu minna wa minkum'],
 eidSum:['Hewan kurban dibagikan dengan penuh syukur.','The sacrifice is shared with gratitude.'], dFam:['Keluarga','Family'], dNeigh:['Tetangga & Kerabat','Neighbors'], dPoor:['Fakir Miskin','The Needy'], packs:['paket daging','meat packs'],
 animals:['Hewan kurban','Animals'], goats:['kambing','goats'], sheeps:['domba','sheep'], cows:['sapi','cows'], jamaah:['Jamaah','Visitors'], again:['Tahun Baru','New Year'], keep:['Lanjut ke Tahun Depan','On to Next Year'],
 h1:['Geser joystick untuk berjalan keliling.','Use the joystick to walk around.'], h2:['Dekati kambing, lalu tekan tombol aksi untuk memberi makan.','Walk up to a goat and press action to feed it.'],
 h3:['Buka menu Bangun untuk membangun masjid!','Open Build to start the masjid!'], h4:['Selesaikan tugas harian sebelum Idul Adha tiba.','Finish daily tasks before Eid arrives.'],
 q_feed:['Beri makan 3 kambing','Feed 3 goats'], q_wash:['Mandikan sapi','Wash a cow'], q_water:['Beri minum 2 hewan','Water 2 animals'], q_happy:['Buat 2 hewan senang','Make 2 animals happy'], q_build:['Bangun 1 bagian masjid','Build 1 masjid part'], q_vis:['Sambut 2 jamaah','Welcome 2 visitors'],
 build_ok:['Masjid bertambah indah!','The masjid grows!'], q_done:['Tugas selesai!','Task complete!'], newday:['Hari baru dimulai','A new day begins'], eidSoon:['Idul Adha sebentar lagi!','Eid is almost here!'], masjidDone:['Masjid selesai dibangun!','Masjid complete!'],
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
const QUESTS=[
 {id:'feed',key:'q_feed',icon:'hay',stat:'fed',goal:3,coins:30,pahala:5},
 {id:'water',key:'q_water',icon:'water',stat:'watered',goal:2,coins:20,pahala:4},
 {id:'wash',key:'q_wash',icon:'soap',stat:'washed',goal:1,coins:25,pahala:5},
 {id:'happy',key:'q_happy',icon:'heart',stat:'happy',goal:2,coins:20,pahala:4},
 {id:'build',key:'q_build',icon:'dome',stat:'placed',goal:1,coins:35,pahala:8},
 {id:'vis',key:'q_vis',icon:'people',stat:'visitors',goal:2,coins:20,pahala:6},
];

export async function init(ctx){
  const root=document.getElementById('ui')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'ui'}));
  const S=ctx.state; const Q=new URLSearchParams(location.search);
  for(const k in defaultState()) if(S[k]===undefined) S[k]=defaultState()[k];
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
    <div class="tb-left"><div class="pill clay daypill" id="daypill"><div class="dico" id="dico"></div><div class="dtxt"><b id="dayN"></b><small id="clock"></small></div></div></div>
    <div class="eid clay gold" id="eidpill"><div class="moon">${ic('calendar')}</div><div><div class="h" id="eidH"></div><small id="eidS"></small></div></div>
    <div class="tb-wallet">
      <div class="pill clay coinpill" id="coinpill">${ic('coin')}<b id="coinN">0</b></div>
      <div class="pill clay pahpill" id="pahpill">${ic('pahala')}<b id="pahN">0</b></div>
    </div>
    <button class="iconbtn clay" id="setBtn" aria-label="Settings">${ic('gear')}</button>
  </div>
  <div id="tracker" class="clay"><div id="qchip"></div><div id="qlist"></div></div>
  <div id="ptr"></div>
  <div id="dock">
    <button class="dbtn clay" id="dQ" style="position:relative">${ic('scroll')}<span data-t="quests"></span><span class="badge" id="qBadge"></span></button>
    <button class="dbtn clay" id="dS">${ic('bag')}<span data-t="shop"></span></button>
    <button class="dbtn clay teal" id="dB">${ic('dome')}<span data-t="build"></span></button>
  </div>
  <div id="toasts"></div>
  <div id="hint" class="clay hidden"><div class="av">${ic('marbot')}</div><div class="tx" id="hintTx"></div><button class="x" id="hintX" aria-label="Close">${ic('close')}</button></div>
  <div id="hotbar" class="clay"></div>`;
  root.appendChild(hud);
  const modal=el('div'); modal.id='modal'; root.appendChild(modal);
  const summary=el('div','overlay'); summary.id='summary'; root.appendChild(summary);
  const eidOv=el('div','overlay'); eidOv.id='eid'; root.appendChild(eidOv);
  const title=el('div'); title.id='title'; root.appendChild(title);

  function applyLang(r=root){ r.querySelectorAll('[data-t]').forEach(n=>n.textContent=t(n.dataset.t)); document.documentElement.lang=S.lang; }

  // ---------------- tap sound + press feedback ----------------
  root.addEventListener('pointerdown',e=>{ const b=e.target.closest('button,.btn,.hb,#tracker,.eid'); if(b){ sfx('ui_tap'); } },{passive:true});

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
  function toast(msg,icon='chat',kind){ if(!msg) return; const n=el('div','toast clay '+(kind||''),`${ic(icon)}<span>${msg}</span>`); toasts.appendChild(n); while(toasts.children.length>3) toasts.firstChild.remove(); setTimeout(()=>{ n.classList.add('out'); setTimeout(()=>n.remove(),450); },3200); }
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
    const night=h<5.5||h>=18.5; const key=s+night+S.day+S.daysToEid+S.lang+S.eidDone; if(key===lastClock) return; lastClock=key;
    $('#clock').textContent=s+' · '+(night?(S.lang==='en'?'Night':'Malam'):h<11?(S.lang==='en'?'Morning':'Pagi'):h<15?(S.lang==='en'?'Noon':'Siang'):(S.lang==='en'?'Evening':'Sore'));
    $('#dayN').textContent=t('day')+' '+S.day; $('#dico').innerHTML=ic(night?'moon':'sun'); $('#daypill').classList.toggle('night',night);
    const e=S.daysToEid; $('#eidH').textContent=e<=0?t('eidToday'):t('daysLeft',{n:e}); $('#eidS').textContent=e<=0?t('eidSub'):t('toEid'); $('#eidpill').classList.toggle('soon',e<=2);
  }

  // ---------------- hotbar ----------------
  const hotbar=$('#hotbar');
  function renderHotbar(){
    hotbar.innerHTML=''; for(const it of SHOP){ const n=S.inventory[it.id]||0; const b=el('button','hb'+(S.tool===it.id?' sel':'')+(n<=0?' empty':''),`${ic(it.icon)}<em>${n}</em>`); b.title=t(it.id);
      b.onclick=()=>{ S.tool=it.id; ctx.emit('tool:select',it.id); renderHotbar(); }; hotbar.appendChild(b); }
  }
  ctx.on('inventory:change',renderHotbar);

  // ---------------- quests ----------------
  const qlist=$('#qlist');
  const qProg=q=>Math.min(q.goal,D0()[q.stat]||0);
  const notified=new Set(); let qOpen=false;
  const qDone=q=>qProg(q)>=q.goal, qClaimable=q=>qDone(q)&&!S.quests.claimed[q.id];
  function renderTracker(){
    qlist.innerHTML='';
    for(const q of QUESTS){ const p=qProg(q), done=p>=q.goal;
      qlist.appendChild(el('div','q'+(done?' done':''),`<div class="chk">${ic('check')}</div><div class="qt">${t(q.key)}<div class="bar"><i style="width:${p/q.goal*100}%"></i></div></div><div class="cnt">${p}/${q.goal}</div>`)); }
    const cl=QUESTS.filter(qClaimable), cur=cl[0]||QUESTS.find(q=>!qDone(q));
    const tr=$('#tracker'); tr.classList.toggle('claim',!!cl.length); tr.classList.toggle('open',qOpen);
    $('#qchip').innerHTML=cur?`${ic(cl.length?'check':cur.icon)}<span class="qt">${cl.length?t('claim')+': ':''}${t(cur.key)}</span><span class="cnt">${qProg(cur)}/${cur.goal}</span>${ic('chev','chev')}`:`${ic('check')}<span class="qt">${t('q_done')}</span>${ic('chev','chev')}`;
    const b=$('#qBadge'); b.textContent=cl.length||'';
  }
  function claim(id){ const q=QUESTS.find(x=>x.id===id); if(!q||!qClaimable(q)) return; S.quests.claimed[id]=true; addCoins(q.coins); addPahala(q.pahala); sfx('coin'); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2.2,z:c.z},18); renderTracker(); if(panel==='quest') renderPanel(); }
  function checkQuests(){
    for(const q of QUESTS){ if(qDone(q)&&!notified.has(q.id)){ notified.add(q.id); if(!S.quests.claimed[q.id]){ toast(t('doneTap'),'check','good'); sfx('chime'); } } }
    renderTracker(); if(panel==='quest') renderPanel();
  }
  const q_done=()=>'q_done';
  function stat(k,n=1){ D0()[k]=(D0()[k]||0)+n; if(S.stats[k]!==undefined) S.stats[k]+=n; checkQuests(); }
  function dayReset(){ S.daily={fed:0,watered:0,washed:0,happy:0,placed:0,visitors:0,coins:0,pahala:0}; S.quests={day:S.day,claimed:{}}; notified.clear(); }
  ctx.on('animal:fed',()=>{ stat('fed'); addPahala(1); }); ctx.on('animal:watered',()=>{ stat('watered'); addPahala(1); }); ctx.on('animal:washed',()=>{ stat('washed'); addPahala(2); }); ctx.on('animal:happy',()=>{ stat('happy'); addPahala(1); });
  ctx.on('build:placed',()=>{ stat('placed'); S.stats.built++; if(panel==='build') renderPanel(); });
  ctx.on('build:complete',()=>{ toast(t('masjidDone'),'dome','good'); sfx('bedug'); sfx('chime'); });
  ctx.on('visitor:arrive',()=>{ stat('visitors'); });
  ctx.on('coins:change',()=>{ syncLedger(); if(panel==='shop'||panel==='build') renderPanel(); });

  // ---------------- panels ----------------
  let panel=null;
  const ribbons={shop:['bag','shopTitle'],build:['dome','buildTitle'],quest:['scroll','questTitle'],settings:['gear','setTitle']};
  function openPanel(name){
    panel=name; modal.classList.add('on'); renderPanel(true); if(name==='build') tutDone('build');
  }
  function closePanel(){ panel=null; modal.classList.remove('on'); modal.innerHTML=''; }
  modal.addEventListener('pointerdown',e=>{ if(e.target===modal) closePanel(); });
  function renderPanel(fresh){
    if(!panel) return; const [icon,tk]=ribbons[panel]; const scroll=$('.body',modal)?.scrollTop||0;
    let body='';
    if(panel==='shop') body=shopHTML(); else if(panel==='build') body=buildHTML(); else if(panel==='quest') body=questHTML(); else body=settingsHTML();
    modal.innerHTML=`<div class="sheet clay" style="${fresh?'':'animation:none'}"><div class="ribbon clay teal">${ic(icon)}${t(tk)}</div><button class="x clay gold" id="pX" aria-label="${t('close')}">${ic('close')}</button><div class="body">${body}</div></div>`;
    $('.body',modal).scrollTop=scroll; $('#pX',modal).onclick=closePanel; bindPanel();
  }
  const coinSub=()=>`<div class="sub"><span>${t('coins')}</span><span class="pill clay" style="padding:.25em .8em .25em .4em">${ic('coin')}<b>${fmt(S.coins)}</b></span></div>`;
  function shopHTML(){
    return coinSub()+'<div class="grid">'+SHOP.map(it=>`<div class="card"><div class="big">${ic(it.icon)}</div><h5>${t(it.id)} ×${it.qty}</h5><p>${t(it.id+'D')}</p><span class="own">${t('owned')} ${S.inventory[it.id]||0}</span><button class="btn gold" data-buy="${it.id}"><span class="price">${ic('coin')}${it.price}</span> ${t('buy')}</button></div>`).join('')+'</div>';
  }
  function parts(){
    const m=ctx.modules.masjid; const st=m?.stages;
    if(Array.isArray(st)&&st.length) return st.map((s,i)=>{ const f=PARTS.find(p=>p.id===(s.id??s.name)); return {id:s.id??s.name??i,name:s.name||s.label||s.id||('#'+(i+1)),cost:s.cost??s.price??f?.cost??40,desc:s.desc||s.description||(f?L(f.desc):''),raw:true}; });
    return PARTS.map(p=>({id:p.id,name:L(p.name),cost:p.cost,desc:L(p.desc)}));
  }
  const mStage=()=>{ const m=ctx.modules.masjid; return m&&typeof m.stage==='number'?m.stage:(S.masjid.stage|0); };
  function buildHTML(){
    const ps=parts(), st=Math.min(mStage(),ps.length);
    return `<div class="sub"><div style="display:flex;gap:.6em;align-items:center;flex:1"><span>${t('mosque')} ${st}/${ps.length}</span><div class="prog"><i style="width:${st/ps.length*100}%"></i></div></div><span class="pill clay" style="padding:.25em .8em .25em .4em">${ic('coin')}<b>${fmt(S.coins)}</b></span></div><div class="grid">`+
      ps.map((p,i)=>{ const dn=i<st, lk=i>st, can=!lk&&S.coins>=p.cost;
        return `<div class="card ${dn?'done':''}"><div class="big">${ic(dn?'check':lk?'lock':i%3==0?'dome':i%3==1?'flag':'hammer')}</div><h5>${p.name}</h5><p>${p.desc||''}</p>${dn?`<span class="own">${t('built')}</span>`:lk?`<span class="own" style="background:rgba(150,100,30,.15);color:var(--ink2)">${t('locked')}</span>`:`<button class="btn cl ${can?'teal':''} ${can?'':'off'}" data-place="${p.id}"><span class="price">${ic('coin')}${p.cost}</span> ${t('place')}</button>`}</div>`; }).join('')+'</div>';
  }
  function questHTML(){
    return `<div class="sub"><span>${t('day')} ${S.day}</span><span style="display:flex;gap:.4em;align-items:center">${ic('calendar')}${t('daysLeft',{n:Math.max(0,S.daysToEid)})}</span></div>`+QUESTS.map(q=>{ const p=qProg(q),dn=p>=q.goal,cd=S.quests.claimed[q.id]; return `<div class="qrow ${dn?'done':''}"><div class="qi">${ic(dn?'check':q.icon)}</div><div class="mid"><b>${t(q.key)}</b><div style="display:flex;gap:.6em;align-items:center"><div class="prog" style="height:.7em"><i style="width:${p/q.goal*100}%"></i></div><small>${p}/${q.goal}</small></div></div><div class="rw"><span>${ic('coin')}${q.coins}</span><span>${ic('pahala')}${q.pahala}</span></div>${dn&&!cd?`<button class="btn teal claim" data-claim="${q.id}">${t('claim')}</button>`:cd?`<div class="got">${ic('check')}${t('claimed')}</div>`:''}</div>`; }).join('');
  }
  function settingsHTML(){
    const m=audio()?.muted??S.settings.mute;
    return `<div class="set"><span style="display:flex;gap:.6em;align-items:center">${ic(m?'mute':'sound')}${t('sound')}</span><button class="sw ${m?'':'on'}" id="swMute"></button></div>
    <div class="set"><span>${t('music')}</span><input type="range" id="rMus" min="0" max="1" step=".05" value="${S.settings.music}"></div>
    <div class="set"><span>${t('sfx')}</span><input type="range" id="rSfx" min="0" max="1" step=".05" value="${S.settings.sfx}"></div>
    <div class="set"><span>${t('lang')}</span><div class="seg"><button data-lang="id" class="${S.lang==='id'?'on':''}">Indonesia</button><button data-lang="en" class="${S.lang==='en'?'on':''}">English</button></div></div>
    <div class="danger"><div class="set"><span>${t('danger')}</span><button class="hold" id="bReset"><i></i><span>${t('holdReset')}</span></button></div></div>`;
  }
  function bindPanel(){
    modal.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim));
    modal.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{ const it=SHOP.find(i=>i.id===b.dataset.buy); if(!spend(it.price)){ toast(t('noCoins'),'coin','bad'); b.classList.add('shake'); setTimeout(()=>b.classList.remove('shake'),400); return; }
      S.inventory[it.id]=(S.inventory[it.id]||0)+it.qty; ctx.emit('inventory:change',S.inventory); sfx('coin'); sfx('pop'); renderHotbar(); renderPanel(); });
    modal.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{ const p=parts().find(x=>String(x.id)===b.dataset.place); placePart(p); });
    $('#swMute',modal)&&($('#swMute',modal).onclick=()=>{ const a=audio(); const m=!(a?.muted??S.settings.mute); S.settings.mute=m; a?.setMuted?.(m); if(!m) sfx('chime'); renderPanel(); });
    $('#rMus',modal)&&($('#rMus',modal).oninput=e=>{ S.settings.music=+e.target.value; audio()?.setMusic?.(S.settings.music); });
    $('#rSfx',modal)&&($('#rSfx',modal).oninput=e=>{ S.settings.sfx=+e.target.value; audio()?.setSfx?.(S.settings.sfx); });
    for(const id of ['#rMus','#rSfx']) $(id,modal)&&($(id,modal).onchange=()=>sfx('pop'));
    modal.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{ S.lang=b.dataset.lang; applyLang(); lastClock=''; renderAll(); renderPanel(); });
    const r=$('#bReset',modal); if(r){ let t0=0,raf=0; const bar=r.querySelector('i'); const stop=()=>{ cancelAnimationFrame(raf); t0=0; bar.style.width='0'; };
      const tick=()=>{ const p=(performance.now()-t0)/1200; bar.style.width=Math.min(100,p*100)+'%'; if(p>=1){ reset(); location.reload(); } else raf=requestAnimationFrame(tick); };
      r.addEventListener('pointerdown',e=>{ e.preventDefault(); t0=performance.now(); raf=requestAnimationFrame(tick); }); for(const ev of ['pointerup','pointerleave','pointercancel']) r.addEventListener(ev,stop); }
  }
  function placePart(p){
    if(!p||S.coins<p.cost) return; const m=ctx.modules.masjid; const fn=m?.place||m?.api?.place;
    if(fn){ let ok; try{ ok=fn.call(m?.api&&m.api.place===fn?m.api:m,p.id); }catch(e){ console.warn(e); ok=false; } if(ok===false){ return; } } // masjid charges coins/pahala and emits build:placed itself
    else { // standalone fallback (no masjid module)
      if(!spend(p.cost)) return; S.masjid.parts[p.id]=true; S.masjid.stage=(S.masjid.stage|0)+1; ctx.emit('build:placed',{id:p.id}); if(S.masjid.stage>=parts().length) ctx.emit('build:complete',{});
    }
    sfx('build'); const c=camTarget(); fx()?.burst('dust',{x:c.x,y:c.y,z:c.z},12); renderPanel();
  }
  $('#dQ').onclick=()=>openPanel('quest'); $('#tracker').onclick=()=>{ const q=QUESTS.find(qClaimable); if(q){ claim(q.id); return; } qOpen=!qOpen; renderTracker(); }; $('#dS').onclick=()=>openPanel('shop'); $('#dB').onclick=()=>openPanel('build'); $('#setBtn').onclick=()=>openPanel('settings');
  addEventListener('keydown',e=>{ if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if(e.key==='Escape') closePanel(); const k={t:'quest',b:'build',p:'shop'}[e.key.toLowerCase()]; if(k&&!e.repeat&&started&&!summary.classList.contains('on')&&!eidOv.classList.contains('on')) (panel===k?closePanel():openPanel(k)); });

  // ---------------- tutorial hints ----------------
  const hint=$('#hint'), ptr=$('#ptr'); const hintSteps=[['h1','move'],['h2','fed'],['h3','build'],['h4','end']]; let hStep=0, hTimer=0, moveT=0;
  const joyOn=()=>{ const e=document.getElementById('mb-joy'); return e&&e.offsetWidth>0?e:null; };
  function showHint(){ if(S.tutDone||!started){ hint.classList.add('hidden'); ptr.style.display='none'; return; } const s=hintSteps[hStep]; if(!s){ S.tutDone=true; hint.classList.add('hidden'); ptr.style.display='none'; return; }
    $('#hintTx').textContent=t(s[0]==='h1'&&!joyOn()?'h1k':s[0]); hint.classList.remove('hidden'); hint.style.animation='none'; void hint.offsetWidth; hint.style.animation=''; hTimer=0; moveT=0; }
  function tutDone(ev){ if(hintSteps[hStep]?.[1]===ev){ hStep++; ptr.style.display='none'; setTimeout(showHint,ev==='end'?0:900); } }
  function placePtr(){ const s=hintSteps[hStep]?.[1]; const tgt=s==='move'?joyOn():s==='fed'?document.getElementById('mb-act'):s==='build'?document.getElementById('dB'):null;
    if(!tgt||hint.classList.contains('hidden')){ ptr.style.display='none'; return; } const r=tgt.getBoundingClientRect(); if(!r.width){ ptr.style.display='none'; return; } ptr.style.display='block'; ptr.style.left=(r.left+r.width/2)+'px'; ptr.style.top=(r.top+r.height/2)+'px'; }
  $('#hintX').onclick=()=>{ S.tutDone=true; hint.classList.add('hidden'); ptr.style.display='none'; };
  ctx.on('animal:fed',()=>tutDone('fed'));

  // ---------------- day cycle ----------------
  let prevHour=ctx.hour??8, lastDayT=-99, pendingEid=false;
  function newDay(){
    if(ctx.time-lastDayT<1.5) return; lastDayT=ctx.time;
    const s={...D0()}; const doneDay=S.day;
    S.day++; if(S.daysToEid>0) S.daysToEid--; dayReset(); save(S);
    lastClock=''; renderAll(); if(S.daysToEid===3) toast(t('eidSoon'),'crescent','good');
    pendingEid=S.daysToEid<=0 && !S.eidDone;
    showSummary(doneDay,s);
  }
  ctx.on('day:new',newDay);
  function statHTML(icon,val,label,i){ return `<div class="stat" style="animation-delay:${.12*i+.2}s">${ic(icon)}<div><b>${val}</b><small>${label}</small></div></div>`; }
  function showSummary(n,s){
    summary.innerHTML=`<div class="sumcard clay"><div class="moonbig">${ic(S.daysToEid<=0?'crescent':'sun')}</div><h2>${t('sumTitle',{n})}</h2><div class="sm">${t('sumSub')} · ${S.daysToEid>0?t('daysLeft',{n:S.daysToEid}):t('eidToday')}</div>
      <div class="stats">${statHTML('hay',s.fed||0,t('fed'),0)}${statHTML('soap',s.washed||0,t('washed'),1)}${statHTML('heart',s.happy||0,t('happy'),2)}${statHTML('dome',s.placed||0,t('placed'),3)}${statHTML('coin',s.coins||0,t('earned'),4)}${statHTML('pahala',s.pahala||0,t('pahalaE'),5)}</div>
      <button class="btn teal" id="sumGo" style="font-size:1.1em">${t('next',{n:S.day})}</button></div>`;
    summary.classList.add('on'); sfx('chime'); const c=camTarget(); fx()?.burst('sparkle',{x:c.x,y:c.y+2,z:c.z},24);
    $('#sumGo').onclick=()=>{ summary.classList.remove('on'); sfx('pop'); if(pendingEid){ pendingEid=false; showEid(); } else toast(t('newday')+' · '+t('day')+' '+S.day,'sun'); };
  }
  const KG={goat:30,sheep:35,cow:280};
  function eidAnimals(){
    const l=ctx.modules.animals?.list; const arr=Array.isArray(l)?l:[]; const out=[];
    for(const a of arr){ const k=String(a.kind||'goat').toLowerCase(); const kind=k.includes('cow')?'cow':k.includes('sheep')?'sheep':'goat'; const w=Number.isFinite(a.weight)?a.weight:KG[kind]; const s=a.stats||{}; const q=((s.happy??.7)*2+(s.hunger??.7)+(s.thirst??.7)+(s.clean??.7))/5;
      out.push({kind,name:a.name||'',w,stars:q>.82?3:q>.6?2:1,packs:Math.max(1,Math.round(w*0.45/0.5))}); }
    if(!out.length) for(const [kind,n] of [['goat',3],['sheep',2],['cow',1]]) for(let i=0;i<n;i++) out.push({kind,name:'',w:KG[kind],stars:2,packs:Math.round(KG[kind]*.45/.5),sample:true});
    return out;
  }
  let eidTimer=0;
  const starsHTML=n=>'<span class="stars">'+[1,2,3].map(i=>`<svg class="ic" style="width:1.1em;height:1.1em;opacity:${i<=n?1:.25}"><use href="#i-pahala"/></svg>`).join('')+'</span>';
  function showEid(){
    const an=eidAnimals(); const total=an.reduce((s,a)=>s+a.packs,0); const third=Math.round(total/3);
    const nm={goat:t('goats'),sheep:t('sheeps'),cow:t('cows')};
    eidOv.innerHTML=`<div class="eidcard clay"><div class="moonbig">${ic('crescent')}</div><h1>${t('eidTitle')}</h1><div class="gr">${t('eidGreet')}<small>${t('eidGloss')}</small></div><div class="sm" style="color:var(--ink2);margin-bottom:.6em">${t('eidSum')}</div>
      <div class="dist">${[['people',t('dFam')],['dome',t('dNeigh')],['heart',t('dPoor')]].map(([i,l],k)=>`<div class="stat" style="animation-delay:${.5+k*.2}s">${ic(i)}<b>${third}</b><small>${t('packs')}<br>${l}</small></div>`).join('')}</div>
      <div class="alist">${an.map(a=>`<div class="arow">${ic(a.kind==='cow'?'cow':'goat')}<span class="an">${a.name||nm[a.kind]}</span><span class="aw">${Math.round(a.w)} kg</span>${starsHTML(a.stars)}</div>`).join('')}</div>
      <div class="btnrow"><button class="btn gold" id="eKeep">${t('keep')}</button></div></div>`;
    eidOv.classList.add('on'); S.eidDone=true; addPahala(50); save(S);
    $('#eKeep').onclick=()=>{ eidOv.classList.remove('on'); eidTimer=0; S.eidDone=false; S.daysToEid=10; S.stats.years++; lastClock=''; sfx('chime'); renderAll(); save(S); toast(t('nextYear'),'calendar','good'); };
    sfx('bedug'); setTimeout(()=>sfx('chime'),900); setTimeout(()=>sfx('bedug'),1600); eidTimer=0.01; confettiWave();
  }
  function confettiWave(){ const c=camTarget(); fx()?.confettiRain?.({x:c.x,y:c.y,z:c.z},140,10); fx()?.burst('confetti',{x:c.x,y:c.y,z:c.z},80); }
  const overlayOpen=()=>!started||summary.classList.contains('on')||eidOv.classList.contains('on')||!!panel;

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
     <div class="lay" data-d="26"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        ${hills('#6cc58a','#4fa86a',740,50,2)}
        <g transform="translate(800 610) scale(.78)"><rect x="-150" y="0" width="300" height="130" rx="10" fill="#fff6e0"/><rect x="-150" y="0" width="300" height="14" fill="#f0c874"/><path d="M-85 0c0-70 38-120 85-120s85 50 85 120z" fill="#35b5a5"/><path d="M-60 -20c8-40 26-62 52-70" stroke="#8ff0de" stroke-width="12" fill="none" stroke-linecap="round" opacity=".7"/><path d="M0 -122v-30" stroke="#c47a0c" stroke-width="6"/><path d="M12 -168a20 20 0 1 0 -4 34a14 14 0 1 1 4 -34z" fill="#ffc83d"/>
          <rect x="-215" y="-110" width="42" height="240" rx="8" fill="#fff6e0"/><path d="M-222 -110l28-50 28 50z" fill="#35b5a5"/><rect x="173" y="-110" width="42" height="240" rx="8" fill="#fff6e0"/><path d="M166 -110l28-50 28 50z" fill="#35b5a5"/>
          <rect x="-205" y="-70" width="22" height="30" rx="11" fill="#ffd45a"/><rect x="183" y="-70" width="22" height="30" rx="11" fill="#ffd45a"/>
          ${[-110,-60,60,110].map(x=>`<rect x="${x-12}" y="30" width="24" height="46" rx="12" fill="#ffd45a"/>`).join('')}<path d="M-28 130v-60a28 28 0 0 1 56 0v60z" fill="#7a4a22"/></g></svg></div>
     <div class="lay" data-d="40"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">${hills('#8fdc6a','#5cb84a',830,60,3)}${tree(170,800,1.2,'#58b84e')}${tree(300,830,.9,'#6fc85a')}${palm(1380,810,1.2)}${tree(1500,820,1,'#58b84e')}${palm(1230,830,.9)}
        ${goat(520,845,1)}${goat(1060,850,.85,-1)}</svg></div>
     <div class="lay" data-d="60"><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"><path d="M0 900V850Q200 810 420 860T900 860T1400 840T1600 850V900z" fill="#4ca83e"/><g fill="#3d9232">${Array.from({length:30},(_,i)=>`<path transform="translate(${i*55+10} 870)" d="M0 40Q-6 8 -10 -8Q4 14 6 40zM8 40Q12 12 22 4Q18 22 18 40z"/>`).join('')}</g></svg></div>
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
  if(S.quests.day!==S.day){ dayReset(); }
  if(S.daysToEid<=0&&S.eidDone){ S.daysToEid=10; S.eidDone=false; }
  if(Number.isFinite(S.hour)) ctx.hour=S.hour;
  buildTitle(); renderAll();
  if(Q.has('nt')||Q.has('skip')){ started=true; title.remove(); }
  if(Q.has('hint')){ started=true; title.remove(); setTimeout(showHint,300); }
  const demo=Q.get('panel'); if(demo){ started=true; title.remove(); setTimeout(()=>openPanel(demo),200); }
  const show=Q.get('show'); if(show==='eid'){ started=true; title.remove(); setTimeout(showEid,300); } if(show==='summary'){ started=true; title.remove(); S.daysToEid=7; S.day=4; setTimeout(()=>showSummary(3,{fed:5,washed:2,happy:4,placed:2,coins:140,pahala:23}),300); }
  if(Q.has('demo')){ S.coins=340; S.pahala=128; S.daily={...S.daily,fed:2,washed:1,happy:2}; S.daysToEid=7; renderAll(); tween.coins=S.coins; tween.pahala=S.pahala; }

  let acc=0, measureT=0;
  return {
    toast, openPanel, closePanel, overlayOpen, addCoins, addPahala, spend, showSummary, showEid, startGame, t,
    update(dt){
      // day tick: fallback clock if no world module drives ctx.hour
      if(started && !ctx.modules.world && !overlayOpen()) ctx.hour=((ctx.hour??8)+dt*24/420)%24;
      const h=ctx.hour??8; if(h<prevHour-6) ctx.emit('day:new'); prevHour=h;
      renderTop(dt); acc+=dt; if(acc>.5){ acc=0; renderClock(); S.hour=ctx.hour; syncLedger(); }
      if(eidTimer>0){ eidTimer+=dt; if(eidTimer>5){ eidTimer=0.01; if(eidOv.classList.contains('on')) confettiWave(); else eidTimer=0; } }
      // tutorial: detect movement / auto-advance
      if(started&&!S.tutDone&&!hint.classList.contains('hidden')){ hTimer+=dt; const m=ctx.input?.move; const s=hintSteps[hStep]?.[1];
        if(s==='move'){ if(m&&(Math.abs(m.x)+Math.abs(m.y)>.3)) moveT+=dt; if(moveT>.8) tutDone('move'); }
        else if(s==='end'&&hTimer>6) tutDone('end'); placePtr(); }
      if(!(measureT=(measureT||0)+dt)||measureT>.5){ measureT=0.01; measureTop(); }
    },
  };
}

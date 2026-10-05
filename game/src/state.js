// Game progression state & persistence (schema-guarded: every field is type/range checked on load)
export const defaultState = ()=>({
  day:1, daysToEid:10, coins:120, pahala:0, year:1,
  masjid:{ stage:0, parts:{} },            // building progress
  animals:[],                               // saved animal stats
  inventory:{ hay:10, water:10, soap:3, treat:5 },
  settings:{ mute:false, music:0.6, sfx:1 },
  daily:{ fed:0, treats:0, watered:0, washed:0, washedCow:0, petted:0, happy:0, placed:0, bought:0, visitors:0, donations:0, prayers:0,
          bedug:0, bedugDusk:0, decorPlaced:0, sick:0, healthy:0, coins:0, pahala:0 }, // today's counters (quests + summary)
  pettedToday:[],                           // names petted today (unique-pet quest)
  quests:{ day:0, list:[], claimed:{} },    // today's rolled quests (game/progress)
  event:{ day:0, id:'cerah' },              // today's daily event
  stats:{ fed:0, watered:0, washed:0, petted:0, happy:0, built:0, visitors:0, donations:0, bedug:0, bedugDusk:0, decorPlaced:0, eids:0, eid3:0, jumatDone:0, years:0 },
  streak:0, bestStreak:0, berkahSeen:0, penLevel:0, outfit:'klasik',
  decor:{ owned:{}, placed:[] },            // placed: [{slot, kind}]
  stickers:{},                              // id -> day unlocked
  tutDone:false, eidDone:false, tool:'hay', hour:8,
});
const merge=(d,s)=>{ for(const k in s){ d[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])&&s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]))?merge(d[k],s[k]):s[k]; } return d; };
const num=(v,d,min=-Infinity,max=Infinity)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):d;
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const ID=/^[a-z0-9_]{1,24}$/i;
function sanitize(s){ const d=defaultState();
  s.day=num(s.day,d.day,1); s.daysToEid=num(s.daysToEid,d.daysToEid,0,99); s.coins=num(s.coins,d.coins,0); s.pahala=num(s.pahala,d.pahala,0); s.hour=num(s.hour,8,0,24);
  s.year=num(s.year,1,1,9999); s.streak=num(s.streak,0,0,9999); s.bestStreak=num(s.bestStreak,0,0,9999); s.berkahSeen=num(s.berkahSeen,0,0,99); s.penLevel=num(s.penLevel,0,0,9);
  for(const k of ['masjid','settings','daily','quests','stats','inventory','event','decor','stickers']) if(!obj(s[k])) s[k]=d[k];
  if(!obj(s.masjid.parts)) s.masjid.parts={}; s.masjid.stage=num(s.masjid.stage,0,0,99);
  if(!obj(s.quests.claimed)) s.quests.claimed={}; s.quests.day=num(s.quests.day,0,0);
  s.quests.list=Array.isArray(s.quests.list)?s.quests.list.filter(q=>obj(q)&&typeof q.id==='string'&&Number.isFinite(q.goal)&&Number.isFinite(q.coins)&&Number.isFinite(q.pahala)):[];
  if(typeof s.event.id!=='string') s.event={...d.event}; s.event.day=num(s.event.day,0,0);
  for(const k in d.inventory) s.inventory[k]=num(s.inventory[k],d.inventory[k],0,9999);
  for(const k in d.daily) s.daily[k]=num(s.daily[k],0,0);
  for(const k in d.stats) s.stats[k]=num(s.stats[k],0,0);
  if(!Array.isArray(s.pettedToday)) s.pettedToday=[]; s.pettedToday=s.pettedToday.filter(x=>typeof x==='string'||typeof x==='number').slice(0,64);
  if(!obj(s.decor.owned)) s.decor.owned={}; for(const k in s.decor.owned){ if(!ID.test(k)) delete s.decor.owned[k]; else s.decor.owned[k]=num(s.decor.owned[k],0,0,999); }
  s.decor.placed=Array.isArray(s.decor.placed)?s.decor.placed.filter(p=>obj(p)&&ID.test(p.slot)&&ID.test(p.kind)).slice(0,64):[];
  for(const k in s.stickers){ if(!ID.test(k)) delete s.stickers[k]; else s.stickers[k]=num(s.stickers[k],1,1); }
  if(typeof s.outfit!=='string'||!ID.test(s.outfit)) s.outfit='klasik';
  if(s.look!==undefined&&!obj(s.look)) delete s.look;
  s.settings.music=num(s.settings.music,.6,0,1); s.settings.sfx=num(s.settings.sfx,1,0,1); s.settings.mute=!!s.settings.mute;
  if(!Array.isArray(s.animals)) s.animals=[]; if(s.lang!=='id'&&s.lang!=='en') delete s.lang;
  s.tutDone=!!s.tutDone; s.eidDone=!!s.eidDone;
  return s; }
export function load(){ try{ const r=localStorage.getItem('marbot.save'); return sanitize(r?merge(defaultState(),JSON.parse(r)):defaultState()); }catch(e){return defaultState();} }
export function save(s){ try{ localStorage.setItem('marbot.save',JSON.stringify(s)); }catch(e){} }
export function reset(){ try{ localStorage.removeItem('marbot.save'); }catch(e){} }

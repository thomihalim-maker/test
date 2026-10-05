// Game progression state & persistence
export const defaultState = ()=>({
  day:1, daysToEid:10, coins:120, pahala:0,
  masjid:{ stage:0, parts:{} },            // building progress
  animals:[],                               // saved animal stats
  inventory:{ hay:10, water:10, soap:3, treat:5 },
  settings:{ mute:false, music:0.6, sfx:1 },
  daily:{ fed:0, watered:0, washed:0, happy:0, placed:0, visitors:0, coins:0, pahala:0 }, // today's counters (quests + summary)
  quests:{ day:1, claimed:{} },
  stats:{ fed:0, washed:0, happy:0, built:0, visitors:0, years:0 },
  tutDone:false, eidDone:false, tool:'hay', hour:8,
});
const merge=(d,s)=>{ for(const k in s){ d[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])&&s[k]&&typeof s[k]==='object')?merge(d[k],s[k]):s[k]; } return d; };
const num=(v,d,min=-Infinity,max=Infinity)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):d;
function sanitize(s){ const d=defaultState();
  s.day=num(s.day,d.day,1); s.daysToEid=num(s.daysToEid,d.daysToEid,0,99); s.coins=num(s.coins,d.coins,0); s.pahala=num(s.pahala,d.pahala,0); s.hour=num(s.hour,8,0,24);
  for(const k of ['masjid','settings','daily','quests','stats','inventory']) if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k])) s[k]=d[k];
  if(!s.masjid.parts||typeof s.masjid.parts!=='object') s.masjid.parts={}; s.masjid.stage=num(s.masjid.stage,0,0,99);
  if(!s.quests.claimed||typeof s.quests.claimed!=='object') s.quests.claimed={};
  for(const k in d.inventory) s.inventory[k]=num(s.inventory[k],d.inventory[k],0,9999);
  for(const k in d.daily) s.daily[k]=num(s.daily[k],0,0);
  for(const k in d.stats) s.stats[k]=num(s.stats[k],0,0);
  s.settings.music=num(s.settings.music,.6,0,1); s.settings.sfx=num(s.settings.sfx,1,0,1); s.settings.mute=!!s.settings.mute;
  if(!Array.isArray(s.animals)) s.animals=[]; if(s.lang!=='id'&&s.lang!=='en') delete s.lang;
  return s; }
export function load(){ try{ const r=localStorage.getItem('marbot.save'); return sanitize(r?merge(defaultState(),JSON.parse(r)):defaultState()); }catch(e){return defaultState();} }
export function save(s){ try{ localStorage.setItem('marbot.save',JSON.stringify(s)); }catch(e){} }
export function reset(){ try{ localStorage.removeItem('marbot.save'); }catch(e){} }

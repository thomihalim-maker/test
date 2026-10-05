// Game progression state & persistence
export const defaultState = ()=>({
  day:1, daysToEid:10, coins:120, pahala:0,
  masjid:{ stage:0, parts:{} },            // building progress
  animals:[],                               // saved animal stats
  inventory:{ hay:10, water:10, soap:3, treat:5 },
  settings:{ mute:false, music:0.6, sfx:1 },
  daily:{ fed:0, washed:0, happy:0, placed:0, visitors:0, coins:0, pahala:0 }, // today's counters (quests + summary)
  quests:{ day:1, claimed:{} },
  stats:{ fed:0, washed:0, happy:0, built:0, visitors:0, years:0 },
  tutDone:false, eidDone:false, tool:'hay',
});
const merge=(d,s)=>{ for(const k in s){ d[k]=(d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k])&&s[k]&&typeof s[k]==='object')?merge(d[k],s[k]):s[k]; } return d; };
export function load(){ try{ const s=localStorage.getItem('marbot.save'); return s?merge(defaultState(),JSON.parse(s)):defaultState(); }catch(e){return defaultState();} }
export function save(s){ try{ localStorage.setItem('marbot.save',JSON.stringify(s)); }catch(e){} }
export function reset(){ try{ localStorage.removeItem('marbot.save'); }catch(e){} }

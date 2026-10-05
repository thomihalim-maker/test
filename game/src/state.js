// Game progression state & persistence
export const defaultState = ()=>({
  day:1, daysToEid:10, coins:120, pahala:0,
  masjid:{ stage:0, parts:{} },            // building progress
  animals:[],                               // saved animal stats
  inventory:{ hay:10, water:10, soap:3, treat:5 },
});
export function load(){ try{ const s=localStorage.getItem('marbot.save'); return s?{...defaultState(),...JSON.parse(s)}:defaultState(); }catch(e){return defaultState();} }
export function save(s){ try{ localStorage.setItem('marbot.save',JSON.stringify(s)); }catch(e){} }

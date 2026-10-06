// DESAIN MASJID: the player picks roof, walls, trim, roof style, finial, minaret, gate, carpet and lanterns.
// Catalog/ownership/buying/persistence here; drawing via masjid.applyCustom(custom, {preview}). Free basics are always
// owned; premium options unlock by Berkah level and cost coins once (earned in play only). Live preview never saves.
import { CATALOG, ORDER, STAGE_OF, DEFAULTS, optionOf, normalizeCustom } from './catalog.js';
import { save } from '../state.js';
export { CATALOG, ORDER, STAGE_OF };

export async function init(ctx){
  const S = ctx.state;
  S.masjid ??= { stage:0, parts:{} };
  S.masjid.custom = normalizeCustom(S.masjid.custom);
  S.masjid.owned ??= {};
  const Mj = () => ctx.modules.masjid, Ch = () => ctx.modules.characters;
  const safe = (f, d=null) => { try{ return f(); }catch(e){ console.warn('custom:', e); return d; } };
  const level = () => safe(() => ctx.modules.progress?.level?.(), 1) ?? 1;
  const stageNow = () => { const m = Mj(); return typeof m?.stage === 'number' ? m.stage : (S.masjid?.stage|0); };
  const spend = n => { const u = ctx.modules.ui; if(u?.spend) return u.spend(n) !== false; if((S.coins||0) < n) return false; S.coins -= n; ctx.emit('coins:change', { coins:S.coins }); return true; };
  const owned = (cat, opt) => !opt.price || !!S.masjid.owned[cat + ':' + opt.id];
  let draft = {}, openCat = null, camToken = null, rigSave = null;
  const queryCustom = () => { const q = safe(() => Mj()?.queryCustom); return q && typeof q === 'object' ? q : null; };
  const apply = (obj, preview) => safe(() => Mj()?.applyCustom?.(obj, { preview:!!preview }), false);
  const saved = () => S.masjid.custom;
  const shown = () => ({ ...saved(), ...(queryCustom() || {}), ...draft });

  function options(cat){
    const C = CATALOG[cat]; if(!C) return [];
    const lv = level(), built = stageNow() >= (STAGE_OF[cat] ?? 0), sel = saved()[cat], pv = draft[cat];
    return C.options.map(o => { const unlocked = lv >= o.lv; return { ...o, cat, unlocked, owned:owned(cat, o), selected:sel === o.id, previewing:pv === o.id, locked:unlocked ? null : 'level', built, stage:STAGE_OF[cat] ?? 0 }; });
  }
  function preview(cat, id){
    const o = optionOf(cat, id); if(!o) return false;
    if(saved()[cat] === id) delete draft[cat]; else draft[cat] = id;
    const obj = shown(); apply(obj, true);
    ctx.emit('masjid:custom', { cat, id, custom:obj, preview:true, bought:false });
    return true;
  }
  function commit(cat, id){
    const o = optionOf(cat, id); if(!o) return { ok:false, reason:'invalid' };
    let bought = false;
    if(!owned(cat, o)){
      if(level() < o.lv) return { ok:false, reason:'level' };
      if(!spend(o.price)) return { ok:false, reason:'coins' };
      S.masjid.owned[cat + ':' + o.id] = 1; bought = true;
    }
    const changed = saved()[cat] !== id;
    S.masjid.custom = { ...saved(), [cat]:id };
    delete draft[cat];
    const obj = shown(), still = Object.keys(draft).length > 0 || !!queryCustom();
    apply(still ? obj : S.masjid.custom, still);
    if(changed || bought){
      ctx.emit('masjid:custom', { cat, id, custom:{ ...S.masjid.custom }, preview:false, bought });
      safe(() => ctx.modules.audio?.play?.(bought ? 'coin' : 'chime'));
      if(bought) safe(() => ctx.modules.audio?.play?.('chime'));
      const v = safe(() => Mj()?.viewFor?.(cat)); const tg = v?.target;
      if(tg) safe(() => { ctx.modules.fx?.burst?.('sparkle', { x:tg.x, y:tg.y, z:tg.z }, 30); ctx.modules.fx?.burst?.('confetti', { x:tg.x, y:tg.y, z:tg.z }, bought ? 40 : 18); });
    }
    save(S);
    return { ok:true, bought, changed };
  }
  function revert(){ draft = {}; const q = queryCustom(); apply(q ? { ...saved(), ...q } : saved(), !!q); return true; }

  // ---------- camera framing (one path: masjid.viewFor -> characters.focusCamera) ----------
  function frame(cat){
    const v = safe(() => Mj()?.viewFor?.(cat));
    safe(() => Mj()?.setCutaway?.('design', cat === 'floor'));
    const C = Ch();
    if(v?.target && C?.focusCamera){
      const old = camToken; camToken = safe(() => C.focusCamera(v.target, { dist:v.dist, pitch:v.pitch, yaw:v.yaw, dur:0, hold:true, follow:false }));
      if(old != null && old !== camToken) safe(() => C.releaseCamera?.(old));
      return;
    }
    // fallback: just pull the orbit back so the whole masjid is in view
    const R = ctx.cameraRig; if(!R) return;
    if(!rigSave) rigSave = { dist:R.dist, pitch:R.pitch };
    R.dist = Math.max(R.dist, v?.dist ?? 24); R.pitch = Math.max(R.pitch, v?.pitch ?? .5);
  }
  function open(cat=ORDER[0]){ openCat = CATALOG[cat] ? cat : ORDER[0]; draft = {}; frame(openCat); return true; }
  function focus(cat){ if(!CATALOG[cat]) return false; openCat = cat; frame(cat); return true; }
  function close(){
    if(Object.keys(draft).length) revert();
    openCat = null;
    safe(() => Mj()?.setCutaway?.('design', false));
    const C = Ch(); if(camToken != null){ safe(() => C?.releaseCamera?.(camToken)); camToken = null; }
    const R = ctx.cameraRig; if(rigSave && R){ R.dist = rigSave.dist; R.pitch = rigSave.pitch; } rigSave = null;
    return true;
  }
  const get = () => ({ ...saved() });

  // ---------- boot: masjid already applied the save (and any ?custom= preview); re-apply idempotently ----------
  { const q = queryCustom(); apply(q ? { ...saved(), ...q } : saved(), !!q); }

  return {
    CATALOG, ORDER, STAGE_OF, DEFAULTS,
    get, get draft(){ return { ...draft }; }, get current(){ return shown(); }, get openCat(){ return openCat; },
    options, preview, commit, revert, open, close, focus,
    isBuilt:cat => stageNow() >= (STAGE_OF[cat] ?? 0),
    update(){},
  };
}

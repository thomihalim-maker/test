// Progress storage (per-device convenience; game works without it).
const KEY = 'bintang-kecil-v1';
let data = { stars: {}, muted: false };
try { const s = localStorage.getItem(KEY); if (s) data = { ...data, ...JSON.parse(s) }; } catch (_) {}

export const save = {
  get stars() { return data.stars; },
  setStars(level, n) { data.stars[level] = Math.max(data.stars[level] || 0, n); persist(); },
  unlocked(level) { return level === 1 || !!data.stars[level - 1] || new URLSearchParams(location.search).has('unlock'); },
  get muted() { return data.muted; },
  set muted(v) { data.muted = !!v; persist(); },
};
function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {} }

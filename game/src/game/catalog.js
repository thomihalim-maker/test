// Masjid design catalog (shared contract: ids, names, Berkah level, coin price, swatch). Pure data, no imports.
// Rendering lives in src/masjid/custom.js (masjid.applyCustom); ownership/buying in src/game/custom.js.
const o = (id, name, lv, price, swatch) => swatch ? { id, name, lv, price, swatch } : { id, name, lv, price };
export const CATALOG = {
  roof: { icon:'roof', name:['Atap','Roof'], view:'roof', options:[
    o('sirap',    ['Sirap Madu','Honey Shingle'], 1, 0, '#c98a4f'),
    o('sirapTua', ['Sirap Tua','Dark Shingle'], 1, 0, '#7a4a2c'),
    o('genteng',  ['Genteng Tanah Liat','Terracotta Tile'], 2, 60, '#c8643a'),
    o('hijau',    ['Genteng Hijau Glasir','Green Glazed Tile'], 3, 90, '#2f8f5a'),
    o('toska',    ['Genteng Toska Glasir','Teal Glazed Tile'], 5, 120, '#1f8f8a'),
  ] },
  wall: { icon:'wall', name:['Dinding','Walls'], view:'wall', options:[
    o('putih', ['Kapur Putih','Whitewash'], 1, 0, '#fffaf0'),
    o('krem',  ['Krem','Cream'], 1, 0, '#f6e3bf'),
    o('hijau', ['Hijau Lembut','Soft Green'], 2, 40, '#d9efd2'),
    o('biru',  ['Biru Langit','Sky Blue'], 3, 40, '#d6e9f7'),
    o('pasir', ['Pasir','Sand'], 4, 50, '#ead2a8'),
  ] },
  trim: { icon:'panel', name:['Aksen','Trim'], view:'trim', options:[
    o('toska', ['Toska','Teal'], 1, 0, '#2f8f86'),
    o('hijau', ['Hijau','Green'], 1, 0, '#3f8f3a'),
    o('emas',  ['Emas','Gold'], 2, 50, '#d9a028'),
    o('merah', ['Merah Marun','Maroon'], 3, 50, '#9a2f3a'),
    o('biru',  ['Biru Tua','Navy'], 4, 50, '#2a4f9a'),
  ] },
  roofStyle: { icon:'dome', name:['Bentuk Atap','Roof Style'], view:'roofStyle', options:[
    o('tumpang3', ['Tajug Tumpang Tiga','Three-tier Tajug'], 1, 0),
    o('tumpang2', ['Tajug Tumpang Dua','Two-tier Tajug'], 1, 0),
    o('kubah',    ['Tajug Berkubah','Tajug with Dome Crown'], 4, 150),
  ] },
  finial: { icon:'finial', name:['Mustaka','Finial'], view:'finial', options:[
    o('mustaka', ['Mustaka Emas','Golden Mustaka'], 1, 0),
    o('kuncup',  ['Kuncup Teratai','Lotus Bud'], 2, 40),
    o('bulan',   ['Bulan Sabit','Crescent'], 3, 60),
    o('mahkota', ['Mahkota','Crown'], 6, 80),
  ] },
  menara: { icon:'menara', name:['Menara','Minaret'], view:'menara', options:[
    o('kudus',   ['Bata Kudus','Kudus Brick'], 1, 0),
    o('ramping', ['Ramping Putih','Slim White'], 3, 120),
  ] },
  gate: { icon:'gate', name:['Gapura','Gate'], view:'gate', options:[
    o('bentar',    ['Candi Bentar','Split Gate'], 1, 0),
    o('sederhana', ['Gapura Sederhana','Simple Gate'], 1, 0),
    o('paduraksa', ['Paduraksa Beratap','Roofed Paduraksa'], 3, 100),
  ] },
  floor: { icon:'carpet', name:['Karpet','Carpet'], view:'floor', options:[
    o('hijau', ['Hijau','Green'], 1, 0, '#2f7a4a'),
    o('merah', ['Merah','Red'], 1, 0, '#8a1f2d'),
    o('biru',  ['Biru','Blue'], 2, 30, '#24539c'),
    o('emas',  ['Emas','Gold'], 4, 60, '#c9962a'),
    o('ungu',  ['Ungu','Purple'], 5, 60, '#6a3f9a'),
  ] },
  lantern: { icon:'lantern', name:['Lentera','Lanterns'], view:'lantern', options:[
    o('teplok',  ['Lentera Kertas','Paper Lantern'], 1, 0),
    o('bambu',   ['Lampu Bambu','Bamboo Lamp'], 2, 30),
    o('gantung', ['Lampu Kuningan','Brass Lamp'], 2, 40),
    o('lampion', ['Lampion Bulat','Round Lampion'], 3, 50),
  ] },
};
export const ORDER = ['roof','wall','trim','roofStyle','finial','menara','gate','floor','lantern'];
/** masjid stage at which each category becomes visible in the world (choices are still allowed earlier) */
export const STAGE_OF = { trim:1, wall:2, gate:2, roof:3, roofStyle:3, finial:3, menara:4, floor:7, lantern:8 };
export const DEFAULTS = Object.fromEntries(ORDER.map(c => [c, CATALOG[c].options[0].id]));
export const optionOf = (cat, id) => CATALOG[cat]?.options.find(x => x.id === id) || null;
/** fill missing/unknown ids with defaults */
export function normalizeCustom(c) { const out = {}; for (const k of ORDER) out[k] = optionOf(k, c?.[k]) ? c[k] : DEFAULTS[k]; return out; }

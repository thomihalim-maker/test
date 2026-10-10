// Level 1 "Siap Tidur" props: nursery set pieces + the five bedtime items, all hand-drawn SVG
// (pencil outlines, crayon fills) rasterized once at load. Owned by the level-1 builder.
import { svgSprite, canvasSprite } from '../engine/raster.js';
import { rng } from '../engine/tween.js';
import { PAL, svg, stroke, fill } from './style.js';

// Local pastel palette (dusk nursery), harmonised with PAL / the reference image.
export const C = {
  wall: '#f4d2bb', wallHi: '#f9e2d1', wallLo: '#efc4a9',
  wains: '#cfe5d6', wainsShade: '#b5d6c2',
  floor: '#dfa877', floorShade: '#c98f5f', floorLine: '#b27a4f',
  wood: '#e9b680', woodShade: '#d39a62', woodDeep: '#c4875a', woodBack: '#d7a06e',
  cream: '#fff8ee', creamShade: '#efe1cf',
  mint: '#a8dcc5', mintShade: '#86c6ab',
  coral: '#f39d95', coralShade: '#e27f78',
  lilac: '#ebe5fb', lilacShade: '#d2c6f2',
  butter: '#fbe49e', butterShade: '#f1cd6c',
  honey: '#e2a66c', honeyShade: '#c98a50', fawn: '#f8e3c3',
  pink: '#f8b9cb', pinkShade: '#ef9db4',
  sheet: '#fbdfe4', sheetShade: '#f1c4ce',
  sky1: '#363b7c', sky2: '#6f68ad', sky3: '#eeaea4',
  roof: '#545697', roofDeep: '#45478a', hill: '#7e77b6', lit: '#ffd77a',
};

// --- helpers ---------------------------------------------------------------------------------
/** filled + outlined group (children carry no fill/stroke attrs) */
const ol = (els, col, w = 3.2, line = PAL.line) => `<g fill="${col}" opacity="0.62">${els}</g><g ${fill(col)}>${els}</g><g ${stroke(w, line)}>${els}</g>`;
/** crayon tone layer (shade/highlight) */
const tone = (els, col, op = 0.55) => `<g fill="${col}" opacity="${op}" filter="url(#crayon)">${els}</g>`;
/** loose crayon scribble stroke */
const scrib = (d, col, w = 5, op = 0.5) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" filter="url(#crayon)"/>`;
const line = (d, w = 2.6, col = PAL.line) => `<path d="${d}" ${stroke(w, col)}/>`;
const blush = (x, y, rx = 9, ry = 6) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${PAL.cheek}" opacity="0.9" filter="url(#blush)"/>`;

export function starPath(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' ';
  }
  return d + 'Z';
}
const star = (cx, cy, R, col, op = 1, r = R * 0.5) => `<path d="${starPath(cx, cy, R, r)}" fill="${col}" opacity="${op}" stroke="${col}" stroke-width="${R * 0.35}" stroke-linejoin="round" filter="url(#crayon)"/>`;

// --- the five bedtime items ------------------------------------------------------------------
// Each: { w, h, art, outline } — outline is one path (single contour) used for silhouette/shadow/glow.
export const ITEMS = {
  bottle: {
    w: 120, h: 200,
    outline: 'M40 44 L46 44 C46 28 52 12 60 12 C68 12 74 28 74 44 L80 44 Q86 44 86 50 L86 68 Q92 74 92 90 L92 166 Q92 188 70 188 L50 188 Q28 188 28 166 L28 90 Q28 74 34 68 L34 50 Q34 44 40 44 Z',
    art: () => `
      ${ol(`<path d="M46 48 C46 30 52 13 60 13 C68 13 74 30 74 48 Z"/>`, '#f6c79d')}
      ${scrib('M54 40 C54 30 56 22 60 18', '#fff', 4, 0.7)}
      ${ol(`<rect x="28" y="70" width="64" height="118" rx="22"/>`, '#d6ebf7')}
      ${tone(`<path d="M32 104 Q46 98 60 104 T88 104 L88 166 Q88 184 70 184 L50 184 Q32 184 32 166 Z"/>`, '#fffdf7', 1)}
      ${line('M32 104 Q46 98 60 104 T88 104', 2.4, '#b7cbd8')}
      ${tone(`<path d="M70 110 L86 110 L86 166 Q86 182 70 184 Z"/>`, '#e9e4dc', 0.6)}
      ${scrib('M40 84 L40 166', '#fff', 7, 0.85)}
      ${line('M74 120 H84 M77 138 H84 M74 156 H84', 2.4, '#8fb2c9')}
      <path d="M52 148 C44 140 46 132 52 134 C55 135 56 138 56 140 C56 138 57 135 60 134 C66 132 68 140 60 148 L56 152 Z" fill="${C.pink}" stroke="${C.pinkShade}" stroke-width="2" filter="url(#crayon)"/>
      ${ol(`<rect x="33" y="44" width="54" height="28" rx="9"/>`, C.pink)}
      ${tone(`<rect x="33" y="60" width="54" height="12" rx="6"/>`, C.pinkShade, 0.7)}
      ${scrib('M40 52 H62', '#fff', 4, 0.75)}
    `,
  },
  teddy: {
    w: 170, h: 190,
    outline: 'M33 55 A20 20 0 1 1 60 30 Q85 20 110 30 A20 20 0 1 1 137 55 Q140 85 122 104 C140 108 156 130 148 146 C144 154 138 152 136 150 C146 162 146 186 120 189 L50 189 C24 186 24 162 34 150 C32 152 26 154 22 146 C14 130 30 108 48 104 Q30 85 33 55 Z',
    art: () => `
      ${ol(`<ellipse cx="42" cy="132" rx="16" ry="27" transform="rotate(32 42 132)"/><ellipse cx="128" cy="132" rx="16" ry="27" transform="rotate(-32 128 132)"/>`, C.honey)}
      ${ol(`<ellipse cx="85" cy="144" rx="50" ry="44"/>`, C.honey)}
      ${tone(`<ellipse cx="85" cy="160" rx="44" ry="26"/>`, C.honeyShade, 0.45)}
      ${ol(`<ellipse cx="85" cy="150" rx="26" ry="24"/>`, C.fawn, 2.6)}
      ${ol(`<ellipse cx="52" cy="174" rx="24" ry="16"/><ellipse cx="118" cy="174" rx="24" ry="16"/>`, C.honey)}
      ${ol(`<ellipse cx="50" cy="176" rx="10" ry="8"/><ellipse cx="120" cy="176" rx="10" ry="8"/>`, '#f2b6a4', 2.2)}
      ${ol(`<circle cx="45" cy="40" r="20"/><circle cx="125" cy="40" r="20"/>`, C.honey)}
      ${tone(`<circle cx="46" cy="42" r="10"/><circle cx="124" cy="42" r="10"/>`, '#f2b6a4', 0.9)}
      ${ol(`<ellipse cx="85" cy="72" rx="53" ry="46"/>`, C.honey)}
      ${tone(`<ellipse cx="85" cy="96" rx="44" ry="18"/>`, C.honeyShade, 0.4)}
      ${scrib('M50 52 Q60 38 78 34', '#fff2dc', 6, 0.55)}
      ${ol(`<ellipse cx="85" cy="88" rx="21" ry="16"/>`, C.fawn, 2.6)}
      <ellipse cx="85" cy="81" rx="7.5" ry="5.5" fill="${PAL.lineDark}"/>
      ${line('M78 93 Q85 100 92 93', 2.4)}${line('M85 86 V94', 2.2)}
      <circle cx="65" cy="66" r="4.6" fill="${PAL.lineDark}"/><circle cx="105" cy="66" r="4.6" fill="${PAL.lineDark}"/>
      <circle cx="66.5" cy="64.5" r="1.4" fill="#fff"/><circle cx="106.5" cy="64.5" r="1.4" fill="#fff"/>
      ${blush(56, 84)}${blush(114, 84)}
      ${ol(`<path d="M85 116 L62 104 Q56 116 62 128 Z"/><path d="M85 116 L108 104 Q114 116 108 128 Z"/>`, PAL.blue, 2.6)}
      ${ol(`<circle cx="85" cy="116" r="7"/>`, '#7aa6ea', 2.4)}
      ${line('M76 160 Q85 156 94 162', 2, '#c9a27c')}
    `,
  },
  pillow: {
    w: 220, h: 130,
    outline: 'M24 30 Q110 6 196 30 Q214 65 196 100 Q110 124 24 100 Q6 65 24 30 Z',
    art: () => `
      ${ol(`<path d="M24 30 Q110 6 196 30 Q214 65 196 100 Q110 124 24 100 Q6 65 24 30 Z"/>`, C.lilac)}
      ${tone(`<path d="M30 84 Q110 104 192 84 Q190 96 186 100 Q110 120 30 100 Z"/>`, C.lilacShade, 0.7)}
      ${scrib('M44 36 Q110 20 176 36', '#fff', 8, 0.8)}
      ${star(64, 62, 8, C.pink, 0.9)}${star(150, 54, 7, C.butterShade, 0.9)}${star(112, 80, 6, '#9bbcf0', 0.9)}${star(176, 78, 5, C.pink, 0.8)}${star(40, 58, 5, '#9bbcf0', 0.8)}
      <circle cx="96" cy="48" r="3" fill="${C.lilacShade}"/><circle cx="132" cy="92" r="3" fill="${C.lilacShade}"/><circle cx="80" cy="96" r="2.6" fill="${C.pink}"/>
      ${line('M24 30 l-10 -8 M24 30 l-4 -12 M196 30 l10 -8 M196 30 l4 -12 M24 100 l-10 8 M24 100 l-4 12 M196 100 l10 8 M196 100 l4 12', 2.4)}
      ${line('M30 38 Q22 65 30 92', 1.8, '#a9a0bf')}${line('M190 38 Q198 65 190 92', 1.8, '#a9a0bf')}
    `,
  },
  rattle: {
    w: 110, h: 190,
    outline: 'M55 10 A42 42 0 0 1 65 93 L65 140 A23 23 0 1 1 45 140 L45 93 A42 42 0 0 1 55 10 Z M55 151 A11 11 0 1 0 55 173 A11 11 0 1 0 55 151 Z',
    art: () => `
      ${ol(`<rect x="46" y="86" width="18" height="64" rx="8"/>`, C.mint)}
      ${scrib('M51 96 V140', '#fff', 4, 0.7)}
      <circle cx="55" cy="162" r="17" fill="none" stroke="${C.coral}" stroke-width="12" filter="url(#crayon)"/>
      <circle cx="55" cy="162" r="23" ${stroke(2.8)}/><circle cx="55" cy="162" r="11" ${stroke(2.6)}/>
      ${ol(`<circle cx="55" cy="52" r="42"/>`, C.butter)}
      <g opacity="0.9">${tone(`<path d="M22 30 Q55 48 88 30 L92 42 Q55 62 18 42 Z"/>`, C.pink, 1)}${tone(`<path d="M14 62 Q55 82 96 62 L92 76 Q55 94 18 76 Z"/>`, C.pink, 1)}</g>
      ${tone(`<path d="M30 82 Q55 98 82 82 Q70 94 55 94 Q40 94 30 82 Z"/>`, C.butterShade, 0.8)}
      ${star(55, 52, 9, '#fff', 0.95)}
      ${scrib('M28 36 Q34 22 48 16', '#fff', 6, 0.8)}
      ${ol(`<rect x="40" y="88" width="30" height="12" rx="6"/>`, C.mintShade, 2.4)}
    `,
  },
  blanket: {
    w: 260, h: 160,
    outline: 'M16 30 Q130 4 244 30 Q252 80 250 128 Q235 146 220 132 Q205 150 190 134 Q175 152 160 136 Q145 154 130 138 Q115 154 100 136 Q85 152 70 134 Q55 150 40 132 Q25 146 10 128 Q8 80 16 30 Z',
    art: () => {
      const r = rng(42); let stars = '';
      const cols = ['#86aef0', C.pink, '#fff6d8', '#9ad3b9'];
      for (let i = 0; i < 16; i++) { const x = 28 + (i % 6) * 40 + (i >> 1 & 1) * 14, y = 52 + Math.floor(i / 6) * 30 + r() * 8; stars += star(x, y, 6 + r() * 3, cols[i % 4], 0.95); }
      return `
      ${ol(`<path d="M16 30 Q130 4 244 30 Q252 80 250 128 Q235 146 220 132 Q205 150 190 134 Q175 152 160 136 Q145 154 130 138 Q115 154 100 136 Q85 152 70 134 Q55 150 40 132 Q25 146 10 128 Q8 80 16 30 Z"/>`, C.butter)}
      ${tone(`<path d="M16 30 Q130 4 244 30 L246 50 Q130 26 14 50 Z"/>`, '#fff3c7', 0.9)}
      ${line('M14 50 Q130 26 246 50', 2.4, '#c9ad69')}
      ${tone(`<path d="M12 104 Q130 120 250 104 L250 128 Q235 146 220 132 Q205 150 190 134 Q175 152 160 136 Q145 154 130 138 Q115 154 100 136 Q85 152 70 134 Q55 150 40 132 Q25 146 10 128 Z"/>`, C.butterShade, 0.6)}
      ${stars}
      <path d="M24 60 Q22 90 22 118 M236 60 Q238 90 238 118 M30 120 Q130 132 230 120" fill="none" stroke="#e8a5a0" stroke-width="3" stroke-dasharray="7 7" stroke-linecap="round" filter="url(#pencil)"/>
      ${scrib('M40 40 Q130 20 220 40', '#fff', 5, 0.6)}
    `;
    },
  },
};

// --- set pieces ------------------------------------------------------------------------------
function wallpaperTile() {
  const s = 180;
  return svg(s, s, `
    ${star(45, 45, 10, '#fde9d8', 0.95)}${star(135, 135, 10, '#fde9d8', 0.95)}
    <circle cx="135" cy="45" r="4.2" fill="#e8b49b" opacity="0.7" filter="url(#crayon)"/>
    <circle cx="45" cy="135" r="4.2" fill="#e8b49b" opacity="0.7" filter="url(#crayon)"/>
    <circle cx="90" cy="90" r="2.6" fill="#fff1e4" opacity="0.9"/>
    <circle cx="0" cy="90" r="2.6" fill="#fff1e4" opacity="0.9"/><circle cx="180" cy="90" r="2.6" fill="#fff1e4" opacity="0.9"/>
    <circle cx="90" cy="0" r="2.6" fill="#fff1e4" opacity="0.9"/><circle cx="90" cy="180" r="2.6" fill="#fff1e4" opacity="0.9"/>`, 11);
}

export const WINDOW = { w: 440, h: 380, pane: { x: 103, y: 50, w: 234, h: 248 },
  twinkles: [[130, 84, 1], [178, 128, 0.8], [160, 66, 0.7], [236, 140, 1], [306, 160, 0.8], [232, 206, 0.7], [128, 196, 0.9], [300, 226, 0.6], [196, 80, 0.6], [140, 140, 0.5]] };
function windowArt() {
  const { w, h } = WINDOW;
  const curtain = `<path d="M26 22 L132 22 C124 94 108 172 100 228 C108 266 128 318 138 366 L20 366 C28 316 34 268 36 228 C32 164 26 94 26 22 Z"/>`;
  const dots = (() => { let s = ''; const r = rng(9); for (let i = 0; i < 22; i++) { const x = 36 + r() * 86, y = 40 + r() * 310; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.5 + r() * 2).toFixed(1)}" fill="#fff4ef" opacity="0.85"/>`; } return s; })();
  const curtainSide = `
    <g filter="url(#crayon)" opacity="0.18"><path d="M26 22 L132 22 C124 94 108 172 100 228 C108 266 128 318 138 366 L20 366 C28 316 34 268 36 228 C32 164 26 94 26 22 Z" fill="#7a3d40" transform="translate(6 8)"/></g>
    ${ol(curtain, C.coral)}
    ${scrib('M50 30 C52 100 56 170 58 228 C54 280 44 330 40 360', C.coralShade, 9, 0.7)}
    ${scrib('M84 30 C82 110 78 180 80 228 C86 280 100 330 106 360', C.coralShade, 8, 0.6)}
    ${scrib('M66 30 C68 110 68 180 68 228 C70 280 72 330 74 360', '#ffd1c8', 7, 0.7)}
    ${dots}
    ${ol(`<path d="M30 216 Q70 206 108 216 L106 240 Q70 232 32 240 Z"/>`, C.butter, 2.6)}
    ${ol(`<circle cx="108" cy="228" r="9"/>`, C.butterShade, 2.4)}`;
  const houses = `
    <path d="M100 262 Q150 236 200 252 Q260 232 340 250 L340 300 L100 300 Z" fill="${C.hill}" filter="url(#crayon)"/>
    <path d="M100 300 L100 270 L120 252 L140 270 L140 262 L170 262 L170 250 L190 234 L210 250 L210 274 L236 274 L236 262 L258 244 L280 262 L280 270 L304 270 L322 254 L340 268 L340 300 Z" fill="${C.roof}" filter="url(#crayon)"/>
    <rect x="114" y="276" width="9" height="10" fill="${C.lit}" filter="url(#crayon)"/><rect x="184" y="256" width="9" height="10" fill="${C.lit}" filter="url(#crayon)"/>
    <rect x="196" y="276" width="8" height="10" fill="${C.lit}" opacity="0.8" filter="url(#crayon)"/><rect x="252" y="270" width="10" height="11" fill="${C.lit}" filter="url(#crayon)"/>
    <rect x="312" y="278" width="8" height="9" fill="${C.lit}" opacity="0.9" filter="url(#crayon)"/>`;
  let fixedStars = ''; const r = rng(5);
  for (let i = 0; i < 26; i++) fixedStars += `<circle cx="${(108 + r() * 224).toFixed(1)}" cy="${(56 + r() * 180).toFixed(1)}" r="${(0.9 + r() * 1.6).toFixed(1)}" fill="#fff8e0" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  return svg(w, h, `
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sky1}"/><stop offset="0.55" stop-color="${C.sky2}"/><stop offset="1" stop-color="${C.sky3}"/></linearGradient>
      <mask id="moonm"><circle cx="276" cy="100" r="31" fill="#fff"/><circle cx="291" cy="90" r="27" fill="#000"/></mask>
      <filter id="mglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <!-- wall shadow behind frame -->
    <rect x="94" y="44" width="262" height="290" rx="10" fill="#8b5a48" opacity="0.18" filter="url(#mglow)"/>
    ${ol(`<rect x="86" y="34" width="268" height="282" rx="10"/>`, C.cream, 3.4)}
    <rect x="103" y="50" width="234" height="248" fill="url(#sky)" filter="url(#crayon)"/>
    ${fixedStars}
    <circle cx="276" cy="100" r="46" fill="#fff1b8" opacity="0.45" filter="url(#mglow)"/>
    <g mask="url(#moonm)"><circle cx="276" cy="100" r="31" fill="#fbe7a0" filter="url(#crayon)"/></g>
    <path d="M262 74 A31 31 0 1 0 306 118 A27 27 0 0 1 262 74 Z" ${stroke(2.4, '#c9a85a')}/>
    ${houses}
    ${tone(`<rect x="103" y="50" width="234" height="22"/>`, '#2a2d66', 0.35)}
    <g ${fill(C.cream)}><rect x="213" y="50" width="14" height="248"/><rect x="103" y="166" width="234" height="14"/></g>
    <g ${stroke(2.4)}><rect x="213" y="50" width="14" height="248"/><rect x="103" y="166" width="234" height="14"/><rect x="103" y="50" width="234" height="248"/></g>
    ${scrib('M92 44 V306', '#fff', 5, 0.7)}
    ${ol(`<rect x="70" y="306" width="300" height="24" rx="7"/>`, C.cream, 3.2)}
    ${tone(`<rect x="72" y="320" width="296" height="10" rx="5"/>`, C.creamShade, 0.9)}
    ${ol(`<rect x="12" y="14" width="416" height="12" rx="6"/>`, C.woodShade, 2.8)}
    ${ol(`<circle cx="14" cy="20" r="11"/><circle cx="426" cy="20" r="11"/>`, C.wood, 2.8)}
    ${curtainSide}
    <g transform="translate(${w} 0) scale(-1 1)">${curtainSide}</g>
  `, 21);
}

export const LAMP = { w: 210, h: 250, glow: { x: 105, y: 92 } };
function lampArt() {
  let scal = 'M166 136'; for (let i = 7; i >= 0; i--) { const x0 = 44 + i * 15.25; scal += ` Q${(x0 + 7.6).toFixed(1)} 150 ${x0.toFixed(1)} 136`; }
  const shade = `M44 136 L70 44 Q105 32 140 44 L166 136 ${scal.slice(8)} Z`;
  return svg(LAMP.w, LAMP.h, `
    <defs><filter id="lg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter></defs>
    <ellipse cx="105" cy="248" rx="58" ry="7" fill="#6b4630" opacity="0.25" filter="url(#lg)"/>
    ${ol(`<rect x="98" y="120" width="14" height="96" rx="6"/>`, C.cream, 2.8)}
    ${ol(`<path d="M58 248 Q56 210 105 204 Q154 210 152 248 Z"/>`, C.coral)}
    ${tone(`<path d="M60 240 Q105 230 150 240 L150 248 L60 248 Z"/>`, C.coralShade, 0.8)}
    ${scrib('M74 230 Q80 216 100 212', '#fff', 5, 0.7)}
    <ellipse cx="105" cy="96" rx="64" ry="52" fill="#fff0b0" opacity="0.7" filter="url(#lg)"/>
    ${ol(`<path d="${shade}"/>`, '#ffe08c')}
    ${tone(`<path d="M70 44 Q105 32 140 44 L150 80 Q105 66 60 80 Z"/>`, '#fff6cc', 0.9)}
    ${tone(`<path d="M128 46 L140 44 L166 136 L148 138 Z"/>`, C.butterShade, 0.7)}
    ${star(88, 98, 7, '#fff8de', 0.95)}${star(122, 76, 6, '#fff8de', 0.9)}${star(116, 116, 5, '#fff8de', 0.9)}
    ${ol(`<circle cx="105" cy="34" r="7"/>`, C.mint, 2.4)}
  `, 31);
}

export const SHELF = { w: 400, h: 424, upperFloor: 210, lowerFloor: 400, upper: [81, 200, 319], lower: [110, 290] };
function shelfArt() {
  const back = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.woodBack}" filter="url(#crayon)"/>
    <rect x="${x}" y="${y}" width="${w}" height="16" fill="#9c6740" opacity="0.28" filter="url(#crayon)"/>
    <rect x="${x}" y="${y}" width="12" height="${h}" fill="#9c6740" opacity="0.2" filter="url(#crayon)"/>`;
  return svg(SHELF.w, SHELF.h, `
    <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter></defs>
    <rect x="20" y="30" width="370" height="392" rx="10" fill="#6b4630" opacity="0.22" filter="url(#sh)"/>
    ${ol(`<rect x="12" y="18" width="376" height="392" rx="8"/>`, C.wood)}
    ${back(26, 26, 110, 182)}${back(146, 26, 108, 182)}${back(264, 26, 110, 182)}
    ${back(26, 226, 169, 172)}${back(205, 226, 169, 172)}
    <g ${stroke(2.4)}><rect x="26" y="26" width="110" height="182"/><rect x="146" y="26" width="108" height="182"/><rect x="264" y="26" width="110" height="182"/><rect x="26" y="226" width="169" height="172"/><rect x="205" y="226" width="169" height="172"/></g>
    ${scrib('M40 60 Q60 120 50 190 M300 50 Q320 120 310 196 M220 250 Q236 320 228 390 M60 250 Q70 320 64 390', C.woodDeep, 3, 0.35)}
    ${tone(`<rect x="14" y="208" width="372" height="18"/><rect x="14" y="398" width="372" height="12"/>`, C.woodShade, 0.9)}
    ${line('M14 208 H386 M14 226 H386', 2.2)}
    ${ol(`<rect x="0" y="4" width="400" height="26" rx="9"/>`, C.wood)}
    ${scrib('M14 12 H380', '#fff2dc', 5, 0.6)}
    ${tone(`<rect x="2" y="22" width="396" height="8" rx="4"/>`, C.woodShade, 0.8)}
    ${ol(`<rect x="28" y="404" width="30" height="18" rx="5"/><rect x="342" y="404" width="30" height="18" rx="5"/>`, C.woodShade, 2.4)}
  `, 41);
}

/** Small decorations that sit on top of the shelf (books + plant). */
export const SHELFTOP = { w: 150, h: 120 };
function shelfTopArt() {
  return svg(150, 120, `
    ${ol(`<rect x="8" y="94" width="96" height="22" rx="4"/>`, '#9bbcf0', 2.6)}${line('M16 100 H96', 1.8, '#fff')}
    ${ol(`<rect x="16" y="74" width="80" height="20" rx="4"/>`, C.pink, 2.6)}${line('M24 80 H88', 1.8, '#fff')}
    ${ol(`<rect x="12" y="56" width="88" height="18" rx="4"/>`, C.mint, 2.6)}
    ${ol(`<path d="M112 116 L108 88 L142 88 L138 116 Z"/>`, C.coral, 2.6)}
    ${ol(`<path d="M125 88 C110 70 108 56 116 46 C124 58 126 70 125 88 Z"/><path d="M125 88 C138 66 146 60 148 52 C136 54 128 66 125 88 Z"/><path d="M125 88 C124 64 130 46 136 36 C140 52 134 70 125 88 Z"/>`, PAL.green, 2.4)}
  `, 43);
}

export const CRIB = { back: { w: 660, h: 310 }, front: { w: 700, h: 500 } };
function cribBackArt() {
  const { w, h } = CRIB.back; let slats = '';
  for (let x = 66; x < 600; x += 46) slats += `<rect x="${x}" y="70" width="18" height="160" rx="8"/>`;
  return svg(w, h, `
    <defs><filter id="cb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <path d="M40 70 Q330 20 620 70 L620 236 L40 236 Z" fill="#7a4a35" opacity="0.12" filter="url(#cb)" transform="translate(8 10)"/>
    ${ol(slats, C.cream, 2.6)}
    ${tone(slats.replace(/x="(\d+)"/g, (m, x) => `x="${+x + 10}"`).replace(/width="18"/g, 'width="8"'), C.creamShade, 0.9)}
    ${ol(`<path d="M30 76 Q330 22 630 76 L630 98 Q330 46 30 98 Z"/>`, C.cream)}
    ${scrib('M60 74 Q330 30 600 74', '#fff', 5, 0.8)}
    ${ol(`<path d="M300 46 C300 30 316 26 322 38 C328 26 344 30 344 46 C344 60 322 72 322 72 C322 72 300 60 300 46 Z"/>`, C.pink, 2.4)}
    ${ol(`<rect x="22" y="220" width="616" height="84" rx="18"/>`, C.sheet)}
    ${tone(`<rect x="26" y="252" width="608" height="50" rx="12"/>`, C.sheetShade, 0.75)}
    ${line('M30 250 Q330 260 630 250', 2.2, '#d9a7b3')}
    <g fill="#fff" opacity="0.8">${Array.from({ length: 12 }, (_, i) => `<circle cx="${60 + i * 50}" cy="${276 + (i % 2) * 8}" r="3.2"/>`).join('')}</g>
    ${scrib('M50 230 H610', '#fff', 6, 0.7)}
  `, 51);
}
function cribFrontArt() {
  const { w, h } = CRIB.front; let slats = '';
  for (let x = 74; x < 630; x += 50) slats += `<rect x="${x}" y="300" width="20" height="96" rx="9"/>`;
  const post = x => `<rect x="${x}" y="30" width="40" height="440" rx="14"/>`;
  return svg(w, h, `
    <defs><filter id="cf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <rect x="40" y="300" width="620" height="100" fill="#e8cdb6" filter="url(#crayon)"/>
    ${tone(`<rect x="40" y="300" width="620" height="100"/>`, '#c9a88e', 0.55)}
    ${ol(slats, C.cream, 2.6)}
    ${tone(slats.replace(/x="(\d+)"/g, (m, x) => `x="${+x + 12}"`).replace(/width="20"/g, 'width="8"'), C.creamShade, 0.9)}
    ${ol(`<rect x="36" y="280" width="628" height="26" rx="12"/>`, C.cream)}
    ${scrib('M56 288 H644', '#fff', 6, 0.85)}
    ${ol(`<rect x="36" y="388" width="628" height="26" rx="12"/>`, C.cream)}
    ${tone(`<rect x="40" y="402" width="620" height="10" rx="5"/>`, C.creamShade, 0.9)}
    ${ol(`${post(10)}${post(650)}`, C.cream)}
    ${tone(`<rect x="34" y="40" width="12" height="420" rx="6"/><rect x="674" y="40" width="12" height="420" rx="6"/>`, C.creamShade, 0.9)}
    ${scrib('M20 48 V450 M660 48 V450', '#fff', 5, 0.8)}
    ${ol(`<circle cx="30" cy="26" r="22"/><circle cx="670" cy="26" r="22"/>`, C.mint)}
    ${scrib('M20 18 Q26 10 34 10 M660 18 Q666 10 674 10', '#fff', 4, 0.8)}
    ${ol(`<ellipse cx="30" cy="478" rx="20" ry="13"/><ellipse cx="670" cy="478" rx="20" ry="13"/>`, C.mintShade, 2.6)}
    ${ol(`<path d="M300 334 C300 320 316 316 322 328 C328 316 344 320 344 334 C344 348 322 362 322 362 C322 362 300 348 300 334 Z"/>`, C.pink, 2.4)}
    ${star(200, 344, 13, C.butter, 1)}${star(450, 344, 13, '#9bbcf0', 1)}
    <g ${stroke(2.2)}><path d="${starPath(200, 344, 13, 6.5)}"/><path d="${starPath(450, 344, 13, 6.5)}"/></g>
    ${ol(`<path d="M670 70 Q642 56 640 74 Q642 92 670 80 Q698 92 700 74 Q698 56 670 70 Z"/>`, C.coral, 2.4)}
    ${ol(`<path d="M664 78 L652 108 L662 104 L666 82 Z M676 78 L688 108 L678 104 L674 82 Z"/>`, C.coralShade, 2)}
    ${ol(`<circle cx="670" cy="75" r="6"/>`, C.coralShade, 2)}
  `, 53);
}

export const STOOL = { w: 160, h: 175, top: 20 };
function stoolArt() {
  return svg(160, 175, `
    ${ol(`<path d="M34 50 L22 166 M126 50 L138 166 M60 56 L56 160 M100 56 L104 160"/>`, C.mintShade, 2.6)}
    <g ${stroke(9, C.mint)}><path d="M34 52 L22 164 M126 52 L138 164 M60 58 L56 158 M100 58 L104 158"/></g>
    <g ${stroke(2.4)}><path d="M28 52 L16 164 M40 52 L28 166 M120 52 L132 166 M132 52 L144 164"/></g>
    ${ol(`<path d="M12 22 Q80 0 148 22 L146 52 Q80 72 14 52 Z"/>`, C.mint)}
    ${ol(`<ellipse cx="80" cy="20" rx="68" ry="15"/>`, '#c6ead9')}
    ${scrib('M30 18 Q70 8 110 12', '#fff', 5, 0.8)}
    ${ol(`<circle cx="80" cy="46" r="6"/>`, C.butter, 2.2)}
  `, 61);
}

export const RUG = { w: 960, h: 170 };
function rugArt() {
  const e = (rx, ry) => `<ellipse cx="480" cy="85" rx="${rx}" ry="${ry}"/>`;
  return svg(960, 170, `
    <defs><filter id="rb" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="8"/></filter></defs>
    <ellipse cx="480" cy="94" rx="470" ry="74" fill="#7a4a35" opacity="0.18" filter="url(#rb)"/>
    ${ol(e(466, 78), C.coral)}
    ${tone(e(430, 66), '#fbe3c8', 1)}
    ${tone(e(380, 54), C.butter, 1)}
    ${tone(e(320, 42), '#fbe3c8', 1)}
    ${tone(e(250, 30), C.mint, 1)}
    ${tone(e(170, 18), '#fbe3c8', 1)}
    <ellipse cx="480" cy="85" rx="448" ry="72" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 10" opacity="0.75" filter="url(#pencil)"/>
    <ellipse cx="480" cy="85" rx="350" ry="48" fill="none" stroke="${C.coralShade}" stroke-width="2.6" stroke-dasharray="5 9" opacity="0.6" filter="url(#pencil)"/>
  `, 71);
}

export const FRAME = { w: 160, h: 140 };
function frameArt() {
  return svg(160, 140, `
    ${line('M80 6 L30 30 M80 6 L130 30', 2.2)}
    <circle cx="80" cy="6" r="4" fill="${PAL.line}"/>
    ${ol(`<rect x="14" y="28" width="132" height="104" rx="8"/>`, C.wood)}
    ${ol(`<rect x="28" y="42" width="104" height="76" rx="3"/>`, '#fffaf2', 2.4)}
    <path d="M40 104 Q80 52 120 104" fill="none" stroke="${PAL.red}" stroke-width="6" filter="url(#crayon)"/>
    <path d="M48 106 Q80 64 112 106" fill="none" stroke="${PAL.yellow}" stroke-width="6" filter="url(#crayon)"/>
    <path d="M56 108 Q80 76 104 108" fill="none" stroke="${PAL.blue}" stroke-width="6" filter="url(#crayon)"/>
    ${star(112, 58, 9, C.butterShade, 1)}
    <path d="M36 112 Q44 104 54 110 Q60 104 68 112 Z" fill="#fff" stroke="#9aa" stroke-width="1.6" filter="url(#crayon)"/>
  `, 81);
}

// mobile ornaments
export const ORN = 76;
function ornArt(kind) {
  const c = ORN / 2;
  const body = {
    star: () => ol(`<path d="${starPath(c, c + 4, 30, 14)}"/>`, C.butter, 2.8) + scrib(`M${c - 10} ${c - 6} L${c - 2} ${c - 18}`, '#fff', 4, 0.8),
    starPink: () => ol(`<path d="${starPath(c, c + 4, 28, 13)}"/>`, C.pink, 2.8) + scrib(`M${c - 10} ${c - 6} L${c - 2} ${c - 18}`, '#fff', 4, 0.8),
    moon: () => ol(`<path d="M${c + 6} ${c - 28} A30 30 0 1 0 ${c + 26} ${c + 18} A24 24 0 0 1 ${c + 6} ${c - 28} Z"/>`, '#fde7a2', 2.8) + `<circle cx="${c - 6}" cy="${c + 2}" r="2.4" fill="${PAL.lineDark}"/>` + blush(c - 2, c + 12, 5, 3.5),
    cloud: () => ol(`<path d="M14 ${c + 14} Q6 ${c} 20 ${c - 4} Q22 ${c - 22} 40 ${c - 16} Q54 ${c - 26} 62 ${c - 6} Q74 ${c - 2} 66 ${c + 14} Z"/>`, '#eef3ff', 2.8) + tone(`<path d="M16 ${c + 8} Q40 ${c + 18} 66 ${c + 8} L66 ${c + 14} L14 ${c + 14} Z"/>`, '#cdd9f5', 0.9),
    heart: () => ol(`<path d="M${c} ${c + 24} C${c - 34} ${c} ${c - 26} ${c - 26} ${c} ${c - 12} C${c + 26} ${c - 26} ${c + 34} ${c} ${c} ${c + 24} Z"/>`, C.coral, 2.8) + scrib(`M${c - 16} ${c - 8} Q${c - 14} ${c - 16} ${c - 6} ${c - 16}`, '#fff', 4, 0.8),
  }[kind]();
  return svg(ORN, ORN, body, 91 + kind.length);
}

function handArt() {
  return svg(130, 160, `
    <defs><filter id="hs" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>
    <path d="M44 14 Q57 4 70 14 L72 66 Q100 60 112 76 Q124 92 116 120 Q108 146 80 148 L60 148 Q36 146 34 120 L32 92 Q30 76 44 72 Z" fill="#3b2a22" opacity="0.25" filter="url(#hs)" transform="translate(6 8)"/>
    ${ol(`<rect x="44" y="10" width="28" height="78" rx="14"/>`, '#ffffff', 3.4)}
    ${ol(`<path d="M36 80 Q34 66 48 66 L100 66 Q122 66 122 90 L120 118 Q118 144 90 146 L66 146 Q38 144 36 118 Z"/>`, '#ffffff', 3.4)}
    <rect x="46" y="40" width="24" height="44" fill="#fff"/>
    ${line('M72 66 Q74 82 72 92 M92 68 Q96 82 94 92', 2.6)}
    ${ol(`<path d="M36 96 Q14 92 14 108 Q16 122 38 120 Z"/>`, '#ffffff', 3.4)}
    ${blush(98, 120, 9, 6)}
    ${ol(`<rect x="56" y="138" width="56" height="20" rx="8"/>`, '#9bbcf0', 2.8)}
    ${line('M50 18 Q58 12 66 18', 2, '#d8cfc8')}
  `, 101);
}

function pipArt(full) {
  return svg(84, 84, full
    ? `${ol(`<path d="${starPath(42, 45, 34, 16)}"/>`, PAL.yellow, 3.2)}${scrib('M28 36 L36 24', '#fff', 5, 0.85)}`
    : `<path d="${starPath(42, 45, 34, 16)}" fill="#efe3d3" filter="url(#crayon)"/><path d="${starPath(42, 45, 34, 16)}" fill="none" stroke="#9a8a7c" stroke-width="4" stroke-dasharray="0.5 9" stroke-linecap="round" stroke-linejoin="round" filter="url(#pencil)"/>`, full ? 111 : 113);
}

function zArt() {
  return svg(60, 60, `<path d="M14 14 H46 L14 46 H46" fill="none" stroke="#a9b7f0" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#crayon)"/><path d="M14 14 H46 L14 46 H46" ${stroke(2.6, '#6b6fa8')}/>`, 121);
}
function noteArt() {
  return svg(56, 70, `${ol(`<ellipse cx="18" cy="54" rx="13" ry="10" transform="rotate(-20 18 54)"/><ellipse cx="44" cy="46" rx="11" ry="9" transform="rotate(-20 44 46)"/>`, C.lilacShade, 2.6)}<path d="M29 52 V10 L54 4 V44" ${stroke(3.6)}/><path d="M29 18 L54 12" ${stroke(5)}/>`, 131);
}

// --- derived sprites for items: silhouette, shadow, glow ------------------------------------
const PADS = 18, PADG = 34;
function silhouetteArt(it) {
  const w = it.w + PADS * 2, h = it.h + PADS * 2;
  return svg(w, h, `<g transform="translate(${PADS} ${PADS})">
    <path d="${it.outline}" fill="#6b4f6e" fill-opacity="0.26" fill-rule="evenodd"/>
    <path d="${it.outline}" fill="#4a3550" fill-opacity="0.18" fill-rule="evenodd" filter="url(#crayon)"/>
    <path d="${it.outline}" fill="none" stroke="#5d4a6a" stroke-width="11" stroke-dasharray="0.5 16" stroke-linecap="round" opacity="0.55"/>
    <path d="${it.outline}" fill="none" stroke="#fffaf0" stroke-width="6.5" stroke-dasharray="0.5 16" stroke-linecap="round"/></g>`, 141);
}
function shadowArt(it) {
  const w = it.w + PADG * 2, h = it.h + PADG * 2;
  return svg(w, h, `<defs><filter id="sb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <path transform="translate(${PADG} ${PADG})" d="${it.outline}" fill="#3b2418" fill-rule="evenodd" filter="url(#sb)"/>`);
}
function glowArt(it) {
  const w = it.w + PADG * 2, h = it.h + PADG * 2;
  return svg(w, h, `<defs><filter id="gb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter></defs>
    <path transform="translate(${PADG} ${PADG})" d="${it.outline}" fill="#fff6b8" stroke="#ffe980" stroke-width="22" stroke-linejoin="round" filter="url(#gb)"/>`);
}

/** Paper grain tile (procedural, deterministic). */
function grainTile() {
  return canvasSprite(256, 256, (x, w, h) => {
    const r = rng(77);
    for (let i = 0; i < 2600; i++) {
      const px = r() * w, py = r() * h, s = 0.6 + r() * 1.6, dark = r() < 0.55;
      x.fillStyle = dark ? `rgba(120,80,50,${0.05 + r() * 0.08})` : `rgba(255,255,255,${0.08 + r() * 0.12})`;
      x.fillRect(px, py, s, s * (0.6 + r()));
    }
    for (let i = 0; i < 60; i++) { // crayon streaks
      const px = r() * w, py = r() * h, l = 10 + r() * 30;
      x.strokeStyle = `rgba(255,255,255,${0.06 + r() * 0.06})`; x.lineWidth = 1 + r() * 2;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + l, py + (r() - 0.5) * 6); x.stroke();
    }
  });
}

/** Rasterize everything level 1 needs. Returns a map of sprites. */
export async function loadLevel1Art() {
  const S = {};
  const jobs = {
    wallpaper: [wallpaperTile(), 180, 180],
    window: [windowArt(), WINDOW.w, WINDOW.h],
    lamp: [lampArt(), LAMP.w, LAMP.h],
    shelf: [shelfArt(), SHELF.w, SHELF.h],
    shelfTop: [shelfTopArt(), SHELFTOP.w, SHELFTOP.h],
    cribBack: [cribBackArt(), CRIB.back.w, CRIB.back.h],
    cribFront: [cribFrontArt(), CRIB.front.w, CRIB.front.h],
    stool: [stoolArt(), STOOL.w, STOOL.h],
    rug: [rugArt(), RUG.w, RUG.h],
    frame: [frameArt(), FRAME.w, FRAME.h],
    hand: [handArt(), 130, 160],
    pipEmpty: [pipArt(false), 84, 84], pipFull: [pipArt(true), 84, 84],
    z: [zArt(), 60, 60], note: [noteArt(), 56, 70],
  };
  for (const k of ['star', 'starPink', 'moon', 'cloud', 'heart']) jobs['orn_' + k] = [ornArt(k), ORN, ORN];
  for (const [k, it] of Object.entries(ITEMS)) {
    jobs['item_' + k] = [svg(it.w, it.h, it.art(), 7 + k.length), it.w, it.h];
    jobs['sil_' + k] = [silhouetteArt(it), it.w + PADS * 2, it.h + PADS * 2];
    jobs['shadow_' + k] = [shadowArt(it), it.w + PADG * 2, it.h + PADG * 2];
    jobs['glow_' + k] = [glowArt(it), it.w + PADG * 2, it.h + PADG * 2];
  }
  await Promise.all(Object.entries(jobs).map(async ([k, [s, w, h]]) => { S[k] = await svgSprite(s, w, h, 'l1-' + k); }));
  S.grain = grainTile();
  return S;
}

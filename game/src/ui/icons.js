// Inline SVG icon sprite (chunky clay style). Usage: ic('coin') -> <svg class="ic"><use href="#i-coin"/></svg>
const O='#7a4a22'; // outline
const sym=(id,body)=>`<symbol id="i-${id}" viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">${body}</symbol>`;
export const SPRITE=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a6"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#f09a12"/></linearGradient>
<linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ff0de"/><stop offset="1" stop-color="#1f9a8d"/></linearGradient>
<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeaff"/><stop offset="1" stop-color="#4aa8ee"/></linearGradient>
<linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#e8b23a"/></linearGradient>
<linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc2d4"/><stop offset="1" stop-color="#ff7a9c"/></linearGradient>
<linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb866"/><stop offset="1" stop-color="#f0701c"/></linearGradient>
<linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#f1dcaa"/></linearGradient>
<linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d3ff"/><stop offset="1" stop-color="#7d8cf0"/></linearGradient>
${sym('coin',`<circle cx="24" cy="24" r="19" fill="url(#gg)" stroke="${O}" stroke-width="2.6"/><circle cx="24" cy="24" r="13" fill="none" stroke="#c47a0c" stroke-width="2.4" opacity=".7"/><path d="M24 14l3 7 7 .6-5.4 4.6 1.8 7.2-6.4-4-6.4 4 1.8-7.2-5.4-4.6 7-.6z" fill="#fff6c0" stroke="#c47a0c" stroke-width="1.4"/><path d="M12 14a15 15 0 0 1 9-6" stroke="#fff" stroke-width="2.6" fill="none" opacity=".8"/>`)}
${sym('pahala',`<path d="M24 3l5.2 8.3 9.5-2.4-2.4 9.5L45 24l-8.7 5.6 2.4 9.5-9.5-2.4L24 45l-5.2-8.3-9.5 2.4 2.4-9.5L3 24l8.7-5.6-2.4-9.5 9.5 2.4z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><circle cx="24" cy="24" r="8" fill="#e9fff9" stroke="#146d66" stroke-width="2"/><path d="M24 17.5l1.8 4.2 4.5.4-3.4 3 1 4.4-3.9-2.4-3.9 2.4 1-4.4-3.4-3 4.5-.4z" fill="#ffc83d"/>`)}
${sym('crescent',`<path d="M31 5a19 19 0 1 0 12 28A15 15 0 0 1 31 5z" fill="url(#gg)" stroke="${O}" stroke-width="2.6"/><path d="M15 15a14 14 0 0 1 10-8" stroke="#fff" stroke-width="2.6" fill="none" opacity=".8"/><path d="M36 10l1.5 3.4 3.5.4-2.6 2.4.7 3.5-3.1-1.8-3.1 1.8.7-3.5-2.6-2.4 3.5-.4z" fill="#fff3a6" stroke="#c47a0c" stroke-width="1.3"/>`)}
${sym('sun',`<g stroke="#f09a12" stroke-width="3.2">${[0,45,90,135,180,225,270,315].map(a=>`<path transform="rotate(${a} 24 24)" d="M24 3v6"/>`).join('')}</g><circle cx="24" cy="24" r="11.5" fill="url(#gg)" stroke="${O}" stroke-width="2.4"/><path d="M17 20a8 8 0 0 1 6-5" stroke="#fff" stroke-width="2.2" fill="none" opacity=".8"/>`)}
${sym('moon',`<path d="M30 5a19 19 0 1 0 13 29A15 15 0 0 1 30 5z" fill="url(#gn)" stroke="#4a4fa8" stroke-width="2.4"/><circle cx="18" cy="26" r="2.6" fill="#fff" opacity=".5"/><circle cx="24" cy="35" r="1.8" fill="#fff" opacity=".5"/><path d="M38 8l1 2.4 2.4.3-1.8 1.7.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fff"/>`)}
${sym('hay',`<path d="M7 20l17-9 17 9v16c0 3-3 5-6 5H13c-3 0-6-2-6-5z" fill="url(#gh)" stroke="${O}" stroke-width="2.4"/><path d="M13 22v18M19 20v21M25 19v22M31 20v21M37 22v18" stroke="#c9902a" stroke-width="2"/><path d="M6 27h36M6 34h36" stroke="#d1583c" stroke-width="3.4"/><path d="M12 14l6-4M30 10l7 3" stroke="#ffe98a" stroke-width="3"/>`)}
${sym('water',`<path d="M24 4C17 14 9 21 9 30a15 15 0 0 0 30 0c0-9-8-16-15-26z" fill="url(#gb)" stroke="#2a74c0" stroke-width="2.6"/><path d="M16 29a8 8 0 0 0 5 8" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/><circle cx="19" cy="22" r="2" fill="#fff" opacity=".8"/>`)}
${sym('soap',`<rect x="7" y="22" width="30" height="20" rx="8" fill="url(#gp)" stroke="${O}" stroke-width="2.4"/><path d="M12 28h12" stroke="#fff" stroke-width="3" opacity=".7"/><circle cx="32" cy="12" r="6" fill="#dff5ff" stroke="#4aa8ee" stroke-width="2" opacity=".95"/><circle cx="43" cy="21" r="3.6" fill="#dff5ff" stroke="#4aa8ee" stroke-width="1.8"/><circle cx="23" cy="12" r="3" fill="#dff5ff" stroke="#4aa8ee" stroke-width="1.6"/><circle cx="30" cy="10" r="1.6" fill="#fff"/>`)}
${sym('treat',`<path d="M10 14c5-5 15-4 24 5 6 6 8 14 4 18-4 4-12 2-18-4C11 28 6 18 10 14z" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><path d="M18 20l5 3M22 27l5 3" stroke="#fff" stroke-width="2.4" opacity=".6"/><path d="M12 14C9 8 14 4 20 6c-2 3-1 6 0 8M13 13c-5-1-8 1-9 5" fill="#7fcf5a" stroke="#3f8f2c" stroke-width="2.4"/>`)}
${sym('bag',`<path d="M8 17h32l-2 24c0 2-2 4-4 4H14c-2 0-4-2-4-4z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><path d="M17 20v-5a7 7 0 0 1 14 0v5" fill="none" stroke="${O}" stroke-width="3"/><path d="M14 26h6" stroke="#fff" stroke-width="3" opacity=".6"/><circle cx="24" cy="31" r="5.4" fill="url(#gg)" stroke="#a85c0a" stroke-width="2"/><path d="M24 28.4l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="#fff6c0"/>`)}
${sym('dome',`<path d="M24 3c1 3 0 4-1 5h2c-1-1-2-2-1-5z" fill="#ffc83d" stroke="#a85c0a" stroke-width="1.6"/><path d="M10 28c0-9 6-16 14-16s14 7 14 16z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><path d="M16 22c1-4 4-7 8-8" stroke="#fff" stroke-width="2.8" fill="none" opacity=".7"/><rect x="6" y="28" width="36" height="14" rx="2" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><path d="M19 42v-7a5 5 0 0 1 10 0v7z" fill="#6b3d1c" stroke="${O}" stroke-width="2"/><rect x="9" y="31" width="5" height="6" rx="2.5" fill="#ffd45a"/><rect x="34" y="31" width="5" height="6" rx="2.5" fill="#ffd45a"/>`)}
${sym('scroll',`<rect x="9" y="5" width="30" height="38" rx="6" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><path d="M15 15h4M15 24h4M15 33h4" stroke="#35b5a5" stroke-width="3.4"/><path d="M23 15h11M23 24h11M23 33h8" stroke="#c9a468" stroke-width="3"/><path d="M14.5 15l1.4 1.6 2.8-3M14.5 24l1.4 1.6 2.8-3" stroke="#3fae3c" stroke-width="2" fill="none"/><rect x="17" y="2" width="14" height="7" rx="3.5" fill="url(#gg)" stroke="${O}" stroke-width="2"/>`)}
${sym('gear',`<path d="M21 4h6l1 5 4 1.6 4.4-2.8 4.2 4.2-2.8 4.4L39 21l5 1v6l-5 1-1.6 4 2.8 4.4-4.2 4.2-4.4-2.8L27 39l-1 5h-6l-1-5-4-1.6-4.4 2.8-4.2-4.2 2.8-4.4L7 27l-5-1v-6l5-1 1.6-4-2.8-4.4 4.2-4.2 4.4 2.8L20 9z" transform="translate(1 0) scale(.96) translate(1 1)" fill="url(#gh)" stroke="${O}" stroke-width="2.4"/><circle cx="24" cy="24" r="7" fill="#fff6e0" stroke="${O}" stroke-width="2.4"/>`)}
${sym('sound',`<path d="M6 18h8l10-8v28l-10-8H6z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><path d="M30 17a9 9 0 0 1 0 14M35 11a17 17 0 0 1 0 26" stroke="${O}" stroke-width="3" fill="none"/>`)}
${sym('mute',`<path d="M6 18h8l10-8v28l-10-8H6z" fill="#cfc4ae" stroke="${O}" stroke-width="2.4"/><path d="M31 18l11 12M42 18L31 30" stroke="#e8483f" stroke-width="4"/>`)}
${sym('check',`<path d="M8 25l11 11L40 12" stroke="#fff" stroke-width="7" fill="none"/><path d="M8 25l11 11L40 12" stroke="#3fae3c" stroke-width="4" fill="none"/>`)}
${sym('close',`<path d="M12 12l24 24M36 12L12 36" stroke="#fff" stroke-width="7" fill="none"/><path d="M12 12l24 24M36 12L12 36" stroke="#a85c0a" stroke-width="3.6" fill="none"/>`)}
${sym('hammer',`<path d="M8 40l18-18" stroke="${O}" stroke-width="9"/><path d="M8 40l18-18" stroke="#d99a4e" stroke-width="5"/><rect x="20" y="6" width="20" height="12" rx="3" transform="rotate(45 30 12)" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/>`)}
${sym('goat',`<path d="M12 12c-4-2-6-6-5-8 4 0 8 3 9 6M36 12c4-2 6-6 5-8-4 0-8 3-9 6" fill="url(#gc)" stroke="${O}" stroke-width="2.2"/><ellipse cx="24" cy="27" rx="15" ry="14" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><ellipse cx="9" cy="24" rx="5" ry="3" transform="rotate(30 9 24)" fill="#f1dcaa" stroke="${O}" stroke-width="2"/><ellipse cx="39" cy="24" rx="5" ry="3" transform="rotate(-30 39 24)" fill="#f1dcaa" stroke="${O}" stroke-width="2"/><circle cx="18" cy="24" r="2.2" fill="${O}"/><circle cx="30" cy="24" r="2.2" fill="${O}"/><ellipse cx="24" cy="33" rx="6" ry="4.2" fill="#ffd1c4" stroke="${O}" stroke-width="1.8"/><path d="M21 36q3 2 6 0" stroke="${O}" stroke-width="1.8" fill="none"/>`)}
${sym('cow',`<ellipse cx="24" cy="27" rx="16" ry="14" fill="#fffaf0" stroke="${O}" stroke-width="2.4"/><path d="M12 14c-4 0-7-2-8-6 5-1 8 1 9 4M36 14c4 0 7-2 8-6-5-1-8 1-9 4" fill="url(#gc)" stroke="${O}" stroke-width="2.2"/><path d="M13 16c-2-6 0-9 3-10l4 6zM35 16c2-6 0-9-3-10l-4 6z" fill="#3b2a1f" opacity=".85"/><ellipse cx="24" cy="34" rx="9" ry="6.4" fill="#ffb9bd" stroke="${O}" stroke-width="2"/><circle cx="20.5" cy="34" r="1.6" fill="${O}"/><circle cx="27.5" cy="34" r="1.6" fill="${O}"/><circle cx="17" cy="24" r="2.4" fill="${O}"/><circle cx="31" cy="24" r="2.4" fill="${O}"/>`)}
${sym('heart',`<path d="M24 41C6 29 6 12 17 10c4-.6 6 1.4 7 4 1-2.600 3-4.600 7-4 11 2 11 19-7 31z" fill="url(#gp)" stroke="${O}" stroke-width="2.4"/><path d="M14 16c1-2 3-3 5-3" stroke="#fff" stroke-width="2.6" fill="none" opacity=".8"/>`)}
${sym('people',`<circle cx="15" cy="16" r="7" fill="#ffd9b0" stroke="${O}" stroke-width="2.2"/><path d="M8 13c1-8 13-8 14 0z" fill="#2c2c3a"/><path d="M3 40c0-9 5-14 12-14s12 5 12 14z" fill="url(#gt)" stroke="${O}" stroke-width="2.2"/><circle cx="33" cy="19" r="6" fill="#ffd9b0" stroke="${O}" stroke-width="2.2"/><path d="M27 16c1-7 11-7 12 0z" fill="#fff" stroke="${O}" stroke-width="1.6"/><path d="M24 41c0-8 4-12 9-12s9 4 9 12z" fill="url(#gg)" stroke="${O}" stroke-width="2.2"/>`)}
${sym('box',`<path d="M5 17l19-10 19 10v20L24 46 5 37z" fill="url(#gh)" stroke="${O}" stroke-width="2.4"/><path d="M5 17l19 10 19-10M24 27v19" stroke="${O}" stroke-width="2.2" fill="none"/><path d="M14 12l19 10" stroke="#d1583c" stroke-width="3.2"/>`)}
${sym('lock',`<rect x="9" y="21" width="30" height="22" rx="7" fill="url(#gg)" stroke="${O}" stroke-width="2.4"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="${O}" stroke-width="3.2"/><circle cx="24" cy="31" r="3" fill="${O}"/>`)}
${sym('flag',`<path d="M10 6v38" stroke="${O}" stroke-width="3.4"/><path d="M10 8c8-4 12 4 20 0v16c-8 4-12-4-20 0z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/>`)}
${sym('chat',`<path d="M6 10c0-3 2-5 5-5h26c3 0 5 2 5 5v18c0 3-2 5-5 5H22l-9 8v-8h-2c-3 0-5-2-5-5z" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><circle cx="15" cy="19" r="2.2" fill="${O}"/><circle cx="24" cy="19" r="2.2" fill="${O}"/><circle cx="33" cy="19" r="2.2" fill="${O}"/>`)}
${sym('marbot',`<circle cx="24" cy="27" r="16" fill="#ffd9b0" stroke="${O}" stroke-width="2.4"/><path d="M9 20c0-12 6-15 15-15s15 3 15 15z" fill="#2a2a38" stroke="${O}" stroke-width="2.2"/><path d="M13 17h22" stroke="#ffc83d" stroke-width="2.6"/><circle cx="18" cy="28" r="2.2" fill="${O}"/><circle cx="30" cy="28" r="2.2" fill="${O}"/><circle cx="14" cy="33" r="3" fill="#ff9aa0" opacity=".6"/><circle cx="34" cy="33" r="3" fill="#ff9aa0" opacity=".6"/><path d="M19 35q5 4.500 10 0" stroke="${O}" stroke-width="2.2" fill="none"/>`)}
${sym('calendar',`<rect x="5" y="8" width="38" height="35" rx="8" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><path d="M5 18h38v-4a6 6 0 0 0-6-6H11a6 6 0 0 0-6 6z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><path d="M15 3v9M33 3v9" stroke="${O}" stroke-width="3.4"/><path d="M33 26a7 7 0 1 0 2 10 5 5 0 0 1-2-10z" fill="url(#gg)" stroke="#a85c0a" stroke-width="1.6"/>`)}
${sym('drum',`<ellipse cx="24" cy="14" rx="17" ry="7" fill="#fff0c8" stroke="${O}" stroke-width="2.4"/><path d="M7 14v18c0 4 8 7 17 7s17-3 17-7V14c0 4-8 7-17 7S7 18 7 14z" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><path d="M13 22l6 15M24 24v16M35 22l-6 15" stroke="#fff3" stroke-width="2.4" fill="none" stroke-linecap="round"/>`)}
${sym('hand',`<path d="M16 26V11a3 3 0 0 1 6 0v10V7a3 3 0 0 1 6 0v14V9a3 3 0 0 1 6 0v18l3-4a3 3 0 0 1 5 3l-6 13c-2 5-6 8-11 8h-3c-5 0-8-3-11-8l-5-9a3 3 0 0 1 5-3z" fill="#ffe0b8" stroke="${O}" stroke-width="2.4"/>`)}
${sym('chev',`<path d="M10 18l14 14 14-14" stroke="${O}" stroke-width="6" fill="none"/>`)}
${sym('lantern',`<path d="M24 3v5" stroke="${O}" stroke-width="3"/><path d="M14 13l10-6 10 6z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><rect x="15" y="13" width="18" height="22" rx="4" fill="url(#gg)" stroke="${O}" stroke-width="2.4"/><rect x="19" y="17" width="10" height="14" rx="3" fill="#fff6c0"/><path d="M13 35h22v4a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" fill="#6b3d1c" stroke="${O}" stroke-width="2.2"/><circle cx="24" cy="24" r="12" fill="#ffe27a" opacity=".25"/>`)}
${sym('pot',`<circle cx="17" cy="13" r="6" fill="#ff7aa2" stroke="${O}" stroke-width="2"/><circle cx="31" cy="11" r="6" fill="#ffd34a" stroke="${O}" stroke-width="2"/><circle cx="25" cy="20" r="5" fill="#c08bff" stroke="${O}" stroke-width="2"/><circle cx="17" cy="13" r="2" fill="#fff6c0"/><circle cx="31" cy="11" r="2" fill="#fff"/><path d="M12 24c4-4 20-4 24 0" fill="#5fae4a" stroke="#3f8f2c" stroke-width="2.2"/><path d="M10 25h28l-4 17a3 3 0 0 1-3 2H17a3 3 0 0 1-3-2z" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><path d="M9 25h30" stroke="${O}" stroke-width="3"/>`)}
${sym('banner',`<path d="M12 3v42" stroke="${O}" stroke-width="3.4"/><path d="M12 3v42" stroke="#e8c27a" stroke-width="1.6"/><path d="M14 7h18v8H14z" fill="#e8483f" stroke="${O}" stroke-width="2"/><path d="M14 15h16v8H14z" fill="#fff" stroke="${O}" stroke-width="2"/><path d="M14 23h14v8H14z" fill="#ffc83d" stroke="${O}" stroke-width="2"/><path d="M14 31h12l-6 9z" fill="#35b5a5" stroke="${O}" stroke-width="2"/>`)}
${sym('bench',`<rect x="5" y="12" width="38" height="9" rx="3" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><rect x="4" y="24" width="40" height="7" rx="3" fill="url(#gh)" stroke="${O}" stroke-width="2.4"/><path d="M10 31v11M38 31v11M10 21v3M38 21v3" stroke="${O}" stroke-width="3.4"/>`)}
${sym('umbrella',`<path d="M4 22a20 16 0 0 1 40 0z" fill="#fff6e0" stroke="${O}" stroke-width="2.4"/><path d="M4 22a20 16 0 0 1 10-12l4 12zM24 6l6 16H18zM34 10a20 16 0 0 1 10 12H30z" fill="#e8483f"/><path d="M24 22v20a3 3 0 0 1-6 0" stroke="${O}" stroke-width="3" fill="none"/><path d="M4 22a20 16 0 0 1 40 0" stroke="${O}" stroke-width="2.4" fill="none"/>`)}
${sym('ketupat',`<path d="M8 6h32" stroke="${O}" stroke-width="3"/><path d="M15 6v6M33 6v10" stroke="#c9a468" stroke-width="2"/><path d="M15 12l8 9-8 9-8-9z" fill="#8bc34a" stroke="${O}" stroke-width="2.2"/><path d="M33 16l8 9-8 9-8-9z" fill="#ffd34a" stroke="${O}" stroke-width="2.2"/><path d="M11 16l8 9M29 20l8 9" stroke="#fff" stroke-width="1.6" opacity=".6"/><path d="M15 30v8M33 34v8" stroke="#ffd34a" stroke-width="2.4"/>`)}
${sym('star',`<path d="M24 4l6 12.5 13.6 1.9-9.9 9.6 2.4 13.6L24 35.1l-12.1 6.5 2.4-13.6-9.9-9.6 13.6-1.9z" fill="url(#gg)" stroke="${O}" stroke-width="2.4"/><path d="M17 18l4-1" stroke="#fff" stroke-width="2.6" opacity=".8"/>`)}
${sym('book',`<path d="M6 9c6-3 12-3 18 1v32c-6-4-12-4-18-1z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><path d="M42 9c-6-3-12-3-18 1v32c6-4 12-4 18-1z" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><circle cx="33" cy="19" r="5" fill="url(#gg)" stroke="#a85c0a" stroke-width="1.6"/><path d="M28 30h9M28 35h7" stroke="#c9a468" stroke-width="2.4"/><path d="M11 17h8M11 23h8" stroke="#fff" stroke-width="2.4" opacity=".7"/>`)}
${sym('shirt',`<path d="M16 5l-11 7 4 9 5-3v25h20V18l5 3 4-9-11-7c-1 4-4 6-8 6s-7-2-8-6z" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><path d="M24 11v32" stroke="#c9a468" stroke-width="2"/><circle cx="24" cy="17" r="1.6" fill="${O}"/><circle cx="24" cy="24" r="1.6" fill="${O}"/><path d="M14 33h20" stroke="#35b5a5" stroke-width="4"/>`)}
${sym('rain',`<path d="M12 28a8 8 0 0 1 1-16 11 11 0 0 1 21-2 8 8 0 0 1 2 18z" fill="url(#gc)" stroke="#5a7fa8" stroke-width="2.4"/><path d="M15 33l-2 6M24 33l-2 8M33 33l-2 6" stroke="#4aa8ee" stroke-width="3.2"/>`)}
${sym('hot',`<g stroke="#e8483f" stroke-width="3.2">${[0,45,90,135,180,225,270,315].map(a=>`<path transform="rotate(${a} 24 24)" d="M24 2v7"/>`).join('')}</g><circle cx="24" cy="24" r="12" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><path d="M20 22q2-3 4 0t4 0" stroke="#fff" stroke-width="2.2" fill="none"/>`)}
${sym('flame',`<path d="M24 4c3 8 13 12 13 24a13 13 0 0 1-26 0c0-6 3-9 5-11 0 4 2 6 4 6-1-7 1-13 4-19z" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><path d="M24 26c2 3 6 4 6 9a6 6 0 0 1-12 0c0-3 3-5 6-9z" fill="#ffe27a"/>`)}
${MORE()}
</defs></svg>`;
export const ic=(n,cls='')=>`<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

// ---- masjid-care set (sapu, pel, adzan, imam, design, Hewanku). Geometric only: no text, no calligraphy. ----
function MORE(){
  const W='#6b4426'; // dark wood
  const star8=(cx,cy,r,fill,st)=>{ const p=[]; for(let i=0;i<16;i++){ const a=i*Math.PI/8-Math.PI/2, rr=i%2?r*.62:r; p.push((cx+Math.cos(a)*rr).toFixed(1)+' '+(cy+Math.sin(a)*rr).toFixed(1)); } return `<path d="M${p.join('L')}Z" fill="${fill}" stroke="${st}" stroke-width="1.8"/>`; };
  return `
<linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b878"/><stop offset="1" stop-color="#b86e3a"/></linearGradient>
<linearGradient id="gk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e88f6a"/><stop offset=".65" stop-color="#c4603f"/><stop offset="1" stop-color="#933f29"/></linearGradient>
<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6f08a"/><stop offset="1" stop-color="#3f9a3c"/></linearGradient>
<linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset="1" stop-color="#c8343a"/></linearGradient>
<linearGradient id="gy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfdbe6"/></linearGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7c0" stop-opacity=".95"/><stop offset="1" stop-color="#ffd45a" stop-opacity="0"/></radialGradient>
${sym('broom',`<path d="M39 4L24 26" stroke="${O}" stroke-width="6.4"/><path d="M39 4L24 26" stroke="#e0a860" stroke-width="3.2"/><path d="M37.5 6.5l-3 4.4" stroke="#fff3c4" stroke-width="1.6" opacity=".8"/>
<path d="M20 24L29 29.5L28 46Q15 46.5 4.5 40Z" fill="url(#gh)" stroke="${O}" stroke-width="2.4"/>
<path d="M24.5 27.5L8 40.5M24.5 28L13 43.5M25 28.5L18.5 45.2M26 29L23.5 45.8" stroke="#c9902a" stroke-width="1.8"/>
<path d="M18.5 21.5L30.5 28L28.5 32L16.5 25.5Z" fill="#d1583c" stroke="${O}" stroke-width="2"/><path d="M19 23.6l10 5.4" stroke="#ff9a7a" stroke-width="1.4"/>
<path d="M5 44h6M33 42l4 1M36 38l4-1" stroke="#c9a468" stroke-width="2.2" opacity=".75"/>`)}
${sym('mop',`<path d="M37 3L24 27" stroke="${O}" stroke-width="6.4"/><path d="M37 3L24 27" stroke="#e0a860" stroke-width="3.2"/>
<path d="M11 27.5h24a3.2 3.2 0 0 1 0 6.4H11a3.2 3.2 0 0 1 0-6.4z" fill="url(#gt)" stroke="${O}" stroke-width="2.3"/>
<path d="M13 34q-2.5 5 0 10M18 34q1.5 5-.5 10.5M23 34q2 5 0 10.5M28 34q-1.5 5 1 10M33 34q2 4.5 .5 9.5" stroke="${O}" stroke-width="6.4" fill="none"/>
<path d="M13 34q-2.5 5 0 10M18 34q1.5 5-.5 10.5M23 34q2 5 0 10.5M28 34q-1.5 5 1 10M33 34q2 4.5 .5 9.5" stroke="#fffaf0" stroke-width="3.6" fill="none"/>
<path d="M42 32c-2 3-3.5 4.6-3.5 6.4a3.5 3.5 0 0 0 7 0c0-1.8-1.5-3.4-3.5-6.4z" fill="url(#gb)" stroke="#2a74c0" stroke-width="1.6"/><path d="M14 30h8" stroke="#fff" stroke-width="1.8" opacity=".7"/>`)}
${sym('leafpile',`<path d="M4 41Q9 23 24 20Q39 23 44 41Z" fill="url(#go)" stroke="${O}" stroke-width="2.4"/>
<path d="M11 33q5-3 8 1M27 28q5-2 8 2M20 37q4-2 7 1" stroke="#c4581a" stroke-width="2" fill="none" opacity=".6"/>
<path d="M14 26q4-9 13-8q-3 9-13 8z" fill="#ffd34a" stroke="${O}" stroke-width="2"/><path d="M15 25.5l10-6.5" stroke="#d99a1a" stroke-width="1.4"/>
<path d="M25 22q8-6 15 0q-8 5-15 0z" fill="#7fcf5a" stroke="${O}" stroke-width="2"/><path d="M26 22h13" stroke="#3f8f2c" stroke-width="1.4"/>
<path d="M30 9q5-3 8 1q-5 4-8-1z" fill="#e8483f" stroke="${O}" stroke-width="1.8"/><path d="M8 14q4-2 6 1q-4 3-6-1z" fill="#ffc83d" stroke="${O}" stroke-width="1.6"/>
<path d="M4 41h40" stroke="${O}" stroke-width="2.4"/>`)}
${sym('sparkle',`<path d="M22 4C23.8 15.5 27 19.5 40 21.5C27 23.5 23.8 27.5 22 40C20.2 27.5 17 23.5 4 21.5C17 19.5 20.2 15.5 22 4Z" fill="url(#gg)" stroke="${O}" stroke-width="2.4"/>
<path d="M38 28c.8 5 2 6.4 7 7.2c-5 .8-6.2 2.2-7 7.2c-.8-5-2-6.4-7-7.2c5-.8 6.2-2.2 7-7.2z" fill="#9ff3e4" stroke="#1f8f84" stroke-width="1.8"/>
<path d="M38 4l1.2 3.4 3.4 1.2-3.4 1.2L38 13.2l-1.2-3.4-3.4-1.2 3.4-1.2z" fill="#fff" stroke="#c47a0c" stroke-width="1.3"/><path d="M15.5 14.5l3-3.5" stroke="#fff" stroke-width="2.2" opacity=".85"/>`)}
${sym('adzan',`<path d="M12 33v10M7 44h10" stroke="${O}" stroke-width="3.4"/>
<path d="M6 19h7l15-10v30l-15-10H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" fill="url(#gy)" stroke="${O}" stroke-width="2.4"/>
<ellipse cx="28" cy="24" rx="4.4" ry="15" fill="#f5f9ff" stroke="${O}" stroke-width="2.4"/><ellipse cx="28" cy="24" rx="2" ry="8" fill="#9aa9b8"/>
<path d="M13 19v10" stroke="#35b5a5" stroke-width="3"/><path d="M8 21.5h4" stroke="#fff" stroke-width="1.8"/>
<path d="M36 16.5q4 7.5 0 15M40.5 11.5q7 12.5 0 25" stroke="#fff" stroke-width="5.2" fill="none"/><path d="M36 16.5q4 7.5 0 15M40.5 11.5q7 12.5 0 25" stroke="#f3a21a" stroke-width="3" fill="none"/>`)}
${sym('imam',`<path d="M9 7h30a2 2 0 0 1 2 2v30a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/>
<path d="M12 12h24v24H12z" fill="none" stroke="#ffd34a" stroke-width="2"/>
<path d="M17 36V24a7 7 0 0 1 14 0v12z" fill="#146d66" stroke="#ffd34a" stroke-width="2"/><path d="M20.5 22.5a3.5 3.5 0 0 1 7 0z" fill="#ffd34a"/><path d="M24 15.5v3" stroke="#ffd34a" stroke-width="1.8"/>
<path d="M11 41v4M16 41v4M21 41v4M27 41v4M32 41v4M37 41v4" stroke="#c9a468" stroke-width="2"/><path d="M11 10l6 0" stroke="#fff" stroke-width="2" opacity=".55"/>`)}
${sym('kentongan',`<path d="M24 2v7" stroke="#c9a468" stroke-width="2.6"/><path d="M18 8h12" stroke="${O}" stroke-width="2.6"/>
<rect x="15" y="9" width="18" height="33" rx="9" fill="url(#gw)" stroke="${O}" stroke-width="2.4"/><rect x="21.5" y="15" width="5" height="21" rx="2.5" fill="#4a2414"/>
<path d="M18.5 14v24" stroke="#ffd9a8" stroke-width="2" opacity=".6"/><path d="M15.5 20h17M15.5 31h17" stroke="${O}" stroke-width="1.4" opacity=".4"/>
<path d="M34 44l9-11" stroke="${O}" stroke-width="4.4"/><path d="M34 44l9-11" stroke="#e0a860" stroke-width="2"/><circle cx="43.5" cy="32" r="3.4" fill="#d1583c" stroke="${O}" stroke-width="2"/>`)}
${sym('clock',`<path d="M33 3a10 10 0 1 0 12 13A8 8 0 0 1 33 3z" fill="url(#gg)" stroke="${O}" stroke-width="2.2"/>
<circle cx="21" cy="27" r="16" fill="url(#gc)" stroke="${O}" stroke-width="2.6"/><circle cx="21" cy="27" r="12" fill="#fff" stroke="#35b5a5" stroke-width="2"/>
<path d="M21 17v2.4M21 34.6V37M11 27h2.4M28.6 27H31" stroke="#c9a468" stroke-width="2.2"/><path d="M21 27v-7M21 27l5.5 3.5" stroke="${O}" stroke-width="3"/><circle cx="21" cy="27" r="2" fill="#e8483f"/>`)}
${sym('palette',`<path d="M24 5C12 5 4 13 4 23c0 9 7 15 13 13.4 4-1 2.6-6.4 6.6-7.4 3.4-.8 6.4 2.6 10 3.6 6.4 1.8 10.4-3.2 10.4-9C44 13 35 5 24 5z" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/>
<circle cx="14" cy="22" r="3.6" fill="#e8483f" stroke="${O}" stroke-width="1.6"/><circle cx="19" cy="13.5" r="3.6" fill="#ffc83d" stroke="${O}" stroke-width="1.6"/><circle cx="29" cy="12.5" r="3.6" fill="#35b5a5" stroke="${O}" stroke-width="1.6"/><circle cx="37" cy="19" r="3.6" fill="#4aa8ee" stroke="${O}" stroke-width="1.6"/>
<path d="M30 44l11-16" stroke="${O}" stroke-width="5"/><path d="M30 44l11-16" stroke="#e0a860" stroke-width="2.6"/><path d="M40 29.5l3-4.5 2.4 1.6-2.6 4.6z" fill="#ff7aa2" stroke="${O}" stroke-width="1.6"/>`)}
${sym('roof',`<path d="M23 3h2v4h-2z" fill="#c47a0c"/><circle cx="24" cy="5" r="2.6" fill="url(#gg)" stroke="#a8650c" stroke-width="1.4"/>
<path d="M14 18L24 7.5L34 18Z" fill="url(#gw)" stroke="${O}" stroke-width="2.3"/>
<path d="M17 18h14v3H17z" fill="#fff6e6" stroke="${O}" stroke-width="1.6"/>
<path d="M8 29L15.5 21H32.5L40 29Z" fill="url(#gw)" stroke="${O}" stroke-width="2.3"/>
<path d="M12 29h24v3.4H12z" fill="#fff6e6" stroke="${O}" stroke-width="1.6"/>
<path d="M2.5 42L10 32.4H38L45.5 42Z" fill="url(#gw)" stroke="${O}" stroke-width="2.4"/><path d="M2 42h44" stroke="#5e3a22" stroke-width="3"/>
<path d="M11 36.5h26M14 25h20" stroke="#8a4a26" stroke-width="1.4" opacity=".5"/>`)}
${sym('wall',`<path d="M4 14h40v28H4z" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/><path d="M4 14h40v5H4z" fill="url(#gt)" stroke="${O}" stroke-width="2"/>
<path d="M8 16.5h4M16 16.5h4M24 16.5h4M32 16.5h4" stroke="#ffd34a" stroke-width="1.6"/>
<path d="M17.5 42V31a6.5 6.5 0 0 1 13 0v11z" fill="#8a5530" stroke="${O}" stroke-width="2.2"/><path d="M24 25v17" stroke="#5e3a22" stroke-width="1.6"/>
<rect x="7.5" y="24" width="5.5" height="9" rx="2.7" fill="#7a4a2a" stroke="${O}" stroke-width="1.6"/><rect x="35" y="24" width="5.5" height="9" rx="2.7" fill="#7a4a2a" stroke="${O}" stroke-width="1.6"/>
<path d="M2 42h44" stroke="#c9b48c" stroke-width="3.4"/><path d="M38 4l5 5-9 9h-5v-5z" fill="url(#gp)" stroke="${O}" stroke-width="1.8"/>`)}
${sym('gate',`<path d="M4 44V24h4V15h4V8h4v-4h4.5v40z" fill="url(#gk)" stroke="${O}" stroke-width="2.2"/><path d="M44 44V24h-4V15h-4V8h-4v-4h-4.5v40z" fill="url(#gk)" stroke="${O}" stroke-width="2.2"/>
<path d="M4 24h4M8 15h4M12 8h4M44 24h-4M40 15h-4M36 8h-4" stroke="#ffd0b0" stroke-width="2"/>
<path d="M6 32h14M6 38h14M28 32h14M28 38h14" stroke="#8f3d28" stroke-width="1.2" opacity=".55"/>
<circle cx="14" cy="27" r="2.2" fill="#fff" stroke="#c9b48c" stroke-width="1.2"/><circle cx="34" cy="27" r="2.2" fill="#fff" stroke="#c9b48c" stroke-width="1.2"/>
<path d="M21 44l-1.5 3M27 44l1.5 3" stroke="#e8d9b8" stroke-width="2"/><path d="M1 44h46" stroke="${O}" stroke-width="2.4"/>`)}
${sym('menara',`<circle cx="24" cy="3.6" r="2.2" fill="url(#gg)" stroke="#a8650c" stroke-width="1.2"/>
<path d="M14 15L24 5L34 15Z" fill="url(#gw)" stroke="${O}" stroke-width="2.2"/><path d="M15 15v5M33 15v5M24 15v5" stroke="${W}" stroke-width="2.4"/><path d="M12.5 20h23v3.4h-23z" fill="#8f3d28" stroke="${O}" stroke-width="1.8"/>
<path d="M15.5 23.4L14 42h20l-1.5-18.6z" fill="url(#gk)" stroke="${O}" stroke-width="2.3"/>
<path d="M14.6 31h18.8" stroke="#8f3d28" stroke-width="2.4"/><path d="M14.6 30h18.8" stroke="#ffc6a8" stroke-width="1"/>
<circle cx="20" cy="27" r="1.6" fill="#fff"/><circle cx="28" cy="27" r="1.6" fill="#fff"/><path d="M21.5 42v-5a2.5 2.5 0 0 1 5 0v5z" fill="#4a2414"/><path d="M11 42h26v3H11z" fill="#8f3d28" stroke="${O}" stroke-width="1.8"/>`)}
${sym('carpet',`<path d="M10 7h28a2 2 0 0 1 2 2v30a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="url(#gm)" stroke="${O}" stroke-width="2.4"/>
<path d="M12.5 11.5h23v25h-23z" fill="none" stroke="#ffd34a" stroke-width="2.2"/><path d="M24 15l8 9-8 9-8-9z" fill="#ffd34a" stroke="${O}" stroke-width="1.6"/><path d="M24 20l3.6 4-3.6 4-3.6-4z" fill="#1f8f84"/>
<path d="M12 41v4M17 41v4M22 41v4M26 41v4M31 41v4M36 41v4M12 3v4M17 3v4M22 3v4M26 3v4M31 3v4M36 3v4" stroke="#e8d0a0" stroke-width="2"/>`)}
${sym('lamp',`<path d="M24 1v9" stroke="#a8650c" stroke-width="2.2" stroke-dasharray="2.4 1.4"/>
<circle cx="24" cy="30" r="16" fill="url(#gl)"/>
<path d="M14 18q10-9 20 0z" fill="url(#gg)" stroke="${O}" stroke-width="2.2"/><circle cx="24" cy="11" r="2.4" fill="url(#gg)" stroke="${O}" stroke-width="1.4"/>
<path d="M15 18h18l-2.5 14h-13z" fill="#fff6c0" stroke="${O}" stroke-width="2.2"/><path d="M20 18l-1 14M28 18l1 14M24 18v14" stroke="#e0a63a" stroke-width="1.4"/>
<path d="M16.5 32h15l-3 5h-9z" fill="url(#gg)" stroke="${O}" stroke-width="2"/><path d="M24 37v5" stroke="#c47a0c" stroke-width="2"/><circle cx="24" cy="43" r="2" fill="#e8483f"/>`)}
${sym('plant',`<path d="M24 28C22 18 14 12 5 13c6 2 11 7 15 15M24 28c1-11 7-18 17-19-6 3-10 9-13 19M24 28c-4-8-3-17 2-23 0 7 1 14 0 23M24 28c-8-3-15-2-20 4 7-1 13 0 18 2M24 28c7-4 14-4 20 1-6 0-12 1-17 4" fill="url(#gr)" stroke="#2f7f35" stroke-width="2"/>
<path d="M11 29h26l-3.5 14a3 3 0 0 1-3 2.4h-13a3 3 0 0 1-3-2.4z" fill="url(#go)" stroke="${O}" stroke-width="2.4"/><path d="M10 29h28" stroke="${O}" stroke-width="3.2"/><path d="M15 34h8" stroke="#fff" stroke-width="2" opacity=".5"/>`)}
${sym('lampion',`<path d="M24 1v6" stroke="${O}" stroke-width="2.2"/><circle cx="24" cy="25" r="20" fill="url(#gl)" opacity=".7"/>
<path d="M17 7h14v4H17z" fill="url(#gg)" stroke="${O}" stroke-width="1.8"/>
<ellipse cx="24" cy="23.5" rx="15" ry="12.5" fill="url(#gm)" stroke="${O}" stroke-width="2.4"/>
<path d="M24 11c-5 3-5 22 0 25M24 11c5 3 5 22 0 25M14 15.5c-3 4-3 12 0 16M34 15.5c3 4 3 12 0 16" stroke="#ffd34a" stroke-width="1.6" fill="none"/><path d="M14 19q4-5 8-6" stroke="#fff" stroke-width="2" opacity=".55" fill="none"/>
<path d="M17 36h14v3.4H17z" fill="url(#gg)" stroke="${O}" stroke-width="1.8"/><path d="M22 39.4l-1 6M24 39.4v7M26 39.4l1 6" stroke="#ffc83d" stroke-width="2"/>`)}
${sym('panel',`<rect x="4" y="4" width="40" height="40" rx="5" fill="url(#gw)" stroke="${O}" stroke-width="2.4"/><rect x="9" y="9" width="30" height="30" rx="2" fill="#fff6e0" stroke="${O}" stroke-width="1.8"/>
${star8(24,24,13,'url(#gt)',O)}${star8(24,24,6.5,'#ffd34a','#a8650c')}
<path d="M9 9l6 6M39 9l-6 6M9 39l6-6M39 39l-6-6" stroke="#35b5a5" stroke-width="1.8"/>`)}
${sym('finial',`<path d="M24 2v9" stroke="#a8650c" stroke-width="2.6"/><circle cx="24" cy="4" r="2.6" fill="url(#gg)" stroke="#a8650c" stroke-width="1.4"/>
<path d="M24 10c5 4 7 8 4.5 12h-9C17 18 19 14 24 10z" fill="url(#gg)" stroke="${O}" stroke-width="2.2"/>
<ellipse cx="24" cy="24" rx="7" ry="3" fill="#f3b33a" stroke="${O}" stroke-width="2"/>
<path d="M24 26c8 2 12 7 9 14H15c-3-7 1-12 9-14z" fill="url(#gg)" stroke="${O}" stroke-width="2.3"/><path d="M19 31q2-3 5-3.4" stroke="#fff" stroke-width="2" opacity=".8" fill="none"/>
<path d="M11 40h26v4H11z" fill="url(#gw)" stroke="${O}" stroke-width="2"/>`)}
${sym('eye',`<path d="M3 24C9 13 16 9 24 9s15 4 21 15c-6 11-13 15-21 15S9 35 3 24z" fill="#fff" stroke="${O}" stroke-width="2.6"/>
<circle cx="24" cy="24" r="9.5" fill="url(#gt)" stroke="${O}" stroke-width="2.2"/><circle cx="24" cy="24" r="4.6" fill="#2a2a38"/><circle cx="21" cy="21" r="2.4" fill="#fff"/><path d="M8 15l-3-4M16 10.5l-1.5-4.5M40 15l3-4M32 10.5l1.5-4.5" stroke="${O}" stroke-width="2.4"/>`)}
${sym('walk',`<g transform="rotate(-14 15 30)"><ellipse cx="15" cy="32" rx="6" ry="9" fill="url(#gc)" stroke="${O}" stroke-width="2.2"/><circle cx="10.5" cy="20" r="2" fill="url(#gc)" stroke="${O}" stroke-width="1.5"/><circle cx="14.5" cy="18.6" r="2.2" fill="url(#gc)" stroke="${O}" stroke-width="1.5"/><circle cx="19" cy="19.4" r="2" fill="url(#gc)" stroke="${O}" stroke-width="1.5"/></g>
<g transform="rotate(12 33 18)"><ellipse cx="33" cy="20" rx="6" ry="9" fill="url(#gt)" stroke="${O}" stroke-width="2.2"/><circle cx="28.5" cy="8" r="2" fill="url(#gt)" stroke="${O}" stroke-width="1.5"/><circle cx="32.5" cy="6.6" r="2.2" fill="url(#gt)" stroke="${O}" stroke-width="1.5"/><circle cx="37" cy="7.4" r="2" fill="url(#gt)" stroke="${O}" stroke-width="1.5"/></g>`)}
${sym('sort',`<rect x="5" y="9" width="24" height="6" rx="3" fill="url(#gt)" stroke="${O}" stroke-width="2"/><rect x="5" y="21" width="18" height="6" rx="3" fill="url(#gt)" stroke="${O}" stroke-width="2"/><rect x="5" y="33" width="11" height="6" rx="3" fill="url(#gt)" stroke="${O}" stroke-width="2"/>
<path d="M37 8v30" stroke="${O}" stroke-width="5"/><path d="M37 8v30" stroke="#ffc83d" stroke-width="2.6"/><path d="M30 33l7 8 7-8z" fill="url(#gg)" stroke="${O}" stroke-width="2"/>`)}
${sym('filter',`<path d="M5 8h38l-14 17v13l-10 5V25z" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><path d="M10 11.5h28" stroke="#fff" stroke-width="2.2" opacity=".6"/><path d="M22 27v12" stroke="#146d66" stroke-width="2" opacity=".6"/>`)}
${sym('zzz',`<path d="M27 6a15 15 0 1 0 15 20A12 12 0 0 1 27 6z" fill="url(#gn)" stroke="#4a4fa8" stroke-width="2.2"/>
<path d="M6 8h9l-9 10h9" stroke="#fff" stroke-width="5" fill="none"/><path d="M6 8h9l-9 10h9" stroke="#4a4fa8" stroke-width="2.6" fill="none"/>
<path d="M33 30h6l-6 7h6" stroke="#fff" stroke-width="4.4" fill="none"/><path d="M33 30h6l-6 7h6" stroke="#4a4fa8" stroke-width="2.3" fill="none"/>`)}
${sym('sick',`<g transform="rotate(-40 24 24)"><rect x="3" y="16" width="42" height="16" rx="8" fill="#ffd9c0" stroke="${O}" stroke-width="2.4"/><rect x="16" y="16" width="16" height="16" fill="#fff3e6" stroke="${O}" stroke-width="2"/><circle cx="21" cy="21" r="1.2" fill="#e0a080"/><circle cx="27" cy="21" r="1.2" fill="#e0a080"/><circle cx="21" cy="27" r="1.2" fill="#e0a080"/><circle cx="27" cy="27" r="1.2" fill="#e0a080"/></g>
<path d="M38 5v8M34 9h8" stroke="#ff7a9c" stroke-width="3.2"/>`)}
${sym('scale',`<path d="M24 3v5" stroke="${O}" stroke-width="2.6"/><circle cx="24" cy="5" r="2.8" fill="none" stroke="${O}" stroke-width="2.2"/>
<rect x="6" y="9" width="36" height="34" rx="11" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><circle cx="24" cy="27" r="11" fill="#fff" stroke="${O}" stroke-width="2"/>
<path d="M15.5 23.5l2 1M24 16.5v2.2M32.5 23.5l-2 1M14 30h2.4M34 30h-2.4" stroke="#c9a468" stroke-width="2"/><path d="M24 28l5.5-6.5" stroke="#e8483f" stroke-width="2.6"/><circle cx="24" cy="28" r="2.2" fill="${O}"/>`)}
${sym('baby',`<path d="M20 9a4 4 0 0 1 8 0v3h-8z" fill="url(#gp)" stroke="${O}" stroke-width="2"/><rect x="16" y="12" width="16" height="6" rx="2.4" fill="url(#gt)" stroke="${O}" stroke-width="2"/>
<path d="M17 18h14l1.5 5v17a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4V23z" fill="#fffdf6" stroke="${O}" stroke-width="2.4"/>
<path d="M16.6 28h14.8v12a4 4 0 0 1-4 4h-6.8a4 4 0 0 1-4-4z" fill="#fff" opacity=".9"/><path d="M27 24h4M27 29h4M27 34h4" stroke="#4aa8ee" stroke-width="2"/><path d="M19.5 23v14" stroke="#fff" stroke-width="2.4" opacity=".9"/>`)}
${sym('wind',`<path d="M4 17h24a6 6 0 1 0-6-6" stroke="#fff" stroke-width="6.4" fill="none"/><path d="M4 17h24a6 6 0 1 0-6-6" stroke="#4aa8ee" stroke-width="3.4" fill="none"/>
<path d="M4 27h32a6 6 0 1 1-6 6" stroke="#fff" stroke-width="6.4" fill="none"/><path d="M4 27h32a6 6 0 1 1-6 6" stroke="#6cc4ff" stroke-width="3.4" fill="none"/>
<path d="M36 6q6-3 9 2q-6 4-9-2z" fill="#7fcf5a" stroke="${O}" stroke-width="1.6"/><path d="M11 38q5-2 7 2q-5 3-7-2z" fill="#ffc83d" stroke="${O}" stroke-width="1.6"/>`)}
${sym('menu',`<rect x="5" y="5" width="17" height="17" rx="5.5" fill="url(#gt)" stroke="${O}" stroke-width="2.4"/><rect x="26" y="5" width="17" height="17" rx="5.5" fill="url(#gg)" stroke="${O}" stroke-width="2.4"/>
<rect x="5" y="26" width="17" height="17" rx="5.5" fill="url(#gp)" stroke="${O}" stroke-width="2.4"/><rect x="26" y="26" width="17" height="17" rx="5.5" fill="url(#gc)" stroke="${O}" stroke-width="2.4"/>
<path d="M9 10h6M30 10h6M9 31h6M30 31h6" stroke="#fff" stroke-width="2.4" opacity=".75"/>`)}
${sym('paw',`<path d="M24 23c-7 0-13 8-13 13.5 0 4 3 6 6.5 6 2.6 0 4-1.4 6.5-1.4s3.9 1.4 6.5 1.4c3.5 0 6.5-2 6.5-6C37 31 31 23 24 23z" fill="url(#gp)" stroke="${O}" stroke-width="2.4"/>
<ellipse cx="9.5" cy="20" rx="4.4" ry="5.6" transform="rotate(-20 9.5 20)" fill="url(#gp)" stroke="${O}" stroke-width="2.2"/><ellipse cx="18" cy="11" rx="4.6" ry="6" transform="rotate(-8 18 11)" fill="url(#gp)" stroke="${O}" stroke-width="2.2"/>
<ellipse cx="30" cy="11" rx="4.6" ry="6" transform="rotate(8 30 11)" fill="url(#gp)" stroke="${O}" stroke-width="2.2"/><ellipse cx="38.5" cy="20" rx="4.4" ry="5.6" transform="rotate(20 38.5 20)" fill="url(#gp)" stroke="${O}" stroke-width="2.2"/>
<path d="M18 30q3-3 6-3" stroke="#fff" stroke-width="2.2" opacity=".8" fill="none"/>`)}
`;
}

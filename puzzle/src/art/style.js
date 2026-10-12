// Shared visual language: palette + crayon/pencil SVG filters matching the reference illustration
// (soft pastel fills with visible crayon grain, wobbly grey pencil outlines, pink cheeks, cream paper).
// Every art SVG should be built with svg(w, h, inner) so the filters are available.

export const PAL = {
  paper: '#fbf3e6', paperDeep: '#f3e6d0',
  line: '#5b5552',          // soft graphite outline
  lineDark: '#3f3a38',
  skin: '#ffffff', skinShade: '#f3ece6',
  cheek: '#f7a9b8',
  hijab: '#e8846a', hijabShade: '#d36d55',
  momShirt: '#fbc6dc', momShirtShade: '#f2a9c8',
  dadHair: '#8d8d8d', dadHairDark: '#6b6b6b',
  dadShirt: '#2fb98f', dadShirtShade: '#25a07b',
  babyBlue: '#2f57b8', babyBlueDeep: '#1f3f91', babySwirl: '#6f9be8', star: '#f6cf3e',
  red: '#ef6f6c', yellow: '#f6cf3e', blue: '#5b8fe0', green: '#59c48c', purple: '#a98be0', orange: '#f5a25d',
};

/** <defs> with the crayon filters. Use filter="url(#crayon)" for fills, url(#pencil) for outlines. */
export function defs(seed = 3) {
  return `
<defs>
  <!-- wobble: hand-drawn edge displacement -->
  <filter id="pencil" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="${seed + 7}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="ga"/>
    <feComposite in="d" in2="ga" operator="in"/>
  </filter>
  <!-- crayon fill: wobble + grainy coverage so paper shows through -->
  <filter id="crayon" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${seed + 1}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.25" numOctaves="2" seed="${seed + 3}" result="g"/>
    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="ga"/>
    <feComposite in="d" in2="ga" operator="in"/>
  </filter>
  <!-- soft edges for blush -->
  <filter id="blush" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>`;
}

export function svg(w, h, inner, seed) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs(seed)}${inner}</svg>`;
}

/** Common stroke attributes for pencil outlines. */
export const stroke = (wdt = 3.2, col = PAL.line) =>
  `fill="none" stroke="${col}" stroke-width="${wdt}" stroke-linecap="round" stroke-linejoin="round" filter="url(#pencil)"`;
/** Crayon fill attributes. */
export const fill = col => `fill="${col}" filter="url(#crayon)"`;

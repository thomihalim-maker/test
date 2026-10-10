import { game } from './engine/game.js';
import { audio } from './engine/audio.js';

game.register('menu', () => import('./scenes/menu.js'));
game.register('level1', () => import('./scenes/level1.js'));
game.register('level2', () => import('./scenes/level2.js'));
game.register('level3', () => import('./scenes/level3.js'));
game.register('finale', () => import('./scenes/finale.js'));

async function boot() {
  game.init(document.getElementById('c'));
  game.onFirstInput = () => audio.unlock();
  // Wait (briefly) for the rounded display font; the game works with the fallback too.
  try { await Promise.race([document.fonts.load('700 40px Fredoka'), new Promise(r => setTimeout(r, 1500))]); } catch (_) {}
  const start = game.params.get('scene') || 'menu';
  await game.go(game.scenes.has(start) ? start : 'menu');
  window.__ready = true; // test hook
}
boot();

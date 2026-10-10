// Procedural audio (WebAudio, no files). STUB — the audio builder owns this file and expands it.
// Public API (keep stable): audio.unlock(), audio.sfx(name, opts), audio.music(name|null), audio.voice(text), audio.muted
import { save } from './save.js';

class Audio {
  constructor() { this.ctx = null; this.master = null; this.muted = save.muted || new URLSearchParams(location.search).has('mute'); }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
  }
  setMuted(m) { this.muted = m; save.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.8; if (m && window.speechSynthesis) speechSynthesis.cancel(); }
  /** names: tap, pick, drop, snap, wrong, whoosh, sparkle, star, cheer, pop, giggle, win, unlock */
  sfx(name, opts = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = { snap: 880, wrong: 220, star: 1320, cheer: 660 }[name] || 520;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.2);
  }
  /** names: 'menu', 'level', null to stop */
  music(name) {}
  /** Spoken instruction in Indonesian (speechSynthesis), optional. */
  voice(text) {}
}
export const audio = new Audio();

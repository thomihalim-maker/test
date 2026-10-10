// Procedural audio (WebAudio, no files): warm mallet / kalimba / music-box timbres through a generated
// reverb, friendly sfx and two looping "Twinkle Twinkle" (Ah vous dirai-je, public domain) arrangements.
// Public API (keep stable): audio.unlock(), audio.sfx(name, opts), audio.music(name|null), audio.voice(text),
//                           audio.muted, audio.setMuted(bool)
// Added: audio.note(midi, {inst, vel, when, rev}) — play a single musical note (for melodic feedback),
//        audio.sfx('star', {i: 0..2}) raises the pitch per star, audio.sfx(name, {vol, pitch}).
// Never throws: everything is guarded and is a no-op before the first tap / without WebAudio.
import { save } from './save.js';

const dbg = e => { try { if (window.__audioDebug) console.error('audio:', e && e.stack || e); } catch (_) {} };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const R = (a, b) => a + Math.random() * (b - a);

// Instrument partials: [frequency ratio, gain, decay seconds]
const INST = {
  marimba: { p: [[1, 1, 0.75], [3.98, 0.32, 0.12], [9.9, 0.07, 0.04]], click: 0.06 },
  kalimba: { p: [[1, 1, 1.2], [5.95, 0.22, 0.09], [2.01, 0.07, 0.35]], click: 0.08 },
  musicbox: { p: [[1, 1, 1.7], [2, 0.22, 0.7], [3, 0.1, 0.35], [5.04, 0.08, 0.12]], click: 0.03 },
  bell: { p: [[1, 1, 1.4], [2.76, 0.36, 0.55], [5.4, 0.16, 0.25], [8.93, 0.06, 0.1]], click: 0 },
  bass: { p: [[1, 1, 0.55], [2, 0.18, 0.25], [3, 0.05, 0.1]], click: 0 },
};

// ---------- Twinkle Twinkle in C (midi, length in eighth-note steps) ----------
const A1 = [[60, 2], [60, 2], [67, 2], [67, 2], [69, 2], [69, 2], [67, 4]];
const A2 = [[65, 2], [65, 2], [64, 2], [64, 2], [62, 2], [62, 2], [60, 4]];
const B1 = [[67, 2], [67, 2], [65, 2], [65, 2], [64, 2], [64, 2], [62, 4]];
const MELODY = [...A1, ...A2, ...B1, ...B1, ...A1, ...A2];
// one chord per 4 steps (half bar), as [root, third, fifth]
const C = [48, 52, 55], F = [53, 57, 60], G = [55, 59, 62];
const CHORDS = [C, C, F, C, F, C, G, C, C, F, C, G, C, F, C, G, C, C, F, C, F, C, G, C];
const LOOP = 96; // steps (eighths) per pass

class Audio {
  constructor() {
    this.ctx = null; this.master = null;
    let urlMute = false; try { urlMute = new URLSearchParams(location.search).has('mute'); } catch (e) { dbg(e); }
    this.muted = !!(save.muted || urlMute);
    this.track = null; this._want = null; this._timer = null; this._lastSfx = {};
    this._voices = [];
    try {
      if (typeof speechSynthesis !== 'undefined') {
        const load = () => { try { this._voices = speechSynthesis.getVoices() || []; } catch (e) { dbg(e); } };
        load(); speechSynthesis.addEventListener?.('voiceschanged', load);
      }
    } catch (e) { dbg(e); }
    try {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        try { if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); } catch (e) { dbg(e); }
      });
    } catch (e) { dbg(e); }
  }

  get ready() { return !!this.ctx && this.ctx.state !== 'closed'; }

  unlock() {
    try {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this._build();
      // iOS: play a silent buffer inside the gesture
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this._want) { const w = this._want; this._want = null; this.music(w); }
    } catch (e) { this.ctx = null; }
  }

  _build() {
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.85;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp).connect(c.destination);
    // warm low-pass on the whole mix keeps everything soft for small ears
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.duck = c.createGain(); this.duck.gain.value = 1; this.duck.connect(this.master);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.42;
    const mlp = c.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 5200;
    this.musicBus.connect(mlp).connect(this.duck);
    // reverb
    this.verb = c.createConvolver(); this.verb.buffer = this._impulse(2.6);
    this.verbOut = c.createGain(); this.verbOut.gain.value = 0.5;
    this.verb.connect(this.verbOut).connect(this.master);
    this.sfxSend = c.createGain(); this.sfxSend.gain.value = 0.35; this.sfxSend.connect(this.verb);
    this.musicSend = c.createGain(); this.musicSend.gain.value = 0.55; this.musicSend.connect(this.verb);
    // shared noise
    const n = c.createBuffer(1, c.sampleRate, c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = n;
  }

  _impulse(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len, env = Math.pow(1 - k, 3.4);
        // darker tail: one-pole low-pass whose cutoff closes over time
        const a = 0.35 + 0.6 * k; lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = lp * env * 1.8;
      }
      // a few early reflections
      for (let r = 0; r < 6; r++) { const at = Math.floor(c.sampleRate * (0.012 + r * 0.017 + ch * 0.003)); if (at < len) d[at] += (0.5 - r * 0.07) * (r % 2 ? -1 : 1); }
    }
    return buf;
  }

  setMuted(m) {
    this.muted = !!m; try { save.muted = this.muted; } catch (e) { dbg(e); }
    try {
      if (this.master) { const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(m ? 0 : 0.85, t, 0.03); }
      if (m && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    } catch (e) { dbg(e); }
  }

  // ---------------- synthesis primitives ----------------
  _out(dest, rev) {
    const g = this.ctx.createGain(); g.connect(dest);
    if (rev > 0) { const s = this.ctx.createGain(); s.gain.value = rev; g.connect(s); s.connect(dest === this.sfxBus ? this.sfxSend : this.musicSend); }
    return g;
  }
  /** Mallet-style note: inst name, midi or freq, start time, velocity, destination bus, reverb amount, length scale */
  _inst(inst, freq, t, vel = 0.5, dest = this.sfxBus, rev = 0.35, len = 1) {
    const c = this.ctx, def = INST[inst] || INST.marimba, out = this._out(dest, rev);
    let stop = t;
    for (const [r, g, dec] of def.p) {
      const f = freq * r; if (f > 16000) continue;
      const o = c.createOscillator(), e = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const d = dec * len * (r === 1 ? Math.min(1.4, 440 / freq + 0.6) : 1);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * vel, t + 0.005);
      e.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(e).connect(out); o.start(t); o.stop(t + d + 0.05); stop = Math.max(stop, t + d);
    }
    if (def.click) this._noise(t, 0.012, def.click * vel, 'bandpass', freq * 4, 1.2, out);
    return stop;
  }
  _noise(t, dur, vol, type = 'bandpass', freq = 2000, q = 1, dest = this.sfxBus) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = Math.min(freq, 18000); f.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.004, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    return { s, f, g };
  }
  /** Simple oscillator with pitch glide: f0 -> f1 over dur */
  _glide(t, f0, f1, dur, vol, type = 'sine', dest = this.sfxBus, rev = 0.2, curve = 'exp') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), out = this._out(dest, rev);
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f1, t + dur); else o.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.08);
    return o;
  }
  _duckMusic(depth = 0.45, hold = 0.25) {
    const t = this.ctx.currentTime, g = this.duck.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(depth, t, 0.02); g.setTargetAtTime(1, t + hold, 0.35);
  }

  /** Play one musical note (for melodic feedback, e.g. ascending notes per correct piece). */
  note(midi, { inst = 'marimba', vel = 0.45, when = 0, rev = 0.4 } = {}) {
    if (!this.ready) return;
    try { this._inst(inst, mtof(midi), this.ctx.currentTime + 0.005 + when, vel, this.sfxBus, rev); } catch (e) { dbg(e); }
  }

  /** names: tap, pick, drop, snap, wrong, whoosh, sparkle, star, cheer, pop, giggle, win, unlock */
  sfx(name, opts = {}) {
    if (!this.ready || this.muted) return;
    try {
      const c = this.ctx, now = c.currentTime;
      // tiny anti-machine-gun guard for identical sfx in the same frame
      if (this._lastSfx[name] && now - this._lastSfx[name] < 0.03) return;
      this._lastSfx[name] = now;
      const t = now + 0.005, v = opts.vol ?? 1, p = Math.pow(2, (opts.pitch || 0) / 12);
      const I = (inst, m, dt, vel, rev = 0.35, len = 1) => this._inst(inst, mtof(m) * p, t + dt, vel * v, this.sfxBus, rev, len);
      switch (name) {
        case 'tap': {
          this._glide(t, 900 * p, 520 * p, 0.05, 0.16 * v, 'sine', this.sfxBus, 0.1);
          I('marimba', [79, 84, 81][(this._tapI = ((this._tapI || 0) + 1) % 3)], 0, 0.32, 0.2, 0.6);
          break;
        }
        case 'pick': {
          this._glide(t, 480 * p, 900 * p, 0.09, 0.14 * v, 'sine', this.sfxBus, 0.15);
          I('kalimba', 86, 0.03, 0.22, 0.3, 0.6);
          break;
        }
        case 'drop': {
          this._glide(t, 240 * p, 120 * p, 0.12, 0.3 * v, 'sine', this.sfxBus, 0.05);
          this._noise(t, 0.08, 0.12 * v, 'lowpass', 500, 0.7);
          I('marimba', 60, 0.01, 0.3, 0.25, 0.7);
          break;
        }
        case 'snap': {
          this._noise(t, 0.018, 0.25 * v, 'highpass', 3000, 0.8);
          const base = 72 + (opts.step || 0) * 2;
          I('marimba', base, 0, 0.5); I('marimba', base + 4, 0.06, 0.45); I('marimba', base + 7, 0.12, 0.45, 0.45, 1.3);
          I('bell', base + 24, 0.13, 0.12, 0.6);
          this._duckMusic(0.55, 0.3);
          break;
        }
        case 'wrong': {
          // soft friendly "boing": a wobbling triangle sliding down, low-passed
          const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(), out = this._out(this.sfxBus, 0.2);
          o.type = 'triangle'; o.frequency.setValueAtTime(340 * p, t); o.frequency.exponentialRampToValueAtTime(200 * p, t + 0.42);
          lfo.frequency.setValueAtTime(11, t); lfo.frequency.linearRampToValueAtTime(6, t + 0.45);
          lg.gain.setValueAtTime(8, t); lg.gain.linearRampToValueAtTime(34, t + 0.45);
          lfo.connect(lg).connect(o.frequency);
          lp.type = 'lowpass'; lp.frequency.value = 1100;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28 * v, t + 0.02); g.gain.setValueAtTime(0.28 * v, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
          o.connect(lp).connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55);
          this._glide(t, 170 * p, 110 * p, 0.3, 0.12 * v, 'sine', this.sfxBus, 0);
          break;
        }
        case 'whoosh': {
          const n = this._noise(t, 0.42, 0.22 * v, 'bandpass', 400, 1.4);
          n.f.frequency.setValueAtTime(350, t); n.f.frequency.exponentialRampToValueAtTime(2600, t + 0.18); n.f.frequency.exponentialRampToValueAtTime(700, t + 0.4);
          n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(0, t); n.g.gain.linearRampToValueAtTime(0.22 * v, t + 0.15); n.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
          break;
        }
        case 'sparkle': {
          const sc = [96, 98, 100, 103, 105, 108];
          for (let i = 0; i < 5; i++) I('bell', sc[(Math.random() * sc.length) | 0] - 12, i * 0.05 + R(0, 0.015), 0.13 - i * 0.015, 0.6, 0.6);
          break;
        }
        case 'star': {
          const i = Math.max(0, Math.min(4, opts.i ?? opts.step ?? 0)), base = [76, 79, 84, 88, 91][i];
          I('musicbox', base, 0, 0.42); I('musicbox', base + 4, 0.07, 0.38); I('musicbox', base + 7, 0.14, 0.42, 0.5, 1.4);
          I('bell', base + 19, 0.16, 0.1, 0.7);
          this._noise(t + 0.12, 0.3, 0.035 * v, 'highpass', 7000, 0.5);
          this._duckMusic(0.4, 0.5);
          break;
        }
        case 'cheer': {
          [72, 76, 79, 84, 88].forEach((m, k) => I('kalimba', m, k * 0.055, 0.38 - k * 0.03, 0.45));
          // two little rising "yay" chirps (no fake voice)
          for (let k = 0; k < 2; k++) {
            const o = this._glide(t + 0.08 + k * 0.16, 620 * p * (1 + k * 0.12), 1050 * p * (1 + k * 0.12), 0.12, 0.08 * v, 'triangle', this.sfxBus, 0.3);
            o.detune.value = R(-15, 15);
          }
          this._duckMusic(0.5, 0.5);
          break;
        }
        case 'pop': {
          this._glide(t, 320 * p, 1300 * p, 0.05, 0.24 * v, 'sine', this.sfxBus, 0.15);
          this._noise(t, 0.02, 0.06 * v, 'highpass', 2500, 1);
          break;
        }
        case 'giggle': {
          // playful chirps that tumble downward, each with a pitch hiccup + vibrato
          const n = 6 + ((Math.random() * 3) | 0); let f = R(820, 980) * p;
          for (let k = 0; k < n; k++) {
            const st = t + k * R(0.085, 0.115), o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(), out = this._out(this.sfxBus, 0.25);
            o.type = 'triangle';
            o.frequency.setValueAtTime(f * 0.85, st); o.frequency.exponentialRampToValueAtTime(f * 1.3, st + 0.035); o.frequency.exponentialRampToValueAtTime(f * 0.9, st + 0.08);
            bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
            const vol = (0.16 - k * 0.012) * v;
            g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(vol, st + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.09);
            o.connect(bp).connect(g).connect(out); o.start(st); o.stop(st + 0.12);
            f *= R(0.92, 0.98);
          }
          break;
        }
        case 'win': {
          // fanfare: G C E G ... big C chord, with bass and sparkles
          [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36]].forEach(([m, d]) => { I('marimba', m, d, 0.45); I('musicbox', m + 12, d, 0.18, 0.5); });
          [72, 76, 79, 84].forEach(m => { I('musicbox', m, 0.52, 0.32, 0.6, 1.6); I('bell', m + 12, 0.54, 0.09, 0.7); });
          this._inst('bass', mtof(48) * p, t + 0.52, 0.5 * v, this.sfxBus, 0.2, 2);
          [96, 100, 103, 108, 103, 108].forEach((m, k) => I('bell', m - 12, 0.7 + k * 0.06, 0.08, 0.7, 0.7));
          this._noise(t + 0.5, 0.9, 0.03 * v, 'highpass', 8000, 0.4);
          this._duckMusic(0.25, 1.4);
          break;
        }
        case 'unlock': {
          [72, 74, 76, 79, 81, 84, 86, 88, 91, 96].forEach((m, k) => I('bell', m, k * 0.035, 0.12 + k * 0.006, 0.6, 0.7));
          [79, 84, 88].forEach(m => I('musicbox', m, 0.4, 0.3, 0.6, 1.5));
          this._duckMusic(0.4, 0.8);
          break;
        }
        default: I('marimba', 79, 0, 0.3);
      }
    } catch (e) { dbg(e); }
  }

  // ---------------- music ----------------
  /** names: 'menu', 'level', 'finale' (alias of menu, brighter), null to stop */
  music(name) {
    if (name && !ARR[name]) name = 'menu';
    if (!this.ready) { this._want = name; return; }
    try {
      if (this.track && this.track.name === name) return;
      const c = this.ctx, t = c.currentTime;
      if (this.track) { const old = this.track; old.out.gain.cancelScheduledValues(t); old.out.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { try { old.out.disconnect(); } catch (e) { dbg(e); } }, 2000); this.track = null; }
      if (!name) { clearInterval(this._timer); this._timer = null; return; }
      const out = c.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(1, t + 1.2); out.connect(this.musicBus);
      const arr = ARR[name];
      this.track = { name, arr, out, step: 0, next: t + 0.15, spb: 60 / arr.bpm / 2 };
      if (!this._timer) this._timer = setInterval(() => this._tick(), 40);
    } catch (e) { dbg(e); }
  }
  _tick() {
    try {
      const tr = this.track; if (!tr || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (tr.next < now - 0.5) tr.next = now + 0.05; // resumed after a pause: don't burst-schedule
      while (tr.next < now + 0.22) {
        if (!this.muted && this.ctx.state === 'running') tr.arr.step(this, tr, tr.step % (LOOP * 2), tr.next);
        tr.step++; tr.next += tr.spb;
      }
    } catch (e) { dbg(e); }
  }
  // music helpers (dest = current track)
  _m(tr, inst, m, t, vel, rev = 0.55, len = 1) { return this._inst(inst, mtof(m), t, vel, tr.out, rev, len); }
  _pad(tr, notes, t, dur, vol) {
    const c = this.ctx, out = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + dur * 0.35); out.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.8); out.gain.linearRampToValueAtTime(0, t + dur + 0.25);
    lp.connect(out); out.connect(tr.out); const s = c.createGain(); s.gain.value = 0.7; out.connect(s); s.connect(this.musicSend);
    for (const m of notes) for (const dt of [-6, 6]) {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.3);
    }
  }
  _shaker(tr, t, vol) { this._noise(t, 0.04, vol, 'highpass', 7000, 0.7, tr.out); }
}

// melody index lookup: step -> [midi, len]
const MEL_AT = {}; { let s = 0; for (const [m, l] of MELODY) { MEL_AT[s] = [m, l]; s += l; } }
const chordAt = s => CHORDS[Math.floor((s % LOOP) / 4)];
const nextChordTone = (m, ch) => { const pcs = ch.map(x => x % 12); for (let k = 1; k <= 12; k++) if (pcs.includes((m + k) % 12)) return m + k; return m + 12; };

const ARR = {
  // gentle music-box lullaby (~64 bpm)
  menu: {
    bpm: 64,
    step(a, tr, s, t) {
      const pass = s >= LOOP ? 1 : 0, ls = s % LOOP, ch = chordAt(ls), mel = MEL_AT[ls];
      if (ls % 4 === 0) a._pad(tr, [ch[0] + 12, ch[1] + 12, ch[2] + 12], t, tr.spb * 4, 0.022);
      if (ls % 8 === 0) a._m(tr, 'bass', ch[0] - 12, t, 0.22, 0.3, 2.2);
      // rocking arpeggio on eighths (root-fifth-third-fifth)
      const arp = [ch[0], ch[2], ch[1] + 12, ch[2]][ls % 4] + 12;
      a._m(tr, 'kalimba', arp, t, ls % 2 ? 0.07 : 0.1, 0.5, 0.9);
      if (mel) {
        const [m, l] = mel;
        if (pass === 0) a._m(tr, 'musicbox', m + 12, t, 0.3, 0.6, l > 2 ? 1.5 : 1);
        else { a._m(tr, 'musicbox', m + 24, t, 0.2, 0.7, 1.2); a._m(tr, 'kalimba', m + 12, t, 0.18, 0.5); if (l > 2) a._m(tr, 'bell', nextChordTone(m + 24, ch), t + tr.spb * 2, 0.06, 0.8); }
      }
    },
  },
  // light playful loop (~104 bpm): marimba melody, oom-pah bass, kalimba stabs, soft shaker
  level: {
    bpm: 104,
    step(a, tr, s, t) {
      const pass = s >= LOOP ? 1 : 0, ls = s % LOOP, ch = chordAt(ls), mel = MEL_AT[ls];
      // bass: root on beats 1 & 3, fifth on 2 & 4
      if (ls % 2 === 0) a._m(tr, 'bass', (ls % 4 === 0 ? ch[0] : ch[2] - 12), t, ls % 4 === 0 ? 0.32 : 0.2, 0.15, 0.6);
      else a._m(tr, 'kalimba', ch[1 + (ls % 4 === 1 ? 0 : 1)] + 12, t, 0.07, 0.35, 0.5);
      a._shaker(tr, t, ls % 2 ? 0.018 : 0.03);
      if (mel) {
        const [m, l] = mel;
        if (pass === 0 || l > 2) a._m(tr, 'marimba', m + 12, t, 0.34, 0.45, l > 2 ? 1.4 : 1);
        else { // variation: quarter -> two eighths (note, next chord tone above)
          a._m(tr, 'marimba', m + 12, t, 0.32, 0.45); a._m(tr, 'marimba', nextChordTone(m + 12, ch), t + tr.spb, 0.24, 0.45, 0.8);
        }
        if (pass === 1 && l > 2) a._m(tr, 'bell', m + 24, t, 0.06, 0.8);
      }
      if (ls === LOOP - 2) a._m(tr, 'bell', 96, t, 0.05, 0.9);
    },
  },
};
ARR.finale = { bpm: 92, step(a, tr, s, t) { ARR.level.step(a, tr, s, t); if (s % 16 === 0) a._m(tr, 'bell', 84 + (s % 32 ? 7 : 0), t, 0.06, 0.9); } };

Audio.prototype.voice = function (text) {
  try {
    if (this.muted || !text || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (!this._voices.length) this._voices = speechSynthesis.getVoices() || [];
    const v = this._voices.find(v => /^id([-_]|$)/i.test(v.lang)) || this._voices.find(v => /indonesia/i.test(v.name));
    if (!v) return; // no Indonesian voice: silently skip
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang || 'id-ID'; u.pitch = 1.3; u.rate = 0.95; u.volume = 1;
    u.onstart = () => { try { if (this.ready) { const g = this.duck.gain, t = this.ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(0.35, t, 0.1); } } catch (e) { dbg(e); } };
    u.onend = u.onerror = () => { try { if (this.ready) this.duck.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4); } catch (e) { dbg(e); } };
    speechSynthesis.speak(u);
  } catch (e) { dbg(e); }
};

export const audio = new Audio();

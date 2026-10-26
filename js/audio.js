import { clamp } from './data.js';

class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.crowdGain = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.started = false;
  }

  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        this.ctx = new Ctx();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.makeNoise();
      this.startCrowd();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  makeNoise() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[i] = last * 1.6;
    }
    this.noiseBuffer = buffer;
  }

  startCrowd() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    this.crowdGain = gain;
    this.crowdSrc = src;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  blip(freq = 620, dur = 0.06, vol = 0.12) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  whistle(long = false) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = long ? 1.3 : 0.55;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.setValueAtTime(0.09, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);

    const vib = ctx.createOscillator();
    vib.frequency.value = 26;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 70;
    vib.connect(vibGain);

    [2180, 2830].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      vibGain.connect(osc.frequency);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
    vib.start(t);
    vib.stop(t + dur + 0.05);
  }

  kick(power = 0.6) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 + power * 700, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08 + power * 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.18);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.14);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.16 + power * 0.1, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  goal() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.crowdGain) {
      this.crowdGain.gain.cancelScheduledValues(t);
      this.crowdGain.gain.setTargetAtTime(0.26, t, 0.15);
      this.crowdGain.gain.setTargetAtTime(0.05, t + 2.4, 0.7);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 2.3);
  }

  crowdHush() {
    if (!this.ctx || !this.crowdGain) return;
    const t = this.ctx.currentTime;
    this.crowdGain.gain.setTargetAtTime(0.02, t, 0.4);
  }

  crowdLift(level = 0.06) {
    if (!this.ctx || !this.crowdGain) return;
    const t = this.ctx.currentTime;
    this.crowdGain.gain.setTargetAtTime(clamp(level, 0, 1), t, 0.5);
  }
}

export const sound = new SoundFX();

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.volume = 0.7
    this.noiseBuffer = null
    this.started = false
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
      return
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.volume
    this.master.connect(this.ctx.destination)
    const length = Math.floor(this.ctx.sampleRate * 1.2)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buffer
    this.started = true
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.master) this.master.gain.value = this.volume
  }

  resume() {
    this.init()
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {})
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0
  }

  noise(duration, { gain = 0.4, filter = 1200, type = 'bandpass', q = 0.8, delay = 0, pan = 0 } = {}) {
    if (!this.ctx) return
    const t = this.now() + delay
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filterNode = this.ctx.createBiquadFilter()
    filterNode.type = type
    filterNode.frequency.value = filter
    filterNode.Q.value = q
    const envelope = this.ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, t)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006)
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null
    if (panner) panner.pan.value = Math.max(-1, Math.min(1, pan))
    src.connect(filterNode)
    filterNode.connect(envelope)
    if (panner) {
      envelope.connect(panner)
      panner.connect(this.master)
    } else {
      envelope.connect(this.master)
    }
    src.start(t)
    src.stop(t + duration + 0.02)
  }

  tone(frequency, duration, { gain = 0.2, type = 'sine', delay = 0, slide = null, pan = 0 } = {}) {
    if (!this.ctx) return
    const t = this.now() + delay
    const osc = this.ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, t)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + duration)
    const envelope = this.ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, t)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null
    if (panner) panner.pan.value = Math.max(-1, Math.min(1, pan))
    osc.connect(envelope)
    if (panner) {
      envelope.connect(panner)
      panner.connect(this.master)
    } else {
      envelope.connect(this.master)
    }
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  shot(kind = 'rifle', pan = 0) {
    this.resume()
    if (!this.ctx) return
    const profiles = {
      rifle: { noise: 0.12, gain: 0.45, filter: 1500, bass: 92, bassGain: 0.34 },
      rifleHeavy: { noise: 0.16, gain: 0.55, filter: 1050, bass: 68, bassGain: 0.42 },
      smg: { noise: 0.08, gain: 0.3, filter: 2100, bass: 128, bassGain: 0.2 },
      sniper: { noise: 0.34, gain: 0.7, filter: 780, bass: 52, bassGain: 0.55 },
      pistol: { noise: 0.1, gain: 0.35, filter: 1800, bass: 112, bassGain: 0.24 },
      enemy: { noise: 0.1, gain: 0.16, filter: 1300, bass: 84, bassGain: 0.1 }
    }
    const p = profiles[kind] || profiles.rifle
    this.noise(p.noise, { gain: p.gain, filter: p.filter, q: 1.1, pan })
    this.tone(p.bass, p.noise + 0.05, { gain: p.bassGain, type: 'triangle', slide: p.bass * 0.5, pan })
    this.noise(0.03, { gain: p.gain * 0.4, filter: 5200, type: 'highpass', pan })
  }

  dryFire() {
    this.resume()
    this.tone(880, 0.04, { gain: 0.05, type: 'square' })
  }

  reload() {
    this.resume()
    this.noise(0.05, { gain: 0.11, filter: 2100, q: 3 })
    this.noise(0.06, { gain: 0.1, filter: 1200, q: 3, delay: 0.22 })
    this.noise(0.07, { gain: 0.14, filter: 2600, q: 2.4, delay: 0.52 })
  }

  swap() {
    this.resume()
    this.noise(0.05, { gain: 0.09, filter: 1600, q: 2 })
    this.noise(0.05, { gain: 0.08, filter: 900, q: 2, delay: 0.09 })
  }

  hit(headshot = false) {
    this.resume()
    this.tone(headshot ? 1400 : 1050, 0.05, { gain: 0.09, type: 'square' })
    if (headshot) this.tone(1900, 0.08, { gain: 0.05, type: 'sine', delay: 0.02 })
  }

  kill() {
    this.resume()
    this.tone(660, 0.08, { gain: 0.09, type: 'triangle' })
    this.tone(990, 0.1, { gain: 0.08, type: 'triangle', delay: 0.07 })
  }

  hurt() {
    this.resume()
    this.noise(0.18, { gain: 0.22, filter: 300, q: 0.7 })
    this.tone(70, 0.22, { gain: 0.18, type: 'sine', slide: 40 })
  }

  footsteps(sprint = false) {
    this.resume()
    this.noise(0.055, { gain: sprint ? 0.075 : 0.045, filter: 480 + Math.random() * 200, q: 1.2 })
  }

  explosion(pan = 0) {
    this.resume()
    this.noise(0.55, { gain: 0.7, filter: 260, q: 0.6, pan })
    this.tone(60, 0.6, { gain: 0.5, type: 'sine', slide: 28, pan })
    this.noise(0.2, { gain: 0.28, filter: 1800, q: 0.7, pan })
  }

  uav() {
    this.resume()
    this.tone(520, 0.12, { gain: 0.08, type: 'sine' })
    this.tone(780, 0.14, { gain: 0.08, type: 'sine', delay: 0.13 })
    this.tone(1040, 0.22, { gain: 0.07, type: 'sine', delay: 0.28 })
  }

  flash() {
    this.resume()
    this.noise(0.3, { gain: 0.42, filter: 3200, type: 'highpass' })
    this.tone(2200, 0.4, { gain: 0.08, type: 'sine', slide: 4600 })
  }

  spawn() {
    this.resume()
    this.tone(330, 0.2, { gain: 0.06, type: 'triangle', slide: 520 })
    this.tone(660, 0.18, { gain: 0.04, type: 'triangle', delay: 0.08 })
  }

  countdown(go = false) {
    this.resume()
    this.tone(go ? 880 : 520, go ? 0.24 : 0.1, { gain: 0.07, type: 'square' })
  }
}

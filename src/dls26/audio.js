export class MatchAudio {
  constructor() {
    this.context = null
    this.master = null
    this.crowdGain = null
    this.crowdSource = null
    this.volume = 0.7
    this.muted = false
  }

  ensure() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext
      if (!Context) return null
      this.context = new Context()
      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') this.context.resume()
    return this.context
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
  }

  setMuted(value) {
    this.muted = value
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
  }

  noiseBuffer(seconds = 2) {
    const context = this.ensure()
    if (!context) return null
    const length = Math.floor(context.sampleRate * seconds)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1
    }
    return buffer
  }

  tone({ frequency = 220, endFrequency = frequency, duration = 0.2, gain = 0.08, type = 'sine', delay = 0 }) {
    const context = this.ensure()
    if (!context) return
    const now = context.currentTime + delay
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration)
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(envelope)
    envelope.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.05)
  }

  burst({ duration = 0.2, gain = 0.1, frequency = 800, q = 1.2, delay = 0 }) {
    const context = this.ensure()
    if (!context) return
    const buffer = this.noiseBuffer(duration + 0.1)
    if (!buffer) return
    const now = context.currentTime + delay
    const source = context.createBufferSource()
    source.buffer = buffer
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(gain, now)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(this.master)
    source.start(now)
    source.stop(now + duration + 0.05)
  }

  startCrowd() {
    const context = this.ensure()
    if (!context || this.crowdSource) return
    const buffer = this.noiseBuffer(4)
    if (!buffer) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 420
    filter.Q.value = 0.55
    const gain = context.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(0.055, context.currentTime + 1.2)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start()
    this.crowdSource = source
    this.crowdGain = gain
  }

  stopCrowd() {
    if (this.crowdSource) {
      try {
        this.crowdSource.stop()
      } catch {
        /* already stopped */
      }
      this.crowdSource.disconnect()
      this.crowdSource = null
    }
    if (this.crowdGain) {
      this.crowdGain.disconnect()
      this.crowdGain = null
    }
  }

  kick() {
    this.tone({ frequency: 160, endFrequency: 48, duration: 0.16, gain: 0.18, type: 'triangle' })
    this.burst({ duration: 0.08, gain: 0.09, frequency: 1200, q: 0.8 })
  }

  pass() {
    this.tone({ frequency: 220, endFrequency: 90, duration: 0.08, gain: 0.07, type: 'triangle' })
  }

  tackle() {
    this.burst({ duration: 0.18, gain: 0.1, frequency: 320, q: 0.9 })
    this.tone({ frequency: 90, endFrequency: 45, duration: 0.18, gain: 0.1, type: 'sine' })
  }

  whistle(long = false) {
    const duration = long ? 0.7 : 0.32
    this.tone({ frequency: 2650, endFrequency: 2380, duration, gain: 0.045, type: 'square' })
    this.tone({ frequency: 3100, endFrequency: 2720, duration, gain: 0.035, type: 'sine' })
    this.tone({ frequency: 2780, endFrequency: 2500, duration, gain: 0.03, type: 'sine', delay: 0.12 })
  }

  goal() {
    this.whistle(false)
    this.burst({ duration: 1.5, gain: 0.22, frequency: 700, q: 0.6 })
    this.burst({ duration: 1.2, gain: 0.15, frequency: 1800, q: 0.4, delay: 0.1 })
    this.tone({ frequency: 392, endFrequency: 392, duration: 0.7, gain: 0.05, type: 'sawtooth' })
    this.tone({ frequency: 523, endFrequency: 523, duration: 0.9, gain: 0.04, type: 'triangle', delay: 0.08 })
    this.tone({ frequency: 659, endFrequency: 659, duration: 1.1, gain: 0.035, type: 'triangle', delay: 0.16 })
  }

  save() {
    this.burst({ duration: 0.2, gain: 0.1, frequency: 900, q: 0.5 })
    this.tone({ frequency: 130, endFrequency: 70, duration: 0.2, gain: 0.07, type: 'sine' })
  }

  fullTime() {
    this.whistle(true)
    this.tone({ frequency: 196, endFrequency: 196, duration: 0.5, gain: 0.05, type: 'triangle', delay: 0.5 })
    this.tone({ frequency: 262, endFrequency: 262, duration: 0.7, gain: 0.05, type: 'triangle', delay: 0.6 })
  }

  ui() {
    this.tone({ frequency: 520, endFrequency: 420, duration: 0.05, gain: 0.035, type: 'square' })
  }
}

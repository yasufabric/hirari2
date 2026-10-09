import {
  comboFrequency,
  moveTickRatio,
  NEW_BEST_FANFARE_HZ,
  NEW_BEST_FANFARE_STEP_SEC,
} from './sfxNotes'

/**
 * Procedural "strong and cute" SFX. Everything is synthesized with Web Audio; no files.
 *
 * Graph: voices → bus (conservative gain) → soft limiter (compressor) → mute gain → speakers.
 * Each voice is a short envelope whose nodes disconnect themselves when the source ends.
 */

type Wave = OscillatorType

interface ToneOpts {
  type: Wave
  freq: number
  /** Optional end frequency for a pitch glide over `glide` seconds. */
  to?: number
  glide?: number
  peak: number
  attack?: number
  decay: number
  delay?: number
  /** Optional vibrato (Hz rate, Hz depth) for the cute "boing". */
  vibrato?: [number, number]
}

interface NoiseOpts {
  filter: BiquadFilterType
  freq: number
  to?: number
  q?: number
  peak: number
  attack?: number
  decay: number
  delay?: number
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx)
  if (!buffer) {
    const length = Math.floor(ctx.sampleRate * 0.5)
    buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
    noiseBuffers.set(ctx, buffer)
  }
  return buffer
}

function envelope(gain: GainNode, t: number, peak: number, attack: number, decay: number): number {
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return t + attack + decay + 0.02
}

function cleanup(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
  source.onended = () => {
    for (const node of nodes) node.disconnect()
  }
}

export function tone(ctx: BaseAudioContext, out: AudioNode, t0: number, o: ToneOpts): void {
  const t = t0 + (o.delay ?? 0)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = o.type
  osc.frequency.setValueAtTime(o.freq, t)
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide ?? o.decay))
  const end = envelope(gain, t, o.peak, o.attack ?? 0.004, o.decay)
  const nodes: AudioNode[] = [osc, gain]
  if (o.vibrato) {
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = o.vibrato[0]
    depth.gain.value = o.vibrato[1]
    lfo.connect(depth)
    depth.connect(osc.frequency)
    lfo.start(t)
    lfo.stop(end)
    cleanup(lfo, [lfo, depth])
  }
  osc.connect(gain)
  gain.connect(out)
  osc.start(t)
  osc.stop(end)
  cleanup(osc, nodes)
}

export function noise(ctx: BaseAudioContext, out: AudioNode, t0: number, o: NoiseOpts): void {
  const t = t0 + (o.delay ?? 0)
  const src = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = noiseBuffer(ctx)
  filter.type = o.filter
  filter.Q.value = o.q ?? 0.8
  filter.frequency.setValueAtTime(o.freq, t)
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(o.to, t + (o.attack ?? 0.004) + o.decay)
  const end = envelope(gain, t, o.peak, o.attack ?? 0.004, o.decay)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(out)
  src.start(t, Math.random() * 0.2)
  src.stop(end)
  cleanup(src, [src, filter, gain])
}

/** Protein pickup: a round "pop" into a bright chime; pitch climbs with the combo. */
export function voiceCollect(ctx: BaseAudioContext, out: AudioNode, t: number, combo: number): void {
  const f = comboFrequency(combo)
  tone(ctx, out, t, { type: 'sine', freq: f * 0.5, to: f, glide: 0.03, peak: 0.24, attack: 0.003, decay: 0.08 })
  tone(ctx, out, t, { type: 'triangle', freq: f, peak: 0.16, decay: 0.2, delay: 0.03 })
  tone(ctx, out, t, { type: 'sine', freq: f * 2, peak: 0.08, decay: 0.16, delay: 0.035 })
  tone(ctx, out, t, { type: 'sine', freq: f * 3, peak: 0.03, decay: 0.1, delay: 0.04 })
}

/** Hirari (close dodge): airy rising whoosh plus a two-note sparkle. */
export function voiceHirari(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  noise(ctx, out, t, { filter: 'bandpass', freq: 700, to: 3600, q: 1.4, peak: 0.34, attack: 0.04, decay: 0.15 })
  tone(ctx, out, t, { type: 'sine', freq: 1567.98, peak: 0.09, decay: 0.12, delay: 0.06 })
  tone(ctx, out, t, { type: 'sine', freq: 2093, peak: 0.08, decay: 0.16, delay: 0.1 })
}

/** Lane move: a tiny soft "step". Quiet and slightly detuned so spamming stays pleasant. */
export function voiceMove(ctx: BaseAudioContext, out: AudioNode, t: number, random: number): void {
  const f = 420 * moveTickRatio(random)
  tone(ctx, out, t, { type: 'triangle', freq: f, to: f * 0.62, glide: 0.04, peak: 0.07, attack: 0.002, decay: 0.045 })
}

/** Hit / game over: heavy thud + crunch, then a cute descending "boing". */
export function voiceHit(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, t, { type: 'sine', freq: 150, to: 42, glide: 0.2, peak: 0.55, attack: 0.003, decay: 0.26 })
  tone(ctx, out, t, { type: 'square', freq: 110, to: 55, glide: 0.08, peak: 0.1, attack: 0.002, decay: 0.09 })
  noise(ctx, out, t, { filter: 'lowpass', freq: 2400, to: 300, q: 0.7, peak: 0.26, attack: 0.002, decay: 0.14 })
  tone(ctx, out, t, {
    type: 'triangle',
    freq: 620,
    to: 210,
    glide: 0.34,
    peak: 0.2,
    attack: 0.01,
    decay: 0.36,
    delay: 0.1,
    vibrato: [16, 28],
  })
}

/** Start / retry: friendly two-note "ready!" blip. */
export function voiceStart(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  tone(ctx, out, t, { type: 'triangle', freq: 659.25, peak: 0.12, decay: 0.07 })
  tone(ctx, out, t, { type: 'triangle', freq: 987.77, peak: 0.12, decay: 0.12, delay: 0.06 })
}

/** New best: short bright arpeggio that lands on a sparkly top note. */
export function voiceNewBest(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  NEW_BEST_FANFARE_HZ.forEach((freq, i) => {
    const last = i === NEW_BEST_FANFARE_HZ.length - 1
    const delay = i * NEW_BEST_FANFARE_STEP_SEC
    tone(ctx, out, t, { type: 'triangle', freq, peak: last ? 0.14 : 0.11, decay: last ? 0.32 : 0.08, delay })
    tone(ctx, out, t, { type: 'sine', freq: freq * 2, peak: 0.035, decay: last ? 0.22 : 0.06, delay })
  })
}

/** Bus → soft limiter → mute gain. Returns [input, output]. */
export function buildSfxChain(ctx: BaseAudioContext): [GainNode, GainNode] {
  const bus = ctx.createGain()
  bus.gain.value = 0.85
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -3
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.002
  limiter.release.value = 0.12
  const mute = ctx.createGain()
  bus.connect(limiter)
  limiter.connect(mute)
  return [bus, mute]
}

export class Sfx {
  private audio: AudioContext | null = null
  private bus: GainNode | null = null
  private master: GainNode | null = null
  private muted = false
  private lastMoveAt = -1

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyGain()
  }

  /** Call from a user gesture (start/retry) so iOS Safari unlocks the context. */
  start(): void {
    this.play((ctx, out, t) => voiceStart(ctx, out, t))
  }

  collect(combo = 1): void {
    this.play((ctx, out, t) => voiceCollect(ctx, out, t, combo))
  }

  hirari(): void {
    this.play((ctx, out, t) => voiceHirari(ctx, out, t))
  }

  move(): void {
    this.play((ctx, out, t) => {
      // Spam guard: collapse taps closer than 35ms into one tick.
      if (t - this.lastMoveAt < 0.035) return
      this.lastMoveAt = t
      voiceMove(ctx, out, t, Math.random())
    })
  }

  /** Fanfare for a new best; `delay` lets it follow the hit "boing". */
  newBest(delay = 0): void {
    this.play((ctx, out, t) => voiceNewBest(ctx, out, t + delay))
  }

  hit(): void {
    this.play((ctx, out, t) => voiceHit(ctx, out, t))
  }

  private play(voice: (ctx: AudioContext, out: AudioNode, t: number) => void): void {
    const audio = this.ensure()
    if (!audio || !this.bus || this.muted) return
    voice(audio, this.bus, audio.currentTime + 0.005)
  }

  private ensure(): AudioContext | null {
    if (!this.audio) {
      if (typeof AudioContext === 'undefined') return null
      this.audio = new AudioContext()
      const [bus, master] = buildSfxChain(this.audio)
      this.bus = bus
      this.master = master
      master.connect(this.audio.destination)
      this.applyGain()
    }
    if (this.audio.state !== 'running') void this.audio.resume()
    return this.audio
  }

  private applyGain(): void {
    if (!this.audio || !this.master) return
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : 1, this.audio.currentTime, 0.04)
  }
}

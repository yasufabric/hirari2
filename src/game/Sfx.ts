export class Sfx {
  private audio: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false

  setMuted(muted: boolean): void {
    this.muted = muted
    this.applyGain()
  }

  collect(): void {
    this.blip(523.25, 0.07, 0.09)
    this.blip(783.99, 0.09, 0.08, 0.03)
  }

  hirari(): void {
    this.blip(659.25, 0.06, 0.07)
    this.blip(987.77, 0.1, 0.06, 0.04)
  }

  hit(): void {
    const audio = this.ensure()
    if (!audio || !this.master) return
    const now = audio.currentTime

    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + 0.2)

    const bufferSize = audio.sampleRate * 0.12
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1
    const noise = audio.createBufferSource()
    const noiseGain = audio.createGain()
    noise.buffer = buffer
    noiseGain.gain.setValueAtTime(0.1, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    noise.connect(noiseGain)
    noiseGain.connect(this.master)
    noise.start(now)
  }

  private blip(frequency: number, duration: number, volume: number, delay = 0): void {
    const audio = this.ensure()
    if (!audio || !this.master) return
    const now = audio.currentTime + delay
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'square'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + duration + 0.02)
  }

  private ensure(): AudioContext | null {
    if (!this.audio) {
      this.audio = new AudioContext()
      this.master = this.audio.createGain()
      this.master.connect(this.audio.destination)
      this.applyGain()
    }
    void this.audio.resume()
    return this.audio
  }

  private applyGain(): void {
    if (!this.audio || !this.master) return
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : 1, this.audio.currentTime, 0.04)
  }
}

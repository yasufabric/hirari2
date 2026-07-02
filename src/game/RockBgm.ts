export class RockBgm {
  private audio: AudioContext | null = null
  private master: GainNode | null = null
  private timer: number | null = null
  private step = 0

  start(): void {
    if (!this.audio) {
      this.audio = new AudioContext()
      this.master = this.audio.createGain()
      this.master.gain.value = 0.16
      this.master.connect(this.audio.destination)
    }

    void this.audio.resume()
    if (this.timer !== null) return

    this.step = 0
    this.timer = window.setInterval(() => this.playStep(), 150)
  }

  setDimmed(dimmed: boolean): void {
    if (!this.audio || !this.master) return
    this.master.gain.setTargetAtTime(dimmed ? 0.05 : 0.16, this.audio.currentTime, 0.08)
  }

  private playStep(): void {
    if (!this.audio || !this.master) return

    const now = this.audio.currentTime
    const chord = this.step % 16
    if (chord % 4 === 0) this.playKick(now)
    if (chord % 4 === 2) this.playSnare(now)
    if (chord % 2 === 0) this.playBass(now, [55, 65.41, 73.42, 49][Math.floor(chord / 4)])
    if (chord === 0 || chord === 8) this.playChord(now, chord === 0 ? [220, 277.18, 329.63] : [196, 246.94, 293.66])

    this.step = (this.step + 1) % 16
  }

  private playBass(time: number, frequency: number): void {
    if (!this.audio || !this.master) return
    const osc = this.audio.createOscillator()
    const gain = this.audio.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.08, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(time)
    osc.stop(time + 0.2)
  }

  private playChord(time: number, frequencies: number[]): void {
    if (!this.audio || !this.master) return
    for (const frequency of frequencies) {
      const osc = this.audio.createOscillator()
      const gain = this.audio.createGain()
      osc.type = 'square'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.025, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.42)
      osc.connect(gain)
      gain.connect(this.master)
      osc.start(time)
      osc.stop(time + 0.45)
    }
  }

  private playKick(time: number): void {
    if (!this.audio || !this.master) return
    const osc = this.audio.createOscillator()
    const gain = this.audio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, time)
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
    gain.gain.setValueAtTime(0.22, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(time)
    osc.stop(time + 0.14)
  }

  private playSnare(time: number): void {
    if (!this.audio || !this.master) return
    const bufferSize = this.audio.sampleRate * 0.08
    const buffer = this.audio.createBuffer(1, bufferSize, this.audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1

    const noise = this.audio.createBufferSource()
    const gain = this.audio.createGain()
    noise.buffer = buffer
    gain.gain.setValueAtTime(0.08, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08)
    noise.connect(gain)
    gain.connect(this.master)
    noise.start(time)
  }
}

import {
  BASE_OBSTACLE_SPEED,
  BASE_SPAWN_INTERVAL_MS,
  BEST_SCORE_STORAGE_KEY,
  LANE_COUNT,
  MAX_MUSCLE_LEVEL,
  MIN_SPAWN_INTERVAL_MS,
  MUTE_STORAGE_KEY,
  OBSTACLE_SIZE,
  OBSTACLE_SPEED_GROWTH,
  PLAYER_ABOVE_PADS,
  PLAYER_RADIUS,
  PROTEIN_SPAWN_CHANCE,
  SPAWN_INTERVAL_DECAY_PER_SEC,
} from './config'
import type { GameStatus } from './GameState'
import { Obstacle } from './Obstacle'
import { Player } from './Player'
import { RockBgm } from './RockBgm'
import { Sfx } from './Sfx'
import { attachKeyboard, attachLanePads, attachPlayfieldTap } from './input'
import { BLOOD, CAN, IRON, MAT, MAT_LIT, WHEY, WHEY_DEEP } from './palette'
import {
  hirariPoints,
  isAdjacentHirari,
  muscleRank,
  muscleRankTitle,
  proteinPoints,
  survivalScore,
} from './scoring'

export type GameChrome = {
  hud: HTMLElement
  ready: HTMLElement
  over: HTMLElement
  start: HTMLButtonElement
  restart: HTMLButtonElement
  score: HTMLElement
  best: HTMLElement
  combo: HTMLElement
  muscleFill: HTMLElement
  overScore: HTMLElement
  overRank: HTMLElement
  overHirari: HTMLElement
  hint: HTMLElement
  mute: HTMLButtonElement
  pads: HTMLElement
  padButtons: HTMLButtonElement[]
}

type Ghost = { x: number; y: number; muscle: number; life: number }
type Pop = { x: number; y: number; life: number }
type Floater = { x: number; y: number; life: number; text: string; color: string }

const HITSTOP_SEC = 10 / 60
const HINT_SEC = 2.8
const GHOST_LIFE = 0.18
const POP_LIFE = 0.32
const FLOAT_LIFE = 1.05
const MAT_FLASH_SEC = 0.22
const FLEX_SEC = 0.22

export class Game {
  private ctx: CanvasRenderingContext2D
  private status: GameStatus = 'ready'
  private stunned = false

  private width = 0
  private height = 0
  private dpr = 1
  private laneXPositions: number[] = []
  private playerY = 0

  private player: Player
  private obstacles: Obstacle[] = []
  private bgm = new RockBgm()
  private sfx = new Sfx()

  private score = 0
  private bestScore = 0
  private elapsed = 0
  private spawnTimer = 0
  private lastTs = 0

  private hitstop = 0
  private flash = 0
  private shake = 0
  private matFlashLane = -1
  private matFlash = 0
  private hintLeft = 0
  private reduceMotion = false
  private flex = 0
  private hirariCount = 0
  private proteinCombo = 0
  private newBest = false
  private muted = false

  private ghosts: Ghost[] = []
  private pops: Pop[] = []
  private floaters: Floater[] = []

  constructor(
    private canvas: HTMLCanvasElement,
    private chrome: GameChrome,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context is not available')
    this.ctx = ctx
    const stored = Number(localStorage.getItem(BEST_SCORE_STORAGE_KEY) ?? 0)
    this.bestScore = Number.isFinite(stored) ? stored : 0
    this.muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1'
    this.player = new Player(Math.floor(LANE_COUNT / 2), 0)
    this.applyMute()
  }

  init(): void {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('orientationchange', () => this.resize())
    attachLanePads(this.chrome.pads, (lane) => this.goToLane(lane))
    attachPlayfieldTap(this.canvas, (lane) => this.goToLane(lane))
    attachKeyboard(
      (direction) => this.handleMove(direction),
      () => this.handleConfirm(),
    )
    this.chrome.start.addEventListener('click', () => this.start())
    this.chrome.restart.addEventListener('click', () => this.start())
    this.chrome.mute.addEventListener('click', () => this.toggleMute())
    this.syncChrome()
    requestAnimationFrame(this.loop)
  }

  private handleConfirm(): void {
    if (this.status === 'ready' || this.status === 'gameover') this.start()
  }

  private toggleMute(): void {
    this.muted = !this.muted
    localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? '1' : '0')
    this.applyMute()
    this.syncChrome()
  }

  private applyMute(): void {
    this.bgm.setMuted(this.muted)
    this.sfx.setMuted(this.muted)
  }

  private start(): void {
    if (this.status === 'playing' && !this.stunned) return
    this.reset()
    this.status = 'playing'
    this.stunned = false
    this.hitstop = 0
    this.flash = 0
    this.shake = 0
    this.hintLeft = HINT_SEC
    this.bgm.start()
    this.bgm.setDimmed(false)
    this.applyMute()
    this.chrome.hint.hidden = false
    this.syncChrome()
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width * this.dpr
    this.canvas.height = this.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this.laneXPositions = Array.from(
      { length: LANE_COUNT },
      (_, i) => (this.width * (i + 1)) / (LANE_COUNT + 1),
    )
    const padH = this.chrome.pads.getBoundingClientRect().height
    this.playerY = this.height - padH - PLAYER_ABOVE_PADS
    this.player.displayX = this.laneXPositions[this.player.lane]
  }

  private handleMove(direction: -1 | 1): void {
    this.goToLane(this.player.lane + direction)
  }

  private goToLane(lane: number): void {
    if (this.status !== 'playing' || this.stunned) return
    const next = Math.max(0, Math.min(LANE_COUNT - 1, lane))
    if (next === this.player.lane) return
    this.ghosts.push({
      x: this.player.displayX,
      y: this.playerY,
      muscle: this.player.muscleLevel,
      life: GHOST_LIFE,
    })
    this.player.moveTo(next)
    this.matFlashLane = next
    this.matFlash = MAT_FLASH_SEC
    this.hintLeft = 0
    this.chrome.hint.hidden = true
  }

  private reset(): void {
    this.obstacles = []
    this.score = 0
    this.elapsed = 0
    this.spawnTimer = BASE_SPAWN_INTERVAL_MS
    this.player.lane = Math.floor(LANE_COUNT / 2)
    this.player.displayX = this.laneXPositions[this.player.lane]
    this.player.muscleLevel = 0
    this.ghosts = []
    this.pops = []
    this.floaters = []
    this.matFlash = 0
    this.matFlashLane = -1
    this.flex = 0
    this.hirariCount = 0
    this.proteinCombo = 0
    this.newBest = false
  }

  private loop = (ts: number): void => {
    const dt = this.lastTs === 0 ? 0 : Math.min((ts - this.lastTs) / 1000, 0.1)
    this.lastTs = ts
    this.update(dt)
    this.render()
    this.syncChrome()
    requestAnimationFrame(this.loop)
  }

  private update(dt: number): void {
    this.decayFx(dt)
    if (this.stunned) {
      this.hitstop -= dt
      if (this.hitstop <= 0) {
        this.stunned = false
        this.status = 'gameover'
        this.syncChrome()
      }
      return
    }

    this.player.update(dt, this.laneXPositions)
    if (this.status !== 'playing') return

    this.elapsed += dt
    this.score += survivalScore(dt, this.player.muscleLevel)
    if (this.hintLeft > 0) {
      this.hintLeft -= dt
      if (this.hintLeft <= 0) this.chrome.hint.hidden = true
    }

    const speed = BASE_OBSTACLE_SPEED + this.elapsed * OBSTACLE_SPEED_GROWTH

    this.spawnTimer -= dt * 1000
    if (this.spawnTimer <= 0) {
      this.spawnObstacle()
      const interval = Math.max(
        MIN_SPAWN_INTERVAL_MS,
        BASE_SPAWN_INTERVAL_MS - this.elapsed * SPAWN_INTERVAL_DECAY_PER_SEC,
      )
      this.spawnTimer = interval
    }

    for (const obstacle of this.obstacles) obstacle.update(dt, speed)
    this.checkCollisions()
    this.checkHirari()
    this.dropMissedProtein()
    this.obstacles = this.obstacles.filter((o) => !o.isOffscreen(this.height))
  }

  private decayFx(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 4)
    this.shake = Math.max(0, this.shake - dt * 5)
    this.matFlash = Math.max(0, this.matFlash - dt)
    this.flex = Math.max(0, this.flex - dt)
    this.ghosts = this.ghosts
      .map((g) => ({ ...g, life: g.life - dt }))
      .filter((g) => g.life > 0)
    this.pops = this.pops
      .map((p) => ({ ...p, life: p.life - dt }))
      .filter((p) => p.life > 0)
    this.floaters = this.floaters
      .map((f) => ({ ...f, life: f.life - dt }))
      .filter((f) => f.life > 0)
  }

  private spawnObstacle(): void {
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i)
    const openCount = 1 + Math.floor(Math.random() * (LANE_COUNT - 1))
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[lanes[i], lanes[j]] = [lanes[j], lanes[i]]
    }
    const filledLanes = lanes.slice(0, LANE_COUNT - openCount)
    for (const lane of filledLanes) {
      this.obstacles.push(new Obstacle(lane, -OBSTACLE_SIZE, 'additive'))
    }

    if (Math.random() < PROTEIN_SPAWN_CHANCE) {
      const safeLanes = lanes.slice(LANE_COUNT - openCount)
      const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)]
      this.obstacles.push(new Obstacle(lane, -OBSTACLE_SIZE * 1.8, 'protein'))
    }
  }

  private checkCollisions(): void {
    const hitRange = PLAYER_RADIUS + OBSTACLE_SIZE / 2
    for (const obstacle of this.obstacles) {
      if (obstacle.lane !== this.player.lane) continue
      if (Math.abs(obstacle.y - this.playerY) >= hitRange) continue
      switch (obstacle.kind) {
        case 'protein':
          obstacle.collected = true
          this.proteinCombo += 1
          this.player.muscleLevel = Math.min(MAX_MUSCLE_LEVEL, this.player.muscleLevel + 1)
          {
            const points = proteinPoints(this.player.muscleLevel, this.proteinCombo)
            this.score += points
            this.pops.push({
              x: this.laneXPositions[obstacle.lane],
              y: obstacle.y,
              life: POP_LIFE,
            })
            this.floaters.push({
              x: this.laneXPositions[obstacle.lane],
              y: obstacle.y - 18,
              life: FLOAT_LIFE,
              text: this.proteinCombo > 1 ? `+${points} ×${this.proteinCombo}` : `+${points}`,
              color: CAN,
            })
            this.flex = this.reduceMotion ? 0 : FLEX_SEC
            this.sfx.collect()
          }
          break
        case 'additive':
          this.beginDeath()
          return
        default: {
          const _exhaustive: never = obstacle.kind
          throw new Error(`Unhandled falling item: ${_exhaustive}`)
        }
      }
    }
  }

  private checkHirari(): void {
    if (this.status !== 'playing' || this.stunned) return
    for (const obstacle of this.obstacles) {
      if (obstacle.kind !== 'additive' || obstacle.grazed) continue
      if (obstacle.y <= this.playerY) continue
      obstacle.grazed = true
      if (!isAdjacentHirari(obstacle.lane, this.player.lane, obstacle.y, this.playerY)) continue
      const points = hirariPoints(this.player.muscleLevel)
      this.score += points
      this.hirariCount += 1
      this.floaters.push({
        x: this.laneXPositions[obstacle.lane],
        y: this.playerY - 36,
        life: FLOAT_LIFE,
        text: 'ひらり!',
        color: IRON,
      })
      this.sfx.hirari()
    }
  }

  private dropMissedProtein(): void {
    if (this.status !== 'playing' || this.stunned) return
    for (const obstacle of this.obstacles) {
      if (obstacle.kind !== 'protein' || obstacle.collected) continue
      if (obstacle.y - obstacle.size <= this.height) continue
      this.proteinCombo = 0
    }
  }

  private beginDeath(): void {
    this.stunned = true
    this.hitstop = this.reduceMotion ? 0 : HITSTOP_SEC
    this.flash = this.reduceMotion ? 0.35 : 1
    this.shake = this.reduceMotion ? 0 : 1
    this.chrome.hint.hidden = true
    this.bgm.setDimmed(true)
    this.sfx.hit()
    navigator.vibrate?.(40)
    const finalScore = Math.floor(this.score)
    this.newBest = finalScore > this.bestScore
    if (this.newBest) {
      this.bestScore = finalScore
      localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore))
    }
    if (this.hitstop <= 0) {
      this.stunned = false
      this.status = 'gameover'
      this.syncChrome()
    }
  }

  private matWidth(): number {
    return (this.width / (LANE_COUNT + 1)) * 0.78
  }

  private render(): void {
    const ctx = this.ctx
    let ox = 0
    let oy = 0
    if (!this.reduceMotion && this.shake > 0) {
      const shakeAmt = this.shake * 7
      ox = (Math.random() * 2 - 1) * shakeAmt
      oy = (Math.random() * 2 - 1) * shakeAmt
    }

    ctx.save()
    ctx.setTransform(this.dpr, 0, 0, this.dpr, ox * this.dpr, oy * this.dpr)
    ctx.clearRect(-10, -10, this.width + 20, this.height + 20)

    const sky = ctx.createLinearGradient(0, 0, 0, this.height)
    sky.addColorStop(0, WHEY_DEEP)
    sky.addColorStop(0.45, WHEY)
    sky.addColorStop(1, WHEY)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.strokeStyle = IRON
    ctx.globalAlpha = 0.14
    ctx.lineWidth = 2
    for (let i = 0; i < this.laneXPositions.length; i++) {
      const x = this.laneXPositions[i]
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = IRON
    ctx.globalAlpha = 0.12
    ctx.fillRect(0, 0, this.width, 28)
    ctx.globalAlpha = 1

    this.drawMats(ctx)

    for (const obstacle of this.obstacles) obstacle.draw(ctx, this.laneXPositions)

    const laneHalfPx = this.matWidth() / 2
    for (const ghost of this.ghosts) {
      this.player.draw(ctx, ghost.y, ghost.life / GHOST_LIFE, ghost.x, ghost.muscle, laneHalfPx)
    }

    const bounce =
      this.status === 'playing' && !this.stunned && !this.reduceMotion
        ? Math.sin(this.elapsed * 7) * 3
        : 0
    const flex = this.reduceMotion ? 0 : this.flex / FLEX_SEC
    this.player.draw(
      ctx,
      this.playerY,
      1,
      this.player.displayX,
      this.player.muscleLevel,
      laneHalfPx,
      bounce,
      flex,
    )
    this.drawPops(ctx)
    this.drawFloaters(ctx)

    if (this.flash > 0) {
      ctx.fillStyle = BLOOD
      ctx.globalAlpha = this.flash * 0.38
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }

  private drawMats(ctx: CanvasRenderingContext2D): void {
    const w = this.matWidth()
    const h = 22
    const y = this.playerY + 44
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = this.laneXPositions[i]
      const lit = i === this.player.lane
      const flash = i === this.matFlashLane ? this.matFlash / MAT_FLASH_SEC : 0
      ctx.fillStyle = lit ? MAT_LIT : MAT
      ctx.strokeStyle = IRON
      ctx.lineWidth = lit ? 4 : 2
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 8)
      ctx.fill()
      ctx.stroke()
      if (flash > 0) {
        ctx.fillStyle = `rgba(245, 197, 24, ${0.55 * flash})`
        ctx.fill()
      }
    }
  }

  private drawPops(ctx: CanvasRenderingContext2D): void {
    for (const pop of this.pops) {
      const t = pop.life / POP_LIFE
      ctx.save()
      ctx.translate(pop.x, pop.y)
      ctx.globalAlpha = t
      ctx.strokeStyle = IRON
      ctx.lineWidth = 2
      const r = 10 + (1 - t) * 18
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawFloaters(ctx: CanvasRenderingContext2D): void {
    for (const floater of this.floaters) {
      const t = Math.max(0, floater.life / FLOAT_LIFE)
      ctx.save()
      ctx.globalAlpha = t
      ctx.fillStyle = floater.color
      ctx.font = '700 22px "Dela Gothic One", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(floater.text, floater.x, floater.y - (1 - t) * 28)
      ctx.restore()
    }
  }

  private syncChrome(): void {
    this.chrome.ready.hidden = this.status !== 'ready'
    this.chrome.over.hidden = this.status !== 'gameover'
    this.chrome.hud.hidden = this.status !== 'playing' && !this.stunned
    this.chrome.score.textContent = String(Math.floor(this.score))
    this.chrome.best.textContent = String(this.bestScore)
    this.chrome.combo.hidden = this.proteinCombo < 2
    this.chrome.combo.textContent = `プロテイン ×${this.proteinCombo}`
    this.chrome.muscleFill.style.width = `${(this.player.muscleLevel / MAX_MUSCLE_LEVEL) * 100}%`
    const rank = muscleRankTitle(muscleRank(this.player.muscleLevel))
    this.chrome.overRank.textContent = rank
    const bestBit = this.newBest ? `いちばん 更新 ${this.bestScore}` : `いちばん ${this.bestScore}`
    this.chrome.overScore.textContent = `今回 ${Math.floor(this.score)}  /  ${bestBit}`
    this.chrome.overHirari.textContent = `ひらり ${this.hirariCount}かい`
    this.chrome.mute.setAttribute('aria-pressed', this.muted ? 'true' : 'false')
    this.chrome.mute.textContent = this.muted ? 'ミュート' : 'おと'
    this.chrome.mute.setAttribute('aria-label', this.muted ? '音を出す' : '音を消す')
    for (const button of this.chrome.padButtons) {
      const current = Number(button.dataset.lane) === this.player.lane
      button.setAttribute('aria-current', current ? 'true' : 'false')
    }
  }
}

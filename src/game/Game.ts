import {
  BASE_OBSTACLE_SPEED,
  BASE_SPAWN_INTERVAL_MS,
  BEST_SCORE_STORAGE_KEY,
  LANE_COUNT,
  MAX_MUSCLE_LEVEL,
  MIN_SPAWN_INTERVAL_MS,
  OBSTACLE_SIZE,
  OBSTACLE_SPEED_GROWTH,
  PLAYER_RADIUS,
  PLAYER_Y_RATIO,
  PROTEIN_SCORE,
  PROTEIN_SPAWN_CHANCE,
  SCORE_PER_SECOND,
  SPAWN_INTERVAL_DECAY_PER_SEC,
} from './config'
import type { GameStatus } from './GameState'
import { Obstacle } from './Obstacle'
import { Player } from './Player'
import { RockBgm } from './RockBgm'
import { attachSwipe } from './input'
import { BLOOD, IRON, MAT, MAT_LIT, WHEY, WHEY_DEEP } from './palette'

export type GameChrome = {
  hud: HTMLElement
  ready: HTMLElement
  over: HTMLElement
  start: HTMLButtonElement
  restart: HTMLButtonElement
  score: HTMLElement
  best: HTMLElement
  muscleFill: HTMLElement
  overScore: HTMLElement
  hint: HTMLElement
}

type Ghost = { x: number; y: number; muscle: number; life: number }
type Pop = { x: number; y: number; life: number }

const HITSTOP_SEC = 10 / 60
const HINT_SEC = 2.8
const GHOST_LIFE = 0.18
const POP_LIFE = 0.32
const MAT_FLASH_SEC = 0.22

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

  private ghosts: Ghost[] = []
  private pops: Pop[] = []

  constructor(
    private canvas: HTMLCanvasElement,
    private chrome: GameChrome,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context is not available')
    this.ctx = ctx
    const stored = Number(localStorage.getItem(BEST_SCORE_STORAGE_KEY) ?? 0)
    this.bestScore = Number.isFinite(stored) ? stored : 0
    this.player = new Player(Math.floor(LANE_COUNT / 2), 0)
  }

  init(): void {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('orientationchange', () => this.resize())
    attachSwipe(this.canvas, (direction) => this.handleMove(direction))
    this.chrome.start.addEventListener('click', () => this.start())
    this.chrome.restart.addEventListener('click', () => this.start())
    this.syncChrome()
    requestAnimationFrame(this.loop)
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
    this.playerY = this.height * PLAYER_Y_RATIO
    this.player.displayX = this.laneXPositions[this.player.lane]
  }

  private handleMove(direction: -1 | 1): void {
    if (this.status !== 'playing' || this.stunned) return
    const next = Math.max(0, Math.min(LANE_COUNT - 1, this.player.lane + direction))
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
    this.matFlash = 0
    this.matFlashLane = -1
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
    this.score += dt * SCORE_PER_SECOND
    if (this.hintLeft > 0) this.hintLeft -= dt

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
    this.obstacles = this.obstacles.filter((o) => !o.isOffscreen(this.height))

    this.checkCollisions()
    this.obstacles = this.obstacles.filter((o) => !o.isOffscreen(this.height))
  }

  private decayFx(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 4)
    this.shake = Math.max(0, this.shake - dt * 5)
    this.matFlash = Math.max(0, this.matFlash - dt)
    this.ghosts = this.ghosts
      .map((g) => ({ ...g, life: g.life - dt }))
      .filter((g) => g.life > 0)
    this.pops = this.pops
      .map((p) => ({ ...p, life: p.life - dt }))
      .filter((p) => p.life > 0)
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
      if (Math.abs(obstacle.y - this.playerY) < hitRange) {
        if (obstacle.kind === 'protein') {
          obstacle.collected = true
          this.score += PROTEIN_SCORE
          this.player.muscleLevel = Math.min(MAX_MUSCLE_LEVEL, this.player.muscleLevel + 1)
          this.pops.push({
            x: this.laneXPositions[obstacle.lane],
            y: obstacle.y,
            life: POP_LIFE,
          })
          continue
        }
        this.beginDeath()
        return
      }
    }
  }

  private beginDeath(): void {
    this.stunned = true
    this.hitstop = this.reduceMotion ? 0 : HITSTOP_SEC
    this.flash = this.reduceMotion ? 0.35 : 1
    this.shake = this.reduceMotion ? 0 : 1
    this.bgm.setDimmed(true)
    navigator.vibrate?.(40)
    const finalScore = Math.floor(this.score)
    if (finalScore > this.bestScore) {
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
    const shakeAmt = this.shake * 7
    const ox = this.reduceMotion ? 0 : (Math.random() * 2 - 1) * shakeAmt
    const oy = this.reduceMotion ? 0 : (Math.random() * 2 - 1) * shakeAmt

    ctx.save()
    ctx.setTransform(this.dpr, 0, 0, this.dpr, ox * this.dpr, oy * this.dpr)
    ctx.clearRect(-10, -10, this.width + 20, this.height + 20)

    const sky = ctx.createLinearGradient(0, 0, 0, this.height)
    sky.addColorStop(0, WHEY_DEEP)
    sky.addColorStop(0.45, WHEY)
    sky.addColorStop(1, WHEY)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = IRON
    ctx.globalAlpha = 0.12
    ctx.fillRect(0, 0, this.width, 28)
    ctx.globalAlpha = 1

    this.drawMats(ctx)

    for (const obstacle of this.obstacles) obstacle.draw(ctx, this.laneXPositions)

    for (const ghost of this.ghosts) {
      this.player.draw(ctx, ghost.y, ghost.life / GHOST_LIFE, ghost.x, ghost.muscle)
    }

    this.player.draw(ctx, this.playerY)
    this.drawPops(ctx)

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
    const h = 26
    const y = this.playerY + 28
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

  private syncChrome(): void {
    const playing = this.status === 'playing' && !this.stunned
    this.chrome.ready.hidden = this.status !== 'ready'
    this.chrome.over.hidden = this.status !== 'gameover'
    this.chrome.hud.hidden = this.status !== 'playing' && !this.stunned
    this.chrome.hint.hidden = !(playing && this.hintLeft > 0)
    this.chrome.score.textContent = String(Math.floor(this.score))
    this.chrome.best.textContent = String(this.bestScore)
    this.chrome.muscleFill.style.width = `${(this.player.muscleLevel / MAX_MUSCLE_LEVEL) * 100}%`
    this.chrome.overScore.textContent = `今回 ${Math.floor(this.score)}  /  いちばん ${this.bestScore}`
  }
}

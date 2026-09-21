import {
  BASE_OBSTACLE_SPEED,
  BASE_SPAWN_INTERVAL_MS,
  BEST_SCORE_STORAGE_KEY,
  LANE_COUNT,
  MAX_MUSCLE_LEVEL,
  MIN_SPAWN_INTERVAL_MS,
  MAT_HEIGHT,
  MUTE_STORAGE_KEY,
  OBSTACLE_SIZE,
  OBSTACLE_SPEED_GROWTH,
  PLAYER_RADIUS,
  PROTEIN_SPAWN_CHANCE,
  SPAWN_INTERVAL_DECAY_PER_SEC,
} from './config'
import { canControlPlayer, canTogglePause, type GameStatus } from './GameState'
import { matTopY, padObstruction, playerStandY, stageBox } from './layout'
import { Obstacle } from './Obstacle'
import { Player, playerDrawScale } from './Player'
import { RockBgm } from './RockBgm'
import { Sfx } from './Sfx'
import { attachKeyboard, attachLanePads, attachPlayfieldTap } from './input'
import { BLOOD, HAZARD, IRON, MAT, MAT_LIT, WARNING, WHEY, WHEY_DEEP } from './palette'
import {
  hirariPoints,
  isAdjacentHirari,
  muscleRank,
  muscleRankTitle,
  proteinHudTick,
  proteinPoints,
  survivalScore,
} from './scoring'

export type GameChrome = {
  hud: HTMLElement
  ready: HTMLElement
  over: HTMLElement
  paused: HTMLElement
  start: HTMLButtonElement
  restart: HTMLButtonElement
  resume: HTMLButtonElement
  score: HTMLElement
  scoreTick: HTMLElement
  best: HTMLElement
  combo: HTMLElement
  muscleFill: HTMLElement
  overScore: HTMLElement
  overRank: HTMLElement
  overHirari: HTMLElement
  hint: HTMLElement
  mute: HTMLButtonElement
  pause: HTMLButtonElement
  pads: HTMLElement
  padButtons: HTMLButtonElement[]
}

type Ghost = { x: number; y: number; muscle: number; life: number }
type Pop = { x: number; y: number; life: number }
type Spark = { x: number; y: number; vx: number; vy: number; life: number }

const HITSTOP_SEC = 10 / 60
const GHOST_LIFE = 0.18
const POP_LIFE = 0.32
const SPARK_LIFE = 0.28
const SCORE_TICK_SEC = 0.55
const MAT_FLASH_SEC = 0.22
const FLEX_SEC = 0.22
const WARN_DISTANCE = 280

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
  private reduceMotion = false
  private flex = 0
  private hirariCount = 0
  private proteinCombo = 0
  private newBest = false
  private muted = false
  private paused = false
  private scoreTick = ''
  private scoreTickLeft = 0

  private ghosts: Ghost[] = []
  private pops: Pop[] = []
  private sparks: Spark[] = []

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
    window.addEventListener('orientationchange', () => {
      this.resize()
      requestAnimationFrame(() => this.resize())
    })
    window.visualViewport?.addEventListener('resize', () => this.resize())
    window.visualViewport?.addEventListener('scroll', () => this.resize())
    attachLanePads(this.chrome.pads, (lane) => this.goToLane(lane))
    attachPlayfieldTap(
      this.canvas,
      (lane) => this.goToLane(lane),
      (direction) => this.handleMove(direction),
    )
    attachKeyboard(
      (direction) => this.handleMove(direction),
      () => this.handleConfirm(),
    )
    this.chrome.start.addEventListener('click', () => this.start())
    this.chrome.restart.addEventListener('click', () => this.start())
    this.chrome.mute.addEventListener('click', () => this.toggleMute())
    this.chrome.pause.addEventListener('click', () => this.togglePause())
    this.chrome.resume.addEventListener('click', () => this.setPaused(false))
    this.syncChrome()
    requestAnimationFrame(this.loop)
  }

  private handleConfirm(): void {
    switch (this.status) {
      case 'ready':
      case 'gameover':
        this.start()
        return
      case 'playing':
        if (this.paused) this.setPaused(false)
        return
      default: {
        const _exhaustive: never = this.status
        throw new Error(`Unhandled game status: ${_exhaustive}`)
      }
    }
  }

  private togglePause(): void {
    if (!canTogglePause(this.status, this.stunned)) return
    this.setPaused(!this.paused)
  }

  private setPaused(paused: boolean): void {
    if (paused && !canTogglePause(this.status, this.stunned)) return
    this.paused = paused
    this.bgm.setDimmed(paused)
    this.syncChrome()
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
    this.paused = false
    this.hitstop = 0
    this.flash = 0
    this.shake = 0
    this.bgm.start()
    this.bgm.setDimmed(false)
    this.applyMute()
    this.chrome.hint.hidden = true
    this.syncChrome()
  }

  private resize(): void {
    const frame = stageBox(window)
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = frame.width
    this.height = frame.height
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    const stage = this.canvas.parentElement
    if (stage) {
      stage.style.top = `${frame.offsetTop}px`
      stage.style.left = `${frame.offsetLeft}px`
      stage.style.width = `${this.width}px`
      stage.style.height = `${this.height}px`
    }

    this.laneXPositions = Array.from(
      { length: LANE_COUNT },
      (_, i) => (this.width * (i + 1)) / (LANE_COUNT + 1),
    )
    const padsTop = this.chrome.pads.getBoundingClientRect().top - frame.offsetTop
    const padH = padObstruction(this.height, padsTop)
    this.playerY = playerStandY(this.height, padH, playerDrawScale(this.laneHalfPx()))
    this.player.displayX = this.laneXPositions[this.player.lane]
  }

  private handleMove(direction: -1 | 1): void {
    this.goToLane(this.player.lane + direction)
  }

  private goToLane(lane: number): void {
    if (!canControlPlayer(this.status, this.stunned, this.paused)) return
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
    this.sparks = []
    this.scoreTick = ''
    this.scoreTickLeft = 0
    this.clearScoreHudFx()
    this.matFlash = 0
    this.matFlashLane = -1
    this.flex = 0
    this.hirariCount = 0
    this.proteinCombo = 0
    this.newBest = false
    this.paused = false
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
    if (this.paused) return
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
    this.scoreTickLeft = Math.max(0, this.scoreTickLeft - dt)
    if (this.scoreTickLeft <= 0 && this.scoreTick) {
      this.scoreTick = ''
      this.clearScoreHudFx()
    }
    this.sparks = this.sparks
      .map((s) => ({
        ...s,
        life: s.life - dt,
        x: s.x + s.vx * dt,
        y: s.y + s.vy * dt,
      }))
      .filter((s) => s.life > 0)
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
            this.flashScoreHud(proteinHudTick(points))
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
      this.spawnHirariSparks(this.laneXPositions[obstacle.lane], this.playerY - 8)
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

  private laneHalfPx(): number {
    return this.matWidth() / 2
  }

  private spawnHirariSparks(x: number, y: number): void {
    if (this.reduceMotion) {
      this.pops.push({ x, y, life: POP_LIFE * 0.55 })
      return
    }
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.4
      const speed = 70 + Math.random() * 46
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 28,
        life: SPARK_LIFE,
      })
    }
  }

  private render(): void {
    const ctx = this.ctx
    let ox = 0
    let oy = 0
    if (!this.reduceMotion && this.shake > 0) {
      const shakeAmt = this.shake * 4
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
    ctx.globalAlpha = 0.1
    ctx.lineWidth = 1.5
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

    this.drawLaneWarnings(ctx)
    this.drawMats(ctx)

    for (const obstacle of this.obstacles) obstacle.draw(ctx, this.laneXPositions)

    const laneHalfPx = this.laneHalfPx()
    for (const ghost of this.ghosts) {
      this.player.draw(ctx, ghost.y, ghost.life / GHOST_LIFE, ghost.x, ghost.muscle, laneHalfPx)
    }

    const bounce =
      this.status === 'playing' && !this.stunned && !this.paused && !this.reduceMotion
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
    this.drawSparks(ctx)

    if (this.flash > 0) {
      ctx.fillStyle = BLOOD
      ctx.globalAlpha = this.flash * 0.2
      ctx.fillRect(0, 0, this.width, this.height)
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }

  private approachWarn(obstacle: Obstacle): number {
    if (obstacle.kind !== 'additive' || obstacle.collected) return 0
    if (obstacle.y >= this.playerY) return 0
    return Math.max(0, 1 - (this.playerY - obstacle.y) / WARN_DISTANCE)
  }

  private drawLaneWarnings(ctx: CanvasRenderingContext2D): void {
    for (const obstacle of this.obstacles) {
      const t = this.approachWarn(obstacle)
      if (t < 0.1) continue
      const x = this.laneXPositions[obstacle.lane]
      const w = this.matWidth() * 0.46
      const top = Math.max(0, obstacle.y)
      const grad = ctx.createLinearGradient(0, top, 0, this.playerY)
      grad.addColorStop(0, 'rgba(214, 58, 34, 0)')
      grad.addColorStop(1, `rgba(214, 58, 34, ${0.1 * t})`)
      ctx.fillStyle = grad
      ctx.fillRect(x - w / 2, top, w, Math.max(0, this.playerY - top))
    }
  }

  private drawMats(ctx: CanvasRenderingContext2D): void {
    const w = this.matWidth()
    const h = MAT_HEIGHT
    const y = matTopY(this.playerY, playerDrawScale(this.laneHalfPx()))
    ctx.strokeStyle = IRON
    ctx.globalAlpha = 0.16
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(this.width, y)
    ctx.stroke()
    ctx.globalAlpha = 1

    for (let i = 0; i < LANE_COUNT; i++) {
      const x = this.laneXPositions[i]
      const lit = i === this.player.lane
      const flash = i === this.matFlashLane ? this.matFlash / MAT_FLASH_SEC : 0
      ctx.fillStyle = lit ? MAT_LIT : MAT
      ctx.strokeStyle = IRON
      ctx.lineWidth = lit ? 3.5 : 2
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y, w, h, 6)
      ctx.fill()
      ctx.stroke()
      if (flash > 0) {
        ctx.fillStyle = `rgba(244, 234, 216, ${0.4 * flash})`
        ctx.fill()
      }
      if (lit) {
        ctx.fillStyle = 'rgba(59, 36, 22, 0.16)'
        ctx.beginPath()
        ctx.ellipse(x, y + 3, 16, 4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    this.drawLandingStamps(ctx, y)
  }

  private drawLandingStamps(ctx: CanvasRenderingContext2D, matTop: number): void {
    for (const obstacle of this.obstacles) {
      const t = this.approachWarn(obstacle)
      if (t < 0.2) continue
      const x = this.laneXPositions[obstacle.lane]
      ctx.save()
      ctx.globalAlpha = 0.14 + 0.22 * t
      ctx.translate(x, matTop + MAT_HEIGHT / 2)
      ctx.scale(0.42 + 0.18 * t, 0.28 + 0.12 * t)
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(12, 0)
      ctx.lineTo(0, 14)
      ctx.lineTo(-12, 0)
      ctx.closePath()
      ctx.fillStyle = HAZARD
      ctx.fill()
      ctx.strokeStyle = IRON
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
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

  private drawSparks(ctx: CanvasRenderingContext2D): void {
    for (const spark of this.sparks) {
      const t = Math.max(0, spark.life / SPARK_LIFE)
      ctx.save()
      ctx.globalAlpha = t
      ctx.fillStyle = WARNING
      ctx.strokeStyle = IRON
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, 2.2 + t * 1.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  private flashScoreHud(text: string): void {
    this.scoreTick = text
    this.scoreTickLeft = SCORE_TICK_SEC
    const score = this.chrome.score
    const tick = this.chrome.scoreTick
    tick.textContent = text
    tick.hidden = false
    score.classList.remove('is-bump')
    tick.classList.remove('is-on')
    void score.offsetWidth
    score.classList.add('is-bump')
    tick.classList.add('is-on')
  }

  private clearScoreHudFx(): void {
    this.chrome.score.classList.remove('is-bump')
    this.chrome.scoreTick.classList.remove('is-on')
  }

  private syncChrome(): void {
    this.chrome.ready.hidden = this.status !== 'ready'
    this.chrome.over.hidden = this.status !== 'gameover'
    this.chrome.paused.hidden = !this.paused
    this.chrome.hud.hidden = this.status !== 'playing' && !this.stunned
    this.chrome.score.textContent = String(Math.floor(this.score))
    this.chrome.scoreTick.textContent = this.scoreTick
    this.chrome.scoreTick.hidden = this.scoreTick.length === 0
    this.chrome.best.textContent = String(this.bestScore)
    this.chrome.combo.hidden = this.proteinCombo < 2
    this.chrome.combo.textContent = `プロテイン ×${this.proteinCombo}`
    this.chrome.muscleFill.style.width = `${(this.player.muscleLevel / MAX_MUSCLE_LEVEL) * 100}%`
    const rank = muscleRankTitle(muscleRank(this.player.muscleLevel))
    this.chrome.overRank.textContent = rank
    const bestBit = this.newBest ? `いちばん 更新 ${this.bestScore}` : `いちばん ${this.bestScore}`
    this.chrome.overScore.textContent = `今回 ${Math.floor(this.score)}  /  ${bestBit}`
    this.chrome.overHirari.textContent = `ひらり ${this.hirariCount}かい`
    this.chrome.pause.hidden = !canTogglePause(this.status, this.stunned) && !this.paused
    this.chrome.pause.setAttribute('aria-pressed', this.paused ? 'true' : 'false')
    this.chrome.pause.textContent = this.paused ? 'つづける' : 'ポーズ'
    this.chrome.pause.setAttribute('aria-label', this.paused ? '再開する' : '一時停止')
    this.chrome.mute.setAttribute('aria-pressed', this.muted ? 'true' : 'false')
    this.chrome.mute.textContent = this.muted ? 'ミュート' : 'おと'
    this.chrome.mute.setAttribute('aria-label', this.muted ? '音を出す' : '音を消す')
    for (const button of this.chrome.padButtons) {
      const current = Number(button.dataset.lane) === this.player.lane
      button.setAttribute('aria-current', current ? 'true' : 'false')
    }
  }
}

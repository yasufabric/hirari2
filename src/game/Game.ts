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
import { attachInput } from './input'

export class Game {
  private ctx: CanvasRenderingContext2D
  private status: GameStatus = 'ready'

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

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context is not available')
    this.ctx = ctx
    this.bestScore = Number(localStorage.getItem(BEST_SCORE_STORAGE_KEY) ?? 0)
    this.player = new Player(Math.floor(LANE_COUNT / 2), 0)
  }

  init(): void {
    this.resize()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('orientationchange', () => this.resize())
    attachInput(
      this.canvas,
      () => this.handleStart(),
      (direction) => this.handleMove(direction),
    )
    requestAnimationFrame(this.loop)
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

  private handleStart(): void {
    if (this.status !== 'playing') {
      this.reset()
      this.status = 'playing'
      this.bgm.start()
      this.bgm.setDimmed(false)
    }
  }

  private handleMove(direction: -1 | 1): void {
    if (this.status !== 'playing') return
    this.player.moveTo(Math.max(0, Math.min(LANE_COUNT - 1, this.player.lane + direction)))
  }

  private reset(): void {
    this.obstacles = []
    this.score = 0
    this.elapsed = 0
    this.spawnTimer = BASE_SPAWN_INTERVAL_MS
    this.player.lane = Math.floor(LANE_COUNT / 2)
    this.player.displayX = this.laneXPositions[this.player.lane]
    this.player.muscleLevel = 0
  }

  private loop = (ts: number): void => {
    const dt = this.lastTs === 0 ? 0 : Math.min((ts - this.lastTs) / 1000, 0.1)
    this.lastTs = ts
    this.update(dt)
    this.render()
    requestAnimationFrame(this.loop)
  }

  private update(dt: number): void {
    this.player.update(dt, this.laneXPositions)
    if (this.status !== 'playing') return

    this.elapsed += dt
    this.score += dt * SCORE_PER_SECOND

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

  private spawnObstacle(): void {
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i)
    const openCount = 1 + Math.floor(Math.random() * (LANE_COUNT - 1))
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[lanes[i], lanes[j]] = [lanes[j], lanes[i]]
    }
    // Always leave at least one lane without additives so the wave stays dodgeable.
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
          continue
        }
        this.gameOver()
        return
      }
    }
  }

  private gameOver(): void {
    this.status = 'gameover'
    this.bgm.setDimmed(true)
    const finalScore = Math.floor(this.score)
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore
      localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore))
    }
  }

  private render(): void {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.22)'
    ctx.lineWidth = 2
    for (const x of this.laneXPositions) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.stroke()
    }

    for (const obstacle of this.obstacles) obstacle.draw(ctx, this.laneXPositions)
    this.player.draw(ctx, this.playerY)

    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`SCORE ${Math.floor(this.score)}`, 16, 16)
    ctx.font = '16px sans-serif'
    ctx.fillText(`BEST ${this.bestScore}`, 16, 52)
    ctx.fillText(`MUSCLE ${this.player.muscleLevel}/${MAX_MUSCLE_LEVEL}`, 16, 76)

    if (this.status === 'ready') {
      this.drawOverlay('マッスルひらり', '横スワイプで添加物をかわしてタンパク質を取れ')
    } else if (this.status === 'gameover') {
      this.drawOverlay(
        'GAME OVER',
        `SCORE ${Math.floor(this.score)}  BEST ${this.bestScore}\n横スワイプでリスタート`,
      )
    }
  }

  private drawOverlay(title: string, subtitle: string): void {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = '#f8fafc'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 42px sans-serif'
    ctx.fillText(title, this.width / 2, this.height / 2 - 24)

    ctx.font = '18px sans-serif'
    const lines = subtitle.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, this.width / 2, this.height / 2 + 24 + i * 28)
    })
  }
}

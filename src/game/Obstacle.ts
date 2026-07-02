import { OBSTACLE_SIZE, PROTEIN_SIZE } from './config'

export type FallingItemKind = 'additive' | 'protein'

export class Obstacle {
  lane: number
  y: number
  size: number
  kind: FallingItemKind
  collected = false

  constructor(lane: number, y: number, kind: FallingItemKind = 'additive') {
    this.lane = lane
    this.y = y
    this.kind = kind
    this.size = kind === 'protein' ? PROTEIN_SIZE : OBSTACLE_SIZE
  }

  update(dt: number, speed: number): void {
    this.y += speed * dt
  }

  isOffscreen(canvasHeight: number): boolean {
    return this.collected || this.y - this.size > canvasHeight
  }

  draw(ctx: CanvasRenderingContext2D, laneXPositions: number[]): void {
    const x = laneXPositions[this.lane]
    const half = this.size / 2
    if (this.kind === 'protein') {
      this.drawProtein(ctx, x, half)
      return
    }
    this.drawAdditive(ctx, x, half)
  }

  private drawAdditive(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    ctx.fillStyle = '#f97316'
    ctx.fillRect(x - half, y - half, this.size, this.size)
    ctx.strokeStyle = '#7f1d1d'
    ctx.lineWidth = 3
    ctx.strokeRect(x - half, y - half, this.size, this.size)

    ctx.fillStyle = '#fff7ed'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('E', x, y - 5)
    ctx.fillText('xxx', x, y + 8)
  }

  private drawProtein(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.roundRect(x - half, y - half, this.size, this.size, 7)
    ctx.fill()

    ctx.fillStyle = '#22c55e'
    ctx.fillRect(x - half + 4, y - 4, this.size - 8, 12)
    ctx.strokeStyle = '#14532d'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#14532d'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('P', x, y + 2)
  }
}

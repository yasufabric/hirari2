import { CAN, CAN_LID, IRON, WARNING } from './palette'
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
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.moveTo(0, -half - 4)
    ctx.lineTo(half + 2, 0)
    ctx.lineTo(0, half + 4)
    ctx.lineTo(-half - 2, 0)
    ctx.closePath()
    ctx.fillStyle = WARNING
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, -half + 6)
    ctx.lineTo(half - 8, 0)
    ctx.lineTo(0, half - 6)
    ctx.lineTo(-half + 8, 0)
    ctx.closePath()
    ctx.fillStyle = IRON
    ctx.fill()
    ctx.restore()
  }

  private drawProtein(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    const w = this.size
    const h = this.size + 8
    ctx.save()
    ctx.translate(x, y)

    ctx.fillStyle = CAN
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 5)
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = CAN_LID
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 7)

    ctx.fillStyle = WARNING
    ctx.fillRect(-w / 2 + 4, -2, w - 8, 8)

    ctx.restore()
  }
}

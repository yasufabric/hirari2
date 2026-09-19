import { CAN, CAN_LID, HAZARD, IRON, WARNING } from './palette'
import { OBSTACLE_SIZE, PROTEIN_SIZE } from './config'

export type FallingItemKind = 'additive' | 'protein'

export class Obstacle {
  lane: number
  y: number
  size: number
  kind: FallingItemKind
  collected = false
  grazed = false

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
    switch (this.kind) {
      case 'protein':
        this.drawProtein(ctx, x, half)
        return
      case 'additive':
        this.drawAdditive(ctx, x, half)
        return
      default: {
        const _exhaustive: never = this.kind
        throw new Error(`Unhandled falling item: ${_exhaustive}`)
      }
    }
  }

  private drawAdditive(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    ctx.save()
    ctx.translate(x, y)
    ctx.shadowColor = 'rgba(59, 36, 22, 0.38)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 5

    ctx.beginPath()
    ctx.moveTo(0, -half - 10)
    ctx.lineTo(half + 9, 0)
    ctx.lineTo(0, half + 10)
    ctx.lineTo(-half - 9, 0)
    ctx.closePath()
    ctx.fillStyle = CAN_LID
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(0, -half - 6)
    ctx.lineTo(half + 5, 0)
    ctx.lineTo(0, half + 6)
    ctx.lineTo(-half - 5, 0)
    ctx.closePath()
    ctx.fillStyle = HAZARD
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = IRON
    ctx.lineWidth = 4.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 1, Math.max(8, half * 0.42), 0, Math.PI * 2)
    ctx.fillStyle = WARNING
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.4
    ctx.stroke()

    ctx.fillStyle = IRON
    ctx.beginPath()
    ctx.roundRect(-2.8, -half * 0.22, 5.6, half * 0.34, 1.8)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, half * 0.28, 2.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawProtein(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    const w = this.size
    const h = this.size + 10
    ctx.save()
    ctx.translate(x, y)
    ctx.shadowColor = 'rgba(59, 36, 22, 0.3)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 4

    ctx.fillStyle = CAN
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 6)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = IRON
    ctx.lineWidth = 3.5
    ctx.stroke()

    ctx.fillStyle = CAN_LID
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 8)
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2
    ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, 8)

    ctx.fillStyle = WARNING
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 4, -3, w - 8, 10, 2)
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = 'rgba(244, 234, 216, 0.35)'
    ctx.fillRect(-w / 2 + 4, -h / 2 + 14, 5, h - 22)

    ctx.restore()
  }
}

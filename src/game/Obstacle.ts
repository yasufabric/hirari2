import { CAN, CAN_LID, HAZARD, IRON } from './palette'
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
    ctx.shadowColor = 'rgba(224, 23, 10, 0.45)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3

    // cream halo for contrast on whey
    ctx.beginPath()
    ctx.moveTo(0, -half - 12)
    ctx.lineTo(half + 11, 0)
    ctx.lineTo(0, half + 12)
    ctx.lineTo(-half - 11, 0)
    ctx.closePath()
    ctx.fillStyle = CAN_LID
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(0, -half - 6)
    ctx.lineTo(half + 6, 0)
    ctx.lineTo(0, half + 6)
    ctx.lineTo(-half - 6, 0)
    ctx.closePath()
    ctx.fillStyle = HAZARD
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = IRON
    ctx.lineWidth = 4.5
    ctx.stroke()

    // bang badge stays cream-on-red for quick read
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-2.8, -half * 0.3, 5.6, half * 0.34, 1.5)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, half * 0.24, 2.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawProtein(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    const w = this.size
    const h = this.size + 12
    ctx.save()
    ctx.translate(x, y)
    ctx.shadowColor = 'rgba(22, 138, 82, 0.4)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3

    // bright rim behind the can so it pops on whey
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 8)
    ctx.fill()

    ctx.fillStyle = CAN
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 7)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.strokeStyle = IRON
    ctx.lineWidth = 4.5
    ctx.stroke()

    ctx.fillStyle = CAN_LID
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 10)
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.5
    ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, 10)

    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 4, -4, w - 8, 12, 2)
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 246, 228, 0.55)'
    ctx.fillRect(-w / 2 + 5, -h / 2 + 16, 6, h - 26)

    ctx.restore()
  }
}

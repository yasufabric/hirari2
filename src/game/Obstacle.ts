import { CAN_LID, GREEN, GREEN_DARK, HAZARD, HAZARD_DARK, INK } from './palette'
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
    const r = half + 6
    ctx.save()
    ctx.translate(x, y)
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(224, 23, 10, 0.45)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3

    // cream halo keeps the diamond off the lane strip and floor
    diamond(ctx, half + 11, half + 12)
    ctx.fillStyle = CAN_LID
    ctx.fill()

    diamond(ctx, r, r)
    ctx.fillStyle = HAZARD
    ctx.fill()
    ctx.shadowColor = 'transparent'

    // flat sticker shading on the lower-right facet
    ctx.save()
    diamond(ctx, r, r)
    ctx.clip()
    ctx.beginPath()
    ctx.moveTo(r, -r)
    ctx.lineTo(r, r)
    ctx.lineTo(-r, r)
    ctx.closePath()
    ctx.fillStyle = HAZARD_DARK
    ctx.fill()
    ctx.restore()

    diamond(ctx, r, r)
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.stroke()

    // little shine on the upper-left facet
    ctx.strokeStyle = 'rgba(255, 246, 228, 0.85)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-r * 0.62, -r * 0.08)
    ctx.lineTo(-r * 0.22, -r * 0.48)
    ctx.stroke()

    // bang badge stays cream-on-red for quick read
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-3, -half * 0.34, 6, half * 0.38, 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, half * 0.26, 3.1, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawProtein(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    const w = half * 2
    const h = w + 12
    ctx.save()
    ctx.translate(x, y)
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(47, 138, 58, 0.4)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3

    // bright rim behind the can so it pops on the cream floor
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 9)
    ctx.fill()

    ctx.fillStyle = GREEN
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 8)
    ctx.fill()
    ctx.shadowColor = 'transparent'

    // flat shading down the right side
    ctx.save()
    ctx.clip()
    ctx.fillStyle = GREEN_DARK
    ctx.fillRect(w / 2 - 10, -h / 2, 10, h)
    ctx.restore()

    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, 8)
    ctx.strokeStyle = INK
    ctx.lineWidth = 4.5
    ctx.stroke()

    // scoop lid
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, 10, 3)
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.5
    ctx.stroke()

    // cream label with a tiny dumbbell
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 4, -4, w - 8, 14, 3)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.fillRect(-8, 2, 16, 2)
    ctx.beginPath()
    ctx.roundRect(-12, -1, 5, 8, 1.5)
    ctx.roundRect(7, -1, 5, 8, 1.5)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 246, 228, 0.6)'
    ctx.beginPath()
    ctx.roundRect(-w / 2 + 6, -10, 4, 4, 2)
    ctx.roundRect(-w / 2 + 6, 14, 4, h / 2 - 19, 2)
    ctx.fill()

    ctx.restore()
  }
}

function diamond(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.moveTo(0, -ry)
  ctx.lineTo(rx, 0)
  ctx.lineTo(0, ry)
  ctx.lineTo(-rx, 0)
  ctx.closePath()
}

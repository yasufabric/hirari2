import {
  BOTTLE,
  BOTTLE_DARK,
  BOTTLE_LID,
  BOTTLE_LID_DARK,
  CAN_LID,
  HAZARD,
  HAZARD_DARK,
  INK,
} from './palette'
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
    ctx.lineCap = 'round'
    ctx.shadowColor = 'rgba(224, 23, 10, 0.45)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3

    // cream halo keeps the diamond off the lane strip and floor
    roundedDiamond(ctx, half + 11, 9)
    ctx.fillStyle = CAN_LID
    ctx.fill()

    roundedDiamond(ctx, r, 7)
    ctx.fillStyle = HAZARD
    ctx.fill()
    ctx.shadowColor = 'transparent'

    // flat sticker shading on the lower-right facet
    ctx.save()
    roundedDiamond(ctx, r, 7)
    ctx.clip()
    ctx.beginPath()
    ctx.moveTo(r, -r)
    ctx.lineTo(r, r)
    ctx.lineTo(-r, r)
    ctx.closePath()
    ctx.fillStyle = HAZARD_DARK
    ctx.fill()
    ctx.restore()

    roundedDiamond(ctx, r, 7)
    ctx.strokeStyle = INK
    ctx.lineWidth = 5
    ctx.stroke()

    // little shine on the upper-left facet
    ctx.strokeStyle = 'rgba(255, 246, 228, 0.8)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-r * 0.6, -r * 0.18)
    ctx.lineTo(-r * 0.34, -r * 0.44)
    ctx.stroke()

    // angry face: white eyes, black pupils, slanted brows, frown
    const ex = 8
    const ey = -1
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(side * ex, ey, 5.2, 5.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = INK
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(side * (ex - 1.6), ey + 1.2, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.lineWidth = 3.4
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * (ex + 6), ey - 9.5)
      ctx.lineTo(side * 2.5, ey - 5)
      ctx.stroke()
    }
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-6.5, 14)
    ctx.quadraticCurveTo(0, 6.5, 6.5, 14)
    ctx.stroke()

    ctx.restore()
  }

  private drawProtein(ctx: CanvasRenderingContext2D, x: number, half: number): void {
    const y = this.y
    const w = half * 2
    const h = w + 12
    const top = -h / 2
    const lidH = 11
    const neckW = w - 8
    const bodyTop = top + lidH - 1
    const bodyH = h / 2 - bodyTop
    ctx.save()
    ctx.translate(x, y)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.shadowColor = 'rgba(31, 111, 224, 0.4)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 3

    // bright rim behind the bottle so it pops on the cream floor
    ctx.fillStyle = CAN_LID
    ctx.beginPath()
    ctx.roundRect(-neckW / 2 - 3, top - 3, neckW + 6, lidH + 6, 6)
    ctx.roundRect(-w / 2 - 3, bodyTop - 3, w + 6, bodyH + 6, 12)
    ctx.fill()
    ctx.shadowColor = 'transparent'

    // tub body
    const body = (): void => {
      ctx.beginPath()
      ctx.roundRect(-w / 2, bodyTop, w, bodyH, 10)
    }
    body()
    ctx.fillStyle = BOTTLE
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = BOTTLE_DARK
    ctx.fillRect(w / 2 - 9, bodyTop, 9, bodyH)
    // two thin green bands
    ctx.fillStyle = BOTTLE_LID
    ctx.fillRect(-w / 2, bodyTop + 6, w, 3)
    ctx.fillRect(-w / 2, h / 2 - 8, w, 3)
    ctx.restore()
    body()
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.stroke()

    // green screw lid
    ctx.beginPath()
    ctx.roundRect(-neckW / 2, top, neckW, lidH, 4)
    ctx.fillStyle = BOTTLE_LID
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = BOTTLE_LID_DARK
    ctx.fillRect(neckW / 2 - 7, top, 7, lidH)
    ctx.restore()
    ctx.strokeStyle = INK
    ctx.lineWidth = 3.5
    ctx.stroke()

    // white flexed bicep (力こぶ): fist up top, forearm, elbow, bulging bicep
    const cy = bodyTop + bodyH / 2 - 3
    ctx.save()
    ctx.translate(-1, cy)
    ctx.strokeStyle = '#FFFFFF'
    ctx.fillStyle = '#FFFFFF'
    ctx.lineWidth = 7.5
    ctx.beginPath()
    ctx.moveTo(-6, -7)
    ctx.lineTo(-8, 5)
    ctx.lineTo(7, 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(-5, -9.5, 4.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(2, 0.5, 7.5, 6.5, -0.15, 0, Math.PI * 2)
    ctx.fill()
    // crease between forearm and bicep
    ctx.strokeStyle = BOTTLE_DARK
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-3.5, -4)
    ctx.quadraticCurveTo(-4.5, 0, -3, 3)
    ctx.stroke()
    ctx.restore()

    // small paw print (肉球)
    ctx.save()
    ctx.translate(w / 2 - 9, h / 2 - 13.5)
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.ellipse(0, 1.4, 2.6, 2.1, 0, 0, Math.PI * 2)
    ctx.fill()
    for (const [tx, ty] of [
      [-2.8, -1.8],
      [-0.9, -3.3],
      [1.1, -3.3],
      [2.9, -1.8],
    ]) {
      ctx.beginPath()
      ctx.arc(tx, ty, 0.95, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    ctx.restore()
  }
}

function roundedDiamond(ctx: CanvasRenderingContext2D, r: number, corner: number): void {
  ctx.beginPath()
  ctx.moveTo(r / 2, -r / 2)
  ctx.arcTo(r, 0, 0, r, corner)
  ctx.arcTo(0, r, -r, 0, corner)
  ctx.arcTo(-r, 0, 0, -r, corner)
  ctx.arcTo(0, -r, r, 0, corner)
  ctx.closePath()
}

import { BODY, BODY_LIGHT, CAN, HAIR, IRON, SHORTS, WARNING } from './palette'
import { MAX_MUSCLE_LEVEL, PLAYER_EASE } from './config'

export class Player {
  lane: number
  displayX: number
  muscleLevel = 0

  constructor(initialLane: number, initialX: number) {
    this.lane = initialLane
    this.displayX = initialX
  }

  moveTo(lane: number): void {
    this.lane = lane
  }

  update(dt: number, laneXPositions: number[]): void {
    const targetX = laneXPositions[this.lane]
    const t = 1 - Math.exp(-PLAYER_EASE * dt)
    this.displayX += (targetX - this.displayX) * t
  }

  draw(
    ctx: CanvasRenderingContext2D,
    y: number,
    alpha = 1,
    atX = this.displayX,
    muscle = this.muscleLevel,
    laneHalfPx: number,
    bounce = 0,
    flex = 0,
  ): void {
    const power = muscle / MAX_MUSCLE_LEVEL
    const shoulder = 24 + power * 16
    const armR = 7 + power * 7
    const chestW = 18 + power * 12
    const reach = shoulder + armR + 10
    const s = Math.min(1, (laneHalfPx - 2) / reach)
    const stretch = 1 + flex * 0.1
    const squash = 1 - flex * 0.05

    ctx.save()
    ctx.translate(atX, y + bounce)
    ctx.scale(s * stretch, s * squash)
    ctx.globalAlpha *= alpha
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    this.drawLegs(ctx, power)
    this.drawShorts(ctx, power)
    this.drawArm(ctx, -1, shoulder, power)
    this.drawArm(ctx, 1, shoulder, power)
    this.drawTorso(ctx, chestW, power)
    this.drawHead(ctx)

    ctx.restore()
  }

  private strokeFill(ctx: CanvasRenderingContext2D, width = 3): void {
    ctx.strokeStyle = IRON
    ctx.lineWidth = width
    ctx.stroke()
  }

  private drawLegs(ctx: CanvasRenderingContext2D, power: number): void {
    ctx.strokeStyle = IRON
    ctx.lineWidth = 12 + power * 4
    ctx.beginPath()
    ctx.moveTo(-11, 26)
    ctx.quadraticCurveTo(-15, 40, -13, 54)
    ctx.moveTo(11, 26)
    ctx.quadraticCurveTo(15, 40, 13, 54)
    ctx.stroke()

    ctx.fillStyle = BODY
    ctx.beginPath()
    ctx.ellipse(-13, 38, 6 + power * 3, 10 + power * 2, -0.15, 0, Math.PI * 2)
    ctx.ellipse(13, 38, 6 + power * 3, 10 + power * 2, 0.15, 0, Math.PI * 2)
    ctx.fill()
    this.strokeFill(ctx, 2.5)

    ctx.strokeStyle = IRON
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(-20, 55)
    ctx.lineTo(-6, 55)
    ctx.moveTo(6, 55)
    ctx.lineTo(20, 55)
    ctx.stroke()
  }

  private drawShorts(ctx: CanvasRenderingContext2D, power: number): void {
    const w = 32 + power * 8
    ctx.fillStyle = SHORTS
    ctx.beginPath()
    ctx.roundRect(-w / 2, 16, w, 16, 5)
    ctx.fill()
    this.strokeFill(ctx, 3)
    ctx.fillStyle = WARNING
    ctx.fillRect(-3, 18, 6, 12)
  }

  private drawArm(
    ctx: CanvasRenderingContext2D,
    side: -1 | 1,
    shoulder: number,
    power: number,
  ): void {
    const sx = side * shoulder
    ctx.fillStyle = BODY
    ctx.beginPath()
    ctx.ellipse(sx, -10, 10 + power * 5, 9 + power * 4, 0, 0, Math.PI * 2)
    ctx.fill()
    this.strokeFill(ctx, 3)

    ctx.fillStyle = BODY_LIGHT
    ctx.beginPath()
    ctx.ellipse(sx + side * (8 + power * 5), 6, 7 + power * 5, 11 + power * 5, side * 0.28, 0, Math.PI * 2)
    ctx.fill()
    this.strokeFill(ctx, 3)

    ctx.fillStyle = BODY
    ctx.beginPath()
    ctx.ellipse(sx + side * (5 + power * 2), 22, 5 + power * 3, 8 + power * 3, side * 0.12, 0, Math.PI * 2)
    ctx.fill()
    this.strokeFill(ctx, 2.5)

    ctx.fillStyle = BODY_LIGHT
    ctx.beginPath()
    ctx.arc(sx + side * (4 + power), 32, 5 + power * 1.5, 0, Math.PI * 2)
    ctx.fill()
    this.strokeFill(ctx, 2.5)
  }

  private drawTorso(ctx: CanvasRenderingContext2D, chestW: number, power: number): void {
    ctx.fillStyle = BODY
    ctx.beginPath()
    ctx.roundRect(-7, -30, 14, 12, 3)
    ctx.fill()
    this.strokeFill(ctx, 2.5)

    ctx.fillStyle = CAN
    ctx.beginPath()
    ctx.roundRect(-chestW, -18, chestW * 2, 38 + power * 3, 10)
    ctx.fill()
    this.strokeFill(ctx, 3.5)

    ctx.fillStyle = CAN
    ctx.fillRect(-chestW + 3, -30, 7, 16)
    ctx.fillRect(chestW - 10, -30, 7, 16)
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.5
    ctx.strokeRect(-chestW + 3, -30, 7, 16)
    ctx.strokeRect(chestW - 10, -30, 7, 16)

    ctx.fillStyle = BODY_LIGHT
    ctx.beginPath()
    ctx.ellipse(-7 - power * 2, -6, 7 + power * 3, 6 + power * 2, -0.2, 0, Math.PI * 2)
    ctx.ellipse(7 + power * 2, -6, 7 + power * 3, 6 + power * 2, 0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = IRON
    ctx.globalAlpha *= 0.35
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 2)
    ctx.lineTo(0, 14)
    ctx.stroke()
    ctx.globalAlpha /= 0.35
  }

  private drawHead(ctx: CanvasRenderingContext2D): void {
    const hy = -42
    const head = 13

    ctx.fillStyle = BODY_LIGHT
    ctx.beginPath()
    ctx.arc(0, hy, head, 0, Math.PI * 2)
    ctx.fill()
    this.strokeFill(ctx, 3)

    ctx.fillStyle = HAIR
    ctx.beginPath()
    ctx.ellipse(0, hy - 5, head - 0.5, 9, 0, Math.PI, 0, true)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-head + 1, hy - 2)
    ctx.quadraticCurveTo(-6, hy - 14, 0, hy - 13)
    ctx.quadraticCurveTo(6, hy - 14, head - 1, hy - 2)
    ctx.fill()

    ctx.fillStyle = WARNING
    ctx.beginPath()
    ctx.roundRect(-head + 1, hy - 3, (head - 1) * 2, 5, 2)
    ctx.fill()
    this.strokeFill(ctx, 2)

    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-6, hy - 6)
    ctx.lineTo(-2, hy - 5)
    ctx.moveTo(6, hy - 6)
    ctx.lineTo(2, hy - 5)
    ctx.stroke()

    ctx.fillStyle = IRON
    ctx.beginPath()
    ctx.arc(-4, hy + 1, 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(4, hy + 1, 1.6, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(-3.5, hy + 6)
    ctx.quadraticCurveTo(0, hy + 9, 3.5, hy + 6)
    ctx.stroke()
  }
}

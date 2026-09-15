import { BODY, BODY_LIGHT, IRON } from './palette'
import { MAX_MUSCLE_LEVEL, PLAYER_EASE, PLAYER_RADIUS } from './config'

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
  ): void {
    const power = muscle / MAX_MUSCLE_LEVEL
    const shoulder = PLAYER_RADIUS + 20 + power * 28
    const arm = 12 + power * 14
    const chest = 24 + power * 18
    const head = 13
    const x = atX

    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha *= alpha

    ctx.strokeStyle = IRON
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 9 + power * 7

    ctx.beginPath()
    ctx.moveTo(-shoulder, -16)
    ctx.quadraticCurveTo(-shoulder - arm, -4, -shoulder + 2, 14)
    ctx.moveTo(shoulder, -16)
    ctx.quadraticCurveTo(shoulder + arm, -4, shoulder - 2, 14)
    ctx.stroke()

    ctx.fillStyle = BODY
    ctx.beginPath()
    ctx.ellipse(0, 2, chest + 8, PLAYER_RADIUS + 10 + power * 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 4
    ctx.stroke()

    ctx.fillStyle = BODY_LIGHT
    ctx.beginPath()
    ctx.ellipse(-12, 2, 11 + power * 7, 20 + power * 6, -0.22, 0, Math.PI * 2)
    ctx.ellipse(12, 2, 11 + power * 7, 20 + power * 6, 0.22, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = BODY_LIGHT
    ctx.beginPath()
    ctx.arc(0, -PLAYER_RADIUS - 18, head, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = IRON
    ctx.beginPath()
    ctx.arc(-4, -PLAYER_RADIUS - 19, 1.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(4, -PLAYER_RADIUS - 19, 1.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = IRON
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-4, -PLAYER_RADIUS - 11)
    ctx.quadraticCurveTo(0, -PLAYER_RADIUS - 8, 4, -PLAYER_RADIUS - 11)
    ctx.stroke()

    ctx.strokeStyle = IRON
    ctx.lineWidth = 9 + power * 5
    ctx.beginPath()
    ctx.moveTo(-14, PLAYER_RADIUS + 4)
    ctx.lineTo(-20, PLAYER_RADIUS + 26)
    ctx.moveTo(14, PLAYER_RADIUS + 4)
    ctx.lineTo(20, PLAYER_RADIUS + 26)
    ctx.stroke()

    ctx.restore()
  }
}

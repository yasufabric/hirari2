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

  draw(ctx: CanvasRenderingContext2D, y: number): void {
    const power = this.muscleLevel / MAX_MUSCLE_LEVEL
    const shoulder = PLAYER_RADIUS + 18 + power * 22
    const arm = 10 + power * 10
    const chest = 22 + power * 13
    const head = 12
    const x = this.displayX

    ctx.save()
    ctx.translate(x, y)

    ctx.strokeStyle = '#78350f'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 7 + power * 5

    ctx.beginPath()
    ctx.moveTo(-shoulder, -14)
    ctx.quadraticCurveTo(-shoulder - arm, -6, -shoulder + 4, 10)
    ctx.moveTo(shoulder, -14)
    ctx.quadraticCurveTo(shoulder + arm, -6, shoulder - 4, 10)
    ctx.stroke()

    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.ellipse(0, 0, chest + 6, PLAYER_RADIUS + 8 + power * 6, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.ellipse(-10, -1, 10 + power * 5, 18 + power * 4, -0.25, 0, Math.PI * 2)
    ctx.ellipse(10, -1, 10 + power * 5, 18 + power * 4, 0.25, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(0, -PLAYER_RADIUS - 16, head, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-5, -PLAYER_RADIUS - 17)
    ctx.lineTo(-1, -PLAYER_RADIUS - 17)
    ctx.moveTo(5, -PLAYER_RADIUS - 17)
    ctx.lineTo(1, -PLAYER_RADIUS - 17)
    ctx.moveTo(-5, -PLAYER_RADIUS - 10)
    ctx.quadraticCurveTo(0, -PLAYER_RADIUS - 6, 5, -PLAYER_RADIUS - 10)
    ctx.stroke()

    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 7 + power * 4
    ctx.beginPath()
    ctx.moveTo(-12, PLAYER_RADIUS + 2)
    ctx.lineTo(-18, PLAYER_RADIUS + 22)
    ctx.moveTo(12, PLAYER_RADIUS + 2)
    ctx.lineTo(18, PLAYER_RADIUS + 22)
    ctx.stroke()

    ctx.restore()
  }
}

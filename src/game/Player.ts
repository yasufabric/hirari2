import { PLAYER_EASE, PLAYER_RADIUS } from './config'

export class Player {
  lane: number
  displayX: number

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
    ctx.beginPath()
    ctx.arc(this.displayX, y, PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = '#38bdf8'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#e0f2fe'
    ctx.stroke()
  }
}

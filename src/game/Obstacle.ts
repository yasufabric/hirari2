import { OBSTACLE_SIZE } from './config'

export class Obstacle {
  lane: number
  y: number
  size: number

  constructor(lane: number, y: number, size: number = OBSTACLE_SIZE) {
    this.lane = lane
    this.y = y
    this.size = size
  }

  update(dt: number, speed: number): void {
    this.y += speed * dt
  }

  isOffscreen(canvasHeight: number): boolean {
    return this.y - this.size > canvasHeight
  }

  draw(ctx: CanvasRenderingContext2D, laneXPositions: number[]): void {
    const x = laneXPositions[this.lane]
    const half = this.size / 2
    ctx.fillStyle = '#f87171'
    ctx.fillRect(x - half, this.y - half, this.size, this.size)
  }
}

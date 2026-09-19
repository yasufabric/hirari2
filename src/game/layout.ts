import { MAT_ABOVE_PADS, MAT_HEIGHT, PLAYER_FOOT_Y } from './config'

export function playerFootOffset(scale: number): number {
  if (!(scale > 0)) return PLAYER_FOOT_Y
  return PLAYER_FOOT_Y * scale
}

export function playerStandY(viewHeight: number, padHeight: number, scale: number): number {
  const view = Number.isFinite(viewHeight) ? Math.max(0, viewHeight) : 0
  const pad = Number.isFinite(padHeight) ? Math.max(0, padHeight) : 0
  return view - pad - MAT_ABOVE_PADS - MAT_HEIGHT - playerFootOffset(scale)
}

export function matTopY(playerY: number, scale: number): number {
  return playerY + playerFootOffset(scale)
}

export function matBottomY(playerY: number, scale: number): number {
  return matTopY(playerY, scale) + MAT_HEIGHT
}

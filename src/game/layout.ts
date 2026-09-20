import { MAT_ABOVE_PADS, MAT_HEIGHT, PLAYER_FOOT_Y } from './config'

export type ViewportLike = {
  innerWidth: number
  innerHeight: number
  visualViewport?: {
    width: number
    height: number
    offsetLeft: number
    offsetTop: number
  } | null
}

export type VisibleFrame = {
  width: number
  height: number
  offsetLeft: number
  offsetTop: number
}

export function visibleFrame(win: ViewportLike): VisibleFrame {
  const vv = win.visualViewport
  if (vv && vv.width > 0 && vv.height > 0) {
    return {
      width: vv.width,
      height: vv.height,
      offsetLeft: vv.offsetLeft,
      offsetTop: vv.offsetTop,
    }
  }
  return {
    width: Math.max(0, win.innerWidth),
    height: Math.max(0, win.innerHeight),
    offsetLeft: 0,
    offsetTop: 0,
  }
}

export function stageBox(win: ViewportLike): VisibleFrame {
  const frame = visibleFrame(win)
  return {
    width: Math.max(1, frame.width),
    height: Math.max(1, frame.height),
    offsetLeft: frame.offsetLeft,
    offsetTop: frame.offsetTop,
  }
}

export function padObstruction(viewHeight: number, padsTop: number): number {
  const view = Number.isFinite(viewHeight) ? Math.max(0, viewHeight) : 0
  if (!Number.isFinite(padsTop)) return 0
  return Math.max(0, view - Math.max(0, padsTop))
}

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

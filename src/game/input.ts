import { LANE_COUNT } from './config'

/** Short flick on a ~390px phone; bigger than tap jitter, smaller than a lane third. */
export const SWIPE_THRESHOLD_PX = 48

export function laneFromTapX(x: number, width: number, laneCount = LANE_COUNT): number {
  if (laneCount <= 0) return 0
  if (!(width > 0) || !Number.isFinite(x)) return Math.floor(laneCount / 2)
  const t = Math.min(Math.max(x / width, 0), 1)
  if (t === 1) return laneCount - 1
  return Math.floor(t * laneCount)
}

export function swipeDirection(dx: number, dy: number): -1 | 1 | 0 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return 0
  if (Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? -1 : 1
}

export function attachPlayfieldTap(
  canvas: HTMLCanvasElement,
  onLane: (lane: number) => void,
  onSwipe: (direction: -1 | 1) => void,
): void {
  let pointerId: number | null = null
  let startX = 0
  let startY = 0
  let tapLane = 0
  let swiped = false

  const finish = (e: PointerEvent, allowTap: boolean): void => {
    if (pointerId === null || e.pointerId !== pointerId) return
    if (allowTap && !swiped) onLane(tapLane)
    pointerId = null
    swiped = false
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    if (pointerId !== null) return
    const rect = canvas.getBoundingClientRect()
    pointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    tapLane = laneFromTapX(e.clientX - rect.left, rect.width)
    swiped = false
    canvas.setPointerCapture?.(e.pointerId)
  })

  canvas.addEventListener('pointermove', (e) => {
    if (pointerId === null || e.pointerId !== pointerId || swiped) return
    const direction = swipeDirection(e.clientX - startX, e.clientY - startY)
    if (direction === 0) return
    swiped = true
    onSwipe(direction)
  })

  canvas.addEventListener('pointerup', (e) => finish(e, true))
  canvas.addEventListener('pointercancel', (e) => finish(e, false))
}

export function attachLanePads(
  pads: HTMLElement,
  onLane: (lane: number) => void,
): void {
  const buttons = pads.querySelectorAll<HTMLButtonElement>('[data-lane]')
  for (const button of buttons) {
    const go = (e: Event): void => {
      e.preventDefault()
      const lane = Number(button.dataset.lane)
      if (!Number.isInteger(lane)) return
      onLane(lane)
    }
    button.addEventListener('pointerdown', go)
    button.addEventListener('click', go)
  }
}

export function attachKeyboard(
  onMove: (direction: -1 | 1) => void,
  onConfirm: () => void,
): void {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault()
        onMove(-1)
        return
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault()
        onMove(1)
        return
      case 'Space':
      case 'Enter':
        if (e.target instanceof HTMLButtonElement) return
        e.preventDefault()
        onConfirm()
        return
      default:
        return
    }
  })
}

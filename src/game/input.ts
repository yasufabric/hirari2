import { LANE_COUNT } from './config'

export function laneFromTapX(x: number, width: number, laneCount = LANE_COUNT): number {
  if (laneCount <= 0) return 0
  if (!(width > 0) || !Number.isFinite(x)) return Math.floor(laneCount / 2)
  const t = Math.min(Math.max(x / width, 0), 1)
  if (t === 1) return laneCount - 1
  return Math.floor(t * laneCount)
}

export function attachPlayfieldTap(
  canvas: HTMLCanvasElement,
  onLane: (lane: number) => void,
): void {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    onLane(laneFromTapX(e.clientX - rect.left, rect.width))
  })
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

import { SWIPE_THRESHOLD_PX } from './config'

export function attachSwipe(
  canvas: HTMLCanvasElement,
  onMove: (direction: -1 | 1) => void,
): void {
  let pointerId: number | null = null
  let startX = 0
  let startY = 0
  let lastMoveX = 0

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault()
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      lastMoveX = e.clientX
      canvas.setPointerCapture(e.pointerId)
    },
    { passive: false },
  )

  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (pointerId !== e.pointerId) return
      e.preventDefault()

      const dx = e.clientX - lastMoveX
      const totalDy = Math.abs(e.clientY - startY)
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || totalDy > Math.abs(e.clientX - startX) + 24) {
        return
      }

      onMove(dx < 0 ? -1 : 1)
      lastMoveX = e.clientX
      startX = e.clientX
      startY = e.clientY
    },
    { passive: false },
  )

  canvas.addEventListener('pointerup', (e) => {
    if (pointerId !== e.pointerId) return
    pointerId = null
    canvas.releasePointerCapture(e.pointerId)
  })

  canvas.addEventListener('pointercancel', (e) => {
    if (pointerId !== e.pointerId) return
    pointerId = null
  })
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

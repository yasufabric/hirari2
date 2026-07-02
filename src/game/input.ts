import { SWIPE_THRESHOLD_PX } from './config'

export function attachInput(
  canvas: HTMLCanvasElement,
  onStart: () => void,
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
      onStart()
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

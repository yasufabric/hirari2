export function attachInput(canvas: HTMLCanvasElement, onTap: (clientX: number) => void): void {
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault()
      onTap(e.clientX)
    },
    { passive: false },
  )
}

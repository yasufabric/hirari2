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

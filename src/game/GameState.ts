export type GameStatus = 'ready' | 'playing' | 'gameover'

export function canTogglePause(status: GameStatus, stunned: boolean): boolean {
  return status === 'playing' && !stunned
}

export function canControlPlayer(status: GameStatus, stunned: boolean, paused: boolean): boolean {
  return status === 'playing' && !stunned && !paused
}

import { Game, type GameChrome } from './game/Game'

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`#${id} not found`)
  return el as T
}

const canvas = must<HTMLCanvasElement>('game')
const chrome: GameChrome = {
  hud: must('hud'),
  ready: must('ready'),
  over: must('over'),
  start: must<HTMLButtonElement>('start'),
  restart: must<HTMLButtonElement>('restart'),
  score: must('score'),
  best: must('best'),
  muscleFill: must('muscle-fill'),
  overScore: must('over-score'),
  hint: must('hint'),
}

new Game(canvas, chrome).init()

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
  scoreTick: must('score-tick'),
  best: must('best'),
  combo: must('combo'),
  muscleFill: must('muscle-fill'),
  overScore: must('over-score'),
  overRank: must('over-rank'),
  overHirari: must('over-hirari'),
  hint: must('hint'),
  mute: must<HTMLButtonElement>('mute'),
  pads: must('pads'),
  padButtons: [...must('pads').querySelectorAll<HTMLButtonElement>('[data-lane]')],
}

new Game(canvas, chrome).init()

import { Game } from './game/Game'

const canvas = document.getElementById('game') as HTMLCanvasElement | null
if (!canvas) throw new Error('#game canvas not found')

new Game(canvas).init()

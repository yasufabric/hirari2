import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  attachPlayfieldTap,
  laneFromTapX,
  swipeDirection,
  SWIPE_THRESHOLD_PX,
} from '../src/game/input'

type FakeCanvas = HTMLCanvasElement & {
  emit: (type: string, event: Record<string, unknown>) => void
}

function fakeCanvas(): FakeCanvas {
  const listeners = new Map<string, EventListener[]>()
  return {
    addEventListener(type: string, fn: EventListener) {
      const list = listeners.get(type) ?? []
      list.push(fn)
      listeners.set(type, list)
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 390, height: 844 }
    },
    setPointerCapture() {},
    emit(type: string, event: Record<string, unknown>) {
      for (const fn of listeners.get(type) ?? []) {
        fn({ preventDefault() {}, ...event } as unknown as Event)
      }
    },
  } as FakeCanvas
}

test('laneFromTapX splits the playfield into three equal columns', () => {
  assert.equal(laneFromTapX(0, 390), 0)
  assert.equal(laneFromTapX(129, 390), 0)
  assert.equal(laneFromTapX(130, 390), 1)
  assert.equal(laneFromTapX(259, 390), 1)
  assert.equal(laneFromTapX(260, 390), 2)
  assert.equal(laneFromTapX(389, 390), 2)
  assert.equal(laneFromTapX(390, 390), 2)
})

test('laneFromTapX clamps off-screen taps', () => {
  assert.equal(laneFromTapX(-20, 390), 0)
  assert.equal(laneFromTapX(800, 390), 2)
  assert.equal(laneFromTapX(100, 0), 1)
  assert.equal(laneFromTapX(Number.NaN, 390), 1)
})

test('swipeDirection needs a clear horizontal flick', () => {
  assert.equal(swipeDirection(SWIPE_THRESHOLD_PX - 1, 0), 0)
  assert.equal(swipeDirection(-(SWIPE_THRESHOLD_PX - 1), 0), 0)
  assert.equal(swipeDirection(SWIPE_THRESHOLD_PX, 0), 1)
  assert.equal(swipeDirection(-SWIPE_THRESHOLD_PX, 0), -1)
  assert.equal(swipeDirection(80, 12), 1)
  assert.equal(swipeDirection(-80, 12), -1)
})

test('swipeDirection ignores vertical jitter and invalid deltas', () => {
  assert.equal(swipeDirection(SWIPE_THRESHOLD_PX, SWIPE_THRESHOLD_PX), 0)
  assert.equal(swipeDirection(60, 80), 0)
  assert.equal(swipeDirection(-60, 80), 0)
  assert.equal(swipeDirection(Number.NaN, 0), 0)
  assert.equal(swipeDirection(80, Number.NaN), 0)
})

test('playfield tap still maps the down position after a tiny move', () => {
  const canvas = fakeCanvas()
  const lanes: number[] = []
  const swipes: number[] = []
  attachPlayfieldTap(canvas, (lane) => lanes.push(lane), (dir) => swipes.push(dir))
  canvas.emit('pointerdown', { pointerId: 1, clientX: 40, clientY: 400 })
  canvas.emit('pointermove', { pointerId: 1, clientX: 52, clientY: 406 })
  canvas.emit('pointerup', { pointerId: 1, clientX: 52, clientY: 406 })
  assert.deepEqual(lanes, [0])
  assert.deepEqual(swipes, [])
})

test('playfield swipe moves one lane and does not also tap', () => {
  const canvas = fakeCanvas()
  const lanes: number[] = []
  const swipes: number[] = []
  attachPlayfieldTap(canvas, (lane) => lanes.push(lane), (dir) => swipes.push(dir))
  canvas.emit('pointerdown', { pointerId: 1, clientX: 200, clientY: 400 })
  canvas.emit('pointermove', { pointerId: 1, clientX: 200 + SWIPE_THRESHOLD_PX, clientY: 408 })
  canvas.emit('pointermove', { pointerId: 1, clientX: 280, clientY: 410 })
  canvas.emit('pointerup', { pointerId: 1, clientX: 280, clientY: 410 })
  assert.deepEqual(swipes, [1])
  assert.deepEqual(lanes, [])
})

test('playfield swipe left is one step and vertical drags stay taps', () => {
  const canvas = fakeCanvas()
  const lanes: number[] = []
  const swipes: number[] = []
  attachPlayfieldTap(canvas, (lane) => lanes.push(lane), (dir) => swipes.push(dir))
  canvas.emit('pointerdown', { pointerId: 2, clientX: 200, clientY: 400 })
  canvas.emit('pointermove', { pointerId: 2, clientX: 200 - SWIPE_THRESHOLD_PX, clientY: 404 })
  canvas.emit('pointerup', { pointerId: 2, clientX: 140, clientY: 404 })
  assert.deepEqual(swipes, [-1])
  assert.deepEqual(lanes, [])

  canvas.emit('pointerdown', { pointerId: 3, clientX: 300, clientY: 300 })
  canvas.emit('pointermove', { pointerId: 3, clientX: 310, clientY: 380 })
  canvas.emit('pointerup', { pointerId: 3, clientX: 310, clientY: 380 })
  assert.deepEqual(swipes, [-1])
  assert.deepEqual(lanes, [2])
})

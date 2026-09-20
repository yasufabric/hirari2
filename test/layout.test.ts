import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAT_ABOVE_PADS, MAT_HEIGHT, PLAYER_FOOT_Y } from '../src/game/config'
import {
  matBottomY,
  matTopY,
  padObstruction,
  playerFootOffset,
  playerStandY,
  stageBox,
  visibleFrame,
} from '../src/game/layout'

const HEAD_DRAW_Y = -42

test('playerFootOffset scales the sole from the draw-space foot line', () => {
  assert.equal(playerFootOffset(1), PLAYER_FOOT_Y)
  assert.equal(playerFootOffset(0.7), PLAYER_FOOT_Y * 0.7)
  assert.equal(playerFootOffset(0), PLAYER_FOOT_Y)
})

test('mats sit under the scaled feet and leave a gap above the pads', () => {
  const scale = 0.7
  const viewHeight = 844
  const padHeight = 108
  const playerY = playerStandY(viewHeight, padHeight, scale)
  const foot = playerY + playerFootOffset(scale)

  assert.equal(matTopY(playerY, scale), foot)
  assert.equal(matBottomY(playerY, scale), foot + MAT_HEIGHT)
  assert.equal(matBottomY(playerY, scale), viewHeight - padHeight - MAT_ABOVE_PADS)
  assert.ok(matBottomY(playerY, scale) < viewHeight - padHeight)
})

test('playerStandY treats bad sizes as empty space', () => {
  assert.equal(playerStandY(Number.NaN, 108, 1), -108 - MAT_ABOVE_PADS - MAT_HEIGHT - PLAYER_FOOT_Y)
  assert.equal(playerStandY(800, Number.NaN, 1), 800 - MAT_ABOVE_PADS - MAT_HEIGHT - PLAYER_FOOT_Y)
})

test('visibleFrame prefers the visual viewport over the large iOS innerHeight', () => {
  const frame = visibleFrame({
    innerWidth: 393,
    innerHeight: 852,
    visualViewport: { width: 393, height: 668, offsetLeft: 0, offsetTop: 0 },
  })
  assert.equal(frame.width, 393)
  assert.equal(frame.height, 668)
})

test('visibleFrame falls back to innerWidth/innerHeight', () => {
  const frame = visibleFrame({ innerWidth: 390, innerHeight: 844 })
  assert.equal(frame.width, 390)
  assert.equal(frame.height, 844)
  assert.equal(frame.offsetTop, 0)
})

test('stageBox never returns a zero-size canvas', () => {
  const box = stageBox({ innerWidth: 0, innerHeight: 0, visualViewport: { width: 0, height: 0, offsetLeft: 0, offsetTop: 0 } })
  assert.equal(box.width, 1)
  assert.equal(box.height, 1)
})

test('padObstruction uses the on-screen pad top, not off-screen 100vh leftovers', () => {
  assert.equal(padObstruction(668, 526), 142)
  assert.equal(padObstruction(668, 710), 0)
  assert.equal(padObstruction(668, Number.NaN), 0)
})

test('iPhone 17 Safari keeps the lifter above the pads in the visible frame', () => {
  const scale = 0.7
  const view = visibleFrame({
    innerWidth: 393,
    innerHeight: 852,
    visualViewport: { width: 393, height: 668, offsetLeft: 0, offsetTop: 47 },
  })
  const padsTop = view.height - 142
  const padH = padObstruction(view.height, padsTop)
  const playerY = playerStandY(view.height, padH, scale)
  const headY = playerY + HEAD_DRAW_Y * scale
  const footY = playerY + playerFootOffset(scale)

  assert.ok(headY > 80)
  assert.ok(matBottomY(playerY, scale) <= padsTop)
  assert.ok(footY < padsTop)
  assert.ok(playerY > 0)
})

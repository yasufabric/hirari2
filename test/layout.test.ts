import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAT_ABOVE_PADS, MAT_HEIGHT, PLAYER_FOOT_Y } from '../src/game/config'
import { matBottomY, matTopY, playerFootOffset, playerStandY } from '../src/game/layout'

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

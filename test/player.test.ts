import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PLAYER_DRAW_SCALE_CAP } from '../src/game/config'
import { playerDrawScale } from '../src/game/Player'

test('playerDrawScale stays smaller than the old lane-filling lifter', () => {
  assert.ok(playerDrawScale(38) <= PLAYER_DRAW_SCALE_CAP)
  assert.ok(playerDrawScale(38) < 1)
  assert.ok(playerDrawScale(120) <= PLAYER_DRAW_SCALE_CAP)
})

test('playerDrawScale shrinks on very narrow lanes but stays readable', () => {
  const narrow = playerDrawScale(22)
  assert.ok(narrow >= 0.52)
  assert.ok(narrow < PLAYER_DRAW_SCALE_CAP)
})

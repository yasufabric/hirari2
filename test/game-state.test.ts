import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canControlPlayer, canTogglePause } from '../src/game/GameState'

test('pause only toggles while a run is live', () => {
  assert.equal(canTogglePause('playing', false), true)
  assert.equal(canTogglePause('playing', true), false)
  assert.equal(canTogglePause('ready', false), false)
  assert.equal(canTogglePause('gameover', false), false)
})

test('paused runs ignore lane moves', () => {
  assert.equal(canControlPlayer('playing', false, false), true)
  assert.equal(canControlPlayer('playing', false, true), false)
  assert.equal(canControlPlayer('playing', true, false), false)
  assert.equal(canControlPlayer('ready', false, false), false)
  assert.equal(canControlPlayer('gameover', false, false), false)
})

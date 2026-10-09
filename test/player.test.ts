import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DODGE_POSE_SEC, PLAYER_DRAW_SCALE_CAP } from '../src/game/config'
import { Player, playerDrawScale, selectPlayerPose } from '../src/game/Player'

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

test('selectPlayerPose shows the dizzy shiba on hit and game over', () => {
  assert.equal(selectPlayerPose({ stunned: true, gameOver: false, moveDir: 1, dodgeLeft: 0.1 }), 'dizzy')
  assert.equal(selectPlayerPose({ stunned: false, gameOver: true, moveDir: 0, dodgeLeft: 0 }), 'dizzy')
})

test('selectPlayerPose leans into a lane change only while the dodge is fresh', () => {
  assert.equal(selectPlayerPose({ stunned: false, gameOver: false, moveDir: -1, dodgeLeft: 0.1 }), 'left')
  assert.equal(selectPlayerPose({ stunned: false, gameOver: false, moveDir: 1, dodgeLeft: 0.1 }), 'right')
  assert.equal(selectPlayerPose({ stunned: false, gameOver: false, moveDir: 1, dodgeLeft: 0 }), 'idle')
  assert.equal(selectPlayerPose({ stunned: false, gameOver: false, moveDir: 0, dodgeLeft: 0 }), 'idle')
})

test('Player.moveTo records the dodge direction and update lets it expire', () => {
  const p = new Player(1, 0)
  p.moveTo(0)
  assert.equal(p.moveDir, -1)
  assert.equal(p.dodgeLeft, DODGE_POSE_SEC)
  p.moveTo(2)
  assert.equal(p.moveDir, 1)
  p.update(DODGE_POSE_SEC + 0.01, [0, 50, 100])
  assert.equal(p.dodgeLeft, 0)
  p.clearMove()
  assert.equal(p.moveDir, 0)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { laneFromTapX } from '../src/game/input'

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

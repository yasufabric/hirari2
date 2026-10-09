import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  COMBO_BASE_HZ,
  COMBO_MAX_STEP,
  MOVE_TICK_JITTER,
  comboFrequency,
  comboStep,
  moveTickRatio,
} from '../src/game/sfxNotes'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.05, `${a} ≈ ${b}`)

test('combo step starts at 0 and caps at the top of the scale', () => {
  assert.equal(comboStep(0), 0)
  assert.equal(comboStep(1), 0)
  assert.equal(comboStep(2), 1)
  assert.equal(comboStep(8), COMBO_MAX_STEP)
  assert.equal(comboStep(50), COMBO_MAX_STEP)
  assert.equal(comboStep(Number.NaN), 0)
  assert.equal(COMBO_MAX_STEP, 7)
})

test('combo frequency climbs a C major pentatonic scale', () => {
  near(comboFrequency(1), COMBO_BASE_HZ) // C5
  near(comboFrequency(2), 587.33) // D5
  near(comboFrequency(3), 659.26) // E5
  near(comboFrequency(4), 783.99) // G5
  near(comboFrequency(5), 880) // A5
  near(comboFrequency(6), 1046.5) // C6
  near(comboFrequency(8), 1318.51) // E6
  assert.equal(comboFrequency(99), comboFrequency(8))
})

test('combo frequency strictly rises until the cap, and resets with the combo', () => {
  for (let c = 2; c <= COMBO_MAX_STEP + 1; c++) assert.ok(comboFrequency(c) > comboFrequency(c - 1))
  assert.equal(comboFrequency(0), comboFrequency(1))
})

test('move tick pitch jitter stays within a semitone', () => {
  assert.equal(moveTickRatio(0.5), 1)
  near(moveTickRatio(0), 1 - MOVE_TICK_JITTER)
  near(moveTickRatio(1), 1 + MOVE_TICK_JITTER)
  assert.equal(moveTickRatio(-5), moveTickRatio(0))
  assert.equal(moveTickRatio(Number.NaN), 1)
})

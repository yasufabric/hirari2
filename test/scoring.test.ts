import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatSurvivalTime,
  hirariPoints,
  isAdjacentHirari,
  muscleMultiplier,
  muscleRank,
  muscleRankTitle,
  proteinHudTick,
  proteinPoints,
  survivalScore,
} from '../src/game/scoring'

test('muscle multiplier scales from 1x to 2x', () => {
  assert.equal(muscleMultiplier(0), 1)
  assert.equal(muscleMultiplier(8), 2)
  assert.equal(muscleMultiplier(99), 2)
  assert.equal(muscleMultiplier(-3), 1)
})

test('protein points grow with combo and muscle', () => {
  assert.equal(proteinPoints(0, 1), 80)
  assert.equal(proteinPoints(0, 2), 105)
  assert.equal(proteinPoints(8, 1), 160)
})

test('protein hud tick is points only', () => {
  assert.equal(proteinHudTick(80), '+80')
  assert.equal(proteinHudTick(105), '+105')
})

test('hirari points follow muscle', () => {
  assert.equal(hirariPoints(0), 20)
  assert.equal(hirariPoints(8), 40)
})

test('survival score uses the muscle multiplier', () => {
  assert.equal(survivalScore(1, 0), 6)
  assert.equal(survivalScore(1, 8), 12)
})

test('survival time stays compact on the HUD chip', () => {
  assert.equal(formatSurvivalTime(0), '0:00')
  assert.equal(formatSurvivalTime(5.9), '0:05')
  assert.equal(formatSurvivalTime(61), '1:01')
  assert.equal(formatSurvivalTime(600), '10:00')
  assert.equal(formatSurvivalTime(Number.NaN), '0:00')
  assert.equal(formatSurvivalTime(-3), '0:00')
})

test('hirari only counts adjacent passed additives', () => {
  assert.equal(isAdjacentHirari(0, 1, 101, 100), true)
  assert.equal(isAdjacentHirari(0, 2, 101, 100), false)
  assert.equal(isAdjacentHirari(1, 1, 101, 100), false)
  assert.equal(isAdjacentHirari(0, 1, 100, 100), false)
})

test('muscle ranks have Japanese titles', () => {
  assert.equal(muscleRankTitle(muscleRank(0)), 'ヒョロヒョロ')
  assert.equal(muscleRankTitle(muscleRank(2)), '細マッチョ')
  assert.equal(muscleRankTitle(muscleRank(4)), 'ムキムキ')
  assert.equal(muscleRankTitle(muscleRank(6)), 'ゴリゴリ')
  assert.equal(muscleRankTitle(muscleRank(8)), 'マッスルひらり')
})

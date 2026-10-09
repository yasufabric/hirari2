import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BASE_OBSTACLE_SPEED,
  BASE_SPAWN_INTERVAL_MS,
  LANE_COUNT,
  MIN_SPAWN_INTERVAL_MS,
  OBSTACLE_SPEED_GROWTH,
  OPENING_WARMUP_SEC,
  SPAWN_INTERVAL_DECAY_PER_SEC,
} from '../src/game/config'
import {
  maxBlockedLanes,
  obstacleSpeed,
  spawnIntervalMs,
  warmupProgress,
} from '../src/game/difficulty'

const fullSpeed = (t: number) => BASE_OBSTACLE_SPEED + t * OBSTACLE_SPEED_GROWTH
const fullInterval = (t: number) =>
  Math.max(MIN_SPAWN_INTERVAL_MS, BASE_SPAWN_INTERVAL_MS - t * SPAWN_INTERVAL_DECAY_PER_SEC)

test('warmup progress eases from 0 to 1', () => {
  assert.equal(warmupProgress(0), 0)
  assert.equal(warmupProgress(OPENING_WARMUP_SEC), 1)
  assert.equal(warmupProgress(OPENING_WARMUP_SEC * 3), 1)
  assert.equal(warmupProgress(-1), 0)
  assert.ok(Math.abs(warmupProgress(OPENING_WARMUP_SEC / 2) - 0.5) < 1e-9)
})

test('opening is slower and sparser than full difficulty', () => {
  assert.ok(obstacleSpeed(0) < BASE_OBSTACLE_SPEED * 0.7)
  assert.ok(spawnIntervalMs(0) > BASE_SPAWN_INTERVAL_MS * 1.4)
})

test('speed only ever increases and spawn gaps only shrink', () => {
  let prevSpeed = -Infinity
  let prevInterval = Infinity
  for (let t = 0; t <= 60; t += 0.1) {
    const s = obstacleSpeed(t)
    const i = spawnIntervalMs(t)
    assert.ok(s >= prevSpeed - 1e-9, `speed dipped at ${t}`)
    assert.ok(i <= prevInterval + 1e-9, `interval grew at ${t}`)
    prevSpeed = s
    prevInterval = i
  }
})

test('after warmup the curve matches the original difficulty', () => {
  for (const t of [OPENING_WARMUP_SEC, 15, 30, 60]) {
    assert.equal(obstacleSpeed(t), fullSpeed(t))
    assert.equal(spawnIntervalMs(t), fullInterval(t))
  }
})

test('warmup rows block at most one lane', () => {
  assert.equal(maxBlockedLanes(0), 1)
  assert.equal(maxBlockedLanes(OPENING_WARMUP_SEC - 0.01), 1)
  assert.equal(maxBlockedLanes(OPENING_WARMUP_SEC), LANE_COUNT - 1)
})

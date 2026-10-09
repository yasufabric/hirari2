import {
  BASE_OBSTACLE_SPEED,
  BASE_SPAWN_INTERVAL_MS,
  LANE_COUNT,
  MIN_SPAWN_INTERVAL_MS,
  OBSTACLE_SPEED_GROWTH,
  OPENING_INTERVAL_SCALE,
  OPENING_SPEED_SCALE,
  OPENING_WARMUP_SEC,
  SPAWN_INTERVAL_DECAY_PER_SEC,
} from './config'

/** 0 at the start of a run, eases to 1 once the opening warmup is over. */
export function warmupProgress(elapsed: number): number {
  const t = Math.max(0, Math.min(1, elapsed / OPENING_WARMUP_SEC))
  return t * t * (3 - 2 * t)
}

export function obstacleSpeed(elapsed: number): number {
  const full = BASE_OBSTACLE_SPEED + Math.max(0, elapsed) * OBSTACLE_SPEED_GROWTH
  const scale = OPENING_SPEED_SCALE + (1 - OPENING_SPEED_SCALE) * warmupProgress(elapsed)
  return full * scale
}

export function spawnIntervalMs(elapsed: number): number {
  const full = Math.max(
    MIN_SPAWN_INTERVAL_MS,
    BASE_SPAWN_INTERVAL_MS - Math.max(0, elapsed) * SPAWN_INTERVAL_DECAY_PER_SEC,
  )
  const scale = OPENING_INTERVAL_SCALE + (1 - OPENING_INTERVAL_SCALE) * warmupProgress(elapsed)
  return full * scale
}

/** During the warmup a row never blocks more than one lane. */
export function maxBlockedLanes(elapsed: number): number {
  return elapsed < OPENING_WARMUP_SEC ? 1 : LANE_COUNT - 1
}

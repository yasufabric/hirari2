/** Pure pitch helpers for the procedural SFX (no Web Audio here, so they are unit-testable). */

/** C5: the first protein pickup of a combo. */
export const COMBO_BASE_HZ = 523.25

/** Major pentatonic steps in semitones above the base: C D E G A C' D' E'. */
export const COMBO_SCALE_SEMITONES = [0, 2, 4, 7, 9, 12, 14, 16] as const

/** Highest step index a combo can climb to; later pickups stay on the top note. */
export const COMBO_MAX_STEP = COMBO_SCALE_SEMITONES.length - 1

/** Combo count (1 = first pickup) → scale step index, clamped to 0..COMBO_MAX_STEP. */
export function comboStep(combo: number): number {
  if (!Number.isFinite(combo)) return 0
  return Math.min(COMBO_MAX_STEP, Math.max(0, Math.floor(combo) - 1))
}

/** Combo count (1 = first pickup) → pickup chime frequency in Hz. */
export function comboFrequency(combo: number, baseHz = COMBO_BASE_HZ): number {
  return baseHz * 2 ** (COMBO_SCALE_SEMITONES[comboStep(combo)] / 12)
}

/** Max ± detune for the lane-move tick, as a ratio (6% ≈ one semitone). */
export const MOVE_TICK_JITTER = 0.06

/** Map a random 0..1 value to a gentle pitch ratio so spammed lane moves don't sound robotic. */
export function moveTickRatio(random: number): number {
  const r = Number.isFinite(random) ? Math.min(Math.max(random, 0), 1) : 0.5
  return 1 + (r * 2 - 1) * MOVE_TICK_JITTER
}

/** New-best fanfare: a quick bright C major arpeggio up to C7 (Hz, in play order). */
export const NEW_BEST_FANFARE_HZ = [1046.5, 1318.51, 1567.98, 2093] as const

/** Gap between fanfare notes, in seconds. */
export const NEW_BEST_FANFARE_STEP_SEC = 0.07

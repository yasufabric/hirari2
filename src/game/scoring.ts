import {
  HIRARI_SCORE,
  MAX_MUSCLE_LEVEL,
  MUSCLE_SCORE_STEP,
  PROTEIN_COMBO_BONUS,
  PROTEIN_SCORE,
  SCORE_PER_SECOND,
} from './config'

export type MuscleRank = 'skinny' | 'lean' | 'pumped' | 'ripped' | 'hirari'

export function clampMuscle(level: number): number {
  return Math.max(0, Math.min(MAX_MUSCLE_LEVEL, Math.floor(level)))
}

export function muscleMultiplier(muscleLevel: number): number {
  return 1 + clampMuscle(muscleLevel) * MUSCLE_SCORE_STEP
}

export function survivalScore(dt: number, muscleLevel: number): number {
  return dt * SCORE_PER_SECOND * muscleMultiplier(muscleLevel)
}

export function proteinPoints(muscleLevel: number, combo: number): number {
  const comboBonus = Math.max(0, combo - 1) * PROTEIN_COMBO_BONUS
  return Math.round((PROTEIN_SCORE + comboBonus) * muscleMultiplier(muscleLevel))
}

export function proteinFloaterText(points: number, combo: number): string {
  return combo > 1 ? `+${points} ×${combo}` : `+${points}`
}

export function hirariPoints(muscleLevel: number): number {
  return Math.round(HIRARI_SCORE * muscleMultiplier(muscleLevel))
}

export function isAdjacentHirari(
  itemLane: number,
  playerLane: number,
  y: number,
  playerY: number,
): boolean {
  if (y <= playerY) return false
  return Math.abs(itemLane - playerLane) === 1
}

export function muscleRank(level: number): MuscleRank {
  const muscle = clampMuscle(level)
  if (muscle <= 0) return 'skinny'
  if (muscle <= 2) return 'lean'
  if (muscle <= 4) return 'pumped'
  if (muscle <= 6) return 'ripped'
  return 'hirari'
}

export function muscleRankTitle(rank: MuscleRank): string {
  switch (rank) {
    case 'skinny':
      return 'ヒョロヒョロ'
    case 'lean':
      return '細マッチョ'
    case 'pumped':
      return 'ムキムキ'
    case 'ripped':
      return 'ゴリゴリ'
    case 'hirari':
      return 'マッスルひらり'
    default: {
      const _exhaustive: never = rank
      throw new Error(`Unhandled muscle rank: ${_exhaustive}`)
    }
  }
}

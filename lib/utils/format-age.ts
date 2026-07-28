export type AgeUnit = 'months' | 'years'

export interface FormattedAge {
  count: number
  unit: AgeUnit
}

/**
 * Normalizes an age expressed in months into the unit a human would say it in.
 * 72 months reads as "6 años", not "72 Meses".
 */
export function formatAge(months: number): FormattedAge {
  if (!Number.isFinite(months) || months < 0) return { count: 0, unit: 'months' }
  if (months >= 12) return { count: Math.floor(months / 12), unit: 'years' }
  return { count: Math.floor(months), unit: 'months' }
}

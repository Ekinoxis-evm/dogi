// The pricing model from the 2026-10-10 design, in COP for the Colombia launch.
//
//   hourly    = (space base + amenities) x local demand x (1 + host adjustment)
//   half day  = 5 h at 60%   full day = 10 h at 40%   overnight = 10 h at 55%
//   each extra pet from the same home adds 60%
//   Dogi keeps 10%, the host keeps 90%
//
// Design values were USD; converted at ~4,000 COP/USD and rounded to 500 pesos.
// Pure module: no imports, so `node --test` can run it directly.

export type SpaceType = 'apartment_pet_room' | 'house_no_yard' | 'house_with_yard' | 'dedicated_pet_space'
export type Demand = 'low' | 'standard' | 'high'
export type StayLength = 'drop_in' | 'half_day' | 'full_day' | 'overnight'

export const SPACE_BASE_COP: Record<SpaceType, number> = {
  apartment_pet_room: 30000,
  house_no_yard: 34000,
  house_with_yard: 38000,
  dedicated_pet_space: 44000,
}

export const DEMAND_MULTIPLIER: Record<Demand, number> = { low: 0.85, standard: 1, high: 1.2 }

/** hours billed and the share of the hourly rate charged for them */
export const STAY_RULES: Record<Exclude<StayLength, 'drop_in'>, { hours: number; share: number }> = {
  half_day: { hours: 5, share: 0.6 },
  full_day: { hours: 10, share: 0.4 },
  overnight: { hours: 10, share: 0.55 },
}

export const EXTRA_PET_SHARE = 0.6
export const PLATFORM_FEE_SHARE = 0.1
export const FAIR_RANGE = 0.15
export const TIER_BONUS = { new_host: 0, rising: 0, trusted: 0.05, pack_leader: 0.12 } as const
export type HostTier = keyof typeof TIER_BONUS

const ROUND_TO = 500

function roundPesos(pesos: number): number {
  return Math.round(pesos / ROUND_TO) * ROUND_TO
}

/** The suggested rate before the host's own adjustment, in whole pesos. */
export function suggestedHourly(space: SpaceType, amenityAddsCop: number[], demand: Demand): number {
  const adds = amenityAddsCop.reduce((a, b) => a + b, 0)
  return roundPesos((SPACE_BASE_COP[space] + adds) * DEMAND_MULTIPLIER[demand])
}

/** The rate a host publishes: suggested rate moved by -15..+15 in steps of 5, plus tier bonus. */
export function hourlyRate(suggested: number, adjustPct: number, tier: HostTier = 'new_host'): number {
  if (adjustPct < -15 || adjustPct > 15 || adjustPct % 5 !== 0) {
    throw new Error(`adjustment must be -15..15 in steps of 5, got ${adjustPct}`)
  }
  return roundPesos(suggested * (1 + adjustPct / 100) * (1 + TIER_BONUS[tier]))
}

export interface Quote {
  /** all amounts in whole pesos */
  base: number
  extraPets: number
  total: number
  platformFee: number
  hostPayout: number
}

/**
 * Price one stay. `dropInHours` is only used for drop-ins (billed per hour).
 * The fee is rounded and the payout is the remainder, so fee + payout = total always.
 */
export function quoteStay(hourly: number, stay: StayLength, pets: number, dropInHours = 1): Quote {
  if (!Number.isInteger(pets) || pets < 1 || pets > 3) throw new Error(`pets must be 1-3, got ${pets}`)
  let base: number
  if (stay === 'drop_in') {
    if (!Number.isInteger(dropInHours) || dropInHours < 1 || dropInHours > 4) {
      throw new Error(`drop-in hours must be 1-4, got ${dropInHours}`)
    }
    base = hourly * dropInHours
  } else {
    const r = STAY_RULES[stay]
    base = roundPesos(hourly * r.hours * r.share)
  }
  const extraPets = roundPesos(base * EXTRA_PET_SHARE * (pets - 1))
  const total = base + extraPets
  const platformFee = roundPesos(total * PLATFORM_FEE_SHARE)
  return { base, extraPets, total, platformFee, hostPayout: total - platformFee }
}

/** The "fair range" shown to hosts: suggested +/- 15%. */
export function fairRange(suggested: number): [number, number] {
  return [roundPesos(suggested * (1 - FAIR_RANGE)), roundPesos(suggested * (1 + FAIR_RANGE))]
}

import type { Demand, SpaceType } from '@/lib/pricing'

// Labels, defaults and the draft shape for the host onboarding flow. Spanish (es-CO).

export interface Amenity {
  id: string
  label_es: string
  add_per_hour_cop: number
}

export type PetKey = 'smallDogs' | 'mediumDogs' | 'largeDogs' | 'cats' | 'puppies' | 'seniors'
export type MinStay = 'one_hour' | 'two_hours' | 'half_day'
export type Notice = 'two_hours' | 'same_day' | 'one_day'
export type PayoutResult = 'connected' | 'failed' | null

export interface Draft {
  step: number
  space: SpaceType
  areaM2: string
  neighbourhood: string
  otherPets: string
  amenityIds: string[]
  accepts: Record<PetKey, boolean>
  guests: number
  earliestDropoff: string
  latestPickup: string
  minStay: MinStay
  notice: Notice
  requiresVaccines: boolean
  requiresMeetGreet: boolean
  requiresNeutered: boolean
  demand: Demand
  adjustPct: number
}

export const DRAFT_KEY = 'dogi.hostOnboarding.v1'

export const DEFAULT_DRAFT: Draft = {
  step: 1,
  space: 'house_with_yard',
  areaM2: '',
  neighbourhood: '',
  otherPets: 'Ninguna',
  amenityIds: [],
  accepts: { smallDogs: true, mediumDogs: true, largeDogs: false, cats: false, puppies: false, seniors: true },
  guests: 1,
  earliestDropoff: '07:00',
  latestPickup: '21:00',
  minStay: 'one_hour',
  notice: 'two_hours',
  requiresVaccines: true,
  requiresMeetGreet: true,
  requiresNeutered: false,
  demand: 'standard',
  adjustPct: 0,
}

export const STEPS = [
  'Tu espacio',
  'Comodidades',
  'Quién puede quedarse',
  'Horario y reglas',
  'Precio',
  'Recibe tus pagos',
  'Revisar y publicar',
] as const
export const STEP_PAYOUTS = 6
export const STEP_REVIEW = 7

export const SPACES: { id: SpaceType; label: string; desc: string; icon: string }[] = [
  {
    id: 'apartment_pet_room',
    label: 'Apartamento con cuarto para mascotas',
    desc: 'Un cuarto o rincón adecuado para mascotas dentro de un apartamento.',
    icon: 'M4 21V5h10v16M14 9h6v12M7 9h2M7 13h2M7 17h2',
  },
  {
    id: 'house_no_yard',
    label: 'Casa sin patio',
    desc: 'Espacio interior en una casa; el aire libre es en los paseos.',
    icon: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
  },
  {
    id: 'house_with_yard',
    label: 'Casa con patio',
    desc: 'Espacio interior más un área exterior privada.',
    icon: 'M12 21v-6M12 3l6 8h-3l4 5H5l4-5H6z',
  },
  {
    id: 'dedicated_pet_space',
    label: 'Espacio solo para mascotas',
    desc: 'Un cuarto o construcción que se usa únicamente para mascotas.',
    icon: 'M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 18v-5a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5z',
  },
]

export const OTHER_PETS = ['Ninguna', 'Un perro amigable', 'Gato(s)']

/** The DB only carries labels; these one-liners come from the design. */
export const AMENITY_DESC: Record<string, string> = {
  fenced_yard: 'Área exterior totalmente cerrada',
  walks: 'Al menos un paseo con correa',
  live_camera: 'Los dueños pueden ver el espacio',
  first_aid: 'Con certificado vigente',
  climate: 'Aire acondicionado o ventilación',
  quiet_room: 'Separado de otros huéspedes',
  meds_diets: 'Medicinas orales a su hora',
  vet_nearby: 'Clínica a menos de 2 km',
}

export const PETS: { id: PetKey; label: string; short: string }[] = [
  { id: 'smallDogs', label: 'Perros pequeños < 10 kg', short: 'Perros pequeños' },
  { id: 'mediumDogs', label: 'Perros medianos 10–25 kg', short: 'Perros medianos' },
  { id: 'largeDogs', label: 'Perros grandes > 25 kg', short: 'Perros grandes' },
  { id: 'cats', label: 'Gatos', short: 'Gatos' },
  { id: 'puppies', label: 'Cachorros < 6 meses', short: 'Cachorros' },
  { id: 'seniors', label: 'Mascotas mayores', short: 'Mayores' },
]

export const MIN_STAY: { id: MinStay; label: string }[] = [
  { id: 'one_hour', label: '1 hora' },
  { id: 'two_hours', label: '2 horas' },
  { id: 'half_day', label: 'Medio día' },
]

export const NOTICE: { id: Notice; label: string }[] = [
  { id: 'two_hours', label: '2 horas' },
  { id: 'same_day', label: 'El mismo día' },
  { id: 'one_day', label: '1 día' },
]

export const DEMANDS: { id: Demand; label: string }[] = [
  { id: 'low', label: 'Zona tranquila' },
  { id: 'standard', label: 'Normal' },
  { id: 'high', label: 'Alta demanda' },
]

/** Merge whatever was saved on this device onto the defaults, dropping anything malformed. */
export function restoreDraft(raw: string | null, amenityIds: Set<string>): Draft {
  if (!raw) return DEFAULT_DRAFT
  try {
    const s = JSON.parse(raw) as Partial<Draft>
    const d: Draft = { ...DEFAULT_DRAFT }
    if (Number.isInteger(s.step) && s.step! >= 1 && s.step! <= STEPS.length) d.step = s.step!
    if (SPACES.some((x) => x.id === s.space)) d.space = s.space!
    if (typeof s.areaM2 === 'string') d.areaM2 = s.areaM2.slice(0, 5)
    if (typeof s.neighbourhood === 'string') d.neighbourhood = s.neighbourhood.slice(0, 120)
    if (typeof s.otherPets === 'string' && OTHER_PETS.includes(s.otherPets)) d.otherPets = s.otherPets
    if (Array.isArray(s.amenityIds)) d.amenityIds = s.amenityIds.filter((id) => typeof id === 'string' && amenityIds.has(id))
    if (s.accepts && typeof s.accepts === 'object') {
      d.accepts = { ...DEFAULT_DRAFT.accepts }
      for (const p of PETS) if (typeof s.accepts[p.id] === 'boolean') d.accepts[p.id] = s.accepts[p.id]
    }
    if (Number.isInteger(s.guests)) d.guests = Math.min(3, Math.max(1, s.guests!))
    if (typeof s.earliestDropoff === 'string' && /^\d\d:\d\d$/.test(s.earliestDropoff)) d.earliestDropoff = s.earliestDropoff
    if (typeof s.latestPickup === 'string' && /^\d\d:\d\d$/.test(s.latestPickup)) d.latestPickup = s.latestPickup
    if (MIN_STAY.some((x) => x.id === s.minStay)) d.minStay = s.minStay!
    if (NOTICE.some((x) => x.id === s.notice)) d.notice = s.notice!
    for (const k of ['requiresVaccines', 'requiresMeetGreet', 'requiresNeutered'] as const) {
      if (typeof s[k] === 'boolean') d[k] = s[k]
    }
    if (DEMANDS.some((x) => x.id === s.demand)) d.demand = s.demand!
    if (Number.isInteger(s.adjustPct) && s.adjustPct! % 5 === 0) d.adjustPct = Math.min(15, Math.max(-15, s.adjustPct!))
    return d
  } catch {
    return DEFAULT_DRAFT
  }
}

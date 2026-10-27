// Spanish labels for the pet passport, shared by /pets/new, /pets/[id] and /bookings/[id].

export type Species = 'dog' | 'cat' | 'small_pet'
export type Tri = 'yes' | 'unsure' | 'no'
export type WatchOut = 'anxious_alone' | 'pulls_leash' | 'loud_noises' | 'guards_food' | 'climbs_fences'
export type Vaccine = 'rabies' | 'dhpp' | 'bordetella' | 'fvrcp'

export const SPECIES: { id: Species; label: string }[] = [
  { id: 'dog', label: 'Perro' },
  { id: 'cat', label: 'Gato' },
  { id: 'small_pet', label: 'Mascota pequeña' },
]
export const speciesLabel = (s: string) => SPECIES.find((x) => x.id === s)?.label ?? s

export const TRI: { id: Tri; label: string }[] = [
  { id: 'yes', label: 'Sí' },
  { id: 'unsure', label: 'No sé' },
  { id: 'no', label: 'No' },
]

export const ENERGY = ['De sofá', 'Tranquila', 'Moderada', 'Activa', 'Atleta'] as const

export const WATCH_OUTS: { id: WatchOut; label: string }[] = [
  { id: 'anxious_alone', label: 'Se angustia cuando se queda sin compañía' },
  { id: 'pulls_leash', label: 'Hala la correa' },
  { id: 'loud_noises', label: 'Le asustan los ruidos fuertes' },
  { id: 'guards_food', label: 'Cuida su comida o sus juguetes' },
  { id: 'climbs_fences', label: 'Puede saltar o trepar rejas' },
]
export const watchOutLabel = (w: string) => WATCH_OUTS.find((x) => x.id === w)?.label ?? w

export const VACCINE_LABEL: Record<Vaccine, string> = {
  rabies: 'Rabia',
  dhpp: 'Moquillo y parvovirus (DHPP)',
  bordetella: 'Bordetella (tos de las perreras)',
  fvrcp: 'Triple felina (FVRCP)',
}
export const vaccinesFor = (s: Species): Vaccine[] =>
  s === 'cat' ? ['rabies', 'fvrcp'] : s === 'dog' ? ['rabies', 'dhpp', 'bordetella'] : []

export const STAY_LABEL: Record<string, string> = {
  drop_in: 'Por horas',
  half_day: 'Medio día',
  full_day: 'Día completo',
  overnight: 'Noche',
}

export const SPACE_LABEL: Record<string, string> = {
  apartment_pet_room: 'Apartamento con cuarto para mascotas',
  house_no_yard: 'Casa sin patio',
  house_with_yard: 'Casa con patio',
  dedicated_pet_space: 'Espacio exclusivo para mascotas',
}

export type VaccineState = 'missing' | 'expired' | 'soon' | 'current'

/** Status of a vaccine from its valid-until date (YYYY-MM-DD), relative to today. */
export function vaccineState(validUntil: string | null | undefined, now = new Date()): VaccineState {
  if (!validUntil) return 'missing'
  const until = new Date(`${validUntil}T23:59:59`)
  const days = (until.getTime() - now.getTime()) / 86_400_000
  if (days < 0) return 'expired'
  if (days <= 30) return 'soon'
  return 'current'
}

export const VACCINE_BADGE: Record<VaccineState, { label: string; className: string }> = {
  missing: { label: 'Sin agregar', className: 'bg-sunk-2 text-ink-2' },
  expired: { label: 'Vencida', className: 'bg-amber-tint text-amber-ink' },
  soon: { label: 'Renovar pronto', className: 'bg-amber-tint text-amber-ink' },
  current: { label: 'Al día', className: 'bg-brand-tint text-brand-hover' },
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d)
}

export function ageLabel(birthday: string | null | undefined, now = new Date()): string | null {
  if (!birthday) return null
  const b = new Date(`${birthday}T12:00:00`)
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) return null
  if (months < 12) return months === 1 ? '1 mes' : `${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 año' : `${years} años`
}

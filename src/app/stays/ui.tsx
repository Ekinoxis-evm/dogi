// Small presentational pieces shared by the home page and the stay page. No hooks, so
// they render in server and client components alike.

import type { HostTier } from '@/lib/reputation'
import type { SpaceType, StayLength } from '@/lib/pricing'

export const TIER_LABEL: Record<HostTier, string> = {
  new_host: 'Anfitrión nuevo',
  rising: 'En ascenso',
  trusted: 'De confianza',
  pack_leader: 'Líder de la manada',
}

export const TIER_ORDER: HostTier[] = ['new_host', 'rising', 'trusted', 'pack_leader']

export const SPACE_LABEL: Record<SpaceType, string> = {
  apartment_pet_room: 'Apartamento con cuarto para mascotas',
  house_no_yard: 'Casa sin patio',
  house_with_yard: 'Casa con patio',
  dedicated_pet_space: 'Espacio dedicado a mascotas',
}

export const STAY_LABEL: Record<StayLength, string> = {
  drop_in: 'Por horas',
  half_day: 'Medio día',
  full_day: 'Día completo',
  overnight: 'Noche',
}

export const CATEGORY_LABEL = {
  pet_care: 'Cuidado de la mascota',
  safety: 'Seguridad',
  communication: 'Comunicación',
  accuracy: 'El espacio es como se ve',
  cleanliness: 'Limpieza',
} as const

const AMENITY_ICON: Record<string, string> = {
  fenced_yard: 'M5 20V7l2-3 2 3v13M15 20V7l2-3 2 3v13M3 11h18M3 16h18',
  walks: 'M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  live_camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  first_aid: 'M9 6V4h6v2M3.5 6h17v14h-17zM12 10v6M9 13h6',
  climate: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  quiet_room: 'M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 18v-5a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5z',
  meds_diets: 'M3 12h18a9 6 0 0 1-18 0zM8 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4',
  vet_nearby: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z',
}

export function Icon({ d, size = 20, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  )
}

export function AmenityIcon({ id, size = 22 }: { id: string; size?: number }) {
  return <Icon d={AMENITY_ICON[id] ?? 'M5 12.5l4.5 4.5L19 7.5'} size={size} />
}

export const ICONS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2',
  id: 'M3 5h18v14H3zM15 10h3M15 13h3M5.5 16.5c.8-1.5 2-2.2 3.5-2.2s2.7.7 3.5 2.2M9 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
  lock: 'M4 10h16v11H4zM8 10V7a4 4 0 0 1 8 0v3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  medal: 'M12 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5',
  aid: AMENITY_ICON.first_aid,
  search: 'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.3-4.3',
  chevron: 'M6 9l6 6 6-6',
}

export function Star({ className = 'text-amber-deep' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
  )
}

/** Tier pill. Pack Leader is the amber one; the rest stay quiet. */
export function TierBadge({ tier, className = '' }: { tier: HostTier; className?: string }) {
  const tone =
    tier === 'pack_leader'
      ? 'bg-amber text-ink'
      : tier === 'trusted'
        ? 'bg-brand text-white'
        : tier === 'rising'
          ? 'bg-brand-tint text-brand'
          : 'bg-surface text-ink border border-line-strong'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${tone} ${className}`}>
      <Icon d={ICONS.medal} size={14} />
      {TIER_LABEL[tier]}
    </span>
  )
}

export function TrustBadge({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-3 py-1.5 text-sm font-semibold text-brand">
      <Icon d={icon} size={14} />
      {children}
    </span>
  )
}

export function Initials({ name, className = '' }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-amber-tint font-display font-extrabold text-amber-ink ${className}`}>
      {letters || '·'}
    </span>
  )
}

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-sm font-bold uppercase tracking-widest text-brand ${className}`}>{children}</span>
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "oct 2026" — deterministic, so server and client agree. */
export function monthYear(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function score(n: number | null): string {
  return n == null ? '—' : n.toFixed(2).replace('.', ',')
}

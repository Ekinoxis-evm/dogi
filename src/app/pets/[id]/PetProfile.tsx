'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '@/lib/client/api'
import { formatMoney } from '@/lib/money'
import { guestTier, type GuestTier } from '@/lib/reputation'
import { PageSkeleton } from '../new/AuthGate'
import {
  ENERGY,
  STAY_LABEL,
  VACCINE_BADGE,
  VACCINE_LABEL,
  ageLabel,
  formatMonthYear,
  speciesLabel,
  vaccineState,
  watchOutLabel,
  type Vaccine,
} from '../new/labels'

interface Pet {
  id: string
  species: string
  name: string
  breed: string | null
  birthday: string | null
  weight_kg: number | string | null
  sex: 'female' | 'male' | null
  neutered: boolean | null
  microchip: string | null
  photo_url: string | null
  energy: number | null
  good_with_dogs: 'yes' | 'unsure' | 'no'
  good_with_cats: 'yes' | 'unsure' | 'no'
  good_with_kids: 'yes' | 'unsure' | 'no'
  watch_outs: string[]
  notes: string | null
  meals: string | null
  walks: string | null
  potty: string | null
  sleep: string | null
  calming: string | null
  medication: string | null
  allergies: string | null
  vet_clinic: string | null
  vet_phone: string | null
  emergency_contact: string | null
  emergency_vet_cap_minor: number | null
}

interface Profile {
  viewer: 'owner' | 'host'
  confirmed: boolean
  hostBooking: { id: string; status: string; stay: string; dropoff_at: string } | null
  pet: Pet
  owner: { firstName: string | null; idVerified: boolean; memberSince: string } | null
  vaccines: { vaccine: string; valid_until: string | null }[]
  score: { stays: number; guestScore: number | null }
  ratings: { behaviour: number | null; passportMatch: number | null; onTimePickup: number | null; communication: number | null }
  reviews: {
    bookingId: string
    author: string | null
    stay: string | null
    body: string | null
    createdAt: string
    behaviour: number
    passportMatch: number
    onTimePickup: number
    communication: number
  }[]
  reviewers: number
}

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ok'; data: Profile }

const TIERS: { id: GuestTier; label: string; stays: number; score: number }[] = [
  { id: 'new_guest', label: 'Nuevo huésped', stays: 0, score: 0 },
  { id: 'good_guest', label: 'Buen huésped', stays: 3, score: 4.5 },
  { id: 'star_guest', label: 'Huésped estrella', stays: 10, score: 4.8 },
]

const one = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

export default function PetProfile({ id }: { id: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    api(`/api/pets/${id}`)
      .then(async (res) => {
        if (!alive) return
        if (res.status === 404) return setLoad({ state: 'missing' })
        if (!res.ok) return setLoad({ state: 'error' })
        const data = (await res.json()) as Profile
        if (alive) setLoad({ state: 'ok', data })
      })
      .catch(() => alive && setLoad({ state: 'error' }))
    return () => {
      alive = false
    }
  }, [id])

  if (load.state === 'loading') return <PageSkeleton />
  if (load.state !== 'ok') {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold text-ink">
            {load.state === 'missing' ? 'No encontramos este perfil' : 'No pudimos cargar el perfil'}
          </h1>
          <p className="text-base text-muted">
            {load.state === 'missing'
              ? 'Puede que no exista o que no tengas acceso. Solo lo ven su familia y los anfitriones con una reserva para esta mascota.'
              : 'Revisa tu conexión y vuelve a intentarlo.'}
          </p>
        </div>
      </div>
    )
  }

  return <ProfileView data={load.data} />
}

function ProfileView({ data }: { data: Profile }) {
  const { pet, score, ratings, owner } = data
  const tier = guestTier(score.stays, score.guestScore)
  const tierIdx = TIERS.findIndex((t) => t.id === tier)
  const nextTier = TIERS[tierIdx + 1]
  const female = pet.sex === 'female'
  const sexLine = pet.sex
    ? `${female ? 'Hembra' : 'Macho'}${pet.neutered == null ? '' : pet.neutered ? (female ? ', esterilizada' : ', castrado') : female ? ', sin esterilizar' : ', sin castrar'}`
    : null
  const summary = [
    speciesLabel(pet.species),
    pet.breed,
    sexLine,
    pet.weight_kg != null && `${Number(pet.weight_kg).toLocaleString('es-CO')} kg`,
    ageLabel(pet.birthday),
  ].filter(Boolean)

  const social = (
    [
      ['good_with_dogs', 'perros'],
      ['good_with_kids', 'niños'],
      ['good_with_cats', 'gatos'],
    ] as const
  ).map(([k, who]) => {
    const v = pet[k]
    return { key: k, good: v === 'yes', text: v === 'yes' ? `Se lleva bien con ${who}` : v === 'no' ? `No con ${who}` : `${who[0].toUpperCase()}${who.slice(1)}: no sé` }
  })

  const routine = (
    [
      ['Comidas', pet.meals],
      ['Paseos', pet.walks],
      ['Baño', pet.potty],
      ['Dormir', pet.sleep],
    ] as const
  ).filter(([, v]) => v)

  const bars = [
    ['Comportamiento en la estadía', ratings.behaviour],
    ['Coincide con el pasaporte', ratings.passportMatch],
    ['Recogida a tiempo', ratings.onTimePickup],
    ['Comunicación con la familia', ratings.communication],
  ] as const

  const hb = data.hostBooking

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 pb-20 pt-9 sm:px-6">
      {data.viewer === 'host' && hb && (
        <p className="self-start rounded-full bg-amber-tint px-4 py-2 text-sm font-semibold text-amber-ink">
          Vista de anfitrión · {STAY_LABEL[hb.stay] ?? hb.stay} del{' '}
          {new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(new Date(hb.dropoff_at))}
        </p>
      )}

      {/* Hero */}
      <section className="flex flex-wrap items-stretch gap-8">
        <div
          role="img"
          aria-label={pet.photo_url ? `Foto de ${pet.name}` : `Sin foto todavía: ${pet.name}`}
          className="flex min-h-72 flex-[1_1_320px] items-end rounded-2xl bg-brand-tint bg-cover bg-center p-4 sm:max-w-[420px]"
          style={pet.photo_url ? { backgroundImage: `url(${JSON.stringify(pet.photo_url)})` } : undefined}
        >
          {!pet.photo_url && <span className="rounded-sm bg-surface px-2 py-1 text-xs font-semibold text-ink-2">Foto: {pet.name}</span>}
        </div>
        <div className="flex min-w-0 flex-[999_1_460px] flex-col justify-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight text-ink sm:text-6xl">{pet.name}</h1>
            <span className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white">{TIERS[tierIdx].label}</span>
          </div>
          <span className="text-lg text-ink-2">{summary.join(' · ')}</span>
          {owner && (
            <span className="text-base text-ink-2">
              Familia: <strong className="text-ink">{owner.firstName ?? 'Sin nombre'}</strong>
              {owner.idVerified && ' · Identidad verificada'} · Miembro desde {formatMonthYear(owner.memberSince)}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            {social.map((s) => (
              <span key={s.key} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${s.good ? 'bg-sunk text-brand' : 'bg-sunk-2 text-ink-2'}`}>
                {s.text}
              </span>
            ))}
            {pet.energy && <span className="rounded-full bg-sunk-2 px-3 py-1.5 text-sm font-semibold text-ink-2">Energía {ENERGY[pet.energy - 1].toLowerCase()}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-3">
            {data.viewer === 'host' && hb ? (
              <Link href={`/bookings/${hb.id}`} className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
                Ver la reserva
              </Link>
            ) : (
              <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
                Buscar una estadía para {pet.name}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-start gap-6">
        {/* Good Guest record */}
        <section aria-labelledby="gg-h" className="flex flex-col gap-5 rounded-2xl bg-ink p-8 text-white">
          <div className="flex items-center gap-4">
            <strong className="font-display text-6xl font-bold leading-none tracking-tight">{score.guestScore == null ? '—' : one(score.guestScore)}</strong>
            <div className="flex flex-col gap-1">
              <h2 id="gg-h" className="text-xl font-bold">
                Historial de buen huésped
              </h2>
              <span className="text-base text-line-strong">
                {score.stays === 0 ? 'Todavía sin reseñas de anfitriones' : `Calificado por anfitriones después de ${plural(score.stays, 'estadía', 'estadías')}`}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            {bars.map(([l, v]) => (
              <div key={l} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-base">
                  <span>{l}</span>
                  <strong>{v == null ? '—' : one(v)}</strong>
                </div>
                <span className="block h-2 rounded-full bg-ink-2">
                  <span className="block h-2 rounded-full bg-amber" style={{ width: `${v == null ? 0 : (v / 5) * 100}%` }} />
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-ink-2 pt-4">
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <strong>{nextTier ? `Siguiente: ${nextTier.label}` : 'Nivel más alto'}</strong>
              <span className="text-line-strong">{nextTierHint(score, nextTier)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
              {TIERS.map((t, i) => (
                <span key={t.id} className={`h-2.5 rounded-full ${i < tierIdx ? 'bg-brand-tint' : i === tierIdx ? 'bg-amber' : 'bg-ink-2'}`} />
              ))}
            </div>
            <ol className="grid grid-cols-3 gap-1.5 text-sm font-semibold text-line-strong">
              {TIERS.map((t, i) => (
                <li key={t.id} className={i === tierIdx ? 'text-white' : undefined} aria-current={i === tierIdx ? 'true' : undefined}>
                  {t.label}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Health */}
        <section aria-labelledby="health-h" className="flex flex-col gap-4 rounded-2xl bg-sunk p-8">
          <h2 id="health-h" className="font-display text-2xl font-bold text-ink">
            Salud
          </h2>
          <div className="flex flex-col">
            {data.vaccines.map((v) => {
              const st = vaccineState(v.valid_until)
              const text =
                st === 'missing'
                  ? VACCINE_BADGE.missing.label
                  : st === 'expired'
                    ? `Vencida · ${formatMonthYear(v.valid_until!)}`
                    : st === 'soon'
                      ? `Renovar antes del ${new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(`${v.valid_until}T12:00:00`))}`
                      : `Al día · ${formatMonthYear(v.valid_until!)}`
              return (
                <Row key={v.vaccine} label={VACCINE_LABEL[v.vaccine as Vaccine] ?? v.vaccine}>
                  <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${VACCINE_BADGE[st].className}`}>{text}</span>
                </Row>
              )
            })}
            {data.vaccines.length === 0 && pet.species !== 'small_pet' && (
              <Row label="Vacunas">
                <span className="text-ink-2">Sin registrar</span>
              </Row>
            )}
            <Row label="Medicación">
              <span className="text-right text-ink-2">{pet.medication ?? 'Ninguna'}</span>
            </Row>
            <Row label="Alergias" last>
              <span className="text-right text-ink-2">{pet.allergies ?? 'Ninguna registrada'}</span>
            </Row>
          </div>
          <p className="rounded-lg bg-surface p-4 text-base leading-relaxed text-ink">
            {pet.vet_clinic && (
              <>
                <strong>Veterinario:</strong> {pet.vet_clinic}
                {pet.vet_phone && ` · ${pet.vet_phone}`}.{' '}
              </>
            )}
            {pet.emergency_vet_cap_minor != null
              ? `Atención de emergencia autorizada hasta ${formatMoney(pet.emergency_vet_cap_minor, 'COP')}. `
              : 'Sin autorización de gasto veterinario de emergencia. '}
            {data.confirmed ? (
              <>
                {pet.emergency_contact && (
                  <>
                    <strong>Contacto de emergencia:</strong> {pet.emergency_contact}.{' '}
                  </>
                )}
                {pet.microchip ? (
                  <>
                    <strong>Microchip:</strong> {pet.microchip}
                  </>
                ) : (
                  'Sin microchip registrado.'
                )}
              </>
            ) : (
              'El microchip y el contacto de emergencia se muestran cuando la reserva esté pagada.'
            )}
          </p>
        </section>

        {/* What to know */}
        <section aria-labelledby="beh-h" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-8">
          <h2 id="beh-h" className="font-display text-2xl font-bold text-ink">
            Lo que debes saber
          </h2>
          {pet.watch_outs.length === 0 && !pet.calming && !pet.notes && <p className="text-base text-muted">Nada especial que advertir.</p>}
          {pet.watch_outs.map((w) => (
            <Bullet key={w} warn>
              <strong>{watchOutLabel(w)}.</strong>
            </Bullet>
          ))}
          {pet.calming && (
            <Bullet>
              <strong>Qué le da calma:</strong> {pet.calming}
            </Bullet>
          )}
          {pet.notes && <Bullet>{pet.notes}</Bullet>}
        </section>

        {/* Routine */}
        <section aria-labelledby="rt-h" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-8">
          <h2 id="rt-h" className="mb-3 font-display text-2xl font-bold text-ink">
            Rutina diaria
          </h2>
          {routine.length === 0 && <p className="text-base text-muted">Sin rutina registrada.</p>}
          {routine.map(([l, v], i) => (
            <div key={l} className={`grid grid-cols-[110px_1fr] gap-3 py-3 text-base ${i < routine.length - 1 ? 'border-b border-sunk-2' : ''}`}>
              <strong className="text-ink">{l}</strong>
              <span className="text-ink-2">{v}</span>
            </div>
          ))}
        </section>
      </div>

      {/* Host reviews */}
      <section aria-labelledby="notes-h" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="notes-h" className="font-display text-3xl font-bold text-ink">
            Lo que dicen los anfitriones de {pet.name}
          </h2>
          {data.reviews.length > 0 && (
            <span className="text-base text-muted">
              {plural(score.stays, 'estadía', 'estadías')} · {plural(data.reviewers, 'anfitrión', 'anfitriones')}
            </span>
          )}
        </div>
        {data.reviews.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-6 text-base text-muted">
            Todavía no hay reseñas. Después de cada estadía, el anfitrión cuenta cómo le fue a {pet.name}.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
            {data.reviews.map((r) => {
              const tags = [
                r.passportMatch >= 5 && 'Coincide con el pasaporte',
                r.behaviour >= 5 && 'Comportamiento',
                r.communication >= 5 && 'Comunicación',
                r.onTimePickup >= 5 && 'Recogida a tiempo',
              ].filter(Boolean)
              return (
                <article key={r.bookingId} className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-6">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-ink">{r.author ?? 'Anfitrión'}</strong>
                    <span className="text-sm text-muted">
                      {[r.stay && STAY_LABEL[r.stay], formatMonthYear(r.createdAt)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  {r.body && <p className="text-base leading-relaxed text-ink-2">{r.body}</p>}
                  {tags.length > 0 && <span className="text-sm font-semibold text-brand">{tags.join(' · ')}</span>}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function nextTierHint(score: Profile['score'], next: (typeof TIERS)[number] | undefined): string {
  if (!next) return '¡Lo logró!'
  const left = next.stays - score.stays
  if (left > 0) return `${plural(left, 'buena estadía más', 'buenas estadías más')}`
  return `Necesita un promedio de ${one(next.score)} o más`
}

function Row({ label, last, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex justify-between gap-3 py-3 text-base text-ink ${last ? '' : 'border-b border-line'}`}>
      <span>{label}</span>
      {children}
    </div>
  )
}

function Bullet({ warn, children }: { warn?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-base leading-relaxed text-ink">
      <span className={`mt-2 size-2.5 flex-none rounded-full ${warn ? 'bg-amber-deep' : 'bg-brand'}`} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatMoney, pesosToMinor } from '@/lib/money'
import { quoteStay, type StayLength } from '@/lib/pricing'
import { PAW_WEIGHTS } from '@/lib/reputation'
import { getListing, type ListingDetail } from '../listing-data'
import {
  AmenityIcon, CATEGORY_LABEL, ICONS, Icon, Initials, SPACE_LABEL, STAY_LABEL, Star, TIER_LABEL, TIER_ORDER,
  TierBadge, TrustBadge, monthYear, score,
} from '../ui'
import BookingPanel from './BookingPanel'

// cacheComponents is on: params are request data, so they are awaited inside Suspense
// and the listing read itself is cached for about a minute in getListing().

export default function StayPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<StaySkeleton />}>
      <Stay params={params} />
    </Suspense>
  )
}

const NOTICE_LABEL: Record<ListingDetail['notice'], string> = {
  two_hours: 'Reserva con 2 horas de anticipación',
  same_day: 'Reserva el mismo día',
  one_day: 'Reserva con un día de anticipación',
}

const MIN_STAY_LABEL: Record<ListingDetail['minStay'], string> = {
  one_hour: 'Mínimo 1 hora',
  two_hours: 'Mínimo 2 horas',
  half_day: 'Mínimo medio día',
}

const STAY_SUB: Record<StayLength, string> = {
  drop_in: 'por hora, de 1 a 4 h',
  half_day: 'hasta 5 h',
  full_day: 'hasta 10 h',
  overnight: 'hasta la mañana siguiente',
}

async function Stay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const l = await getListing(id)
  if (!l) notFound()

  const hourlyPesos = l.hourlyMinor / 100
  const cop = (pesos: number) => formatMoney(pesosToMinor(pesos), 'COP')
  const tierIdx = TIER_ORDER.indexOf(l.tier)

  const accepts = [
    l.accepts.smallDogs && 'Perros pequeños (menos de 10 kg)',
    l.accepts.mediumDogs && 'Perros medianos (10 a 25 kg)',
    l.accepts.largeDogs && 'Perros grandes (más de 25 kg)',
    l.accepts.cats && 'Gatos',
    l.accepts.puppies && 'Cachorros',
    l.accepts.seniors && 'Mascotas mayores',
    `Hasta ${l.maxGuests} ${l.maxGuests === 1 ? 'huésped' : 'huéspedes'} a la vez`,
  ].filter(Boolean) as string[]
  const requires = [
    l.requiresVaccines && 'Vacunas al día',
    l.requiresMeetGreet && 'Conocerse antes de la primera estadía',
    l.requiresNeutered && 'Mascota esterilizada',
  ].filter(Boolean) as string[]

  const stays: StayLength[] = ['drop_in', 'half_day', 'full_day', 'overnight']

  return (
    <div className="bg-surface">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 pb-20 pt-6 sm:px-6">
        <nav aria-label="Ruta" className="flex flex-wrap gap-2 text-[15px] text-muted">
          <Link href="/#anfitriones">Estadías</Link>
          <span aria-hidden="true">/</span>
          <span>{l.neighbourhood}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-ink">{l.hostFirstName}</span>
        </nav>

        <Gallery l={l} />

        <div className="flex flex-wrap items-start gap-12">
          {/* Left column */}
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-10">
            {/* Identity */}
            <div className="flex flex-wrap items-center gap-5">
              {l.hostPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- storage URL; no remotePatterns configured
                <img src={l.hostPhotoUrl} alt="" className="h-22 w-22 shrink-0 rounded-full object-cover" />
              ) : (
                <Initials name={l.hostFirstName} className="h-22 w-22 text-3xl" />
              )}
              <div className="flex flex-[1_1_300px] flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-4xl font-extrabold tracking-tight">{l.hostFirstName}</h1>
                  <TierBadge tier={l.tier} />
                </div>
                <span className="text-[17px] text-ink-2">
                  {SPACE_LABEL[l.space]} · {l.neighbourhood}, {l.city}
                  {l.hostSince && ` · Anfitrión desde ${monthYear(l.hostSince)}`}
                </span>
                <div className="flex flex-wrap gap-2">
                  {l.idVerified && <TrustBadge icon={ICONS.id}>Identidad verificada</TrustBadge>}
                  {l.spaceCheckedAt && <TrustBadge icon={ICONS.home}>Espacio revisado {monthYear(l.spaceCheckedAt)}</TrustBadge>}
                  {l.firstAid && <TrustBadge icon={ICONS.aid}>Primeros auxilios</TrustBadge>}
                </div>
              </div>
            </div>

            {l.hostIntro && <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-ink-2">{l.hostIntro}</p>}

            {/* Reputation */}
            <section aria-labelledby="rep-h" className="flex flex-col gap-5 rounded-2xl bg-canvas p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <strong className="font-display text-6xl leading-none tracking-tight">{l.reviews ? score(l.pawScore) : '—'}</strong>
                  <div className="flex flex-col gap-1">
                    <h2 id="rep-h" className="text-xl font-bold">Paw Score</h2>
                    <span className="text-[15px] text-muted">
                      {l.reviews
                        ? `De ${l.reviews} ${l.reviews === 1 ? 'estadía pagada y completada' : 'estadías pagadas y completadas'}`
                        : 'Aún sin calificaciones: sé el primero en reservar'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col text-[15px]">
                  <strong className="text-[22px]">{l.stays}</strong>
                  <span className="text-muted">{l.stays === 1 ? 'Estadía completada' : 'Estadías completadas'}</span>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {l.categories.map((c) => (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[15px]">
                      <span className="font-semibold">
                        {CATEGORY_LABEL[c.key]} <span className="font-normal text-muted">· {Math.round(PAW_WEIGHTS[c.key] * 100)} %</span>
                      </span>
                      <strong>{score(c.avg)}</strong>
                    </div>
                    <span className="block h-2 rounded-full bg-line" role="presentation">
                      <span className="block h-2 rounded-full bg-brand" style={{ width: `${((c.avg ?? 0) / 5) * 100}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2.5 border-t border-line pt-4">
                <strong className="text-[15px]">Niveles</strong>
                <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                  {TIER_ORDER.map((t, i) => (
                    <span key={t} className={`h-2.5 rounded-full ${i < tierIdx ? 'bg-brand' : i === tierIdx ? 'bg-amber' : 'bg-line'}`} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[13px] font-semibold text-muted">
                  {TIER_ORDER.map((t, i) => (
                    <span key={t} className={i === tierIdx ? 'text-ink' : ''}>
                      {TIER_LABEL[t]}
                      {i === tierIdx && <span className="sr-only"> (nivel actual)</span>}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Amenities */}
            {l.amenityDetails.length > 0 && (
              <section aria-labelledby="am-h" className="flex flex-col gap-4">
                <h2 id="am-h" className="font-display text-[28px] font-bold tracking-tight">Comodidades</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {l.amenityDetails.map((a) => (
                    <div key={a.id} className="flex items-center gap-3.5 rounded-lg border border-line p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sunk text-brand">
                        <AmenityIcon id={a.id} />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <strong className="text-base">{a.label}</strong>
                        {a.detail && <span className="text-sm text-muted">{a.detail}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* House rules */}
            <section aria-labelledby="rules-h" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <h2 id="rules-h" className="col-span-full font-display text-[28px] font-bold tracking-tight">Quién puede quedarse</h2>
              <RuleCard title="Acepta" items={accepts} />
              <RuleCard title="Horario" items={[
                `Entrega desde las ${l.earliestDropoff}`,
                `Recogida hasta las ${l.latestPickup} (noche: a la mañana siguiente)`,
                NOTICE_LABEL[l.notice],
                MIN_STAY_LABEL[l.minStay],
              ]} />
              <RuleCard title="Pide" items={requires.length ? requires : ['Nada adicional']} />
              {l.otherPetsAtHome && <RuleCard title="En casa también vive" items={[l.otherPetsAtHome]} />}
            </section>

            {/* Prices */}
            <section aria-labelledby="price-h" className="flex flex-col gap-4">
              <h2 id="price-h" className="font-display text-[28px] font-bold tracking-tight">Precios</h2>
              <div className="overflow-hidden rounded-xl border border-line">
                <dl>
                  {stays.map((s) => (
                    <div key={s} className="flex justify-between gap-3 border-b border-sunk-2 px-5 py-4 text-base">
                      <dt>{STAY_LABEL[s]} <span className="text-muted">· {STAY_SUB[s]}</span></dt>
                      <dd className="font-bold">{cop(quoteStay(hourlyPesos, s, 1, 1).base)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 border-b border-sunk-2 px-5 py-4 text-base">
                    <dt>Cada mascota extra del mismo hogar</dt>
                    <dd className="font-bold">+60 %</dd>
                  </div>
                </dl>
                <p className="bg-canvas px-5 py-3.5 text-sm text-muted">
                  {l.latePickupMinor
                    ? `Recoger tarde se cobra por cada 30 minutos: ${formatMoney(l.latePickupMinor, 'COP')}.`
                    : 'Recoger tarde se cobra por cada 30 minutos a la tarifa acordada.'}
                </p>
              </div>
            </section>

            {/* Reviews */}
            <section aria-labelledby="rev-h" className="flex flex-col gap-5">
              <h2 id="rev-h" className="font-display text-[28px] font-bold tracking-tight">Opiniones de estadías completadas</h2>
              {l.reviewList.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {l.reviewList.map((rv) => (
                    <article key={rv.id} className="flex flex-col gap-3 rounded-xl border border-line p-5">
                      <div className="flex items-center gap-3">
                        <Initials name={rv.author} className="h-11 w-11 text-base" />
                        <div className="flex flex-1 flex-col">
                          <strong className="text-base">
                            {rv.author}
                            {rv.pets.length > 0 && `, con ${rv.pets.join(' y ')}`}
                          </strong>
                          <span className="text-sm text-muted">
                            {[rv.stay && STAY_LABEL[rv.stay], monthYear(rv.createdAt)].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Star />
                          <span className="sr-only">Calificación</span>
                          {rv.score.toFixed(1).replace('.', ',')}
                        </span>
                      </div>
                      {rv.body && <p className="text-base leading-relaxed text-ink-2">{rv.body}</p>}
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                        <Icon d={ICONS.check} size={14} /> Estadía pagada y verificada
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-canvas p-5 text-base text-ink-2">
                  {l.hostFirstName} todavía no tiene opiniones. Solo pueden opinar quienes completan y pagan una estadía.
                </p>
              )}
            </section>
          </div>

          <BookingPanel
            listingId={l.id}
            hostFirstName={l.hostFirstName}
            hourlyPesos={hourlyPesos}
            maxGuests={l.maxGuests}
            earliestDropoff={l.earliestDropoff}
            latestPickup={l.latestPickup}
            minStay={l.minStay}
            acceptsCats={l.accepts.cats}
            pawScore={l.reviews ? l.pawScore : null}
          />
        </div>
      </div>
    </div>
  )
}

function Gallery({ l }: { l: ListingDetail }) {
  const photos = l.photos.slice(0, 5)
  if (!photos.length) {
    return (
      <div role="img" aria-label={`${SPACE_LABEL[l.space]} en ${l.neighbourhood}`}
        className="flex h-60 items-end rounded-2xl bg-brand-tint p-4">
        <span className="rounded-sm bg-surface/90 px-2 py-1 text-[13px] font-semibold text-ink-2">
          {l.hostFirstName} todavía no ha subido fotos del espacio
        </span>
      </div>
    )
  }
  return (
    <div className="grid auto-rows-[210px] grid-cols-1 gap-2.5 overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- storage URL; no remotePatterns configured
        <img key={p.url} src={p.url} alt={p.caption ?? `Foto ${i + 1} del espacio de ${l.hostFirstName}`}
          className={`h-full w-full bg-sunk object-cover ${i === 0 ? 'sm:row-span-2' : ''}`} />
      ))}
    </div>
  )
}

function RuleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-canvas p-5 text-base">
      <strong>{title}</strong>
      <ul className="flex flex-col gap-2">
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </div>
  )
}

function StaySkeleton() {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 pb-20 pt-6 sm:px-6" aria-busy="true" aria-label="Cargando">
      <span className="h-5 w-48 rounded-full bg-sunk" />
      <div className="h-[430px] rounded-2xl bg-sunk" />
      <div className="flex flex-wrap gap-12">
        <div className="flex flex-[999_1_560px] flex-col gap-4">
          <span className="h-10 w-64 rounded-full bg-sunk" />
          <span className="h-5 w-96 max-w-full rounded-full bg-sunk" />
          <div className="h-60 rounded-2xl bg-sunk" />
        </div>
        <div className="h-[520px] flex-[1_1_340px] rounded-2xl bg-sunk lg:max-w-[400px]" />
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { api } from '@/lib/client/api'
import { DEMAND_MULTIPLIER, SPACE_BASE_COP, fairRange, hourlyRate, quoteStay, suggestedHourly, type StayLength } from '@/lib/pricing'
import { maxGuestsFor } from '@/lib/reputation'
import { DRAFT_KEY, SPACES, STEPS, STEP_PAYOUTS, STEP_REVIEW, restoreDraft, type Amenity, type Draft, type PayoutResult } from './copy'
import OnboardingSkeleton from './Skeleton'
import { AmenitiesStep, GuestsStep, PayoutStep, PriceStep, ReviewStep, ScheduleStep, SpaceStep, type PriceRow } from './steps'
import { CHECK_PATH, Card, Icon, StepHeader, btnPrimary, btnSecondary, cop } from './ui'

interface Props {
  amenities: Amenity[] | null
  payoutResult: PayoutResult
}

export default function OnboardingFlow(props: Props) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <Shell>
        <Card>
          <StepHeader title="Publica tu espacio" lead="El inicio de sesión no está configurado en este entorno." />
        </Card>
      </Shell>
    )
  }
  return <Gate {...props} />
}

function Gate(props: Props) {
  const { ready, authenticated, login } = usePrivy()
  if (!ready) return <OnboardingSkeleton />
  if (!authenticated) {
    return (
      <Shell>
        <Card>
          <StepHeader
            title="Hospeda mascotas en tu casa"
            lead="Entra con tu correo o Google para crear tu anuncio. Te toma unos 10 minutos y puedes terminar después."
          />
          <div>
            <button type="button" onClick={() => login()} className={btnPrimary}>
              Entrar para empezar
            </button>
          </div>
        </Card>
      </Shell>
    )
  }
  return <Wizard {...props} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pt-10 pb-16 sm:px-6">{children}</div>
}

type Submit = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string } | { kind: 'done'; status: 'live' | 'draft' }

const ROWS: { stay: StayLength; label: string }[] = [
  { stay: 'drop_in', label: 'Visita · por hora' },
  { stay: 'half_day', label: 'Medio día · hasta 5 h' },
  { stay: 'full_day', label: 'Día completo · hasta 10 h' },
  { stay: 'overnight', label: 'Noche' },
]

// Everyone starts as a new host; the server recomputes the tier and clamps guests and price.
const MAX_GUESTS = maxGuestsFor('new_host')

function Wizard({ amenities, payoutResult }: Props) {
  const amenityById = useMemo(() => new Map((amenities ?? []).map((a) => [a.id, a])), [amenities])

  // Mounted only after Privy is ready, i.e. client-side: safe to read storage in the initializer.
  const [d, setD] = useState<Draft>(() => {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(DRAFT_KEY)
    } catch {}
    const restored = restoreDraft(raw, new Set(amenityById.keys()))
    return {
      ...restored,
      guests: Math.min(restored.guests, MAX_GUESTS),
      step: payoutResult ? STEP_PAYOUTS : restored.step,
    }
  })
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }))

  const [payoutConnected, setPayoutConnected] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [submit, setSubmit] = useState<Submit>({ kind: 'idle' })
  const headingRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    } catch {}
  }, [d])

  useEffect(() => {
    let cancelled = false
    api('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { payoutConnected?: boolean } | null) => {
        if (!cancelled) setPayoutConnected(me ? !!me.payoutConnected : payoutResult === 'connected')
      })
      .catch(() => {
        if (!cancelled) setPayoutConnected(payoutResult === 'connected')
      })
    // Drop ?payout= so a reload doesn't repeat the banner.
    if (payoutResult) window.history.replaceState(null, '', window.location.pathname)
    return () => {
      cancelled = true
    }
  }, [payoutResult])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.querySelector('h1')?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [d.step])

  // -- pricing (display only; the server recomputes it) --
  const space = SPACES.find((s) => s.id === d.space) ?? SPACES[0]
  const adds = d.amenityIds.map((id) => amenityById.get(id)?.add_per_hour_cop ?? 0)
  const addSum = adds.reduce((a, b) => a + b, 0)
  const suggested = suggestedHourly(d.space, adds, d.demand)
  const hourly = hourlyRate(suggested, d.adjustPct)
  const rows: PriceRow[] = ROWS.map(({ stay, label }) => {
    const q = quoteStay(hourly, stay, 1)
    const [lo, hi] = fairRange(quoteStay(suggested, stay, 1).total)
    return { label, price: q.total, earn: q.hostPayout, lo, hi }
  })
  const adjLabel = (d.adjustPct > 0 ? '+' : '') + d.adjustPct + '%'

  // -- validation --
  const problems: Partial<Record<number, string>> = {}
  if (d.neighbourhood.trim().length < 2) problems[1] = 'Escribe tu barrio para seguir.'
  if (!(d.accepts.smallDogs || d.accepts.mediumDogs || d.accepts.largeDogs || d.accepts.cats))
    problems[3] = 'Elige al menos un tipo de mascota.'
  if (d.earliestDropoff >= d.latestPickup) problems[4] = 'Revisa el horario: la recogida va después de la entrega.'
  const stepProblem = problems[d.step]
  const firstProblemStep = Object.keys(problems).map(Number).sort((a, b) => a - b)[0]

  const go = (n: number) => set({ step: Math.min(STEPS.length, Math.max(1, n)) })

  async function connectPayouts() {
    setConnecting(true)
    setConnectError(null)
    try {
      const r = await api('/api/mp/connect', { method: 'POST' })
      const body = (await r.json().catch(() => null)) as { url?: string } | null
      if (!r.ok || !body?.url) throw new Error()
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, step: STEP_PAYOUTS }))
      window.location.assign(body.url)
    } catch {
      setConnecting(false)
      setConnectError('No pudimos abrir Mercado Pago. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  async function publish() {
    if (firstProblemStep) return go(firstProblemStep)
    setSubmit({ kind: 'saving' })
    const area = parseInt(d.areaM2, 10)
    try {
      const r = await api('/api/listings', {
        method: 'POST',
        body: JSON.stringify({
          space: d.space,
          areaM2: Number.isFinite(area) && area >= 1 ? Math.min(area, 10000) : null,
          city: 'Medellín',
          neighbourhood: d.neighbourhood.trim(),
          otherPetsAtHome: d.otherPets,
          accepts: d.accepts,
          maxGuests: d.guests,
          earliestDropoff: d.earliestDropoff,
          latestPickup: d.latestPickup,
          minStay: d.minStay,
          notice: d.notice,
          requiresVaccines: d.requiresVaccines,
          requiresMeetGreet: d.requiresMeetGreet,
          requiresNeutered: d.requiresNeutered,
          demand: d.demand,
          adjustPct: d.adjustPct,
          amenityIds: d.amenityIds,
        }),
      })
      const body = (await r.json().catch(() => null)) as { status?: 'live' | 'draft' } | null
      if (!r.ok || !body?.status) throw new Error(String(r.status))
      try {
        window.localStorage.removeItem(DRAFT_KEY)
      } catch {}
      setSubmit({ kind: 'done', status: body.status })
      window.scrollTo({ top: 0 })
    } catch {
      setSubmit({ kind: 'error', message: 'No pudimos guardar tu anuncio. Inténtalo de nuevo en un momento.' })
    }
  }

  if (submit.kind === 'done') {
    const live = submit.status === 'live'
    return (
      <Shell>
        <Card>
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand">
            <Icon d={CHECK_PATH} className="size-7" />
          </span>
          <StepHeader
            title={live ? '¡Tu anuncio está publicado!' : 'Guardamos tu anuncio como borrador'}
            lead={
              live
                ? 'Ya apareces en la búsqueda como Anfitrión nuevo. Te escribimos para agendar la revisión de 20 minutos por video de tu espacio.'
                : 'Conecta tu cuenta de Mercado Pago para publicarlo. Sin una cuenta conectada no podemos enviarte tus pagos.'
            }
          />
          <div className="flex flex-wrap gap-3">
            {!live && (
              <button type="button" onClick={connectPayouts} disabled={connecting} className={btnPrimary}>
                {connecting ? 'Abriendo Mercado Pago…' : 'Conectar Mercado Pago'}
              </button>
            )}
            <Link href="/" className={`${btnSecondary} hover:no-underline`}>
              Volver al inicio
            </Link>
          </div>
          {connectError && (
            <p role="alert" className="text-sm font-semibold text-amber-ink">
              {connectError}
            </p>
          )}
        </Card>
      </Shell>
    )
  }

  const isReview = d.step === STEP_REVIEW
  const nextLabel = isReview ? (submit.kind === 'saving' ? 'Publicando…' : 'Publicar anuncio') : d.step === STEP_REVIEW - 1 ? 'Revisar anuncio' : 'Continuar'

  return (
    <>
      <div className="h-1 bg-sunk-2" role="progressbar" aria-label="Avance" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={d.step}>
        <div className="h-1 bg-brand transition-[width]" style={{ width: `${Math.round((d.step / STEPS.length) * 100)}%` }} />
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-4 pt-10 pb-16 sm:px-6">
        {/* Step list */}
        <nav aria-label="Pasos para publicar" className="flex w-full flex-col gap-1 md:max-w-[300px] md:flex-[1_1_240px]">
          <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
            <span className="text-xs font-bold tracking-widest text-muted uppercase">
              Paso {d.step} de {STEPS.length}
            </span>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-sunk hover:no-underline">
              Guardar y salir
            </Link>
          </div>
          <ol className="hidden flex-col gap-1 md:flex">
            {STEPS.map((label, i) => {
              const n = i + 1
              const cur = n === d.step
              const done = n < d.step
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    aria-current={cur ? 'step' : undefined}
                    className={`flex min-h-13 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base text-ink ${
                      cur ? 'bg-surface font-bold shadow-card' : 'font-medium hover:bg-sunk'
                    }`}
                  >
                    <span
                      className={`flex size-7.5 flex-none items-center justify-center rounded-full text-sm font-bold ${
                        done || cur ? 'bg-brand text-surface' : 'bg-sunk-2 text-ink-2'
                      }`}
                    >
                      {done ? <Icon d={CHECK_PATH} className="size-4" /> : n}
                    </span>
                    {label}
                    {done && <span className="sr-only">(completo)</span>}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-5 hidden flex-col gap-2 rounded-lg border border-line bg-surface p-4.5 text-sm leading-normal text-muted md:flex">
            <strong className="text-base text-ink">Tu avance se guarda</strong>
            Puedes terminar después en este dispositivo. Tu anuncio se publica cuando conectas Mercado Pago.
          </div>
        </nav>

        {/* Content */}
        <div ref={headingRef} className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 [&_h1]:outline-none">
          {d.step === 1 && <SpaceStep d={d} set={set} />}
          {d.step === 2 && <AmenitiesStep d={d} set={set} amenities={amenities} />}
          {d.step === 3 && <GuestsStep d={d} set={set} maxGuests={MAX_GUESTS} />}
          {d.step === 4 && <ScheduleStep d={d} set={set} />}
          {d.step === 5 && <PriceStep d={d} set={set} rows={rows} />}
          {d.step === STEP_PAYOUTS && (
            <PayoutStep
              connected={payoutConnected}
              result={payoutResult}
              connecting={connecting}
              error={connectError}
              onConnect={connectPayouts}
              example={rows[2]}
            />
          )}
          {isReview && (
            <ReviewStep
              d={d}
              spaceLabel={space.label}
              amenityCount={d.amenityIds.length}
              hourly={hourly}
              connected={payoutConnected}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
            />
          )}

          {(stepProblem || (isReview && firstProblemStep) || submit.kind === 'error') && (
            <p
              role={submit.kind === 'error' ? 'alert' : 'status'}
              className="rounded-lg bg-amber-tint p-4 text-base font-semibold text-amber-ink"
            >
              {submit.kind === 'error'
                ? submit.message
                : (stepProblem ??
                  `Falta algo en «${STEPS[firstProblemStep - 1]}»: ${problems[firstProblemStep]}`)}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => go(d.step - 1)} disabled={d.step === 1} className={btnSecondary}>
              Atrás
            </button>
            <button
              type="button"
              onClick={isReview ? publish : () => go(d.step + 1)}
              disabled={!!stepProblem || (isReview && (!confirmed || submit.kind === 'saving'))}
              className={btnPrimary}
            >
              {nextLabel}
            </button>
          </div>
        </div>

        {/* Live price summary */}
        <aside aria-label="Precio sugerido" className="flex w-full flex-col gap-3.5 rounded-xl bg-ink p-6 text-surface md:max-w-[320px] md:flex-[1_1_260px]">
          <span className="text-xs font-bold tracking-widest text-amber uppercase">Sugerencia en vivo</span>
          <div className="flex items-baseline gap-1.5">
            <strong className="font-display text-5xl tracking-tight">{cop(hourly)}</strong>
            <span className="text-line-strong">/ hora</span>
          </div>
          <dl className="flex flex-col text-base">
            {(
              [
                [space.label, cop(SPACE_BASE_COP[d.space])],
                [`Comodidades (${d.amenityIds.length})`, `+ ${cop(addSum)}`],
                ['Demanda local', `× ${DEMAND_MULTIPLIER[d.demand].toFixed(2)}`],
                ['Tu ajuste', adjLabel],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-t border-ink-2 py-2.5">
                <dt className="text-line-strong">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <span className="text-sm leading-normal text-line-strong">Se actualiza mientras eliges tu espacio y tus comodidades.</span>
        </aside>
      </div>
    </>
  )
}

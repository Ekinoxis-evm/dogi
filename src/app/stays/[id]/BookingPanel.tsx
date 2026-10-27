'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePrivy } from '@privy-io/react-auth'
import { api } from '@/lib/client/api'
import { formatMoney, pesosToMinor } from '@/lib/money'
import { quoteStay, type StayLength } from '@/lib/pricing'
import { ICONS, Icon, STAY_LABEL, Star, score } from '../ui'

interface Props {
  listingId: string
  hostFirstName: string
  hourlyPesos: number
  maxGuests: number
  earliestDropoff: string // HH:MM
  latestPickup: string // HH:MM
  minStay: 'one_hour' | 'two_hours' | 'half_day'
  acceptsCats: boolean
  pawScore: number | null
}

interface Pet {
  id: string
  name: string
  species: 'dog' | 'cat' | 'small_pet'
  photo_url: string | null
}

interface Auth {
  ready: boolean
  authenticated: boolean
  login: () => void
}

// Hours each stay blocks on the host's calendar; must match STAY_HOURS in /api/bookings.
const STAY_HOURS: Record<Exclude<StayLength, 'drop_in'>, number> = { half_day: 5, full_day: 10, overnight: 14 }
const STAYS: { id: StayLength; sub: string }[] = [
  { id: 'drop_in', sub: '1 a 4 h' },
  { id: 'half_day', sub: 'hasta 5 h' },
  { id: 'full_day', sub: 'hasta 10 h' },
  { id: 'overnight', sub: 'hasta 14 h' },
]
const MIN_DROP_IN = { one_hour: 1, two_hours: 2, half_day: 99 } as const

const ERRORS: Record<string, string> = {
  host_payout_not_connected: 'Este anfitrión todavía no puede recibir pagos. Intenta más tarde o elige otro anfitrión.',
  too_many_pets: 'Elegiste más mascotas de las que este anfitrión recibe a la vez.',
  unknown_pet: 'No encontramos una de tus mascotas. Recarga la página e intenta de nuevo.',
  listing_unavailable: 'Este espacio ya no está disponible.',
  own_listing: 'No puedes reservar tu propio espacio.',
  unauthorized: 'Tu sesión expiró. Entra de nuevo para reservar.',
  invalid: 'Revisa la fecha y la hora de entrega.',
}

// Medellín is UTC-5 all year (no daylight saving), so the offset is fixed.
const TZ = 'America/Bogota'
const OFFSET = '-05:00'

function dayInBogota(offsetDays: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + offsetDays * 86_400_000))
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export default function BookingPanel(props: Props) {
  // Providers renders without PrivyProvider when the app id is missing; usePrivy would throw.
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <Panel {...props} auth={null} />
  return <PanelWithPrivy {...props} />
}

function PanelWithPrivy(props: Props) {
  const { ready, authenticated, login } = usePrivy()
  return <Panel {...props} auth={{ ready, authenticated, login }} />
}

function Panel({
  listingId, hostFirstName, hourlyPesos, maxGuests, earliestDropoff, latestPickup, minStay, acceptsCats, pawScore, auth,
}: Props & { auth: Auth | null }) {
  const minDropIn = MIN_DROP_IN[minStay]
  const [stay, setStay] = useState<StayLength>('full_day')
  const [dropInHours, setDropInHours] = useState(Math.min(4, Math.max(2, minDropIn)))
  const [date, setDate] = useState(() => dayInBogota(1))
  const [minDate] = useState(() => dayInBogota(0))
  const [time, setTime] = useState(earliestDropoff)
  const [pets, setPets] = useState<Pet[] | null>(null)
  const [petsError, setPetsError] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signedIn = !!auth?.ready && auth.authenticated

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    api('/api/me/pets')
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const body = (await r.json()) as { pets: Pet[] }
        if (!cancelled) setPets(body.pets)
      })
      .catch(() => {
        if (!cancelled) setPetsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn])

  const hours = stay === 'drop_in' ? dropInHours : STAY_HOURS[stay]

  // Drop-off times the host's window allows for this stay length, every 30 minutes.
  const times = useMemo(() => {
    const start = toMin(earliestDropoff)
    const end = toMin(latestPickup)
    const lastStart = stay === 'overnight' ? end : end - hours * 60
    const out: string[] = []
    for (let m = start; m <= lastStart; m += 30) out.push(toHHMM(m))
    return out
  }, [earliestDropoff, latestPickup, stay, hours])
  const effectiveTime = times.includes(time) ? time : times[0]

  const pickup = effectiveTime
    ? (() => {
        const end = toMin(effectiveTime) + hours * 60
        return `${end >= 24 * 60 ? 'día siguiente, ' : ''}${toHHMM(end % (24 * 60))}`
      })()
    : null

  const petCount = Math.max(1, picked.length)
  const quote = quoteStay(hourlyPesos, stay, petCount, stay === 'drop_in' ? dropInHours : 1)
  const cop = (pesos: number) => formatMoney(pesosToMinor(pesos), 'COP')
  const unit = stay === 'drop_in' ? `por ${dropInHours} h` : STAY_LABEL[stay].toLowerCase()

  function togglePet(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : cur.length >= maxGuests ? cur : [...cur, id]))
  }

  async function book() {
    setError(null)
    if (!auth) return
    if (!signedIn) return auth.login()
    if (!picked.length) return setError('Elige al menos una mascota.')
    if (!effectiveTime) return setError('Este horario no cabe en la ventana del anfitrión. Prueba una estadía más corta.')
    setBusy(true)
    try {
      const res = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
          stay,
          dropoffAt: `${date}T${effectiveTime}:00${OFFSET}`,
          dropInHours: stay === 'drop_in' ? dropInHours : undefined,
          petIds: picked,
          note: note.trim() || undefined,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string }
      if (res.ok && body.checkoutUrl) {
        window.location.assign(body.checkoutUrl)
        return
      }
      setError(ERRORS[body.error ?? ''] ?? 'No pudimos crear la reserva. Intenta de nuevo en un momento.')
    } catch {
      setError('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.')
    }
    setBusy(false)
  }

  const fieldLabel = 'flex flex-col gap-0.5 px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-ink-2'
  const fieldInput = 'min-h-8 w-full bg-transparent text-[15px] font-medium normal-case tracking-normal text-ink'

  return (
    <aside aria-label="Reserva una estadía"
      className="flex w-full flex-[1_1_340px] flex-col gap-4.5 rounded-2xl border border-line bg-surface p-6 shadow-raised lg:sticky lg:top-6 lg:max-w-[400px]">
      <div className="flex items-baseline justify-between gap-2">
        <span>
          <strong className="font-display text-[34px] tracking-tight" aria-live="polite">{cop(quote.total)}</strong>{' '}
          <span className="text-muted">{unit}</span>
        </span>
        {pawScore != null && (
          <span className="inline-flex items-center gap-1 text-[15px] font-bold">
            <Star /> <span className="sr-only">Paw Score</span>{score(pawScore)}
          </span>
        )}
      </div>

      <div role="group" aria-label="Duración de la estadía" className="grid grid-cols-2 gap-2">
        {STAYS.map((s) => {
          const disabled = s.id === 'drop_in' && minDropIn > 4
          const on = stay === s.id
          return (
            <button key={s.id} type="button" aria-pressed={on} disabled={disabled} onClick={() => setStay(s.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border-[1.5px] text-[15px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? 'border-brand bg-sunk' : 'border-line bg-surface hover:bg-canvas'
              }`}>
              {STAY_LABEL[s.id]}
              <span className="text-[13px] font-medium text-muted">{s.sub}</span>
            </button>
          )
        })}
      </div>

      {stay === 'drop_in' && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-line-strong px-3.5 py-2.5">
          <span className="text-[15px] font-bold">Horas</span>
          <Stepper value={dropInHours} min={minDropIn} max={4} onChange={setDropInHours} label="horas" />
        </div>
      )}

      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line-strong">
        <label className={`${fieldLabel} border-r border-line-strong focus-within:bg-canvas`}>
          Fecha
          <input type="date" value={date} min={minDate} required onChange={(e) => setDate(e.target.value)} className={fieldInput} />
        </label>
        <label className={`${fieldLabel} focus-within:bg-canvas`}>
          Entrega
          <select value={effectiveTime ?? ''} onChange={(e) => setTime(e.target.value)} className={fieldInput} disabled={!times.length}>
            {times.length ? times.map((t) => <option key={t} value={t}>{t}</option>) : <option value="">Sin horario</option>}
          </select>
        </label>
      </div>
      {pickup && <p className="-mt-2 text-sm text-muted">Recoges a las {pickup}.</p>}

      {/* Pets */}
      <fieldset className="flex flex-col gap-2.5 rounded-md border border-line-strong px-3.5 py-3">
        <legend className="px-1 text-[15px] font-bold">
          Mascotas <span className="font-normal text-muted">· hasta {maxGuests}</span>
        </legend>
        {!auth ? (
          <span className="text-sm text-muted">Las reservas abren muy pronto.</span>
        ) : !auth.ready ? (
          <span className="block h-11 rounded-md bg-sunk" aria-hidden="true" />
        ) : !auth.authenticated ? (
          <span className="text-sm text-muted">Entra para elegir a tus mascotas.</span>
        ) : petsError ? (
          <span className="text-sm text-muted">No pudimos cargar tus mascotas. Recarga la página.</span>
        ) : pets === null ? (
          <span className="block h-11 rounded-md bg-sunk" aria-hidden="true" />
        ) : pets.length === 0 ? (
          <span className="text-sm text-ink-2">
            Aún no tienes mascotas registradas. <Link href="/pets/new" className="font-bold">Crea su pasaporte</Link>
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pets.map((p) => {
              const on = picked.includes(p.id)
              const blocked = p.species === 'cat' && !acceptsCats
              const full = !on && picked.length >= maxGuests
              return (
                <button key={p.id} type="button" aria-pressed={on} disabled={blocked || full} onClick={() => togglePet(p.id)}
                  title={blocked ? `${hostFirstName} no recibe gatos` : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                    on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink hover:bg-sunk'
                  }`}>
                  {on && <Icon d={ICONS.check} size={16} />}
                  {p.name}
                  {blocked && <span className="sr-only"> (no acepta gatos)</span>}
                </button>
              )
            })}
          </div>
        )}
      </fieldset>

      {signedIn && (
        <label className="flex flex-col gap-1.5 text-[15px] font-bold">
          Nota para {hostFirstName} <span className="sr-only">(opcional)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2}
            placeholder="Opcional: rutinas, horario de comida…"
            className="rounded-md border border-line-strong px-3.5 py-2.5 text-[15px] font-normal placeholder:text-muted" />
        </label>
      )}

      {!auth ? (
        <button type="button" disabled
          className="min-h-13 rounded-md bg-brand text-[17px] font-bold text-white opacity-60">
          Reservas muy pronto
        </button>
      ) : !auth.ready ? (
        <span className="block min-h-13 rounded-md bg-sunk" aria-hidden="true" />
      ) : (
        <button type="button" onClick={book} disabled={busy}
          className="min-h-13 rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover disabled:opacity-60">
          {!auth.authenticated ? 'Entra para reservar' : busy ? 'Abriendo el pago…' : 'Reservar y pagar'}
        </button>
      )}
      {error && <p role="alert" className="-mt-1 rounded-md bg-amber-tint px-3.5 py-2.5 text-sm font-semibold text-amber-ink">{error}</p>}
      <span className="text-center text-sm text-muted">Pagas en Mercado Pago con tarjeta, PSE o Nequi.</span>

      <dl className="flex flex-col text-[15px]">
        <div className="flex justify-between py-2">
          <dt className="text-ink-2">{stay === 'drop_in' ? `${cop(hourlyPesos)} × ${dropInHours} h` : STAY_LABEL[stay]}</dt>
          <dd>{cop(quote.base)}</dd>
        </div>
        {quote.extraPets > 0 && (
          <div className="flex justify-between py-2">
            <dt className="text-ink-2">{petCount - 1 === 1 ? 'Mascota extra (+60 %)' : `${petCount - 1} mascotas extra (+60 % c/u)`}</dt>
            <dd>{cop(quote.extraPets)}</dd>
          </div>
        )}
        <div className="flex justify-between py-2">
          <dt className="text-ink-2">Tarifa de servicio</dt>
          <dd>Incluida</dd>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-line pt-3.5 text-lg">
          <dt className="font-bold">Total</dt>
          <dd className="font-bold">{cop(quote.total)}</dd>
        </div>
      </dl>

      <div className="flex gap-3 rounded-md bg-sunk p-3.5 text-sm leading-normal text-ink-2">
        <Icon d={ICONS.lock} size={20} className="shrink-0 text-brand" />
        <span>El pago se procesa de forma segura con Mercado Pago. Ves el total antes de pagar, sin cargos escondidos.</span>
      </div>
    </aside>
  )
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const btn = 'flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface text-xl text-ink hover:bg-sunk disabled:opacity-40'
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" className={btn} aria-label={`Menos ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <strong className="min-w-4 text-center text-lg" aria-live="polite">{value}</strong>
      <button type="button" className={btn} aria-label={`Más ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}

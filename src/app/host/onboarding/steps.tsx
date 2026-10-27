'use client'

import {
  DEMAND_MULTIPLIER,
  EXTRA_PET_SHARE,
  FAIR_RANGE,
  PLATFORM_FEE_SHARE,
  SPACE_BASE_COP,
  STAY_RULES,
  TIER_BONUS,
} from '@/lib/pricing'
import {
  AMENITY_DESC,
  DEMANDS,
  MIN_STAY,
  NOTICE,
  OTHER_PETS,
  PETS,
  SPACES,
  type Amenity,
  type Draft,
  type PayoutResult,
} from './copy'
import { CHECK_PATH, Card, Check, Chip, Icon, LOCK_PATH, StepHeader, Stepper, btnPrimary, cop, inputCls, labelCls } from './ui'

type SetDraft = (patch: Partial<Draft>) => void

const hostPct = Math.round((1 - PLATFORM_FEE_SHARE) * 100)
const feePct = Math.round(PLATFORM_FEE_SHARE * 100)

export function SpaceStep({ d, set }: { d: Draft; set: SetDraft }) {
  return (
    <Card>
      <StepHeader
        title="¿Qué tipo de espacio tendrán tus huéspedes?"
        lead="Esto define tu precio base sugerido. Elige el más parecido; los detalles van después."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        {SPACES.map((s) => {
          const on = d.space === s.id
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => set({ space: s.id })}
              className={`flex min-h-38 flex-col gap-2 rounded-lg border-2 p-5 text-left text-ink transition-colors ${
                on ? 'border-brand bg-sunk' : 'border-line bg-surface hover:bg-canvas'
              }`}
            >
              <Icon d={s.icon} />
              <strong className="text-lg">{s.label}</strong>
              <span className="text-sm leading-snug text-muted">{s.desc}</span>
              <span className="mt-auto text-sm font-bold text-brand">Base {cop(SPACE_BASE_COP[s.id])} / hora</span>
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <label className={labelCls}>
          Área que pueden usar (m²)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            value={d.areaM2}
            onChange={(e) => set({ areaM2: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            placeholder="45"
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Barrio en Medellín
          <input
            type="text"
            required
            maxLength={120}
            autoComplete="address-level3"
            value={d.neighbourhood}
            onChange={(e) => set({ neighbourhood: e.target.value })}
            placeholder="Laureles"
            className={inputCls}
          />
        </label>
        <label className={labelCls}>
          Otras mascotas en casa
          <select value={d.otherPets} onChange={(e) => set({ otherPets: e.target.value })} className={inputCls}>
            {OTHER_PETS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  )
}

export function AmenitiesStep({ d, set, amenities }: { d: Draft; set: SetDraft; amenities: Amenity[] | null }) {
  const toggle = (id: string) =>
    set({ amenityIds: d.amenityIds.includes(id) ? d.amenityIds.filter((x) => x !== id) : [...d.amenityIds, id] })
  return (
    <Card>
      <StepHeader
        title="¿Qué comodidades ofreces?"
        lead="Cada una suma a tu precio sugerido y aparece como filtro en la búsqueda. Marca solo lo que puedes dar en todas las estadías; la revisión del espacio lo confirma."
      />
      {amenities === null ? (
        <p role="alert" className="rounded-lg bg-amber-tint p-4 text-base text-amber-ink">
          No pudimos cargar las comodidades. Puedes seguir y agregarlas después, o recarga la página.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {amenities.map((a) => {
            const on = d.amenityIds.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={`flex min-h-18 items-center gap-3.5 rounded-lg border-2 px-4.5 py-4 text-left text-ink transition-colors ${
                  on ? 'border-brand bg-sunk' : 'border-line bg-surface hover:bg-canvas'
                }`}
              >
                <span
                  className={`flex size-6 flex-none items-center justify-center rounded-sm border-2 border-brand ${on ? 'bg-brand' : 'bg-surface'}`}
                >
                  {on && <Icon d={CHECK_PATH} className="size-4 text-surface" />}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <strong className="text-base">{a.label_es}</strong>
                  {AMENITY_DESC[a.id] && <span className="text-sm text-muted">{AMENITY_DESC[a.id]}</span>}
                </span>
                <span className="text-sm font-bold whitespace-nowrap text-brand">+ {cop(a.add_per_hour_cop)}/h</span>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export function GuestsStep({ d, set, maxGuests }: { d: Draft; set: SetDraft; maxGuests: number }) {
  const noneAccepted = !(d.accepts.smallDogs || d.accepts.mediumDogs || d.accepts.largeDogs || d.accepts.cats)
  return (
    <Card>
      <StepHeader title="¿Quién puede quedarse?" lead="Las solicitudes que no cumplan estas reglas nunca te llegan." />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-bold">Mascotas que aceptas</legend>
        <div className="flex flex-wrap gap-2.5">
          {PETS.map((p) => (
            <Chip key={p.id} pressed={d.accepts[p.id]} onClick={() => set({ accepts: { ...d.accepts, [p.id]: !d.accepts[p.id] } })}>
              {p.label}
            </Chip>
          ))}
        </div>
        {noneAccepted && <p className="text-sm font-semibold text-amber-ink">Elige al menos un tipo de perro o gatos.</p>}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-lg bg-canvas p-5">
        <div className="flex flex-col gap-1">
          <strong className="text-lg">Huéspedes al mismo tiempo</strong>
          <span className="text-sm text-muted">Los anfitriones nuevos empiezan con 1. Los anfitriones de confianza pueden recibir hasta 3.</span>
        </div>
        <Stepper
          value={d.guests}
          onDec={() => set({ guests: Math.max(1, d.guests - 1) })}
          onInc={() => set({ guests: Math.min(maxGuests, d.guests + 1) })}
          canDec={d.guests > 1}
          canInc={d.guests < maxGuests}
          decLabel="Menos huéspedes"
          incLabel="Más huéspedes"
        />
      </div>
    </Card>
  )
}

export function ScheduleStep({ d, set }: { d: Draft; set: SetDraft }) {
  const badHours = d.earliestDropoff >= d.latestPickup
  return (
    <Card>
      <StepHeader title="Horario y reglas de la casa" lead="Así los dueños saben cuándo pueden traer y recoger a su mascota." />
      <div className="flex flex-col gap-3">
        <strong className="text-lg">Horario para recibir</strong>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          <label className={`${labelCls} text-sm font-semibold`}>
            Entrega desde
            <input type="time" value={d.earliestDropoff} onChange={(e) => set({ earliestDropoff: e.target.value })} className={inputCls} />
          </label>
          <label className={`${labelCls} text-sm font-semibold`}>
            Recogida hasta
            <input
              type="time"
              value={d.latestPickup}
              onChange={(e) => set({ latestPickup: e.target.value })}
              aria-invalid={badHours}
              className={inputCls}
            />
          </label>
          <label className={`${labelCls} text-sm font-semibold`}>
            Estadía mínima
            <select value={d.minStay} onChange={(e) => set({ minStay: e.target.value as Draft['minStay'] })} className={inputCls}>
              {MIN_STAY.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelCls} text-sm font-semibold`}>
            Aviso previo
            <select value={d.notice} onChange={(e) => set({ notice: e.target.value as Draft['notice'] })} className={inputCls}>
              {NOTICE.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {badHours && <p className="text-sm font-semibold text-amber-ink">La hora de recogida debe ser después de la de entrega.</p>}
      </div>
      <div className="flex flex-col gap-2.5">
        <strong className="text-lg">Reglas de la casa</strong>
        <Check checked={d.requiresVaccines} onChange={(v) => set({ requiresVaccines: v })}>
          Carné de vacunas obligatorio
        </Check>
        <Check checked={d.requiresMeetGreet} onChange={(v) => set({ requiresMeetGreet: v })}>
          Encuentro de conocernos antes de la primera estadía
        </Check>
        <Check checked={d.requiresNeutered} onChange={(v) => set({ requiresNeutered: v })}>
          Solo mascotas esterilizadas
        </Check>
      </div>
    </Card>
  )
}

export interface PriceRow {
  label: string
  price: number
  earn: number
  lo: number
  hi: number
}

export function PriceStep({ d, set, rows }: { d: Draft; set: SetDraft; rows: PriceRow[] }) {
  const adjLabel = (d.adjustPct > 0 ? '+' : '') + d.adjustPct + '%'
  const atEdge = Math.abs(d.adjustPct) === 15
  return (
    <Card>
      <StepHeader
        title="Tu precio justo"
        lead="Lo sugerimos según tu espacio, tus comodidades y la demanda en tu zona. Empieza cerca de la sugerencia mientras ganas reseñas; tu nivel le suma automáticamente más adelante."
      />
      <div className="flex flex-wrap items-center gap-2.5" role="group" aria-labelledby="demand-label">
        <span id="demand-label" className="mr-1.5 text-base font-bold">
          Demanda en tu zona
        </span>
        {DEMANDS.map((x) => (
          <Chip key={x.id} pressed={d.demand === x.id} onClick={() => set({ demand: x.id })}>
            {x.label}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5 rounded-lg border border-line p-5">
            <span className="text-sm font-bold text-muted">{r.label}</span>
            <strong className="font-display text-3xl tracking-tight">{cop(r.price)}</strong>
            <span className="text-xs text-muted">
              Rango justo {cop(r.lo)}–{cop(r.hi)}
            </span>
            <span className="text-sm font-bold text-brand">Tú recibes {cop(r.earn)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-lg bg-canvas p-5">
        <div className="flex flex-col gap-1">
          <strong className="text-lg">Ajusta tu precio</strong>
          <span className="text-sm text-muted">
            {atEdge ? 'Este es el límite del rango justo para tu zona.' : 'Dentro del rango justo para tu zona.'}
          </span>
        </div>
        <Stepper
          value={adjLabel}
          onDec={() => set({ adjustPct: Math.max(-15, d.adjustPct - 5) })}
          onInc={() => set({ adjustPct: Math.min(15, d.adjustPct + 5) })}
          canDec={d.adjustPct > -15}
          canInc={d.adjustPct < 15}
          decLabel="Bajar el precio 5 por ciento"
          incLabel="Subir el precio 5 por ciento"
        />
      </div>
      <details className="rounded-lg border border-line px-5 py-4">
        <summary className="min-h-7 cursor-pointer text-base font-bold">Cómo lo calculamos</summary>
        <div className="flex flex-col gap-2 pt-3 text-base leading-relaxed text-ink-2">
          <span>
            Precio por hora = (base del espacio + comodidades) × demanda local ({DEMAND_MULTIPLIER.low} / {DEMAND_MULTIPLIER.standard} /{' '}
            {DEMAND_MULTIPLIER.high}). Medio día = {STAY_RULES.half_day.hours} h al {Math.round(STAY_RULES.half_day.share * 100)}%, día completo ={' '}
            {STAY_RULES.full_day.hours} h al {Math.round(STAY_RULES.full_day.share * 100)}%, noche = {STAY_RULES.overnight.hours} h al{' '}
            {Math.round(STAY_RULES.overnight.share * 100)}% del precio por hora.
          </span>
          <span>
            Cada mascota extra del mismo hogar suma {Math.round(EXTRA_PET_SHARE * 100)}%. Bono por nivel: De confianza +
            {Math.round(TIER_BONUS.trusted * 100)}%, Líder de manada +{Math.round(TIER_BONUS.pack_leader * 100)}%.
          </span>
          <span>
            El rango justo es ±{Math.round(FAIR_RANGE * 100)}% alrededor de la sugerencia. Los dueños pagan el precio, sin cobros escondidos; tú
            recibes el {hostPct}%.
          </span>
        </div>
      </details>
    </Card>
  )
}

export function PayoutStep({
  connected,
  result,
  connecting,
  error,
  onConnect,
  example,
}: {
  connected: boolean | null
  result: PayoutResult
  connecting: boolean
  error: string | null
  onConnect: () => void
  example: PriceRow | undefined
}) {
  return (
    <Card>
      <StepHeader
        title="Recibe tus pagos"
        lead={`Conecta tu cuenta de Mercado Pago. Recibes el ${hostPct}% de cada estadía directo en tu cuenta; Dogi se queda con el ${feePct}%.`}
      />
      {result === 'connected' && (
        <p role="status" className="rounded-lg bg-brand-tint p-4 text-base font-semibold text-brand-deep">
          ¡Listo! Tu cuenta de Mercado Pago quedó conectada.
        </p>
      )}
      {result === 'failed' && (
        <p role="alert" className="rounded-lg bg-amber-tint p-4 text-base font-semibold text-amber-ink">
          No pudimos conectar tu cuenta de Mercado Pago. Inténtalo otra vez.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-5">
        <span className="flex size-11 flex-none items-center justify-center rounded-md bg-sunk text-brand">
          <Icon d={LOCK_PATH} className="size-5.5" />
        </span>
        <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
          <strong className="text-base">Cuenta de Mercado Pago</strong>
          <span className={`text-sm ${connected ? 'font-semibold text-brand' : 'text-muted'}`}>
            {connected === null ? 'Revisando…' : connected ? 'Conectada' : 'Sin conectar'}
          </span>
        </div>
        {connected ? (
          <Icon d={CHECK_PATH} className="size-6 text-brand" />
        ) : (
          <button type="button" onClick={onConnect} disabled={connecting || connected === null} className={btnPrimary}>
            {connecting ? 'Abriendo Mercado Pago…' : 'Conectar Mercado Pago'}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-amber-ink">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2 text-base leading-relaxed text-ink-2">
        <li>
          • Cada pago se divide solo: el {hostPct}% va a tu cuenta y el {feePct}% a Dogi.
          {example && ` Por ejemplo, en un ${example.label.split(' · ')[0].toLowerCase()} de ${cop(example.price)} recibes ${cop(example.earn)}.`}
        </li>
        <li>• Los dueños pagan con tarjeta, PSE o Nequi. Tú no manejas efectivo.</li>
        <li>• Puedes terminar sin conectar: tu anuncio queda como borrador hasta que conectes tu cuenta.</li>
      </ul>
    </Card>
  )
}

export function ReviewStep({
  d,
  spaceLabel,
  amenityCount,
  hourly,
  connected,
  confirmed,
  setConfirmed,
}: {
  d: Draft
  spaceLabel: string
  amenityCount: number
  hourly: number
  connected: boolean | null
  confirmed: boolean
  setConfirmed: (v: boolean) => void
}) {
  const accepts = PETS.filter((p) => d.accepts[p.id])
    .map((p) => p.short)
    .join(', ')
  const rows: [string, React.ReactNode][] = [
    ['Espacio', spaceLabel],
    ['Barrio', d.neighbourhood.trim() ? `${d.neighbourhood.trim()}, Medellín` : 'Falta el barrio'],
    ['Comodidades', `${amenityCount} ${amenityCount === 1 ? 'elegida' : 'elegidas'}`],
    ['Acepta', accepts || 'Ninguna todavía'],
    ['Huéspedes a la vez', d.guests],
    ['Horario', `${d.earliestDropoff} – ${d.latestPickup}`],
    ['Precio por hora', cop(hourly)],
    ['Pagos', connected ? 'Mercado Pago conectado' : 'Sin conectar: quedará como borrador'],
  ]
  return (
    <Card>
      <StepHeader
        title="Revisa y publica"
        lead={
          <>
            {connected
              ? 'Tu anuncio sale publicado como '
              : 'Guardamos tu anuncio como borrador hasta que conectes Mercado Pago. Luego sales como '}
            <strong className="text-ink">Anfitrión nuevo</strong>. Después agendamos una revisión de 20 minutos por video de tu espacio.
          </>
        }
      />
      <dl className="flex flex-col">
        {rows.map(([k, v], i) => (
          <div key={k} className={`flex justify-between gap-4 py-4 text-base ${i < rows.length - 1 ? 'border-b border-sunk-2' : ''}`}>
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <label className="flex cursor-pointer items-start gap-3 text-base leading-normal">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 size-5.5 flex-none accent-brand"
        />
        Confirmo que la información y las comodidades son reales y acepto los Estándares de cuidado de Dogi.
      </label>
    </Card>
  )
}

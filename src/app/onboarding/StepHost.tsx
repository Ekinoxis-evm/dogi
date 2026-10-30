'use client'

import { useState } from 'react'
import { fairRange, hourlyRate, quoteStay, suggestedHourly } from '@/lib/pricing'
import { formatMoney, pesosToMinor } from '@/lib/money'
import type { HostData } from './types'

interface Props {
  data: HostData
  onChange: (patch: Partial<HostData>) => void
  onNext: () => void
  onBack: () => void
  saving: boolean
  error: string | null
}

const inputCls =
  'min-h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base font-normal text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelCls = 'flex flex-col gap-2 text-sm font-semibold text-ink-2'

const cop = (pesos: number) => formatMoney(pesosToMinor(pesos), 'COP')

const SPACES = [
  {
    id: 'house_with_yard' as const,
    label: 'Casa con patio',
    desc: 'Espacio interior con patio o jardín privado.',
    baseHour: 38000,
    icon: '🏡',
  },
  {
    id: 'apartment_pet_room' as const,
    label: 'Apartamento con cuarto',
    desc: 'Rincón o habitación dedicada para mascotas.',
    baseHour: 30000,
    icon: '🏢',
  },
  {
    id: 'house_no_yard' as const,
    label: 'Casa sin patio',
    desc: 'Espacio amplio interior; aire libre en paseos.',
    baseHour: 34000,
    icon: '🏠',
  },
  {
    id: 'dedicated_pet_space' as const,
    label: 'Espacio exclusivo para mascotas',
    desc: 'Lugar diseñado y acondicionado solo para ellas.',
    baseHour: 44000,
    icon: '✨',
  },
]

const OTHER_PETS_OPTIONS = ['Ninguna', 'Un perro amigable', 'Gato(s)']

export function StepHost({ data, onChange, onNext, onBack, saving, error }: Props) {
  const [attemptedNext, setAttemptedNext] = useState(false)

  // Pricing calculations
  const suggestedH = suggestedHourly(data.space, [], 'standard')
  const hourly = hourlyRate(suggestedH, data.priceAdjustPct)
  const overnightQuote = quoteStay(hourly, 'overnight', 1)
  const [fairLo, fairHi] = fairRange(quoteStay(suggestedH, 'overnight', 1).total)

  const acceptsAny =
    data.acceptsSmallDogs ||
    data.acceptsMediumDogs ||
    data.acceptsLargeDogs ||
    data.acceptsCats

  function handleContinue() {
    setAttemptedNext(true)
    if (data.wantsToHost === null) return
    if (data.wantsToHost === false) {
      onNext()
      return
    }
    if (acceptsAny && !saving) {
      onNext()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          ¿Te gustaría hospedar mascotas?
        </h1>
        <p className="text-base text-muted sm:text-lg">
          Puedes ganar dinero recibiendo perros y gatos en tu hogar en Medellín. Tú decides tus horarios y a quién aceptas.
        </p>
      </div>

      {/* Decision Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange({ wantsToHost: true })}
          className={`flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
            data.wantsToHost === true
              ? 'border-brand bg-sunk shadow-card'
              : 'border-line bg-surface hover:border-line-strong hover:bg-canvas'
          }`}
        >
          <span className="text-3xl" role="img" aria-label="Casa">
            🏡
          </span>
          <div className="flex flex-col">
            <strong className="text-lg text-ink">Sí, quiero ser anfitrión Dogi</strong>
            <span className="text-sm text-muted">
              Publica tu espacio, define tu tarifa por noche y recibe pagos seguros.
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ wantsToHost: false })}
          className={`flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
            data.wantsToHost === false
              ? 'border-brand bg-sunk shadow-card'
              : 'border-line bg-surface hover:border-line-strong hover:bg-canvas'
          }`}
        >
          <span className="text-3xl" role="img" aria-label="Mascota">
            🐾
          </span>
          <div className="flex flex-col">
            <strong className="text-lg text-ink">No por ahora</strong>
            <span className="text-sm text-muted">
              Solo seré dueño de mascota o explorador en la plataforma.
            </span>
          </div>
        </button>
      </div>

      {attemptedNext && data.wantsToHost === null && (
        <p className="text-sm font-semibold text-amber-ink">
          Por favor selecciona si te interesa ser anfitrión o no.
        </p>
      )}

      {/* Host details Form */}
      {data.wantsToHost === true && (
        <section className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2 border-b border-sunk-2 pb-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand">
              🏠
            </span>
            <h2 className="font-display text-xl font-bold text-ink">Detalles de tu espacio y alquiler</h2>
          </div>

          {/* Space type */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-ink-2">Tipo de vivienda</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SPACES.map((s) => {
                const active = data.space === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChange({ space: s.id })}
                    className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                      active
                        ? 'border-brand bg-sunk shadow-card'
                        : 'border-line bg-surface hover:border-line-strong hover:bg-canvas'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{s.icon}</span>
                      <strong className="text-base text-ink">{s.label}</strong>
                    </div>
                    <span className="text-xs text-muted">{s.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Área estimada para huéspedes (m²)
              <input
                type="number"
                min="10"
                max="1000"
                placeholder="Ej. 65"
                value={data.areaM2}
                onChange={(e) => onChange({ areaM2: e.target.value })}
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              Otras mascotas en casa
              <select
                value={data.otherPets}
                onChange={(e) => onChange({ otherPets: e.target.value })}
                className={inputCls}
              >
                {OTHER_PETS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Sizes accepted */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-ink-2">Mascotas que aceptas en tu casa *</span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'acceptsSmallDogs' as const, label: 'Perros pequeños (< 10 kg)' },
                { key: 'acceptsMediumDogs' as const, label: 'Perros medianos (10–25 kg)' },
                { key: 'acceptsLargeDogs' as const, label: 'Perros grandes (> 25 kg)' },
                { key: 'acceptsCats' as const, label: 'Gatos' },
                { key: 'acceptsPuppies' as const, label: 'Cachorros' },
                { key: 'acceptsSeniors' as const, label: 'Mascotas mayores' },
              ].map(({ key, label }) => {
                const active = data[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ [key]: !active })}
                    className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                      active
                        ? 'border-brand bg-brand text-surface'
                        : 'border-line-strong bg-surface text-ink hover:bg-sunk'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {label}
                  </button>
                )
              })}
            </div>
            {attemptedNext && !acceptsAny && (
              <p className="text-xs font-semibold text-amber-ink">
                Por favor selecciona al menos un tamaño de perro o gatos.
              </p>
            )}
          </div>

          {/* Night price definition card */}
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-canvas p-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-widest text-amber-ink uppercase">
                Definición de tarifa por noche
              </span>
              <h3 className="font-display text-2xl font-bold text-ink">Tu precio por noche</h3>
              <p className="text-sm text-muted">
                Calculado con base en tu tipo de vivienda y la demanda en Medellín. El rango justo recomendado para tu zona es de {cop(fairLo)} a {cop(fairHi)}.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col rounded-lg border border-line bg-surface p-4">
                <span className="text-xs font-semibold text-muted">Precio al huésped por noche</span>
                <strong className="font-display text-3xl font-extrabold text-ink">
                  {cop(overnightQuote.total)}
                </strong>
                <span className="text-xs text-muted">Incluye soporte y cobertura Dogi</span>
              </div>

              <div className="flex flex-col rounded-lg border border-brand/20 bg-brand-tint/40 p-4">
                <span className="text-xs font-bold text-brand">Tú recibes directamente (90%)</span>
                <strong className="font-display text-3xl font-extrabold text-brand">
                  {cop(overnightQuote.hostPayout)}
                </strong>
                <span className="text-xs text-muted">Dogi retiene solo el 10% de tarifa de servicio</span>
              </div>
            </div>

            {/* Adjust price stepper */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-surface p-4">
              <div className="flex flex-col">
                <strong className="text-sm text-ink">Ajustar tarifa (±15%)</strong>
                <span className="text-xs text-muted">
                  Ajuste actual: {data.priceAdjustPct > 0 ? `+${data.priceAdjustPct}%` : `${data.priceAdjustPct}%`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.priceAdjustPct <= -15}
                  onClick={() => onChange({ priceAdjustPct: Math.max(-15, data.priceAdjustPct - 5) })}
                  className="flex size-10 items-center justify-center rounded-full border border-line-strong bg-surface text-lg font-bold text-ink hover:bg-sunk disabled:opacity-40"
                  aria-label="Disminuir tarifa"
                >
                  −
                </button>
                <span className="min-w-16 text-center text-sm font-bold text-ink">
                  {data.priceAdjustPct > 0 ? `+${data.priceAdjustPct}%` : `${data.priceAdjustPct}%`}
                </span>
                <button
                  type="button"
                  disabled={data.priceAdjustPct >= 15}
                  onClick={() => onChange({ priceAdjustPct: Math.min(15, data.priceAdjustPct + 5) })}
                  className="flex size-10 items-center justify-center rounded-full border border-line-strong bg-surface text-lg font-bold text-ink hover:bg-sunk disabled:opacity-40"
                  aria-label="Aumentar tarifa"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-amber-tint p-4 text-sm font-semibold text-amber-ink">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-13 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-base font-bold text-ink transition-colors hover:bg-sunk"
        >
          Atrás
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || data.wantsToHost === null || (data.wantsToHost && !acceptsAny)}
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-brand px-8 text-base font-bold text-surface transition-colors hover:bg-brand-hover active:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Finalizar registro'}
        </button>
      </div>
    </div>
  )
}

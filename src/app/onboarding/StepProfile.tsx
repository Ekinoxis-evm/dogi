'use client'

import { COUNTRY_CODES, type ProfileData } from './types'

interface Props {
  data: ProfileData
  onChange: (patch: Partial<ProfileData>) => void
  onNext: () => void
  saving: boolean
  error: string | null
}

const inputCls =
  'min-h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base font-normal text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelCls = 'flex flex-col gap-2 text-sm font-semibold text-ink-2'

export function StepProfile({ data, onChange, onNext, saving, error }: Props) {
  const isFormValid =
    data.firstName.trim().length >= 2 &&
    data.lastName.trim().length >= 2 &&
    data.phone.trim().length >= 7 &&
    data.neighbourhood.trim().length >= 2

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isFormValid && !saving) {
      onNext()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Cuéntanos sobre ti
        </h1>
        <p className="text-base text-muted sm:text-lg">
          Para que tu comunidad en Medellín sepa quién eres y podamos comunicarnos contigo de forma segura.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Nombre *
          <input
            type="text"
            required
            autoComplete="given-name"
            placeholder="Ej. Camila"
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            className={inputCls}
          />
        </label>

        <label className={labelCls}>
          Apellidos *
          <input
            type="text"
            required
            autoComplete="family-name"
            placeholder="Ej. Gómez Restrepo"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-2">Número de teléfono móvil *</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
          <label className="sr-only">Indicativo de país</label>
          <select
            value={data.phoneCountryCode}
            onChange={(e) => onChange({ phoneCountryCode: e.target.value })}
            className={`${inputCls} cursor-pointer font-medium`}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.name.split(' ')[0]})
              </option>
            ))}
          </select>

          <label className="sr-only">Número celular</label>
          <input
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel-national"
            placeholder="300 123 4567"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d\s-]/g, '') })}
            className={inputCls}
          />
        </div>
        <span className="text-xs text-muted">
          Solo compartimos tu teléfono con anfitriones o clientes cuando una estadía está confirmada.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>
          Correo electrónico
          <div className="relative">
            <input
              type="email"
              disabled
              value={data.email}
              className={`${inputCls} cursor-not-allowed bg-sunk/60 text-muted opacity-90`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand">
              Cuenta vinculada
            </span>
          </div>
        </label>
        <span className="text-xs text-muted">
          Este correo proviene de tu inicio de sesión y se usa para recibos y notificaciones de estadías.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Ciudad
          <input
            type="text"
            disabled
            value={data.city}
            className={`${inputCls} cursor-not-allowed bg-sunk/60 text-muted opacity-90`}
          />
        </label>

        <label className={labelCls}>
          Barrio en Medellín *
          <input
            type="text"
            required
            autoComplete="address-level3"
            placeholder="Ej. Laureles, Poblado, Belén..."
            value={data.neighbourhood}
            onChange={(e) => onChange({ neighbourhood: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-amber-tint p-4 text-sm font-semibold text-amber-ink">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end pt-4">
        <button
          type="submit"
          disabled={!isFormValid || saving}
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-brand px-8 text-base font-bold text-surface transition-colors hover:bg-brand-hover active:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </form>
  )
}

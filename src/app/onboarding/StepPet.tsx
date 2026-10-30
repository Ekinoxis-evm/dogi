'use client'

import { useState } from 'react'
import type { DogData } from './types'

interface Props {
  data: DogData
  onChange: (patch: Partial<DogData>) => void
  onNext: () => void
  onBack: () => void
  saving: boolean
  error: string | null
}

const inputCls =
  'min-h-12 w-full rounded-md border border-line-strong bg-surface px-3.5 text-base font-normal text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
const labelCls = 'flex flex-col gap-2 text-sm font-semibold text-ink-2'

const ENERGY_LEVELS = [
  { level: 1, label: 'De sofá', desc: 'Duerme mucho, paseos suaves' },
  { level: 2, label: 'Tranquilo', desc: 'Calmado en casa' },
  { level: 3, label: 'Moderado', desc: 'Juega y descansa' },
  { level: 4, label: 'Activo', desc: 'Le encanta correr y jugar' },
  { level: 5, label: 'Atleta', desc: 'Energía inagotable' },
]

export function StepPet({ data, onChange, onNext, onBack, saving, error }: Props) {
  const [attemptedNext, setAttemptedNext] = useState(false)

  const isDogValid =
    data.enrollDog === false ||
    (data.enrollDog === true &&
      data.name.trim().length >= 1 &&
      (!data.weightKg || (Number(data.weightKg) > 0 && Number(data.weightKg) <= 150)))

  function handleContinue() {
    setAttemptedNext(true)
    if (data.enrollDog === null) return
    if (isDogValid && !saving) {
      onNext()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          ¿Tienes un perrito o mascota?
        </h1>
        <p className="text-base text-muted sm:text-lg">
          Puedes registrar a tu perro ahora para crear su pasaporte y encontrarle estadías con vecinos verificados en Medellín.
        </p>
      </div>

      {/* Decision Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange({ enrollDog: true })}
          className={`flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
            data.enrollDog === true
              ? 'border-brand bg-sunk shadow-card'
              : 'border-line bg-surface hover:border-line-strong hover:bg-canvas'
          }`}
        >
          <span className="text-3xl" role="img" aria-label="Perro">
            🐶
          </span>
          <div className="flex flex-col">
            <strong className="text-lg text-ink">Sí, quiero registrar a mi perro</strong>
            <span className="text-sm text-muted">
              Crea su pasaporte digital con su rutina, salud y comportamiento.
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ enrollDog: false })}
          className={`flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
            data.enrollDog === false
              ? 'border-brand bg-sunk shadow-card'
              : 'border-line bg-surface hover:border-line-strong hover:bg-canvas'
          }`}
        >
          <span className="text-3xl" role="img" aria-label="Mochila">
            ⏭️
          </span>
          <div className="flex flex-col">
            <strong className="text-lg text-ink">No por ahora</strong>
            <span className="text-sm text-muted">
              Solo quiero explorar o registrarme como anfitrión para recibir mascotas.
            </span>
          </div>
        </button>
      </div>

      {attemptedNext && data.enrollDog === null && (
        <p className="text-sm font-semibold text-amber-ink">
          Por favor elige si deseas registrar una mascota o continuar sin ella.
        </p>
      )}

      {/* Dog Info Form */}
      {data.enrollDog === true && (
        <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2 border-b border-sunk-2 pb-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand">
              🐾
            </span>
            <h2 className="font-display text-xl font-bold text-ink">Pasaporte Canino</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Nombre del perro *
              <input
                type="text"
                required
                placeholder="Ej. Bruno"
                value={data.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              Raza o mezcla
              <input
                type="text"
                placeholder="Ej. Criollo, Golden Retriever, Pomerania..."
                value={data.breed}
                onChange={(e) => onChange({ breed: e.target.value })}
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelCls}>
              Fecha de nacimiento (o aprox.)
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={data.birthday}
                onChange={(e) => onChange({ birthday: e.target.value })}
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              Peso aproximado (kg)
              <input
                type="number"
                min="0.5"
                max="120"
                step="0.5"
                placeholder="Ej. 14"
                value={data.weightKg}
                onChange={(e) => onChange({ weightKg: e.target.value })}
                className={inputCls}
              />
            </label>

            <label className={labelCls}>
              Sexo
              <select
                value={data.sex}
                onChange={(e) => onChange({ sex: e.target.value as DogData['sex'] })}
                className={inputCls}
              >
                <option value="">Selecciona</option>
                <option value="male">Macho</option>
                <option value="female">Hembra</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-2">¿Está esterilizado / castrado?</span>
            <div className="flex gap-3">
              {(['yes', 'no'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange({ neutered: opt })}
                  className={`min-h-11 flex-1 rounded-lg border px-4 text-sm font-semibold transition-colors ${
                    data.neutered === opt
                      ? 'border-brand bg-brand text-surface'
                      : 'border-line-strong bg-surface text-ink hover:bg-sunk'
                  }`}
                >
                  {opt === 'yes' ? 'Sí, esterilizado/a' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Energy level */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-2">Nivel de energía</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ENERGY_LEVELS.map((item) => {
                const active = data.energy === item.level
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => onChange({ energy: item.level })}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors ${
                      active
                        ? 'border-brand bg-brand text-surface'
                        : 'border-line-strong bg-surface text-ink hover:bg-sunk'
                    }`}
                  >
                    <span className="font-display text-lg font-bold">{item.level}</span>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Social behavior */}
          <div className="flex flex-col gap-3 rounded-lg bg-canvas p-4">
            <span className="text-sm font-bold text-ink">Sociabilidad y convivencia</span>
            {[
              { key: 'goodWithDogs' as const, label: '¿Se lleva bien con otros perros?' },
              { key: 'goodWithCats' as const, label: '¿Se lleva bien con gatos?' },
              { key: 'goodWithKids' as const, label: '¿Se lleva bien con niños?' },
            ].map(({ key, label }) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5 last:border-0 last:pb-0">
                <span className="text-sm text-ink-2">{label}</span>
                <div className="flex gap-1.5">
                  {(
                    [
                      { id: 'yes', label: 'Sí' },
                      { id: 'unsure', label: 'No sé' },
                      { id: 'no', label: 'No' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ [key]: opt.id })}
                      className={`min-h-9 rounded-md px-3 text-xs font-semibold ${
                        data[key] === opt.id
                          ? 'bg-brand text-surface'
                          : 'border border-line-strong bg-surface text-ink hover:bg-sunk'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <label className={labelCls}>
            Notas sobre su rutina o cuidados especiales (opcional)
            <textarea
              rows={2}
              placeholder="Ej. Come 2 veces al día, le gusta pasear con arnés, se asusta con truenos..."
              value={data.routineNotes}
              onChange={(e) => onChange({ routineNotes: e.target.value })}
              className="w-full rounded-md border border-line-strong bg-surface p-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
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
          disabled={saving || data.enrollDog === null || (data.enrollDog && !data.name.trim())}
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-brand px-8 text-base font-bold text-surface transition-colors hover:bg-brand-hover active:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}

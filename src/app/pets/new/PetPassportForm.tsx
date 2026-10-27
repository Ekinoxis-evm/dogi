'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { api } from '@/lib/client/api'
import {
  ENERGY,
  SPECIES,
  TRI,
  VACCINE_BADGE,
  VACCINE_LABEL,
  WATCH_OUTS,
  ageLabel,
  formatMonthYear,
  speciesLabel,
  vaccineState,
  vaccinesFor,
  type Species,
  type Tri,
  type Vaccine,
  type WatchOut,
} from './labels'

interface Form {
  species: Species
  name: string
  breed: string
  birthday: string
  weightKg: string
  sex: '' | 'female' | 'male'
  neutered: '' | 'yes' | 'no'
  microchip: string
  energy: number | null
  goodWithDogs: Tri
  goodWithCats: Tri
  goodWithKids: Tri
  watchOuts: WatchOut[]
  meals: string
  walks: string
  potty: string
  sleep: string
  calming: string
  medication: string
  allergies: string
  vetClinic: string
  vetPhone: string
  emergencyContact: string
  authoriseVet: boolean
  vetCapCop: string
  vaccines: Partial<Record<Vaccine, string>>
}

const INITIAL: Form = {
  species: 'dog',
  name: '',
  breed: '',
  birthday: '',
  weightKg: '',
  sex: '',
  neutered: '',
  microchip: '',
  energy: null,
  goodWithDogs: 'unsure',
  goodWithCats: 'unsure',
  goodWithKids: 'unsure',
  watchOuts: [],
  meals: '',
  walks: '',
  potty: '',
  sleep: '',
  calming: '',
  medication: '',
  allergies: '',
  vetClinic: '',
  vetPhone: '',
  emergencyContact: '',
  authoriseVet: true,
  vetCapCop: '1200000',
  vaccines: {},
}

const STEPS = ['Datos básicos', 'Salud', 'Comportamiento', 'Rutina', 'Listo'] as const

const input =
  'min-h-12 w-full rounded-md border border-line-strong bg-surface px-4 text-base font-normal text-ink placeholder:text-muted'
const textarea =
  'w-full rounded-md border border-line-strong bg-surface px-4 py-3 text-base font-normal text-ink placeholder:text-muted'
const label = 'flex flex-col gap-2 text-sm font-semibold text-ink-2'
const card = 'flex flex-col gap-6 rounded-xl bg-surface p-6 shadow-card sm:p-9'

function chip(on: boolean) {
  return `min-h-11 rounded-full border px-4 text-base font-semibold ${
    on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink hover:bg-sunk'
  }`
}

export default function PetPassportForm() {
  const [f, setF] = useState<Form>(INITIAL)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Partial<Record<'name' | 'weightKg' | 'microchip' | 'vetCapCop', string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((prev) => ({ ...prev, [k]: v }))
  const petName = f.name.trim() || 'tu mascota'

  function go(n: number) {
    setStep(n)
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  function validateBasics(): boolean {
    const e: typeof errors = {}
    if (!f.name.trim()) e.name = 'Escribe el nombre de tu mascota.'
    if (f.weightKg && !(Number(f.weightKg) > 0 && Number(f.weightKg) <= 150)) e.weightKg = 'Escribe un peso entre 0,1 y 150 kg.'
    if (f.microchip && !/^[0-9A-Za-z]{9,20}$/.test(f.microchip.trim())) e.microchip = 'El microchip suele tener 15 dígitos, sin espacios.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateRoutine(): boolean {
    const cap = Number(f.vetCapCop)
    if (f.authoriseVet && !(Number.isInteger(cap) && cap > 0 && cap <= 20_000_000)) {
      setErrors({ vetCapCop: 'Escribe un monto en pesos, sin puntos ni comas.' })
      return false
    }
    setErrors({})
    return true
  }

  async function submit() {
    if (!validateBasics()) return go(1)
    if (!validateRoutine()) return
    setSaving(true)
    setSaveError(null)
    const opt = (s: string) => (s.trim() ? s.trim() : undefined)
    const payload = {
      species: f.species,
      name: f.name.trim(),
      breed: opt(f.breed),
      birthday: opt(f.birthday),
      weightKg: f.weightKg ? Number(f.weightKg) : undefined,
      sex: f.sex || undefined,
      neutered: f.neutered ? f.neutered === 'yes' : undefined,
      microchip: opt(f.microchip),
      energy: f.energy ?? undefined,
      goodWithDogs: f.goodWithDogs,
      goodWithCats: f.goodWithCats,
      goodWithKids: f.goodWithKids,
      watchOuts: f.watchOuts,
      meals: opt(f.meals),
      walks: opt(f.walks),
      potty: opt(f.potty),
      sleep: opt(f.sleep),
      calming: opt(f.calming),
      medication: opt(f.medication),
      allergies: opt(f.allergies),
      vetClinic: opt(f.vetClinic),
      vetPhone: opt(f.vetPhone),
      emergencyContact: opt(f.emergencyContact),
      emergencyVetCapCop: f.authoriseVet ? Number(f.vetCapCop) : undefined,
      vaccines: vaccinesFor(f.species).flatMap((v) => (f.vaccines[v] ? [{ vaccine: v, validUntil: f.vaccines[v] }] : [])),
    }
    try {
      const res = await api('/api/pets', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) {
        setSaveError(
          res.status === 401
            ? 'Tu sesión expiró. Vuelve a entrar e inténtalo de nuevo.'
            : res.status === 400
              ? 'Hay un dato que no pudimos guardar. Revisa los pasos e inténtalo de nuevo.'
              : 'No pudimos guardar el pasaporte. Inténtalo de nuevo en un momento.',
        )
        return
      }
      const { id } = (await res.json()) as { id: string }
      setCreatedId(id)
      go(5)
    } catch {
      setSaveError('Sin conexión. Revisa tu internet e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function next() {
    if (step === 1 && !validateBasics()) return
    if (step === 4) return void submit()
    go(Math.min(4, step + 1))
  }

  const filled = [
    f.name.trim(),
    f.breed.trim(),
    f.birthday,
    f.weightKg,
    f.sex,
    f.neutered,
    f.energy,
    Object.values(f.vaccines).some(Boolean) || f.species === 'small_pet',
    f.vetClinic.trim(),
    f.meals.trim(),
    f.walks.trim(),
    f.emergencyContact.trim(),
  ]
  const completePct = Math.round((filled.filter(Boolean).length / filled.length) * 100)
  const vaccinesCurrent =
    vaccinesFor(f.species).length > 0 && vaccinesFor(f.species).every((v) => vaccineState(f.vaccines[v]) === 'current')

  return (
    <div ref={topRef} className="scroll-mt-4">
      <div className="h-1 bg-sunk-2" aria-hidden="true">
        <div className="h-1 bg-brand transition-[width] duration-300" style={{ width: `${(step / 5) * 100}%` }} />
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-4 pb-16 pt-10 sm:px-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <nav aria-label="Pasos del pasaporte" className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => {
              const n = i + 1
              const current = n === step
              const done = n < step || (createdId !== null && n < 5)
              const locked = createdId ? n !== 5 : n === 5
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => go(n)}
                  disabled={locked}
                  aria-current={current ? 'step' : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold disabled:cursor-not-allowed ${
                    current ? 'border-brand bg-brand text-white' : done ? 'border-line-strong bg-sunk text-ink' : 'border-line-strong bg-surface text-ink'
                  } ${locked && !current ? 'opacity-60' : ''}`}
                >
                  <span aria-hidden="true">{done ? '✓' : n}</span>
                  {s}
                </button>
              )
            })}
          </nav>

          {step === 1 && (
            <section className={card} aria-labelledby="s1">
              <Intro id="s1" title="Conozcamos a tu mascota">
                Un solo pasaporte, compartido con cada anfitrión que reserves. Lo llenas una vez.
              </Intro>
              <div className="flex flex-wrap items-center gap-6">
                <div
                  className="flex size-32 flex-none items-center justify-center rounded-xl border border-dashed border-line-strong bg-sunk text-center text-sm font-semibold text-muted"
                  aria-hidden="true"
                >
                  Foto pronto
                </div>
                <div className="flex flex-[1_1_260px] flex-col gap-3">
                  <span className="text-sm font-semibold text-ink-2" id="species-l">
                    Especie
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby="species-l">
                    {SPECIES.map((s) => (
                      <button key={s.id} type="button" aria-pressed={f.species === s.id} onClick={() => set('species', s.id)} className={chip(f.species === s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <Field label="Nombre" error={errors.name}>
                  <input className={input} value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" required aria-invalid={!!errors.name} />
                </Field>
                <Field label="Raza o mezcla">
                  <input className={input} value={f.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Criollo, labrador, mezcla…" />
                </Field>
                <Field label="Fecha de nacimiento (aproximada)">
                  <input className={input} type="date" value={f.birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('birthday', e.target.value)} />
                </Field>
                <Field label="Peso (kg)" error={errors.weightKg}>
                  <input className={input} type="number" inputMode="decimal" min="0.1" max="150" step="0.1" value={f.weightKg} onChange={(e) => set('weightKg', e.target.value)} aria-invalid={!!errors.weightKg} />
                </Field>
                <Field label="Sexo">
                  <select className={input} value={f.sex} onChange={(e) => set('sex', e.target.value as Form['sex'])}>
                    <option value="">Elige una opción</option>
                    <option value="female">Hembra</option>
                    <option value="male">Macho</option>
                  </select>
                </Field>
                <Field label="¿Está esterilizada o castrado?">
                  <select className={input} value={f.neutered} onChange={(e) => set('neutered', e.target.value as Form['neutered'])}>
                    <option value="">Elige una opción</option>
                    <option value="yes">Sí</option>
                    <option value="no">No</option>
                  </select>
                </Field>
              </div>
              <Field
                label={
                  <>
                    Número de microchip <span className="font-normal text-muted">(opcional; el anfitrión lo ve solo durante una estadía confirmada)</span>
                  </>
                }
                error={errors.microchip}
              >
                <input className={input} inputMode="numeric" placeholder="15 dígitos" value={f.microchip} onChange={(e) => set('microchip', e.target.value)} aria-invalid={!!errors.microchip} />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className={card} aria-labelledby="s2">
              <Intro id="s2" title="Salud y veterinario">
                La mayoría de anfitriones piden las vacunas básicas al día. Escribe hasta cuándo es válida cada una.
              </Intro>
              {vaccinesFor(f.species).length > 0 ? (
                <div className="flex flex-col overflow-hidden rounded-lg border border-line">
                  {vaccinesFor(f.species).map((v, i, all) => {
                    const st = vaccineState(f.vaccines[v])
                    const badge = VACCINE_BADGE[st]
                    return (
                      <div key={v} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${i < all.length - 1 ? 'border-b border-sunk-2' : ''}`}>
                        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                          <strong className="text-base text-ink">{VACCINE_LABEL[v]}</strong>
                          <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
                            Vigente hasta
                            <input
                              type="date"
                              className="min-h-11 rounded-md border border-line-strong bg-surface px-3 text-base text-ink"
                              value={f.vaccines[v] ?? ''}
                              onChange={(e) => set('vaccines', { ...f.vaccines, [v]: e.target.value })}
                            />
                          </label>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${badge.className}`}>
                          {badge.label}
                          {st !== 'missing' && f.vaccines[v] ? ` · ${formatMonthYear(f.vaccines[v]!)}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-sunk p-4 text-base text-ink-2">Para mascotas pequeñas no pedimos vacunas. Cuéntale al anfitrión lo importante en la medicación y las alergias.</p>
              )}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                <Field label="Medicación">
                  <textarea className={textarea} rows={3} placeholder="Nombre, dosis y hora" value={f.medication} onChange={(e) => set('medication', e.target.value)} />
                </Field>
                <Field label="Alergias y condiciones">
                  <textarea className={textarea} rows={3} placeholder="Ej.: alergia al pollo, displasia de cadera" value={f.allergies} onChange={(e) => set('allergies', e.target.value)} />
                </Field>
                <Field label="Clínica veterinaria">
                  <input className={input} value={f.vetClinic} onChange={(e) => set('vetClinic', e.target.value)} placeholder="Ej.: Clínica Veterinaria Laureles" />
                </Field>
                <Field label="Teléfono del veterinario">
                  <input className={input} type="tel" inputMode="tel" placeholder="+57 …" value={f.vetPhone} onChange={(e) => set('vetPhone', e.target.value)} />
                </Field>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className={card} aria-labelledby="s3">
              <Intro id="s3" title="Personalidad y comportamiento">
                Responder con honestidad trae mejores anfitriones. Ellos comparan esto con cómo salió la estadía.
              </Intro>
              <div className="flex flex-col gap-4">
                {(
                  [
                    ['goodWithDogs', 'Se lleva bien con perros'],
                    ['goodWithCats', 'Se lleva bien con gatos'],
                    ['goodWithKids', 'Se lleva bien con niños'],
                  ] as const
                ).map(([k, l]) => (
                  <div key={k} className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-base text-ink">{l}</strong>
                    <div role="group" aria-label={l} className="flex gap-1 rounded-full bg-sunk p-1">
                      {TRI.map((o) => {
                        const on = f[k] === o.id
                        return (
                          <button
                            key={o.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set(k, o.id)}
                            className={`min-h-11 min-w-16 rounded-full px-4 text-base ${on ? 'bg-surface font-bold text-ink shadow-card' : 'font-medium text-ink-2 hover:text-ink'}`}
                          >
                            {o.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <strong className="text-base text-ink" id="energy-l">
                  Nivel de energía
                </strong>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-labelledby="energy-l">
                  {ENERGY.map((l, i) => {
                    const on = f.energy === i + 1
                    return (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set('energy', on ? null : i + 1)}
                        className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-sm font-semibold ${
                          on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface text-ink hover:bg-sunk'
                        }`}
                      >
                        <span className="font-display text-xl font-bold">{i + 1}</span>
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>
              <fieldset className="flex flex-col gap-1 rounded-lg border border-line p-5">
                <legend className="px-1 text-base font-bold text-ink">¿Algo que el anfitrión deba saber?</legend>
                {WATCH_OUTS.map((w) => {
                  const on = f.watchOuts.includes(w.id)
                  return (
                    <label key={w.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
                      <input
                        type="checkbox"
                        className="size-5 accent-brand"
                        checked={on}
                        onChange={() => set('watchOuts', on ? f.watchOuts.filter((x) => x !== w.id) : [...f.watchOuts, w.id])}
                      />
                      {w.label}
                    </label>
                  )
                })}
              </fieldset>
            </section>
          )}

          {step === 4 && (
            <section className={card} aria-labelledby="s4">
              <Intro id="s4" title="Rutina diaria">
                Mantener la rutina es la forma más fácil de que una mascota esté tranquila en un lugar nuevo.
              </Intro>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <Field label="Comidas">
                  <input className={input} placeholder="8:00 y 18:00 · 1 taza de concentrado" value={f.meals} onChange={(e) => set('meals', e.target.value)} />
                </Field>
                <Field label="Paseos">
                  <input className={input} placeholder="2 × 30 min, con arnés" value={f.walks} onChange={(e) => set('walks', e.target.value)} />
                </Field>
                <Field label="Salidas al baño">
                  <input className={input} placeholder="Cada 4 horas" value={f.potty} onChange={(e) => set('potty', e.target.value)} />
                </Field>
                <Field label="Dónde duerme">
                  <input className={input} placeholder="En su guacal, con la puerta abierta" value={f.sleep} onChange={(e) => set('sleep', e.target.value)} />
                </Field>
              </div>
              <Field label="Qué le da calma">
                <textarea className={textarea} rows={3} placeholder="Un juguete favorito, una cobija que huela a casa, música suave…" value={f.calming} onChange={(e) => set('calming', e.target.value)} />
              </Field>
              <div className="flex flex-col gap-3 rounded-lg bg-canvas p-5">
                <strong className="text-base text-ink">Permisos de emergencia</strong>
                <Field label="Contacto de emergencia si no te podemos localizar">
                  <input className={input} placeholder="Nombre y teléfono" value={f.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} />
                </Field>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base text-ink">
                  <input type="checkbox" className="mt-0.5 size-5 flex-none accent-brand" checked={f.authoriseVet} onChange={(e) => set('authoriseVet', e.target.checked)} />
                  <span>Autorizo al anfitrión a llevar a mi mascota al veterinario en una emergencia, hasta el monto de abajo, que pago yo.</span>
                </label>
                {f.authoriseVet && (
                  <Field label="Monto máximo autorizado (COP)" error={errors.vetCapCop}>
                    <input
                      className={`${input} max-w-xs`}
                      inputMode="numeric"
                      value={f.vetCapCop}
                      onChange={(e) => set('vetCapCop', e.target.value.replace(/\D/g, ''))}
                      aria-invalid={!!errors.vetCapCop}
                    />
                  </Field>
                )}
              </div>
              {saveError && (
                <p role="alert" className="rounded-lg bg-amber-tint p-4 text-base font-semibold text-amber-ink">
                  {saveError}
                </p>
              )}
            </section>
          )}

          {step === 5 && createdId && (
            <section className={`${card} gap-5`} aria-labelledby="s5">
              <h1 id="s5" className="font-display text-4xl font-bold tracking-tight text-ink">
                El pasaporte de {petName} está listo
              </h1>
              <p className="text-lg text-ink-2">
                Los anfitriones lo ven antes de aceptar. Después de cada estadía, el anfitrión suma al <strong className="text-ink">historial de buen huésped</strong> de {petName}: qué tanto coincidió con el pasaporte, cómo se portó y si la recogiste a tiempo.
              </p>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                <Tier title="Empieza como «Nuevo huésped»">Estadías de hasta 5 horas con cualquier anfitrión hasta la primera reseña.</Tier>
                <Tier title="3 buenas estadías → «Buen huésped»">Reserva inmediata con los anfitriones que la permitan.</Tier>
                <Tier title="10 buenas estadías → «Huésped estrella»">5% menos en la tarifa de servicio y prioridad en días de alta demanda.</Tier>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/pets/${createdId}`} className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
                  Ver el perfil de {petName}
                </Link>
                <Link href="/" className="inline-flex min-h-12 items-center rounded-full border border-line-strong bg-surface px-6 font-bold text-ink hover:bg-sunk hover:text-ink">
                  Buscar una estadía
                </Link>
              </div>
            </section>
          )}

          {step < 5 && (
            <div className="flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() => go(Math.max(1, step - 1))}
                disabled={step === 1}
                className="min-h-12 rounded-full border border-line-strong bg-surface px-6 font-bold text-ink hover:bg-sunk disabled:invisible"
              >
                Atrás
              </button>
              <button type="button" onClick={next} disabled={saving} className="min-h-12 rounded-full bg-brand px-7 font-bold text-white hover:bg-brand-hover disabled:opacity-70">
                {step === 4 ? (saving ? 'Guardando…' : 'Terminar pasaporte') : 'Continuar'}
              </button>
            </div>
          )}
        </div>

        <aside aria-label="Vista previa del pasaporte" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
            <div className="flex h-40 items-end bg-brand-tint p-4" role="img" aria-label={`Sin foto todavía: ${petName}`}>
              <span className="rounded-sm bg-surface px-2 py-1 text-xs font-semibold text-ink-2">Foto: {petName}</span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="font-display text-2xl font-bold text-ink">{f.name.trim() || 'Sin nombre'}</strong>
                <span className="rounded-full bg-amber-tint px-3 py-1 text-xs font-bold text-amber-ink">Nuevo huésped</span>
              </div>
              <span className="text-sm text-muted">
                {[speciesLabel(f.species), f.breed.trim(), f.weightKg && `${f.weightKg} kg`, ageLabel(f.birthday)].filter(Boolean).join(' · ')}
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm text-ink-2">
                  <span>Pasaporte completo</span>
                  <strong>{completePct}%</strong>
                </div>
                <div className="h-2 rounded-full bg-sunk-2">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${completePct}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {f.energy && <Pill>Energía {ENERGY[f.energy - 1].toLowerCase()}</Pill>}
                <Pill>Perros: {TRI.find((t) => t.id === f.goodWithDogs)!.label.toLowerCase()}</Pill>
                {vaccinesCurrent && <Pill>Vacunas al día</Pill>}
              </div>
            </div>
          </div>
          <p className="rounded-lg bg-sunk p-4 text-sm text-ink-2">
            El microchip y tus teléfonos de emergencia solo los ven los anfitriones con una reserva confirmada.
          </p>
        </aside>
      </div>
    </div>
  )
}

function Intro({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={id} className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="text-base text-muted sm:text-lg">{children}</p>
    </div>
  )
}

function Field({ label: l, error, children }: { label: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <label className={label}>
      <span>{l}</span>
      {children}
      {error && (
        <span role="alert" className="text-sm font-semibold text-amber-ink">
          {error}
        </span>
      )}
    </label>
  )
}

function Tier({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-sunk p-4">
      <strong className="text-base text-ink">{title}</strong>
      <span className="text-sm text-ink-2">{children}</span>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-sunk px-3 py-1 text-sm font-semibold text-brand">{children}</span>
}

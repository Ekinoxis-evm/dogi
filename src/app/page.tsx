import Link from 'next/link'
import { CityMapHero } from '@/components/CityMapHero'
import { formatMoney, pesosToMinor } from '@/lib/money'
import { SPACE_BASE_COP, STAY_RULES, quoteStay, suggestedHourly, hourlyRate } from '@/lib/pricing'
import { PAW_WEIGHTS } from '@/lib/reputation'
import { getLiveListings } from './stays/listing-data'
import {
  AmenityIcon, CATEGORY_LABEL, Eyebrow, ICONS, Icon, TierBadge,
} from './stays/ui'

// Data is cached for about a minute inside getLiveListings ('use cache' + cacheLife).
// With cacheComponents on, that replaces `export const revalidate = 60`, which would
// fail the build under this config.

const cop = (pesos: number) => formatMoney(pesosToMinor(pesos), 'COP')

const SPACES = Object.values(SPACE_BASE_COP)
const LOW = Math.min(...SPACES)
const HIGH = Math.max(...SPACES)
const range = (stay: 'half_day' | 'full_day' | 'overnight') =>
  `${cop(quoteStay(LOW, stay, 1).base)}–${cop(quoteStay(HIGH, stay, 1).base)}`

const STAY_TYPES = [
  { title: 'Por horas', body: 'De 1 a 4 horas. Una reunión, una cita médica, una vuelta rápida.', price: `${cop(LOW)}–${cop(HIGH)}`, unit: '/ hora' },
  { title: 'Medio día', body: `Hasta ${STAY_RULES.half_day.hours} horas, con una comida y un paseo.`, price: range('half_day'), unit: '' },
  { title: 'Día completo', body: `Hasta ${STAY_RULES.full_day.hours} horas. Jornadas de trabajo, eventos, paseos de un día.`, price: range('full_day'), unit: '' },
  { title: 'Noche', body: 'Hasta la mañana siguiente. Vuelos temprano, regresos tarde.', price: range('overnight'), unit: '', dark: true },
]

const STEPS = [
  { n: '01', title: 'Crea el pasaporte de tu mascota', body: 'Vacunas, carácter, rutina y veterinario. Lo llenas una vez y lo ve cada anfitrión.' },
  { n: '02', title: 'Elige anfitrión y horario', body: 'Mira el espacio, las comodidades y el nivel del anfitrión. Reserva desde una hora.' },
  { n: '03', title: 'Paga seguro', body: 'Con tarjeta, PSE o Nequi a través de Mercado Pago. Ves el total antes de pagar.' },
  { n: '04', title: 'Recoge y califica', body: 'Al terminar, calificas la estadía. El anfitrión también califica a tu mascota.' },
]

const TIERS = [
  { tier: 'new_host' as const, rule: 'Identidad y espacio revisados. Recibe 1 huésped a la vez.', perk: 'Empieza con el precio sugerido' },
  { tier: 'rising' as const, rule: '3 o más estadías completadas y Paw Score de 4,3 o más.', perk: 'Más visibilidad en Dogi' },
  { tier: 'trusted' as const, rule: '10 o más estadías, Paw Score de 4,6 o más y certificado de primeros auxilios.', perk: '+5 % sobre el precio sugerido · hasta 3 huéspedes' },
  { tier: 'pack_leader' as const, rule: '25 o más estadías y Paw Score de 4,8 o más.', perk: '+12 % sobre el precio sugerido · destacado en búsquedas', dark: true },
]

const AMENITIES = [
  { id: 'fenced_yard', label: 'Patio cerrado', detail: 'Totalmente encerrado, con la altura indicada' },
  { id: 'climate', label: 'Clima controlado', detail: 'Aire o ventilación adentro' },
  { id: 'live_camera', label: 'Cámara en vivo', detail: 'Míralo desde tu celular' },
  { id: 'walks', label: 'Paseos incluidos', detail: 'Con correa, siempre acompañado' },
  { id: 'first_aid', label: 'Primeros auxilios', detail: 'Certificado verificado' },
  { id: 'quiet_room', label: 'Cuarto de descanso', detail: 'Separado de otros huéspedes' },
  { id: 'meds_diets', label: 'Medicinas y dietas', detail: 'Horarios de comida y dosis' },
  { id: 'vet_nearby', label: 'Veterinaria cerca', detail: 'Clínica a menos de 2 km' },
]

const FAQS = [
  { q: '¿Qué pasa si llego tarde a recogerlo?', a: 'Avísale al anfitrión por el chat de la reserva. El tiempo extra se cobra por cada 30 minutos a la tarifa acordada, nunca como una multa fija.' },
  { q: '¿Cómo pago?', a: 'Con tarjeta, PSE o Nequi a través de Mercado Pago. Ves el total antes de pagar y no hay cargos escondidos.' },
  { q: '¿Qué mascotas pueden quedarse?', a: 'Perros, gatos y mascotas pequeñas, según cada anfitrión. Cada perfil muestra qué tamaños acepta y cuántos huéspedes recibe a la vez.' },
  { q: '¿Y si mi mascota toma medicamentos?', a: 'Anota dosis y horarios en su pasaporte. Los anfitriones con «Medicinas y dietas» confirmaron que pueden darlos a tiempo.' },
  { q: '¿Puedo conocer al anfitrión antes?', a: 'Sí. Escríbele antes de tu primera reserva; algunos anfitriones piden un encuentro corto antes de la primera estadía.' },
]

// Pricing example in COP: house with yard + fenced yard + walks, Trusted tier.
const EX_BASE = SPACE_BASE_COP.house_with_yard
const EX_YARD = 6000
const EX_WALKS = 5000
const EX_SUGGESTED = hourlyRate(suggestedHourly('house_with_yard', [EX_YARD, EX_WALKS], 'standard'), 0, 'trusted')

export default async function Home() {
  const listings = await getLiveListings(8)

  return (
    <div className="bg-surface">
      {/* Utility bar */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-2.5 text-sm sm:px-6">
          <Icon d={ICONS.lock} size={16} className="shrink-0 text-amber" />
          <span>Pagas seguro con tarjeta, PSE o Nequi a través de Mercado Pago.</span>
        </div>
      </div>

      {/* Interactive Hero with City Selector & Map, wrapping Trust, Stays & How-it-works */}
      <CityMapHero initialListings={listings}>
        {/* Trust strip */}
        <section aria-label="Por qué Dogi" className="border-b border-line">
          <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {[
              { icon: ICONS.id, title: 'Anfitriones verificados', body: 'Revisamos identidad y dirección antes de la primera reserva.' },
              { icon: ICONS.home, title: 'Espacio revisado', body: 'Cercas, riesgos y salidas revisados con fotos.' },
              { icon: ICONS.lock, title: 'Pago seguro', body: 'Tarjeta, PSE o Nequi con Mercado Pago. Sin efectivo.' },
              { icon: ICONS.camera, title: 'Siempre al tanto', body: 'Chat con el anfitrión en cada reserva.' },
            ].map((t) => (
              <div key={t.title} className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-sunk text-brand">
                  <Icon d={t.icon} size={24} />
                </span>
                <div>
                  <strong className="block text-[17px]">{t.title}</strong>
                  <span className="text-[15px] leading-normal text-muted">{t.body}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stay types */}
        <section id="estadias" className="pb-10 pt-24">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
                <Eyebrow>Estadías a la medida de tu día</Eyebrow>
                <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                  Reserva justo el tiempo que necesitas. Nada más.
                </h2>
              </div>
              <a href="#precios" className="inline-flex min-h-11 items-center gap-1.5 font-bold">
                Cómo sugerimos los precios <Icon d={ICONS.arrow} size={18} />
              </a>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STAY_TYPES.map((s) => (
                <article key={s.title}
                  className={`flex flex-col gap-3.5 rounded-xl p-7 ${s.dark ? 'bg-ink text-white' : 'bg-sunk text-ink'}`}>
                  <span className="font-display text-[26px] font-bold">{s.title}</span>
                  <span className={`text-base leading-normal ${s.dark ? 'text-line' : 'text-muted'}`}>{s.body}</span>
                  <span className={`mt-auto text-[15px] ${s.dark ? 'text-line' : 'text-muted'}`}>
                    Sugerido <strong className={`text-lg ${s.dark ? 'text-white' : 'text-ink'}`}>{s.price}</strong> {s.unit}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-18">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 sm:px-6">
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Cómo funciona</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="flex flex-col gap-3.5 border-t-2 border-ink pt-5">
                  <span className="font-display text-[44px] font-extrabold leading-none text-brand">{s.n}</span>
                  <strong className="text-xl">{s.title}</strong>
                  <span className="text-base leading-relaxed text-muted">{s.body}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </CityMapHero>

      {/* Reputation */}
      <section id="reputacion" className="py-24">
        <div className="mx-auto grid max-w-[1240px] gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Eyebrow>Confianza y reputación</Eyebrow>
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              La reputación se gana estadía por estadía, de los dos lados.
            </h2>
            <p className="text-lg leading-relaxed text-ink-2">
              Cada reserva completada cierra con una calificación en ambas direcciones. Los anfitriones ganan un{' '}
              <strong className="text-ink">Paw Score</strong> y suben de nivel; las mascotas construyen un historial de{' '}
              <strong className="text-ink">buen huésped</strong> que les abre más puertas. Solo califican estadías
              pagadas y completadas, así que no se pueden comprar ni inventar.
            </p>
            <div className="flex flex-col gap-3.5 rounded-xl bg-canvas p-6">
              <strong className="text-lg">De qué está hecho el Paw Score</strong>
              {(Object.keys(PAW_WEIGHTS) as (keyof typeof PAW_WEIGHTS)[]).map((k) => {
                const w = PAW_WEIGHTS[k]
                return (
                  <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-[15px]">
                    <span className="font-semibold">{CATEGORY_LABEL[k]}</span>
                    <span className="h-2 rounded-full bg-sunk-2">
                      <span className="block h-2 rounded-full bg-brand" style={{ width: `${(w / PAW_WEIGHTS.pet_care) * 100}%` }} />
                    </span>
                    <span className="text-right font-bold">{Math.round(w * 100)} %</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <strong className="text-lg">Niveles de anfitrión</strong>
            {TIERS.map((t) => (
              <div key={t.tier}
                className={`flex flex-col gap-2 rounded-lg border p-5 ${t.dark ? 'border-ink bg-ink text-white' : 'border-line bg-surface'}`}>
                <TierBadge tier={t.tier} className="self-start" />
                <span className={`text-base leading-normal ${t.dark ? 'text-line' : 'text-ink-2'}`}>{t.rule}</span>
                <span className={`text-sm font-semibold ${t.dark ? 'text-amber' : 'text-brand'}`}>{t.perk}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-sunk py-22">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <Eyebrow>Comodidades</Eyebrow>
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Encuentra el espacio que tu mascota de verdad necesita.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {AMENITIES.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 rounded-lg bg-surface p-5 shadow-card">
                <span className="text-brand"><AmenityIcon id={a.id} size={28} /></span>
                <strong className="text-base">{a.label}</strong>
                <span className="text-sm text-muted">{a.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fair pricing */}
      <section id="precios" className="py-24">
        <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Eyebrow>Precios justos</Eyebrow>
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Justo para el anfitrión. Claro para ti.
            </h2>
            <p className="text-lg leading-relaxed text-ink-2">
              Sugerimos un precio para cada espacio según lo que de verdad ofrece: el tipo de espacio, sus comodidades,
              el nivel del anfitrión y la demanda en el barrio. El anfitrión puede ajustarlo un poco, y tú siempre ves
              el total antes de reservar.
            </p>
            <ul className="flex flex-col gap-3.5 text-base leading-normal">
              {[
                ['El anfitrión recibe el 90 %', 'del precio de la estadía. El 10 % cubre pagos, soporte y la garantía.'],
                ['Más horas, menos por hora:', 'las estadías largas salen más baratas por hora.'],
                ['Recoger tarde se cobra por cada 30 minutos', 'a la tarifa acordada, nunca como multa fija.'],
              ].map(([b, rest]) => (
                <li key={b} className="flex gap-3">
                  <Icon d={ICONS.check} size={22} className="shrink-0 text-brand" />
                  <span><strong>{b}</strong> {rest}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-7 shadow-raised">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-lg">Ejemplo de sugerencia</strong>
              <span className="text-sm text-muted">Tarifa por hora · 1 perro mediano</span>
            </div>
            <dl className="flex flex-col text-[15px]">
              {[
                ['Casa con patio · base', cop(EX_BASE)],
                ['Patio cerrado', `+ ${cop(EX_YARD)}`],
                ['Paseos incluidos', `+ ${cop(EX_WALKS)}`],
                ['Nivel De confianza', '+ 5 %'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-sunk-2 py-2.5">
                  <dt className="text-ink-2">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 pt-3.5 text-lg">
                <dt className="font-bold">Precio sugerido</dt>
                <dd className="font-bold">{cop(EX_SUGGESTED)} / hora</dd>
              </div>
            </dl>
            <Link href="/host/onboarding"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
              Calcula el precio de tu espacio <Icon d={ICONS.arrow} size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Become a host */}
      <section id="hospeda" className="px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-[1240px] overflow-hidden rounded-2xl bg-brand lg:grid-cols-2">
          <div className="flex flex-col gap-5 p-8 text-white sm:p-14">
            <h2 className="font-display text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
              ¿Tienes un espacio para mascotas? Gana con las horas que pasas en casa.
            </h2>
            <p className="text-lg leading-relaxed text-brand-tint">
              Tú pones el horario, las mascotas que aceptas y cuántas a la vez. El registro toma unos 15 minutos;
              apareces en Dogi cuando aprobamos tu identidad y tu espacio.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/host/onboarding"
                className="inline-flex min-h-13 items-center rounded-full bg-surface px-6 font-bold text-ink hover:bg-sunk hover:text-ink">
                Empieza a hospedar
              </Link>
              <a href="#reputacion"
                className="inline-flex min-h-13 items-center rounded-full border-2 border-brand-tint/60 px-6 font-bold text-white hover:bg-brand-hover hover:text-white">
                Cómo funcionan los niveles
              </a>
            </div>
          </div>
          <div aria-hidden="true" className="relative min-h-75 bg-brand-tint">
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
              <circle cx="80" cy="70" r="40" className="fill-amber-tint" />
              <path d="M0 220 C 100 180, 220 230, 400 190 V300 H0z" className="fill-line-strong" />
            </svg>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="ayuda" className="bg-canvas py-22">
        <div className="mx-auto flex max-w-[880px] flex-col gap-7 px-4 sm:px-6">
          <h2 className="font-display text-4xl font-extrabold tracking-tight">Lo que preguntan los tutores</h2>
          <div className="flex flex-col">
            {FAQS.map((f, i) => (
              <details key={f.q} open={i === 0} className="group border-b border-line">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-bold text-ink [&::-webkit-details-marker]:hidden">
                  <span>{f.q}</span>
                  <Icon d={ICONS.chevron} size={22} className="shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mb-5 max-w-3xl text-[17px] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <span className="font-display text-xl font-extrabold">Dogi</span>
              <span className="text-[15px] text-muted">Estadías cortas y seguras para mascotas, con vecinos verificados.</span>
            </div>
            <FooterNav title="Tutores" links={[['#anfitriones', 'Encuentra una estadía'], ['/pets/new', 'Crea el pasaporte de tu mascota'], ['#reputacion', 'Confianza y reputación']]} />
            <FooterNav title="Anfitriones" links={[['/host/onboarding', 'Publica tu espacio'], ['#precios', 'Guía de precios'], ['#reputacion', 'Niveles de anfitrión']]} />
            <FooterNav title="Ayuda" links={[['#ayuda', 'Preguntas frecuentes'], ['/chat', 'Pregúntale a Dogi']]} />
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-6 text-sm text-muted">
            <span>© 2026 Dogi · Medellín, Colombia</span>
            <span>Pagos procesados por Mercado Pago</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterNav({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-1">
      <strong className="mb-1 text-[15px]">{title}</strong>
      {links.map(([href, label]) =>
        href.startsWith('#') ? (
          <a key={label} href={href} className="inline-flex min-h-11 items-center text-[15px]">{label}</a>
        ) : (
          <Link key={label} href={href} className="inline-flex min-h-11 items-center text-[15px]">{label}</Link>
        ),
      )}
    </nav>
  )
}

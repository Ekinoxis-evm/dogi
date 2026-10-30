'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ListingCard } from '@/app/stays/listing-data'
import { ICONS, Icon, SPACE_LABEL, Star, TierBadge, score } from '@/app/stays/ui'
import { formatMoney } from '@/lib/money'

export type CityKey = 'medellin' | 'bogota' | 'cali'

interface NeighbourhoodPin {
  name: string
  zone: string
  hostsCount: number
  x: number // percentage
  y: number // percentage
  featured?: boolean
}

interface CityData {
  key: CityKey
  name: string
  headline: string
  department: string
  badge: string
  description: string
  neighbourhoods: NeighbourhoodPin[]
}

export const CITIES: Record<CityKey, CityData> = {
  medellin: {
    key: 'medellin',
    name: 'Medellín',
    headline: 'Valle de Aburrá',
    department: 'Antioquia',
    badge: 'Ciudad central · Laureles & Poblado',
    description: 'Encuentra vecinos con patios cerrados y espacios frescos en los barrios más tranquilos.',
    neighbourhoods: [
      { name: 'Laureles', zone: 'Comuna 11', hostsCount: 6, x: 38, y: 46, featured: true },
      { name: 'El Poblado', zone: 'Comuna 14', hostsCount: 8, x: 64, y: 65, featured: true },
      { name: 'Belén', zone: 'Comuna 16', hostsCount: 4, x: 32, y: 68 },
      { name: 'Envigado', zone: 'Sur Aburrá', hostsCount: 5, x: 72, y: 84 },
      { name: 'Estadio', zone: 'Comuna 12', hostsCount: 3, x: 42, y: 32 },
    ],
  },
  bogota: {
    key: 'bogota',
    name: 'Bogotá',
    headline: 'Distrito Capital',
    department: 'Cundinamarca',
    badge: 'Zona Norte & Chapinero',
    description: 'Anfitriones con áreas interiores abrigadas y cercanía a los mejores parques caninos.',
    neighbourhoods: [
      { name: 'Chapinero Alto', zone: 'Localidad 2', hostsCount: 5, x: 52, y: 58, featured: true },
      { name: 'Usaquén', zone: 'Localidad 1', hostsCount: 7, x: 58, y: 28, featured: true },
      { name: 'Rosales / Chicó', zone: 'Zona G y 93', hostsCount: 6, x: 50, y: 42, featured: true },
      { name: 'Cedritos', zone: 'Norte', hostsCount: 4, x: 56, y: 16 },
      { name: 'Teusaquillo', zone: 'Parkway', hostsCount: 3, x: 42, y: 72 },
    ],
  },
  cali: {
    key: 'cali',
    name: 'Cali',
    headline: 'Valle del Cauca',
    department: 'Valle',
    badge: 'Oeste & Ciudad Jardín',
    description: 'Casas con ventilación natural, sombra y jardines seguros para los días calurosos.',
    neighbourhoods: [
      { name: 'Granada', zone: 'Comuna 2', hostsCount: 4, x: 48, y: 36, featured: true },
      { name: 'El Peñón', zone: 'Comuna 3', hostsCount: 5, x: 44, y: 48, featured: true },
      { name: 'San Antonio', zone: 'Oeste histórico', hostsCount: 3, x: 38, y: 55, featured: true },
      { name: 'Ciudad Jardín', zone: 'Comuna 22', hostsCount: 6, x: 62, y: 82 },
      { name: 'Santa Teresita', zone: 'Río Cali', hostsCount: 2, x: 34, y: 40 },
    ],
  },
}

interface Props {
  initialListings: ListingCard[]
  children?: React.ReactNode
}

export function CityMapHero({ initialListings, children }: Props) {
  const [selectedCity, setSelectedCity] = useState<CityKey>('medellin')
  const [activePin, setActivePin] = useState<NeighbourhoodPin | null>(null)
  const [stayDuration, setStayDuration] = useState('half_day')

  const currentCity = CITIES[selectedCity]

  // Filter listings for the chosen city (case-insensitive)
  const cityListings = initialListings.filter((l) =>
    l.city?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
      currentCity.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )
  )

  const totalCityHosts = currentCity.neighbourhoods.reduce((acc, n) => acc + n.hostsCount, 0)

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-sunk pb-16 pt-12 sm:pt-16">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 sm:px-6">
          {/* City Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-tint text-base text-brand">
                📍
              </span>
              <span className="text-xs font-bold tracking-widest text-muted uppercase">
                Selecciona tu ciudad:
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Ciudades disponibles"
              className="flex flex-wrap items-center gap-2 rounded-full border border-line-strong bg-surface p-1.5 shadow-sm"
            >
              {(Object.keys(CITIES) as CityKey[]).map((cityKey) => {
                const c = CITIES[cityKey]
                const isActive = selectedCity === cityKey
                return (
                  <button
                    key={cityKey}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => {
                      setSelectedCity(cityKey)
                      setActivePin(null)
                    }}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-brand text-surface shadow-card'
                        : 'text-ink-2 hover:bg-sunk hover:text-ink'
                    }`}
                  >
                    <span>{cityKey === 'medellin' ? '⛰️' : cityKey === 'bogota' ? '🏙️' : '🌴'}</span>
                    <span>{c.name}</span>
                    {isActive && (
                      <span className="hidden rounded-full bg-surface/20 px-2 py-0.5 text-xs text-surface sm:inline-block">
                        {c.department}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hero Grid: Left Content, Right Interactive Map */}
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left: Headline & Search */}
            <div className="flex flex-col gap-6 lg:col-span-6 xl:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-bold text-brand">
                  <Icon d={ICONS.clock} size={14} />
                  Estadías por horas y noche
                </span>
                <span className="rounded-full bg-amber-tint px-3 py-1 text-xs font-bold text-amber-ink">
                  {currentCity.badge}
                </span>
              </div>

              <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl xl:text-6xl">
                Cuidado de mascotas con vecinos de confianza en{' '}
                <span className="text-brand underline decoration-amber decoration-4 underline-offset-4">
                  {currentCity.name}
                </span>
                .
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
                {currentCity.description} Reserva desde 1 hora hasta varias noches con pago protegido y anfitriones verificados.
              </p>

              {/* Quick Search Form */}
              <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-raised sm:p-6">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold tracking-wider text-muted uppercase">
                    ¿Qué tipo de estadía buscas en {currentCity.name}?
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'hourly', label: 'Por horas (1–4 h)' },
                      { id: 'half_day', label: 'Medio día' },
                      { id: 'full_day', label: 'Día completo' },
                      { id: 'overnight', label: 'Noche' },
                    ].map((item) => {
                      const isChecked = stayDuration === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStayDuration(item.id)}
                          className={`min-h-10 rounded-full border px-4 text-xs font-bold transition-all sm:text-sm ${
                            isChecked
                              ? 'border-brand bg-brand text-surface'
                              : 'border-line-strong bg-surface text-ink hover:bg-sunk'
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sunk-2 pt-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                    <span className="inline-block size-2 rounded-full bg-brand animate-pulse" />
                    <span>{totalCityHosts} anfitriones registrados en {currentCity.name}</span>
                  </div>

                  <a
                    href="#anfitriones"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-surface transition-colors hover:bg-brand-hover active:bg-brand-deep"
                  >
                    <Icon d={ICONS.search} size={18} />
                    Ver anfitriones en {currentCity.name}
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Interactive City Map */}
            <div className="relative lg:col-span-6 xl:col-span-5">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-line bg-surface p-4 shadow-raised sm:aspect-square">
                {/* Stylized Vector Map Canvas */}
                <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#F0F5F2]">
                  {/* Decorative Map Grid & Topography */}
                  <svg
                    viewBox="0 0 400 400"
                    className="absolute inset-0 h-full w-full opacity-60"
                    aria-hidden="true"
                  >
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D5E2D9" strokeWidth="0.8" />
                      </pattern>
                      <linearGradient id="valleyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1E5B45" stopOpacity="0.08" />
                        <stop offset="50%" stopColor="#1E5B45" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="#1E5B45" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>

                    <rect width="400" height="400" fill="url(#grid)" />

                    {/* City Topography / River Curve based on City */}
                    {selectedCity === 'medellin' && (
                      <>
                        {/* Cordilleras */}
                        <path
                          d="M-20 420 C 80 320, 100 240, 160 160 S 260 80, 420 -20 L 420 420 Z"
                          fill="url(#valleyGrad)"
                        />
                        {/* Medellín River */}
                        <path
                          d="M 50 420 C 140 320, 170 230, 220 150 S 300 60, 360 -20"
                          fill="none"
                          stroke="#BFDFCE"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 50 420 C 140 320, 170 230, 220 150 S 300 60, 360 -20"
                          fill="none"
                          stroke="#82C09F"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {selectedCity === 'bogota' && (
                      <>
                        {/* Cerros Orientales */}
                        <path
                          d="M 280 -20 C 270 120, 310 220, 290 320 S 330 380, 420 420 L 420 -20 Z"
                          fill="#DDEBE2"
                        />
                        {/* Main Avenues Grid */}
                        <path d="M 0 160 L 400 160" stroke="#CCDED3" strokeWidth="6" />
                        <path d="M 0 260 L 400 260" stroke="#CCDED3" strokeWidth="6" />
                        <path d="M 180 0 L 180 400" stroke="#B8D3C1" strokeWidth="6" />
                        <path d="M 270 0 L 270 400" stroke="#B8D3C1" strokeWidth="6" />
                      </>
                    )}

                    {selectedCity === 'cali' && (
                      <>
                        {/* Farallones */}
                        <path
                          d="M -20 -20 C 80 80, 110 200, 90 310 S 70 380, -20 420 Z"
                          fill="#DDEBE2"
                        />
                        {/* Río Cali */}
                        <path
                          d="M 60 140 C 140 180, 240 160, 350 210 S 390 290, 420 320"
                          fill="none"
                          stroke="#BFDFCE"
                          strokeWidth="12"
                        />
                      </>
                    )}
                  </svg>

                  {/* City Title Watermark */}
                  <div className="absolute left-3 top-3 pointer-events-none z-10 flex flex-col">
                    <span className="font-display text-xl font-extrabold text-ink/70">
                      Mapa de {currentCity.name}
                    </span>
                    <span className="text-[11px] font-bold text-brand">
                      {totalCityHosts} zonas con anfitriones
                    </span>
                  </div>

                  {/* Interactive Neighbourhood Pins */}
                  {currentCity.neighbourhoods.map((pin) => {
                    const isSelected = activePin?.name === pin.name
                    return (
                      <div
                        key={pin.name}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                      >
                        <button
                          type="button"
                          onClick={() => setActivePin(isSelected ? null : pin)}
                          onMouseEnter={() => setActivePin(pin)}
                          aria-label={`Barrio ${pin.name}, ${pin.hostsCount} anfitriones`}
                          className={`group relative flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ${
                            isSelected ? 'scale-110 z-30' : ''
                          }`}
                        >
                          {/* Pulsing ring for featured */}
                          {pin.featured && (
                            <span className="absolute -inset-2 rounded-full bg-brand/20 animate-ping" />
                          )}
                          <span
                            className={`flex size-9 items-center justify-center rounded-full border-2 text-xs font-extrabold shadow-card transition-colors ${
                              isSelected
                                ? 'border-amber bg-amber text-ink'
                                : 'border-surface bg-brand text-surface hover:bg-brand-hover'
                            }`}
                          >
                            🐾
                          </span>
                        </button>

                        {/* Pin Label */}
                        <div
                          className={`pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold shadow-sm transition-all ${
                            isSelected
                              ? 'bg-ink text-surface z-40'
                              : 'bg-surface/90 text-ink border border-line'
                          }`}
                        >
                          {pin.name}
                        </div>
                      </div>
                    )
                  })}

                  {/* Selected Pin Tooltip Card */}
                  {activePin && (
                    <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 p-3.5 shadow-pop backdrop-blur-sm sm:bottom-4 sm:left-4 sm:right-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-tint text-xl text-brand">
                          🏡
                        </span>
                        <div className="flex flex-col">
                          <strong className="text-sm font-bold text-ink">
                            {activePin.name} · {currentCity.name}
                          </strong>
                          <span className="text-xs text-muted">
                            {activePin.zone} · {activePin.hostsCount} anfitriones verificados
                          </span>
                        </div>
                      </div>

                      <a
                        href="#anfitriones"
                        className="rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-surface hover:bg-brand-hover"
                      >
                        Ver cupos
                      </a>
                    </div>
                  )}
                </div>

                {/* Helper footer */}
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>Toca un punto para ver anfitriones en esa zona</span>
                  <span className="font-semibold text-brand">Dogi {currentCity.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {children}

      {/* Dynamic Hosts Section for Selected City */}
      <section id="anfitriones" className="scroll-mt-4 bg-canvas py-20">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-widest text-amber-ink uppercase">
                Anfitriones en tu ciudad
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Espacios verificados en {currentCity.name}
              </h2>
              <p className="text-base text-muted">
                {cityListings.length > 0
                  ? `Mostrando ${cityListings.length} anfitriones disponibles para reservar hoy en ${currentCity.name}.`
                  : `Estamos habilitando los primeros anfitriones verificados en ${currentCity.name}.`}
              </p>
            </div>

            {/* Quick city switch tabs */}
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface p-1">
              {(Object.keys(CITIES) as CityKey[]).map((cityKey) => (
                <button
                  key={cityKey}
                  type="button"
                  onClick={() => setSelectedCity(cityKey)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    selectedCity === cityKey
                      ? 'bg-brand text-surface'
                      : 'text-ink-2 hover:bg-sunk'
                  }`}
                >
                  {CITIES[cityKey].name}
                </button>
              ))}
            </div>
          </div>

          {cityListings.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cityListings.map((l) => (
                <CityHostCard key={l.id} l={l} />
              ))}
            </div>
          ) : (
            <CityEmptyCard city={currentCity} />
          )}
        </div>
      </section>
    </>
  )
}

function CityHostCard({ l }: { l: ListingCard }) {
  return (
    <Link
      href={`/stays/${l.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-card transition-all hover:text-ink hover:no-underline hover:shadow-raised"
    >
      <div className="relative h-48 bg-brand-tint">
        {l.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.photoUrl}
            alt={`Espacio de ${l.hostFirstName} en ${l.neighbourhood}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🏡</div>
        )}
        <TierBadge tier={l.tier} className="absolute left-3 top-3 shadow-card" />
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-ink/80 px-2 py-0.5 text-xs font-bold text-surface backdrop-blur-sm">
          {l.city}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <strong className="text-lg group-hover:underline">{l.hostFirstName}</strong>
          <span className="inline-flex items-center gap-1 text-sm font-bold">
            <Star />
            {l.reviews ? score(l.pawScore) : 'Nuevo'}
          </span>
        </div>
        <span className="text-sm text-muted">
          {SPACE_LABEL[l.space]} · {l.neighbourhood}
        </span>
        {l.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {l.amenities.slice(0, 3).map((a) => (
              <span
                key={a.id}
                className="rounded-full bg-sunk px-2.5 py-0.5 text-xs font-semibold text-brand"
              >
                {a.label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-sunk-2 pt-3">
          <span className="text-sm text-muted">
            <strong className="text-base text-ink">{formatMoney(l.hourlyMinor, 'COP')}</strong> / hora
          </span>
          <span className="text-xs font-bold text-brand">
            {l.stays} {l.stays === 1 ? 'estadía' : 'estadías'}
          </span>
        </div>
      </div>
    </Link>
  )
}

function CityEmptyCard({ city }: { city: CityData }) {
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-line bg-surface p-8 shadow-card sm:p-12">
      <span className="flex size-14 items-center justify-center rounded-xl bg-brand-tint text-3xl text-brand">
        📍
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Estamos recibiendo anfitriones en {city.name}
        </h3>
        <p className="max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
          Estamos verificando los primeros espacios en {city.neighbourhoods.slice(0, 3).map((n) => n.name).join(', ')}.
          Si vives en {city.name}, tienes un espacio adecuado para mascotas y pasas tiempo en casa, sé uno de los anfitriones pioneros.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/onboarding"
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 text-sm font-bold text-surface transition-colors hover:bg-brand-hover"
        >
          Sé anfitrión en {city.name}
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-sm font-bold text-ink hover:bg-sunk"
        >
          Registrar a mi mascota
        </Link>
      </div>
    </div>
  )
}

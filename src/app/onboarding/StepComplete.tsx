'use client'

import Link from 'next/link'
import type { DogData, HostData, ProfileData } from './types'

interface Props {
  profile: ProfileData
  dog: DogData
  host: HostData
  petId: string | null
  listingId: string | null
  listingStatus: 'live' | 'draft' | null
}

export function StepComplete({ profile, dog, host, petId, listingId, listingStatus }: Props) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-tint text-4xl text-brand shadow-card">
        🎉
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          ¡Bienvenido a la comunidad de Dogi, {profile.firstName}!
        </h1>
        <p className="mx-auto max-w-lg text-base text-muted sm:text-lg">
          Tu registro se completó con éxito. Ahora formas parte de la red de cuidado de mascotas de confianza en Medellín.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
        {/* User Card */}
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-sunk text-sm">
              👤
            </span>
            <strong className="text-base text-ink">Tu perfil</strong>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted">
            <span className="font-semibold text-ink">
              {profile.firstName} {profile.lastName}
            </span>
            <span>{profile.email}</span>
            <span>
              {profile.phoneCountryCode} {profile.phone}
            </span>
            <span>{profile.neighbourhood}, Medellín</span>
          </div>
        </div>

        {/* Pet Card if enrolled */}
        {dog.enrollDog && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-amber-tint text-sm">
                  🐶
                </span>
                <strong className="text-base text-ink">Pasaporte de {dog.name}</strong>
              </div>
              <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand">
                Creado
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted">
              <span className="font-semibold text-ink">{dog.name}</span>
              <span>{dog.breed || 'Mascota consentida'}</span>
              {dog.weightKg && <span>{dog.weightKg} kg</span>}
              {petId && (
                <Link
                  href={`/pets/${petId}`}
                  className="mt-1 text-xs font-bold text-brand hover:underline"
                >
                  Ver pasaporte completo →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Host Card if created */}
        {host.wantsToHost && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-tint text-sm">
                  🏡
                </span>
                <strong className="text-base text-ink">Anuncio de Anfitrión</strong>
              </div>
              <span className="rounded-full bg-amber-tint px-2.5 py-0.5 text-xs font-bold text-amber-ink">
                {listingStatus === 'live' ? 'Publicado' : 'Borrador'}
              </span>
            </div>
            <p className="text-sm text-muted">
              {listingStatus === 'live'
                ? '¡Tu espacio ya aparece en la búsqueda de Dogi!'
                : 'Tu espacio está guardado. Para recibir reservas y pagos automáticos por Mercado Pago, conecta tu cuenta de cobros.'}
            </p>
            {listingId && listingStatus === 'live' && (
              <div className="pt-1">
                <Link
                  href={`/stays/${listingId}`}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  Ver tu anuncio publicado →
                </Link>
              </div>
            )}
            {listingStatus !== 'live' && (
              <div className="pt-1">
                <Link
                  href="/host/onboarding?step=6"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-surface hover:bg-brand-hover"
                >
                  Conectar Mercado Pago ahora
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <Link
          href="/"
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-brand px-8 text-base font-bold text-surface transition-colors hover:bg-brand-hover"
        >
          Explorar estadías en Dogi
        </Link>
      </div>
    </div>
  )
}

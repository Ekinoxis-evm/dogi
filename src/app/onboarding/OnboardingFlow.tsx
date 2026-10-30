'use client'

import { useEffect, useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { api } from '@/lib/client/api'
import { StepProfile } from './StepProfile'
import { StepPet } from './StepPet'
import { StepHost } from './StepHost'
import { StepComplete } from './StepComplete'
import type { DogData, HostData, ProfileData } from './types'

const STEPS = ['Tu perfil', 'Tu mascota', 'Sé anfitrión', '¡Listo!']

export default function OnboardingFlow() {
  const { ready, authenticated, user, login } = usePrivy()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Profile
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    phoneCountryCode: '+57',
    phone: '',
    email: '',
    city: 'Medellín',
    neighbourhood: 'Laureles',
  })

  // Step 2: Dog
  const [dog, setDog] = useState<DogData>({
    enrollDog: null,
    name: '',
    breed: '',
    birthday: '',
    weightKg: '',
    sex: '',
    neutered: '',
    energy: 3,
    goodWithDogs: 'yes',
    goodWithCats: 'unsure',
    goodWithKids: 'yes',
    routineNotes: '',
  })
  const [createdPetId, setCreatedPetId] = useState<string | null>(null)

  // Step 3: Host
  const [host, setHost] = useState<HostData>({
    wantsToHost: null,
    space: 'house_with_yard',
    areaM2: '60',
    otherPets: 'Ninguna',
    acceptsSmallDogs: true,
    acceptsMediumDogs: true,
    acceptsLargeDogs: false,
    acceptsCats: false,
    acceptsPuppies: false,
    acceptsSeniors: true,
    maxGuests: 1,
    priceAdjustPct: 0,
    earliestDropoff: '07:00',
    latestPickup: '21:00',
  })
  const [createdListingId, setCreatedListingId] = useState<string | null>(null)
  const [listingStatus, setListingStatus] = useState<'live' | 'draft' | null>(null)

  // Initialize email & prefill if available
  useEffect(() => {
    if (!authenticated || !user) return

    const userEmail = user.email?.address || user.google?.email || ''
    let cancelled = false

    api('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setProfile((prev) => ({
          ...prev,
          firstName: data?.first_name || prev.firstName,
          lastName: data?.last_name || prev.lastName,
          phoneCountryCode: data?.phone_country_code || prev.phoneCountryCode,
          phone: data?.phone || prev.phone,
          email: data?.email || userEmail || prev.email,
          neighbourhood: data?.neighbourhood || prev.neighbourhood,
        }))
      })
      .catch(() => {
        if (cancelled) return
        if (userEmail) {
          setProfile((prev) => ({ ...prev, email: prev.email || userEmail }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authenticated, user])

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  if (!ready) {
    return (
      <div className="mx-auto flex max-w-[680px] flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="h-64 animate-pulse rounded-xl bg-surface p-8 shadow-card" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex max-w-[680px] flex-col gap-6 px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-6 rounded-xl bg-surface p-8 shadow-card sm:p-10">
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-3xl text-brand">
            🐾
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Bienvenido a Dogi
            </h1>
            <p className="text-base text-muted sm:text-lg">
              Inicia sesión con tu correo o cuenta de Google para comenzar tu registro. Te tomará solo un par de minutos.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => login()}
              className="inline-flex min-h-13 items-center justify-center rounded-full bg-brand px-8 text-base font-bold text-surface transition-colors hover:bg-brand-hover active:bg-brand-deep"
            >
              Iniciar sesión para comenzar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Step 1 -> Step 2 Handlers ---
  async function handleProfileNext() {
    setSaving(true)
    setError(null)
    try {
      const res = await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: profile.firstName.trim(),
          last_name: profile.lastName.trim(),
          phone_country_code: profile.phoneCountryCode.trim(),
          phone: profile.phone.trim(),
          email: profile.email.trim(),
          city: profile.city.trim(),
          neighbourhood: profile.neighbourhood.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error('Error al guardar tu perfil')
      }

      setStep(2)
    } catch {
      setError('No pudimos guardar tus datos. Por favor revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // --- Step 2 -> Step 3 Handlers ---
  async function handlePetNext() {
    if (!dog.enrollDog) {
      // User chose not to register a dog
      setStep(3)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        species: 'dog',
        name: dog.name.trim(),
        breed: dog.breed.trim() || undefined,
        birthday: dog.birthday || undefined,
        weightKg: dog.weightKg ? Number(dog.weightKg) : undefined,
        sex: dog.sex || undefined,
        neutered: dog.neutered ? dog.neutered === 'yes' : undefined,
        energy: dog.energy || undefined,
        goodWithDogs: dog.goodWithDogs,
        goodWithCats: dog.goodWithCats,
        goodWithKids: dog.goodWithKids,
        notes: dog.routineNotes.trim() || undefined,
      }

      const res = await api('/api/pets', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error('Error al registrar la mascota')
      }

      const body = (await res.json()) as { id: string }
      setCreatedPetId(body.id)
      setStep(3)
    } catch {
      setError('No pudimos registrar a tu mascota. Verifica los datos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // --- Step 3 -> Step 4 Handlers ---
  async function handleHostNext() {
    setSaving(true)
    setError(null)
    try {
      if (host.wantsToHost) {
        const area = parseInt(host.areaM2, 10)
        const listingPayload = {
          space: host.space,
          areaM2: Number.isFinite(area) && area >= 1 ? Math.min(area, 1000) : null,
          city: 'Medellín',
          neighbourhood: profile.neighbourhood.trim(),
          otherPetsAtHome: host.otherPets,
          accepts: {
            smallDogs: host.acceptsSmallDogs,
            mediumDogs: host.acceptsMediumDogs,
            largeDogs: host.acceptsLargeDogs,
            cats: host.acceptsCats,
            puppies: host.acceptsPuppies,
            seniors: host.acceptsSeniors,
          },
          maxGuests: host.maxGuests,
          earliestDropoff: host.earliestDropoff,
          latestPickup: host.latestPickup,
          minStay: 'one_hour',
          notice: 'two_hours',
          requiresVaccines: true,
          requiresMeetGreet: false,
          requiresNeutered: false,
          demand: 'standard',
          adjustPct: host.priceAdjustPct,
          amenityIds: [],
        }

        const res = await api('/api/listings', {
          method: 'POST',
          body: JSON.stringify(listingPayload),
        })

        if (!res.ok) {
          throw new Error('Error al crear el anuncio de anfitrión')
        }

        const listingData = (await res.json()) as { id: string; status: 'live' | 'draft' }
        setCreatedListingId(listingData.id)
        setListingStatus(listingData.status)
      }

      // Mark onboarding completed
      await api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          onboarding_completed: true,
          is_host: Boolean(host.wantsToHost),
        }),
      })

      setStep(4)
    } catch {
      setError('Ocurrió un error al guardar tu configuración. Por favor inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas pb-20 pt-6">
      {/* Progress header */}
      <div className="mx-auto max-w-[720px] px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold tracking-widest text-muted uppercase">
            <span>
              Paso {step} de {STEPS.length} · {STEPS[step - 1]}
            </span>
            <span>{Math.round((step / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunk-2">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step container */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10">
          {step === 1 && (
            <StepProfile
              data={profile}
              onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))}
              onNext={handleProfileNext}
              saving={saving}
              error={error}
            />
          )}

          {step === 2 && (
            <StepPet
              data={dog}
              onChange={(patch) => setDog((d) => ({ ...d, ...patch }))}
              onNext={handlePetNext}
              onBack={() => setStep(1)}
              saving={saving}
              error={error}
            />
          )}

          {step === 3 && (
            <StepHost
              data={host}
              onChange={(patch) => setHost((h) => ({ ...h, ...patch }))}
              onNext={handleHostNext}
              onBack={() => setStep(2)}
              saving={saving}
              error={error}
            />
          )}

          {step === 4 && (
            <StepComplete
              profile={profile}
              dog={dog}
              host={host}
              petId={createdPetId}
              listingId={createdListingId}
              listingStatus={listingStatus}
            />
          )}
        </div>
      </div>
    </div>
  )
}

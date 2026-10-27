import type { Metadata } from 'next'
import { Suspense } from 'react'
import { connection } from 'next/server'
import { db } from '@/lib/db'
import type { Amenity, PayoutResult } from './copy'
import OnboardingFlow from './OnboardingFlow'
import OnboardingSkeleton from './Skeleton'

export const metadata: Metadata = {
  title: 'Publica tu espacio',
  description: 'Recibe perros y gatos en tu casa por horas, medio día o la noche, y cobra por Mercado Pago.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function HostOnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <Loaded searchParams={searchParams} />
    </Suspense>
  )
}

// Request-time only: connection() keeps the amenities query out of the build.
async function Loaded({ searchParams }: { searchParams: SearchParams }) {
  await connection()
  const sp = await searchParams
  const payout: PayoutResult = sp.payout === 'connected' ? 'connected' : sp.payout === 'failed' ? 'failed' : null
  return <OnboardingFlow amenities={await loadAmenities()} payoutResult={payout} />
}

async function loadAmenities(): Promise<Amenity[] | null> {
  try {
    const { data, error } = await db().from('amenities').select('id, label_es, add_per_hour_cop').order('sort')
    if (error) throw error
    return (data ?? []) as Amenity[]
  } catch (e) {
    console.error('[host/onboarding] amenities', e instanceof Error ? e.message : e)
    return null
  }
}

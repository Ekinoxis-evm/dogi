import type { Metadata } from 'next'
import { Suspense } from 'react'
import OnboardingFlow from './OnboardingFlow'

export const metadata: Metadata = {
  title: 'Registro · Dogi',
  description: 'Completa tu perfil, registra a tu perro o publica tu espacio como anfitrión en Medellín.',
}

function OnboardingSkeleton() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="h-96 animate-pulse rounded-2xl bg-surface p-8 shadow-card" />
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingFlow />
    </Suspense>
  )
}

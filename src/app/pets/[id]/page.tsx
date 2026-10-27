import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthGate } from '../new/AuthGate'
import PetProfile from './PetProfile'

export const metadata: Metadata = { title: 'Perfil de huésped', robots: { index: false } }

type Props = { params: Promise<{ id: string }> }

export default function PetProfilePage(props: Props) {
  return (
    <Suspense fallback={null}>
      <Pet {...props} />
    </Suspense>
  )
}

async function Pet({ params }: Props) {
  const { id } = await params
  return (
    <AuthGate reason="Este perfil solo lo ven su familia y los anfitriones con una reserva para esta mascota.">
      <PetProfile id={id} />
    </AuthGate>
  )
}

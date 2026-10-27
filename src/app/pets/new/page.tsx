import type { Metadata } from 'next'
import { AuthGate } from './AuthGate'
import PetPassportForm from './PetPassportForm'

export const metadata: Metadata = { title: 'Pasaporte de tu mascota' }

export default function NewPetPage() {
  return (
    <AuthGate reason="Entra para crear el pasaporte de tu mascota. Lo llenas una vez y lo compartes con cada anfitrión.">
      <PetPassportForm />
    </AuthGate>
  )
}

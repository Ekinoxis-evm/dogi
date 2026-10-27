import type { Metadata } from 'next'
import { AuthGate } from '../pets/new/AuthGate'
import DogiChat from './DogiChat'

export const metadata: Metadata = { title: 'Pregúntale a Dogi' }

export default function ChatPage() {
  return (
    <AuthGate reason="Entra para hablar con Dogi. Busca estadías, compara precios y pregunta por tu mascota.">
      <DogiChat />
    </AuthGate>
  )
}

import type { Metadata } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import Providers from './providers'
import Header from '@/components/Header'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-bricolage' })
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-figtree' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://dogi.ekinoxis.xyz'),
  title: { default: 'Dogi — Cuidado de mascotas por horas en Medellín', template: '%s · Dogi' },
  description: 'Deja a tu perro o gato con un vecino verificado por horas, medio día o la noche. Paga con tarjeta, PSE o Nequi.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${figtree.variable}`}>
      <body className="min-h-screen bg-canvas">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}

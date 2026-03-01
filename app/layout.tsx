import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flight Tracker - Paris/Luxembourg → Cayenne',
  description: 'Surveillance des prix de vols vers la Guyane française',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}

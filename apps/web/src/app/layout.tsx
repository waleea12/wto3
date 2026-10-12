import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'WTO3 — المشاهدة أحلى سوا',
  description: 'افتح غرفة وشاهد الأفلام والمسلسلات مع أصحابك بشات مباشر وتشغيل متزامن.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

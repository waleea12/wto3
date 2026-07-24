import type { Metadata, Viewport } from 'next'
import { Press_Start_2P, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  variable: '--font-pixel',
  weight: ['400'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Watch Party — Watch Together in Sync',
  description: 'Watch YouTube and Google Drive videos in perfect synchronization with friends',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${pressStart2P.variable} ${jetbrainsMono.variable} ${jetbrainsMono.className}`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

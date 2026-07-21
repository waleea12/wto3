'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
  }))

  // Render nothing on the server to prevent browser extensions from causing hydration mismatches
  if (!mounted) return null

  return (
    <SessionProvider
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}

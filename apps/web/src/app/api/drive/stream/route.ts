import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const token = (session?.user as any)?.accessToken

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return new NextResponse('Missing ID', { status: 400 })
  }

  const driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`
  
  const headers = new Headers()
  headers.set('Authorization', `Bearer ${token}`)
  
  // Forward range requests for video seeking
  const range = req.headers.get('range')
  if (range) {
    headers.set('Range', range)
  }

  try {
    const response = await fetch(driveUrl, { headers })

    if (!response.ok) {
      return new NextResponse(`Drive API Error: ${response.statusText}`, { status: response.status })
    }

    const responseHeaders = new Headers(response.headers)
    // Remove content-encoding to avoid issues with streaming
    responseHeaders.delete('content-encoding')

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    return new NextResponse(`Proxy Error: ${error.message}`, { status: 500 })
  }
}

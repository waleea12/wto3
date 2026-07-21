import { NextRequest, NextResponse } from 'next/server'

/**
 * Resource Proxy
 * --------------
 * Fetches individual resources (JS, CSS, images, etc.) from external domains
 * and serves them through our domain to bypass security extensions like McAfee.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const resourceUrl = searchParams.get('url')
  const origin = searchParams.get('origin') ?? ''

  if (!resourceUrl) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 })
  }

  // Security: only allow HTTPS URLs
  if (!resourceUrl.startsWith('https://') && !resourceUrl.startsWith('http://')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(resourceUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': origin || new URL(resourceUrl).origin,
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }

    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
    const body = await res.arrayBuffer()

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('Resource proxy error:', err)
    return new NextResponse(null, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
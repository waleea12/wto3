import { NextRequest, NextResponse } from 'next/server'

/**
 * Movie Embed Proxy
 * -----------------
 * This endpoint loads embed content from external sites and serves it locally
 * to bypass browser security extensions (McAfee, etc.) that block external embeds.
 * 
 * It tries multiple sources with automatic fallback if one fails.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Trusted embed sources - ordered by reliability
const EMBED_SOURCES = [
  { name: 'multiembed', url: (id: string, type: string, s?: number, e?: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1${type === 'tv' ? `&s=${s}&e=${e}` : ''}` },
  { name: 'vidsrc', url: (id: string, type: string, s?: number, e?: number) => `https://vidsrc.me/embed/${type}/${id}${type === 'tv' && s && e ? `/${s}/${e}` : ''}` },
  { name: 'vidsrc2', url: (id: string, type: string, s?: number, e?: number) => `https://vidsrc.to/embed/${type}/${id}${type === 'tv' && s && e ? `/${s}/${e}` : ''}` },
  { name: '2embed', url: (id: string, type: string, s?: number, e?: number) => `https://www.2embed.cc/embed/${type}/${id}${type === 'tv' && s && e ? `/${s}/${e}` : ''}` },
]

async function tryFetchEmbed(targetUrl: string, targetOrigin: string): Promise<{ html: string; origin: string } | null> {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': targetOrigin,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
      next: { revalidate: 300 },
    })

    if (!res.ok) return null

    const html = await res.text()
    if (!html || html.length < 100) return null

    return { html, origin: targetOrigin }
  } catch {
    return null
  }
}

function rewriteHtml(html: string, targetOrigin: string): string {
  const escapedOrigin = targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const proxyBase = '/api/movies/proxy'
  
  let rewritten = html
    // Rewrite absolute URLs from the target origin
    .replace(new RegExp(`(src|href|action)=["']${escapedOrigin}(/[^"']*)["']`, 'gi'), 
      `$1="${proxyBase}?url=${encodeURIComponent(targetOrigin + '$2')}&origin=${encodeURIComponent(targetOrigin)}"`)
    // Rewrite protocol-relative URLs
    .replace(new RegExp(`(src|href)=["']//${escapedOrigin.replace('https://', '').replace('http://', '')}(/[^"']*)["']`, 'gi'),
      `$1="${proxyBase}?url=${encodeURIComponent('https://' + targetOrigin.replace('https://', '').replace('http://', '') + '$2')}&origin=${encodeURIComponent(targetOrigin)}"`)

  // Add base tag for relative URLs
  if (!rewritten.includes('<base')) {
    rewritten = rewritten.replace(/<head[^>]*>/i, `<head><base href="${targetOrigin}/">`)
  }

  return rewritten
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get('id')
  const type = searchParams.get('type') ?? 'movie'
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : undefined
  const preferredSource = searchParams.get('source') ?? 'multiembed'

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing TMDB ID' }, { status: 400 })
  }

  // Try preferred source first, then fallback to others
  const orderedSources = [
    ...EMBED_SOURCES.filter(s => s.name === preferredSource),
    ...EMBED_SOURCES.filter(s => s.name !== preferredSource),
  ]

  for (const embedSource of orderedSources) {
    const targetUrl = embedSource.url(tmdbId, type, season, episode)
    const targetOrigin = new URL(targetUrl).origin

    const result = await tryFetchEmbed(targetUrl, targetOrigin)
    if (result) {
      const rewrittenHtml = rewriteHtml(result.html, result.origin)

      return new NextResponse(rewrittenHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'public, max-age=300',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Embed-Source': embedSource.name,
        },
      })
    }
  }

  // All sources failed - return a helpful error page
  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Failed to Load</title>
      <style>
        body { background: #0a0c16; color: #c8b887; font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .error { text-align: center; padding: 2rem; }
        .error h2 { color: #dc6464; margin-bottom: 1rem; }
        .error p { color: #888; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <div class="error">
        <h2>⚠ Failed to load content</h2>
        <p>All embed sources are currently unavailable.</p>
        <p>Please try again later or use the "Open in new tab" button.</p>
      </div>
    </body>
    </html>
  `

  return new NextResponse(errorHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
    status: 502,
  })
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

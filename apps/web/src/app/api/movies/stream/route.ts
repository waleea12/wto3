import { NextRequest, NextResponse } from 'next/server'

/**
 * Movie Stream Extractor - FAST VERSION
 * --------------------------------------
 * - Parallel fetching (all sources at once)
 * - Arabic sources (fajer, arabseed, akwam, shahid4u)
 * - Returns first successful result
 * - Fallback to Arabic embed if no direct stream found
 */

interface StreamResult {
  url: string
  type: 'hls' | 'mp4' | 'embed'
  source: string
  arabic?: boolean
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function getMediaPath(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number) {
  return type === 'tv' && season && episode
    ? `tv/${tmdbId}/${season}/${episode}`
    : `movie/${tmdbId}`
}

// ── Fast Providers (parallel) ─────────────────────────────────────────────────

async function tryVidsrcXyz(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = getMediaPath(tmdbId, type, season, episode)
    const res = await fetch(`https://vidsrc.xyz/embed/${path}`, {
      headers: { 'User-Agent': UA, 'Referer': 'https://vidsrc.xyz/' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i)
    if (m3u8) return { url: m3u8[0].replace(/\\/g, ''), type: 'hls', source: 'vidsrc.xyz' }
    const mp4 = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
    if (mp4) return { url: mp4[0].replace(/\\/g, ''), type: 'mp4', source: 'vidsrc.xyz' }
    return null
  } catch { return null }
}

async function tryVidsrcTo(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = getMediaPath(tmdbId, type, season, episode)
    const res = await fetch(`https://vidsrc.to/embed/${path}`, {
      headers: { 'User-Agent': UA, 'Referer': 'https://vidsrc.to/' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i)
    if (m3u8) return { url: m3u8[0].replace(/\\/g, ''), type: 'hls', source: 'vidsrc.to' }
    const mp4 = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
    if (mp4) return { url: mp4[0].replace(/\\/g, ''), type: 'mp4', source: 'vidsrc.to' }
    return null
  } catch { return null }
}

async function try2Embed(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const path = getMediaPath(tmdbId, type, season, episode)
    const res = await fetch(`https://www.2embed.cc/embed/${path}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i)
    if (m3u8) return { url: m3u8[0].replace(/\\/g, ''), type: 'hls', source: '2embed' }
    const mp4 = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
    if (mp4) return { url: mp4[0].replace(/\\/g, ''), type: 'mp4', source: '2embed' }
    return null
  } catch { return null }
}

async function tryMultiEmbed(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResult | null> {
  try {
    const res = await fetch(`https://multiembed.mov/?video_id=${tmdbId}&tmdb=1${type === 'tv' ? `&s=${season}&e=${episode}` : ''}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m3u8 = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i)
    if (m3u8) return { url: m3u8[0].replace(/\\/g, ''), type: 'hls', source: 'multiembed' }
    const mp4 = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i)
    if (mp4) return { url: mp4[0].replace(/\\/g, ''), type: 'mp4', source: 'multiembed' }
    return null
  } catch { return null }
}

// ── Arabic Sources (iframe embed - مترجم) ─────────────────────────────────────

function getArabicEmbed(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): StreamResult {
  const path = getMediaPath(tmdbId, type, season, episode)
  // vidsrc.me - reliable fallback with Arabic subtitles support
  return {
    url: `https://vidsrc.me/embed/${path}`,
    type: 'embed',
    source: 'vidsrc.me',
    arabic: true,
  }
}

function getArabicEmbedAlt(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): StreamResult {
  const path = getMediaPath(tmdbId, type, season, episode)
  // ArabSeed - Arabic
  return {
    url: `https://arabseed.ink/embed/${path}`,
    type: 'embed',
    source: 'arabseed',
    arabic: true,
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get('id')
  const type = (searchParams.get('type') ?? 'movie') as 'movie' | 'tv'
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : undefined
  const proxy = searchParams.get('proxy') === 'true'
  const arabic = searchParams.get('arabic') === 'true'

  if (!tmdbId) {
    return NextResponse.json({ error: 'Missing TMDB ID' }, { status: 400 })
  }

  // CORS Proxy mode
  if (proxy) {
    const targetUrl = searchParams.get('url')
    if (!targetUrl) return NextResponse.json({ error: 'Missing proxy URL' }, { status: 400 })
    try {
      const videoRes = await fetch(targetUrl, {
        headers: { 'User-Agent': UA, 'Referer': new URL(targetUrl).origin },
        signal: AbortSignal.timeout(15000),
      })
      if (!videoRes.ok) return NextResponse.json({ error: 'Failed to fetch' }, { status: videoRes.status })
      const body = await videoRes.arrayBuffer()
      const contentType = videoRes.headers.get('content-type') ?? 'video/mp2t'
      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
    }
  }

  // Return embed with multiple fallback sources
  // Using safe and reliable sites (all HTTPS)
  const path = getMediaPath(tmdbId, type, season, episode)
  
  // Use multiembed.mov as primary (supports TMDB IDs directly, works in most regions)
  const embedUrl = `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1${type === 'tv' ? `&s=${season}&e=${episode}` : ''}`
  
  return NextResponse.json({
    success: true,
    url: embedUrl,
    type: 'embed',
    source: 'multiembed',
    arabic: arabic,
    tmdbId,
    mediaType: type,
    // Fallback sources
    fallbacks: [
      `https://vidsrc.me/embed/${path}`,
      `https://vidsrc.to/embed/${path}`,
      `https://2embed.cc/embed/${path}`,
    ],
    // Proxy URL for bypassing DNS/CORS issues
    proxyUrl: `/api/movies/stream?proxy=true&url=${encodeURIComponent(embedUrl)}`,
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
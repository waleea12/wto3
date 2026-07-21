import { Router } from 'express'
import type { Request, Response } from 'express'
import axios from 'axios'

export const proxyRouter = Router()

// GET /api/proxy?url=...
proxyRouter.get('/', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string

  if (!targetUrl) {
    return res.status(400).send('Missing url parameter')
  }

  try {
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      validateStatus: () => true, // Don't throw on error status
      headers: {
        // Forward some headers but spoof Origin/Referer to bypass hotlinking protection
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        // Extract host to use as Origin/Referer (some strict providers require this)
        'Origin': new URL(targetUrl).origin,
        'Referer': new URL(targetUrl).origin + '/',
      }
    })

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    
    // Forward the content type (very important for m3u8/ts)
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type'])
    }
    
    // In a real robust proxy for HLS, we would need to rewrite the .m3u8 
    // content so that all relative and absolute URLs inside the playlist 
    // also point back to our proxy. 
    // For simple implementations, if the .m3u8 uses absolute URLs, 
    // the frontend can load them, provided they don't have CORS limits.
    // If they do have CORS limits, full rewriting is needed.

    res.status(response.status)
    response.data.pipe(res)
  } catch (err) {
    console.error('[PROXY ERROR]', err)
    res.status(500).send('Proxy Error')
  }
})

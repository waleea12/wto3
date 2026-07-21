import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth'
import { extractMovieLink } from '../services/scraper'
import { AppError } from '../middleware/errorHandler'

export const movieRouter = Router()

// GET /api/movies/extract/:tmdbId
movieRouter.get('/extract/:tmdbId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tmdbId } = req.params
    const mediaType = (req.query.type as 'movie' | 'tv') ?? 'movie'

    if (!tmdbId) {
      throw new AppError(400, 'Missing TMDB ID')
    }

    const streamInfo = await extractMovieLink(tmdbId, mediaType)
    
    return res.json(streamInfo)
  } catch (err) {
    return next(err)
  }
})

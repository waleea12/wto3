import { Router } from 'express'
import type { Response, NextFunction } from 'express'
import { google } from 'googleapis'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { env } from '../config/env'

export const driveRouter = Router()

function getOAuth2Client(accessToken: string) {
  const client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
  client.setCredentials({ access_token: accessToken })
  return client
}

// GET /api/drive/videos - list videos from Google Drive
driveRouter.get('/videos', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.headers['x-access-token'] as string
    if (!accessToken) throw new AppError(401, 'Missing access token')

    const pageToken = req.query.pageToken as string | undefined
    const search = req.query.search as string | undefined

    const auth = getOAuth2Client(accessToken)
    const drive = google.drive({ version: 'v3', auth })

    let q = "mimeType contains 'video/' and trashed = false"
    if (search) q += ` and name contains '${search.replace(/'/g, "\\'")}'`

    const response = await drive.files.list({
      q,
      pageSize: 24,
      pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, size, createdTime, modifiedTime, webViewLink, videoMediaMetadata)',
      orderBy: 'modifiedTime desc',
    })

    return res.json({
      files: response.data.files ?? [],
      nextPageToken: response.data.nextPageToken ?? null,
    })
  } catch (err) {
    return next(err)
  }
})

// GET /api/drive/videos/:id - get a single video metadata
driveRouter.get('/videos/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.headers['x-access-token'] as string
    if (!accessToken) throw new AppError(401, 'Missing access token')

    const auth = getOAuth2Client(accessToken)
    const drive = google.drive({ version: 'v3', auth })

    const file = await drive.files.get({
      fileId: req.params.id,
      fields: 'id, name, mimeType, thumbnailLink, size, createdTime, modifiedTime, webViewLink, videoMediaMetadata',
    })

    return res.json(file.data)
  } catch (err) {
    return next(err)
  }
})

export interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  channelTitle: string
  duration: string
}

export interface DriveVideo {
  id: string
  name: string
  mimeType: string
  thumbnailLink: string | null
  size: string | null
  createdTime: string
  modifiedTime: string
  webViewLink: string
  videoMediaMetadata?: {
    width: number
    height: number
    durationMillis: string
  }
}

export interface DriveVideoListResponse {
  files: DriveVideo[]
  nextPageToken?: string
}

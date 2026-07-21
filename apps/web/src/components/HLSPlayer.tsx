'use client'
import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface HLSPlayerProps {
  src: string
  isPlaying: boolean
  currentTime: number
  isHost: boolean
  onPlay: (time: number) => void
  onPause: (time: number) => void
  onSeeked: (time: number) => void
  className?: string
}

export default function HLSPlayer({
  src,
  isPlaying,
  currentTime,
  isHost,
  onPlay,
  onPause,
  onSeeked,
  className
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const isReady = useRef(false)

  // Initialize HLS.js or native playback
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    isReady.current = false

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        isReady.current = true
        video.currentTime = currentTime
        if (isPlaying) video.play().catch(() => {})
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        isReady.current = true
        video.currentTime = currentTime
        if (isPlaying) video.play().catch(() => {})
      }, { once: true })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // Sync state changes from server
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isReady.current) return

    // Allow some threshold to avoid constant seeking for small differences
    if (Math.abs(video.currentTime - currentTime) > 1.5) {
      video.currentTime = currentTime
    }

    if (isPlaying && video.paused) {
      video.play().catch(() => {})
    } else if (!isPlaying && !video.paused) {
      video.pause()
    }
  }, [isPlaying, currentTime])

  const handlePlay = () => {
    if (isHost && videoRef.current) {
      onPlay(videoRef.current.currentTime)
    }
  }

  const handlePause = () => {
    if (isHost && videoRef.current) {
      onPause(videoRef.current.currentTime)
    }
  }

  const handleSeeked = () => {
    if (isHost && videoRef.current) {
      onSeeked(videoRef.current.currentTime)
    }
  }

  return (
    <video
      ref={videoRef}
      className={className}
      controls={isHost}
      playsInline
      onPlay={handlePlay}
      onPause={handlePause}
      onSeeked={handleSeeked}
      style={{
        pointerEvents: isHost ? 'auto' : 'none'
      }}
    />
  )
}

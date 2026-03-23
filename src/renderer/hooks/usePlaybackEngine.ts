import { useState, useRef, useCallback, useEffect } from 'react'

interface AxisDataPoint {
  t: number
  [key: string]: number
}

interface FrameLogEntry {
  t: number
  index: number
  metadata: Record<string, unknown> | null
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
  meltpoolFrameIndex: number
  buildPlateFrameIndex: number
  currentAxisData: AxisDataPoint | null
}

export function usePlaybackEngine(
  duration: number,
  meltpoolFrameLog: FrameLogEntry[],
  buildPlateFrameLog: FrameLogEntry[],
  axisLog: AxisDataPoint[]
) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const lastTickRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  // Binary search for the frame index at a given time
  const findIndex = useCallback((log: { t: number }[], time: number): number => {
    if (log.length === 0) return 0
    let lo = 0, hi = log.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (log[mid].t <= time) lo = mid
      else hi = mid - 1
    }
    return lo
  }, [])

  const meltpoolFrameIndex = findIndex(meltpoolFrameLog, currentTime)
  const buildPlateFrameIndex = findIndex(buildPlateFrameLog, currentTime)
  const axisDataIndex = findIndex(axisLog, currentTime)
  const currentAxisData = axisLog.length > 0 ? axisLog[axisDataIndex] : null

  const tick = useCallback(() => {
    const now = performance.now()
    const dt = now - lastTickRef.current
    lastTickRef.current = now

    setCurrentTime((prev) => {
      const next = prev + dt * playbackSpeed
      if (next >= duration) {
        setIsPlaying(false)
        return duration
      }
      return next
    })

    rafRef.current = requestAnimationFrame(tick)
  }, [playbackSpeed, duration])

  const play = useCallback(() => {
    if (currentTime >= duration) setCurrentTime(0)
    lastTickRef.current = performance.now()
    setIsPlaying(true)
  }, [currentTime, duration])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const seek = useCallback((timeMs: number) => {
    setCurrentTime(Math.max(0, Math.min(timeMs, duration)))
  }, [duration])

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, tick])

  return {
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    meltpoolFrameIndex,
    buildPlateFrameIndex,
    currentAxisData,
    play,
    pause,
    seek,
    setPlaybackSpeed
  } as PlaybackState & {
    play: () => void
    pause: () => void
    seek: (t: number) => void
    setPlaybackSpeed: (s: number) => void
  }
}

export type { AxisDataPoint, FrameLogEntry }

interface PlaybackTimelineProps {
  duration: number
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  onSeek: (timeMs: number) => void
  onPlay: () => void
  onPause: () => void
  onSpeedChange: (speed: number) => void
}

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8]

export function PlaybackTimeline({
  duration, currentTime, isPlaying, playbackSpeed,
  onSeek, onPlay, onPause, onSpeedChange
}: PlaybackTimelineProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(pct * duration)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 flex items-center gap-3">
      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="w-8 h-8 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
      >
        {isPlaying ? '\u23F8' : '\u25B6'}
      </button>

      {/* Time display */}
      <span className="text-xs font-mono text-zinc-400 w-24 shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Scrubber bar */}
      <div
        className="flex-1 h-6 flex items-center cursor-pointer group"
        onClick={handleScrub}
      >
        <div className="w-full h-1.5 bg-zinc-700 rounded-full relative">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
          />
        </div>
      </div>

      {/* Speed selector */}
      <div className="flex items-center gap-1 shrink-0">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-1.5 py-0.5 text-[10px] rounded ${
              playbackSpeed === s
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}

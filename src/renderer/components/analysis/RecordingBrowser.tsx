import { useState, useEffect } from 'react'

interface RecordingEntry {
  id: string
  fileName: string
  startTime: number
  duration?: number
  meltpoolFrameCount: number
  buildPlateFrameCount: number
}

interface RecordingBrowserProps {
  onSelect: (recordingId: string) => void
  selectedId: string | null
}

export function RecordingBrowser({ onSelect, selectedId }: RecordingBrowserProps) {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([])

  useEffect(() => {
    window.machineAPI.recording.list().then((list) => {
      setRecordings(list as RecordingEntry[])
    })
  }, [])

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '--:--'
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 flex items-center gap-3">
      <span className="text-zinc-500 text-xs shrink-0">Recording:</span>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
      >
        <option value="">Select a recording...</option>
        {recordings.map((r) => (
          <option key={r.id} value={r.id}>
            {r.fileName} — {formatDate(r.startTime)} ({formatDuration(r.duration)}, {r.meltpoolFrameCount + r.buildPlateFrameCount} frames)
          </option>
        ))}
      </select>
      <button
        onClick={() => window.machineAPI.recording.list().then(l => setRecordings(l as RecordingEntry[]))}
        className="px-2 py-1 text-[10px] bg-zinc-700 border border-zinc-600 rounded text-zinc-400 hover:text-zinc-200"
      >
        Refresh
      </button>
    </div>
  )
}

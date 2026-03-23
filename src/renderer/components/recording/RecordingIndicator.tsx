import { useRecordingStore } from '../../stores/recordingStore'

export function RecordingIndicator() {
  const isRecording = useRecordingStore((s) => s.isRecording)
  const elapsed = useRecordingStore((s) => s.elapsed)
  const meltpoolFrames = useRecordingStore((s) => s.meltpoolFrames)
  const buildPlateFrames = useRecordingStore((s) => s.buildPlateFrames)

  if (!isRecording) return null

  const mins = Math.floor(elapsed / 60000)
  const secs = Math.floor((elapsed % 60000) / 1000)
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 font-semibold">REC</span>
      </span>
      <span className="text-zinc-400 font-mono">{timeStr}</span>
      <span className="text-zinc-600">|</span>
      <span className="text-zinc-500">{meltpoolFrames + buildPlateFrames} frames</span>
    </div>
  )
}

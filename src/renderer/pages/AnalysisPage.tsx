import { useState, useCallback, useMemo } from 'react'
import { RecordingBrowser } from '../components/analysis/RecordingBrowser'
import { ReplayCamera } from '../components/analysis/ReplayCamera'
import { PlaybackTimeline } from '../components/analysis/PlaybackTimeline'
import { AxisGraph } from '../components/analysis/AxisGraph'
import { GcodeViewer } from '../components/analysis/GcodeViewer'
import { usePlaybackEngine } from '../hooks/usePlaybackEngine'
import type { AxisDataPoint, FrameLogEntry } from '../hooks/usePlaybackEngine'

interface LoadedRecording {
  id: string
  duration: number
  gcode: string
  axisLog: AxisDataPoint[]
  meltpoolFrameLog: FrameLogEntry[]
  buildPlateFrameLog: FrameLogEntry[]
}

export function AnalysisPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recording, setRecording] = useState<LoadedRecording | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelect = useCallback(async (recordingId: string) => {
    if (!recordingId) {
      setSelectedId(null)
      setRecording(null)
      return
    }
    setSelectedId(recordingId)
    setLoading(true)
    try {
      const data = await window.machineAPI.recording.load(recordingId)
      if ('error' in data) {
        console.error('Failed to load recording:', data.error)
        setLoading(false)
        return
      }

      const manifest = data.manifest as Record<string, unknown>
      const axisLog: AxisDataPoint[] = data.axisLog.map((line: string) => {
        try { return JSON.parse(line) } catch { return { t: 0 } }
      })
      const meltpoolFrameLog: FrameLogEntry[] = data.meltpoolFrameLog.map((line: string) => {
        try { return JSON.parse(line) } catch { return { t: 0, index: 0, metadata: null } }
      })
      const buildPlateFrameLog: FrameLogEntry[] = data.buildPlateFrameLog.map((line: string) => {
        try { return JSON.parse(line) } catch { return { t: 0, index: 0, metadata: null } }
      })

      setRecording({
        id: recordingId,
        duration: (manifest.duration as number) || 0,
        gcode: data.gcode,
        axisLog,
        meltpoolFrameLog,
        buildPlateFrameLog
      })
    } catch (err) {
      console.error('Failed to load recording:', err)
    }
    setLoading(false)
  }, [])

  const emptyLog: FrameLogEntry[] = useMemo(() => [], [])
  const emptyAxis: AxisDataPoint[] = useMemo(() => [], [])

  const engine = usePlaybackEngine(
    recording?.duration || 0,
    recording?.meltpoolFrameLog || emptyLog,
    recording?.buildPlateFrameLog || emptyLog,
    recording?.axisLog || emptyAxis
  )

  return (
    <div className="h-full flex flex-col gap-2 max-w-[1400px]">
      <RecordingBrowser onSelect={handleSelect} selectedId={selectedId} />

      {loading && (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Loading recording...
        </div>
      )}

      {!loading && !recording && (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          Select a recording to begin analysis
        </div>
      )}

      {!loading && recording && (
        <>
          <div className="flex-1 flex gap-2 min-h-0">
            {/* Left: camera replays */}
            <div className="flex-1 flex flex-col gap-2">
              <ReplayCamera
                title="Meltpool Camera"
                recordingId={recording.id}
                camera="meltpool"
                frameIndex={engine.meltpoolFrameIndex}
              />
              <ReplayCamera
                title="Build Plate Camera"
                recordingId={recording.id}
                camera="buildplate"
                frameIndex={engine.buildPlateFrameIndex}
              />
            </div>

            {/* Right: G-code + axis graph */}
            <div className="w-96 flex flex-col gap-2 shrink-0">
              <GcodeViewer code={recording.gcode} />
              <AxisGraph
                data={recording.axisLog}
                currentTime={engine.currentTime}
                duration={recording.duration}
              />
            </div>
          </div>

          <PlaybackTimeline
            duration={recording.duration}
            currentTime={engine.currentTime}
            isPlaying={engine.isPlaying}
            playbackSpeed={engine.playbackSpeed}
            onSeek={engine.seek}
            onPlay={engine.play}
            onPause={engine.pause}
            onSpeedChange={engine.setPlaybackSpeed}
          />
        </>
      )}
    </div>
  )
}

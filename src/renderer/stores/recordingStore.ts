import { create } from 'zustand'

interface RecordingState {
  isRecording: boolean
  recordingId: string | null
  startTime: number | null
  elapsed: number
  meltpoolFrames: number
  buildPlateFrames: number
  axisDataPoints: number

  setRecordingStatus: (status: Record<string, unknown>) => void
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  recordingId: null,
  startTime: null,
  elapsed: 0,
  meltpoolFrames: 0,
  buildPlateFrames: 0,
  axisDataPoints: 0,

  setRecordingStatus: (status) => set({
    isRecording: status.state === 'recording',
    recordingId: status.recordingId as string | null,
    startTime: status.startTime as number | null,
    elapsed: (status.elapsed as number) || 0,
    meltpoolFrames: (status.meltpoolFrames as number) || 0,
    buildPlateFrames: (status.buildPlateFrames as number) || 0,
    axisDataPoints: (status.axisDataPoints as number) || 0
  })
}))

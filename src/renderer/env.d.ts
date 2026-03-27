/// <reference types="vite/client" />

type JogAxis = 'x' | 'y' | 'z' | 'z2' | 'ext'
type JogDirection = 'forward' | 'backward'

interface MachineAPI {
  ads: {
    connect(config: { targetAmsNetId: string; targetAdsPort: number }): Promise<{ success: boolean; error?: string }>
    disconnect(): Promise<{ success: boolean; error?: string }>
    readSymbol(path: string): Promise<{ success: boolean; value?: unknown; error?: string }>
    writeSymbol(path: string, value: unknown): Promise<{ success: boolean; error?: string }>
    startJog(axis: JogAxis, direction: JogDirection): Promise<{ success: boolean; error?: string }>
    stopJog(axis: JogAxis, direction: JogDirection): Promise<{ success: boolean; error?: string }>
    stopAll(): Promise<{ success: boolean; error?: string }>
    setJogVelocity(velocity: number): Promise<{ success: boolean; error?: string }>
    setJogMode(mode: number): Promise<{ success: boolean; error?: string }>
    setJogDistance(distanceMm: number): Promise<{ success: boolean; error?: string }>
    isConnected(): Promise<boolean>
    diagnose(): Promise<{ status: string; message: string }>
    testConnection(config: { targetAmsNetId: string; targetAdsPort: number }): Promise<{ steps: Array<{ step: string; status: 'ok' | 'fail' | 'skip'; detail: string }> }>
    // System commands
    enableSystem(enable: boolean): Promise<{ success: boolean; error?: string }>
    homeSystem(): Promise<{ success: boolean; error?: string }>
    resetError(): Promise<{ success: boolean; error?: string }>
    startToolMeasure(): Promise<{ success: boolean; error?: string }>
    // Feed override
    setFeedOverride(percent: number): Promise<{ success: boolean; error?: string }>
    // Listeners
    onSymbolUpdate(callback: (data: Record<string, unknown>) => void): () => void
    onConnectionChange(callback: (connected: boolean, detail?: string) => void): () => void
  }
  camera: {
    start(): Promise<{ success: boolean; meltpoolUrl?: string; buildPlateUrl?: string; error?: string }>
    stop(): Promise<{ success: boolean; error?: string }>
    status(): Promise<{ running: boolean; error: string | null }>
    onStatusChange(callback: (status: { running: boolean; error: string | null }) => void): () => void
    setPalette(camera: number, palette: string): Promise<void>
    setScaling(camera: number, scaling: string): Promise<void>
    setManualRange(camera: number, min: number, max: number): Promise<void>
    setEmissivity(camera: number, value: number): Promise<void>
    forceFlagCycle(camera: number): Promise<void>
    setFocus(camera: number, value: number): Promise<void>
    setTransmissivity(camera: number, value: number): Promise<void>
    setAmbientTemp(camera: number, value: number): Promise<void>
    setTempRange(camera: number, min: number, max: number): Promise<void>
    setFlagInterval(camera: number, min: number, max: number): Promise<void>
    getDeviceTemps(camera: number): Promise<void>
  }
  recording: {
    start(fileName: string): Promise<{ success: boolean; error?: string }>
    stop(): Promise<{ success: boolean; error?: string }>
    status(): Promise<{ state: string; recordingId: string | null; elapsed: number; meltpoolFrames: number; buildPlateFrames: number; axisDataPoints: number }>
    list(): Promise<Array<{ id: string; fileName: string; startTime: number; endTime?: number; duration?: number; meltpoolFrameCount: number; buildPlateFrameCount: number }>>
    load(recordingId: string): Promise<{ manifest: Record<string, unknown>; gcode: string; axisLog: string[]; stateLog: string[]; meltpoolFrameLog: string[]; buildPlateFrameLog: string[] }>
    readFrame(recordingId: string, camera: string, frameIndex: number): Promise<ArrayBuffer | null>
    onStatusChange(callback: (status: Record<string, unknown>) => void): () => void
  }
  gcode: {
    loadFile(): Promise<{ fileName: string; content: string; filePath: string } | null>
    saveAndLoad(gcodeText: string, fileName: string, nciDir?: string): Promise<{ success: boolean; savedPath?: string; error?: string }>
    run(): Promise<{ success: boolean; error?: string }>
    stop(): Promise<{ success: boolean; error?: string }>
    reset(): Promise<{ success: boolean; error?: string }>
  }
  settings: {
    getAdsConfig(): Promise<{ targetAmsNetId: string; targetAdsPort: number }>
    setAdsConfig(config: { targetAmsNetId: string; targetAdsPort: number }): Promise<void>
    getJogSpeed(): Promise<string>
    setJogSpeed(speed: string): Promise<void>
  }
}

interface Window {
  machineAPI: MachineAPI
}

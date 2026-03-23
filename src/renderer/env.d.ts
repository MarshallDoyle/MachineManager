/// <reference types="vite/client" />

interface MachineAPI {
  ads: {
    connect(config: { targetAmsNetId: string; targetAdsPort: number }): Promise<{ success: boolean; error?: string }>
    disconnect(): Promise<{ success: boolean; error?: string }>
    readSymbol(path: string): Promise<{ success: boolean; value?: unknown; error?: string }>
    writeSymbol(path: string, value: unknown): Promise<{ success: boolean; error?: string }>
    startJog(axis: string, direction: string): Promise<{ success: boolean; error?: string }>
    stopJog(axis: string, direction: string): Promise<{ success: boolean; error?: string }>
    stopAll(): Promise<{ success: boolean; error?: string }>
    setJogVelocity(velocity: number): Promise<{ success: boolean; error?: string }>
    setJogMode(mode: number): Promise<{ success: boolean; error?: string }>
    setJogDistance(distanceMm: number): Promise<{ success: boolean; error?: string }>
    isConnected(): Promise<boolean>
    diagnose(): Promise<{ status: string; message: string }>
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

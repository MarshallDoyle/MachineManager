import { Client } from 'ads-client'

export interface AdsConnectionConfig {
  targetAmsNetId: string
  targetAdsPort: number
}

// PLC variable paths matching GVL_MachineManager
const PLC = {
  // System commands
  bEnableSystem: 'GVL_MachineManager.bEnableSystem',
  bHomeSystem: 'GVL_MachineManager.bHomeSystem',
  bResetError: 'GVL_MachineManager.bResetError',
  bStopAll: 'GVL_MachineManager.bStopAll',
  bStartToolMeasure: 'GVL_MachineManager.bStartToolMeasure',
  // G-code commands
  sGCodeFileName: 'GVL_MachineManager.sGCodeFileName',
  bLoadFile: 'GVL_MachineManager.bLoadFile',
  bRunFile: 'GVL_MachineManager.bRunFile',
  bStopFile: 'GVL_MachineManager.bStopFile',
  bResetInterpreter: 'GVL_MachineManager.bResetInterpreter',
  nFeedOverride: 'GVL_MachineManager.nFeedOverride',
  // Jog commands
  bXJogForward: 'GVL_MachineManager.bXJogForward',
  bXJogBackward: 'GVL_MachineManager.bXJogBackward',
  bYJogForward: 'GVL_MachineManager.bYJogForward',
  bYJogBackward: 'GVL_MachineManager.bYJogBackward',
  bZJogForward: 'GVL_MachineManager.bZJogForward',
  bZJogBackward: 'GVL_MachineManager.bZJogBackward',
  bZ2JogForward: 'GVL_MachineManager.bZ2JogForward',
  bZ2JogBackward: 'GVL_MachineManager.bZ2JogBackward',
  bExtJogForward: 'GVL_MachineManager.bExtJogForward',
  bExtJogBackward: 'GVL_MachineManager.bExtJogBackward',
  fJogVelocity: 'GVL_MachineManager.fJogVelocity',
  nJogMode: 'GVL_MachineManager.nJogMode',
  fJogDistance: 'GVL_MachineManager.fJogDistance',
  // Axis feedback
  fXActualPosition: 'GVL_MachineManager.fXActualPosition',
  fYActualPosition: 'GVL_MachineManager.fYActualPosition',
  fZActualPosition: 'GVL_MachineManager.fZActualPosition',
  fZ2ActualPosition: 'GVL_MachineManager.fZ2ActualPosition',
  fExtActualPosition: 'GVL_MachineManager.fExtActualPosition',
  fXActualVelocity: 'GVL_MachineManager.fXActualVelocity',
  fYActualVelocity: 'GVL_MachineManager.fYActualVelocity',
  fZActualVelocity: 'GVL_MachineManager.fZActualVelocity',
  fZ2ActualVelocity: 'GVL_MachineManager.fZ2ActualVelocity',
  fExtActualVelocity: 'GVL_MachineManager.fExtActualVelocity',
  // Axis status
  nXAxisState: 'GVL_MachineManager.nXAxisState',
  nYAxisState: 'GVL_MachineManager.nYAxisState',
  nZAxisState: 'GVL_MachineManager.nZAxisState',
  nZ2AxisState: 'GVL_MachineManager.nZ2AxisState',
  nExtAxisState: 'GVL_MachineManager.nExtAxisState',
  bXAxisError: 'GVL_MachineManager.bXAxisError',
  bYAxisError: 'GVL_MachineManager.bYAxisError',
  bZAxisError: 'GVL_MachineManager.bZAxisError',
  bZ2AxisError: 'GVL_MachineManager.bZ2AxisError',
  bExtAxisError: 'GVL_MachineManager.bExtAxisError',
  nXAxisErrorId: 'GVL_MachineManager.nXAxisErrorId',
  nYAxisErrorId: 'GVL_MachineManager.nYAxisErrorId',
  nZAxisErrorId: 'GVL_MachineManager.nZAxisErrorId',
  nZ2AxisErrorId: 'GVL_MachineManager.nZ2AxisErrorId',
  nExtAxisErrorId: 'GVL_MachineManager.nExtAxisErrorId',
  // Machine state
  nMachineState: 'GVL_MachineManager.nMachineState',
  bAllHomed: 'GVL_MachineManager.bAllHomed',
  bGroupBuilt: 'GVL_MachineManager.bGroupBuilt',
  bProgramLoaded: 'GVL_MachineManager.bProgramLoaded',
  bProgramRunning: 'GVL_MachineManager.bProgramRunning',
  bProgramError: 'GVL_MachineManager.bProgramError',
  nInterpreterState: 'GVL_MachineManager.nInterpreterState',
  bToolMeasureComplete: 'GVL_MachineManager.bToolMeasureComplete',
  // Tool measurement feedback
  fMeasuredZ: 'GVL_MachineManager.fMeasuredZ',
  fMeasuredZ2: 'GVL_MachineManager.fMeasuredZ2',
  fZToolOffset: 'GVL_MachineManager.fZToolOffset',
  fZ2ToolOffset: 'GVL_MachineManager.fZ2ToolOffset',
  // PLC status
  bPlcReady: 'GVL_MachineManager.bPlcReady',
  // ADS watchdog heartbeat
  nAdsHeartbeat: 'GVL_MachineManager.nAdsHeartbeat'
} as const

export { PLC }

export type ConnectionDiagnosis = {
  status: 'connected' | 'tc_config_mode' | 'plc_not_running' | 'symbols_not_found' | 'disconnected' | 'error'
  message: string
}

class AdsClientService {
  private client: Client | null = null
  private subscriptions: Array<{ unsubscribe: () => Promise<void> }> = []
  private onAxisUpdate: ((data: Record<string, unknown>) => void) | null = null
  private recordingCallback: ((data: Record<string, unknown>) => void) | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private heartbeatCounter: number = 0
  private onConnectionStatusChange: ((status: string, detail?: string) => void) | null = null

  setConnectionStatusHandler(handler: (status: string, detail?: string) => void): void {
    this.onConnectionStatusChange = handler
  }

  setRecordingCallback(callback: (data: Record<string, unknown>) => void): void {
    this.recordingCallback = callback
  }

  clearRecordingCallback(): void {
    this.recordingCallback = null
  }

  async connect(config: AdsConnectionConfig): Promise<void> {
    if (this.client) {
      await this.disconnect()
    }

    this.client = new Client({
      targetAmsNetId: config.targetAmsNetId,
      targetAdsPort: config.targetAdsPort,
      allowHalfOpen: true,
      autoReconnect: true,
      reconnectInterval: 2000
    })

    // Listen for connection events
    this.client.on('disconnect', () => {
      this.stopHeartbeat()
      this.onConnectionStatusChange?.('disconnected', 'Connection lost')
    })

    this.client.on('reconnect', () => {
      this.startHeartbeat()
      this.onConnectionStatusChange?.('connected', 'Reconnected')
    })

    this.client.on('connectionLost', () => {
      this.stopHeartbeat()
      this.onConnectionStatusChange?.('reconnecting', 'Connection lost, attempting to reconnect...')
    })

    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    if (!this.client) return

    this.stopHeartbeat()

    for (const sub of this.subscriptions) {
      try {
        await sub.unsubscribe()
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.subscriptions = []

    try {
      await this.client.disconnect()
    } catch {
      // Ignore
    }
    this.client = null
  }

  // --- Heartbeat ---

  startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(async () => {
      try {
        this.heartbeatCounter = (this.heartbeatCounter + 1) % 2147483647
        await this.writeSymbol(PLC.nAdsHeartbeat, this.heartbeatCounter)
      } catch {
        // Silently skip if PLC not ready
      }
    }, 200)
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // --- Diagnostics ---

  async diagnoseConnection(): Promise<ConnectionDiagnosis> {
    if (!this.client) {
      return { status: 'disconnected', message: 'Not connected to TwinCAT' }
    }

    try {
      const tcState = await this.client.readTcSystemState()
      if (tcState.adsState !== 5) { // 5 = ADS_STATE.Run
        return {
          status: 'tc_config_mode',
          message: `TwinCAT is in ${tcState.adsStateStr || 'Config'} mode. Activate Configuration and restart in Run mode.`
        }
      }
    } catch {
      return { status: 'error', message: 'Cannot read TwinCAT system state' }
    }

    try {
      const plcState = await this.client.readPlcRuntimeState()
      if (plcState.adsState !== 5) { // 5 = Run
        return {
          status: 'plc_not_running',
          message: `PLC runtime is in ${plcState.adsStateStr || 'Stop'} mode. Login to PLC and press Start in TwinCAT XAE.`
        }
      }
    } catch {
      return {
        status: 'plc_not_running',
        message: 'PLC runtime not reachable on port 851. Ensure PLC program is activated.'
      }
    }

    try {
      await this.client.readValue('GVL_MachineManager.bPlcReady')
      return { status: 'connected', message: 'Connected and PLC symbols accessible' }
    } catch {
      return {
        status: 'symbols_not_found',
        message: 'PLC is running but GVL_MachineManager symbols not found. Compile and download the PLC program.'
      }
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.connection?.connected === true
  }

  async readSymbol(path: string): Promise<unknown> {
    if (!this.client) throw new Error('Not connected to PLC')
    const result = await this.client.readValue(path)
    return result.value
  }

  async writeSymbol(path: string, value: unknown): Promise<void> {
    if (!this.client) throw new Error('Not connected to PLC')
    await this.client.writeValue(path, value)
  }

  // --- System commands ---

  async enableSystem(enable: boolean): Promise<void> {
    await this.writeSymbol(PLC.bEnableSystem, enable)
  }

  async homeSystem(): Promise<void> {
    await this.writeSymbol(PLC.bHomeSystem, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bHomeSystem, false) } catch { /* ignore */ }
    }, 200)
  }

  async resetError(): Promise<void> {
    await this.writeSymbol(PLC.bResetError, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bResetError, false) } catch { /* ignore */ }
    }, 200)
  }

  async startToolMeasure(): Promise<void> {
    await this.writeSymbol(PLC.bStartToolMeasure, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bStartToolMeasure, false) } catch { /* ignore */ }
    }, 200)
  }

  // --- G-code commands ---

  async setGCodeFileName(fileName: string): Promise<void> {
    await this.writeSymbol(PLC.sGCodeFileName, fileName)
  }

  async loadFile(): Promise<void> {
    await this.writeSymbol(PLC.bLoadFile, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bLoadFile, false) } catch { /* ignore */ }
    }, 200)
  }

  async runFile(): Promise<void> {
    await this.writeSymbol(PLC.bRunFile, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bRunFile, false) } catch { /* ignore */ }
    }, 200)
  }

  async stopFile(): Promise<void> {
    await this.writeSymbol(PLC.bStopFile, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bStopFile, false) } catch { /* ignore */ }
    }, 200)
  }

  async resetInterpreter(): Promise<void> {
    await this.writeSymbol(PLC.bResetInterpreter, true)
    setTimeout(async () => {
      try { await this.writeSymbol(PLC.bResetInterpreter, false) } catch { /* ignore */ }
    }, 200)
  }

  async setFeedOverride(percent: number): Promise<void> {
    // Convert 0-100 percent to 0-1000000 PLC scale
    const plcValue = Math.round(Math.max(0, Math.min(100, percent)) * 10000)
    await this.writeSymbol(PLC.nFeedOverride, plcValue)
  }

  // --- Jog commands ---

  async startJog(axis: string, direction: string): Promise<void> {
    const key = `b${axis.toUpperCase()}Jog${direction === 'forward' ? 'Forward' : 'Backward'}` as keyof typeof PLC
    const path = PLC[key]
    if (path) {
      await this.writeSymbol(path, true)
    }
  }

  async stopJog(axis: string, direction: string): Promise<void> {
    const key = `b${axis.toUpperCase()}Jog${direction === 'forward' ? 'Forward' : 'Backward'}` as keyof typeof PLC
    const path = PLC[key]
    if (path) {
      await this.writeSymbol(path, false)
    }
  }

  async stopAll(): Promise<void> {
    await this.writeSymbol(PLC.bStopAll, true)
    // Clear all jog commands
    await this.writeSymbol(PLC.bXJogForward, false)
    await this.writeSymbol(PLC.bXJogBackward, false)
    await this.writeSymbol(PLC.bYJogForward, false)
    await this.writeSymbol(PLC.bYJogBackward, false)
    await this.writeSymbol(PLC.bZJogForward, false)
    await this.writeSymbol(PLC.bZJogBackward, false)
    await this.writeSymbol(PLC.bZ2JogForward, false)
    await this.writeSymbol(PLC.bZ2JogBackward, false)
    await this.writeSymbol(PLC.bExtJogForward, false)
    await this.writeSymbol(PLC.bExtJogBackward, false)
    // Reset stop flag after a short delay
    setTimeout(async () => {
      try {
        await this.writeSymbol(PLC.bStopAll, false)
      } catch {
        // Ignore
      }
    }, 200)
  }

  async setJogVelocity(velocity: number): Promise<void> {
    await this.writeSymbol(PLC.fJogVelocity, velocity)
  }

  async setJogMode(mode: number): Promise<void> {
    await this.writeSymbol(PLC.nJogMode, mode)
  }

  async setJogDistance(distanceMm: number): Promise<void> {
    await this.writeSymbol(PLC.fJogDistance, distanceMm)
  }

  // --- Subscriptions ---

  async subscribeToAxes(
    callback: (data: Record<string, unknown>) => void,
    cycleTimeMs: number = 50
  ): Promise<void> {
    if (!this.client) throw new Error('Not connected to PLC')

    this.onAxisUpdate = callback

    const symbolsToWatch = [
      // Axis positions and velocities
      PLC.fXActualPosition, PLC.fYActualPosition, PLC.fZActualPosition,
      PLC.fZ2ActualPosition, PLC.fExtActualPosition,
      PLC.fXActualVelocity, PLC.fYActualVelocity, PLC.fZActualVelocity,
      PLC.fZ2ActualVelocity, PLC.fExtActualVelocity,
      // Axis states
      PLC.nXAxisState, PLC.nYAxisState, PLC.nZAxisState,
      PLC.nZ2AxisState, PLC.nExtAxisState,
      // Axis errors
      PLC.bXAxisError, PLC.bYAxisError, PLC.bZAxisError,
      PLC.bZ2AxisError, PLC.bExtAxisError,
      PLC.nXAxisErrorId, PLC.nYAxisErrorId, PLC.nZAxisErrorId,
      PLC.nZ2AxisErrorId, PLC.nExtAxisErrorId,
      // Machine state
      PLC.nMachineState, PLC.bAllHomed, PLC.bGroupBuilt,
      PLC.bProgramLoaded, PLC.bProgramRunning, PLC.bProgramError,
      PLC.nInterpreterState, PLC.bToolMeasureComplete,
      // Tool measurement
      PLC.fMeasuredZ, PLC.fMeasuredZ2,
      PLC.fZToolOffset, PLC.fZ2ToolOffset,
      // PLC ready
      PLC.bPlcReady
    ]

    for (const symbolPath of symbolsToWatch) {
      const sub = await this.client.subscribeValue(
        symbolPath,
        (data) => {
          const update = { [symbolPath]: data.value }
          if (this.onAxisUpdate) {
            this.onAxisUpdate(update)
          }
          if (this.recordingCallback) {
            this.recordingCallback(update)
          }
        },
        cycleTimeMs,
        false // sendOnChange: only send when value changes
      )
      this.subscriptions.push(sub)
    }
  }

  async unsubscribeAll(): Promise<void> {
    if (!this.client) return
    for (const sub of this.subscriptions) {
      try {
        await sub.unsubscribe()
      } catch {
        // Ignore
      }
    }
    this.subscriptions = []
  }
}

// Singleton instance
export const adsService = new AdsClientService()

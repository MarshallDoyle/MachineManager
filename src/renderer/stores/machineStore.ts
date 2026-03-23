import { create } from 'zustand'
import type { AxisState, AxisId, JogSpeed, JogDistance, ConnectionStatus, CameraStatus, CameraSettings, ThermalPalette, ScalingMethod } from '../types/machine'
import { JOG_SPEED_MAP, JOG_DISTANCE_MAP, DEFAULT_CAMERA_SETTINGS } from '../types/machine'

interface MachineState {
  // Connection
  connectionStatus: ConnectionStatus
  adsConfig: { targetAmsNetId: string; targetAdsPort: number }

  // Axes
  axes: Record<AxisId, AxisState>

  // Jog
  jogSpeed: JogSpeed
  jogDistance: JogDistance

  // Camera
  cameraStatus: CameraStatus
  meltpoolWsUrl: string | null
  buildPlateWsUrl: string | null
  cameraSettings: CameraSettings[]

  // PLC
  plcReady: boolean

  // Machine state
  machineState: number
  allHomed: boolean
  groupBuilt: boolean
  programLoaded: boolean
  programRunning: boolean
  programError: boolean
  interpreterState: number
  toolMeasureComplete: boolean
  feedOverride: number

  // G-code
  gcodeFileName: string | null

  // Tool measurement
  measuredZ: number
  measuredZ2: number
  zToolOffset: number
  z2ToolOffset: number

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void
  setAdsConfig: (config: { targetAmsNetId: string; targetAdsPort: number }) => void
  updateAxisData: (data: Record<string, unknown>) => void
  setJogSpeed: (speed: JogSpeed) => void
  setJogDistance: (distance: JogDistance) => void
  setCameraStatus: (status: CameraStatus) => void
  setCameraUrls: (meltpool: string | null, buildPlate: string | null) => void
  setCameraPalette: (camera: number, palette: ThermalPalette) => void
  setCameraScaling: (camera: number, scaling: ScalingMethod) => void
  setCameraManualRange: (camera: number, min: number, max: number) => void
  setCameraEmissivity: (camera: number, value: number) => void
  setCameraOverlay: (camera: number, key: 'showOverlay' | 'showColorBar' | 'showCrosshairs', value: boolean) => void
  setGcodeFileName: (name: string | null) => void
  setPlcReady: (ready: boolean) => void
  setFeedOverride: (percent: number) => void
}

const defaultAxis: AxisState = {
  actualPosition: 0,
  actualVelocity: 0,
  axisState: 0,
  error: false,
  errorId: 0
}

export const useMachineStore = create<MachineState>((set) => ({
  connectionStatus: 'disconnected',
  adsConfig: { targetAmsNetId: '127.0.0.1.1.1', targetAdsPort: 851 },

  axes: {
    x: { ...defaultAxis },
    y: { ...defaultAxis },
    z: { ...defaultAxis },
    z2: { ...defaultAxis },
    ext: { ...defaultAxis }
  },

  jogSpeed: '10ipm',
  jogDistance: 'continuous',

  cameraStatus: 'stopped',
  meltpoolWsUrl: 'ws://localhost:9801',
  buildPlateWsUrl: 'ws://localhost:9802',
  cameraSettings: [...DEFAULT_CAMERA_SETTINGS],

  plcReady: false,

  // Machine state
  machineState: 0,
  allHomed: false,
  groupBuilt: false,
  programLoaded: false,
  programRunning: false,
  programError: false,
  interpreterState: 0,
  toolMeasureComplete: false,
  feedOverride: 100,
  gcodeFileName: null,

  // Tool measurement
  measuredZ: 0,
  measuredZ2: 0,
  zToolOffset: 0,
  z2ToolOffset: 0,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setAdsConfig: (config) => set({ adsConfig: config }),

  updateAxisData: (data) =>
    set((state) => {
      const axes = { ...state.axes }
      let plcReady = state.plcReady
      let machineState = state.machineState
      let allHomed = state.allHomed
      let groupBuilt = state.groupBuilt
      let programLoaded = state.programLoaded
      let programRunning = state.programRunning
      let programError = state.programError
      let interpreterState = state.interpreterState
      let toolMeasureComplete = state.toolMeasureComplete
      let measuredZ = state.measuredZ
      let measuredZ2 = state.measuredZ2
      let zToolOffset = state.zToolOffset
      let z2ToolOffset = state.z2ToolOffset

      for (const [path, value] of Object.entries(data)) {
        // Axis positions
        if (path.includes('fXActualPosition')) axes.x = { ...axes.x, actualPosition: value as number }
        else if (path.includes('fYActualPosition')) axes.y = { ...axes.y, actualPosition: value as number }
        else if (path.includes('fZActualPosition') && !path.includes('fZ2')) axes.z = { ...axes.z, actualPosition: value as number }
        else if (path.includes('fZ2ActualPosition')) axes.z2 = { ...axes.z2, actualPosition: value as number }
        else if (path.includes('fExtActualPosition')) axes.ext = { ...axes.ext, actualPosition: value as number }
        // Axis velocities
        else if (path.includes('fXActualVelocity')) axes.x = { ...axes.x, actualVelocity: value as number }
        else if (path.includes('fYActualVelocity')) axes.y = { ...axes.y, actualVelocity: value as number }
        else if (path.includes('fZActualVelocity') && !path.includes('fZ2')) axes.z = { ...axes.z, actualVelocity: value as number }
        else if (path.includes('fZ2ActualVelocity')) axes.z2 = { ...axes.z2, actualVelocity: value as number }
        else if (path.includes('fExtActualVelocity')) axes.ext = { ...axes.ext, actualVelocity: value as number }
        // Axis states
        else if (path.includes('nXAxisState')) axes.x = { ...axes.x, axisState: value as number }
        else if (path.includes('nYAxisState')) axes.y = { ...axes.y, axisState: value as number }
        else if (path.includes('nZAxisState') && !path.includes('nZ2')) axes.z = { ...axes.z, axisState: value as number }
        else if (path.includes('nZ2AxisState')) axes.z2 = { ...axes.z2, axisState: value as number }
        else if (path.includes('nExtAxisState')) axes.ext = { ...axes.ext, axisState: value as number }
        // Axis errors
        else if (path.includes('bXAxisError')) axes.x = { ...axes.x, error: value as boolean }
        else if (path.includes('bYAxisError')) axes.y = { ...axes.y, error: value as boolean }
        else if (path.includes('bZAxisError') && !path.includes('bZ2')) axes.z = { ...axes.z, error: value as boolean }
        else if (path.includes('bZ2AxisError')) axes.z2 = { ...axes.z2, error: value as boolean }
        else if (path.includes('bExtAxisError')) axes.ext = { ...axes.ext, error: value as boolean }
        // Axis error IDs
        else if (path.includes('nXAxisErrorId')) axes.x = { ...axes.x, errorId: value as number }
        else if (path.includes('nYAxisErrorId')) axes.y = { ...axes.y, errorId: value as number }
        else if (path.includes('nZAxisErrorId') && !path.includes('nZ2')) axes.z = { ...axes.z, errorId: value as number }
        else if (path.includes('nZ2AxisErrorId')) axes.z2 = { ...axes.z2, errorId: value as number }
        else if (path.includes('nExtAxisErrorId')) axes.ext = { ...axes.ext, errorId: value as number }
        // Machine state
        else if (path.includes('nMachineState')) machineState = value as number
        else if (path.includes('bAllHomed')) allHomed = value as boolean
        else if (path.includes('bGroupBuilt')) groupBuilt = value as boolean
        else if (path.includes('bProgramLoaded')) programLoaded = value as boolean
        else if (path.includes('bProgramRunning')) programRunning = value as boolean
        else if (path.includes('bProgramError')) programError = value as boolean
        else if (path.includes('nInterpreterState')) interpreterState = value as number
        else if (path.includes('bToolMeasureComplete')) toolMeasureComplete = value as boolean
        // Tool measurement
        else if (path.includes('fMeasuredZ') && !path.includes('fMeasuredZ2')) measuredZ = value as number
        else if (path.includes('fMeasuredZ2')) measuredZ2 = value as number
        else if (path.includes('fZToolOffset') && !path.includes('fZ2')) zToolOffset = value as number
        else if (path.includes('fZ2ToolOffset')) z2ToolOffset = value as number
        // PLC ready
        else if (path.includes('bPlcReady')) plcReady = value as boolean
      }

      return {
        axes, plcReady, machineState, allHomed, groupBuilt,
        programLoaded, programRunning, programError, interpreterState,
        toolMeasureComplete, measuredZ, measuredZ2, zToolOffset, z2ToolOffset
      }
    }),

  setJogSpeed: (speed) => {
    set({ jogSpeed: speed })
    // Convert in/min to mm/s and write to PLC
    const velocityMmS = JOG_SPEED_MAP[speed]
    window.machineAPI?.ads.setJogVelocity(velocityMmS)
  },

  setJogDistance: (distance) => {
    set({ jogDistance: distance })
    if (distance === 'continuous') {
      // Continuous mode: nJogMode = 0
      window.machineAPI?.ads.setJogMode(0)
    } else {
      // Incremental mode: nJogMode = 1, set distance in mm
      const distanceMm = JOG_DISTANCE_MAP[distance]
      window.machineAPI?.ads.setJogMode(1)
      window.machineAPI?.ads.setJogDistance(distanceMm)
    }
  },

  setFeedOverride: (percent) => {
    set({ feedOverride: percent })
    window.machineAPI?.ads.setFeedOverride(percent)
  },

  setCameraStatus: (status) => set({ cameraStatus: status }),
  setCameraUrls: (meltpool, buildPlate) =>
    set({ meltpoolWsUrl: meltpool, buildPlateWsUrl: buildPlate }),

  setCameraPalette: (camera, palette) => {
    set((state) => {
      const settings = [...state.cameraSettings]
      if (settings[camera]) settings[camera] = { ...settings[camera], palette }
      return { cameraSettings: settings }
    })
    window.machineAPI?.camera.setPalette(camera, palette)
  },

  setCameraScaling: (camera, scaling) => {
    set((state) => {
      const settings = [...state.cameraSettings]
      if (settings[camera]) settings[camera] = { ...settings[camera], scaling }
      return { cameraSettings: settings }
    })
    window.machineAPI?.camera.setScaling(camera, scaling)
  },

  setCameraManualRange: (camera, min, max) => {
    set((state) => {
      const settings = [...state.cameraSettings]
      if (settings[camera]) settings[camera] = { ...settings[camera], manualMin: min, manualMax: max }
      return { cameraSettings: settings }
    })
    window.machineAPI?.camera.setManualRange(camera, min, max)
  },

  setCameraEmissivity: (camera, value) => {
    set((state) => {
      const settings = [...state.cameraSettings]
      if (settings[camera]) settings[camera] = { ...settings[camera], emissivity: value }
      return { cameraSettings: settings }
    })
    window.machineAPI?.camera.setEmissivity(camera, value)
  },

  setGcodeFileName: (name) => set({ gcodeFileName: name }),

  setCameraOverlay: (camera, key, value) => {
    set((state) => {
      const settings = [...state.cameraSettings]
      if (settings[camera]) settings[camera] = { ...settings[camera], [key]: value }
      return { cameraSettings: settings }
    })
  },

  setPlcReady: (ready) => set({ plcReady: ready })
}))

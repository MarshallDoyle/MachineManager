export interface AdsConfig {
  targetAmsNetId: string
  targetAdsPort: number
}

export interface AxisState {
  actualPosition: number
  actualVelocity: number
  axisState: number
  error: boolean
  errorId: number
}

export type AxisId = 'x' | 'y' | 'z' | 'z2' | 'ext'
export type JogDirection = 'forward' | 'backward'
export type JogSpeed = '1ipm' | '10ipm' | '25ipm' | 'rapid'
export type JogDistance = '0.001' | '0.01' | '0.1' | '1' | 'continuous'

// Speed in in/min -> converted to mm/s for PLC
export const JOG_SPEED_MAP: Record<JogSpeed, number> = {
  '1ipm': 25.4 / 60,       // 1 in/min = 0.4233 mm/s
  '10ipm': 254.0 / 60,     // 10 in/min = 4.2333 mm/s
  '25ipm': 635.0 / 60,     // 25 in/min = 10.5833 mm/s
  'rapid': 100.0            // High value, PLC clamps to axis max
}

// Distance in inches -> converted to mm for PLC
export const JOG_DISTANCE_MAP: Record<JogDistance, number> = {
  '0.001': 0.0254,    // 0.001 in
  '0.01': 0.254,      // 0.01 in
  '0.1': 2.54,        // 0.1 in
  '1': 25.4,          // 1 in
  'continuous': 0      // 0 = continuous mode (MC_Jog)
}

// Unit conversion helpers
export const MM_TO_IN = 1 / 25.4
export const MMS_TO_IPM = 60 / 25.4  // mm/s to in/min

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type CameraStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface CameraUrls {
  meltpoolUrl: string
  buildPlateUrl: string
}

// Camera thermal imaging types
export type ThermalPalette = 'iron' | 'ironHi' | 'rainbow' | 'rainbowHi' | 'grayBW' | 'grayWB' | 'medical' | 'alarmBlue' | 'alarmBlueHi' | 'alarmGreen' | 'alarmRed'
export type ScalingMethod = 'manual' | 'minmax' | 'sigma1' | 'sigma3'

export const PALETTE_OPTIONS: { value: ThermalPalette; label: string }[] = [
  { value: 'iron', label: 'Iron' },
  { value: 'ironHi', label: 'Iron Hi' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'rainbowHi', label: 'Rainbow Hi' },
  { value: 'grayBW', label: 'Gray B/W' },
  { value: 'grayWB', label: 'Gray W/B' },
  { value: 'medical', label: 'Medical' },
  { value: 'alarmBlue', label: 'Alarm Blue' },
  { value: 'alarmBlueHi', label: 'Alarm Blue Hi' },
  { value: 'alarmGreen', label: 'Alarm Green' },
  { value: 'alarmRed', label: 'Alarm Red' }
]

export const SCALING_OPTIONS: { value: ScalingMethod; label: string }[] = [
  { value: 'minmax', label: 'Min/Max' },
  { value: 'sigma1', label: 'Sigma 1' },
  { value: 'sigma3', label: 'Sigma 3' },
  { value: 'manual', label: 'Manual' }
]

// CSS gradient approximations for each palette
export const PALETTE_GRADIENTS: Record<ThermalPalette, string> = {
  iron: 'linear-gradient(to top, #00008b, #8b0000, #ff4500, #ffd700, #ffffe0)',
  ironHi: 'linear-gradient(to top, #000040, #600000, #cc2200, #ffaa00, #ffffff)',
  rainbow: 'linear-gradient(to top, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
  rainbowHi: 'linear-gradient(to top, #000080, #0080ff, #00ff80, #ffff00, #ff0000, #ffffff)',
  grayBW: 'linear-gradient(to top, #000000, #ffffff)',
  grayWB: 'linear-gradient(to top, #ffffff, #000000)',
  medical: 'linear-gradient(to top, #000000, #0000ff, #00ff00, #ffff00, #ff0000, #ffffff)',
  alarmBlue: 'linear-gradient(to top, #000000, #0000ff, #00ffff)',
  alarmBlueHi: 'linear-gradient(to top, #000000, #0000aa, #0088ff, #ffffff)',
  alarmGreen: 'linear-gradient(to top, #000000, #008000, #00ff00)',
  alarmRed: 'linear-gradient(to top, #000000, #8b0000, #ff0000, #ffffff)'
}

export interface CameraSettings {
  palette: ThermalPalette
  scaling: ScalingMethod
  manualMin: number
  manualMax: number
  emissivity: number
  transmissivity: number
  ambientTemp: number  // -100 = auto
  focusPosition: number  // 0-100%, -1 = no motor
  flagMinInterval: number
  flagMaxInterval: number
  showOverlay: boolean
  showColorBar: boolean
  showCrosshairs: boolean
}

export const TEMP_RANGE_OPTIONS = [
  { label: '-20 to 100°C', min: -20, max: 100 },
  { label: '0 to 250°C', min: 0, max: 250 },
  { label: '150 to 900°C', min: 150, max: 900 },
  { label: '450 to 1800°C', min: 450, max: 1800 }
]

export const DEFAULT_CAMERA_SETTINGS: CameraSettings[] = [
  { palette: 'iron', scaling: 'minmax', manualMin: 450, manualMax: 1800, emissivity: 0.95, transmissivity: 1.0, ambientTemp: -100, focusPosition: -1, flagMinInterval: 15, flagMaxInterval: 0, showOverlay: true, showColorBar: true, showCrosshairs: true },
  { palette: 'iron', scaling: 'sigma3', manualMin: -20, manualMax: 100, emissivity: 0.95, transmissivity: 1.0, ambientTemp: -100, focusPosition: 50, flagMinInterval: 15, flagMaxInterval: 0, showOverlay: true, showColorBar: true, showCrosshairs: true }
]

export interface PlcStatus {
  ready: boolean
}

export interface MachineStatus {
  machineState: number
  allHomed: boolean
  groupBuilt: boolean
  programLoaded: boolean
  programRunning: boolean
  programError: boolean
  interpreterState: number
  toolMeasureComplete: boolean
  measuredZ: number
  measuredZ2: number
  zToolOffset: number
  z2ToolOffset: number
}

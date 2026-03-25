import { create } from 'zustand'

export type AmbrellConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type AmbrellRunMode = 'off' | 'manual' | 'auto'
export type AmbrellHeatingState = 'idle' | 'heating' | 'cooldown' | 'fault'

export interface AmbrellState {
  // Connection
  connectionStatus: AmbrellConnectionStatus
  connectionError: string | null

  // Realtime readouts
  outputPower: number       // kW (0-10)
  outputPowerPercent: number // % (0-100)
  frequency: number         // kHz
  tankVoltage: number       // V
  tankCurrent: number       // A
  workheadTemp: number      // °C
  waterFlowRate: number     // L/min
  waterInletTemp: number    // °C
  waterOutletTemp: number   // °C

  // Control state
  runMode: AmbrellRunMode
  heatingState: AmbrellHeatingState
  powerSetpoint: number     // % (0-100)
  faultCode: string | null

  // PID auto mode
  pidEnabled: boolean
  pidTarget: number         // target temperature °C
  pidKp: number
  pidKi: number
  pidKd: number

  // Profile (front panel has 4 profiles x 5 steps)
  activeProfile: number     // 0-3
  profiles: AmbrellProfile[]

  // Actions
  setConnectionStatus: (status: AmbrellConnectionStatus, error?: string | null) => void
  updateReadouts: (data: Partial<AmbrellState>) => void
  setRunMode: (mode: AmbrellRunMode) => void
  setHeatingState: (state: AmbrellHeatingState) => void
  setPowerSetpoint: (percent: number) => void
  setFaultCode: (code: string | null) => void
  setPidEnabled: (enabled: boolean) => void
  setPidTarget: (temp: number) => void
  setPidParams: (kp: number, ki: number, kd: number) => void
}

export interface AmbrellProfileStep {
  duration: number   // seconds
  power: number      // %
}

export interface AmbrellProfile {
  name: string
  steps: AmbrellProfileStep[]
}

const DEFAULT_PROFILES: AmbrellProfile[] = [
  { name: 'Profile 1', steps: [{ duration: 10, power: 50 }] },
  { name: 'Profile 2', steps: [{ duration: 10, power: 75 }] },
  { name: 'Profile 3', steps: [{ duration: 5, power: 100 }] },
  { name: 'Profile 4', steps: [{ duration: 30, power: 25 }] }
]

export const useAmbrellStore = create<AmbrellState>((set) => ({
  connectionStatus: 'disconnected',
  connectionError: null,

  outputPower: 0,
  outputPowerPercent: 0,
  frequency: 0,
  tankVoltage: 0,
  tankCurrent: 0,
  workheadTemp: 0,
  waterFlowRate: 0,
  waterInletTemp: 0,
  waterOutletTemp: 0,

  runMode: 'off',
  heatingState: 'idle',
  powerSetpoint: 0,
  faultCode: null,

  pidEnabled: false,
  pidTarget: 500,
  pidKp: 1.0,
  pidKi: 0.1,
  pidKd: 0.05,

  activeProfile: 0,
  profiles: [...DEFAULT_PROFILES],

  setConnectionStatus: (status, error = null) => set({ connectionStatus: status, connectionError: error }),
  updateReadouts: (data) => set(data),
  setRunMode: (mode) => set({ runMode: mode }),
  setHeatingState: (state) => set({ heatingState: state }),
  setPowerSetpoint: (percent) => set({ powerSetpoint: Math.max(0, Math.min(100, percent)) }),
  setFaultCode: (code) => set({ faultCode: code, heatingState: code ? 'fault' : 'idle' }),
  setPidEnabled: (enabled) => set({ pidEnabled: enabled }),
  setPidTarget: (temp) => set({ pidTarget: temp }),
  setPidParams: (kp, ki, kd) => set({ pidKp: kp, pidKi: ki, pidKd: kd })
}))

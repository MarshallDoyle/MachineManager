import { create } from 'zustand'

export type BedHeatingState = 'off' | 'heating' | 'cooling' | 'at-temp'

export interface HeatedBedState {
  // Readouts
  currentTemp: number        // °C from thermocouple
  targetTemp: number         // °C setpoint
  heaterPower: number        // % (0-100)
  heatingState: BedHeatingState
  connected: boolean

  // PID
  pidKp: number
  pidKi: number
  pidKd: number

  // Actions
  setCurrentTemp: (temp: number) => void
  setTargetTemp: (temp: number) => void
  setHeaterPower: (power: number) => void
  setHeatingState: (state: BedHeatingState) => void
  setConnected: (connected: boolean) => void
  setPidParams: (kp: number, ki: number, kd: number) => void
  toggleHeater: () => void
}

export const useHeatedBedStore = create<HeatedBedState>((set, get) => ({
  currentTemp: 22.5,
  targetTemp: 250,
  heaterPower: 0,
  heatingState: 'off',
  connected: false,

  pidKp: 2.0,
  pidKi: 0.5,
  pidKd: 0.1,

  setCurrentTemp: (temp) => set({ currentTemp: temp }),
  setTargetTemp: (temp) => set({ targetTemp: temp }),
  setHeaterPower: (power) => set({ heaterPower: power }),
  setHeatingState: (state) => set({ heatingState: state }),
  setConnected: (connected) => set({ connected }),
  setPidParams: (kp, ki, kd) => set({ pidKp: kp, pidKi: ki, pidKd: kd }),
  toggleHeater: () => {
    const state = get().heatingState
    set({ heatingState: state === 'off' ? 'heating' : 'off', heaterPower: state === 'off' ? 0 : 0 })
  }
}))

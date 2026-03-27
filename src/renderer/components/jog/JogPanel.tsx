import { useEffect } from 'react'
import { JogButton } from './JogButton'
import { useAxisPosition } from '../../hooks/useAxisPosition'
import { useMachineStore } from '../../stores/machineStore'
import type { JogSpeed, JogDistance } from '../../types/machine'
import { MM_TO_IN, MMS_TO_IPM } from '../../types/machine'

const SPEED_OPTIONS: { value: JogSpeed; label: string }[] = [
  { value: '1ipm', label: '1 in/min' },
  { value: '10ipm', label: '10 in/min' },
  { value: '25ipm', label: '25 in/min' },
  { value: 'rapid', label: 'Rapid' }
]

const DISTANCE_OPTIONS: { value: JogDistance; label: string }[] = [
  { value: '0.001', label: '.001"' },
  { value: '0.01', label: '.01"' },
  { value: '0.1', label: '.1"' },
  { value: '1', label: '1"' },
  { value: 'continuous', label: 'Continuous' }
]

function AxisReadout({ axis, label }: { axis: string; label: string }) {
  const axisState = useAxisPosition(axis as any)
  const posInches = axisState.actualPosition * MM_TO_IN
  const velIpm = axisState.actualVelocity * MMS_TO_IPM

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-zinc-500 font-mono w-6">{label}</span>
      <span className={`font-mono ${axisState.error ? 'text-red-400' : 'text-green-400'}`}>
        {posInches.toFixed(4)}
      </span>
      <span className="text-zinc-600">in</span>
      <span className="text-zinc-400 font-mono">{velIpm.toFixed(1)}</span>
      <span className="text-zinc-600">ipm</span>
      {axisState.error && (
        <span className="text-red-400 font-mono">ERR 0x{axisState.errorId.toString(16).toUpperCase()}</span>
      )}
    </div>
  )
}

export function JogPanel() {
  const connectionStatus = useMachineStore((s) => s.connectionStatus)
  const jogSpeed = useMachineStore((s) => s.jogSpeed)
  const jogDistance = useMachineStore((s) => s.jogDistance)
  const setJogSpeed = useMachineStore((s) => s.setJogSpeed)
  const setJogDistance = useMachineStore((s) => s.setJogDistance)
  const programRunning = useMachineStore((s) => s.programRunning)

  const notConnected = connectionStatus !== 'connected'
  const disabled = notConnected || programRunning
  const isContinuous = jogDistance === 'continuous'
  const incremental = !isContinuous

  // Keyboard shortcuts
  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (isContinuous) {
        switch (e.key) {
          case 'ArrowLeft': e.preventDefault(); window.machineAPI.ads.startJog('x', 'backward'); break
          case 'ArrowRight': e.preventDefault(); window.machineAPI.ads.startJog('x', 'forward'); break
          case 'ArrowDown': e.preventDefault(); window.machineAPI.ads.startJog('y', 'backward'); break
          case 'ArrowUp': e.preventDefault(); window.machineAPI.ads.startJog('y', 'forward'); break
          case 'PageDown': e.preventDefault(); window.machineAPI.ads.startJog('z', 'backward'); break
          case 'PageUp': e.preventDefault(); window.machineAPI.ads.startJog('z', 'forward'); break
        }
      } else {
        if (e.repeat) return
        switch (e.key) {
          case 'ArrowLeft': e.preventDefault(); window.machineAPI.ads.startJog('x', 'backward'); setTimeout(() => window.machineAPI.ads.stopJog('x', 'backward'), 100); break
          case 'ArrowRight': e.preventDefault(); window.machineAPI.ads.startJog('x', 'forward'); setTimeout(() => window.machineAPI.ads.stopJog('x', 'forward'), 100); break
          case 'ArrowDown': e.preventDefault(); window.machineAPI.ads.startJog('y', 'backward'); setTimeout(() => window.machineAPI.ads.stopJog('y', 'backward'), 100); break
          case 'ArrowUp': e.preventDefault(); window.machineAPI.ads.startJog('y', 'forward'); setTimeout(() => window.machineAPI.ads.stopJog('y', 'forward'), 100); break
          case 'PageDown': e.preventDefault(); window.machineAPI.ads.startJog('z', 'backward'); setTimeout(() => window.machineAPI.ads.stopJog('z', 'backward'), 100); break
          case 'PageUp': e.preventDefault(); window.machineAPI.ads.startJog('z', 'forward'); setTimeout(() => window.machineAPI.ads.stopJog('z', 'forward'), 100); break
        }
      }
      if (e.key === 'Escape') { e.preventDefault(); window.machineAPI.ads.stopAll() }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isContinuous) return
      switch (e.key) {
        case 'ArrowLeft': window.machineAPI.ads.stopJog('x', 'backward'); break
        case 'ArrowRight': window.machineAPI.ads.stopJog('x', 'forward'); break
        case 'ArrowDown': window.machineAPI.ads.stopJog('y', 'backward'); break
        case 'ArrowUp': window.machineAPI.ads.stopJog('y', 'forward'); break
        case 'PageDown': window.machineAPI.ads.stopJog('z', 'backward'); break
        case 'PageUp': window.machineAPI.ads.stopJog('z', 'forward'); break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [disabled, isContinuous])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">Jog Controls</h2>
        <button
          onClick={() => window.machineAPI.ads.stopAll()}
          disabled={notConnected}
          className="px-4 py-1.5 rounded-md text-xs font-bold uppercase bg-red-700 border border-red-500 text-white hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Stop All
        </button>
      </div>

      {/* Speed + Distance selectors */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs">Speed:</span>
          <div className="flex rounded-md overflow-hidden border border-zinc-600">
            {SPEED_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setJogSpeed(opt.value)} disabled={disabled}
                className={`px-3 py-1 text-xs font-medium transition-colors ${jogSpeed === opt.value ? (opt.value === 'rapid' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white') : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-30`}
              >{opt.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs">Distance:</span>
          <div className="flex rounded-md overflow-hidden border border-zinc-600">
            {DISTANCE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setJogDistance(opt.value)} disabled={disabled}
                className={`px-3 py-1 text-xs font-medium transition-colors ${jogDistance === opt.value ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-30`}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Main jog grid: XY joystick | Z | Secondary Z | Extruder */}
      <div className="grid grid-cols-4 gap-4">

        {/* XY Joystick */}
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wide mb-2">X / Y</span>
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[120px] h-[120px]">
            <div />
            {/* Y Forward (Up) */}
            <JogButton label={'\u25B2'} axis="y" direction="forward" disabled={disabled} incremental={incremental} className="w-full h-full" />
            <div />
            {/* X Backward (Left) */}
            <JogButton label={'\u25C4'} axis="x" direction="backward" disabled={disabled} incremental={incremental} className="w-full h-full" />
            {/* Center */}
            <div className="bg-zinc-800 rounded flex items-center justify-center text-zinc-600 text-[10px]">XY</div>
            {/* X Forward (Right) */}
            <JogButton label={'\u25BA'} axis="x" direction="forward" disabled={disabled} incremental={incremental} className="w-full h-full" />
            <div />
            {/* Y Backward (Down) */}
            <JogButton label={'\u25BC'} axis="y" direction="backward" disabled={disabled} incremental={incremental} className="w-full h-full" />
            <div />
          </div>
          <div className="mt-2 space-y-0.5">
            <AxisReadout axis="x" label="X" />
            <AxisReadout axis="y" label="Y" />
          </div>
        </div>

        {/* Z Axis (standard up/down — directions already correct) */}
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wide mb-2">Z</span>
          <div className="flex flex-col items-center gap-2">
            <JogButton label={'\u25B2'} axis="z" direction="forward" disabled={disabled} incremental={incremental} className="w-10 h-10" />
            <div className="bg-zinc-800 rounded w-10 h-10 flex items-center justify-center text-zinc-600 text-xs font-bold">Z</div>
            <JogButton label={'\u25BC'} axis="z" direction="backward" disabled={disabled} incremental={incremental} className="w-10 h-10" />
          </div>
          <div className="mt-2">
            <AxisReadout axis="z" label="Z" />
          </div>
        </div>

        {/* Secondary Z (Z2) — directions FLIPPED: up=backward, down=forward */}
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wide mb-2">Secondary Z</span>
          <div className="flex flex-col items-center gap-2">
            <JogButton label={'\u25B2'} axis="z2" direction="backward" disabled={disabled} incremental={incremental} className="w-10 h-10" />
            <div className="bg-zinc-800 rounded w-10 h-10 flex items-center justify-center text-zinc-600 text-xs font-bold">Z2</div>
            <JogButton label={'\u25BC'} axis="z2" direction="forward" disabled={disabled} incremental={incremental} className="w-10 h-10" />
          </div>
          <div className="mt-2">
            <AxisReadout axis="z2" label="Z2" />
          </div>
        </div>

        {/* Extruder — Feed / Retract */}
        <div className="flex flex-col items-center">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wide mb-2">Extruder</span>
          <div className="flex flex-col items-center gap-2">
            <JogButton label="Feed" axis="ext" direction="forward" disabled={disabled} incremental={incremental} className="w-20 h-10 text-[10px]" />
            <div className="bg-zinc-800 rounded w-20 h-10 flex items-center justify-center text-zinc-600 text-xs font-bold">EXT</div>
            <JogButton label="Retract" axis="ext" direction="backward" disabled={disabled} incremental={incremental} className="w-20 h-10 text-[10px]" />
          </div>
          <div className="mt-2">
            <AxisReadout axis="ext" label="E" />
          </div>
        </div>

      </div>

      {/* Status */}
      {notConnected && <p className="text-zinc-600 text-xs mt-3 text-center">Connect to PLC to enable jog controls</p>}
      {programRunning && <p className="text-yellow-600 text-xs mt-3 text-center">Jogging disabled while program is running</p>}
      <p className="text-zinc-700 text-xs mt-3">Keyboard: Arrow keys = X/Y | PgUp/PgDn = Z | Esc = Stop All</p>
    </div>
  )
}

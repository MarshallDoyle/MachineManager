import { useEffect } from 'react'
import { AxisControl } from './AxisControl'
import { useMachineStore } from '../../stores/machineStore'
import type { JogSpeed, JogDistance } from '../../types/machine'

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

export function JogPanel() {
  const connectionStatus = useMachineStore((s) => s.connectionStatus)
  const jogSpeed = useMachineStore((s) => s.jogSpeed)
  const jogDistance = useMachineStore((s) => s.jogDistance)
  const setJogSpeed = useMachineStore((s) => s.setJogSpeed)
  const setJogDistance = useMachineStore((s) => s.setJogDistance)
  const allHomed = useMachineStore((s) => s.allHomed)
  const programRunning = useMachineStore((s) => s.programRunning)

  const notConnected = connectionStatus !== 'connected'
  const disabled = notConnected || programRunning
  const isContinuous = jogDistance === 'continuous'

  // Keyboard shortcuts for jogging (continuous mode only)
  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (isContinuous) {
        // Continuous: hold key to move
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault()
            window.machineAPI.ads.startJog('x', 'backward')
            break
          case 'ArrowRight':
            e.preventDefault()
            window.machineAPI.ads.startJog('x', 'forward')
            break
          case 'ArrowDown':
            e.preventDefault()
            window.machineAPI.ads.startJog('y', 'backward')
            break
          case 'ArrowUp':
            e.preventDefault()
            window.machineAPI.ads.startJog('y', 'forward')
            break
          case 'PageDown':
            e.preventDefault()
            window.machineAPI.ads.startJog('z', 'backward')
            break
          case 'PageUp':
            e.preventDefault()
            window.machineAPI.ads.startJog('z', 'forward')
            break
        }
      } else {
        // Incremental: single keypress = one step (prevent repeat)
        if (e.repeat) return
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault()
            window.machineAPI.ads.startJog('x', 'backward')
            setTimeout(() => window.machineAPI.ads.stopJog('x', 'backward'), 100)
            break
          case 'ArrowRight':
            e.preventDefault()
            window.machineAPI.ads.startJog('x', 'forward')
            setTimeout(() => window.machineAPI.ads.stopJog('x', 'forward'), 100)
            break
          case 'ArrowDown':
            e.preventDefault()
            window.machineAPI.ads.startJog('y', 'backward')
            setTimeout(() => window.machineAPI.ads.stopJog('y', 'backward'), 100)
            break
          case 'ArrowUp':
            e.preventDefault()
            window.machineAPI.ads.startJog('y', 'forward')
            setTimeout(() => window.machineAPI.ads.stopJog('y', 'forward'), 100)
            break
          case 'PageDown':
            e.preventDefault()
            window.machineAPI.ads.startJog('z', 'backward')
            setTimeout(() => window.machineAPI.ads.stopJog('z', 'backward'), 100)
            break
          case 'PageUp':
            e.preventDefault()
            window.machineAPI.ads.startJog('z', 'forward')
            setTimeout(() => window.machineAPI.ads.stopJog('z', 'forward'), 100)
            break
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        window.machineAPI.ads.stopAll()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isContinuous) return // Incremental handled via timeout
      switch (e.key) {
        case 'ArrowLeft':
          window.machineAPI.ads.stopJog('x', 'backward')
          break
        case 'ArrowRight':
          window.machineAPI.ads.stopJog('x', 'forward')
          break
        case 'ArrowDown':
          window.machineAPI.ads.stopJog('y', 'backward')
          break
        case 'ArrowUp':
          window.machineAPI.ads.stopJog('y', 'forward')
          break
        case 'PageDown':
          window.machineAPI.ads.stopJog('z', 'backward')
          break
        case 'PageUp':
          window.machineAPI.ads.stopJog('z', 'forward')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [disabled, isContinuous])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">Jog Controls</h2>

        <button
          onClick={() => window.machineAPI.ads.stopAll()}
          disabled={notConnected}
          className="
            px-4 py-1.5 rounded-md text-xs font-bold uppercase
            bg-red-700 border border-red-500 text-white
            hover:bg-red-600 active:bg-red-500
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Stop All
        </button>
      </div>

      {/* Speed selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-zinc-500 text-xs w-16">Speed:</span>
        <div className="flex rounded-md overflow-hidden border border-zinc-600">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setJogSpeed(opt.value)}
              disabled={disabled}
              className={`
                px-3 py-1 text-xs font-medium transition-colors
                ${jogSpeed === opt.value
                  ? opt.value === 'rapid' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}
                disabled:opacity-30
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Distance selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-zinc-500 text-xs w-16">Distance:</span>
        <div className="flex rounded-md overflow-hidden border border-zinc-600">
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setJogDistance(opt.value)}
              disabled={disabled}
              className={`
                px-3 py-1 text-xs font-medium transition-colors
                ${jogDistance === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}
                disabled:opacity-30
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Axis controls */}
      <div className="space-y-3">
        <AxisControl axis="x" disabled={disabled} />
        <AxisControl axis="y" disabled={disabled} />
        <AxisControl axis="z" disabled={disabled} />
        <AxisControl axis="z2" disabled={disabled} />
        <AxisControl axis="ext" disabled={disabled} />
      </div>

      {/* Status messages */}
      {notConnected && (
        <p className="text-zinc-600 text-xs mt-3 text-center">
          Connect to PLC to enable jog controls
        </p>
      )}

{programRunning && (
        <p className="text-yellow-600 text-xs mt-3 text-center">
          Jogging disabled while program is running
        </p>
      )}

      <p className="text-zinc-700 text-xs mt-3">
        Keyboard: Arrow keys = X/Y | PgUp/PgDn = Z | Esc = Stop All
      </p>
    </div>
  )
}

import { useAmbrellStore } from '../../stores/ambrellStore'
import type { AmbrellRunMode } from '../../stores/ambrellStore'

export function AmbrellControls() {
  const runMode = useAmbrellStore((s) => s.runMode)
  const heatingState = useAmbrellStore((s) => s.heatingState)
  const powerSetpoint = useAmbrellStore((s) => s.powerSetpoint)
  const faultCode = useAmbrellStore((s) => s.faultCode)
  const connectionStatus = useAmbrellStore((s) => s.connectionStatus)
  const setRunMode = useAmbrellStore((s) => s.setRunMode)
  const setPowerSetpoint = useAmbrellStore((s) => s.setPowerSetpoint)
  const setFaultCode = useAmbrellStore((s) => s.setFaultCode)

  const connected = connectionStatus === 'connected'

  const handleModeChange = (mode: AmbrellRunMode) => {
    setRunMode(mode)
    // TODO: Send command to Ambrell via serial/PLC
  }

  const handleStart = () => {
    // TODO: Send START contact closure
    useAmbrellStore.getState().setHeatingState('heating')
  }

  const handleStop = () => {
    // TODO: Send STOP contact open
    useAmbrellStore.getState().setHeatingState('cooldown')
    setTimeout(() => useAmbrellStore.getState().setHeatingState('idle'), 2000)
  }

  const handleFaultReset = () => {
    setFaultCode(null)
  }

  const stateColors = {
    idle: 'text-zinc-400',
    heating: 'text-orange-400',
    cooldown: 'text-blue-400',
    fault: 'text-red-400'
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">Power Control</h3>
        <span className={`text-xs font-semibold uppercase ${stateColors[heatingState]}`}>
          {heatingState === 'heating' && '\u25CF '}
          {heatingState}
        </span>
      </div>

      {/* Fault alert */}
      {faultCode && (
        <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-red-400 text-xs font-medium">FAULT: {faultCode}</span>
          <button
            onClick={handleFaultReset}
            className="px-2 py-0.5 text-[10px] rounded bg-red-700 text-white hover:bg-red-600"
          >
            Reset
          </button>
        </div>
      )}

      {/* Run mode selector */}
      <div>
        <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">Run Mode</label>
        <div className="flex gap-1">
          {(['off', 'manual', 'auto'] as AmbrellRunMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              disabled={!connected && mode !== 'off'}
              className={`px-4 py-1.5 text-xs font-medium rounded border capitalize ${
                runMode === mode
                  ? mode === 'off'
                    ? 'bg-zinc-600 border-zinc-500 text-white'
                    : mode === 'manual'
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-green-600 border-green-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 disabled:opacity-30'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Power setpoint (manual mode) */}
      {runMode === 'manual' && (
        <div>
          <label className="block text-zinc-500 text-[10px] mb-1 uppercase tracking-wide">
            Power Setpoint: {powerSetpoint.toFixed(0)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={powerSetpoint}
            onChange={(e) => setPowerSetpoint(parseFloat(e.target.value))}
            className="w-full accent-orange-500 h-2"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Start/Stop buttons */}
      {runMode !== 'off' && (
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={heatingState === 'heating'}
            className="flex-1 px-4 py-2 text-xs font-bold rounded bg-orange-600 border border-orange-500 text-white hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            START HEATING
          </button>
          <button
            onClick={handleStop}
            disabled={heatingState === 'idle'}
            className="flex-1 px-4 py-2 text-xs font-bold rounded bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            STOP
          </button>
        </div>
      )}
    </div>
  )
}

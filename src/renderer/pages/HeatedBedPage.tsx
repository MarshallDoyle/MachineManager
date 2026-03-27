import { useHeatedBedStore } from '../stores/heatedBedStore'

export function HeatedBedPage() {
  const currentTemp = useHeatedBedStore((s) => s.currentTemp)
  const targetTemp = useHeatedBedStore((s) => s.targetTemp)
  const heaterPower = useHeatedBedStore((s) => s.heaterPower)
  const heatingState = useHeatedBedStore((s) => s.heatingState)
  const pidKp = useHeatedBedStore((s) => s.pidKp)
  const pidKi = useHeatedBedStore((s) => s.pidKi)
  const pidKd = useHeatedBedStore((s) => s.pidKd)
  const setTargetTemp = useHeatedBedStore((s) => s.setTargetTemp)
  const setPidParams = useHeatedBedStore((s) => s.setPidParams)
  const toggleHeater = useHeatedBedStore((s) => s.toggleHeater)

  const error = targetTemp - currentTemp

  return (
    <div className="space-y-4">
      <h1 className="text-zinc-300 font-semibold text-lg">Heated Print Bed</h1>

      <div className="grid grid-cols-2 gap-4">
        {/* Temperature display */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wide mb-4">Temperature</h2>
          <div className="text-center mb-4">
            <div className="font-mono text-5xl font-bold text-orange-400">{currentTemp.toFixed(1)}<span className="text-2xl text-zinc-500">&deg;C</span></div>
            <div className="text-zinc-500 text-sm mt-1">Target: {targetTemp.toFixed(0)}&deg;C | Error: {error > 0 ? '+' : ''}{error.toFixed(1)}&deg;</div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Heater Power</span>
              <span className="font-mono text-orange-400">{heaterPower.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-700 to-orange-400 rounded-full transition-all" style={{ width: `${heaterPower}%` }} />
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={targetTemp}
              onChange={(e) => setTargetTemp(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 text-sm font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={toggleHeater}
              className={`px-6 py-2 text-sm font-bold rounded border ${
                heatingState !== 'off'
                  ? 'bg-red-700 border-red-600 text-white hover:bg-red-600'
                  : 'bg-green-700 border-green-600 text-white hover:bg-green-600'
              }`}
            >
              {heatingState !== 'off' ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* PID Tuning */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wide mb-4">PID Tuning</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-zinc-500 text-xs mb-1">Kp (Proportional)</label>
              <input type="number" step={0.1} value={pidKp} onChange={(e) => setPidParams(parseFloat(e.target.value) || 0, pidKi, pidKd)}
                className="w-full px-3 py-2 text-sm font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1">Ki (Integral)</label>
              <input type="number" step={0.01} value={pidKi} onChange={(e) => setPidParams(pidKp, parseFloat(e.target.value) || 0, pidKd)}
                className="w-full px-3 py-2 text-sm font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-zinc-500 text-xs mb-1">Kd (Derivative)</label>
              <input type="number" step={0.01} value={pidKd} onChange={(e) => setPidParams(pidKp, pidKi, parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="mt-4 bg-zinc-800/50 rounded p-3">
            <h3 className="text-zinc-500 text-xs uppercase mb-2">Zone Support</h3>
            <p className="text-zinc-600 text-xs">Multi-zone heating control will be available in a future update.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

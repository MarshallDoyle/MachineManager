import { useAmbrellStore } from '../../stores/ambrellStore'

export function AmbrellPidPanel() {
  const runMode = useAmbrellStore((s) => s.runMode)
  const pidEnabled = useAmbrellStore((s) => s.pidEnabled)
  const pidTarget = useAmbrellStore((s) => s.pidTarget)
  const pidKp = useAmbrellStore((s) => s.pidKp)
  const pidKi = useAmbrellStore((s) => s.pidKi)
  const pidKd = useAmbrellStore((s) => s.pidKd)
  const setPidEnabled = useAmbrellStore((s) => s.setPidEnabled)
  const setPidTarget = useAmbrellStore((s) => s.setPidTarget)
  const setPidParams = useAmbrellStore((s) => s.setPidParams)
  const workheadTemp = useAmbrellStore((s) => s.workheadTemp)
  const powerSetpoint = useAmbrellStore((s) => s.powerSetpoint)

  if (runMode !== 'auto') return null

  const error = pidTarget - workheadTemp

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">PID Controller</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pidEnabled}
            onChange={(e) => setPidEnabled(e.target.checked)}
            className="accent-green-500"
          />
          <span className={`text-xs font-medium ${pidEnabled ? 'text-green-400' : 'text-zinc-500'}`}>
            {pidEnabled ? 'Active' : 'Disabled'}
          </span>
        </label>
      </div>

      {/* Target temperature */}
      <div>
        <label className="block text-zinc-500 text-[10px] mb-0.5 uppercase tracking-wide">Target Temperature (&deg;C)</label>
        <input
          type="number"
          value={pidTarget}
          onChange={(e) => setPidTarget(parseFloat(e.target.value) || 0)}
          className="w-32 px-2 py-1 text-sm font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-green-500"
        />
      </div>

      {/* PID status readout */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Target</div>
          <div className="font-mono text-sm text-green-400">{pidTarget.toFixed(0)}&deg;C</div>
        </div>
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Actual</div>
          <div className="font-mono text-sm text-orange-400">{workheadTemp.toFixed(1)}&deg;C</div>
        </div>
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Error</div>
          <div className={`font-mono text-sm ${Math.abs(error) < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
            {error > 0 ? '+' : ''}{error.toFixed(1)}&deg;
          </div>
        </div>
      </div>

      {/* Power output from PID */}
      <div>
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span className="uppercase tracking-wide">PID Output</span>
          <span className="font-mono">{powerSetpoint.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${powerSetpoint}%` }}
          />
        </div>
      </div>

      {/* PID gains */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-zinc-500 text-[10px] mb-0.5">Kp</label>
          <input
            type="number"
            step={0.1}
            value={pidKp}
            onChange={(e) => setPidParams(parseFloat(e.target.value) || 0, pidKi, pidKd)}
            className="w-full px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-zinc-500 text-[10px] mb-0.5">Ki</label>
          <input
            type="number"
            step={0.01}
            value={pidKi}
            onChange={(e) => setPidParams(pidKp, parseFloat(e.target.value) || 0, pidKd)}
            className="w-full px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-zinc-500 text-[10px] mb-0.5">Kd</label>
          <input
            type="number"
            step={0.01}
            value={pidKd}
            onChange={(e) => setPidParams(pidKp, pidKi, parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
    </div>
  )
}

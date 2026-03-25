import { useAmbrellStore } from '../../stores/ambrellStore'

export function AmbrellDashboardWidget() {
  const status = useAmbrellStore((s) => s.connectionStatus)
  const heatingState = useAmbrellStore((s) => s.heatingState)
  const power = useAmbrellStore((s) => s.outputPower)
  const powerPct = useAmbrellStore((s) => s.outputPowerPercent)
  const freq = useAmbrellStore((s) => s.frequency)
  const runMode = useAmbrellStore((s) => s.runMode)
  const faultCode = useAmbrellStore((s) => s.faultCode)

  const stateColors = {
    idle: 'text-zinc-400',
    heating: 'text-orange-400',
    cooldown: 'text-blue-400',
    fault: 'text-red-400'
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">Induction Heater</h2>
        <div className="flex items-center gap-2">
          {heatingState === 'heating' && (
            <span className="flex items-center gap-1 text-orange-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              HEATING
            </span>
          )}
          {faultCode && (
            <span className="text-red-400 text-xs font-semibold">FAULT</span>
          )}
          <span className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-400' : 'bg-zinc-500'
          }`} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Power</div>
          <div className="font-mono text-sm text-orange-400">{power.toFixed(1)} kW</div>
        </div>
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Level</div>
          <div className="font-mono text-sm text-orange-400">{powerPct.toFixed(0)}%</div>
        </div>
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Freq</div>
          <div className="font-mono text-sm text-blue-400">{freq.toFixed(0)} kHz</div>
        </div>
        <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
          <div className="text-zinc-500 text-[9px] uppercase">Mode</div>
          <div className={`font-mono text-sm capitalize ${stateColors[heatingState]}`}>{runMode}</div>
        </div>
      </div>
    </div>
  )
}

import { useAmbrellStore } from '../../stores/ambrellStore'

export function AmbrellDashboardWidget() {
  const status = useAmbrellStore((s) => s.connectionStatus)
  const heatingState = useAmbrellStore((s) => s.heatingState)
  const power = useAmbrellStore((s) => s.outputPower)
  const powerPct = useAmbrellStore((s) => s.outputPowerPercent)
  const freq = useAmbrellStore((s) => s.frequency)
  const voltage = useAmbrellStore((s) => s.tankVoltage)
  const current = useAmbrellStore((s) => s.tankCurrent)
  const runMode = useAmbrellStore((s) => s.runMode)
  const faultCode = useAmbrellStore((s) => s.faultCode)
  const waterFlow = useAmbrellStore((s) => s.waterFlowRate)
  const waterIn = useAmbrellStore((s) => s.waterInletTemp)
  const waterOut = useAmbrellStore((s) => s.waterOutletTemp)
  const workheadTemp = useAmbrellStore((s) => s.workheadTemp)
  const powerSetpoint = useAmbrellStore((s) => s.powerSetpoint)

  const stateColors = {
    idle: 'text-zinc-400',
    heating: 'text-orange-400',
    cooldown: 'text-blue-400',
    fault: 'text-red-400'
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">Induction Heater</h2>
          <span className="text-zinc-600 text-xs">EASYHEAT 8310 | 10 kW | 150-400 kHz</span>
        </div>
        <div className="flex items-center gap-3">
          {heatingState === 'heating' && (
            <span className="flex items-center gap-1.5 text-orange-400 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
              HEATING
            </span>
          )}
          {faultCode && (
            <span className="text-red-400 text-xs font-bold">FAULT: {faultCode}</span>
          )}
          <span className={`text-xs font-medium capitalize ${stateColors[heatingState]}`}>
            Mode: {runMode}
          </span>
          <span className={`w-2.5 h-2.5 rounded-full ${
            status === 'connected' ? 'bg-green-400' : 'bg-zinc-600'
          }`} />
        </div>
      </div>

      {/* Power bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>Power Output</span>
          <span className="font-mono text-orange-400">{power.toFixed(1)} kW ({powerPct.toFixed(0)}%)</span>
        </div>
        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-700 to-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${powerPct}%` }}
          />
        </div>
        {runMode === 'manual' && (
          <div className="flex justify-between text-[9px] text-zinc-600 mt-0.5">
            <span>Setpoint: {powerSetpoint.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Readout grid */}
      <div className="grid grid-cols-6 gap-2">
        <MiniReadout label="Frequency" value={freq.toFixed(0)} unit="kHz" color="text-blue-400" />
        <MiniReadout label="Voltage" value={voltage.toFixed(0)} unit="V" color="text-yellow-400" />
        <MiniReadout label="Current" value={current.toFixed(1)} unit="A" color="text-yellow-400" />
        <MiniReadout label="Workhead" value={workheadTemp.toFixed(0)} unit="°C" color="text-red-400" />
        <MiniReadout label="Water Flow" value={waterFlow.toFixed(1)} unit="L/m" color="text-cyan-400" />
        <MiniReadout label="Water" value={`${waterIn.toFixed(0)}/${waterOut.toFixed(0)}`} unit="°C" color="text-cyan-400" />
      </div>
    </div>
  )
}

function MiniReadout({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-zinc-800/50 rounded px-2 py-1.5 text-center">
      <div className="text-zinc-600 text-[9px] uppercase truncate">{label}</div>
      <div className={`font-mono text-xs font-bold ${color}`}>
        {value}<span className="text-[9px] font-normal text-zinc-500 ml-0.5">{unit}</span>
      </div>
    </div>
  )
}

import { useAmbrellStore } from '../../stores/ambrellStore'

export function AmbrellReadouts() {
  const power = useAmbrellStore((s) => s.outputPower)
  const powerPct = useAmbrellStore((s) => s.outputPowerPercent)
  const freq = useAmbrellStore((s) => s.frequency)
  const voltage = useAmbrellStore((s) => s.tankVoltage)
  const current = useAmbrellStore((s) => s.tankCurrent)
  const workheadTemp = useAmbrellStore((s) => s.workheadTemp)
  const waterFlow = useAmbrellStore((s) => s.waterFlowRate)
  const waterIn = useAmbrellStore((s) => s.waterInletTemp)
  const waterOut = useAmbrellStore((s) => s.waterOutletTemp)

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <h3 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide mb-3">Realtime Readouts</h3>
      <div className="grid grid-cols-3 gap-3">
        <Readout label="Output Power" value={power.toFixed(2)} unit="kW" color="text-orange-400" />
        <Readout label="Power Level" value={powerPct.toFixed(1)} unit="%" color="text-orange-400" />
        <Readout label="Frequency" value={freq.toFixed(1)} unit="kHz" color="text-blue-400" />
        <Readout label="Tank Voltage" value={voltage.toFixed(0)} unit="V" color="text-yellow-400" />
        <Readout label="Tank Current" value={current.toFixed(1)} unit="A" color="text-yellow-400" />
        <Readout label="Workhead Temp" value={workheadTemp.toFixed(1)} unit="°C" color="text-red-400" />
        <Readout label="Water Flow" value={waterFlow.toFixed(1)} unit="L/min" color="text-cyan-400" />
        <Readout label="Water Inlet" value={waterIn.toFixed(1)} unit="°C" color="text-cyan-400" />
        <Readout label="Water Outlet" value={waterOut.toFixed(1)} unit="°C" color="text-cyan-400" />
      </div>
    </div>
  )
}

function Readout({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-zinc-800/50 rounded px-3 py-2">
      <div className="text-zinc-500 text-[10px] uppercase tracking-wide">{label}</div>
      <div className={`font-mono text-lg font-bold ${color}`}>
        {value}
        <span className="text-xs font-normal text-zinc-500 ml-1">{unit}</span>
      </div>
    </div>
  )
}

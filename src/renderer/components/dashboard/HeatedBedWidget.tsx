import { useState } from 'react'
import { useHeatedBedStore } from '../../stores/heatedBedStore'

export function HeatedBedWidget() {
  const currentTemp = useHeatedBedStore((s) => s.currentTemp)
  const targetTemp = useHeatedBedStore((s) => s.targetTemp)
  const heaterPower = useHeatedBedStore((s) => s.heaterPower)
  const heatingState = useHeatedBedStore((s) => s.heatingState)
  const setTargetTemp = useHeatedBedStore((s) => s.setTargetTemp)
  const toggleHeater = useHeatedBedStore((s) => s.toggleHeater)

  const [tempInput, setTempInput] = useState(String(targetTemp))

  const stateColors = {
    off: 'text-zinc-500',
    heating: 'text-orange-400',
    cooling: 'text-blue-400',
    'at-temp': 'text-green-400'
  }

  const stateLabels = {
    off: 'Off',
    heating: 'Heating',
    cooling: 'Cooling',
    'at-temp': 'At Temperature'
  }

  const error = targetTemp - currentTemp

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-zinc-300 font-semibold text-xs uppercase tracking-wide">Heated Print Bed</h3>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase ${stateColors[heatingState]}`}>
            {heatingState === 'heating' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse mr-1" />}
            {stateLabels[heatingState]}
          </span>
          <button
            onClick={toggleHeater}
            className={`px-2 py-0.5 text-[10px] rounded border ${
              heatingState !== 'off'
                ? 'bg-red-900/50 border-red-700 text-red-400 hover:bg-red-900'
                : 'bg-green-900/50 border-green-700 text-green-400 hover:bg-green-900'
            }`}
          >
            {heatingState !== 'off' ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>

      {/* Temperature display */}
      <div className="flex items-end gap-2 mb-2">
        <div className="flex-1">
          <div className="text-zinc-600 text-[9px] uppercase">Current</div>
          <div className="font-mono text-2xl font-bold text-orange-400">{currentTemp.toFixed(1)}<span className="text-sm text-zinc-500">&deg;C</span></div>
        </div>
        <div className="text-zinc-600 text-lg">/</div>
        <div>
          <div className="text-zinc-600 text-[9px] uppercase">Target</div>
          <div className="font-mono text-lg text-zinc-300">{targetTemp.toFixed(0)}<span className="text-xs text-zinc-500">&deg;C</span></div>
        </div>
        <div className="text-right">
          <div className="text-zinc-600 text-[9px] uppercase">Error</div>
          <div className={`font-mono text-sm ${Math.abs(error) < 3 ? 'text-green-400' : 'text-yellow-400'}`}>
            {error > 0 ? '+' : ''}{error.toFixed(1)}&deg;
          </div>
        </div>
      </div>

      {/* Power bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[9px] text-zinc-600 mb-0.5">
          <span>Heater Power</span>
          <span className="font-mono text-orange-400">{heaterPower.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-700 to-orange-400 rounded-full transition-all" style={{ width: `${heaterPower}%` }} />
        </div>
      </div>

      {/* Set temperature */}
      <div className="flex gap-1">
        <input
          type="number"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setTargetTemp(parseFloat(tempInput) || 0) } }}
          className="flex-1 px-2 py-1 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
          placeholder="Target °C"
        />
        <button
          onClick={() => setTargetTemp(parseFloat(tempInput) || 0)}
          className="px-3 py-1 text-[10px] font-medium rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          Set
        </button>
      </div>
    </div>
  )
}

import { useRef, useEffect, useCallback } from 'react'
import { useAmbrellStore } from '../../stores/ambrellStore'

// Simple ring buffer for time-series data
const HISTORY_SIZE = 120 // 2 minutes at 1 sample/sec
const powerHistory: number[] = new Array(HISTORY_SIZE).fill(0)
const freqHistory: number[] = new Array(HISTORY_SIZE).fill(0)
const tempHistory: number[] = new Array(HISTORY_SIZE).fill(0)
let histIdx = 0

function drawTimeSeries(ctx: CanvasRenderingContext2D, w: number, h: number, data: number[], color: string, maxVal: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < HISTORY_SIZE; i++) {
    const idx = (histIdx + i) % HISTORY_SIZE
    const x = (i / (HISTORY_SIZE - 1)) * w
    const y = h - (data[idx] / maxVal) * h
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

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

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Update history and redraw chart
  useEffect(() => {
    powerHistory[histIdx] = powerPct
    freqHistory[histIdx] = freq
    tempHistory[histIdx] = workheadTemp
    histIdx = (histIdx + 1) % HISTORY_SIZE

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    const w = rect.width
    const h = rect.height

    // Background
    ctx.fillStyle = '#18181b'
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = '#27272a'
    ctx.lineWidth = 0.5
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * h
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Draw traces
    drawTimeSeries(ctx, w, h, powerHistory, '#f97316', 100)    // orange - power %
    drawTimeSeries(ctx, w, h, freqHistory, '#3b82f6', 400)     // blue - freq kHz
    drawTimeSeries(ctx, w, h, tempHistory, '#ef4444', 200)     // red - workhead °C
  }, [powerPct, freq, workheadTemp])

  const stateColors: Record<string, string> = {
    idle: 'text-zinc-400',
    heating: 'text-orange-400',
    cooldown: 'text-blue-400',
    fault: 'text-red-400'
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
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
          {faultCode && <span className="text-red-400 text-xs font-bold">FAULT: {faultCode}</span>}
          <span className={`text-xs font-medium capitalize ${stateColors[heatingState] || 'text-zinc-400'}`}>Mode: {runMode}</span>
          <span className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-zinc-600'}`} />
        </div>
      </div>

      {/* Power bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
          <span>Power Output</span>
          <span className="font-mono text-orange-400">{power.toFixed(1)} kW ({powerPct.toFixed(0)}%)</span>
        </div>
        <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-700 to-orange-400 rounded-full transition-all duration-300" style={{ width: `${powerPct}%` }} />
        </div>
      </div>

      {/* Time-series chart */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[9px] text-zinc-600 uppercase">History (2 min)</span>
          <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-0.5 bg-orange-500 inline-block" /> Power</span>
          <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-0.5 bg-blue-500 inline-block" /> Freq</span>
          <span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-0.5 bg-red-500 inline-block" /> Temp</span>
        </div>
        <canvas ref={canvasRef} className="w-full rounded" style={{ height: '60px' }} />
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

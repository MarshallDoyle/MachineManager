import { useRef, useEffect } from 'react'
import { useMachineStore } from '../../stores/machineStore'
import { MM_TO_IN, MMS_TO_IPM } from '../../types/machine'
import type { AxisId } from '../../types/machine'

interface DriveInfo {
  id: AxisId
  label: string
  driveLabel: string
  ncAxis: string
}

const DRIVES: DriveInfo[] = [
  { id: 'x', label: 'X', driveLabel: 'Drive 12', ncAxis: 'Axis 6' },
  { id: 'y', label: 'Y1 (Master)', driveLabel: 'Drive 11', ncAxis: 'Axis 5' },
  { id: 'z', label: 'Z', driveLabel: 'Drive 9', ncAxis: 'Axis 3' },
  { id: 'z2', label: 'Z2 (Secondary)', driveLabel: 'Drive 8', ncAxis: 'Axis 2' },
  { id: 'ext', label: 'Extruder', driveLabel: 'Drive 7', ncAxis: 'Axis 1' }
]

const STATE_LABELS: Record<number, string> = {
  0: 'Disabled', 1: 'Standstill', 2: 'Discrete Motion', 3: 'Continuous Motion',
  4: 'Synchronized Motion', 5: 'Homing', 6: 'Stopping', 7: 'Error Stop'
}

const OP_MODES = ['CSP', 'CSP', 'CSP', 'CSP', 'CSP'] // All drives in Cyclic Synchronous Position

// Demo bus voltage (from ClearView: 74.2V)
const DEMO_BUS_VOLTS = 74.2

// Torque history ring buffer per drive
const TORQUE_HISTORY_SIZE = 60
const torqueHistories: Record<string, number[]> = {}
DRIVES.forEach(d => { torqueHistories[d.id] = new Array(TORQUE_HISTORY_SIZE).fill(0) })
let torqueIdx = 0

function drawMiniChart(ctx: CanvasRenderingContext2D, w: number, h: number, data: number[], color: string) {
  const max = Math.max(1, ...data.map(Math.abs))
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, w, h)

  // Grid lines
  ctx.strokeStyle = '#1c1c1e'
  ctx.lineWidth = 0.5
  for (let i = 1; i < 4; i++) {
    const y = (i / 4) * h
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Zero line (slightly brighter)
  ctx.strokeStyle = '#333'
  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()

  // Fill under the curve
  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  for (let i = 0; i < TORQUE_HISTORY_SIZE; i++) {
    const idx = (torqueIdx + i) % TORQUE_HISTORY_SIZE
    const x = (i / (TORQUE_HISTORY_SIZE - 1)) * w
    const y = h / 2 - (data[idx] / max) * (h / 2) * 0.85
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h / 2)
  ctx.closePath()
  ctx.fillStyle = color + '15' // very transparent fill
  ctx.fill()

  // Trace line
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < TORQUE_HISTORY_SIZE; i++) {
    const idx = (torqueIdx + i) % TORQUE_HISTORY_SIZE
    const x = (i / (TORQUE_HISTORY_SIZE - 1)) * w
    const y = h / 2 - (data[idx] / max) * (h / 2) * 0.85
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function DriveCard({ drive }: { drive: DriveInfo }) {
  const axis = useMachineStore((s) => s.axes[drive.id])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const posIn = axis.actualPosition * MM_TO_IN
  const velIpm = axis.actualVelocity * MMS_TO_IPM
  const stateLabel = STATE_LABELS[axis.axisState] || `State ${axis.axisState}`
  const isMoving = Math.abs(axis.actualVelocity) > 0.01

  // Simulate torque from velocity (demo data)
  const demoTorque = axis.actualVelocity * 0.1 + (Math.random() - 0.5) * 0.5

  useEffect(() => {
    torqueHistories[drive.id][torqueIdx] = demoTorque
  }, [demoTorque, drive.id])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    drawMiniChart(ctx, rect.width, rect.height, torqueHistories[drive.id], isMoving ? '#f59e0b' : '#3f3f46')
  })

  return (
    <div className={`bg-zinc-800/50 rounded-lg p-3 border ${axis.error ? 'border-red-700' : 'border-zinc-700/50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-zinc-200 font-semibold text-sm">{drive.label}</div>
          <div className="text-zinc-600 text-[9px]">{drive.driveLabel} | {drive.ncAxis}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold ${
              axis.error ? 'text-red-400' : isMoving ? 'text-green-400' : 'text-zinc-500'
            }`}>
              {axis.error ? 'ERROR' : stateLabel}
            </span>
            <span className={`w-2 h-2 rounded-full ${
              axis.error ? 'bg-red-500' : isMoving ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'
            }`} />
          </div>
          <span className="text-[9px] text-blue-400 font-mono">CSP</span>
        </div>
      </div>

      {/* Readouts */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-zinc-900/60 rounded px-2 py-1">
          <div className="text-zinc-600 text-[8px] uppercase">Position</div>
          <div className="font-mono text-xs text-zinc-200">{posIn.toFixed(4)}"</div>
        </div>
        <div className="bg-zinc-900/60 rounded px-2 py-1">
          <div className="text-zinc-600 text-[8px] uppercase">Velocity</div>
          <div className="font-mono text-xs text-zinc-200">{velIpm.toFixed(1)} ipm</div>
        </div>
        <div className="bg-zinc-900/60 rounded px-2 py-1">
          <div className="text-zinc-600 text-[8px] uppercase">Bus Volts</div>
          <div className="font-mono text-xs text-yellow-400">{DEMO_BUS_VOLTS} V</div>
        </div>
      </div>

      {/* Torque chart */}
      <div>
        <div className="text-zinc-600 text-[8px] uppercase mb-0.5">Torque (60s)</div>
        <canvas ref={canvasRef} className="w-full rounded border border-zinc-700/30" style={{ height: '40px', display: 'block' }} />
      </div>

      {/* Error display */}
      {axis.error && (
        <div className="mt-2 bg-red-900/30 border border-red-800 rounded px-2 py-1 text-[10px] text-red-400 font-mono">
          Error 0x{axis.errorId.toString(16).toUpperCase()}
        </div>
      )}
    </div>
  )
}

export function DriveMonitorPanel() {
  // Advance torque history index periodically
  useEffect(() => {
    const interval = setInterval(() => {
      torqueIdx = (torqueIdx + 1) % TORQUE_HISTORY_SIZE
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-zinc-300 font-semibold text-sm uppercase tracking-wide">ClearPath Drive Monitor</h2>
        <span className="text-zinc-600 text-[9px]">6x ClearPath EtherCAT | CX5340</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {DRIVES.map((drive) => (
          <DriveCard key={drive.id} drive={drive} />
        ))}
      </div>
    </div>
  )
}

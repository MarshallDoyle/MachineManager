import { useRef, useEffect } from 'react'
import type { AxisDataPoint } from '../../hooks/usePlaybackEngine'

interface AxisGraphProps {
  data: AxisDataPoint[]
  currentTime: number
  duration: number
}

const AXIS_COLORS: Record<string, string> = {
  fXActualPosition: '#ef4444',
  fYActualPosition: '#22c55e',
  fZActualPosition: '#3b82f6',
  fZ2ActualPosition: '#a855f7',
  fExtActualPosition: '#f59e0b'
}

const AXIS_LABELS: Record<string, string> = {
  fXActualPosition: 'X',
  fYActualPosition: 'Y',
  fZActualPosition: 'Z',
  fZ2ActualPosition: 'Z2',
  fExtActualPosition: 'EXT'
}

export function AxisGraph({ data, currentTime, duration }: AxisGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const w = rect.width
    const h = rect.height
    const pad = { top: 10, right: 10, bottom: 20, left: 45 }
    const plotW = w - pad.left - pad.right
    const plotH = h - pad.top - pad.bottom

    // Clear
    ctx.fillStyle = '#18181b'
    ctx.fillRect(0, 0, w, h)

    // Find min/max across all position axes
    let yMin = Infinity, yMax = -Infinity
    const axisKeys = Object.keys(AXIS_COLORS)
    for (const pt of data) {
      for (const key of axisKeys) {
        const v = pt[key]
        if (v !== undefined) {
          if (v < yMin) yMin = v
          if (v > yMax) yMax = v
        }
      }
    }
    if (yMin === yMax) { yMin -= 1; yMax += 1 }
    const yRange = yMax - yMin

    // Grid lines
    ctx.strokeStyle = '#27272a'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * plotH
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + plotW, y)
      ctx.stroke()

      ctx.fillStyle = '#52525b'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText((yMax - (i / 4) * yRange).toFixed(1), pad.left - 4, y + 3)
    }

    // Plot each axis
    for (const key of axisKeys) {
      ctx.strokeStyle = AXIS_COLORS[key]
      ctx.lineWidth = 1
      ctx.beginPath()
      let started = false
      for (const pt of data) {
        const v = pt[key]
        if (v === undefined) continue
        const x = pad.left + (pt.t / duration) * plotW
        const y = pad.top + (1 - (v - yMin) / yRange) * plotH
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Current time cursor
    const cursorX = pad.left + (currentTime / duration) * plotW
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(cursorX, pad.top)
    ctx.lineTo(cursorX, pad.top + plotH)
    ctx.stroke()
    ctx.setLineDash([])

  }, [data, currentTime, duration])

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden flex flex-col">
      <div className="px-3 py-1.5 border-b border-zinc-700 flex items-center justify-between">
        <h3 className="text-zinc-300 font-semibold text-xs">Axis Positions</h3>
        <div className="flex gap-2">
          {Object.entries(AXIS_LABELS).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full" style={{ background: AXIS_COLORS[key] }} />
              <span className="text-zinc-500">{label}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-[120px]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  )
}
